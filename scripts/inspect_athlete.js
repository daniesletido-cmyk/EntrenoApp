const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const db = new DatabaseSync('./data/entrenoapp.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

for (const t of tables) {
  try {
    const count = db.prepare(`SELECT count(*) as count FROM ${t.name}`).get();
    console.log(`${t.name}: ${count.count} rows`);
  } catch (e) {
    console.log(t.name, e.message);
  }
}

console.log('\n--- SETTINGS ---');
try {
  const settings = db.prepare('SELECT * FROM settings').all();
  console.log(JSON.stringify(settings, null, 2));
} catch (e) { console.log('Settings error:', e.message); }

console.log('\n--- GOALS ---');
try {
  const goals = db.prepare('SELECT * FROM goals').all();
  console.log(JSON.stringify(goals, null, 2));
} catch (e) { console.log('Goals error:', e.message); }

console.log('\n--- RECENT SESSIONS (last 20 completed or recent) ---');
try {
  const sessions = db.prepare("SELECT * FROM sessions ORDER BY date DESC LIMIT 25").all();
  console.log(JSON.stringify(sessions, null, 2));
} catch (e) { console.log('Sessions error:', e.message); }
