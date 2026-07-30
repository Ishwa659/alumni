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

const seedQuestions = [
  // ChatGPT (Q1-Q3)
  { question_number: 1, ai_app_id: 1, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 1, option_1: 'ChatGPT', option_2: 'Gemini', option_3: 'Claude' },
  { question_number: 2, ai_app_id: 1, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 2, option_1: 'Elon Musk', option_2: 'Sam Altman', option_3: 'Sundar Pichai' },
  { question_number: 3, ai_app_id: 1, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 1, option_1: 'Conversational AI', option_2: 'Code Generation', option_3: 'Multimodal' },
  
  // Claude (Q4-Q6)
  { question_number: 4, ai_app_id: 2, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 3, option_1: 'Grok', option_2: 'Copilot', option_3: 'Claude' },
  { question_number: 5, ai_app_id: 2, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 1, option_1: 'Dario Amodei', option_2: 'Satya Nadella', option_3: 'Sam Altman' },
  { question_number: 6, ai_app_id: 2, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 2, option_1: 'Code & Productivity', option_2: 'Constitutional AI', option_3: 'Real-time Information' },

  // Gemini (Q7-Q9)
  { question_number: 7, ai_app_id: 3, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 1, option_1: 'Gemini', option_2: 'Claude', option_3: 'ChatGPT' },
  { question_number: 8, ai_app_id: 3, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 2, option_1: 'Elon Musk', option_2: 'Sundar Pichai', option_3: 'Dario Amodei' },
  { question_number: 9, ai_app_id: 3, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 2, option_1: 'Conversational AI', option_2: 'Multimodal AI', option_3: 'Real-time Information' },

  // Copilot (Q10-Q12)
  { question_number: 10, ai_app_id: 4, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 3, option_1: 'Grok', option_2: 'ChatGPT', option_3: 'Copilot' },
  { question_number: 11, ai_app_id: 4, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 1, option_1: 'Satya Nadella', option_2: 'Sundar Pichai', option_3: 'Elon Musk' },
  { question_number: 12, ai_app_id: 4, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 1, option_1: 'Code & Productivity', option_2: 'Constitutional AI', option_3: 'Conversational AI' },

  // Grok (Q13-Q15)
  { question_number: 13, ai_app_id: 5, question_type: 'name', question_text: 'What is the name of this AI?', correct_option: 1, option_1: 'Grok', option_2: 'Gemini', option_3: 'Claude' },
  { question_number: 14, ai_app_id: 5, question_type: 'founder', question_text: 'Who founded this AI?', correct_option: 2, option_1: 'Sam Altman', option_2: 'Elon Musk', option_3: 'Satya Nadella' },
  { question_number: 15, ai_app_id: 5, question_type: 'feature', question_text: 'What is the main feature of this AI?', correct_option: 3, option_1: 'Multimodal AI', option_2: 'Constitutional AI', option_3: 'Real-time Information' }
];

// Database state mode
let useMockDb = false;
let pool = null;

