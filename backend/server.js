const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const PORT = process.env.PORT || 5000;
const SPIN_WHEEL_DURATION = parseInt(process.env.SPIN_WHEEL_DURATION || '4000'); // 4 seconds
const QUESTION_TIMER_DURATION = parseInt(process.env.QUESTION_TIMER || '15000'); // 15 seconds

// State Machine Storage in memory (backed by DB for persistence)
const activeRooms = {};
const roomInitPromises = {};

// Cache for topics to avoid duplicate DB calls
let topicsCache = [];

/**
 * Load topics from database
 */
async function loadTopics() {
  try {
    const { rows } = await db.query('SELECT * FROM topics ORDER BY id ASC');
    topicsCache = rows;
    console.log(`Loaded ${topicsCache.length} topics from database.`);
  } catch (err) {
    console.error('Failed to load topics:', err.message);
  }
}

/**
 * Get topic metadata by ID
 */
function getTopicById(id) {
  return topicsCache.find(t => t.id === id) || { id, name: 'Unknown', description: '' };
}

/**
 * Reconstruct room session from DB if it exists (for server crash recovery)
 */
async function getOrCreateRoomState(roomCode) {
  if (activeRooms[roomCode]) {
    return activeRooms[roomCode];
  }

  if (roomInitPromises[roomCode]) {
    return roomInitPromises[roomCode];
  }

  roomInitPromises[roomCode] = (async () => {
    // Look in DB
    const { rows } = await db.query('SELECT * FROM game_sessions WHERE id = $1', [roomCode]);
    
    let usedTopics = [];
    let currentState = 'lobby';
    let currentRound = 0;
    let currentQuestion = 0;

    if (rows.length > 0) {
      currentState = rows[0].current_state;
      currentRound = rows[0].current_round;
      currentQuestion = rows[0].current_question;
      try {
        usedTopics = JSON.parse(rows[0].used_topics || '[]');
      } catch (e) {
        usedTopics = [];
      }
    } else {
      // Create new session in DB
      try {
        await db.query(
          'INSERT INTO game_sessions (id, current_state, current_round, current_question, used_topics) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
          [roomCode, 'lobby', 0, 0, '[]']
        );
      } catch (insertErr) {
        console.log('Room insertion query racy, resolved successfully:', insertErr.message);
      }
    }

    // Restore players from player_scores in DB
    const players = {};
    const { rows: dbPlayers } = await db.query('SELECT * FROM player_scores WHERE game_session_id = $1', [roomCode]);
    dbPlayers.forEach(p => {
      players[p.id] = {
        id: p.id,
        name: p.name,
        socketId: null,
        scores: [p.round_1_score, p.round_2_score, p.round_3_score, p.round_4_score, p.round_5_score],
        totalScore: p.total_score
      };
    });

    activeRooms[roomCode] = {
      roomCode,
      currentState,
      currentRound,
      currentQuestion,
      usedTopics,
      currentTopic: null,
      players,
      hostPlayerId: null, // First player to join becomes the host
      timer: null,
      secondsRemaining: 0,
      questions: [],
      answersReceived: {}, // currentQuestion -> { player_id: selected_option }
      resultsCache: null
    };

    // If already in a round, preload questions
    if (currentRound > 0 && currentState.startsWith('round_')) {
      let topicId = 1; // R1 is always fixed (AI Pulse Check)
      if (currentRound > 1 && usedTopics.length >= currentRound - 1) {
        topicId = usedTopics[currentRound - 2];
      }
      const topic = getTopicById(topicId);
      activeRooms[roomCode].currentTopic = topic;
      
      const { rows: qs } = await db.query(
        'SELECT * FROM questions WHERE topic_id = $1 ORDER BY question_number ASC',
        [topicId]
      );
      activeRooms[roomCode].questions = qs;
    }

    delete roomInitPromises[roomCode];
    return activeRooms[roomCode];
  })();

  return roomInitPromises[roomCode];
}

/**
 * Save current room state to database
 */
