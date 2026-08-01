import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';
import LeaderboardTable from './LeaderboardTable';

export default function FinalResultsPage({ finalResults, roomCode, onExit }) {
  const [windowDimensions, setWindowDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Update window sizing to stretch confetti cleanly
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!finalResults) {
    return (
      <div className="container">
        <div className="glass-panel" style={{ textAlign: 'center' }}>
          <h2 className="glow-text">TOURNAMENT COMPLETED</h2>
          <p style={{ marginTop: '20px', color: 'var(--text-muted)' }}>
            Processing tournament submissions & rendering leaderboard statistics...
          </p>
        </div>
      </div>
    );
  }

  const { winner, leaderboard = [], batchLeaderboard = [] } = finalResults;

  const handlePlayAgain = () => {
    window.location.reload();
  };

  return (
    <div className="container" style={{ maxWidth: '1000px', padding: '40px 24px' }}>
      {/* Confetti Celebration */}
      {leaderboard.length > 0 && (
        <Confetti 
          width={windowDimensions.width} 
          height={windowDimensions.height}
          recycle={true}
          numberOfPieces={160}
          opacity={0.7}
        />
      )}

      {/* Title */}
      <div className="results-header-box">
        <h1 className="lobby-title glow-text" style={{ fontSize: '36px' }}>🏆 Tournament Results 🏆</h1>
        <p className="lobby-subtitle" style={{ fontSize: '15px' }}>
          All 5 rounds completed. Here are the final scores and statistical breakdowns.
        </p>
      </div>

      {/* 1. Winner Showcase */}
      {winner && winner.name !== 'Nobody' && (
        <motion.div 
          className="champion-card"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
          style={{ width: '100%' }}
        >
          <div className="champion-crown">👑</div>
          <span className="champion-score" style={{ color: '#fbbf24', fontSize: '13px', fontWeight: 800, letterSpacing: '1px' }}>
            TOURNAMENT CHAMPION
          </span>
          <h2 className="champion-name">{winner.name}</h2>
          <span className="champion-score">
            Total Score: <strong style={{ color: 'white', fontSize: '18px' }}>{winner.total} / 25</strong> (Accuracy: {Math.round((winner.total / 25) * 100)}%)
          </span>
        </motion.div>
      )}

      {/* 2. Player Leaderboard Table */}
      <LeaderboardTable leaderboard={leaderboard} />

      {/* 3. Batch Year Leaderboard */}
      {batchLeaderboard.length > 0 && (
        <motion.div
          className="glass-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          style={{ marginTop: '32px', width: '100%' }}
        >
          <h2 style={{ 
            textAlign: 'center', 
            fontSize: '22px', 
            fontWeight: 800, 
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎓 Batch Year Leaderboard
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0 6px',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Rank</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Batch</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Players</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Total Score</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Avg Score</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Members</th>
                </tr>
              </thead>
              <tbody>
                {batchLeaderboard.map((batch, idx) => {
                  const medals = ['🥇', '🥈', '🥉'];
                  const isTop = idx < 3;
                  return (
                    <tr 
                      key={batch.batchYear}
                      style={{
                        background: isTop
                          ? `rgba(${idx === 0 ? '251, 191, 36' : idx === 1 ? '192, 192, 192' : '205, 127, 50'}, 0.08)`
                          : 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '10px'
                      }}
                    >
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, fontSize: '16px' }}>
                        {idx < 3 ? medals[idx] : batch.rank}
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        textAlign: 'center', 
                        fontWeight: 800, 
                        fontSize: '18px',
                        color: 'var(--primary-purple)'
                      }}>
                        {batch.batchYear}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {batch.playerCount}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: 'white' }}>
                        {batch.totalScore}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', color: 'var(--accent-cyan)' }}>
                        {batch.avgScore}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '12px' }}>
                        {batch.players.join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* 4. Controls */}
      <div className="results-footer-row" style={{ marginTop: '24px' }}>
        <button className="btn-primary" onClick={handlePlayAgain} style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)', boxShadow: 'none' }}>
          🔄 Play Again
        </button>
        <button className="btn-primary" onClick={onExit} style={{ background: 'linear-gradient(135deg, var(--accent-pink) 0%, #be185d 100%)', boxShadow: 'none' }}>
          Exit Tournament
        </button>
      </div>
    </div>
  );
}
