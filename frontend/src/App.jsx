import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (() => {
  const { hostname, protocol } = window.location;
  // If running locally (localhost, 127.0.0.1, or local subnet IPs), backend runs on port 3000
  if (
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.') || 
    hostname.startsWith('172.')
  ) {
    return `${protocol}//${hostname}:3000`;
  }
  // In production, assume same origin (reverse proxy handles routing)
  return window.location.origin;
})();

function AiLogo({ url, name }) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [url]);

  if (!url || imgFailed) {
    const initial = name ? name.charAt(0) : 'AI';
    return <div className="logo-fallback">{initial}</div>;
  }

  return (
    <img 
      src={url} 
      alt={`${name || 'AI'} Logo`} 
      className="ai-logo" 
      onError={() => setImgFailed(true)} 
    />
  );
}

function App() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState('lobby'); // lobby, game, results
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('ai_trivia_player_id') || '');
  const [isAdmin, setIsAdmin] = useState(false);
  const [joined, setJoined] = useState(false);
  
  // Lobby state
  const [playersList, setPlayersList] = useState([]);
  
  // Gameplay state
  const [question, setQuestion] = useState(null);
  const [timer, setTimer] = useState(15);
  const [selectedOption, setSelectedOption] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);

  // Results state
  const [finalResults, setFinalResults] = useState(null);

  // Error/Status Alert
  const [alertMsg, setAlertMsg] = useState(null);

  const socketRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const s = io(`${BACKEND_URL}/game`, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
    
    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      console.log('Connected to socket server');
      // If we previously joined a room, attempt to auto-rejoin
      const savedRoom = sessionStorage.getItem('ai_trivia_room_code');
      const savedName = sessionStorage.getItem('ai_trivia_player_name');
      const savedId = localStorage.getItem('ai_trivia_player_id');
      if (savedRoom && savedName && savedId) {
        s.emit('join_game', {
          room_code: savedRoom,
          player_name: savedName,
          player_id: savedId
        });
      }
    });

    s.on('joined_game', (data) => {
      setJoined(true);
      setRoomCode(data.room_code);
      setPlayerName(data.player_name);
      setPlayerId(data.player_id);
      setIsAdmin(data.is_admin);
      localStorage.setItem('ai_trivia_player_id', data.player_id);
      sessionStorage.setItem('ai_trivia_room_code', data.room_code);
      sessionStorage.setItem('ai_trivia_player_name', data.player_name);

      if (data.game_status === 'in_progress') {
        setScreen('game');
      } else if (data.game_status === 'finished') {
        setScreen('results');
      } else {
        setScreen('lobby');
      }
    });

    s.on('player_list_update', (list) => {
      setPlayersList(list);
    });

    s.on('question_loaded', (data) => {
      setQuestion(data);
      setTimer(data.timer_seconds || 15);
      setSelectedOption(null);
      setFeedback(null);
      setAnswerSubmitted(false);
      setScreen('game');
    });

    s.on('timer_tick', (data) => {
      setTimer(data.seconds_remaining);
    });

    s.on('leaderboard_update', (data) => {
      setLeaderboard(data);
    });

    s.on('answer_feedback', (data) => {
      // Immediate response to my answer submission
      setFeedback(data);
    });

    s.on('answer_reveal', (data) => {
      // Timer expired, answer revealed to everyone
      setFeedback({
        is_reveal: true,
        correct_option: data.correct_option,
        correct_answer_text: data.correct_answer_text
      });
      setLeaderboard(data.leaderboard);
    });

    s.on('game_finished', (data) => {
      setFinalResults(data);
      setScreen('results');
    });

    s.on('game_reset', () => {
      // Clear game states
      setQuestion(null);
      setFeedback(null);
      setSelectedOption(null);
      setAnswerSubmitted(false);
      setFinalResults(null);
      setScreen('lobby');
    });

    s.on('error_message', (data) => {
      showTemporaryAlert(data.message);
    });

    s.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const showTemporaryAlert = (msg) => {
    setAlertMsg(msg);
    setTimeout(() => {
      setAlertMsg(null);
    }, 4000);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomCode.trim() || !playerName.trim()) {
      showTemporaryAlert('Please enter both room code and your name');
      return;
    }
    if (socket) {
      socket.emit('join_game', {
        room_code: roomCode.toUpperCase().trim(),
        player_name: playerName.trim(),
        player_id: playerId
      });
    }
  };

  const handleStartGame = () => {
    if (socket && isAdmin) {
      socket.emit('start_game', {
        room_code: roomCode,
        player_id: playerId
      });
    }
  };

  const handleSelectOption = (optionIndex) => {
    if (answerSubmitted || timer <= 0 || (feedback && feedback.is_reveal)) return;
    
    setSelectedOption(optionIndex);
    setAnswerSubmitted(true);

    if (socket) {
      socket.emit('submit_answer', {
        room_code: roomCode,
        player_id: playerId,
        selected_option: optionIndex
      });
    }
  };

  const handlePlayAgain = () => {
    if (socket && isAdmin) {
      socket.emit('play_again', {
        room_code: roomCode,
        player_id: playerId
      });
    }
  };



  // Render Screens
  return (
    <div className="app-container">
      {alertMsg && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--wrong-grad)',
          padding: '0.75rem 2rem',
          borderRadius: '30px',
          boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
          zIndex: 9999,
          fontWeight: 600,
          animation: 'fadeIn 0.3s'
        }}>
          ⚠️ {alertMsg}
        </div>
      )}

      <header className="header">
        <div className="brand">
          <span>🧠</span> AI Trivia Arena
        </div>
        {joined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.06)', 
              padding: '0.4rem 1rem', 
              borderRadius: '20px', 
              border: '1px solid var(--border-light)',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              Room: <span style={{ color: 'hsl(220, 95%, 75%)' }}>{roomCode}</span>
            </span>
            {isAdmin && <span className="admin-tag">HOST</span>}
          </div>
        )}
      </header>

      {/* Screen 1: Lobby (Join / Waiting Room) */}
      {screen === 'lobby' && (
        <>
          {!joined ? (
            <div className="lobby-card">
              <h1 className="lobby-title">Enter the Arena</h1>
              <p className="lobby-subtitle">Real-time AI Trivia Multiplayer Game</p>
              <form onSubmit={handleJoin}>
                <div className="form-group">
                  <label className="form-label">Room Code</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. ALPHA1" 
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    maxLength={10}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Your Nickname</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Enter your name" 
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={15}
                  />
                </div>
                <button type="submit" className="btn">
                  JOIN GAME <span>⚡</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="waiting-grid">
              <div className="waiting-section">
                <div className="section-header">
                  <span>Lobby Waiting List</span>
                  <span className="player-counter">{playersList.length} Joined</span>
                </div>
                <div className="players-list">
                  {playersList.map((p, idx) => (
                    <div 
                      key={idx} 
                      className={`player-pill ${p.is_admin ? 'admin-pill' : ''}`}
                    >
                      {p.is_admin && <span className="admin-badge">👑</span>}
                      {p.player_name}
                    </div>
                  ))}
                  {playersList.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                      Waiting for players to connect...
                    </div>
                  )}
                </div>
              </div>

              <div className="waiting-actions">
                <h3>Invite Players</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0 1rem 0' }}>
                  Scan code or share URL to join
                </p>
                <div className="qr-code-placeholder">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.href)}`} 
                    alt="QR Code"
                    className="qr-canvas"
                  />
                </div>
                
                {isAdmin ? (
                  <div className="admin-panel" style={{ width: '100%' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--accent-gold)', marginBottom: '1rem', fontWeight: 600 }}>
                      You are the host! Start the game when ready.
                    </p>
                    <button 
                      className="btn" 
                      onClick={handleStartGame}
                      disabled={playersList.length < 1}
                    >
                      START GAME 🚀
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: '1.5rem', color: 'var(--text-muted)' }}>
                    <p>Waiting for host to start the game...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Screen 2: Game Room */}
      {screen === 'game' && question && (
        <div className="game-grid">
          <div className="game-main">
            <div className="game-header">
              <span className="question-progress">
                Question {question.question_number} / 15
              </span>
              <div className="timer-container">
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TIME REMAINING</span>
                <div className={`timer-circle ${timer <= 5 ? (timer <= 2 ? 'danger' : 'warning') : ''}`}>
                  {timer}
                </div>
              </div>
            </div>

            {/* AI Logo */}
            <div className="logo-display">
              <AiLogo url={question.ai_logo_url} name={question.option_1} />
            </div>

            {/* Question Text */}
            <h2 className="question-text">
              {question.question_text}
            </h2>

            {/* Clickable options */}
            <div className="options-grid">
              {[1, 2, 3].map((optIndex) => {
                const optText = question[`option_${optIndex}`];
                const isSelected = selectedOption === optIndex;
                
                let btnClass = 'option-btn';
                if (isSelected) btnClass += ' selected';

                // Check feedback cases
                if (feedback) {
                  const isCorrectOpt = optIndex === feedback.correct_option;
                  const isWrongSelected = isSelected && !feedback.is_correct;

                  if (isCorrectOpt) {
                    btnClass += ' correct';
                  } else if (isWrongSelected) {
                    btnClass += ' wrong';
                  }
                }

                return (
                  <button
                    key={optIndex}
                    className={btnClass}
                    onClick={() => handleSelectOption(optIndex)}
                    disabled={answerSubmitted || timer <= 0 || (feedback && feedback.is_reveal)}
                  >
                    <span>{optText}</span>
                    <span className="option-badge">
                      {optIndex === 1 ? 'A' : optIndex === 2 ? 'B' : 'C'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Live Buzzer Feedback */}
            <div className="feedback-container">
              {feedback && (
                <>
                  {feedback.is_reveal ? (
                    <div className="feedback-alert timeout">
                      Time's up! Correct answer: <strong>{feedback.correct_answer_text}</strong>
                    </div>
                  ) : feedback.is_correct ? (
                    <div className="feedback-alert correct">
                      ✓ Correct! +1 Point
                    </div>
                  ) : (
                    <div className="feedback-alert wrong">
                      ✗ Wrong! Correct: {feedback.correct_answer_text}
                    </div>
                  )}
                </>
              )}
              {!feedback && answerSubmitted && (
                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Buzzer locked! Waiting for timer...
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Leaderboard */}
          <div className="sidebar-leaderboard">
            <div className="leaderboard-title">
              <span>Leaderboard</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Live Updates</span>
            </div>
            <div className="leaderboard-rows">
              {leaderboard.map((player, idx) => (
                <div 
                  key={idx} 
                  className={`leaderboard-row ${player.player_name === playerName ? 'current-player' : ''}`}
                >
                  <span className="leaderboard-rank">#{player.rank}</span>
                  <span className="leaderboard-name">{player.player_name}</span>
                  <span className="leaderboard-score">{player.total_score} pts</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div className="empty-leaderboard">
                  No scores yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Screen 3: Final Results */}
      {screen === 'results' && finalResults && (
        <div className="results-card">
          <div className="winner-banner">
            <span className="winner-crown">🏆</span>
            <h1 className="winner-title">
              {finalResults.winner ? `${finalResults.winner.player_name} wins!` : 'No Winner'}
            </h1>
            <p className="winner-score">
              {finalResults.winner ? `Final Score: ${finalResults.winner.score} / 15` : ''}
            </p>
          </div>

          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>Final Rankings</h2>
          
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {finalResults.final_leaderboard.map((row, idx) => {
                  const isWinner = row.rank === 1;
                  return (
                    <tr 
                      key={idx} 
                      className={isWinner ? 'highlight-winner' : ''}
                    >
                      <td style={{ fontWeight: 700 }}>#{row.rank}</td>
                      <td>
                        {row.player_name} {isWinner && '👑'}
                      </td>
                      <td style={{ fontWeight: 600 }}>{row.total_score}/15</td>
                      <td>
                        <span className="result-ticks">
                          {Array.from({ length: row.total_score }).map((_, i) => (
                            <span key={i} className="tick-correct">✓</span>
                          ))}
                          {Array.from({ length: Math.max(0, 15 - row.total_score) }).map((_, i) => (
                            <span key={i} className="tick-wrong">.</span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isAdmin ? (
            <button className="btn" onClick={handlePlayAgain}>
              PLAY AGAIN 🔄
            </button>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Waiting for host to restart the game...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
