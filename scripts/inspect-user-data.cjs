const { createClient } = require('@libsql/client');
const fs = require('fs');

async function main() {
  const dbs = ['data/entrenoapp.db', 'data/entreno.db'];
  for (const dbPath of dbs) {
    if (!fs.existsSync(dbPath)) continue;
    console.log('=== DB:', dbPath, '===');
    const client = createClient({ url: 'file:' + dbPath });
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log('Tables:', tables.rows.map(r => r.name));
    for (const row of tables.rows) {
      const name = row.name;
      try {
        const count = await client.execute(`SELECT count(*) as c FROM "${name}"`);
        console.log(`  Table ${name}: ${count.rows[0].c} rows`);
      } catch (err) {
        console.log(`  Table ${name}: error`, err.message);
      }
    }
  }
}
main();
