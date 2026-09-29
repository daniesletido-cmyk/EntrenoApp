const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbPaths = [
  path.resolve('data/entrenoapp.db'),
  path.resolve('data/tmp-backups/EntrenoApp-copia-20260916-093024.db'),
  path.resolve('release/win-unpacked/resources/app.asar.unpacked/.next/standalone/data/entrenoapp.db'),
  path.join(process.env.APPDATA || '', 'entrenoapp', 'entrenoapp.db'),
  path.join(process.env.LOCALAPPDATA || '', 'entrenoapp', 'entrenoapp.db'),
  path.join(process.env.APPDATA || '', 'EntrenoApp', 'entrenoapp.db')
];

for (const p of dbPaths) {
  if (fs.existsSync(p)) {
    console.log('\n========================================');
    console.log('=== DB:', p, '===');
    console.log('Size:', fs.statSync(p).size, 'bytes, Modified:', fs.statSync(p).mtime);
    try {
      const db = new DatabaseSync(p);
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log('Tables:', tables.map(t => t.name).join(', '));
      if (tables.some(t => t.name === 'sessions')) {
        const count = db.prepare("SELECT count(*) as c FROM sessions").get();
        console.log('Total sessions:', count.c);
        const done = db.prepare("SELECT count(*) as c FROM sessions WHERE status = 'realizada'").get();
        console.log('Realizada sessions:', done.c);
        const recent = db.prepare("SELECT id, date, title, sport, status, duration_minutes, distance_km FROM sessions WHERE date >= '2026-09-01' ORDER BY date DESC, id DESC").all();
        console.log('Recent sessions (>= 2026-09-01):', recent.length);
        console.log(JSON.stringify(recent, null, 2));
      }
      db.close();
    } catch (e) {
      console.error('Error reading', p, e.message);
    }
  } else {
    console.log('Not found:', p);
  }
}