// In-Memory Database mocks
const mockDb = {
  ai_apps: [...seedAis],
  questions: [...seedQuestions],
  game_sessions: {},
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
      // Reset serial sequence
      await pool.query("SELECT setval(pg_get_serial_sequence('ai_apps', 'id'), coalesce(max(id), 1)) FROM ai_apps");
    }

    // 3. Check and seed Questions
    const questionCount = await pool.query('SELECT count(*) FROM questions');
    if (parseInt(questionCount.rows[0].count, 10) === 0) {
      console.log('🌱 Seeding Questions database...');
      for (const q of seedQuestions) {
        await pool.query(
          `INSERT INTO questions (question_number, ai_app_id, question_type, question_text, correct_option, option_1, option_2, option_3) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [q.question_number, q.ai_app_id, q.question_type, q.question_text, q.correct_option, q.option_1, q.option_2, q.option_3]
        );
      }
      // Reset serial sequence
      await pool.query("SELECT setval(pg_get_serial_sequence('questions', 'id'), coalesce(max(id), 1)) FROM questions");
    }
    console.log('🚀 Database initialization complete.');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    console.log('⚠️ Switched to Mock In-Memory Database due to initialization failure.');
    useMockDb = true;
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
        total_players: 0
      };
      return mockDb.game_sessions[roomCode];
    }
    const res = await pool.query(
      `INSERT INTO game_sessions (room_code, status) 
       VALUES ($1, 'waiting') 
       ON CONFLICT (room_code) DO UPDATE SET status = 'waiting', current_question_number = 0, started_at = NULL, ended_at = NULL, total_players = 0 
       RETURNING *`,
      [roomCode]
    );
    return res.rows[0];
  },

  updateSessionStatus: async (roomCode, status, currentQuestion = 0) => {
    const now = new Date();
    if (useMockDb) {
      const session = mockDb.game_sessions[roomCode];
      if (session) {
        session.status = status;
        session.current_question_number = currentQuestion;
        if (status === 'in_progress' && !session.started_at) session.started_at = now;
        if (status === 'finished') session.ended_at = now;
      }
      return session;
    }
    let query = `UPDATE game_sessions SET status = $1, current_question_number = $2`;
    const params = [status, currentQuestion, roomCode];
    if (status === 'in_progress') {
      query += `, started_at = CURRENT_TIMESTAMP`;
    } else if (status === 'finished') {
      query += `, ended_at = CURRENT_TIMESTAMP`;
    }
    query += ` WHERE room_code = $3 RETURNING *`;
    const res = await pool.query(query, params);
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
        updated_at: new Date()
      };
      return mockDb.player_scores[scoreKey];
    }
    const sessionRes = await pool.query('SELECT id FROM game_sessions WHERE room_code = $1', [roomCode]);
    if (sessionRes.rows.length === 0) throw new Error('Game session not found');
    const sessionId = sessionRes.rows[0].id;
    const res = await pool.query(
      `INSERT INTO player_scores (game_session_id, player_id, player_name, total_score, correct_answers_count) 
       VALUES ($1, $2, $3, 0, 0) 
       ON CONFLICT (game_session_id, player_id) DO UPDATE SET total_score = 0, correct_answers_count = 0, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [sessionId, playerId, playerName]
    );
    return res.rows[0];
  },

  recordAnswer: async (roomCode, playerId, questionNumber, selectedOption, isCorrect) => {
    if (useMockDb) {
      const session = mockDb.game_sessions[roomCode];
      if (!session) return;
      
      // Update score in-memory
      const scoreKey = `${session.id}-${playerId}`;
      const playerScore = mockDb.player_scores[scoreKey];
      if (playerScore) {
        if (isCorrect) {
          playerScore.total_score += 1;
          playerScore.correct_answers_count += 1;
        }
        playerScore.updated_at = new Date();
      }

      // Log answer
      mockDb.answer_logs.push({
        id: uuidv4(),
        game_session_id: session.id,
        player_id: playerId,
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

      // Start a database transaction
      await pool.query('BEGIN');
      
      // Update score if correct
      if (isCorrect) {
        await pool.query(
          `UPDATE player_scores 
           SET total_score = total_score + 1, correct_answers_count = correct_answers_count + 1, updated_at = CURRENT_TIMESTAMP 
           WHERE game_session_id = $1 AND player_id = $2`,
          [sessionId, playerId]
        );
      }

      // Insert log
      await pool.query(
        `INSERT INTO answer_log (game_session_id, player_id, question_number, selected_option, is_correct) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (game_session_id, player_id, question_number) DO NOTHING`,
        [sessionId, playerId, questionNumber, selectedOption, isCorrect]
      );

      await pool.query('COMMIT');
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error('Error logging answer and updating score:', e);
    }
  },

  getQuestions: async () => {
    if (useMockDb) {
      return seedQuestions.map(q => {
        const app = seedAis.find(a => a.id === q.ai_app_id);
        return {
          ...q,
          logo_url: app ? app.logo_url : ''
        };
      });
    }
    const res = await pool.query(
      `SELECT q.*, a.logo_url 
       FROM questions q 
       JOIN ai_apps a ON q.ai_app_id = a.id 
       ORDER BY q.question_number`
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
          total_score: s.total_score,
          correct_answers_count: s.correct_answers_count
        }));
      scores.sort((a, b) => b.total_score - a.total_score || b.correct_answers_count - a.correct_answers_count);
      return scores.map((s, idx) => ({
        rank: idx + 1,
        player_name: s.player_name,
        total_score: s.total_score
      }));
    }

    const sessionRes = await pool.query('SELECT id FROM game_sessions WHERE room_code = $1', [roomCode]);
    if (sessionRes.rows.length === 0) return [];
    const sessionId = sessionRes.rows[0].id;

    const res = await pool.query(
      `SELECT player_name, total_score, correct_answers_count 
       FROM player_scores 
       WHERE game_session_id = $1 
       ORDER BY total_score DESC, correct_answers_count DESC, updated_at ASC`,
      [sessionId]
    );

    return res.rows.map((row, index) => ({
      rank: index + 1,
      player_name: row.player_name,
      total_score: row.total_score
    }));
  }
};

