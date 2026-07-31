import React, { useState, useEffect } from 'react';
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
  onSubmitAnswer
}) {
  const [clickedIndex, setClickedIndex] = useState(null);

  // Reset local selection when question loads
  useEffect(() => {
    setClickedIndex(null);
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
    if (hasSubmitted || secondsRemaining <= 0) return;
    setClickedIndex(idx);
    onSubmitAnswer(idx);
  };

  const optionLetters = ['A', 'B', 'C', 'D'];
  const timerPercentage = (secondsRemaining / 15) * 100;

  return (
    <div className="container">
      <div className="glass-panel">
        {/* Header */}
        <div className="game-room-header">
          <div className="round-info">
            <span className="round-title-label">Round {currentRound}/5</span>
            <span className="round-name-value glow-text">{roundTitle.replace(/ROUND\s+\d\/\d:\s+/gi, '')}</span>
          </div>
          <div className="timer-box">
            <span className="timer-icon-spinning">⏱️</span>
            <span>{secondsRemaining}s</span>
          </div>
        </div>

        {/* Visual Timer Bar */}
        <div className="timer-bar-container">
          <div 
            className="timer-bar-fill"
            style={{ width: `${timerPercentage}%` }}
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
            } else if (isAnySelected) {
              buttonClass += ' submitted-disabled';
            }

            return (
              <button
                key={idx}
                className={buttonClass}
                onClick={() => handleOptionClick(idx)}
                disabled={isAnySelected || secondsRemaining <= 0}
              >
                <span className="option-letter">{optionLetters[idx]}</span>
                <span className="option-text">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Silent Submission Acknowledgement */}
        {hasSubmitted && (
          <motion.div 
            className="status-submitted-label"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>✓</span> Answer Logged. Next question will load when the round timer expires.
          </motion.div>
        )}

        {/* Timer Expired Banner */}
        {secondsRemaining <= 0 && !hasSubmitted && (
          <div className="status-submitted-label" style={{ color: 'var(--accent-pink)' }}>
            ⚠️ Time is up! Question locked.
          </div>
        )}
      </div>
    </div>
  );
}
