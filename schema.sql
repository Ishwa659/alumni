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
