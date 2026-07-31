const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

// Primary process clustering support
if (cluster.isPrimary && process.env.CLUSTER_ENABLED === 'true') {
  console.log(`🚀 Primary process ${process.pid} is running`);
  
  // Fork workers
  const workerCount = process.env.WORKER_COUNT ? parseInt(process.env.WORKER_COUNT, 10) : Math.min(numCPUs, 4);
  for (let i = 0; i < workerCount; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`⚠️ Worker process ${worker.process.pid} died. Forking a new one...`);
    cluster.fork();
  });
  return; // Stop execution of the primary process here
}

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Request compression middleware for optimization under scale
app.use(compression());

// Enable CORS for frontend origin
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: frontendUrl,
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// Redis client setup for adapter and caching
let pubClient = null;
let subClient = null;
let redisConnected = false;

const redisUrl = process.env.REDIS_URL;
if (redisUrl) {
  try {
    pubClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000
    });
    subClient = pubClient.duplicate();
    
    pubClient.on('connect', () => {
      console.log('✅ Connected to Redis (Publisher)');
      redisConnected = true;
    });
    
    pubClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
    });
  } catch (err) {
    console.error('❌ Failed to initialize Redis clients:', err.message);
  }
} else {
  console.log('ℹ️ DATABASE_URL/REDIS_URL not detected. Running with In-Memory fallback.');
}

// In-Memory cache fallback structure
const inMemoryCache = new Map();

const cache = {
  get: async (key) => {
    if (redisConnected && pubClient) {
      try {
        return await pubClient.get(key);
      } catch (e) {
        console.error('Redis cache get error:', e.message);
      }
    }
    const item = inMemoryCache.get(key);
    if (item && item.expiry > Date.now()) {
      return item.value;
    }
    return null;
  },
  
  set: async (key, value, ttlSeconds) => {
    if (redisConnected && pubClient) {
      try {
        if (ttlSeconds) {
          await pubClient.set(key, value, 'EX', ttlSeconds);
        } else {
          await pubClient.set(key, value);
        }
        return;
      } catch (e) {
        console.error('Redis cache set error:', e.message);
      }
    }
    inMemoryCache.set(key, {
      value,
      expiry: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : Infinity
    });
  },
  
  del: async (key) => {
    if (redisConnected && pubClient) {
      try {
        await pubClient.del(key);
        return;
      } catch (e) {
        console.error('Redis cache del error:', e.message);
      }
    }
    inMemoryCache.delete(key);
  }
};

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Compression & scaling configurations for Socket.io
  perMessageDeflate: {
    threshold: 1024
  },
  pingTimeout: 20000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true
  }
});

// Setup socket.io redis adapter if connected
if (redisConnected && pubClient && subClient) {
  io.adapter(createAdapter(pubClient, subClient));
  console.log('🔌 Socket.io Redis Adapter initialized successfully.');
}


// Seed data definition for 5 AIs and 15 questions
const seedAis = [
  { id: 1, name: 'ChatGPT', founder_name: 'Sam Altman', main_feature: 'Conversational AI', logo_url: 'https://openai.com/images/chatgpt-logo.png' },
  { id: 2, name: 'Claude', founder_name: 'Dario Amodei', main_feature: 'Constitutional AI', logo_url: 'https://anthropic.com/images/claude-logo.png' },
  { id: 3, name: 'Gemini', founder_name: 'Sundar Pichai', main_feature: 'Multimodal AI', logo_url: 'https://google.com/images/gemini-logo.png' },
  { id: 4, name: 'Copilot', founder_name: 'Satya Nadella', main_feature: 'Code & Productivity', logo_url: 'https://microsoft.com/images/copilot-logo.png' },
  { id: 5, name: 'Grok', founder_name: 'Elon Musk', main_feature: 'Real-time Information', logo_url: 'https://xai.com/images/grok-logo.png' }
];

const seedGameMetadata = [
  { game_number: 1, game_name: 'AI Chatbot Trivia', game_description: 'Questions about ChatGPT, Claude, Gemini, etc.', total_questions: 10, category: 'ai_tools' },
  { game_number: 2, game_name: 'Image-to-3D Conversion Technology', game_description: 'Questions about 3D reconstruction, neural rendering, mesh generation, etc.', total_questions: 10, category: 'ai_technology' }
];

const seedQuestions = [
  // === EASY (Q1-Q5) ===
  { game_number: 1, question_number: 1, ai_app_id: 1, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 1, option_1: 'ChatGPT', option_2: 'Gemini', option_3: 'Claude', option_4: '', explanation: 'ChatGPT is developed by OpenAI.', difficulty: 'easy' },
  { game_number: 1, question_number: 2, ai_app_id: 2, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 3, option_1: 'Grok', option_2: 'Copilot', option_3: 'Claude', option_4: '', explanation: 'Claude is developed by Anthropic.', difficulty: 'easy' },
  { game_number: 1, question_number: 3, ai_app_id: 3, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 1, option_1: 'Gemini', option_2: 'Claude', option_3: 'ChatGPT', option_4: '', explanation: 'Gemini is Google flagship model.', difficulty: 'easy' },
  { game_number: 1, question_number: 4, ai_app_id: 4, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 3, option_1: 'Grok', option_2: 'ChatGPT', option_3: 'Copilot', option_4: '', explanation: 'GitHub/Microsoft assistant is called Copilot.', difficulty: 'easy' },
  { game_number: 1, question_number: 5, ai_app_id: 5, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 1, option_1: 'Grok', option_2: 'Gemini', option_3: 'Claude', option_4: '', explanation: 'Grok is the AI built by xAI.', difficulty: 'easy' },

  // === MEDIUM (Q6-Q8) ===
  { game_number: 1, question_number: 6, ai_app_id: 1, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 2, option_1: 'Elon Musk', option_2: 'Sam Altman', option_3: 'Sundar Pichai', option_4: '', explanation: 'OpenAI was co-founded by Sam Altman.', difficulty: 'medium' },
  { game_number: 1, question_number: 7, ai_app_id: 3, question_type: 'founder', question_text: 'Who leads the company behind this AI?', correct_option: 2, option_1: 'Elon Musk', option_2: 'Sundar Pichai', option_3: 'Dario Amodei', option_4: '', explanation: 'Gemini was developed by Google under Sundar Pichai.', difficulty: 'medium' },
  { game_number: 1, question_number: 8, ai_app_id: 5, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 2, option_1: 'Sam Altman', option_2: 'Elon Musk', option_3: 'Satya Nadella', option_4: '', explanation: 'Elon Musk founded xAI in 2023.', difficulty: 'medium' },

  // === HARD (Q9-Q10) ===
  { game_number: 1, question_number: 9, ai_app_id: 2, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 2, option_1: 'Code & Productivity', option_2: 'Constitutional AI', option_3: 'Real-time Information', option_4: '', explanation: 'Anthropic trains Claude using Constitutional AI feedback.', difficulty: 'hard' },
  { game_number: 1, question_number: 10, ai_app_id: 3, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 2, option_1: 'Conversational AI', option_2: 'Multimodal AI', option_3: 'Real-time Information', option_4: '', explanation: 'Gemini is natively built as a multimodal AI model.', difficulty: 'hard' }
];