async function saveRoomToDb(room) {
  try {
    await db.query(
      'UPDATE game_sessions SET current_state = $1, current_round = $2, current_question = $3, used_topics = $4 WHERE id = $5',
      [room.currentState, room.currentRound, room.currentQuestion, JSON.stringify(room.usedTopics), room.roomCode]
    );
  } catch (err) {
    console.error('Failed to save room state to DB:', err.message);
  }
}

/**
 * Reset a room back to fresh lobby state — clears all game data from DB and memory
 */
async function resetRoom(roomCode) {
  console.log(`Resetting room: ${roomCode}`);
  
  // Clear database records for this room
  try {
    await db.query('DELETE FROM answer_log WHERE game_session_id = $1', [roomCode]);
    await db.query('DELETE FROM round_results WHERE game_session_id = $1', [roomCode]);
    await db.query('DELETE FROM tournament_stats WHERE game_session_id = $1', [roomCode]);
    await db.query('DELETE FROM player_scores WHERE game_session_id = $1', [roomCode]);
    await db.query('DELETE FROM game_sessions WHERE id = $1', [roomCode]);
  } catch (err) {
    console.error('Error clearing DB during reset:', err.message);
  }

  // Clear from memory
  delete activeRooms[roomCode];
  delete roomInitPromises[roomCode];

  // Re-create fresh room
  const freshRoom = await getOrCreateRoomState(roomCode);
  console.log(`Room ${roomCode} reset to lobby state.`);
  return freshRoom;
}

// REST endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

app.get('/api/info', (req, res) => {
  res.json({ localIp: getLocalIp() });
});

// Create Room Admin Trigger
app.post('/api/admin/start', async (req, res) => {
  const { roomCode } = req.body;
  const room = await getOrCreateRoomState(roomCode || 'TOURNAMENT');
  
  if (Object.keys(room.players).length === 0) {
    return res.status(400).json({ error: 'Need at least 1 player to start the tournament.' });
  }

  if (room.currentState !== 'lobby') {
    return res.status(400).json({ error: 'Game is already in progress.' });
  }

  startCountdown(room);
  res.json({ status: 'started' });
});

// Admin Reset Endpoint
app.post('/api/admin/reset', async (req, res) => {
  const { roomCode } = req.body;
  const code = roomCode || 'TOURNAMENT';
  await resetRoom(code);
  io.to(code).emit('game_reset', { message: 'Game has been reset.' });
  res.json({ status: 'reset', roomCode: code });
});

