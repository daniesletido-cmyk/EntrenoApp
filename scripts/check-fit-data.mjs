import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/entrenoapp.db");
const rowsWithFit = db.prepare("SELECT id, date, discipline, planned_code, fit_data FROM sessions WHERE fit_data IS NOT NULL").all();
console.log(`Found ${rowsWithFit.length} sessions with fit_data.`);
for (const r of rowsWithFit) {
  try {
    const data = JSON.parse(r.fit_data);
    console.log(`[${r.date}] ID ${r.id}:`, Object.keys(data));
    if (data.elevation || data.ascent || data.total_ascent || data.altitude) {
      console.log(`  Elevation keys:`, {
        elevation: data.elevation,
        ascent: data.ascent,
        total_ascent: data.total_ascent,
        altitude: data.altitude
      });
    }
  } catch (e) {
    console.log(`[${r.date}] Raw fit_data:`, r.fit_data?.slice(0, 100));
  }
}
db.close();
