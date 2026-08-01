const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let pgPool = null;
let sqliteDb = null;
let isPostgres = false;

// Check if PostgreSQL configuration is available
if (process.env.DATABASE_URL) {
  const isLocalPg = process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1');
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalPg ? false : { rejectUnauthorized: false },
    max: 50, // Connection pool size optimized for concurrent players
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  isPostgres = true;
  console.log('Database Client: Using PostgreSQL connection pool.');
} else {
  const dbPath = path.join(__dirname, 'trivia.db');
  sqliteDb = new sqlite3.Database(dbPath);
  isPostgres = false;
  console.log(`Database Client: Using SQLite local fallback at ${dbPath}`);
}

/**
 * Unified query method.
 * Dynamically converts postgres-style $1, $2 placeholders to sqlite-style ? placeholders if needed.
 */
function query(sql, params = []) {
  if (isPostgres) {
    return pgPool.query(sql, params);
  } else {
    return new Promise((resolve, reject) => {
      // Convert $1, $2, $3... placeholders to ? for SQLite
      let sqliteSql = sql.replace(/\$[0-9]+/g, '?');
      
      // Remove RETURNING clauses if SQLite doesn't support them cleanly
      if (sqliteSql.toUpperCase().includes('RETURNING')) {
        sqliteSql = sqliteSql.replace(/RETURNING\s+\w+/gi, '');
      }

      const upperSql = sqliteSql.trim().toUpperCase();
      if (upperSql.startsWith('SELECT')) {
        sqliteDb.all(sqliteSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows });
        });
      } else {
        sqliteDb.run(sqliteSql, params, function(err) {
          if (err) return reject(err);
          resolve({ 
            rows: [],
            rowCount: this.changes,
            insertId: this.lastID
          });
        });
      }
    });
  }
}

/**
 * Initialize database tables and seed sample data
 */
async function initDb() {
  if (isPostgres) {
    try {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pgPool.query(schemaSql);
      console.log('PostgreSQL database initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize PostgreSQL database:', err.message);
    }
  } else {
    // Manually create SQLite tables and seed questions if empty
    return new Promise((resolve, reject) => {
      sqliteDb.serialize(async () => {
        try {
          // Create SQLite tables
          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS topics (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL UNIQUE,
              description TEXT,
              icon_url TEXT,
              question_count INTEGER DEFAULT 5,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS questions (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              topic_id INTEGER NOT NULL,
              round_number INTEGER,
              question_number INTEGER NOT NULL,
              question_text TEXT NOT NULL,
              option_1 TEXT NOT NULL,
              option_2 TEXT NOT NULL,
              option_3 TEXT NOT NULL,
              option_4 TEXT NOT NULL,
              correct_option INTEGER NOT NULL,
              difficulty TEXT DEFAULT 'medium',
              FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
            )
          `);

          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS game_sessions (
              id TEXT PRIMARY KEY,
              current_state TEXT DEFAULT 'lobby',
              current_round INTEGER DEFAULT 0,
              current_question INTEGER DEFAULT 0,
              used_topics TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
          `);

          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS player_scores (
              id TEXT PRIMARY KEY,
              game_session_id TEXT,
              name TEXT NOT NULL,
              round_1_score INTEGER DEFAULT 0,
              round_2_score INTEGER DEFAULT 0,
              round_3_score INTEGER DEFAULT 0,
              round_4_score INTEGER DEFAULT 0,
              round_5_score INTEGER DEFAULT 0,
              total_score INTEGER DEFAULT 0,
              FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
            )
          `);

          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS answer_log (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              game_session_id TEXT NOT NULL,
              player_id TEXT NOT NULL,
              player_name TEXT NOT NULL,
              round_number INTEGER NOT NULL,
              question_number INTEGER NOT NULL,
              topic_id INTEGER NOT NULL,
              selected_option INTEGER NOT NULL,
              is_correct BOOLEAN NOT NULL,
              submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
            )
          `);

          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS round_results (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              game_session_id TEXT NOT NULL,
              round_number INTEGER NOT NULL,
              player_id TEXT NOT NULL,
              topic_id INTEGER NOT NULL,
              score INTEGER DEFAULT 0,
              completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
            )
          `);

          sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS tournament_stats (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              game_session_id TEXT NOT NULL,
              round_number INTEGER NOT NULL,
              average_score REAL,
              median_score REAL,
              accuracy_percentage REAL,
              difficulty_rating TEXT,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE CASCADE
            )
          `);

          // Create indices
          sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic_id)`);
          sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_answer_log_session ON answer_log(game_session_id)`);
          sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_answer_log_player ON answer_log(player_id)`);
          sqliteDb.run(`CREATE INDEX IF NOT EXISTS idx_player_scores_session ON player_scores(game_session_id)`);

          // Check if topics are empty and seed them
          sqliteDb.get('SELECT COUNT(*) as count FROM topics', async (err, row) => {
            if (err) return reject(err);
            if (row.count === 0) {
              console.log('SQLite: Seeding initial data...');
              try {
                // Parse schema.sql to extract seeds
                const schemaPath = path.join(__dirname, 'schema.sql');
                const schemaSql = fs.readFileSync(schemaPath, 'utf8');
                const sqlStatements = schemaSql
                  .split(';')
                  .map(s => s.trim())
                  .filter(s => s.toUpperCase().includes('INSERT INTO'));

                for (const stmt of sqlStatements) {
                  // Replace ON CONFLICT PostgreSQL syntax for SQLite compatibility
                  const sqliteStmt = stmt.replace(/ON CONFLICT[\s\S]*/gi, '');
                  if (sqliteStmt.trim()) {
                    await query(sqliteStmt);
                  }
                }
                console.log('SQLite database seeded successfully.');
              } catch (seedErr) {
                console.error('Failed to seed SQLite database:', seedErr.message);
              }
            }
            resolve();
          });
        } catch (sqliteErr) {
          console.error('Failed to initialize SQLite database:', sqliteErr.message);
          reject(sqliteErr);
        }
      });
    });
  }
}

module.exports = {
  query,
  initDb,
  isPostgres
};