// Socket.io handlers
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Handle Client Join
  socket.on('join_game', async (data) => {
    const { roomCode = 'TOURNAMENT', playerName, batchYear } = data;
    let { playerId } = data;

    if (!playerName || playerName.trim() === '') {
      return socket.emit('error_message', { message: 'Player name is required.' });
    }

    if (!playerId) {
      playerId = crypto.randomUUID();
    }

    let room = await getOrCreateRoomState(roomCode);
    
    // Auto-reset finished games so new players can join fresh
    if (room.currentState === 'results') {
      console.log(`Room ${roomCode} is in results state, auto-resetting for new game.`);
      room = await resetRoom(roomCode);
    }

    // Always generate a fresh playerId for new joins (ignore stale localStorage IDs)
    playerId = crypto.randomUUID();

    room.players[playerId] = {
      id: playerId,
      name: playerName.trim(),
      batchYear: batchYear || null,
      socketId: socket.id,
      scores: [0, 0, 0, 0, 0],
      totalScore: 0
    };

    // First player to join becomes the host
    if (!room.hostPlayerId) {
      room.hostPlayerId = playerId;
    }

    // Save player score row to database
    await db.query(
      'INSERT INTO player_scores (id, game_session_id, name, total_score) VALUES ($1, $2, $3, 0) ON CONFLICT (id) DO NOTHING',
      [playerId, roomCode, playerName.trim()]
    );

    const isHost = room.hostPlayerId === playerId;
    socket.join(roomCode);
    socket.emit('player_registered', { playerId, roomCode, isHost });
    
    // Broadcast active player count and usernames
    const lobbyPlayers = Object.values(room.players).map(p => ({ name: p.name, joined: !!p.socketId }));
    io.to(roomCode).emit('lobby_update', { players: lobbyPlayers, currentState: room.currentState });
  });

  // Handle Session Rejoin Request
  socket.on('request_rejoin', async (data) => {
    const { roomCode = 'TOURNAMENT', playerId } = data;
    if (!playerId) return;

    let room = await getOrCreateRoomState(roomCode);
    const player = room.players[playerId];

    // If the game is over (results state), reset the room and reject the rejoin
    // so the player gets a clean lobby
    if (room.currentState === 'results') {
      console.log(`Rejoin attempt for finished game. Resetting room ${roomCode}.`);
      room = await resetRoom(roomCode);
      return socket.emit('rejoin_failed', { message: 'Previous game has ended. Please join again.' });
    }

    if (!player) {
      return socket.emit('rejoin_failed', { message: 'Player record not found.' });
    }

    // Bind current socket to the player
    player.socketId = socket.id;
    socket.join(roomCode);
    
    const isHost = room.hostPlayerId === playerId;
    console.log(`Player rejoined: ${player.name} (${playerId}) in room ${roomCode}`);
    socket.emit('player_rejoined', { 
      message: 'Welcome back!', 
      currentState: room.currentState,
      currentRound: room.currentRound,
      currentQuestion: room.currentQuestion,
      topicName: room.currentTopic ? room.currentTopic.name : '',
      isHost
    });

    // Sync game state depending on where we are
    if (room.currentState.startsWith('round_')) {
      const qIndex = room.currentQuestion - 1;
      const question = room.questions[qIndex];
      
      if (question) {
        // Check if player has already submitted an answer for this question
        const roomAnswers = room.answersReceived[room.currentQuestion] || {};
        const hasSubmitted = roomAnswers[playerId] !== undefined;

        socket.emit('question_loaded', {
          round_number: room.currentRound,
          question_number: room.currentQuestion,
          question_text: question.question_text,
          option_1: question.option_1,
          option_2: question.option_2,
          option_3: question.option_3,
          option_4: question.option_4,
          timer_seconds: room.secondsRemaining,
          has_submitted: hasSubmitted
        });
      }
    } else if (room.currentState.startsWith('spin_')) {
      // If spin hasn't started yet, send ready event; otherwise send spin event
      if (!room.spinStarted) {
        const nextRound = room.currentRound + 1;
        const wheelTopics = [
          { id: 2, name: 'AI Image' },
          { id: 3, name: 'AI Movie' },
          { id: 4, name: 'AI Music' },
          { id: 5, name: 'Text-to-Video' },
          { id: 6, name: 'Meme' }
        ];
        const previouslyUsed = room.usedTopics.slice(0, nextRound - 2);
        const activeTopics = wheelTopics.filter(t => !previouslyUsed.includes(t.id));
        socket.emit('spin_wheel_ready', {
          round_number: nextRound,
          remaining_topics: activeTopics.map(t => ({ name: t.name }))
        });
      } else {
        sendSpinWheelEvent(socket, room);
      }
    } else {
      // Lobby state
      const lobbyPlayers = Object.values(room.players).map(p => ({ name: p.name, joined: !!p.socketId }));
      socket.emit('lobby_update', { players: lobbyPlayers, currentState: room.currentState });
    }
  });

  // Handle Answer Submission (Silent)
  socket.on('submit_answer', async (data) => {
    const { roomCode = 'TOURNAMENT', playerId, round_number, question_number, selected_option } = data;
    const room = activeRooms[roomCode];

    if (!room) return;
    const player = room.players[playerId];
    if (!player) return;

    // Host cannot submit answers (host is presenter only)
    if (room.hostPlayerId === playerId) return;

    // Check if the submission matches the current active round and question
    if (room.currentState !== `round_${round_number}` || room.currentQuestion !== question_number) {
      return; // Ignore stale submissions
    }

    // Check if player already submitted
    if (!room.answersReceived[question_number]) {
      room.answersReceived[question_number] = {};
    }
    if (room.answersReceived[question_number][playerId] !== undefined) {
      return; // Already submitted
    }

    // Cache submission in memory
    room.answersReceived[question_number][playerId] = selected_option;

    // Async validation and logging to DB
    const qIndex = question_number - 1;
    const question = room.questions[qIndex];
    if (!question) return;

    const isCorrect = (question.correct_option === selected_option);
    
    // Trigger non-blocking database log insert
    db.query(
      'INSERT INTO answer_log (game_session_id, player_id, player_name, round_number, question_number, topic_id, selected_option, is_correct) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [room.roomCode, playerId, player.name, round_number, question_number, question.topic_id, selected_option, isCorrect]
    ).catch(err => console.error('Error logging answer:', err.message));

    // Acknowledge submission silently only to this player
    socket.emit('answer_submitted', { status: 'submitted', message: 'Answer received' });

    // Check if ALL active contestants (excluding host) have submitted answers
    const activeContestants = Object.values(room.players).filter(p => p.id !== room.hostPlayerId && !!p.socketId);
    const submittedCount = Object.keys(room.answersReceived[question_number] || {}).length;

    if (activeContestants.length > 0 && submittedCount >= activeContestants.length) {
      console.log(`All ${submittedCount} active player(s) answered Question ${question_number}. Early advancing to next question.`);
      if (room.timer) clearInterval(room.timer);
      io.to(room.roomCode).emit('timer_tick', { seconds_remaining: 0 });
      setTimeout(() => {
        loadQuestion(room);
      }, 1000);
    }
  });

  // Handle Host Start Game (host is also a player)
  socket.on('start_game', async (data) => {
    const { roomCode = 'TOURNAMENT', playerId } = data;
    const room = activeRooms[roomCode];

    if (!room) return socket.emit('error_message', { message: 'Room not found.' });
    
    // Verify the requester is the host
    if (room.hostPlayerId !== playerId) {
      return socket.emit('error_message', { message: 'Only the host can start the game.' });
    }

    if (Object.keys(room.players).length === 0) {
      return socket.emit('error_message', { message: 'Need at least 1 player to start.' });
    }

    if (room.currentState !== 'lobby') {
      return socket.emit('error_message', { message: 'Game is already in progress.' });
    }

    startCountdown(room);
  });

  // Handle Host Spin Wheel — host manually triggers the spin
  socket.on('host_spin_wheel', async (data) => {
    const { roomCode = 'TOURNAMENT', playerId } = data;
    const room = activeRooms[roomCode];

    if (!room) return socket.emit('error_message', { message: 'Room not found.' });
    
    // Verify the requester is the host
    if (room.hostPlayerId !== playerId) {
      return socket.emit('error_message', { message: 'Only the host can spin the wheel.' });
    }

    // Verify we are in a spin-ready state
    if (!room.currentState.startsWith('spin_') || room.spinStarted) {
      return socket.emit('error_message', { message: 'Spin is not available right now.' });
    }

    room.spinStarted = true;

    // Select topic and broadcast spin animation to all clients
    sendSpinWheelEvent(io.to(room.roomCode), room);

    // Wait for spin animation to complete, then start next round
    const nextRound = room.currentRound + 1;
    setTimeout(() => {
      const topicId = room.usedTopics[nextRound - 2];
      startRound(room, nextRound, topicId);
    }, SPIN_WHEEL_DURATION + 2000);
  });

  // Handle Explicit Player Leave
  socket.on('leave_game', async (data) => {
    const { roomCode = 'TOURNAMENT', playerId } = data;
    const room = activeRooms[roomCode];
    if (!room || !playerId || !room.players[playerId]) return;

    console.log(`Player left explicitly: ${room.players[playerId].name} (${playerId})`);
    delete room.players[playerId];

    // Remove from DB if in lobby
    if (room.currentState === 'lobby') {
      await db.query('DELETE FROM player_scores WHERE id = $1', [playerId]).catch(err => console.error(err.message));
    }

    // Reassign host if host left
    if (room.hostPlayerId === playerId) {
      const remainingPids = Object.keys(room.players);
      room.hostPlayerId = remainingPids.length > 0 ? remainingPids[0] : null;
      if (room.hostPlayerId && room.players[room.hostPlayerId].socketId) {
        io.to(room.players[room.hostPlayerId].socketId).emit('player_registered', {
          playerId: room.hostPlayerId,
          roomCode: room.roomCode,
          isHost: true
        });
      }
    }

    // Broadcast updated lobby
    const lobbyPlayers = Object.values(room.players)
      .filter(p => !!p.socketId)
      .map(p => ({ name: p.name, joined: true }));
    io.to(roomCode).emit('lobby_update', { players: lobbyPlayers, currentState: room.currentState });
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    for (const roomCode in activeRooms) {
      const room = activeRooms[roomCode];
      for (const playerId in room.players) {
        if (room.players[playerId].socketId === socket.id) {
          if (room.currentState === 'lobby') {
            // Completely remove player from lobby if they disconnect before game start
            console.log(`Removing disconnected lobby player: ${room.players[playerId].name} (${playerId})`);
            delete room.players[playerId];
            db.query('DELETE FROM player_scores WHERE id = $1', [playerId]).catch(err => console.error(err.message));

            // Reassign host if host disconnected
            if (room.hostPlayerId === playerId) {
              const remainingPids = Object.keys(room.players);
              room.hostPlayerId = remainingPids.length > 0 ? remainingPids[0] : null;
              if (room.hostPlayerId && room.players[room.hostPlayerId].socketId) {
                io.to(room.players[room.hostPlayerId].socketId).emit('player_registered', {
                  playerId: room.hostPlayerId,
                  roomCode: room.roomCode,
                  isHost: true
                });
              }
            }
          } else {
            // Mid-game disconnection: mark offline but retain score record
            room.players[playerId].socketId = null;
          }
          
          // Broadcast list change (only active connected players)
          const lobbyPlayers = Object.values(room.players)
            .filter(p => !!p.socketId)
            .map(p => ({ name: p.name, joined: true }));
          io.to(roomCode).emit('lobby_update', { players: lobbyPlayers, currentState: room.currentState });
          break;
        }
      }
    }
  });
});