// Global game runner state mapping: roomCode -> GameRunner state
const gameRunners = {};

class GameRunner {
  constructor(roomCode, ioNamespace) {
    this.roomCode = roomCode;
    this.io = ioNamespace;
    this.status = 'waiting'; // waiting, in_progress, finished
    this.currentQuestionNumber = 0;
    this.questions = [];
    this.players = []; // Array of { socketId, playerId, name, isAdmin }
    this.timer = 15;
    this.timerInterval = null;
    this.answersReceived = {}; // playerId -> selectedOption
  }

  addPlayer(socketId, playerId, name, isAdmin) {
    // Check if player already exists in room
    const existing = this.players.find(p => p.playerId === playerId);
    if (existing) {
      existing.socketId = socketId; // Update socket reference
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
    // Send list of player names to the room
    const playerList = this.players.map(p => ({
      player_name: p.name,
      is_admin: p.isAdmin
    }));
    this.io.to(this.roomCode).emit('player_list_update', playerList);
  }

  async start() {
    if (this.status !== 'waiting') return;
    
    // Load questions
    try {
      this.questions = await db.getQuestions();
      if (this.questions.length === 0) {
        console.error('No questions found in database!');
        // Fall back to seedQuestions
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

    this.status = 'in_progress';
    await db.updateSessionStatus(this.roomCode, 'in_progress', 1);
    this.loadQuestion(1);
  }

  async loadQuestion(questionNumber) {
    this.currentQuestionNumber = questionNumber;
    this.answersReceived = {};
    const question = this.questions.find(q => q.question_number === questionNumber);
    if (!question) {
      console.error(`Question ${questionNumber} not found!`);
      this.finishGame();
      return;
    }

    await db.updateSessionQuestion(this.roomCode, questionNumber);

    // Broadcast question to all players
    this.io.to(this.roomCode).emit('question_loaded', {
      question_number: question.question_number,
      ai_logo_url: question.logo_url,
      question_text: question.question_text,
      option_1: question.option_1,
      option_2: question.option_2,
      option_3: question.option_3,
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
    if (this.status !== 'in_progress' || this.timer <= 0) return;

    // Check if player has already submitted an answer for this question
    if (this.answersReceived[playerId] !== undefined) {
      return; // Lock duplicate buzzer
    }

    this.answersReceived[playerId] = selectedOption;

    const question = this.questions.find(q => q.question_number === this.currentQuestionNumber);
    if (!question) return;

    const isCorrect = selectedOption === question.correct_option;
    
    // Save to Database / Mock
    await db.recordAnswer(this.roomCode, playerId, this.currentQuestionNumber, selectedOption, isCorrect);

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
      leaderboard: leaderboard
    });

    // Wait 2 seconds, then proceed
    setTimeout(async () => {
      if (this.currentQuestionNumber < 15) {
        this.loadQuestion(this.currentQuestionNumber + 1);
      } else {
        await this.finishGame();
      }
    }, 2000);
  }

  async finishGame() {
    this.status = 'finished';
    await db.updateSessionStatus(this.roomCode, 'finished');
    const leaderboard = await db.getLeaderboard(this.roomCode);
    
    const winner = leaderboard.length > 0 ? {
      rank: 1,
      player_name: leaderboard[0].player_name,
      score: leaderboard[0].total_score
    } : null;

    this.io.to(this.roomCode).emit('game_finished', {
      winner,
      final_leaderboard: leaderboard
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
      current_question: runner.currentQuestionNumber
    });

    console.log(`👤 Player ${player_name} (${isPlayerAdmin ? 'Admin' : 'Player'}) joined room ${room_code}`);

    // Broadcast updated player list
    runner.broadcastPlayerList();

    // If game is already in progress, immediately send the current question or current leaderboard
    if (runner.status === 'in_progress') {
      const question = runner.questions.find(q => q.question_number === runner.currentQuestionNumber);
      if (question) {
        socket.emit('question_loaded', {
          question_number: question.question_number,
          ai_logo_url: question.logo_url,
          question_text: question.question_text,
          option_1: question.option_1,
          option_2: question.option_2,
          option_3: question.option_3,
          timer_seconds: runner.timer
        });
      }
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
