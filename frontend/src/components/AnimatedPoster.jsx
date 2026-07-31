import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function AnimatedPoster({ onJoin, players, currentState, onStartGame }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('TOURNAMENT');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name, room);
    }
  };

  return (
    <div className="container">
      <motion.div 
        className="glass-panel"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="banner-poster">
          <div className="logo-container">
            <div className="logo-ring-outer"></div>
            <div className="logo-ring-inner">🤖</div>
          </div>
          <h1 className="lobby-title">AI Trivia Tournament</h1>
          <p className="lobby-subtitle">
            5 Rounds of Technical AI Questions. 
            Round 1 is fixed, followed by 4 dynamically spun topics. 
            Silent gameplay: no score displays or reveals until the final standings are compiled.
          </p>
        </div>

        {/* Player join form — players scan QR and join on their devices */}
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
            <label className="input-label" htmlFor="room-code-input">Room Code</label>
            <input 
              id="room-code-input"
              type="text" 
              className="text-input" 
              placeholder="TOURNAMENT" 
              value={room}
              onChange={(e) => setRoom(e.target.value.toUpperCase())}
            />
          </div>

          <button type="submit" className="btn-primary">
            Join Tournament
          </button>
        </form>

        {/* Host Start Button — visible to everyone on the lobby screen */}
        {players && players.length > 0 && currentState === 'lobby' && (
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
    </div>
  );
}
