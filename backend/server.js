const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend origin
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: frontendUrl,
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Seed data definition for 5 AIs and 15 questions
const seedAis = [
  { id: 1, name: 'ChatGPT', founder_name: 'Sam Altman', main_feature: 'Conversational AI', logo_url: 'https://openai.com/images/chatgpt-logo.png' },
  { id: 2, name: 'Claude', founder_name: 'Dario Amodei', main_feature: 'Constitutional AI', logo_url: 'https://anthropic.com/images/claude-logo.png' },
  { id: 3, name: 'Gemini', founder_name: 'Sundar Pichai', main_feature: 'Multimodal AI', logo_url: 'https://google.com/images/gemini-logo.png' },
  { id: 4, name: 'Copilot', founder_name: 'Satya Nadella', main_feature: 'Code & Productivity', logo_url: 'https://microsoft.com/images/copilot-logo.png' },
  { id: 5, name: 'Grok', founder_name: 'Elon Musk', main_feature: 'Real-time Information', logo_url: 'https://xai.com/images/grok-logo.png' }
];

const seedGameMetadata = [
  { game_number: 1, game_name: 'AI Chatbot Trivia', game_description: 'Questions about ChatGPT, Claude, Gemini, etc.', total_questions: 15, category: 'ai_tools' },
  { game_number: 2, game_name: 'Image-to-3D Conversion Technology', game_description: 'Technical questions about 3D reconstruction, neural rendering, mesh generation, etc.', total_questions: 15, category: 'ai_technology' }
];

const seedQuestions = [
  // ChatGPT (Q1-Q3)
  { game_number: 1, question_number: 1, ai_app_id: 1, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 1, option_1: 'ChatGPT', option_2: 'Gemini', option_3: 'Claude', option_4: '', explanation: 'ChatGPT is developed by OpenAI.', difficulty: 'easy' },
  { game_number: 1, question_number: 2, ai_app_id: 1, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 2, option_1: 'Elon Musk', option_2: 'Sam Altman', option_3: 'Sundar Pichai', option_4: '', explanation: 'OpenAI was co-founded by Sam Altman, Greg Brockman, Ilya Sutskever, and others.', difficulty: 'medium' },
  { game_number: 1, question_number: 3, ai_app_id: 1, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 1, option_1: 'Conversational AI', option_2: 'Code Generation', option_3: 'Multimodal', option_4: '', explanation: 'ChatGPT main focus is conversational understanding.', difficulty: 'medium' },
  
  // Claude (Q4-Q6)
  { game_number: 1, question_number: 4, ai_app_id: 2, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 3, option_1: 'Grok', option_2: 'Copilot', option_3: 'Claude', option_4: '', explanation: 'Claude is developed by Anthropic.', difficulty: 'easy' },
  { game_number: 1, question_number: 5, ai_app_id: 2, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 1, option_1: 'Dario Amodei', option_2: 'Satya Nadella', option_3: 'Sam Altman', option_4: '', explanation: 'Anthropic was founded by former OpenAI members including Dario Amodei.', difficulty: 'medium' },
  { game_number: 1, question_number: 6, ai_app_id: 2, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 2, option_1: 'Code & Productivity', option_2: 'Constitutional AI', option_3: 'Real-time Information', option_4: '', explanation: 'Anthropic trains Claude using Constitutional AI feedback.', difficulty: 'hard' },

  // Gemini (Q7-Q9)
  { game_number: 1, question_number: 7, ai_app_id: 3, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 1, option_1: 'Gemini', option_2: 'Claude', option_3: 'ChatGPT', option_4: '', explanation: 'Gemini is Google flagship model.', difficulty: 'easy' },
  { game_number: 1, question_number: 8, ai_app_id: 3, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 2, option_1: 'Elon Musk', option_2: 'Sundar Pichai', option_3: 'Dario Amodei', option_4: '', explanation: 'Gemini was developed by Google DeepMind led by Demis Hassabis under Sundar Pichai.', difficulty: 'medium' },
  { game_number: 1, question_number: 9, ai_app_id: 3, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 2, option_1: 'Conversational AI', option_2: 'Multimodal AI', option_3: 'Real-time Information', option_4: '', explanation: 'Gemini is natively built as a multimodal AI model.', difficulty: 'hard' },

  // Copilot (Q10-Q12)
  { game_number: 1, question_number: 10, ai_app_id: 4, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 3, option_1: 'Grok', option_2: 'ChatGPT', option_3: 'Copilot', option_4: '', explanation: 'GitHub/Microsoft assistant is called Copilot.', difficulty: 'easy' },
  { game_number: 1, question_number: 11, ai_app_id: 4, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 1, option_1: 'Satya Nadella', option_2: 'Sundar Pichai', option_3: 'Elon Musk', option_4: '', explanation: 'Copilot is developed by Microsoft/GitHub under Satya Nadella.', difficulty: 'medium' },
  { game_number: 1, question_number: 12, ai_app_id: 4, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 1, option_1: 'Code & Productivity', option_2: 'Constitutional AI', option_3: 'Conversational AI', option_4: '', explanation: 'Copilot is primarily integrated into IDEs for code suggestions.', difficulty: 'medium' },

  // Grok (Q13-Q15)
  { game_number: 1, question_number: 13, ai_app_id: 5, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 1, option_1: 'Grok', option_2: 'Gemini', option_3: 'Claude', option_4: '', explanation: 'Grok is the AI built by xAI.', difficulty: 'easy' },
  { game_number: 1, question_number: 14, ai_app_id: 5, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 2, option_1: 'Sam Altman', option_2: 'Elon Musk', option_3: 'Satya Nadella', option_4: '', explanation: 'Elon Musk founded xAI in 2023.', difficulty: 'medium' },
  { game_number: 1, question_number: 15, ai_app_id: 5, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 3, option_1: 'Multimodal AI', option_2: 'Constitutional AI', option_3: 'Real-time Information', option_4: '', explanation: 'Grok has access to real-time posts and news on the X platform.', difficulty: 'hard' }
];

