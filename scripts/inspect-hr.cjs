const { createClient } = require('@libsql/client');

async function run() {
  const client = createClient({ url: 'file:data/entrenoapp.db' });
  const rows = await client.execute("SELECT date, discipline, planned_code, distance_km, duration_min, notes, fit_data FROM sessions WHERE fit_data IS NOT NULL OR notes LIKE '%FC%' OR notes LIKE '%lpm%'");
  console.log('Sessions with FC/fit_data:', rows.rows.length);
  for (const r of rows.rows) {
    let fit = null;
    if (r.fit_data) {
      try { fit = JSON.parse(r.fit_data); } catch(e){}
    }
    console.log(r.date, '|', r.discipline, '|', r.planned_code, '| FC in notes:', (r.notes.match(/FC[^.\n]+/g) || []).join('; '), '| fit HR:', fit ? { avgHR: fit.avg_heart_rate, maxHR: fit.max_heart_rate } : 'no fit json');
  }
}
run();
