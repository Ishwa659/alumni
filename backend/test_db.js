const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'trivia.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.all('SELECT * FROM topics', [], (err, rows) => {
    if (err) {
      console.error('Error fetching topics:', err.message);
    } else {
      console.log(`Topics count: ${rows.length}`);
      rows.forEach(r => console.log(`  - Topic ${r.id}: ${r.name}`));
    }
  });

  db.all('SELECT * FROM questions', [], (err, rows) => {
    if (err) {
      console.error('Error fetching questions:', err.message);
    } else {
      console.log(`Questions count: ${rows.length}`);
    }
  });

  db.close();
});
