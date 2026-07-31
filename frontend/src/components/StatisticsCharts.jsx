import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell
} from 'recharts';

export default function StatisticsCharts({ statistics }) {
  if (!statistics) return null;

  const {
    avg_score_per_round = [0, 0, 0, 0, 0],
    accuracy_per_round = [0, 0, 0, 0, 0],
    topic_difficulty = {},
    score_distribution = {}
  } = statistics;

  // Format Round Averages Data
  const roundAvgData = avg_score_per_round.map((val, idx) => ({
    name: `Round ${idx + 1}`,
    score: val
  }));

  // Format Round Accuracy Data
  const roundAccData = accuracy_per_round.map((val, idx) => ({
    name: `Round ${idx + 1}`,
    accuracy: val
  }));

  // Format Topic Difficulty Data (sorted descending by accuracy = easiest first, hardest at bottom, or vice versa)
  const topicDiffData = Object.keys(topic_difficulty).map(name => ({
    topic: name,
    accuracy: topic_difficulty[name]
  })).sort((a, b) => a.accuracy - b.accuracy); // Hardest topic (lowest accuracy) first

  // Format Score Distribution Data
  // Build array of all possible scores 0-25
  const distData = [];
  for (let s = 25; s >= 0; s--) {
    const count = score_distribution[s] || 0;
    // Only push if there's at least one player or to keep a small readable chart around high scores
    if (count > 0 || (s >= 15 && s <= 25)) {
      distData.push({
        score: `${s}/25`,
        players: count
      });
    }
  }
  // Reverse to make histogram flow from low score to high score left-to-right
  distData.reverse();

  // Color mappings
  const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981'];

  return (
    <div className="stats-grid-row">
      {/* 1. Round Average Scores */}
      <div className="chart-card-box">
        <h4 className="chart-title">Average Score Per Round (out of 5)</h4>
        <div style={{ width: '100%', height: '100%', minHeight: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roundAvgData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis domain={[0, 5]} stroke="#94a3b8" fontSize={11} />
              <Tooltip 
                contentStyle={{ background: '#120c30', borderColor: 'var(--card-border)' }}
                labelStyle={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}
              />
              <Bar dataKey="score" fill="var(--primary-purple)" radius={[6, 6, 0, 0]}>
                {roundAvgData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Round Accuracy % */}
      <div className="chart-card-box">
        <h4 className="chart-title">Player Accuracy Percentage (%)</h4>
        <div style={{ width: '100%', height: '100%', minHeight: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={roundAccData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
              <Tooltip 
                contentStyle={{ background: '#120c30', borderColor: 'var(--card-border)' }}
                labelStyle={{ color: 'var(--accent-pink)', fontWeight: 'bold' }}
              />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="var(--accent-cyan)" 
                strokeWidth={3} 
                activeDot={{ r: 8 }} 
                dot={{ stroke: 'var(--accent-cyan)', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Topic Accuracy Rankings */}
      <div className="chart-card-box">
        <h4 className="chart-title">Topic Accuracy Ranking (Hardest at Top)</h4>
        <div style={{ width: '100%', height: '100%', minHeight: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topicDiffData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} unit="%" />
              <YAxis dataKey="topic" type="category" stroke="#94a3b8" fontSize={10} width={80} />
              <Tooltip 
                contentStyle={{ background: '#120c30', borderColor: 'var(--card-border)' }}
                labelStyle={{ color: 'var(--accent-pink)', fontWeight: 'bold' }}
              />
              <Bar dataKey="accuracy" fill="var(--accent-pink)" radius={[0, 6, 6, 0]}>
                {topicDiffData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.accuracy < 70 ? '#ec4899' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Score Distribution Histogram */}
      <div className="chart-card-box">
        <h4 className="chart-title">Score Distribution (Histogram)</h4>
        <div style={{ width: '100%', height: '100%', minHeight: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="score" stroke="#94a3b8" fontSize={9} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ background: '#120c30', borderColor: 'var(--card-border)' }}
                labelStyle={{ color: 'var(--accent-cyan)', fontWeight: 'bold' }}
              />
              <Bar dataKey="players" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
