import React from 'react';
import { GameProvider, useGame } from './context/GameContext';
import QRCodeDisplay from './components/QRCodeDisplay';
import AnimatedPoster from './components/AnimatedPoster';
import CountdownTimer from './components/CountdownTimer';
import SilentGameRoom from './components/SilentGameRoom';
import SpinWheel from './components/SpinWheel';
import FinalResultsPage from './components/FinalResultsPage';

function TournamentContent() {
  const {
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
  } = useGame();

  // Helper method: select which visual screen to render based on backend state machine
  const renderScreen = () => {
    switch (true) {
      case currentState === 'lobby':
        return (
          <AnimatedPoster 
            onJoin={joinGame} 
            players={lobbyPlayers} 
            currentState={currentState}
            onStartGame={startGame}
            isHost={isHost}
            playerId={playerId}
            playerName={playerName}
          />
        );
        
      case currentState === 'countdown':
        return <CountdownTimer seconds={countdownSeconds} />;
        
      case currentState.startsWith('round_'):
        return (
          <SilentGameRoom
            roundTitle={roundTitle}
            currentRound={currentRound}
            currentQuestionNumber={currentQuestionNumber}
            totalQuestions={totalQuestions}
            currentQuestion={currentQuestion}
            secondsRemaining={secondsRemaining}
            hasSubmitted={hasSubmitted}
            statusMessage={statusMessage}
            onSubmitAnswer={submitAnswer}
            isHost={isHost}
          />
        );
        
      case currentState.startsWith('spin_'):
        return (
          <SpinWheel
            roundNumber={spinData?.round_number || 2}
            selectedTopic={spinData?.selected_topic || ''}
            selectedIndex={spinData?.selected_index || 0}
            spinDuration={spinData?.spin_duration || 4}
            remainingTopics={spinData?.remaining_topics || []}
            spinStarted={spinData?.spinStarted || false}
            isHost={isHost}
            onTriggerSpin={triggerSpin}
            onSpinComplete={null}
          />
        );
        
      case currentState === 'results':
        return (
          <FinalResultsPage
            finalResults={finalResults}
            roomCode={roomCode}
            onExit={exitTournament}
          />
        );
        
      default:
        return (
          <div className="container">
            <div className="glass-panel" style={{ textAlign: 'center' }}>
              <h2>Connecting...</h2>
              <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>
                Establishing connection with the tournament server.
              </p>
            </div>
          </div>
        );
    }
  };

  // Determine QR size: large on lobby/entry, small everywhere else
  const qrSize = currentState === 'lobby' ? 'large' : 'small';

  return (
    <>
      {/* Persistent QR Code on ALL screens */}
      {roomCode && (
        <QRCodeDisplay roomCode={roomCode} size={qrSize} />
      )}
      
      {/* Dynamic Screen Container */}
      <main style={{ width: '100%', minHeight: '100vh', display: 'flex', flex: 1 }}>
        {renderScreen()}
      </main>
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <TournamentContent />
    </GameProvider>
  );
}
