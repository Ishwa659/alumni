import React, { useState } from 'react';
import { motion } from 'framer-motion';
import QRCodeDisplay from './QRCodeDisplay';

export default function AnimatedPoster({ onJoin, players, currentState, onStartGame, onViewLastResults, isHost, playerId, playerName, roomCode }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('TOURNAMENT');
  const [batchYear, setBatchYear] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim() && batchYear) {
      onJoin(name, room, batchYear);
    }
  };

  const hasJoined = !!playerId;

  // Generate batch year options (from 2013 to current year)
  const currentYear = new Date().getFullYear();
  const batchYears = [];
  for (let y = currentYear; y >= 2013; y--) {
    batchYears.push(y);
  }

  return (
    <div className="container">
      <div className="lobby-container">
        <motion.div 
          className="glass-panel lobby-main-card"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="banner-poster">
            <div className="logo-container">
              <div className="logo-ring-outer"></div>
              <div className="logo-ring-inner">🤖</div>
            </div>
            <h1 className="lobby-title">AI Tech War</h1>
            <p className="lobby-subtitle">
              5 Rounds of Technical AI Questions. 
              Round 1 is fixed, followed by 4 dynamically spun topics. 
              Silent gameplay: no score displays or reveals until the final standings are compiled.
            </p>
          </div>

          {/* View Last Results Button */}
          {onViewLastResults && (
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <button 
                onClick={onViewLastResults}
                className="btn-secondary"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fbbf24',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                🏆 View Last Game Results
              </button>
            </div>
          )}

          {/* Player join form — ONLY shown if player is NOT in the game yet */}
          {!hasJoined ? (
            <form onSubmit={handleSubmit} className="join-form">
              <div className="input-group">
                <label className="input-label" htmlFor="player-name-input">Your Name</label>
                <input 
                  id="player-name-input"
                  type="text" 
                  className="text-input" 
                  placeholder="Enter name (e.g. Alice)" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={20}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="batch-year-input">Batch Year</label>
                <select
                  id="batch-year-input"
                  className="text-input"
                  value={batchYear}
                  onChange={(e) => setBatchYear(e.target.value)}
                  required
                  style={{ cursor: 'pointer' }}
                >
                  <option value="" disabled>Select your batch year</option>
                  {batchYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="room-code-input">Room Code</label>
                <input 
                  id="room-code-input"
                  type="text" 
                  className="text-input" 
                  placeholder="TOURNAMENT" 
                  value={room}
                  readOnly
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
              </div>

              <button type="submit" className="btn-primary">
                Join Tournament
              </button>
            </form>
          ) : (
            /* Confirmation Badge when Player has ALREADY joined */
            <div className="joined-confirmation-badge" style={{
              background: 'rgba(5, 150, 105, 0.08)',
              border: '1px solid var(--state-success)',
              borderRadius: '16px',
              padding: '16px 20px',
              margin: '16px 0',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              color: 'var(--state-success)',
              fontWeight: '700',
              fontSize: '15px'
            }}>
              <span className="dot-pulse"></span>
              <span>✅ Joined as <strong>{playerName || 'Participant'}</strong></span>
            </div>
          )}

          {/* Host Start Button — visible ONLY to the host */}
          {hasJoined && players && players.length > 0 && currentState === 'lobby' && isHost && (
            <div className="host-controls">
              <motion.button 
                className="btn-start-game"
                onClick={onStartGame}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                🚀 Start Tournament ({players.length} players)
              </motion.button>
            </div>
          )}

          {/* Non-host waiting message when joined */}
          {hasJoined && players && players.length > 0 && currentState === 'lobby' && !isHost && (
            <div className="host-controls">
              <p className="waiting-text">⏳ Waiting for the host to start the tournament...</p>
            </div>
          )}

          {players && players.length > 0 && (
            <div className="waiting-list-container">
              <div className="waiting-list-header">
                <span>LOBBY PLAYERS ({players.length})</span>
                <span className="glow-text-pink" style={{ fontSize: '11px' }}>
                  {currentState === 'lobby' ? 'WAITING TO START' : 'GAME STARTING...'}
                </span>
              </div>
              <div className="waiting-players-grid">
                {players.map((p, idx) => (
                  <div key={idx} className="waiting-player-pill">
                    <span className={p.joined ? 'dot-pulse' : 'dot-offline'}></span>
                    {p.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Large Prominent QR Code Side Card */}
        <motion.div 
          className="lobby-qr-side"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
        >
          <QRCodeDisplay roomCode={roomCode || 'TOURNAMENT'} size="large" />
        </motion.div>
      </div>
    </div>
  );
}