/**
 * Start the Game Countdown (Lobby -> Countdown)
 */
function startCountdown(room) {
  room.currentState = 'countdown';
  room.secondsRemaining = 5;
  saveRoomToDb(room);

  io.to(room.roomCode).emit('countdown_start', { seconds: room.secondsRemaining });

  room.timer = setInterval(() => {
    room.secondsRemaining--;
    if (room.secondsRemaining > 0) {
      io.to(room.roomCode).emit('countdown_start', { seconds: room.secondsRemaining });
    } else {
      clearInterval(room.timer);
      io.to(room.roomCode).emit('countdown_start', { seconds: 0 });
      // Transition to Round 1 after a brief delay
      setTimeout(() => startRound(room, 1), 1000);
    }
  }, 1000);
}

/**
 * Start a specific round
 */
async function startRound(room, roundNumber, topicId = 1) {
  room.currentState = `round_${roundNumber}`;
  room.currentRound = roundNumber;
  room.currentQuestion = 0;
  room.answersReceived = {};
  
  // Set current topic
  const topic = getTopicById(topicId);
  room.currentTopic = topic;

  // Retrieve questions for topic
  try {
    const { rows } = await db.query(
      'SELECT * FROM questions WHERE topic_id = $1 ORDER BY question_number ASC',
      [topicId]
    );
    room.questions = rows;
  } catch (err) {
    console.error(`Failed to retrieve questions for topic ${topicId}:`, err.message);
  }

  saveRoomToDb(room);

  // Broadcast Round Started
  io.to(room.roomCode).emit('round_started', {
    round_number: roundNumber,
    round_title: `ROUND ${roundNumber}/5: ${topic.name.toUpperCase()}`,
    total_questions: room.questions.length,
    topic_id: topicId
  });

  // Load first question after 3 seconds
  setTimeout(() => loadQuestion(room), 3000);
}

