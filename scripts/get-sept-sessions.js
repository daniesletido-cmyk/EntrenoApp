const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const db = new DatabaseSync(path.resolve('data/entrenoapp.db'));

const sessions = db.prepare("SELECT * FROM sessions WHERE date >= '2026-09-01' ORDER BY date ASC, id ASC").all();
console.log('All September sessions in data/entrenoapp.db:');
console.log(JSON.stringify(sessions, null, 2));

db.close();
