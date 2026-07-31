-- Enable uuid-ossp extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. AI Apps Table (existing - used by Game 1)
CREATE TABLE IF NOT EXISTS ai_apps (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  founder_name VARCHAR(100) NOT NULL,
  main_feature VARCHAR(255) NOT NULL,
  logo_url VARCHAR(255) NOT NULL
);

-- 2. Game Metadata Table (NEW - tracks available games)
CREATE TABLE IF NOT EXISTS game_metadata (
  id SERIAL PRIMARY KEY,
  game_number INT NOT NULL UNIQUE CHECK (game_number IN (1, 2)),
  game_name VARCHAR(100) NOT NULL,
  game_description VARCHAR(500),
  total_questions INT DEFAULT 10,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Questions Table (modified for multi-game and 4 choices support)
CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  game_number INT NOT NULL DEFAULT 1 REFERENCES game_metadata(game_number) ON DELETE CASCADE,
  question_number INT NOT NULL CHECK (question_number BETWEEN 1 AND 10),
  ai_app_id INT REFERENCES ai_apps(id) ON DELETE CASCADE, -- Made nullable for Game 2 technology questions
  question_type VARCHAR(50) NOT NULL,
  question_text VARCHAR(500) NOT NULL,
  correct_option INT NOT NULL CHECK (correct_option BETWEEN 1 AND 4), -- Relaxed check constraint (1-4)
  option_1 VARCHAR(250) NOT NULL,
  option_2 VARCHAR(250) NOT NULL,
  option_3 VARCHAR(250) NOT NULL,
  option_4 VARCHAR(250) DEFAULT '', -- Added option_4
  explanation VARCHAR(500),
  difficulty VARCHAR(20) DEFAULT 'medium',
  UNIQUE (game_number, question_number)
);

-- 4. Game Sessions Table (modified to support sequential multi-game tracking)
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

-- 5. Game Progression Table (NEW - tracks progression status of games)
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

-- 6. Player Scores Table (modified for partition-based and cumulative scoring)
CREATE TABLE IF NOT EXISTS player_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  total_score INT DEFAULT 0, -- Keeps cumulative_score/total_score compatible
  correct_answers_count INT DEFAULT 0,
  game_1_score INT DEFAULT 0, -- Added partition score
  game_2_score INT DEFAULT 0, -- Added partition score
  cumulative_score INT DEFAULT 0, -- Added cumulative score
  games_played INT DEFAULT 0,
  rank_final INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (game_session_id, player_id)
);

-- 7. Answer Log Table (modified to support multiple game rounds)
CREATE TABLE IF NOT EXISTS answer_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL,
  game_number INT NOT NULL DEFAULT 1,
  question_number INT NOT NULL,
  selected_option INT NOT NULL CHECK (selected_option BETWEEN 1 AND 4), -- Relaxed to support option_4
  is_correct BOOLEAN NOT NULL,
  response_time_ms INT,
  answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (game_session_id, player_id, game_number, question_number)
);
