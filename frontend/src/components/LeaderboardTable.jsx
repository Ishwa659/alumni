import React, { useState } from 'react';
import { FixedSizeList as List } from 'react-window';

export default function LeaderboardTable({ leaderboard = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter leaderboard based on search term
  const filteredData = leaderboard.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render function for each individual virtual row
  const Row = ({ index, style }) => {
    const player = filteredData[index];
    if (!player) return null;

    let rowClass = 'table-body-row';
    let rankBadgeClass = 'rank-badge';

    if (player.rank === 1) {
      rowClass += ' top-1';
      rankBadgeClass += ' rank-1-badge';
    } else if (player.rank === 2) {
      rowClass += ' top-2';
      rankBadgeClass += ' rank-2-badge';
    } else if (player.rank === 3) {
      rowClass += ' top-3';
      rankBadgeClass += ' rank-3-badge';
    }

    return (
      <div style={style} className={rowClass}>
        <div className="table-body-cell" style={{ flex: '0.6', textAlign: 'center' }}>
          {player.rank <= 3 ? (
            <span className={rankBadgeClass}>
              {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
            </span>
          ) : (
            <span style={{ fontWeight: '700', color: 'var(--text-muted)' }}>#{player.rank}</span>
          )}
        </div>
        <div className="table-body-cell name-col">
          {player.name}
        </div>
        <div className="table-body-cell">{player.r1}</div>
        <div className="table-body-cell">{player.r2}</div>
        <div className="table-body-cell">{player.r3}</div>
        <div className="table-body-cell">{player.r4}</div>
        <div className="table-body-cell">{player.r5}</div>
        <div className="table-body-cell" style={{ fontWeight: '800', color: 'var(--accent-cyan)' }}>
          {player.total}
        </div>
      </div>
    );
  };

  return (
    <div className="leaderboard-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 className="chart-title" style={{ margin: 0 }}>Final Leaderboard ({filteredData.length} Players)</h3>
        <input
          type="text"
          placeholder="🔍 Search player..."
          className="text-input"
          style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px', maxWidth: '200px' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="virtual-table-container">
        {/* Table Headers */}
        <div className="table-header-row">
          <div className="table-header-cell" style={{ flex: '0.6' }}>Rank</div>
          <div className="table-header-cell name-col">Name</div>
          <div className="table-header-cell">R1</div>
          <div className="table-header-cell">R2</div>
          <div className="table-header-cell">R3</div>
          <div className="table-header-cell">R4</div>
          <div className="table-header-cell">R5</div>
          <div className="table-header-cell">Total</div>
        </div>

        {/* Virtualized Rows */}
        {filteredData.length > 0 ? (
          <List
            height={360}
            itemCount={filteredData.length}
            itemSize={44}
            width="100%"
          >
            {Row}
          </List>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No player records found matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}
