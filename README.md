# 🏆 AI Trivia Arena (Multi-Game Upgrade)

A real-time, multiplayer, synchronized AI trivia game website supporting sequential multi-game play with admin-in-the-loop approval. 

Players scan a single QR code to join the game lobby via Socket.io. Once the host starts the game, everyone competes concurrently answering synchronized multiple-choice questions on a 15-second timer. 

This upgraded version supports a consecutive 2-game tournament:
* **Game 1**: **AI CHATBOT TRIVIA** (15 questions, 3 options each)
* **Game 2**: **IMAGE-TO-3D CONVERSION TECHNOLOGY** (15 technical questions, 4 options each)

Ranks and cumulative scores update in real-time. Ranks are determined by the cumulative score across both games, crowning the ultimate Tournament Champion at the end.

---

## 🚀 Key Features

* **Multi-Game Progression**: Sequential play through Game 1 and Game 2, separated by an admin results review lock.
* **Dynamic Options Rendering**: Backward-compatible rendering support. It renders 3 options for Game 1 and 4 options for Game 2 automatically by filtering out empty options.
* **Live Sidebar Leaderboards**: Grid layout displaying Game 1 scores, Game 2 scores, and Cumulative total scores in real-time.
* **Visual Podium**: Premium 3D esports-style podium (Gold 🥇, Silver 🥈, Bronze 🥉) on the final standings page.
* **Results Export**: Instantly export final rankings as a CSV file.
* **Dual Database Mode**: Connects to **PostgreSQL** in production, but falls back to a **Mock In-Memory Database** instantly if PostgreSQL credentials are not provided—allowing instant developer testing with zero setup.
* **Results Reconnection**: Players who refresh their browsers during results screens are immediately caught up with the current rankings rather than getting stuck on a blank screen.

---

## 🎮 Multi-Game Workflow

```
[ LOBBY SCREEN ]
       │  (Admin clicks "START GAME")
       ▼
[ GAME 1: AI Chatbot Trivia (15 Questions) ]
       │  (Synchronized 15s timer per question)
       ▼
[ GAME 1 RESULTS SCREEN (Locked) ]
       │  (Admin reviews scores, clicks "START GAME 2")
       ▼
[ GAME 2: Image-to-3D Tech (15 Questions) ]
       │  (Dynamic 4-option gameplay layout)
       ▼
[ GAME 2 RESULTS SCREEN ]
       │  (Shows Champion/tie tags, player clicks to proceed)
       ▼
[ FINAL TOURNAMENT STANDINGS & PODIUM ]
       │  (Download CSV results / Admin clicks Play Again)
       ▼
(Reset players to Lobby)
```

---

## ⚙️ Quick Start (Local Setup)

### 1. Configure Environment Variables
Copy `.env.example` to `.env` in the backend folder:
```bash
cp backend/.env.example backend/.env
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
Vite will start the client server on `http://localhost:5173`. Open `http://localhost:5173/?room=TEST1` in multiple browser tabs to simulate multiplayer gameplay!

---

## 📊 Database Schema Setup

The database contains tables that support multi-game separation, progression tracking, and cumulative scores. If connecting to a live PostgreSQL database, the server will **automatically execute and apply** migrations on startup.

