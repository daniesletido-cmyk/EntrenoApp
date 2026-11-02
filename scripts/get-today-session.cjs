const { createClient } = require('@libsql/client');

async function main() {
  const client = createClient({ url: 'file:data/entrenoapp.db' });
  
  // Check sessions around 2026-10-28
  const rows = await client.execute("SELECT id, date, discipline, planned_code, duration_min, distance_km, status, rpe, notes FROM sessions WHERE date >= '2026-10-25' AND date <= '2026-11-01' ORDER BY date ASC");
  console.log('=== SESSIONS THIS WEEK (2026-10-25 to 2026-11-01) ===');
  rows.rows.forEach(r => {
    console.log(r.date, '|', r.discipline, '|', r.planned_code, '|', r.status, '|', r.distance_km ? r.distance_km + 'km' : (r.duration_min ? r.duration_min + 'min' : ''), '|', (r.notes || '').slice(0, 90).replace(/\n/g, ' '));
  });

  // Check today specifically
  const today = await client.execute("SELECT * FROM sessions WHERE date = '2026-10-28'");
  console.log('\n=== TODAY (2026-10-28) DETAILS ===');
  console.log(today.rows);
}

main();
