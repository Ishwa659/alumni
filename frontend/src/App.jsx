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

  const lowerUrl = (url || '').toLowerCase();
  
  if (lowerUrl.includes('chatgpt')) {
    return (
      <div className="ai-logo-container chatgpt">
        <svg viewBox="0 0 24 24" className="ai-logo-svg" fill="currentColor">
          <title>ChatGPT</title>
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/>
        </svg>
      </div>
    );
  }

  if (lowerUrl.includes('claude')) {
    return (
      <div className="ai-logo-container claude">
        <svg viewBox="0 0 16 16" className="ai-logo-svg" fill="currentColor">
          <title>Claude</title>
          <path d="m3.127 10.604 3.135-1.76.053-.153-.053-.085H6.11l-.525-.032-1.791-.048-1.554-.065-1.505-.08-.38-.081L0 7.832l.036-.234.32-.214.455.04 1.009.069 1.513.105 1.097.064 1.626.17h.259l.036-.105-.089-.065-.068-.064-1.566-1.062-1.695-1.121-.887-.646-.48-.327-.243-.306-.104-.67.435-.48.585.04.15.04.593.456 1.267.981 1.654 1.218.242.202.097-.068.012-.049-.109-.181-.9-1.626-.96-1.655-.428-.686-.113-.411a2 2 0 0 1-.068-.484l.496-.674L4.446 0l.662.089.279.242.411.94.666 1.48 1.033 2.014.302.597.162.553.06.17h.105v-.097l.085-1.134.157-1.392.154-1.792.052-.504.25-.605.497-.327.387.186.319.456-.045.294-.19 1.23-.37 1.93-.243 1.29h.142l.161-.16.654-.868 1.097-1.372.484-.545.565-.601.363-.287h.686l.505.751-.226.775-.707.895-.585.759-.839 1.13-.524.904.048.072.125-.012 1.897-.403 1.024-.186 1.223-.21.553.258.06.263-.218.536-1.307.323-1.533.307-2.284.54-.028.02.032.04 1.029.098.44.024h1.077l2.005.15.525.346.315.424-.053.323-.807.411-3.631-.863-.872-.218h-.12v.073l.726.71 1.331 1.202 1.667 1.55.084.383-.214.302-.226-.032-1.464-1.101-.565-.497-1.28-1.077h-.084v.113l.295.432 1.557 2.34.08.718-.112.234-.404.141-.444-.08-.911-1.28-.94-1.44-.759-1.291-.093.053-.448 4.821-.21.246-.484.186-.403-.307-.214-.496.214-.98.258-1.28.21-1.016.19-1.263.112-.42-.008-.028-.092.012-.953 1.307-1.448 1.957-1.146 1.227-.274.109-.477-.247.045-.44.266-.39 1.586-2.018.956-1.25.617-.723-.004-.105h-.036l-4.212 2.736-.75.096-.324-.302.04-.496.154-.162 1.267-.871z"/>
        </svg>
      </div>
    );
  }

  if (lowerUrl.includes('gemini')) {
    return (
      <div className="ai-logo-container gemini">
        <svg viewBox="0 0 24 24" className="ai-logo-svg" fill="currentColor">
          <title>Gemini</title>
          <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"/>
        </svg>
      </div>
    );
  }

  if (lowerUrl.includes('copilot')) {
    return (
      <div className="ai-logo-container copilot">
        <svg viewBox="0 0 24 24" className="ai-logo-svg" fill="currentColor">
          <title>Copilot</title>
          <path d="M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z"/>
        </svg>
      </div>
    );
  }

  if (lowerUrl.includes('grok')) {
    return (
      <div className="ai-logo-container grok">
        <svg viewBox="0 0 256 256" className="ai-logo-svg" fill="currentColor">
          <title>Grok</title>
          <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0zm0 40c48.6 0 88 39.4 88 88s-39.4 88-88 88-88-39.4-88-88 39.4-88 88-88zm0 24c-35.3 0-64 28.7-64 64s28.7 64 64 64 64-28.7 64-64-28.7-64-64-64zm80-28l-40 40h56l-16-40zm-160 0l-16 40h56l-40-40z"/>
          <circle cx="128" cy="128" r="32"/>
          <ellipse cx="128" cy="128" rx="120" ry="28" fill="none" stroke="currentColor" strokeWidth="8" transform="rotate(-30 128 128)"/>
        </svg>
      </div>
    );
  }

  // Fallback wireframe 3D neon cube for Game 2 technical questions
  if (!url || imgFailed) {
    return (
      <div className="ai-logo-container tech-3d">
        <svg viewBox="0 0 24 24" className="ai-logo-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
          <title>3D Technology</title>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96L12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
        </svg>
      </div>
    );
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
  const [screen, setScreen] = useState('lobby'); // lobby, game, game_1_results, game_2_results, final_leaderboard
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerEmoji, setPlayerEmoji] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

  // Multi-game sequence state
  const [currentGameNumber, setCurrentGameNumber] = useState(1);
  const [game1Leaderboard, setGame1Leaderboard] = useState([]);
  const [game2Leaderboard, setGame2Leaderboard] = useState([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState([]);
  const [winner, setWinner] = useState(null);

  // Results state
  const [finalResults, setFinalResults] = useState(null);

  // Error/Status Alert
  const [alertMsg, setAlertMsg] = useState(null);

  const socketRef = useRef(null);

  // Parse room query param on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setRoomCode(roomParam.toUpperCase().trim());
    }
  }, []);

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

      if (data.current_game_number) {
        setCurrentGameNumber(data.current_game_number);
      }

      if (data.game_status === 'game_1_active' || data.game_status === 'game_2_active' || data.game_status === 'in_progress') {
        setScreen('game');
      } else if (data.game_status === 'game_1_finished') {
        setScreen('game_1_results');
      } else if (data.game_status === 'game_2_finished' || data.game_status === 'completed') {
        setScreen('final_leaderboard');
      } else {
        setScreen('lobby');
      }
    });

    s.on('player_list_update', (list) => {
      setPlayersList(list);
    });

    s.on('game_1_started', (data) => {
      setCurrentGameNumber(1);
      setScreen('game');
    });

    s.on('question_loaded', (data) => {
      setQuestion(data);
      if (data.game_number) {
        setCurrentGameNumber(data.game_number);
      }
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
      setFeedback(data);
    });

    s.on('answer_reveal', (data) => {
      setFeedback({
        is_reveal: true,
        correct_option: data.correct_option,
        correct_answer_text: data.correct_answer_text,
        explanation: data.explanation || ''
      });
      setLeaderboard(data.leaderboard);
    });

    s.on('game_1_finished', (data) => {
      setGame1Leaderboard(data.game_1_leaderboard);
      setLeaderboard(data.cumulative_leaderboard);
      setWinner(data.game_1_leaderboard[0] || null);
      setScreen('game_1_results');
    });

    s.on('game_2_started', (data) => {
      setCurrentGameNumber(2);
      setQuestion(null);
      setSelectedOption(null);
      setFeedback(null);
      setAnswerSubmitted(false);
      setScreen('game');
    });

    s.on('game_2_finished', (data) => {
      setGame2Leaderboard(data.game_2_leaderboard);
      setLeaderboard(data.cumulative_leaderboard);
      setWinner(data.game_2_leaderboard[0] || null);
      setScreen('game_2_results');
    });

    s.on('all_games_finished', (data) => {
      setFinalLeaderboard(data.final_leaderboard);
      setWinner(data.winner);
      setScreen('final_leaderboard');
    });

    s.on('game_finished', (data) => {
      setFinalResults(data);
      setScreen('final_leaderboard');
    });

    s.on('game_reset', () => {
      setQuestion(null);
      setFeedback(null);
      setSelectedOption(null);
      setAnswerSubmitted(false);
      setFinalResults(null);
      setCurrentGameNumber(1);
      setGame1Leaderboard([]);
      setGame2Leaderboard([]);
      setFinalLeaderboard([]);
      setWinner(null);
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
        player_name: playerEmoji ? `${playerEmoji} ${playerName.trim()}` : playerName.trim(),
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

  const handleStartGame2 = () => {
    if (socket && isAdmin) {
      socket.emit('start_game_2', {
        room_code: roomCode,
        player_id: playerId
      });
    }
  };

  const exportToCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Rank,Player Name,Game 1 Score,Game 2 Score,Cumulative Score\n";
    finalLeaderboard.forEach((p) => {
      csvContent += `${p.rank},"${p.name}",${p.game_1},${p.game_2},${p.total}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tournament_results_${roomCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
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
                <div className="form-group">
                  <label className="form-label">Choose Your Emoji</label>
                  <div className="emoji-selector">
                    <button 
                      type="button"
                      className="emoji-trigger"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      {playerEmoji || '😀'} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{playerEmoji ? 'Change' : 'Pick emoji'}</span>
                    </button>
                    {showEmojiPicker && (
                      <div className="emoji-grid">
                        {['😀','😎','🤖','🧠','🚀','⚡','🔥','💎','🎯','🏆','👾','🦊','🐱','🦁','🐼','🦄','🌟','💜','🎮','🎲','👑','🦅','🐲','🌈','🍀','⭐','💡','🎭','🦋','🌺'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            className={`emoji-option ${playerEmoji === emoji ? 'selected' : ''}`}
                            onClick={() => {
                              setPlayerEmoji(emoji);
                              setShowEmojiPicker(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("https://ai-trivia-arena.onrender.com/?room=" + roomCode)}`} 
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
                      disabled={playersList.filter(p => !p.is_admin).length < 1}
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
                Game {currentGameNumber}/2: {currentGameNumber === 1 ? "AI Chatbot Trivia" : "Image-to-3D Conversion Technology"} | Question {question.question_number} / 10
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
            {isAdmin ? (
              <div className="host-quiz-dashboard" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-light)', borderRadius: '20px' }}>
                <h3 style={{ color: 'var(--accent-gold)', marginBottom: '1.25rem', textAlign: 'center', fontFamily: 'var(--font-family-display)', textTransform: 'uppercase', fontSize: '1.1rem', letterSpacing: '0.1em' }}>
                  👑 Host View - Question Preview
                </h3>
                <div 
                  className="options-grid"
                  style={{
                    gridTemplateColumns: [1, 2, 3, 4].filter(idx => question[`option_${idx}`]).length > 2 ? '1fr 1fr' : '1fr'
                  }}
                >
                  {[1, 2, 3, 4].filter(optIndex => question[`option_${optIndex}`]).map((optIndex) => {
                    const optText = question[`option_${optIndex}`];
                    const isCorrectOpt = optIndex === question.correct_option;
                    const badgeMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };
                    return (
                      <div
                        key={optIndex}
                        className={`option-btn ${isCorrectOpt ? 'correct' : ''}`}
                        style={{ cursor: 'default', opacity: isCorrectOpt ? 1 : 0.6 }}
                      >
                        <span>{optText}</span>
                        {isCorrectOpt ? (
                          <span className="status-badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', borderColor: 'transparent', fontSize: '0.75rem' }}>
                            CORRECT ANSWER ✓
                          </span>
                        ) : (
                          <span className="option-badge">
                            {badgeMap[optIndex]}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.95rem' }}>
                  💡 Players are currently submitting answers. Waiting for timer...
                </div>
              </div>
            ) : (
              <>
                <div 
                  className="options-grid"
                  style={{
                    gridTemplateColumns: [1, 2, 3, 4].filter(idx => question[`option_${idx}`]).length > 2 ? '1fr 1fr' : '1fr'
                  }}
                >
                  {[1, 2, 3, 4].filter(optIndex => question[`option_${optIndex}`]).map((optIndex) => {
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

                    const badgeMap = { 1: 'A', 2: 'B', 3: 'C', 4: 'D' };

                    return (
                      <button
                        key={optIndex}
                        className={btnClass}
                        onClick={() => handleSelectOption(optIndex)}
                        disabled={answerSubmitted || timer <= 0 || (feedback && feedback.is_reveal)}
                      >
                        <span>{optText}</span>
                        <span className="option-badge">
                          {badgeMap[optIndex]}
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
              </>
            )}
          </div>

          {/* Sidebar Leaderboard */}
          <div className="sidebar-leaderboard">
            <div className="leaderboard-title">
              <span>Leaderboard</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>Live Updates</span>
            </div>
            <div 
              className="leaderboard-table-header"
              style={{
                gridTemplateColumns: currentGameNumber === 1 ? '35px 1fr 45px 50px' : '35px 1fr 40px 40px 50px'
              }}
            >
              <span className="hdr-rank">Pos</span>
              <span className="hdr-name" style={{ textAlign: 'left' }}>Player</span>
              {currentGameNumber === 1 ? (
                <>
                  <span className="hdr-score">G1</span>
                  <span className="hdr-score">Total</span>
                </>
              ) : (
                <>
                  <span className="hdr-score">G1</span>
                  <span className="hdr-score">G2</span>
                  <span className="hdr-score">Total</span>
                </>
              )}
            </div>
            <div className="leaderboard-rows">
              {leaderboard.map((player, idx) => (
                <div 
                  key={idx} 
                  className={`leaderboard-row-grid ${player.player_name === playerName ? 'current-player' : ''}`}
                  style={{
                    gridTemplateColumns: currentGameNumber === 1 ? '35px 1fr 45px 50px' : '35px 1fr 40px 40px 50px'
                  }}
                >
                  <span className="leaderboard-rank">#{player.rank}</span>
                  <span className="leaderboard-name" style={{ textAlign: 'left' }} title={player.player_name}>
                    {player.player_name}
                  </span>
                  {currentGameNumber === 1 ? (
                    <>
                      <span className="leaderboard-score">{player.game_1_score || 0}</span>
                      <span className="leaderboard-score highlight">{player.cumulative_score || player.total_score || 0}</span>
                    </>
                  ) : (
                    <>
                      <span className="leaderboard-score">{player.game_1_score || 0}</span>
                      <span className="leaderboard-score">{player.game_2_score || 0}</span>
                      <span className="leaderboard-score highlight">{player.cumulative_score || player.total_score || 0}</span>
                    </>
                  )}
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

      {/* Screen 3: Game 1 Results */}
      {screen === 'game_1_results' && (
        <div className="results-card">
          <div className="winner-banner">
            <span className="winner-crown">🏆</span>
            <h1 className="winner-title">
              {winner ? `${winner.player_name} wins Game 1!` : 'Game 1 Complete!'}
            </h1>
            <p className="winner-score">
              {winner ? `Score: ${winner.game_1_score} / 10 points` : ''}
            </p>
          </div>

          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            Game 1 Leaderboard
          </h2>
          <div className="results-table-container" style={{ marginBottom: '2.5rem' }}>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Game 1 Score</th>
                </tr>
              </thead>
              <tbody>
                {game1Leaderboard.map((row, idx) => (
                  <tr key={idx} className={row.rank === 1 ? 'highlight-winner' : ''}>
                    <td style={{ fontWeight: 700 }}>#{row.rank}</td>
                    <td>{row.player_name} {row.rank === 1 && '👑'}</td>
                    <td style={{ fontWeight: 600 }}>{row.game_1_score} / 10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            Cumulative Leaderboard (Round 1)
          </h2>
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Game 1</th>
                  <th>Game 2</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, idx) => (
                  <tr key={idx} className={row.rank === 1 ? 'highlight-winner' : ''}>
                    <td style={{ fontWeight: 700 }}>#{row.rank}</td>
                    <td>{row.player_name} {row.rank === 1 && '👑'}</td>
                    <td>{row.game_1_score}</td>
                    <td style={{ color: 'var(--text-muted)' }}>-</td>
                    <td style={{ fontWeight: 600, color: 'hsl(220, 95%, 75%)' }}>{row.cumulative_score || row.total_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            {isAdmin ? (
              <div className="admin-panel" style={{ width: '100%' }}>
                <p style={{ fontSize: '1rem', color: 'var(--accent-gold)', marginBottom: '1.25rem', fontWeight: 600 }}>
                  ✓ Game 1 Complete! Click below to start Game 2.
                </p>
                <button 
                  className="btn" 
                  onClick={handleStartGame2}
                  style={{ boxShadow: '0 0 15px var(--accent-gold-glow)' }}
                >
                  START GAME 2 (Image-to-3D Conversion Technology) 🚀
                </button>
              </div>
            ) : (
              <div className="feedback-alert timeout" style={{ display: 'inline-flex', padding: '0.8rem 2rem' }}>
                <span>✓ Game 1 Complete! Waiting for admin to start Game 2...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Screen 4: Game 2 Results */}
      {screen === 'game_2_results' && (
        <div className="results-card">
          <div className="winner-banner" style={{ background: 'hsla(263, 90%, 62%, 0.08)', borderColor: 'hsl(263, 90%, 62%)', boxShadow: '0 0 20px rgba(99,102,241,0.2)' }}>
            <span className="winner-crown">🏆</span>
            <h1 className="winner-title" style={{ color: 'hsl(220, 95%, 75%)', textShadow: '0 0 10px rgba(99,102,241,0.4)' }}>
              {winner ? `${winner.player_name} wins Game 2!` : 'Game 2 Complete!'}
            </h1>
            <p className="winner-score">
              {winner ? `Score: ${winner.game_2_score} / 10 points` : ''}
            </p>
          </div>

          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            Game 2 Leaderboard (Image-to-3D Tech)
          </h2>
          <div className="results-table-container" style={{ marginBottom: '2.5rem' }}>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Game 2 Score</th>
                </tr>
              </thead>
              <tbody>
                {game2Leaderboard.map((row, idx) => (
                  <tr key={idx} className={row.rank === 1 ? 'highlight-winner' : ''}>
                    <td style={{ fontWeight: 700 }}>#{row.rank}</td>
                    <td>{row.player_name} {row.rank === 1 && '👑'}</td>
                    <td style={{ fontWeight: 600 }}>{row.game_2_score} / 10</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            Final Cumulative Leaderboard
          </h2>
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Game 1</th>
                  <th>Game 2</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const maxTotal = Math.max(...leaderboard.map(p => p.cumulative_score || p.total_score || 0), 0);
                  const isTie = leaderboard.filter(p => (p.cumulative_score || p.total_score || 0) === maxTotal).length > 1;
                  return leaderboard.map((row, idx) => {
                    const rowScore = row.cumulative_score || row.total_score || 0;
                    const isChamp = rowScore === maxTotal && maxTotal > 0;
                    return (
                      <tr key={idx} className={isChamp ? 'highlight-winner' : ''}>
                        <td style={{ fontWeight: 700 }}>#{row.rank}</td>
                        <td>{row.player_name} {isChamp && '👑'}</td>
                        <td>{row.game_1_score}</td>
                        <td>{row.game_2_score}</td>
                        <td style={{ fontWeight: 700, color: 'hsl(220, 95%, 75%)' }}>{rowScore}</td>
                        <td>
                          {isChamp && (
                            <span className="status-badge">
                              {isTie ? '🏆 CHAMPION (tie)' : '🏆 CHAMPION'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '2.5rem' }}>
            <button className="btn" onClick={() => setScreen('final_leaderboard')}>
              VIEW FINAL TOURNAMENT STANDINGS 🏆
            </button>
          </div>
        </div>
      )}

      {/* Screen 5: Final Tournament Leaderboard */}
      {screen === 'final_leaderboard' && (
        <div className="results-card" style={{ maxWidth: '850px' }}>
          <h1 className="lobby-title" style={{ fontSize: '2.5rem', background: 'linear-gradient(135deg, var(--accent-gold) 0%, #fff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '0.5rem' }}>
            🏆🏆🏆 TOURNAMENT CHAMPION 🏆🏆🏆
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Final Standings after all rounds completed
          </p>

          {/* Visual Podium */}
          {(() => {
            const goldPlayer = finalLeaderboard[0] || null;
            const silverPlayer = finalLeaderboard[1] || null;
            const bronzePlayer = finalLeaderboard[2] || null;
            return (
              <div className="podium-container">
                {silverPlayer && (
                  <div className="podium-step second">
                    <span className="podium-badge">🥈</span>
                    <span className="podium-name" title={silverPlayer.name}>{silverPlayer.name}</span>
                    <span className="podium-points">{silverPlayer.total} pts</span>
                  </div>
                )}
                {goldPlayer && (
                  <div className="podium-step first">
                    <span className="podium-badge">🥇</span>
                    <span className="podium-name" title={goldPlayer.name}>{goldPlayer.name}</span>
                    <span className="podium-points">{goldPlayer.total} pts</span>
                  </div>
                )}
                {bronzePlayer && (
                  <div className="podium-step third">
                    <span className="podium-badge">🥉</span>
                    <span className="podium-name" title={bronzePlayer.name}>{bronzePlayer.name}</span>
                    <span className="podium-points">{bronzePlayer.total} pts</span>
                  </div>
                )}
              </div>
            );
          })()}

          <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>
            Complete Final Rankings
          </h2>
          <div className="results-table-container" style={{ maxHeight: '400px' }}>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Player</th>
                  <th>AI Chat (G1)</th>
                  <th>3D Tech (G2)</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {finalLeaderboard.map((row, idx) => (
                  <tr key={idx} className={row.rank === 1 ? 'highlight-winner' : ''}>
                    <td style={{ fontWeight: 700 }}>#{row.rank}</td>
                    <td>{row.name} {row.rank === 1 && '👑'}</td>
                    <td>{row.game_1}</td>
                    <td>{row.game_2}</td>
                    <td style={{ fontWeight: 700, color: 'hsl(220, 95%, 75%)' }}>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="actions-row">
            {isAdmin ? (
              <button className="btn" onClick={handlePlayAgain} style={{ padding: '0.8rem 2.5rem' }}>
                PLAY AGAIN 🔄
              </button>
            ) : (
              <div className="feedback-alert timeout" style={{ padding: '0.8rem 2rem', fontStyle: 'italic' }}>
                Waiting for host to restart the game...
              </div>
            )}
            <button className="btn btn-secondary" onClick={exportToCSV}>
              <span>📥</span> EXPORT LEADERBOARD
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
