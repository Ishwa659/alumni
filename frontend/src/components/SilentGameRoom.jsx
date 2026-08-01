import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function SilentGameRoom({
  roundTitle,
  currentRound,
  currentQuestionNumber,
  totalQuestions,
  currentQuestion,
  secondsRemaining,
  hasSubmitted,
  statusMessage,
  onSubmitAnswer,
  isHost = false
}) {
  const [clickedIndex, setClickedIndex] = useState(null);
  const audioCtxRef = useRef(null);
  const lastBeepSecondRef = useRef(null);

  // Play warning beep synthesizer
  const playWarningBeep = (freq = 850) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Audio play warning:', e.message);
    }
  };

  // Trigger beep sound on last 3 seconds (3s, 2s, 1s)
  useEffect(() => {
    if (secondsRemaining <= 3 && secondsRemaining > 0) {
      if (lastBeepSecondRef.current !== secondsRemaining) {
        lastBeepSecondRef.current = secondsRemaining;
        const pitch = secondsRemaining === 1 ? 1040 : 850;
        playWarningBeep(pitch);
      }
    }
  }, [secondsRemaining]);

  // Reset local selection when question loads
  useEffect(() => {
    setClickedIndex(null);
    lastBeepSecondRef.current = null;
  }, [currentQuestionNumber, currentRound]);

  if (!currentQuestion) {
    return (
      <div className="container">
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h2 className="glow-text">{roundTitle}</h2>
          <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>
            Loading questions, please wait...
          </p>
        </div>
      </div>
    );
  }

  const handleOptionClick = (idx) => {
    if (isHost || hasSubmitted || secondsRemaining <= 0) return;
    setClickedIndex(idx);
    onSubmitAnswer(idx);
  };

  const optionLetters = ['A', 'B', 'C', 'D'];
  const timerPercentage = (secondsRemaining / 15) * 100;
  const isWarningTime = secondsRemaining <= 3 && secondsRemaining > 0;

  return (
    <div className="container">
      <div className="glass-panel">
        {/* Host Mode Indicator Header */}
        {isHost && (
          <div style={{
            background: 'rgba(124, 58, 237, 0.1)',
            border: '1px solid var(--primary-purple)',
            borderRadius: '10px',
            padding: '8px 16px',
            marginBottom: '16px',
            textAlign: 'center',
            fontSize: '13px',
            fontWeight: '700',
            color: 'var(--primary-purple)',
            letterSpacing: '0.5px'
          }}>
            📺 HOST DISPLAY MODE — View Only (Participants answer on their devices)
          </div>
        )}

        {/* Header */}
        <div className="game-room-header">
          <div className="round-info">
            <span className="round-title-label">Round {currentRound}/5</span>
            <span className="round-name-value glow-text">{roundTitle.replace(/ROUND\s+\d\/\d:\s+/gi, '')}</span>
          </div>
          <div className="timer-box" style={isWarningTime ? { color: 'var(--accent-pink)', borderColor: 'var(--accent-pink)' } : {}}>
            <span className={`timer-icon-spinning ${isWarningTime ? 'pulse-fast' : ''}`}>⏱️</span>
            <span>{secondsRemaining}s</span>
          </div>
        </div>

        {/* Visual Timer Bar */}
        <div className="timer-bar-container">
          <div 
            className="timer-bar-fill"
            style={{ 
              width: `${timerPercentage}%`,
              background: isWarningTime ? 'var(--accent-pink)' : undefined 
            }}
          ></div>
        </div>

        {/* Question Counter */}
        <div className="question-counter">
          QUESTION {currentQuestionNumber} OF {totalQuestions}
        </div>

        {/* Question Text */}
        <div className="question-text-box">
          {currentQuestion.question_text}
        </div>

        {/* Options Grid */}
        <div className="options-grid">
          {currentQuestion.options.map((opt, idx) => {
            const isSelected = clickedIndex === idx;
            const isAnySelected = hasSubmitted || clickedIndex !== null;

            let buttonClass = 'option-button';
            if (isSelected) {
              buttonClass += ' submitted-active';
            } else if (isAnySelected || isHost) {
              buttonClass += ' submitted-disabled';
            }

            return (
              <button
                key={idx}
                className={buttonClass}
                onClick={() => handleOptionClick(idx)}
                disabled={isHost || isAnySelected || secondsRemaining <= 0}
                style={isHost ? { cursor: 'default', opacity: 0.85 } : {}}
              >
                <span className="option-letter">{optionLetters[idx]}</span>
                <span className="option-text">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Host info banner */}
        {isHost && (
          <div className="status-submitted-label" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            <span>👀</span> Host View: Monitoring player submissions for Question {currentQuestionNumber}
          </div>
        )}

        {/* Silent Submission Acknowledgement for Contestants */}
        {!isHost && hasSubmitted && (
          <motion.div 
            className="status-submitted-label"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>✓</span> Answer Logged. Next question will load when the round timer expires.
          </motion.div>
        )}

        {/* Timer Expired Banner for Contestants */}
        {!isHost && secondsRemaining <= 0 && !hasSubmitted && (
          <div className="status-submitted-label" style={{ color: 'var(--accent-pink)' }}>
            ⚠️ Time is up! Question locked.
          </div>
        )}
      </div>
    </div>
  );
}