const seedQuestionsGame2 = [
  // === EASY (Q1-Q4) ===
  { game_number: 2, question_number: 1, ai_app_id: null, question_type: 'tech', question_text: 'What is a 3D model?', correct_option: 1, option_1: 'A digital object with height, width and depth', option_2: 'A flat 2D image', option_3: 'A type of video format', option_4: 'A sound file', explanation: '3D models represent objects in three dimensions.', difficulty: 'easy' },
  { game_number: 2, question_number: 2, ai_app_id: null, question_type: 'tech', question_text: 'What is a point cloud?', correct_option: 1, option_1: 'A set of 3D points in space', option_2: 'A type of weather data', option_3: 'A 2D image filter', option_4: 'A cloud storage system', explanation: 'Point clouds are collections of 3D coordinates.', difficulty: 'easy' },
  { game_number: 2, question_number: 3, ai_app_id: null, question_type: 'tech', question_text: 'What does "depth" mean in 3D imaging?', correct_option: 2, option_1: 'The color of a pixel', option_2: 'How far an object is from the camera', option_3: 'The brightness of an image', option_4: 'The size of a file', explanation: 'Depth tells us the distance from camera to objects.', difficulty: 'easy' },
  { game_number: 2, question_number: 4, ai_app_id: null, question_type: 'tech', question_text: 'What is a mesh in 3D graphics?', correct_option: 3, option_1: 'A type of texture', option_2: 'A lighting effect', option_3: 'A surface made of connected triangles', option_4: 'A camera setting', explanation: 'Meshes use polygons (usually triangles) to define surfaces.', difficulty: 'easy' },

  // === MEDIUM (Q5-Q7) ===
  { game_number: 2, question_number: 5, ai_app_id: null, question_type: 'tech', question_text: 'What is NeRF used for?', correct_option: 1, option_1: 'Turning photos into 3D scenes', option_2: 'Editing text documents', option_3: 'Compressing video files', option_4: 'Creating music', explanation: 'NeRF creates 3D views from a set of 2D photos.', difficulty: 'medium' },
  { game_number: 2, question_number: 6, ai_app_id: null, question_type: 'tech', question_text: 'What is photogrammetry?', correct_option: 2, option_1: 'Taking photos with a special camera', option_2: 'Creating 3D models from multiple photos', option_3: 'Editing photos on a computer', option_4: 'Printing 3D objects', explanation: 'Photogrammetry rebuilds 3D shapes using many photos.', difficulty: 'medium' },
  { game_number: 2, question_number: 7, ai_app_id: null, question_type: 'tech', question_text: 'What is the biggest challenge in image-to-3D?', correct_option: 1, option_1: 'One photo can match many 3D shapes', option_2: 'Photos are too large', option_3: 'Cameras are too slow', option_4: 'Colors get lost', explanation: 'A single 2D image is ambiguous — many 3D shapes could match it.', difficulty: 'medium' },

  // === HARD (Q8-Q10) ===
  { game_number: 2, question_number: 8, ai_app_id: null, question_type: 'tech', question_text: 'Which AI type is best for extracting 3D features from images?', correct_option: 1, option_1: 'Convolutional Neural Networks (CNNs)', option_2: 'Decision Trees', option_3: 'Linear Regression', option_4: 'K-Means Clustering', explanation: 'CNNs are ideal for processing image data for 3D tasks.', difficulty: 'hard' },
  { game_number: 2, question_number: 9, ai_app_id: null, question_type: 'tech', question_text: 'What does depth estimation predict?', correct_option: 2, option_1: 'The color of each pixel', option_2: 'The distance of each pixel from the camera', option_3: 'The brightness of the image', option_4: 'The resolution of the image', explanation: 'Depth estimation assigns a distance value to each pixel.', difficulty: 'hard' },
  { game_number: 2, question_number: 10, ai_app_id: null, question_type: 'tech', question_text: 'Why are multiple views better for 3D reconstruction?', correct_option: 3, option_1: 'They make the image brighter', option_2: 'They reduce file size', option_3: 'They remove ambiguity about 3D shape', option_4: 'They speed up rendering', explanation: 'Multiple views give geometric clues that reduce guesswork.', difficulty: 'hard' }
];

// Database state mode
let useMockDb = false;
let pool = null;

// In-Memory Database mocks
const mockDb = {
  ai_apps: [...seedAis],
  game_metadata: [...seedGameMetadata],
  questions: [...seedQuestions, ...seedQuestionsGame2],
  game_sessions: {},
  game_progression: {},
  player_scores: {}, // key: game_session_id-player_id -> score row
  answer_logs: []
};

