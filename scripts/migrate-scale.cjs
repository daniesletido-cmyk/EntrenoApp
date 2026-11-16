const { DatabaseSync } = require('node:sqlite');

['data/entrenoapp.db', 'seed/entrenoapp.db'].forEach((p) => {
  const db = new DatabaseSync(p);
  const cols = db.prepare('PRAGMA table_info(measurements)').all().map((c) => c.name);

  if (!cols.includes('body_fat_pct')) {
    db.exec('ALTER TABLE measurements ADD COLUMN body_fat_pct REAL;');
    console.log(p, 'added body_fat_pct to measurements');
  }
  if (!cols.includes('muscle_mass_kg')) {
    db.exec('ALTER TABLE measurements ADD COLUMN muscle_mass_kg REAL;');
    console.log(p, 'added muscle_mass_kg to measurements');
  }
  if (!cols.includes('water_pct')) {
    db.exec('ALTER TABLE measurements ADD COLUMN water_pct REAL;');
    console.log(p, 'added water_pct to measurements');
  }
  if (!cols.includes('source')) {
    db.exec('ALTER TABLE measurements ADD COLUMN source TEXT;');
    console.log(p, 'added source to measurements');
  }
  console.log(p, 'measurements migration complete');
});
