# 🏆 AI Trivia Arena

A real-time, multiplayer, synchronized AI trivia game website. Players scan a QR code to join a game lobby via Socket.io. Once the host starts the game, everyone competes concurrently answering 15 questions on a 15-second timer. Ranks update on a live leaderboard in real-time, and a winner is crowned at the end.

---

## 🚀 Key Features

* **Real-time Synchronization**: All players see identical questions and timer ticks simultaneously.
* **Dual Database Mode**: Connects to **PostgreSQL** in production, but falls back to a **Mock In-Memory Database** instantly if PostgreSQL credentials are not provided—allowing instant developer testing with zero setup.
* **Synchronized Timer**: 15-second timer per question controlled purely by the server to prevent client-side cheating.
* **Instant Leaderboard**: Updates scores and rankings within 100ms of any player buzzing.
* **Buzzer Locking**: Once a player selects an option, their buzzer locks, and they see immediate correct/wrong feedback.
* **Premium Glassmorphic Design**: Curated dark-themed UI built using modern HTML5, CSS3, and React.
* **Robust Image Fallbacks**: In case external AI logos fail to load or get rate-limited, the application displays custom styled logo fallbacks dynamically.

---

## 🛠️ Tech Stack

* **Frontend**: React.js 18+ (Vite), socket.io-client, CSS3 (Vanilla Glassmorphic Design System).
* **Backend**: Node.js, Express, Socket.io (namespaces, rooms), dotenv, pg (node-postgres connection pool).
* **Database**: PostgreSQL (UUID generation, check constraints, cascade relationships).

---

## ⚙️ Quick Start (Local Setup)

### 1. Configure Environment Variables
Copy `.env.example` to `.env` in the root:
```bash
cp .env.example .env
```
*(By default, leaving `DATABASE_URL` empty starts the server in Mock In-Memory Database mode so you can run it instantly.)*

### 2. Install and Start the Backend
```bash
cd backend
npm install
npm run dev
```
The server will start on `http://localhost:3000`.

### 3. Install and Start the Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Vite will start the client server (usually on `http://localhost:5173`). Open `http://localhost:5173` in multiple browser tabs to simulate multiplayer gameplay!

---

## 📊 Database Schema Setup

If connecting to a live PostgreSQL database, the server will **automatically execute and create** the required tables from `schema.sql` on startup. If you prefer to seed/create tables manually, execute:

```sql
-- Enable uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AI Apps Table
CREATE TABLE IF NOT EXISTS ai_apps (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  founder_name VARCHAR(100) NOT NULL,
  main_feature VARCHAR(255) NOT NULL,
  logo_url VARCHAR(255) NOT NULL
);

-- 2. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  question_number INT NOT NULL CHECK (question_number BETWEEN 1 AND 15),
  ai_app_id INT NOT NULL REFERENCES ai_apps(id) ON DELETE CASCADE,
  question_type VARCHAR(50) NOT NULL,
  question_text VARCHAR(500) NOT NULL,
  correct_option INT NOT NULL CHECK (correct_option BETWEEN 1 AND 3),
  option_1 VARCHAR(200) NOT NULL,
  option_2 VARCHAR(200) NOT NULL,
  option_3 VARCHAR(200) NOT NULL
);

-- 3. Game Sessions Table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL CHECK (status IN ('waiting', 'in_progress', 'finished')),
  current_question_number INT DEFAULT 0,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  total_players INT DEFAULT 0
);

-- 4. Player Scores Table
CREATE TABLE IF NOT EXISTS player_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  total_score INT DEFAULT 0,
  correct_answers_count INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (game_session_id, player_id)
);

-- 5. Answer Log Table
CREATE TABLE IF NOT EXISTS answer_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  question_number INT NOT NULL,
  selected_option INT NOT NULL CHECK (selected_option BETWEEN 1 AND 3),
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (game_session_id, player_id, question_number)
);
```

---

## 📡 Socket.io Event Documentation

All communication happens over the Socket.io namespace `/game`.

### Client to Server Events

#### 1. `join_game`
Sent when a player tries to join a room.
* **Payload**:
  ```json
  {
    "room_code": "ALPHA1",
    "player_name": "Alice",
    "player_id": "optional-uuid-reconnect"
  }
  ```

#### 2. `start_game`
Sent by the host (admin) to initiate the quiz gameplay loop.
* **Payload**:
  ```json
  {
    "room_code": "ALPHA1",
    "player_id": "host-player-uuid"
  }
  ```