// Try connecting to PostgreSQL
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.warn('⚠️ DATABASE_URL not specified in environment. Falling back to Mock In-Memory Database.');
  useMockDb = true;
} else {
  pool = new Pool({
    connectionString: dbUrl,
    max: 100, // Connection pooling: 50-100 connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  pool.connect()
    .then(async (client) => {
      console.log('✅ Connected to PostgreSQL database.');
      client.release();
      await initializeDatabase();
    })
    .catch((err) => {
      console.error('❌ Failed to connect to PostgreSQL. Falling back to Mock In-Memory Database.', err.message);
      useMockDb = true;
    });
}

// Initialize tables and seed database
async function initializeDatabase() {
  if (useMockDb) return;
  try {
    // 0. Check and apply database migrations dynamically
    console.log('🔄 Checking and applying database migrations...');
    
    // Create game_metadata
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game_metadata (
        id SERIAL PRIMARY KEY,
        game_number INT NOT NULL UNIQUE CHECK (game_number IN (1, 2)),
        game_name VARCHAR(100) NOT NULL,
        game_description VARCHAR(500),
        total_questions INT DEFAULT 10,
        category VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Alter questions table
    await pool.query(`ALTER TABLE questions ALTER COLUMN ai_app_id DROP NOT NULL;`).catch(() => {});
    await pool.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS game_number INT DEFAULT 1;`).catch(() => {});
    await pool.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS option_4 VARCHAR(250) DEFAULT '';`).catch(() => {});
    await pool.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation VARCHAR(500);`).catch(() => {});
    await pool.query(`ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20) DEFAULT 'medium';`).catch(() => {});
    await pool.query(`ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_correct_option_check;`).catch(() => {});
    await pool.query(`ALTER TABLE questions ADD CONSTRAINT questions_correct_option_check CHECK (correct_option BETWEEN 1 AND 4);`).catch(() => {});
    await pool.query(`ALTER TABLE questions DROP CONSTRAINT IF EXISTS fk_game_number;`).catch(() => {});
    await pool.query(`ALTER TABLE questions ADD CONSTRAINT fk_game_number FOREIGN KEY (game_number) REFERENCES game_metadata (game_number) ON DELETE CASCADE;`).catch(() => {});
    await pool.query(`ALTER TABLE questions DROP CONSTRAINT IF EXISTS unique_game_question;`).catch(() => {});
    await pool.query(`ALTER TABLE questions ADD CONSTRAINT unique_game_question UNIQUE (game_number, question_number);`).catch(() => {});

    // Alter game_sessions table
    await pool.query(`ALTER TABLE game_sessions ADD COLUMN IF NOT EXISTS current_game_number INT DEFAULT 0;`).catch(() => {});
    await pool.query(`ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_status_check;`).catch(() => {});
    await pool.query(`ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_status_check CHECK (status IN ('waiting', 'lobby', 'game_1_active', 'game_1_finished', 'game_2_active', 'game_2_finished', 'completed', 'in_progress', 'finished'));`).catch(() => {});

    // Create game_progression
    await pool.query(`
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
    `);

    // Alter player_scores table
    await pool.query(`ALTER TABLE player_scores ADD COLUMN IF NOT EXISTS game_1_score INT DEFAULT 0;`).catch(() => {});
    await pool.query(`ALTER TABLE player_scores ADD COLUMN IF NOT EXISTS game_2_score INT DEFAULT 0;`).catch(() => {});
    await pool.query(`ALTER TABLE player_scores ADD COLUMN IF NOT EXISTS cumulative_score INT DEFAULT 0;`).catch(() => {});
    await pool.query(`ALTER TABLE player_scores ADD COLUMN IF NOT EXISTS games_played INT DEFAULT 0;`).catch(() => {});
    await pool.query(`ALTER TABLE player_scores ADD COLUMN IF NOT EXISTS rank_final INT;`).catch(() => {});

    // Alter answer_log table
    await pool.query(`ALTER TABLE answer_log ADD COLUMN IF NOT EXISTS game_number INT DEFAULT 1;`).catch(() => {});
    await pool.query(`ALTER TABLE answer_log ADD COLUMN IF NOT EXISTS response_time_ms INT;`).catch(() => {});
    await pool.query(`ALTER TABLE answer_log DROP CONSTRAINT IF EXISTS answer_log_selected_option_check;`).catch(() => {});
    await pool.query(`ALTER TABLE answer_log ADD CONSTRAINT answer_log_selected_option_check CHECK (selected_option BETWEEN 1 AND 4);`).catch(() => {});
    await pool.query(`ALTER TABLE answer_log DROP CONSTRAINT IF EXISTS answer_log_game_session_id_player_id_question_number_key;`).catch(() => {});
    await pool.query(`ALTER TABLE answer_log DROP CONSTRAINT IF EXISTS unique_answer_log_entry;`).catch(() => {});
    await pool.query(`ALTER TABLE answer_log ADD CONSTRAINT unique_answer_log_entry UNIQUE (game_session_id, player_id, game_number, question_number);`).catch(() => {});

    // 1. Create tables if they do not exist
    const schemaPath = path.join(__dirname, '../schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('📄 Executing schema.sql to verify/create tables...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
    } else {
      console.warn('⚠️ schema.sql not found at project root. Assuming tables are set up.');
    }

    // 2. Check and seed AI apps
    const aiCount = await pool.query('SELECT count(*) FROM ai_apps');
    if (parseInt(aiCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding AI Apps database...');
      for (const app of seedAis) {
        await pool.query(
          `INSERT INTO ai_apps (id, name, founder_name, main_feature, logo_url) 
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (name) DO NOTHING`,
          [app.id, app.name, app.founder_name, app.main_feature, app.logo_url]
        );
      }
      await pool.query("SELECT setval(pg_get_serial_sequence('ai_apps', 'id'), coalesce(max(id), 1)) FROM ai_apps");
    }

    // 3. Check and seed Game Metadata
    const metadataCount = await pool.query('SELECT count(*) FROM game_metadata');
    if (parseInt(metadataCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding Game Metadata...');
      for (const game of seedGameMetadata) {
        await pool.query(
          `INSERT INTO game_metadata (game_number, game_name, game_description, total_questions, category) 
           VALUES ($1, $2, $3, $4, $5)`,
          [game.game_number, game.game_name, game.game_description, game.total_questions, game.category]
        );
      }
    }

    // 4. Check and seed Questions (Game 1 & Game 2)
    const questionCount = await pool.query('SELECT count(*) FROM questions');
    if (parseInt(questionCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding Questions database...');
      const allQuestions = [...seedQuestions, ...seedQuestionsGame2];
      for (const q of allQuestions) {
        await pool.query(
          `INSERT INTO questions (game_number, question_number, ai_app_id, question_type, question_text, correct_option, option_1, option_2, option_3, option_4, explanation, difficulty) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            q.game_number || 1,
            q.question_number,
            q.ai_app_id,
            q.question_type,
            q.question_text,
            q.correct_option,
            q.option_1,
            q.option_2,
            q.option_3,
            q.option_4 || '',
            q.explanation || '',
            q.difficulty || 'medium'
          ]
        );
      }
      await pool.query("SELECT setval(pg_get_serial_sequence('questions', 'id'), coalesce(max(id), 1)) FROM questions");
    }

    // 5. Create vote_trends table if it does not exist
    console.log('🔄 Verifying and creating vote_trends table & indices...');
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`).catch(() => {});
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vote_trends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
        game_number INT NOT NULL,
        question_number INT NOT NULL,
        option_1_votes INT DEFAULT 0,
        option_2_votes INT DEFAULT 0,
        option_3_votes INT DEFAULT 0,
        option_4_votes INT DEFAULT 0,
        total_votes INT DEFAULT 0,
        revealed_at TIMESTAMP,
        correct_option INT,
        UNIQUE (game_session_id, game_number, question_number)
      );
    `).catch(async () => {
      // Fallback for older PG versions
      await pool.query(`
        CREATE TABLE IF NOT EXISTS vote_trends (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          game_session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
          game_number INT NOT NULL,
          question_number INT NOT NULL,
          option_1_votes INT DEFAULT 0,
          option_2_votes INT DEFAULT 0,
          option_3_votes INT DEFAULT 0,
          option_4_votes INT DEFAULT 0,
          total_votes INT DEFAULT 0,
          revealed_at TIMESTAMP,
          correct_option INT,
          UNIQUE (game_session_id, game_number, question_number)
        );
      `);
    });

    // 6. Create performance indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vote_trends_game_question ON vote_trends (game_session_id, game_number, question_number);`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_scores_game_session ON player_scores (game_session_id);`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_player_scores_cumulative ON player_scores (cumulative_score DESC);`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_answer_log_session ON answer_log (game_session_id);`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_answer_log_player ON answer_log (player_id);`).catch(() => {});
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_answer_log_question ON answer_log (game_number, question_number);`).catch(() => {});

    console.log('🚀 Database initialization complete.');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    console.log('⚠️ Switched to Mock In-Memory Database due to initialization failure.');
  }
}

// Database helper functions
const db = {
  createSession: async (roomCode) => {
    if (useMockDb) {
      const sessionId = uuidv4();
      mockDb.game_sessions[roomCode] = {
        id: sessionId,
        room_code: roomCode,
        status: 'waiting',
        current_question_number: 0,
        started_at: null,
        ended_at: null,
        total_players: 0,
        current_game_number: 0
      };
      mockDb.game_progression[sessionId] = {
        id: uuidv4(),
        game_session_id: sessionId,
        current_game_number: 0,
        game_1_started: false,
        game_1_finished: false,
        game_2_started: false,
        game_2_finished: false,
        all_games_finished: false
      };
      return mockDb.game_sessions[roomCode];
    }
    const res = await pool.query(
      `INSERT INTO game_sessions (room_code, status) 
       VALUES ($1, 'waiting') 
       ON CONFLICT (room_code) DO UPDATE SET status = 'waiting', current_question_number = 0, started_at = NULL, ended_at = NULL, total_players = 0, current_game_number = 0 
       RETURNING *`,
      [roomCode]
    );
    // Create game_progression row
    await pool.query(
      `INSERT INTO game_progression (game_session_id) 
       VALUES ($1) 
       ON CONFLICT (game_session_id) DO NOTHING`,
      [res.rows[0].id]
    );
    return res.rows[0];
  },

  updateSessionStatus: async (roomCode, status, currentQuestion = 0, currentGame = 1) => {
    const now = new Date();
    if (useMockDb) {
      const session = mockDb.game_sessions[roomCode];
      if (session) {
        session.status = status;
        session.current_question_number = currentQuestion;
        session.current_game_number = currentGame;
        
        // Progression updates
        const progression = mockDb.game_progression[session.id];
        if (progression) {
          progression.current_game_number = currentGame;
          if (status === 'game_1_active') {
            progression.game_1_started = true;
            progression.game_1_started_at = now;
          } else if (status === 'game_1_finished') {
            progression.game_1_finished = true;
            progression.game_1_finished_at = now;
          } else if (status === 'game_2_active') {
            progression.game_2_started = true;
            progression.game_2_started_at = now;
          } else if (status === 'game_2_finished' || status === 'completed') {
            progression.game_2_finished = true;
            progression.game_2_finished_at = now;
            progression.all_games_finished = true;
            progression.tournament_completed_at = now;
          }
        }
        
        if ((status === 'game_1_active' || status === 'in_progress') && !session.started_at) session.started_at = now;
        if (status === 'completed' || status === 'finished') session.ended_at = now;
      }
      return session;
    }
    
    let query = `UPDATE game_sessions SET status = $1, current_question_number = $2, current_game_number = $3`;
    const params = [status, currentQuestion, currentGame, roomCode];
    if (status === 'game_1_active' || status === 'in_progress') {
      query += `, started_at = CURRENT_TIMESTAMP`;
    } else if (status === 'completed' || status === 'finished') {
      query += `, ended_at = CURRENT_TIMESTAMP`;
    }
    query += ` WHERE room_code = $4 RETURNING *`;
    const res = await pool.query(query, params);
    
    // Update progression table in PostgreSQL
    const sessionId = res.rows[0].id;
    if (status === 'game_1_active') {
      await pool.query(`UPDATE game_progression SET current_game_number = 1, game_1_started = TRUE, game_1_started_at = CURRENT_TIMESTAMP WHERE game_session_id = $1`, [sessionId]);
    } else if (status === 'game_1_finished') {
      await pool.query(`UPDATE game_progression SET game_1_finished = TRUE, game_1_finished_at = CURRENT_TIMESTAMP WHERE game_session_id = $1`, [sessionId]);
    } else if (status === 'game_2_active') {
      await pool.query(`UPDATE game_progression SET current_game_number = 2, game_2_started = TRUE, game_2_started_at = CURRENT_TIMESTAMP WHERE game_session_id = $1`, [sessionId]);
    } else if (status === 'game_2_finished' || status === 'completed') {
      await pool.query(`UPDATE game_progression SET game_2_finished = TRUE, game_2_finished_at = CURRENT_TIMESTAMP, all_games_finished = TRUE, tournament_completed_at = CURRENT_TIMESTAMP WHERE game_session_id = $1`, [sessionId]);
    }
    
    return res.rows[0];
  },

  updateSessionQuestion: async (roomCode, questionNum) => {
    if (useMockDb) {
      const session = mockDb.game_sessions[roomCode];
      if (session) session.current_question_number = questionNum;
      return session;
    }
    const res = await pool.query(
      `UPDATE game_sessions SET current_question_number = $1 WHERE room_code = $2 RETURNING *`,
      [questionNum, roomCode]
    );
    return res.rows[0];
  },

  incrementPlayerCount: async (roomCode) => {
    if (useMockDb) {
      const session = mockDb.game_sessions[roomCode];
      if (session) session.total_players += 1;
      return session;
    }
    const res = await pool.query(
      `UPDATE game_sessions SET total_players = total_players + 1 WHERE room_code = $1 RETURNING *`,
      [roomCode]
    );
    return res.rows[0];
  },

  addPlayerScore: async (roomCode, playerId, playerName) => {
    if (useMockDb) {
      const session = mockDb.game_sessions[roomCode];
      if (!session) throw new Error('Game session not found');
      const scoreKey = `${session.id}-${playerId}`;
      mockDb.player_scores[scoreKey] = {
        id: uuidv4(),
        game_session_id: session.id,
        player_id: playerId,
        player_name: playerName,
        total_score: 0,
        correct_answers_count: 0,
        game_1_score: 0,
        game_2_score: 0,
        cumulative_score: 0,
        games_played: 0,
        rank_final: null,
        updated_at: new Date()
      };
      return mockDb.player_scores[scoreKey];
    }
    const sessionRes = await pool.query('SELECT id FROM game_sessions WHERE room_code = $1', [roomCode]);
    if (sessionRes.rows.length === 0) throw new Error('Game session not found');
    const sessionId = sessionRes.rows[0].id;
    const res = await pool.query(
      `INSERT INTO player_scores (game_session_id, player_id, player_name, total_score, correct_answers_count, game_1_score, game_2_score, cumulative_score, games_played) 
       VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0) 
       ON CONFLICT (game_session_id, player_id) DO UPDATE SET total_score = 0, correct_answers_count = 0, game_1_score = 0, game_2_score = 0, cumulative_score = 0, games_played = 0, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [sessionId, playerId, playerName]
    );
    return res.rows[0];
  },

  recordAnswer: async (roomCode, playerId, gameNumber, questionNumber, selectedOption, isCorrect) => {
    if (useMockDb) {
      const session = mockDb.game_sessions[roomCode];
      if (!session) return;
      
      const scoreKey = `${session.id}-${playerId}`;
      const playerScore = mockDb.player_scores[scoreKey];
      if (playerScore) {
        if (isCorrect) {
          playerScore.total_score += 1;
          playerScore.correct_answers_count += 1;
          playerScore.cumulative_score += 1;
          if (gameNumber === 2) {
            playerScore.game_2_score += 1;
          } else {
            playerScore.game_1_score += 1;
          }
        }
        playerScore.updated_at = new Date();
      }

      mockDb.answer_logs.push({
        id: uuidv4(),
        game_session_id: session.id,
        player_id: playerId,
        game_number: gameNumber,
        question_number: questionNumber,
        selected_option: selectedOption,
        is_correct: isCorrect,
        answered_at: new Date()
      });
      return;
    }

    try {
      const sessionRes = await pool.query('SELECT id FROM game_sessions WHERE room_code = $1', [roomCode]);
      if (sessionRes.rows.length === 0) return;
      const sessionId = sessionRes.rows[0].id;

      await pool.query('BEGIN');
      
      if (isCorrect) {
        const scoreCol = gameNumber === 2 ? 'game_2_score' : 'game_1_score';
        await pool.query(
          `UPDATE player_scores 
           SET total_score = total_score + 1, cumulative_score = cumulative_score + 1, correct_answers_count = correct_answers_count + 1, ${scoreCol} = ${scoreCol} + 1, updated_at = CURRENT_TIMESTAMP 
           WHERE game_session_id = $1 AND player_id = $2`,
          [sessionId, playerId]
        );
      }

      await pool.query(
        `INSERT INTO answer_log (game_session_id, player_id, game_number, question_number, selected_option, is_correct) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (game_session_id, player_id, game_number, question_number) DO NOTHING`,
        [sessionId, playerId, gameNumber, questionNumber, selectedOption, isCorrect]
      );

      await pool.query('COMMIT');
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error('Error logging answer and updating score:', e);
    }
  },

  recordAnswersBatch: async (roomCode, answersList) => {
    if (useMockDb) {
      const session = mockDb.game_sessions[roomCode];
      if (!session) return;
      
      for (const ans of answersList) {
        const { playerId, gameNumber, questionNumber, selectedOption, isCorrect } = ans;
        const scoreKey = `${session.id}-${playerId}`;
        const playerScore = mockDb.player_scores[scoreKey];
        if (playerScore) {
          if (isCorrect) {
            playerScore.total_score += 1;
            playerScore.correct_answers_count += 1;
            playerScore.cumulative_score += 1;
            if (gameNumber === 2) {
              playerScore.game_2_score += 1;
            } else {
              playerScore.game_1_score += 1;
            }
          }
          playerScore.updated_at = new Date();
        }

        mockDb.answer_logs.push({
          id: uuidv4(),
          game_session_id: session.id,
          player_id: playerId,
          game_number: gameNumber,
          question_number: questionNumber,
          selected_option: selectedOption,
          is_correct: isCorrect,
          answered_at: new Date()
        });
      }
      return;
    }

    if (answersList.length === 0) return;

    try {
      const sessionRes = await pool.query('SELECT id FROM game_sessions WHERE room_code = $1', [roomCode]);
      if (sessionRes.rows.length === 0) return;
      const sessionId = sessionRes.rows[0].id;

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // 1. Separate correct answers to increment scores in a batch / single query
        const correctPlayerIds = answersList.filter(a => a.isCorrect).map(a => a.playerId);
        if (correctPlayerIds.length > 0) {
          const gameCol = answersList[0].gameNumber === 2 ? 'game_2_score' : 'game_1_score';
          await client.query(
            `UPDATE player_scores 
             SET total_score = total_score + 1, 
                 cumulative_score = cumulative_score + 1, 
                 correct_answers_count = correct_answers_count + 1, 
                 ${gameCol} = ${gameCol} + 1, 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE game_session_id = $1 AND player_id = ANY($2)`,
            [sessionId, correctPlayerIds]
          );
        }

        // 2. Build bulk insert query for answer_log
        const queryValues = [];
        const valuePlaceholders = [];
        let paramIdx = 1;

        for (const ans of answersList) {
          const logId = uuidv4();
          queryValues.push(logId, sessionId, ans.playerId, ans.gameNumber, ans.questionNumber, ans.selectedOption, ans.isCorrect);
          valuePlaceholders.push(`($${paramIdx}, $${paramIdx+1}, $${paramIdx+2}, $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5}, $${paramIdx+6})`);
          paramIdx += 7;
        }

        const bulkInsertQuery = `
          INSERT INTO answer_log (id, game_session_id, player_id, game_number, question_number, selected_option, is_correct)
          VALUES ${valuePlaceholders.join(', ')}
          ON CONFLICT (game_session_id, player_id, game_number, question_number) DO NOTHING
        `;

        await client.query(bulkInsertQuery, queryValues);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during batch answer recording:', err);
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Error in recordAnswersBatch:', err);
    }
  },

  getQuestions: async (gameNumber = 1) => {
    const cacheKey = `questions:${gameNumber}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error('Error reading questions cache:', err);
    }

    let questions;
    if (useMockDb) {
      const qs = mockDb.questions.filter(q => (q.game_number || 1) === gameNumber);
      questions = qs.map(q => {
        if (q.ai_app_id) {
          const app = seedAis.find(a => a.id === q.ai_app_id);
          return { ...q, logo_url: app ? app.logo_url : '' };
        }
        return { ...q, logo_url: '' };
      });
    } else {
      const res = await pool.query(
        `SELECT q.*, a.logo_url 
         FROM questions q 
         LEFT JOIN ai_apps a ON q.ai_app_id = a.id 
         WHERE q.game_number = $1
         ORDER BY q.question_number`,
        [gameNumber]
      );
      questions = res.rows;
    }

    try {
      await cache.set(cacheKey, JSON.stringify(questions), 3600); // 1 hour TTL
    } catch (err) {
      console.error('Error writing questions cache:', err);
    }
    return questions;
  },

  getLeaderboard: async (roomCode) => {
    const cacheKey = `leaderboard:${roomCode}`;
    try {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error('Error reading leaderboard cache:', err);
    }

    let leaderboard;
    if (useMockDb) {
      const session = mockDb.game_sessions[roomCode];
      if (!session) return [];
      const scores = Object.values(mockDb.player_scores)
        .filter(s => s.game_session_id === session.id)
        .map(s => ({
          player_name: s.player_name,
          game_1_score: s.game_1_score || 0,
          game_2_score: s.game_2_score || 0,
          cumulative_score: s.cumulative_score || 0,
          correct_answers_count: s.correct_answers_count
        }));
      scores.sort((a, b) => b.cumulative_score - a.cumulative_score || b.correct_answers_count - a.correct_answers_count);
      leaderboard = scores.map((s, idx) => ({
        rank: idx + 1,
        player_name: s.player_name,
        game_1_score: s.game_1_score,
        game_2_score: s.game_2_score,
        cumulative_score: s.cumulative_score,
        total_score: s.cumulative_score // keep total_score key for legacy code compatibility
      }));
    } else {
      const sessionRes = await pool.query('SELECT id FROM game_sessions WHERE room_code = $1', [roomCode]);
      if (sessionRes.rows.length === 0) return [];
      const sessionId = sessionRes.rows[0].id;

      const res = await pool.query(
        `SELECT player_name, game_1_score, game_2_score, cumulative_score, correct_answers_count 
         FROM player_scores 
         WHERE game_session_id = $1 
         ORDER BY cumulative_score DESC, correct_answers_count DESC, updated_at ASC`,
        [sessionId]
      );

      leaderboard = res.rows.map((row, index) => ({
        rank: index + 1,
        player_name: row.player_name,
        game_1_score: row.game_1_score,
        game_2_score: row.game_2_score,
        cumulative_score: row.cumulative_score,
        total_score: row.cumulative_score // keep total_score key for legacy code compatibility
      }));
    }

    try {
      await cache.set(cacheKey, JSON.stringify(leaderboard), 5); // 5 seconds TTL
    } catch (err) {
      console.error('Error writing leaderboard cache:', err);
    }
    return leaderboard;
  },

  updateFinalRanks: async (roomCode) => {
    if (useMockDb) {
      const session = mockDb.game_sessions[roomCode];
      if (!session) return;
      const scores = Object.values(mockDb.player_scores)
        .filter(s => s.game_session_id === session.id);
      scores.sort((a, b) => b.cumulative_score - a.cumulative_score || b.correct_answers_count - a.correct_answers_count);
      scores.forEach((s, idx) => {
        s.rank_final = idx + 1;
      });
      return;
    }
    const sessionRes = await pool.query('SELECT id FROM game_sessions WHERE room_code = $1', [roomCode]);
    if (sessionRes.rows.length === 0) return;
    const sessionId = sessionRes.rows[0].id;
    
    // Perform rank updates using window ranking logic
    await pool.query(`
      WITH ranked AS (
        SELECT id, RANK() OVER (ORDER BY cumulative_score DESC, correct_answers_count DESC, updated_at ASC) as calculated_rank
        FROM player_scores
        WHERE game_session_id = $1
      )
      UPDATE player_scores
      SET rank_final = ranked.calculated_rank
      FROM ranked
      WHERE player_scores.id = ranked.id
    `, [sessionId]);
  }
};

// Global game runner state mapping: roomCode -> GameRunner state
const gameRunners = {};

class GameRunner {
  constructor(roomCode, ioNamespace) {
    this.roomCode = roomCode;
    this.io = ioNamespace;
    this.status = 'waiting'; // waiting, game_1_active, game_1_finished, game_2_active, completed
    this.currentQuestionNumber = 0;
    this.currentGameNumber = 1;
    this.questions = [];
    this.players = []; // Array of { socketId, playerId, name, isAdmin }
    this.timer = 15;
    this.timerInterval = null;
    this.answersReceived = {}; // playerId -> selectedOption
    this.voteTrends = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.lastVoteTrendTime = 0;
    this.voteTrendTimeout = null;
  }

  addPlayer(socketId, playerId, name, isAdmin) {
    const existing = this.players.find(p => p.playerId === playerId);
    if (existing) {
      existing.socketId = socketId;
      existing.name = name;
    } else {
      this.players.push({ socketId, playerId, name, isAdmin });
    }
  }

  getPlayer(playerId) {
    return this.players.find(p => p.playerId === playerId);
  }

  getAdmin() {
    return this.players.find(p => p.isAdmin);
  }

  broadcastPlayerList() {
    const playerList = this.players.map(p => ({
      player_name: p.name,
      is_admin: p.isAdmin
    }));
    this.io.to(this.roomCode).emit('player_list_update', playerList);
  }

  async start() {
    if (this.status !== 'waiting') return;
    
    // Load Game 1 questions
    try {
      this.questions = await db.getQuestions(1);
      if (this.questions.length === 0) {
        this.questions = seedQuestions.map(q => {
          const app = seedAis.find(a => a.id === q.ai_app_id);
          return { ...q, logo_url: app ? app.logo_url : '' };
        });
      }
    } catch (e) {
      console.error('Failed to load questions:', e);
      this.questions = seedQuestions.map(q => {
        const app = seedAis.find(a => a.id === q.ai_app_id);
        return { ...q, logo_url: app ? app.logo_url : '' };
      });
    }

    this.currentGameNumber = 1;
    this.status = 'game_1_active';
    await db.updateSessionStatus(this.roomCode, 'game_1_active', 1, 1);
    
    this.io.to(this.roomCode).emit('game_1_started', {
      game_name: "AI Chatbot Trivia",
      game_number: 1,
      total_questions: 10,
      message: "Game 1 started! Answer trivia about AI chatbots."
    });

    this.loadQuestion(1);
  }

  async loadQuestion(questionNumber) {
    this.currentQuestionNumber = questionNumber;
    this.answersReceived = {};
    this.voteTrends = { 1: 0, 2: 0, 3: 0, 4: 0 };
    this.lastVoteTrendTime = 0;
    if (this.voteTrendTimeout) {
      clearTimeout(this.voteTrendTimeout);
      this.voteTrendTimeout = null;
    }

    const question = this.questions.find(q => q.question_number === questionNumber);
    if (!question) {
      console.error(`Question ${questionNumber} not found!`);
      if (this.currentGameNumber === 1) {
        await this.finishGame1();
      } else {
        await this.finishGame2();
      }
      return;
    }

    await db.updateSessionQuestion(this.roomCode, questionNumber);

    // Broadcast question to all players
    this.io.to(this.roomCode).emit('question_loaded', {
      game_number: this.currentGameNumber,
      question_number: question.question_number,
      ai_logo_url: question.logo_url,
      question_text: question.question_text,
      option_1: question.option_1,
      option_2: question.option_2,
      option_3: question.option_3,
      option_4: question.option_4 || '',
      timer_seconds: 15
    });

    // Reset & Start Timer
    this.timer = 15;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.timer--;
      this.io.to(this.roomCode).emit('timer_tick', { seconds_remaining: this.timer });

      if (this.timer <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.revealAnswer();
      }
    }, 1000);
  }

  async submitAnswer(playerId, selectedOption, socket) {
    if ((this.status !== 'game_1_active' && this.status !== 'game_2_active' && this.status !== 'in_progress') || this.timer <= 0) return;

    // Verify player is not admin
    const player = this.getPlayer(playerId);
    if (player && player.isAdmin) return;

    if (this.answersReceived[playerId] !== undefined) {
      return; 
    }

    // Save answer choice in temporary buffer for scoring later
    this.answersReceived[playerId] = selectedOption;
    
    // Increment vote count for trend tracking
    if (selectedOption >= 1 && selectedOption <= 4) {
      this.voteTrends[selectedOption]++;
    }

    const question = this.questions.find(q => q.question_number === this.currentQuestionNumber);
    if (!question) return;

    // Emit 'answer_submitted' to player ONLY (for immediate color feedback)
    socket.emit('answer_submitted', {
      status: "submitted",
      message: "Your answer received",
      player_id: playerId,
      is_correct: selectedOption === question.correct_option,
      correct_option: question.correct_option
    });

    // Check if all active connected players have answered the question
    try {
      const roomSockets = this.io.adapter.rooms.get(this.roomCode);
      const activePlayers = this.players.filter(p => roomSockets && roomSockets.has(p.socketId) && !p.isAdmin);
      
      const allAnswered = activePlayers.every(p => this.answersReceived[p.playerId] !== undefined);
      
      if (allAnswered && activePlayers.length > 0) {
        console.log(`⏱️ Everyone answered in room ${this.roomCode}. Ending question early!`);
        if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
        }
        await this.revealAnswer();
      }
    } catch (e) {
      console.error('Error checking if all players answered:', e);
    }
  }

  async revealAnswer() {

    const question = this.questions.find(q => q.question_number === this.currentQuestionNumber);
    if (!question) return;

    // Process all submissions in a single batch update to database/scores
    const answersToSave = [];
    for (const [pId, selectedOpt] of Object.entries(this.answersReceived)) {
      const isCorrect = selectedOpt === question.correct_option;
      answersToSave.push({
        playerId: pId,
        gameNumber: this.currentGameNumber,
        questionNumber: this.currentQuestionNumber,
        selectedOption: selectedOpt,
        isCorrect: isCorrect
      });
    }

    if (answersToSave.length > 0) {
      await db.recordAnswersBatch(this.roomCode, answersToSave);
    }

    // Clear leaderboard cache since scores have changed
    await cache.del(`leaderboard:${this.roomCode}`);
    const leaderboard = await db.getLeaderboard(this.roomCode);

    const correctText = question[`option_${question.correct_option}`];
    const totalVotes = Object.values(this.voteTrends).reduce((sum, v) => sum + v, 0) || 1;
    
    const finalVoteDistribution = {
      option_1: { votes: this.voteTrends[1] || 0, percentage: parseFloat((((this.voteTrends[1] || 0) / totalVotes) * 100).toFixed(1)) },
      option_2: { votes: this.voteTrends[2] || 0, percentage: parseFloat((((this.voteTrends[2] || 0) / totalVotes) * 100).toFixed(1)) },
      option_3: { votes: this.voteTrends[3] || 0, percentage: parseFloat((((this.voteTrends[3] || 0) / totalVotes) * 100).toFixed(1)) },
      option_4: { votes: this.voteTrends[4] || 0, percentage: parseFloat((((this.voteTrends[4] || 0) / totalVotes) * 100).toFixed(1)) }
    };

    // Save final stats in database if using persistent storage
    if (!useMockDb) {
      try {
        const sessionRes = await pool.query('SELECT id FROM game_sessions WHERE room_code = $1', [this.roomCode]);
        if (sessionRes.rows.length > 0) {
          const sessionId = sessionRes.rows[0].id;
          await pool.query(`
            INSERT INTO vote_trends (game_session_id, game_number, question_number, option_1_votes, option_2_votes, option_3_votes, option_4_votes, total_votes, revealed_at, correct_option)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9)
            ON CONFLICT (game_session_id, game_number, question_number) DO UPDATE SET
              option_1_votes = EXCLUDED.option_1_votes,
              option_2_votes = EXCLUDED.option_2_votes,
              option_3_votes = EXCLUDED.option_3_votes,
              option_4_votes = EXCLUDED.option_4_votes,
              total_votes = EXCLUDED.total_votes,
              revealed_at = EXCLUDED.revealed_at,
              correct_option = EXCLUDED.correct_option
          `, [sessionId, this.currentGameNumber, this.currentQuestionNumber, 
              this.voteTrends[1] || 0, this.voteTrends[2] || 0, this.voteTrends[3] || 0, this.voteTrends[4] || 0, 
              totalVotes, question.correct_option]);
        }
      } catch (err) {
        console.error('Error logging final vote trends:', err.message);
      }
    }

    // Emit customized answer_reveal to each player
    this.players.forEach(p => {
      const selected = this.answersReceived[p.playerId];
      const isCorrect = selected === question.correct_option;
      const scoreChange = isCorrect ? 1 : 0;
      
      const payload = {
        game_number: this.currentGameNumber,
        question_number: this.currentQuestionNumber,
        correct_option: question.correct_option,
        correct_answer_text: correctText,
        is_your_answer_correct: selected !== undefined ? isCorrect : false,
        your_score_change: scoreChange,
        final_vote_distribution: finalVoteDistribution,
        question_explanation: question.explanation || '',
        leaderboard: leaderboard,
        timestamp: Date.now()
      };
      
      this.io.to(p.socketId).emit('answer_reveal', payload);
    });

    // Send answer_reveal to host as well
    const admin = this.getAdmin();
    if (admin) {
      this.io.to(admin.socketId).emit('answer_reveal', {
        game_number: this.currentGameNumber,
        question_number: this.currentQuestionNumber,
        correct_option: question.correct_option,
        correct_answer_text: correctText,
        final_vote_distribution: finalVoteDistribution,
        question_explanation: question.explanation || '',
        leaderboard: leaderboard,
        timestamp: Date.now()
      });
    }

    // Wait 8 seconds, then proceed to the next question
    setTimeout(async () => {
      if (this.currentQuestionNumber < 10) {
        this.loadQuestion(this.currentQuestionNumber + 1);
      } else {
        if (this.currentGameNumber === 1) {
          await this.finishGame1();
        } else {
          await this.finishGame2();
        }
      }
    }, 8000);
  }

  async finishGame1() {
    this.status = 'game_1_finished';
    await db.updateSessionStatus(this.roomCode, 'game_1_finished', 10, 1);
    const leaderboard = await db.getLeaderboard(this.roomCode);
    
    this.io.to(this.roomCode).emit('game_1_finished', {
      game_name: "AI Chatbot Trivia",
      game_number: 1,
      game_1_leaderboard: leaderboard.map(l => ({
        rank: l.rank,
        player_name: l.player_name,
        game_1_score: l.game_1_score
      })),
      cumulative_leaderboard: leaderboard,
      message: "Game 1 Complete! Waiting for admin to start Game 2..."
    });
  }

  async startGame2() {
    if (this.status !== 'game_1_finished') return;

    // Helper to dynamically shuffle options of a question and update correct_option
    const shuffleQuestionOptions = (q) => {
      const options = [];
      for (let i = 1; i <= 4; i++) {
        const optText = q[`option_${i}`];
        if (optText !== undefined && optText !== null && optText !== '') {
          options.push({ text: optText, isCorrect: i === q.correct_option });
        }
      }

      // Fisher-Yates shuffle
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }

      const shuffled = { ...q };
      options.forEach((opt, idx) => {
        shuffled[`option_${idx + 1}`] = opt.text;
        if (opt.isCorrect) {
          shuffled.correct_option = idx + 1;
        }
      });

      // Clear any remaining option slots
      for (let i = options.length; i < 4; i++) {
        shuffled[`option_${i + 1}`] = '';
      }

      return shuffled;
    };

    // Load Game 2 questions
    try {
      const dbQs = await db.getQuestions(2);
      const rawQs = dbQs.length === 0 ? seedQuestionsGame2 : dbQs;
      this.questions = rawQs.map(q => shuffleQuestionOptions(q));
    } catch (e) {
      console.error('Failed to load Game 2 questions:', e);
      this.questions = seedQuestionsGame2.map(q => shuffleQuestionOptions(q));
    }

    this.currentGameNumber = 2;
    this.status = 'game_2_active';
    await db.updateSessionStatus(this.roomCode, 'game_2_active', 1, 2);

    this.io.to(this.roomCode).emit('game_2_started', {
      game_name: "Image-to-3D Conversion Technology",
      game_number: 2,
      total_questions: 10,
      message: "Game 2 started! Answer questions about 3D reconstruction."
    });

    this.loadQuestion(1);
  }

  async finishGame2() {
    this.status = 'completed';
    await db.updateSessionStatus(this.roomCode, 'completed', 10, 2);
    await db.updateFinalRanks(this.roomCode);
    const leaderboard = await db.getLeaderboard(this.roomCode);

    // Emit game_2_finished
    this.io.to(this.roomCode).emit('game_2_finished', {
      game_name: "Image-to-3D Conversion Technology",
      game_number: 2,
      game_2_leaderboard: leaderboard.map(l => ({
        rank: l.rank,
        player_name: l.player_name,
        game_2_score: l.game_2_score
      })),
      cumulative_leaderboard: leaderboard,
      message: "All games completed!"
    });

    // Emit final results
    this.io.to(this.roomCode).emit('all_games_finished', {
      winner: leaderboard.length > 0 ? {
        rank: 1,
        player_name: leaderboard[0].player_name,
        total_score: leaderboard[0].cumulative_score
      } : null,
      final_leaderboard: leaderboard.map(l => ({
        rank: l.rank,
        name: l.player_name,
        game_1: l.game_1_score,
        game_2: l.game_2_score,
        total: l.cumulative_score
      }))
    });
  }

  destroy() {
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}

// Socket.io connection logic (/game namespace)
const gameNamespace = io.of('/game');
gameNamespace.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id} to namespace /game`);

  socket.on('join_game', async (data) => {
    let { room_code, player_name, player_id } = data;
    
    if (!room_code || !player_name) {
      socket.emit('error_message', { message: 'Room code and player name are required' });
      return;
    }

    room_code = room_code.toUpperCase().trim();
    player_name = player_name.trim();

    // Create session in database if it doesn't exist
    let runner = gameRunners[room_code];
    if (!runner) {
      await db.createSession(room_code);
      runner = new GameRunner(room_code, gameNamespace);
      gameRunners[room_code] = runner;
    }

    // Determine admin status
    // If player_id exists in storage, reconnect. If not, generate new.
    let isReconnecting = false;
    let isPlayerAdmin = false;

    if (player_id) {
      const existingPlayer = runner.getPlayer(player_id);
      if (existingPlayer) {
        isReconnecting = true;
        isPlayerAdmin = existingPlayer.isAdmin;
      }
    } else {
      player_id = uuidv4();
    }

    // If runner has no admin, this player is the admin
    if (!runner.getAdmin()) {
      isPlayerAdmin = true;
    }

    // Register player
    runner.addPlayer(socket.id, player_id, player_name, isPlayerAdmin);
    socket.join(room_code);
    
    // Save to Database
    if (!isPlayerAdmin) {
      await db.addPlayerScore(room_code, player_id, player_name);
      await db.incrementPlayerCount(room_code);
    }

    // Send join confirmation back to the socket
    socket.emit('joined_game', {
      player_id,
      player_name,
      room_code,
      is_admin: isPlayerAdmin,
      game_status: runner.status,
      current_question: runner.currentQuestionNumber,
      current_game_number: runner.currentGameNumber
    });

    console.log(`👤 Player ${player_name} (${isPlayerAdmin ? 'Admin' : 'Player'}) joined room ${room_code}`);

    // Broadcast updated player list
    runner.broadcastPlayerList();

    // If game is already in progress, immediately send the current question or current leaderboard
    if (runner.status === 'in_progress' || runner.status === 'game_1_active' || runner.status === 'game_2_active') {
      const question = runner.questions.find(q => q.question_number === runner.currentQuestionNumber);
      if (question) {
        socket.emit('question_loaded', {
          game_number: runner.currentGameNumber,
          question_number: question.question_number,
          ai_logo_url: question.logo_url,
          question_text: question.question_text,
          option_1: question.option_1,
          option_2: question.option_2,
          option_3: question.option_3,
          option_4: question.option_4 || '',
          timer_seconds: runner.timer
        });
      }
    } else if (runner.status === 'game_1_finished') {
      const leaderboard = await db.getLeaderboard(room_code);
      socket.emit('game_1_finished', {
        game_name: "AI Chatbot Trivia",
        game_number: 1,
        game_1_leaderboard: leaderboard.map(l => ({
          rank: l.rank,
          player_name: l.player_name,
          game_1_score: l.game_1_score
        })),
        cumulative_leaderboard: leaderboard,
        message: "Game 1 Complete! Waiting for admin to start Game 2..."
      });
    } else if (runner.status === 'completed' || runner.status === 'game_2_finished') {
      const leaderboard = await db.getLeaderboard(room_code);
      socket.emit('game_2_finished', {
        game_name: "Image-to-3D Conversion Technology",
        game_number: 2,
        game_2_leaderboard: leaderboard.map(l => ({
          rank: l.rank,
          player_name: l.player_name,
          game_2_score: l.game_2_score
        })),
        cumulative_leaderboard: leaderboard,
        message: "All games completed!"
      });
      socket.emit('all_games_finished', {
        winner: leaderboard.length > 0 ? {
          rank: 1,
          player_name: leaderboard[0].player_name,
          total_score: leaderboard[0].cumulative_score
        } : null,
        final_leaderboard: leaderboard.map(l => ({
          rank: l.rank,
          name: l.player_name,
          game_1: l.game_1_score,
          game_2: l.game_2_score,
          total: l.cumulative_score
        }))
      });
    }
  });

  socket.on('start_game', async (data) => {
    let { room_code, player_id } = data;
    room_code = room_code?.toUpperCase().trim();

    const runner = gameRunners[room_code];
    if (!runner) return;

    // Verify requesting player is the admin
    const player = runner.getPlayer(player_id);
    if (!player || !player.isAdmin) {
      socket.emit('error_message', { message: 'Only the admin can start the game' });
      return;
    }

    console.log(`🎮 Admin started game in room ${room_code}`);
    await runner.start();
  });

  socket.on('start_game_2', async (data) => {
    let { room_code, player_id } = data;
    room_code = room_code?.toUpperCase().trim();

    const runner = gameRunners[room_code];
    if (!runner) return;

    // Verify requesting player is the admin
    const player = runner.getPlayer(player_id);
    if (!player || !player.isAdmin) {
      socket.emit('error_message', { message: 'Only the admin can start Game 2' });
      return;
    }

    console.log(`🎮 Admin started Game 2 in room ${room_code}`);
    await runner.startGame2();
  });

  socket.on('submit_answer', async (data) => {
    const { room_code, player_id, selected_option } = data;
    const cleanRoomCode = room_code?.toUpperCase().trim();

    const runner = gameRunners[cleanRoomCode];
    if (!runner) return;

    await runner.submitAnswer(player_id, selected_option, socket);
  });

  // Reset or play again
  socket.on('play_again', async (data) => {
    let { room_code, player_id } = data;
    room_code = room_code?.toUpperCase().trim();

    const runner = gameRunners[room_code];
    if (!runner) return;

    const player = runner.getPlayer(player_id);
    if (!player || !player.isAdmin) {
      socket.emit('error_message', { message: 'Only the admin can reset the game' });
      return;
    }

    console.log(`🔄 Resetting game room ${room_code}`);
    runner.destroy();
    
    // Create a fresh game session
    await db.createSession(room_code);
    
    // Retain players list but reset status, score
    const newRunner = new GameRunner(room_code, gameNamespace);
    for (const p of runner.players) {
      newRunner.addPlayer(p.socketId, p.playerId, p.name, p.isAdmin);
      if (!p.isAdmin) {
        await db.addPlayerScore(room_code, p.playerId, p.name);
      }
    }
    
    gameRunners[room_code] = newRunner;
    
    // Notify clients to reset their UI state and go back to lobby
    gameNamespace.to(room_code).emit('game_reset');
    newRunner.broadcastPlayerList();
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
    
    // We do NOT immediately delete the player because they might reconnect.
    // They will be updated once they join again.
  });
});

// HTTP endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', useMockDb, active_rooms: Object.keys(gameRunners) });
});

// Serve static assets if running in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
