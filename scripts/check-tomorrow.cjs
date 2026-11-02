const { createClient } = require('@libsql/client');

async function main() {
  const client = createClient({ url: 'file:data/entrenoapp.db' });
  const row = await client.execute("SELECT * FROM sessions WHERE date = '2026-10-29'");
  console.log('TOMORROW SESSION:');
  console.log(row.rows);
}
main();
