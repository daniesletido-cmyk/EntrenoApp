const { createClient } = require('@libsql/client');

async function main() {
  const client = createClient({ url: 'file:data/entrenoapp.db' });
  
  console.log('--- SETTINGS ---');
  const settings = await client.execute('SELECT * FROM settings');
  console.log(settings.rows);

  console.log('--- GOALS ---');
  const goals = await client.execute('SELECT * FROM goals');
  console.log(goals.rows);

  console.log('--- GYM DAYS ---');
  const gymDays = await client.execute('SELECT * FROM gym_days');
  console.log(gymDays.rows);

  console.log('--- GYM EXERCISES ---');
  const gymEx = await client.execute('SELECT * FROM gym_exercises');
  console.log(gymEx.rows);

  console.log('--- GYM LOGS (recent 10) ---');
  const gymLogs = await client.execute('SELECT * FROM gym_logs ORDER BY date DESC LIMIT 10');
  console.log(gymLogs.rows);

  console.log('--- SESSIONS (sample recent & types) ---');
  const sessionTypes = await client.execute('SELECT type, count(*) as count FROM sessions GROUP BY type');
  console.log(sessionTypes.rows);

  const recentSessions = await client.execute('SELECT * FROM sessions ORDER BY date DESC LIMIT 15');
  console.log(recentSessions.rows);
}
main();
