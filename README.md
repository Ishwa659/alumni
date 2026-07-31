# Multiplayer AI Trivia Tournament Platform

A high-performance, visually rich multiplayer trivia tournament platform featuring an animated synchronized spin wheel, silent gameplay modes, persistent sessions for disconnect rejoin, and virtualized leaderboard tables capable of running 500-600 concurrent users.

---

## Project Structure

```
trivia-tournament/
├── DEPLOYMENT.md             # Production scaling and configuration guides
├── backend/
│   ├── .env                  # Port and timer duration configs
│   ├── db.js                 # PostgreSQL & SQLite fallback database client
│   ├── load_simulator.js     # Load stress test simulator (600 players)
│   ├── package.json          # Server dependencies
│   ├── schema.sql            # Database tables and questions seeds
│   └── server.js             # Sockets server & state machine engine
└── frontend/
    ├── index.html            # App shell entry point
    ├── package.json          # Client dependencies
    ├── vite.config.js        # Vite react configuration
    └── src/
        ├── App.jsx           # Main routing & QR layout wrapper
        ├── index.css         # Visual design system (Glows, glass, animations)
        ├── main.jsx          # React app DOM loader
        ├── context/
        │   └── GameContext.jsx # Sockets event binder & local storage sync
        └── components/
            ├── AnimatedPoster.jsx    # Glassmorphic Lobby entry screen
            ├── CountdownTimer.jsx    # Beep-synthesized start countdown
            ├── FinalResultsPage.jsx  # Winner screen and stats board
            ├── LeaderboardTable.jsx  # Virtualized list rankings table
            ├── QRCodeDisplay.jsx     # Floating persistent QR code
            ├── SilentGameRoom.jsx    # Answer lock gameplay screen
            ├── SpinWheel.jsx         # Custom Canvas animated wheel
            └── StatisticsCharts.jsx  # Recharts implementation dashboard
```

---

## ⚡ Quick Start (Local Development)

The backend is built with a **transparent fallback database driver**. By default, if no PostgreSQL `DATABASE_URL` is defined in `.env`, the server automatically creates a local SQLite database (`trivia.db`) and seeds it with the full set of 30 questions! This means you can run the project immediately with **zero database configuration**.

### 1. Install & Start Backend Server

```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install

# Start the server (runs on http://localhost:5000)
npm start
```

### 2. Install & Start Frontend Client

```bash
# Open a new terminal window and navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server (runs on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser. You will see the lobby screen!

---

## 🧪 Running the 600-Player Load Simulation

The project includes a load testing script to verify the backend event loop performance and database writing capacities under heavy loads.

1. Ensure your backend server is running (`npm start` in the `backend/` folder).
2. Run the load simulator:
   ```bash
   cd backend
   node load_simulator.js
   ```
3. The simulator will automatically:
   - Instantiate **600 concurrent players** using WebSocket connection nodes.
   - Join the stress test lobby room.
   - Trigger the start-game call.
   - Run the 5-round countdown and question flows.
   - Submit answers for all 600 players under a randomized human think-time delay (200ms to 5000ms).
   - Complete all 5 rounds, draw spin wheels, compile results, and output the final leaderboard to the console.

---

## 🔑 Key Features Demonstrated

### 1. Silent Gameplay
During active rounds, player choices are recorded silently. Button clicks transition immediately to a disabled "✓ Submitted" state. There are no score animations, correct/incorrect checkmarks, or live voting bar graphs. This prevents vote-steering or player collusion in tournament gameplay.

### 2. Synchronized Spin Wheel
Before Rounds 2, 3, 4, and 5, the wheel spins dynamically. The server calculates a random landing index and broadcasts it to all sockets. The clients run the rotation animations in parallel using a custom cubic ease-out curve. The canvas wheel plays sound ticks synchronously as borders cross the top indicator, landing on the chosen segment. Used topics are dynamically grayed out with a strike-through indicator.

### 3. Session Rejoin & Zero Data Loss
If a player drops connection at any point (e.g. mobile lock, Wi-Fi swap):
- The player scans the QR code (which is permanently displayed in the top-right corner of all screens).
- The client reads the `player_id` stored in `localStorage` and requests a rejoin.
- The server restores the player's connection, identifies the exact question and timer offset, and serves the state. If they had already clicked a choice, their answer remains locked and submitted.
