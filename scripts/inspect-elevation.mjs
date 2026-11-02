import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import FitParser from "fit-file-parser";

console.log("=== INSPECTING SESSIONS FOR ELEVATION / DESNIVEL ===");
const db = new DatabaseSync("data/entrenoapp.db");
const allSessions = db.prepare("SELECT id, date, discipline, planned_code, notes, fit_data FROM sessions").all();

let elevationCount = 0;
for (const s of allSessions) {
  const text = `${s.planned_code || ""} ${s.notes || ""}`;
  if (/desnivel|altitud|\+?\d+m\s*d\+|cuestas|toboganes/i.test(text)) {
    elevationCount++;
    console.log(`[${s.date}] ID: ${s.id} | Code: ${s.planned_code}`);
    const lines = (s.notes || "").split("\n").filter(l => /desnivel|altitud|\+?\d+m\s*d\+|cuestas|toboganes/i.test(l));
    console.log("  Lines:", lines);
  }
}
console.log(`Total sessions matching elevation/cuestas: ${elevationCount}`);

console.log("\n=== INSPECTING FIT FILES FOR ALTITUDE DATA ===");
const fitFiles = [
  "d:/Users/Dani/Downloads/6adcc279ad26986eae5f0728.fit",
  "d:/Users/Dani/Downloads/6addd5edac1fd4680f5057fe.fit"
];

for (const f of fitFiles) {
  if (!fs.existsSync(f)) continue;
  const content = fs.readFileSync(f);
  const parser = new FitParser({ force: true, speedUnit: "km/h", lengthUnit: "m", temperatureUnit: "celsius" });
  await new Promise((resolve) => {
    parser.parse(content, (err, data) => {
      if (err) {
        console.error("Error parsing", f, err);
        return resolve();
      }
      const sess = data.sessions?.[0] || {};
      console.log(`\nFile: ${f}`);
      console.log(`  Total Ascent: ${sess.total_ascent} m, Total Descent: ${sess.total_descent} m`);
      console.log(`  Avg Alt: ${sess.avg_altitude} m, Max Alt: ${sess.max_altitude} m, Min Alt: ${sess.min_altitude} m`);
      
      // Sample records
      const records = data.records || [];
      const altitudes = records.map(r => r.altitude).filter(a => a != null);
      if (altitudes.length > 0) {
        const minA = Math.min(...altitudes);
        const maxA = Math.max(...altitudes);
        const avgA = (altitudes.reduce((a, b) => a + b, 0) / altitudes.length).toFixed(1);
        console.log(`  Records altitudes (${altitudes.length} points): min=${minA}m, max=${maxA}m, avg=${avgA}m`);
      }
      resolve();
    });
  });
}
db.close();
