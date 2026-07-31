# Production Deployment & Scaling Guide (500-600 Concurrent Players)

This guide details the network topology, infrastructure configuration, and code scaling settings recommended to run the Multiplayer AI Trivia Tournament in production.

---

## 1. Network Topology & System Architecture

```mermaid
graph TD
    Client[500-600 Active Users] -->|HTTPS / WSS| Nginx[Nginx Load Balancer]
    Nginx -->|Sticky Sessions Round Robin| Node1[Node.js Instance 1: Port 5000]
    Nginx -->|Sticky Sessions Round Robin| Node2[Node.js Instance 2: Port 5001]
    Nginx -->|Sticky Sessions Round Robin| Node3[Node.js Instance 3: Port 5002]
    
    Node1 & Node2 & Node3 <-->|Socket.io Redis Adapter| Redis[Redis Cluster: Port 6379]
    Node1 & Node2 & Node3 <-->|Pool Max: 50| PG[PostgreSQL DB: Port 5432]
```

To support 500-600 concurrent connections transmitting data at the same time:
1. **Load Balancer (Nginx)**: Decouples SSL termination and balances incoming websocket traffic across multiple Node.js server processes. Sticky sessions are mandatory because Socket.io starts with HTTP long-polling before upgrading to WebSockets.
2. **Backend Workers (PM2 Clustering)**: 4 to 6 clustered Node.js worker threads to split the event loop workload.
3. **Websocket Adapter (Redis)**: Enables multi-node broadcast. When server 1 triggers `spin_wheel` or `question_loaded` to room `TOURNAMENT`, Redis broadcasts it so players connected to servers 2 and 3 also receive it instantly.
4. **PostgreSQL Database Pool**: Thread pool limit of 50-100 connections with non-blocking inserts.

---

## 2. Nginx Load Balancer Config (with Sticky Sessions)

Install Nginx and add the following configuration block under `/etc/nginx/conf.d/trivia.conf` or in your `nginx.conf`:

```nginx
upstream trivia_backend {
    # Use ip_hash to guarantee sticky sessions for Socket.io
    ip_hash;
    
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
    server 127.0.0.1:5003;
}

server {
    listen 443 ssl http2;
    server_name tournament.example.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/tournament.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tournament.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Assets Routing
    location / {
        root /var/www/trivia-tournament/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend Express REST API
    location /api/ {
        proxy_pass http://trivia_backend;
        proxy_http_version 1.1;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }

    # Socket.io Websockets upgrade routing
    location /socket.io/ {
        proxy_pass http://trivia_backend;
        proxy_http_version 1.1;
        
        # Websocket support headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
        
        # High timeouts to prevent premature websocket dropouts
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

---

## 3. Server Process Clustering (PM2)

Install PM2 globally on the host server:
```bash
npm install -g pm2
```

Create a production deployment configuration file `ecosystem.config.json` inside the backend directory:

```json
{
  "apps": [
    {
      "name": "trivia-backend-cluster",
      "script": "server.js",
      "instances": "max",
      "exec_mode": "cluster",
      "env_production": {
        "NODE_ENV": "production",
        "PORT": 5000,
        "DATABASE_URL": "postgresql://db_user:secure_pwd@postgresql-instance-url:5432/trivia_prod",
        "REDIS_URL": "redis://redis-cluster-url:6379",
        "SPIN_WHEEL_DURATION": 4000,
        "QUESTION_TIMER": 15000
      }
    }
  ]
}
```

Start the application:
```bash
pm2 start ecosystem.config.json --env production
```

---

## 4. Scaling Socket.io in Cluster Mode (Adding Redis Adapter)

If deploying to a multi-instance or clustered server setup, we scale Socket.io by wrapping it in the `@socket.io/redis-adapter`.

To scale, install the dependencies in `backend/`:
```bash
npm install @socket.io/redis-adapter redis
```

Modify the Socket.io initialization in `backend/server.js`:

```javascript
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');

if (process.env.REDIS_URL) {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();
  
  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.io: Scale out adapter enabled via Redis.');
  });
}
```

---

## 5. OS-Level Socket Tuning (Linux)

Under high load (600 concurrent connections sending answer frames continuously), the OS can run out of file descriptors or hit TCP port reuse limits. Run these commands on your host Linux server:

```bash
# Open file descriptor limits (number of parallel open sockets)
ulimit -n 65535

# Set kernel sysctl parameters in /etc/sysctl.conf
fs.file-max = 100000
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
```

Reload sysctl variables:
```bash
sudo sysctl -p
```