/**
 * Load current question in the round
 */
function loadQuestion(room) {
  room.currentQuestion++;
  const qIndex = room.currentQuestion - 1;
  const question = room.questions[qIndex];

  if (!question) {
    // End of round
    endRound(room);
    return;
  }

  // Load question parameters
  room.secondsRemaining = 15;
  saveRoomToDb(room);

  io.to(room.roomCode).emit('question_loaded', {
    round_number: room.currentRound,
    question_number: room.currentQuestion,
    question_text: question.question_text,
    option_1: question.option_1,
    option_2: question.option_2,
    option_3: question.option_3,
    option_4: question.option_4,
    timer_seconds: room.secondsRemaining
  });

  // Start question timer
  if (room.timer) clearInterval(room.timer);
  
  room.timer = setInterval(() => {
    room.secondsRemaining--;
    if (room.secondsRemaining > 0) {
      io.to(room.roomCode).emit('timer_tick', { seconds_remaining: room.secondsRemaining });
    } else {
      clearInterval(room.timer);
      io.to(room.roomCode).emit('timer_tick', { seconds_remaining: 0 });

      // Lock answers, brief pause, then load next question
      setTimeout(() => {
        loadQuestion(room);
      }, 1000);
    }
  }, 1000);
}

/**
 * End current round (aggregates scores and prepares for next phase)
 */
