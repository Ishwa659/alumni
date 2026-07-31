import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const GameContext = createContext();

export const useGame = () => useContext(GameContext);

export const GameProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('trivia_player_id') || null);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('trivia_player_name') || '');
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('trivia_room_code') || 'TOURNAMENT');
  
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
  
  // Final Results state
  const [finalResults, setFinalResults] = useState(null);

  // Initialize socket connection on component mount
  useEffect(() => {
    // Dynamically resolve server URL based on window environment
    const serverUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : `${window.location.protocol}//${window.location.hostname}:5000`;

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
      
      // Auto-trigger rejoin if playerId exists in URL or localStorage
      const params = new URLSearchParams(window.location.search);
      const urlPlayerId = params.get('player') || playerId;
      const urlRoomCode = params.get('room') || roomCode;

      if (urlPlayerId && urlRoomCode) {
        socket.emit('request_rejoin', { roomCode: urlRoomCode, playerId: urlPlayerId });
      }
    });

    socket.on('player_registered', (data) => {
      const { playerId: newPid, roomCode: newRcode } = data;
      setPlayerId(newPid);
      setRoomCode(newRcode);
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

    socket.on('spin_wheel', (data) => {
      setCurrentState(`spin_${data.round_number - 1}`);
      setSpinData(data);
    });

    socket.on('all_rounds_complete', (data) => {
      setStatusMessage(data.message);
    });

    socket.on('final_results', (data) => {
      setCurrentState('results');
      setFinalResults(data);
    });

    socket.on('player_rejoined', (data) => {
      const { currentState: serverState, currentRound: serverRound, currentQuestion: serverQuestion, topicName } = data;
      setCurrentState(serverState);
      setCurrentRound(serverRound);
      setCurrentQuestionNumber(serverQuestion);
      setRoundTitle(`ROUND ${serverRound}/5: ${topicName.toUpperCase()}`);
    });

    socket.on('rejoin_failed', (data) => {
      console.warn('Rejoin failed:', data.message);
      // Clean stale local storage on failure
      localStorage.removeItem('trivia_player_id');
      setPlayerId(null);
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
      socket.off('spin_wheel');
      socket.off('all_rounds_complete');
      socket.off('final_results');
      socket.off('player_rejoined');
      socket.off('rejoin_failed');
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
    const serverUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : `${window.location.protocol}//${window.location.hostname}:5000`;
    
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

  const exitTournament = () => {
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
        joinGame,
        submitAnswer,
        startGame,
        exitTournament
      }}
    >
      {children}
    </GameContext.Provider>
  );
};
