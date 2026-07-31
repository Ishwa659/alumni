import React, { useEffect, useState } from 'react';
import Confetti from 'react-confetti';
import { motion } from 'framer-motion';
import LeaderboardTable from './LeaderboardTable';
import StatisticsCharts from './StatisticsCharts';

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

  const { winner, leaderboard = [], statistics } = finalResults;

  // Blob CSV compilation for download
  const handleDownloadCSV = () => {
    const headers = ['Rank', 'Name', 'Round 1 (AI Pulse)', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Total Score'];
    const rows = leaderboard.map(p => [
      p.rank,
      p.name,
      p.r1,
      p.r2,
      p.r3,
      p.r4,
      p.r5,
      p.total
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AI_Tournament_Results_Room_${roomCode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      {/* 2. Leaderboard Table (Virtualized) */}
      <LeaderboardTable leaderboard={leaderboard} />

      {/* 3. Recharts Dashboard */}
      <StatisticsCharts statistics={statistics} />

      {/* 4. Controls */}
      <div className="results-footer-row" style={{ marginTop: '24px' }}>
        <button className="btn-secondary" onClick={handleDownloadCSV}>
          📥 Download CSV Results
        </button>
        <button className="btn-primary" onClick={onExit} style={{ background: 'linear-gradient(135deg, var(--accent-pink) 0%, #be185d 100%)', boxShadow: 'none' }}>
          Exit Tournament
        </button>
      </div>
    </div>
  );
}