async function endRound(room) {
  if (room.timer) clearInterval(room.timer);

  const roundNum = room.currentRound;
  console.log(`Ending Round ${roundNum} for room ${room.roomCode}. Processing scores...`);

  // Calculate scores for this round using answer_log
  try {
    const { rows } = await db.query(
      `SELECT player_id, COUNT(*) as score FROM answer_log 
       WHERE game_session_id = $1 AND round_number = $2 AND is_correct = true 
       GROUP BY player_id`,
      [room.roomCode, roundNum]
    );

    // Create a lookup for current answers
    const scoresMap = {};
    rows.forEach(r => {
      scoresMap[r.player_id] = parseInt(r.score);
    });

    // Update memory and database player tables
    for (const pid in room.players) {
      const score = scoresMap[pid] || 0;
      room.players[pid].scores[roundNum - 1] = score;
      
      // Update DB row (add score for the round)
      const field = `round_${roundNum}_score`;
      await db.query(
        `UPDATE player_scores SET ${field} = $1 WHERE id = $2`,
        [score, pid]
      );
    }
  } catch (err) {
    console.error('Error calculating round scores:', err.message);
  }

  io.to(room.roomCode).emit('round_complete', {
    round_number: roundNum,
    message: `Round ${roundNum} complete! Prepare for spin wheel...`
  });

  // Determine next step
  if (roundNum < 5) {
    // Transition to Spin Wheel state after a short delay
    setTimeout(() => {
      startSpinWheelPhase(room);
    }, 3000);
  } else {
    // Transition to Results state
    setTimeout(() => {
      startResultsPhase(room);
    }, 3000);
  }
}

/**
 * Enter Spin Wheel phase — waits for host to manually trigger the spin
 */
function startSpinWheelPhase(room) {
  const nextRound = room.currentRound + 1;
  room.currentState = `spin_${nextRound - 1}`;
  room.spinStarted = false;
  saveRoomToDb(room);

  // Build list of remaining topics for the wheel display
  const wheelTopics = [
    { id: 2, name: 'AI Image' },
    { id: 3, name: 'AI Movie' },
    { id: 4, name: 'AI Music' },
    { id: 5, name: 'Text-to-Video' },
    { id: 6, name: 'Meme' }
  ];
  const previouslyUsed = room.usedTopics.slice(0, nextRound - 2);
  const activeTopics = wheelTopics.filter(t => !previouslyUsed.includes(t.id));

  // Broadcast spin_wheel_ready — wheel shows but doesn't spin yet
  io.to(room.roomCode).emit('spin_wheel_ready', {
    round_number: nextRound,
    remaining_topics: activeTopics.map(t => ({ name: t.name }))
  });
}