#### 3. `submit_answer`
Sent when a player selects one of the 3 multiple-choice options.
* **Payload**:
  ```json
  {
    "room_code": "ALPHA1",
    "player_id": "player-uuid",
    "selected_option": 1
  }
  ```

#### 4. `play_again`
Sent by the host (admin) at the results page to reset the session and return all connected players to the lobby.
* **Payload**:
  ```json
  {
    "room_code": "ALPHA1",
    "player_id": "host-player-uuid"
  }
  ```

---

### Server to Client Events

#### 1. `joined_game`
Acknowledges a player successfully joined a game.
* **Payload**:
  ```json
  {
    "player_id": "player-uuid-generated",
    "player_name": "Alice",
    "room_code": "ALPHA1",
    "is_admin": true,
    "game_status": "waiting",
    "current_question": 0
  }
  ```

#### 2. `player_list_update`
Broadcasts the list of joined players in the lobby in real-time.
* **Payload**:
  ```json
  [
    { "player_name": "Alice", "is_admin": true },
    { "player_name": "Bob", "is_admin": false }
  ]
  ```

#### 3. `question_loaded`
Fired when a new question starts. Triggers the screen change to gameplay.
* **Payload**:
  ```json
  {
    "question_number": 1,
    "ai_logo_url": "https://openai.com/images/chatgpt-logo.png",
    "question_text": "What is the name of this AI?",
    "option_1": "ChatGPT",
    "option_2": "Gemini",
    "option_3": "Claude",
    "timer_seconds": 15
  }
  ```

#### 4. `timer_tick`
Sent every second during the active question countdown.
* **Payload**:
  ```json
  { "seconds_remaining": 14 }
  ```

#### 5. `answer_feedback`
Sent immediately to a player after they click an option, informing them if they were correct.
* **Payload**:
  ```json
  {
    "is_correct": true,
    "correct_option": 1,
    "correct_answer_text": "ChatGPT"
  }
  ```

#### 6. `leaderboard_update`
Broadcasts updated rankings within 100ms of any score change.
* **Payload**:
  ```json
  [
    { "rank": 1, "player_name": "Alice", "total_score": 1 },
    { "rank": 2, "player_name": "Bob", "total_score": 0 }
  ]
  ```

#### 7. `answer_reveal`
Sent when the 15-second timer expires. Locks answers and shows the correct option to everyone.
* **Payload**:
  ```json
  {
    "correct_option": 1,
    "correct_answer_text": "ChatGPT",
    "leaderboard": [ ... ]
  }
  ```

#### 8. `game_finished`
Sent after Q15 timer reveal finishes. Moves everyone to the podium page.
* **Payload**:
  ```json
  {
    "winner": {
      "rank": 1,
      "player_name": "Alice",
      "score": 15
    },
    "final_leaderboard": [ ... ]
  }
  ```

#### 9. `game_reset`
Tells clients to return to the lobby screen.

---

## 🌐 Cloud Deployment Guide

This project is structured for effortless hosting on cloud platforms like **Render**, **DigitalOcean**, or **AWS**.

### Hosting on Render (Recommended & Fastest)

Render automatically terminates SSL/TLS (providing `https://` and `wss://`), which is required for WebSockets.

1. **Database Setup**:
   * Create a new PostgreSQL Database on Render.
   * Copy the connection string (`External Database URL`).

2. **Backend Service**:
   * Create a new **Web Service** on Render connected to your git repository.
   * Set **Root Directory** to `backend`.
   * Set **Build Command** to `npm install`.
   * Set **Start Command** to `npm start`.
   * Add **Environment Variables**:
     * `DATABASE_URL`: *[Paste your Render PostgreSQL connection string]*
     * `NODE_ENV`: `production`
     * `PORT`: `3000` (Render exposes this automatically)
     * `FRONTEND_URL`: *[Paste your Render Frontend URL once created]*
     * `DB_SSL`: `true`

3. **Frontend Service**:
   * Create a new **Static Site** on Render.
   * Set **Root Directory** to `frontend`.
   * Set **Build Command** to `npm run build`.
   * Set **Publish Directory** to `dist`.
   * Add **Environment Variables**:
     * `VITE_BACKEND_URL`: *[Paste your Render Backend Service URL]*

Render will auto-deploy, automatically manage the SSL certificates, and hook up the WebSockets immediately.