The complete SQL schema from [schema.sql](file:///c:/Users/USER/Desktop/alumni/schema.sql) is:

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

-- 2. Game Metadata Table
CREATE TABLE IF NOT EXISTS game_metadata (
  id SERIAL PRIMARY KEY,
  game_number INT NOT NULL UNIQUE CHECK (game_number IN (1, 2)),
  game_name VARCHAR(100) NOT NULL,
  game_description VARCHAR(500),
  total_questions INT DEFAULT 15,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Questions Table
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  game_number INT NOT NULL DEFAULT 1 REFERENCES game_metadata(game_number) ON DELETE CASCADE,
  question_number INT NOT NULL CHECK (question_number BETWEEN 1 AND 15),
  ai_app_id INT REFERENCES ai_apps(id) ON DELETE CASCADE,
  question_type VARCHAR(50) NOT NULL,
  question_text VARCHAR(500) NOT NULL,
  correct_option INT NOT NULL CHECK (correct_option BETWEEN 1 AND 4),
  option_1 VARCHAR(250) NOT NULL,
  option_2 VARCHAR(250) NOT NULL,
  option_3 VARCHAR(250) NOT NULL,
  option_4 VARCHAR(250) DEFAULT '',
  explanation VARCHAR(500),
  difficulty VARCHAR(20) DEFAULT 'medium',
  UNIQUE (game_number, question_number)
);

-- 4. Game Sessions Table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(50) NOT NULL DEFAULT 'lobby' CHECK (status IN ('waiting', 'lobby', 'game_1_active', 'game_1_finished', 'game_2_active', 'game_2_finished', 'completed', 'in_progress', 'finished')),
  current_game_number INT DEFAULT 0,
  current_question_number INT DEFAULT 0,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  total_players INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Game Progression Table
CREATE TABLE IF NOT EXISTS game_progression (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID NOT NULL UNIQUE REFERENCES game_sessions(id) ON DELETE CASCADE,
  current_game_number INT DEFAULT 0,
  game_1_started BOOLEAN DEFAULT FALSE,
  game_1_finished BOOLEAN DEFAULT FALSE,
  game_1_started_at TIMESTAMP,
  game_1_finished_at TIMESTAMP,
  game_2_started BOOLEAN DEFAULT FALSE,
  game_2_finished BOOLEAN DEFAULT FALSE,
  game_2_started_at TIMESTAMP,
  game_2_finished_at TIMESTAMP,
  all_games_finished BOOLEAN DEFAULT FALSE,
  tournament_completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Player Scores Table
CREATE TABLE IF NOT EXISTS player_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  total_score INT DEFAULT 0,
  correct_answers_count INT DEFAULT 0,
  game_1_score INT DEFAULT 0,
  game_2_score INT DEFAULT 0,
  cumulative_score INT DEFAULT 0,
  games_played INT DEFAULT 0,
  rank_final INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (game_session_id, player_id)
);

-- 7. Answer Log Table
CREATE TABLE IF NOT EXISTS answer_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  game_number INT NOT NULL DEFAULT 1,
  question_number INT NOT NULL,
  selected_option INT NOT NULL CHECK (selected_option BETWEEN 1 AND 4),
  is_correct BOOLEAN NOT NULL,
  response_time_ms INT,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (game_session_id, player_id, game_number, question_number)
);
```

---

## 📡 Socket.io Event Documentation

All communication happens over the Socket.io namespace `/game`.

### Client to Server Events

* **`join_game`** (Existing): Triggered when a player enters nickname and connects.
  * *Payload*: `{ "room_code": "TEST1", "player_name": "Alice", "player_id": "optional-uuid" }`
* **`start_game`** (Existing): Sent by admin to begin Game 1.
  * *Payload*: `{ "room_code": "TEST1", "player_id": "admin-uuid" }`
* **`submit_answer`** (Modified): Sent when a player clicks an option.
  * *Payload*: `{ "room_code": "TEST1", "player_id": "player-uuid", "selected_option": 2 }`
* **`start_game_2`** (NEW): Sent by admin on the Game 1 results page to initiate Game 2 reconstruction trivia.
  * *Payload*: `{ "room_code": "TEST1", "player_id": "admin-uuid" }`
* **`play_again`** (Existing): Resets the tournament (resets scores, keeps players, and returns all to lobby).
  * *Payload*: `{ "room_code": "TEST1", "player_id": "admin-uuid" }`

---

### Server to Client Events

* **`game_1_started`** (NEW): Sent when Game 1 starts.
  * *Payload*: `{ "game_name": "AI Chatbot Trivia", "game_number": 1, "total_questions": 15 }`
* **`game_1_finished`** (NEW): Fired after Game 1 Question 15 answer reveal completes.
  * *Payload*:
    ```json
    {
      "game_name": "AI Chatbot Trivia",
      "game_number": 1,
      "game_1_leaderboard": [
        { "rank": 1, "player_name": "Alice", "game_1_score": 15 }
      ],
      "cumulative_leaderboard": [
        { "rank": 1, "player_name": "Alice", "game_1_score": 15, "game_2_score": 0, "cumulative_score": 15 }
      ],
      "message": "Game 1 Complete! Waiting for admin to start Game 2..."
    }
    ```
* **`game_2_started`** (NEW): Sent when Game 2 starts.
  * *Payload*: `{ "game_name": "Image-to-3D Conversion Technology", "game_number": 2, "total_questions": 15 }`
* **`game_2_finished`** (NEW): Sent after Game 2 Question 15 completes.
  * *Payload*:
    ```json
    {
      "game_name": "Image-to-3D Conversion Technology",
      "game_number": 2,
      "game_2_leaderboard": [
        { "rank": 1, "player_name": "Carol", "game_2_score": 14 }
      ],
      "cumulative_leaderboard": [
        { "rank": 1, "player_name": "Alice", "game_1_score": 15, "game_2_score": 13, "cumulative_score": 28 },
        { "rank": 2, "player_name": "Carol", "game_1_score": 14, "game_2_score": 14, "cumulative_score": 28 }
      ],
      "message": "All games completed!"
    }
    ```
* **`all_games_finished`** (NEW): Fired when the final rankings and tournament standings are complete.
  * *Payload*:
    ```json
    {
      "winner": { "rank": 1, "player_name": "Alice", "total_score": 28 },
      "final_leaderboard": [
        { "rank": 1, "name": "Alice", "game_1": 15, "game_2": 13, "total": 28 },
        { "rank": 2, "name": "Carol", "game_1": 14, "game_2": 14, "total": 28 }
      ]
    }
    ```
* **`question_loaded`** (Existing): Displays the current active question.
* **`timer_tick`** (Existing): Sends countdown ticks.
* **`answer_feedback`** (Existing): Sends correct/wrong feedback.
* **`leaderboard_update`** (Existing): real-time rankings broadcast.

---

## 🧠 Game 2: Image-to-3D Tech Dataset (JSON Format)

The backend seeds the following 15 technical questions in [server.js](file:///c:/Users/USER/Desktop/alumni/backend/server.js):

```json
[
  {
    "game_number": 2,
    "question_number": 1,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "Which neural network architecture is most commonly used for 3D reconstruction from single images?",
    "correct_option": 1,
    "option_1": "Convolutional Neural Networks (CNNs)",
    "option_2": "Recurrent Neural Networks (RNNs)",
    "option_3": "Transformer networks only",
    "option_4": "Support Vector Machines (SVMs)",
    "explanation": "CNNs extract 2D features which are then used for 3D reconstruction.",
    "difficulty": "medium"
  },
  {
    "game_number": 2,
    "question_number": 2,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "What is NeRF (Neural Radiance Fields) primarily used for?",
    "correct_option": 1,
    "option_1": "Converting 2D images to 3D volumetric representations",
    "option_2": "Text-to-image generation",
    "option_3": "Image segmentation",
    "option_4": "Depth-only estimation",
    "explanation": "NeRF uses implicit neural representations to model 3D scenes.",
    "difficulty": "medium"
  },
  {
    "game_number": 2,
    "question_number": 3,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "Which loss function is commonly used to supervise depth estimation networks?",
    "correct_option": 1,
    "option_1": "L1 loss or smooth L1 loss",
    "option_2": "Binary cross-entropy",
    "option_3": "Kullback-Leibler divergence",
    "option_4": "Contrastive loss",
    "explanation": "L1 loss directly penalizes depth prediction errors.",
    "difficulty": "hard"
  },
  {
    "game_number": 2,
    "question_number": 4,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "What is a point cloud in 3D computer vision?",
    "correct_option": 1,
    "option_1": "A set of (x, y, z) coordinates in 3D space",
    "option_2": "A continuous mesh surface",
    "option_3": "A 2D image array",
    "option_4": "A video frame sequence",
    "explanation": "Point clouds are discrete 3D spatial data representations.",
    "difficulty": "easy"
  },
  {
    "game_number": 2,
    "question_number": 5,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "Which method is used to convert point clouds to mesh surfaces?",
    "correct_option": 1,
    "option_1": "Poisson surface reconstruction or ball pivoting algorithm",
    "option_2": "Gaussian blur filters",
    "option_3": "Histogram equalization",
    "option_4": "Fourier transforms",
    "explanation": "These are standard surface reconstruction techniques for point clouds.",
    "difficulty": "hard"
  },
  {
    "game_number": 2,
    "question_number": 6,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "What does SDF (Signed Distance Function) represent in 3D generation?",
    "correct_option": 1,
    "option_1": "Distance from a point to the nearest surface, with sign indicating inside/outside",
    "option_2": "Surface Density Factor",
    "option_3": "Spatial Depth Filtering",
    "option_4": "Scale Distortion Function",
    "explanation": "SDFs are implicit representations used in neural 3D modeling.",
    "difficulty": "hard"
  },
  {
    "game_number": 2,
    "question_number": 7,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "Which of these is a key challenge in image-to-3D conversion?",
    "correct_option": 1,
    "option_1": "Ambiguity in 3D interpretation from 2D (multiple valid 3D solutions)",
    "option_2": "Insufficient GPU memory",
    "option_3": "Too much training data",
    "option_4": "Network overfitting only",
    "explanation": "The inverse problem of reconstructing 3D from 2D is inherently ambiguous.",
    "difficulty": "medium"
  },
  {
    "game_number": 2,
    "question_number": 8,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "What is multi-view 3D reconstruction?",
    "correct_option": 1,
    "option_1": "Using multiple 2D images from different viewpoints to reconstruct 3D",
    "option_2": "Creating multiple independent 3D models",
    "option_3": "Viewing a 3D model from different angles",
    "option_4": "Using video frames for 3D",
    "explanation": "Multiple views provide geometric constraints for better reconstruction.",
    "difficulty": "medium"
  },
  {
    "game_number": 2,
    "question_number": 9,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "Which deep learning technique converts depth maps to 3D meshes?",
    "correct_option": 1,
    "option_1": "Volumetric CNNs or implicit function networks",
    "option_2": "Generative Adversarial Networks (GANs) only",
    "option_3": "Recurrent neural networks",
    "option_4": "K-means clustering",
    "explanation": "Volumetric approaches and implicit representations handle depth-to-mesh conversion.",
    "difficulty": "hard"
  },
  {
    "game_number": 2,
    "question_number": 10,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "What does photogrammetry fundamentally rely on?",
    "correct_option": 1,
    "option_1": "Epipolar geometry and feature correspondence between images",
    "option_2": "Color space transformations",
    "option_3": "Edge detection filters",
    "option_4": "Texture synthesis",
    "explanation": "Photogrammetry reconstructs 3D from matching features across images.",
    "difficulty": "medium"
  },
  {
    "game_number": 2,
    "question_number": 11,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "Which layer type is essential in image-to-3D encoder-decoder architectures?",
    "correct_option": 1,
    "option_1": "Transposed convolutions (deconvolutions) for upsampling",
    "option_2": "Max pooling layers",
    "option_3": "Activation functions only",
    "option_4": "Dropout layers exclusively",
    "explanation": "Deconvolutions progressively increase spatial dimensions in decoder.",
    "difficulty": "medium"
  },
  {
    "game_number": 2,
    "question_number": 12,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "What is the primary output constraint for stable 3D generation?",
    "correct_option": 1,
    "option_1": "Ensuring geometric consistency and closed mesh surfaces",
    "option_2": "Minimizing image file size",
    "option_3": "Maximizing polygon count",
    "option_4": "Requiring RGB textures",
    "explanation": "Geometric constraints prevent invalid/degenerate 3D shapes.",
    "difficulty": "medium"
  },
  {
    "game_number": 2,
    "question_number": 13,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "Which component estimates depth from a single 2D image?",
    "correct_option": 1,
    "option_1": "Monocular depth estimation network",
    "option_2": "Color histogram analyzer",
    "option_3": "Edge detection filter",
    "option_4": "Texture classifier",
    "explanation": "Monocular depth networks infer 3D structure from single-view images.",
    "difficulty": "easy"
  },
  {
    "game_number": 2,
    "question_number": 14,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "What is a key advantage of implicit 3D representations (like NeRF) over explicit meshes?",
    "correct_option": 1,
    "option_1": "Continuous, resolution-independent representation; no discretization artifacts",
    "option_2": "Faster rendering speed",
    "option_3": "Smaller file sizes",
    "option_4": "Easier manual editing",
    "explanation": "Implicit functions provide smooth, detail-rich 3D without mesh topology constraints.",
    "difficulty": "medium"
  },
  {
    "game_number": 2,
    "question_number": 15,
    "ai_app_id": null,
    "question_type": "tech",
    "question_text": "Which training technique helps image-to-3D models generalize across object categories?",
    "correct_option": 1,
    "option_1": "Multi-task learning and category-agnostic feature extraction",
    "option_2": "Data augmentation via color jittering only",
    "option_3": "Larger batch sizes exclusively",
    "option_4": "Longer training duration only",
    "explanation": "Multi-task learning + shared representations improve cross-category generalization.",
    "difficulty": "hard"
  }
]
```

---

## 🌐 Production Cloud Deployment Guide

### Deploying to Render (Fastest Setup)

Render handles reverse proxies and automatically terminates SSL certificates, which is crucial for secure WSS connection protocols (`wss://`).