/**
 * Compute random topic and emit spin wheel details to a specific target (socket or room)
 */
function sendSpinWheelEvent(target, room) {
  const nextRound = room.currentRound + 1;
  
  // Calculate selected index if not already chosen for this round
  let selectedTopicId;
  const usedCount = room.usedTopics.length;

  if (usedCount < nextRound - 1) {
    // Get list of remaining topic IDs (exclude Topic 1 which is fixed Round 1)
    const remainingTopicIds = [2, 3, 4, 5, 6].filter(id => !room.usedTopics.includes(id));
    
    // Choose randomly
    const randIndex = Math.floor(Math.random() * remainingTopicIds.length);
    selectedTopicId = remainingTopicIds[randIndex];
    room.usedTopics.push(selectedTopicId);
    saveRoomToDb(room);
  } else {
    selectedTopicId = room.usedTopics[nextRound - 2];
  }

  // Full topic metadata
  const wheelTopics = [
    { id: 2, name: 'AI Image' },
    { id: 3, name: 'AI Movie' },
    { id: 4, name: 'AI Music' },
    { id: 5, name: 'Text-to-Video' },
    { id: 6, name: 'Meme' }
  ];

  // Only send topics that haven't been used BEFORE this spin (so the selected one is still visible)
  const previouslyUsed = room.usedTopics.slice(0, nextRound - 2);
  const activeTopics = wheelTopics.filter(t => !previouslyUsed.includes(t.id));

  const selectedIndex = activeTopics.findIndex(t => t.id === selectedTopicId);
  const selectedTopic = activeTopics[selectedIndex].name;

  target.emit('spin_wheel', {
    round_number: nextRound,
    spin_duration: SPIN_WHEEL_DURATION / 1000, // seconds
    selected_topic: selectedTopic,
    selected_index: selectedIndex,
    remaining_topics: activeTopics.map(t => ({ name: t.name })),
    animation_config: {
      rotations: 8,
      target_angle: (selectedIndex * (360 / activeTopics.length))
    }
  });
}

/**
 * Enter Results Phase
 */