const seedQuestionsGame2 = [
  { game_number: 2, question_number: 1, ai_app_id: null, question_type: 'tech', question_text: 'Which neural network architecture is most commonly used for 3D reconstruction from single images?', correct_option: 1, option_1: 'Convolutional Neural Networks (CNNs)', option_2: 'Recurrent Neural Networks (RNNs)', option_3: 'Transformer networks only', option_4: 'Support Vector Machines (SVMs)', explanation: 'CNNs extract 2D features which are then used for 3D reconstruction.', difficulty: 'medium' },
  { game_number: 2, question_number: 2, ai_app_id: null, question_type: 'tech', question_text: 'What is NeRF (Neural Radiance Fields) primarily used for?', correct_option: 1, option_1: 'Converting 2D images to 3D volumetric representations', option_2: 'Text-to-image generation', option_3: 'Image segmentation', option_4: 'Depth-only estimation', explanation: 'NeRF uses implicit neural representations to model 3D scenes.', difficulty: 'medium' },
  { game_number: 2, question_number: 3, ai_app_id: null, question_type: 'tech', question_text: 'Which loss function is commonly used to supervise depth estimation networks?', correct_option: 1, option_1: 'L1 loss or smooth L1 loss', option_2: 'Binary cross-entropy', option_3: 'Kullback-Leibler divergence', option_4: 'Contrastive loss', explanation: 'L1 loss directly penalizes depth prediction errors.', difficulty: 'hard' },
  { game_number: 2, question_number: 4, ai_app_id: null, question_type: 'tech', question_text: 'What is a point cloud in 3D computer vision?', correct_option: 1, option_1: 'A set of (x, y, z) coordinates in 3D space', option_2: 'A continuous mesh surface', option_3: 'A 2D image array', option_4: 'A video frame sequence', explanation: 'Point clouds are discrete 3D spatial data representations.', difficulty: 'easy' },
  { game_number: 2, question_number: 5, ai_app_id: null, question_type: 'tech', question_text: 'Which method is used to convert point clouds to mesh surfaces?', correct_option: 1, option_1: 'Poisson surface reconstruction or ball pivoting algorithm', option_2: 'Gaussian blur filters', option_3: 'Histogram equalization', option_4: 'Fourier transforms', explanation: 'These are standard surface reconstruction techniques for point clouds.', difficulty: 'hard' },
  { game_number: 2, question_number: 6, ai_app_id: null, question_type: 'tech', question_text: 'What does SDF (Signed Distance Function) represent in 3D generation?', correct_option: 1, option_1: 'Distance from a point to the nearest surface, with sign indicating inside/outside', option_2: 'Surface Density Factor', option_3: 'Spatial Depth Filtering', option_4: 'Scale Distortion Function', explanation: 'SDFs are implicit representations used in neural 3D modeling.', difficulty: 'hard' },
  { game_number: 2, question_number: 7, ai_app_id: null, question_type: 'tech', question_text: 'Which of these is a key challenge in image-to-3D conversion?', correct_option: 1, option_1: 'Ambiguity in 3D interpretation from 2D (multiple valid 3D solutions)', option_2: 'Insufficient GPU memory', option_3: 'Too much training data', option_4: 'Network overfitting only', explanation: 'The inverse problem of reconstructing 3D from 2D is inherently ambiguous.', difficulty: 'medium' },
  { game_number: 2, question_number: 8, ai_app_id: null, question_type: 'tech', question_text: 'What is multi-view 3D reconstruction?', correct_option: 1, option_1: 'Using multiple 2D images from different viewpoints to reconstruct 3D', option_2: 'Creating multiple independent 3D models', option_3: 'Viewing a 3D model from different angles', option_4: 'Using video frames for 3D', explanation: 'Multiple views provide geometric constraints for better reconstruction.', difficulty: 'medium' },
  { game_number: 2, question_number: 9, ai_app_id: null, question_type: 'tech', question_text: 'Which deep learning technique converts depth maps to 3D meshes?', correct_option: 1, option_1: 'Volumetric CNNs or implicit function networks', option_2: 'Generative Adversarial Networks (GANs) only', option_3: 'Recurrent neural networks', option_4: 'K-means clustering', explanation: 'Volumetric approaches and implicit representations handle depth-to-mesh conversion.', difficulty: 'hard' },
  { game_number: 2, question_number: 10, ai_app_id: null, question_type: 'tech', question_text: 'What does photogrammetry fundamentally rely on?', correct_option: 1, option_1: 'Epipolar geometry and feature correspondence between images', option_2: 'Color space transformations', option_3: 'Edge detection filters', option_4: 'Texture synthesis', explanation: 'Photogrammetry reconstructs 3D from matching features across images.', difficulty: 'medium' },
  { game_number: 2, question_number: 11, ai_app_id: null, question_type: 'tech', question_text: 'Which layer type is essential in image-to-3D encoder-decoder architectures?', correct_option: 1, option_1: 'Transposed convolutions (deconvolutions) for upsampling', option_2: 'Max pooling layers', option_3: 'Activation functions only', option_4: 'Dropout layers exclusively', explanation: 'Deconvolutions progressively increase spatial dimensions in decoder.', difficulty: 'medium' },
  { game_number: 2, question_number: 12, ai_app_id: null, question_type: 'tech', question_text: 'What is the primary output constraint for stable 3D generation?', correct_option: 1, option_1: 'Ensuring geometric consistency and closed mesh surfaces', option_2: 'Minimizing image file size', option_3: 'Maximizing polygon count', option_4: 'Requiring RGB textures', explanation: 'Geometric constraints prevent invalid/degenerate 3D shapes.', difficulty: 'medium' },
  { game_number: 2, question_number: 13, ai_app_id: null, question_type: 'tech', question_text: 'Which component estimates depth from a single 2D image?', correct_option: 1, option_1: 'Monocular depth estimation network', option_2: 'Color histogram analyzer', option_3: 'Edge detection filter', option_4: 'Texture classifier', explanation: 'Monocular depth networks infer 3D structure from single-view images.', difficulty: 'easy' },
  { game_number: 2, question_number: 14, ai_app_id: null, question_type: 'tech', question_text: 'What is a key advantage of implicit 3D representations (like NeRF) over explicit meshes?', correct_option: 1, option_1: 'Continuous, resolution-independent representation; no discretization artifacts', option_2: 'Faster rendering speed', option_3: 'Smaller file sizes', option_4: 'Easier manual editing', explanation: 'Implicit functions provide smooth, detail-rich 3D without mesh topology constraints.', difficulty: 'medium' },
  { game_number: 2, question_number: 15, ai_app_id: null, question_type: 'tech', question_text: 'Which training technique helps image-to-3D models generalize across object categories?', correct_option: 1, option_1: 'Multi-task learning and category-agnostic feature extraction', option_2: 'Data augmentation via color jittering only', option_3: 'Larger batch sizes exclusively', option_4: 'Longer training duration only', explanation: 'Multi-task learning + shared representations improve cross-category generalization.', difficulty: 'hard' }
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
        total_questions INT DEFAULT 15,
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

  getQuestions: async (gameNumber = 1) => {
    if (useMockDb) {
      const qs = mockDb.questions.filter(q => (q.game_number || 1) === gameNumber);
      return qs.map(q => {
        if (q.ai_app_id) {
          const app = seedAis.find(a => a.id === q.ai_app_id);
          return { ...q, logo_url: app ? app.logo_url : '' };
        }
        return { ...q, logo_url: '' };
      });
    }
    const res = await pool.query(
      `SELECT q.*, a.logo_url 
       FROM questions q 
       LEFT JOIN ai_apps a ON q.ai_app_id = a.id 
       WHERE q.game_number = $1
       ORDER BY q.question_number`,
      [gameNumber]
    );
    return res.rows;
  },

  getLeaderboard: async (roomCode) => {
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
      return scores.map((s, idx) => ({
        rank: idx + 1,
        player_name: s.player_name,
        game_1_score: s.game_1_score,
        game_2_score: s.game_2_score,
        cumulative_score: s.cumulative_score,
        total_score: s.cumulative_score // keep total_score key for legacy code compatibility
      }));
    }

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

    return res.rows.map((row, index) => ({
      rank: index + 1,
      player_name: row.player_name,
      game_1_score: row.game_1_score,
      game_2_score: row.game_2_score,
      cumulative_score: row.cumulative_score,
      total_score: row.cumulative_score // keep total_score key for legacy code compatibility
    }));
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
      total_questions: 15,
      message: "Game 1 started! Answer trivia about AI chatbots."
    });

    this.loadQuestion(1);
  }

  async loadQuestion(questionNumber) {
    this.currentQuestionNumber = questionNumber;
    this.answersReceived = {};
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

    if (this.answersReceived[playerId] !== undefined) {
      return; 
    }

    this.answersReceived[playerId] = selectedOption;

    const question = this.questions.find(q => q.question_number === this.currentQuestionNumber);
    if (!question) return;

    const isCorrect = selectedOption === question.correct_option;
    
    // Save to Database / Mock
    await db.recordAnswer(this.roomCode, playerId, this.currentGameNumber, this.currentQuestionNumber, selectedOption, isCorrect);

    // Send immediate feedback to this client
    const correctText = question[`option_${question.correct_option}`];
    socket.emit('answer_feedback', {
      is_correct: isCorrect,
      correct_option: question.correct_option,
      correct_answer_text: correctText
    });

    // Broadcast leaderboard update within 100ms
    const leaderboard = await db.getLeaderboard(this.roomCode);
    this.io.to(this.roomCode).emit('leaderboard_update', leaderboard);

    // Check if all active connected players have answered the question
    try {
      const roomSockets = this.io.adapter.rooms.get(this.roomCode);
      const activePlayers = this.players.filter(p => roomSockets && roomSockets.has(p.socketId));
      
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

    const correctText = question[`option_${question.correct_option}`];
    const leaderboard = await db.getLeaderboard(this.roomCode);

    // Send answer_reveal event
    this.io.to(this.roomCode).emit('answer_reveal', {
      correct_option: question.correct_option,
      correct_answer_text: correctText,
      explanation: question.explanation || '',
      leaderboard: leaderboard
    });

    // Wait 3 seconds, then proceed (given extra second for explanation view)
    setTimeout(async () => {
      if (this.currentQuestionNumber < 15) {
        this.loadQuestion(this.currentQuestionNumber + 1);
      } else {
        if (this.currentGameNumber === 1) {
          await this.finishGame1();
        } else {
          await this.finishGame2();
        }
      }
    }, 3000);
  }

  async finishGame1() {
    this.status = 'game_1_finished';
    await db.updateSessionStatus(this.roomCode, 'game_1_finished', 15, 1);
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
      total_questions: 15,
      message: "Game 2 started! Answer technical questions about 3D reconstruction."
    });

    this.loadQuestion(1);
  }

  async finishGame2() {
    this.status = 'completed';
    await db.updateSessionStatus(this.roomCode, 'completed', 15, 2);
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
    await db.addPlayerScore(room_code, player_id, player_name);
    await db.incrementPlayerCount(room_code);

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
      await db.addPlayerScore(room_code, p.playerId, p.name);
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
