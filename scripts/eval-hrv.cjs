const { createClient } = require('@libsql/client');

async function main() {
  const client = createClient({ url: 'file:data/entrenoapp.db' });
  
  // 1. CrossFit sessions count
  const cf = await client.execute("SELECT date, discipline, planned_code, duration_min, rpe, status FROM sessions WHERE discipline='crossfit' OR planned_code LIKE '%crossfit%' OR notes LIKE '%crossfit%' ORDER BY date ASC");
  console.log('=== CROSSFIT SESSIONS IN DB ===');
  console.log('Total matches:', cf.rows.length);
  cf.rows.forEach(r => console.log(r.date, '|', r.status, '|', r.planned_code, '|', r.duration_min + 'min', '| RPE:', r.rpe));

  // 2. Sleep logs with HRV
  const logs = await client.execute("SELECT date, hours, score, deep_min, rem_min, notes FROM sleep_logs ORDER BY date ASC");
  console.log('\n=== SLEEP LOGS (Total rows:', logs.rows.length, ') ===');
  
  const hrvData = [];
  for (const row of logs.rows) {
    let hrv = null;
    if (row.notes) {
      const match = row.notes.match(/HRV:\s*(\d+)\s*ms/i);
      if (match) {
        hrv = parseInt(match[1], 10);
      }
    }
    hrvData.push({
      date: row.date,
      hours: row.hours,
      score: row.score,
      deep_min: row.deep_min,
      rem_min: row.rem_min,
      hrv: hrv,
      notes: row.notes
    });
  }

  // Filter last 30-35 days
  const recent = hrvData.filter(d => d.hrv !== null);
  console.log('Total entries with HRV:', recent.length);
  
  // Print table of recent HRV entries
  console.log('\nDate       | HRV (ms) | Score | Hours | Deep(m) | REM(m)');
  console.log('---------------------------------------------------------');
  recent.slice(-35).forEach(d => {
    console.log(`${d.date} | ${String(d.hrv).padStart(8)} | ${String(d.score).padStart(5)} | ${String(d.hours).padStart(5)} | ${String(d.deep_min).padStart(7)} | ${String(d.rem_min).padStart(6)}`);
  });

  // Calculate statistics for last month (last 30 entries)
  const last30 = recent.slice(-30);
  const values = last30.map(d => d.hrv);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Standard deviation
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Coefficient of variation (CV = stdDev / avg * 100)
  const cv = (stdDev / avg) * 100;

  console.log('\n=== LAST 30 DAYS HRV STATISTICS ===');
  console.log(`Count: ${values.length} days`);
  console.log(`Average HRV: ${avg.toFixed(1)} ms`);
  console.log(`Median HRV: ${values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)]} ms`);
  console.log(`Min: ${min} ms, Max: ${max} ms`);
  console.log(`Standard Deviation: ${stdDev.toFixed(1)} ms`);
  console.log(`Coefficient of Variation (CV): ${cv.toFixed(1)}%`);

  // Let's also check weekly trends
  console.log('\n=== WEEKLY AVERAGES ===');
  // Group by week (7-day chunks from end)
  const reversed = [...last30].reverse();
  for (let w = 0; w < 4; w++) {
    const chunk = reversed.slice(w * 7, (w + 1) * 7);
    if (chunk.length > 0) {
      const wAvg = chunk.reduce((sum, d) => sum + d.hrv, 0) / chunk.length;
      const wSleep = chunk.reduce((sum, d) => sum + d.hours, 0) / chunk.length;
      console.log(`Semana -${w+1} (${chunk[chunk.length-1].date} a ${chunk[0].date}): HRV medio = ${wAvg.toFixed(1)} ms | Sueño medio = ${wSleep.toFixed(1)} h`);
    }
  }
}

main();