async function startResultsPhase(room) {
  room.currentState = 'results';
  saveRoomToDb(room);

  // Update total score in database for all players
  try {
    await db.query(
      `UPDATE player_scores 
       SET total_score = round_1_score + round_2_score + round_3_score + round_4_score + round_5_score
       WHERE game_session_id = $1`,
      [room.roomCode]
    );

    // Refresh players details from database
    const { rows: pScores } = await db.query(
      'SELECT * FROM player_scores WHERE game_session_id = $1 ORDER BY total_score DESC',
      [room.roomCode]
    );

    pScores.forEach(ps => {
      if (room.players[ps.id]) {
        room.players[ps.id].scores = [ps.round_1_score, ps.round_2_score, ps.round_3_score, ps.round_4_score, ps.round_5_score];
        room.players[ps.id].totalScore = ps.total_score;
      }
    });

    // Compile analytics in a single SQL batch query
    const { rows: statsRows } = await db.query(
      `SELECT 
        round_number, 
        AVG(CASE WHEN is_correct = true THEN 1.0 ELSE 0.0 END) * 5.0 as avg_score,
        AVG(CASE WHEN is_correct = true THEN 1.0 ELSE 0.0 END) * 100.0 as accuracy
       FROM answer_log 
       WHERE game_session_id = $1
       GROUP BY round_number
       ORDER BY round_number ASC`,
      [room.roomCode]
    );

    // Calculate score distribution
    const { rows: distRows } = await db.query(
      `SELECT total_score, COUNT(*) as player_count 
       FROM player_scores 
       WHERE game_session_id = $1 
       GROUP BY total_score 
       ORDER BY total_score DESC`,
      [room.roomCode]
    );

    const score_distribution = {};
    distRows.forEach(dr => {
      score_distribution[dr.total_score] = parseInt(dr.player_count);
    });

    // Map difficulty rankings
    const { rows: diffRows } = await db.query(
      `SELECT t.name as topic_name, AVG(CASE WHEN al.is_correct = true THEN 1.0 ELSE 0.0 END) * 100.0 as accuracy
       FROM answer_log al
       JOIN topics t ON al.topic_id = t.id
       WHERE al.game_session_id = $1
       GROUP BY t.name`,
      [room.roomCode]
    );

    const topic_difficulty = {};
    diffRows.forEach(df => {
      topic_difficulty[df.topic_name] = Math.round(df.accuracy);
    });

    // Compile statistics package
    const avgScores = [0, 0, 0, 0, 0];
    const accPercentages = [0, 0, 0, 0, 0];
    statsRows.forEach(sr => {
      if (sr.round_number >= 1 && sr.round_number <= 5) {
        avgScores[sr.round_number - 1] = Math.round(sr.avg_score * 10) / 10;
        accPercentages[sr.round_number - 1] = Math.round(sr.accuracy);
      }
    });

    const leaderboard = pScores.map((ps, idx) => {
      const playerData = room.players[ps.id];
      return {
        rank: idx + 1,
        name: ps.name,
        batchYear: playerData ? playerData.batchYear : null,
        r1: ps.round_1_score,
        r2: ps.round_2_score,
        r3: ps.round_3_score,
        r4: ps.round_4_score,
        r5: ps.round_5_score,
        total: ps.total_score
      };
    });

    // Compute Batch Leaderboard — aggregate scores by batch year
    const batchMap = {};
    leaderboard.forEach(p => {
      if (!p.batchYear) return;
      if (!batchMap[p.batchYear]) {
        batchMap[p.batchYear] = { batchYear: p.batchYear, totalScore: 0, playerCount: 0, players: [] };
      }
      batchMap[p.batchYear].totalScore += p.total;
      batchMap[p.batchYear].playerCount += 1;
      batchMap[p.batchYear].players.push(p.name);
    });
    const batchLeaderboard = Object.values(batchMap)
      .map(b => ({ ...b, avgScore: Math.round((b.totalScore / b.playerCount) * 10) / 10 }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((b, idx) => ({ ...b, rank: idx + 1 }));

    const winner = leaderboard[0] || { rank: 1, name: 'Nobody', total: 0 };

    room.resultsCache = {
      winner,
      leaderboard,
      batchLeaderboard,
      statistics: {
        avg_score_per_round: avgScores,
        accuracy_per_round: accPercentages,
        topic_difficulty,
        score_distribution
      }
    };
  } catch (err) {
    console.error('Error generating final statistics:', err.message);
  }

  io.to(room.roomCode).emit('all_rounds_complete', { message: 'All 5 rounds complete! Loading results...' });

  // Broadcast results
  setTimeout(() => {
    sendFinalResults(io.to(room.roomCode), room);
  }, 2000);
}

/**
 * Send precompiled final results to target (socket/room)
 */
function sendFinalResults(target, room) {
  if (room.resultsCache) {
    target.emit('final_results', room.resultsCache);
  } else {
    // Mock default stats in case query fails
    target.emit('final_results', {
      winner: { rank: 1, name: 'None', total: 0 },
      leaderboard: [],
      statistics: {
        avg_score_per_round: [0, 0, 0, 0, 0],
        accuracy_per_round: [0, 0, 0, 0, 0],
        topic_difficulty: {},
        score_distribution: {}
      }
    });
  }
}

// ─── Serve Frontend Static Build (Production) ──────────────────────
const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// SPA catch-all: serve index.html for any non-API route
app.get('*', (req, res) => {
  const indexPath = path.join(frontendDistPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('<h1>AI Trivia Tournament API & Socket Server running</h1><p>Frontend static assets not found. Run "npm run build" to generate static files.</p>');
  }
});

// Start application
async function startServer() {
  await db.initDb();
  await loadTopics();

  server.listen(PORT, () => {
    console.log(`HTTP & Sockets Server running on port ${PORT}`);
  });
}

startServer();
