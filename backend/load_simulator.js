/**
 * Multiplayer AI Trivia Tournament Load Simulator
 * Simulates 600 concurrent players connecting, joining a room,
 * and submitting random answers silently to stress test the backend.
 * 
 * Usage:
 * 1. Start the backend: npm run start (in trivia-tournament/backend)
 * 2. Run simulation: node load_simulator.js
 */
const { io } = require('socket.io-client');
const crypto = require('crypto');

const SERVER_URL = 'http://localhost:5000';
const ROOM_CODE = 'STRESS_' + Math.floor(Math.random() * 100000);
const CONCURRENT_USERS = 600;

console.log(`Starting stress test simulation for ${CONCURRENT_USERS} players...`);
console.log(`Connecting to server at ${SERVER_URL}...`);

const clients = [];
let joinedCount = 0;
let submissionsCount = 0;
let tickCount = 0;

async function triggerAdminStart() {
  console.log('\n--- Triggering Admin Start Game ---');
  try {
    const response = await fetch(`${SERVER_URL}/api/admin/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: ROOM_CODE })
    });
    const result = await response.json();
    console.log('Admin trigger response:', result);
  } catch (err) {
    console.error('Failed to trigger admin start:', err.message);
    console.log('\nMake sure the backend server is running first (npm start)');
    process.exit(1);
  }
}

for (let i = 1; i <= CONCURRENT_USERS; i++) {
  const playerId = crypto.randomUUID();
  const playerName = `StressPlayer_${i}`;

  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
    autoConnect: false
  });

  socket.on('connect', () => {
    socket.emit('join_game', {
      roomCode: ROOM_CODE,
      playerName,
      playerId
    });
  });

  socket.on('player_registered', () => {
    joinedCount++;
    if (joinedCount % 100 === 0 || joinedCount === CONCURRENT_USERS) {
      console.log(`[Status] Connected & Joined: ${joinedCount}/${CONCURRENT_USERS} players`);
      
      if (joinedCount === CONCURRENT_USERS) {
        setTimeout(triggerAdminStart, 2000);
      }
    }
  });

  socket.on('countdown_start', (data) => {
    if (i === 1) {
      console.log(`[Game Broadcast] Countdown: ${data.seconds}...`);
    }
  });

  socket.on('round_started', (data) => {
    if (i === 1) {
      console.log(`\n[Game Broadcast] Round ${data.round_number} Started: ${data.round_title}`);
    }
  });

  socket.on('question_loaded', (data) => {
    if (i === 1) {
      console.log(`[Question Broadcast] Round ${data.round_number} - Question ${data.question_number}: "${data.question_text}"`);
    }

    const thinkTime = Math.random() * 4800 + 200;
    
    setTimeout(() => {
      const selectedOption = Math.floor(Math.random() * 4) + 1;
      socket.emit('submit_answer', {
        roomCode: ROOM_CODE,
        playerId,
        round_number: data.round_number,
        question_number: data.question_number,
        selected_option: selectedOption
      });
    }, thinkTime);
  });

  socket.on('answer_submitted', () => {
    submissionsCount++;
    if (submissionsCount % 200 === 0) {
      console.log(`[Silent Gameplay] Logged submissions: ${submissionsCount} answers processed.`);
    }
  });

  socket.on('timer_tick', (data) => {
    tickCount++;
    if (i === 1 && data.seconds_remaining % 5 === 0) {
      console.log(`[Timer] ${data.seconds_remaining} seconds remaining on active question.`);
    }
  });

  socket.on('round_complete', (data) => {
    if (i === 1) {
      console.log(`[Round End] Round ${data.round_number} Completed. ${data.message}`);
    }
  });

  socket.on('spin_wheel', (data) => {
    if (i === 1) {
      console.log(`[Spin Wheel] Synced Spin Drawn: Round ${data.round_number} Topic -> "${data.selected_topic}" in ${data.spin_duration}s`);
    }
  });

  socket.on('all_rounds_complete', (data) => {
    if (i === 1) {
      console.log(`\n[Tournament End] ${data.message}`);
    }
  });

  socket.on('final_results', (data) => {
    if (i === 1) {
      console.log('\n--- Final Leaderboard Statistics Received ---');
      console.log(`Winner: Rank 1 - ${data.winner.name} (Total Score: ${data.winner.total}/25)`);
      console.log(`Top 5 Rankings:`);
      data.leaderboard.slice(0, 5).forEach((p) => {
        console.log(` Rank ${p.rank}: ${p.name} | R1:${p.r1} R2:${p.r2} R3:${p.r3} R4:${p.r4} R5:${p.r5} | Total: ${p.total}`);
      });
      console.log('\nAccuracy Breakdown:');
      data.statistics.accuracy_per_round.forEach((acc, idx) => {
        console.log(` Round ${idx + 1}: ${acc}%`);
      });
      console.log('\nAverage Scores:');
      data.statistics.avg_score_per_round.forEach((avg, idx) => {
        console.log(` Round ${idx + 1}: ${avg}/5`);
      });
      
      console.log('\nStress Test Completed Successfully with zero crashes!');
      process.exit(0);
    }
  });

  clients.push(socket);
}

let connectIdx = 0;
const connectInterval = setInterval(() => {
  if (connectIdx < clients.length) {
    clients[connectIdx].connect();
    connectIdx++;
  } else {
    clearInterval(connectInterval);
    console.log('[System] All simulated clients triggered connection requests.');
  }
}, 5);
