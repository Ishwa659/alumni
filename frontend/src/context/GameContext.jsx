import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// Dynamic server URL resolver for Local, LAN IP, and Cloud Deployments
export function getServerUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname) && window.location.port === '5173') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  // Production Cloud Deployment (Render, Railway, Heroku, custom domain): serve from origin
  return window.location.origin;
}

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('trivia_player_id') || null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('trivia_player_name') || '');
  const [roomCode, setRoomCode] = useState(() => {
    const stored = localStorage.getItem('trivia_room_code');
    if (stored && stored.length <= 20) return stored;
    localStorage.removeItem('trivia_room_code');
    return 'TOURNAMENT';
  });
  
  // Game states mapped from server
  const [currentState, setCurrentState] = useState('lobby'); // lobby, countdown, round_X, spin_X, results
  const [lobbyPlayers, setLobbyPlayers] = useState([]);
  const [countdownSeconds, setCountdownSeconds] = useState(5);
  
  // Round state
  const [currentRound, setCurrentRound] = useState(0);
  const [roundTitle, setRoundTitle] = useState('');
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(5);
  
  // Question state
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(15);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Spin Wheel state
  const [spinData, setSpinData] = useState(null);
  
  // Host state
  const [isHost, setIsHost] = useState(false);
  
  // Final Results state
  const [finalResults, setFinalResults] = useState(null);

  // Initialize socket connection on component mount
  useEffect(() => {
    const serverUrl = getServerUrl();

    const newSocket = io(serverUrl, {
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Listen to server events
  useEffect(() => {
    if (!socket) return;

    socket.on('connect', () => {
      console.log('Socket connected to backend server.');
      
      const params = new URLSearchParams(window.location.search);
      const urlPlayerId = params.get('player');
      const urlRoomCode = params.get('room') || roomCode;

      // Only attempt rejoin if player opened an explicit rejoin link with ?player=...
      if (urlPlayerId) {
        socket.emit('request_rejoin', { roomCode: urlRoomCode, playerId: urlPlayerId });
      } else {
        // Direct site visit: start fresh from the beginning
        localStorage.removeItem('trivia_player_id');
        localStorage.removeItem('trivia_player_name');
        setPlayerId(null);
        setPlayerName('');
        setCurrentState('lobby');
      }
    });

    socket.on('player_registered', (data) => {
      const { playerId: newPid, roomCode: newRcode, isHost: hostFlag } = data;
      setPlayerId(newPid);
      setRoomCode(newRcode);
      setIsHost(!!hostFlag);
      localStorage.setItem('trivia_player_id', newPid);
      localStorage.setItem('trivia_room_code', newRcode);
    });

    socket.on('lobby_update', (data) => {
      setLobbyPlayers(data.players);
      if (data.currentState) {
        setCurrentState(data.currentState);
      }
    });

    socket.on('countdown_start', (data) => {
      setCurrentState('countdown');
      setCountdownSeconds(data.seconds);
    });

    socket.on('round_started', (data) => {
      const { round_number, round_title, total_questions } = data;
      setCurrentRound(round_number);
      setRoundTitle(round_title);
      setTotalQuestions(total_questions);
      setCurrentQuestionNumber(0);
      setCurrentQuestion(null);
      setHasSubmitted(false);
      setCurrentState(`round_${round_number}`);
    });

    socket.on('question_loaded', (data) => {
      const { round_number, question_number, question_text, option_1, option_2, option_3, option_4, timer_seconds, has_submitted } = data;
      
      setCurrentState(`round_${round_number}`);
      setCurrentRound(round_number);
      setCurrentQuestionNumber(question_number);
      
      setCurrentQuestion({
        question_text,
        options: [option_1, option_2, option_3, option_4]
      });
      
      setSecondsRemaining(timer_seconds);
      setHasSubmitted(!!has_submitted);
      setStatusMessage(has_submitted ? 'Submitted' : '');
    });

    socket.on('timer_tick', (data) => {
      setSecondsRemaining(data.seconds_remaining);
    });

    socket.on('answer_submitted', (data) => {
      setHasSubmitted(true);
      setStatusMessage('Submitted');
    });

    socket.on('round_complete', (data) => {
      setStatusMessage(data.message);
    });

    socket.on('spin_wheel_ready', (data) => {
      setCurrentState(`spin_${data.round_number - 1}`);
      setSpinData({
        round_number: data.round_number,
        remaining_topics: data.remaining_topics,
        spinStarted: false
      });
    });

    socket.on('spin_wheel', (data) => {
      setCurrentState(`spin_${data.round_number - 1}`);
      setSpinData({
        ...data,
        spinStarted: true
      });
    });

    socket.on('all_rounds_complete', (data) => {
      setStatusMessage(data.message);
    });

    socket.on('final_results', (data) => {
      setCurrentState('results');
      setFinalResults(data);
    });

    socket.on('player_rejoined', (data) => {
      const { currentState: serverState, currentRound: serverRound, currentQuestion: serverQuestion, topicName, isHost: hostFlag } = data;
      setCurrentState(serverState);
      setCurrentRound(serverRound);
      setCurrentQuestionNumber(serverQuestion);
      setRoundTitle(`ROUND ${serverRound}/5: ${topicName.toUpperCase()}`);
      if (hostFlag !== undefined) {
        setIsHost(!!hostFlag);
      }
    });

    socket.on('rejoin_failed', (data) => {
      console.warn('Rejoin failed:', data.message);
      // Clean ALL stale local storage and reset to lobby
      localStorage.removeItem('trivia_player_id');
      localStorage.removeItem('trivia_player_name');
      localStorage.removeItem('trivia_room_code');
      setPlayerId(null);
      setIsHost(false);
      setCurrentState('lobby');
      setFinalResults(null);
      setLobbyPlayers([]);
    });

    socket.on('game_reset', (data) => {
      console.log('Game reset:', data.message);
      localStorage.removeItem('trivia_player_id');
      localStorage.removeItem('trivia_player_name');
      localStorage.removeItem('trivia_room_code');
      setPlayerId(null);
      setIsHost(false);
      setCurrentState('lobby');
      setFinalResults(null);
      setLobbyPlayers([]);
      setSpinData(null);
    });

    socket.on('error_message', (data) => {
      alert(data.message);
    });

    return () => {
      socket.off('connect');
      socket.off('player_registered');
      socket.off('lobby_update');
      socket.off('countdown_start');
      socket.off('round_started');
      socket.off('question_loaded');
      socket.off('timer_tick');
      socket.off('answer_submitted');
      socket.off('round_complete');
      socket.off('spin_wheel_ready');
      socket.off('spin_wheel');
      socket.off('all_rounds_complete');
      socket.off('final_results');
      socket.off('player_rejoined');
      socket.off('rejoin_failed');
      socket.off('game_reset');
      socket.off('error_message');
    };
  }, [socket, playerId, roomCode]);

  // Emitters
  const joinGame = (name, code = 'TOURNAMENT') => {
    setPlayerName(name);
    setRoomCode(code);
    localStorage.setItem('trivia_player_name', name);
    localStorage.setItem('trivia_room_code', code);
    
    if (socket) {
      socket.emit('join_game', {
        roomCode: code,
        playerName: name,
        playerId: playerId // will be null for new players
      });
    }
  };

  const submitAnswer = (optionIndex) => {
    if (hasSubmitted || !socket) return;
    
    // selected_option is 1-indexed on server (1-4)
    socket.emit('submit_answer', {
      roomCode,
      playerId,
      round_number: currentRound,
      question_number: currentQuestionNumber,
      selected_option: optionIndex + 1
    });
  };

  const startGame = async () => {
    const serverUrl = getServerUrl();
    
    try {
      const res = await fetch(`${serverUrl}/api/admin/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to start game.');
      }
    } catch (err) {
      alert('Could not reach the server.');
    }
  };

  const triggerSpin = () => {
    if (socket && isHost) {
      socket.emit('host_spin_wheel', { roomCode, playerId });
    }
  };

  const exitTournament = () => {
    if (socket && roomCode && playerId) {
      socket.emit('leave_game', { roomCode, playerId });
    }
    localStorage.removeItem('trivia_player_id');
    localStorage.removeItem('trivia_player_name');
    localStorage.removeItem('trivia_room_code');
    setPlayerId(null);
    setPlayerName('');
    setRoomCode('TOURNAMENT');
    setCurrentState('lobby');
    setFinalResults(null);
    window.location.href = window.location.origin + window.location.pathname;
  };

  return (
    <GameContext.Provider
      value={{
        currentState,
        lobbyPlayers,
        countdownSeconds,
        currentRound,
        roundTitle,
        currentQuestionNumber,
        totalQuestions,
        currentQuestion,
        secondsRemaining,
        hasSubmitted,
        statusMessage,
        spinData,
        finalResults,
        playerId,
        playerName,
        roomCode,
        isHost,
        joinGame,
        submitAnswer,
        startGame,
        triggerSpin,
        exitTournament
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
