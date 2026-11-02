const { createClient } = require('@libsql/client');

async function main() {
  const client = createClient({ url: 'file:data/entrenoapp.db' });
  
  // Completed sessions
  const completed = await client.execute("SELECT discipline, count(*) as count, round(sum(distance_km), 1) as total_km, round(avg(rpe), 1) as avg_rpe FROM sessions WHERE status='completado' GROUP BY discipline");
  console.log('--- COMPLETED SESSIONS SUMMARY ---');
  console.log(completed.rows);

  // Recent completed running sessions
  const recentRuns = await client.execute("SELECT date, planned_code, duration_min, distance_km, rpe, notes FROM sessions WHERE discipline='carrera' AND status='completado' ORDER BY date DESC LIMIT 10");
  console.log('--- RECENT COMPLETED RUNS ---');
  console.log(recentRuns.rows);

  // Sleep logs summary
  const sleepSummary = await client.execute("SELECT round(avg(total_sleep_min)/60.0, 1) as avg_sleep_hrs, round(avg(deep_sleep_min), 1) as avg_deep_min, round(avg(rem_sleep_min), 1) as avg_rem_min, round(avg(sleep_score), 1) as avg_score, count(*) as total_days FROM sleep_logs");
  console.log('--- SLEEP SUMMARY ---');
  console.log(sleepSummary.rows);

  // Any notes or fit_data in sessions
  const notesWithText = await client.execute("SELECT date, discipline, planned_code, rpe, notes FROM sessions WHERE status='completado' AND notes IS NOT NULL ORDER BY date DESC LIMIT 5");
  console.log('--- RECENT NOTES ---');
  console.log(notesWithText.rows);
}
main();
