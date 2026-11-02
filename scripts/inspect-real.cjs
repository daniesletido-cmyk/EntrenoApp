const { createClient } = require('@libsql/client');

async function run() {
  const client = createClient({ url: 'file:data/entrenoapp.db' });
  const real = await client.execute("SELECT date, discipline, planned_code, distance_km, duration_min, rpe, notes FROM sessions WHERE status='realizada' ORDER BY date DESC");
  console.log('Realized sessions count:', real.rows.length);
  real.rows.forEach(r => console.log(r.date, '|', r.discipline, '|', r.planned_code, '|', r.distance_km + 'km', '|', r.duration_min + 'min', '| RPE:', r.rpe, '|', (r.notes || '').replace(/\n/g, ' ').slice(0, 60)));
}
run();