1. **Deploy Render PostgreSQL Managed Database**:
   - In Render, click **New** -> **Database**. Name your database and create it.
   - Once generated, copy the `External Database URL`.

2. **Deploy Node.js backend Web Service**:
   - Select **New** -> **Web Service**. Connect it to your Git repository.
   - Configure:
     - **Root Directory**: `backend`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Under **Environment Variables**, add:
     - `DATABASE_URL`: *[Paste PostgreSQL External Database URL]*
     - `NODE_ENV`: `production`
     - `PORT`: `3000` (Render exposes this, no need to open port)
     - `DB_SSL`: `true`
     - `FRONTEND_URL`: *[URL of Frontend Static Site, created in next step]*

3. **Deploy React Vite frontend Static Site**:
   - Select **New** -> **Static Site**. Connect to the same Git repository.
   - Configure:
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build`
     - **Publish Directory**: `dist`
   - Under **Environment Variables**, add:
     - `VITE_BACKEND_URL`: *[Paste Backend Service URL generated in Step 2]*

Render will spin up both, execute DB setup from `schema.sql` automatically, and the game will be immediately live.

---

## 👑 Host (Admin) Operations Guide

1. **Lobby Setup**:
   - The first player to connect to a new room code automatically gains **HOST** privileges. The header will indicate this with a `HOST` badge.
   - Share the room URL or the displayed QR code with 30-40 players.
   - Once players are in the lobby list, click **START GAME** to begin.

2. **Sequential Locks**:
   - After Game 1, all players are locked on a results viewing page.
   - The Host reviews the leaderboard results on the same screen and clicks **START GAME 2 (Image-to-3D Conversion Technology)** when ready to progress.
   - After Game 2, click **VIEW FINAL TOURNAMENT STANDINGS** to reveal the podium.
   - The Host can restart the game session by clicking **PLAY AGAIN** which keeps player names and room codes but clears scores.
