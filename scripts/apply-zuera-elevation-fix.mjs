import { DatabaseSync } from "node:sqlite";

console.log("=== APPLYING ZUERA ELEVATION FIX TO ALL SESSIONS ===");

for (const dbPath of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  const db = new DatabaseSync(dbPath);
  const sessions = db.prepare("SELECT id, date, discipline, planned_code, notes FROM sessions").all();

  const updateStmt = db.prepare("UPDATE sessions SET planned_code = ?, notes = ?, updated_at = datetime('now') WHERE id = ?");

  let count = 0;
  for (const s of sessions) {
    let code = s.planned_code || "";
    let notes = s.notes || "";
    let wasChanged = false;

    // 1. Clean planned_code
    let newCode = code
      .replace(/·?\s*Desnivel\s+Madrid\s*\+\d+m\s*D\+/gi, "")
      .replace(/·?\s*Madrid\s+Spec\s*\+\d+m\s*D\+/gi, "")
      .replace(/·?\s*\+\d+m\s*D\+/gi, "")
      .replace(/\s+\)/g, ")")
      .replace(/\(\s+/g, "(")
      .replace(/\s+/g, " ")
      .trim();

    newCode = newCode
      .replace(/\(Potencia Madrid\)/gi, "(Potencia Neuromuscular Zuera)")
      .replace(/R4 \(Ritmo Maratón Específico con Pendiente\)/gi, "R4 (Ritmo Maratón Específico Continuo)")
      .trim();

    if (newCode !== code) {
      code = newCode;
      wasChanged = true;
    }

    // 2. Clean notes
    let newNotes = notes;

    newNotes = newNotes
      .replace(/simulación del perfil de Madrid \(\+\d+m D\+\)/gi, "perfil llano y continuo de Zuera (~279m altitud)")
      .replace(/Tirada Larga con Desnivel Específico Madrid \(([^)]+)\+\d+m D\+([^)]*)\)/gi, "Tirada Larga de Volumen Aeróbico en Zuera ($1Terreno Llano$2)")
      .replace(/Tirada Larga Específica Maratón Madrid/gi, "Tirada Larga de Volumen Aeróbico (Zuera)")
      .replace(/RUNNING · Potencia Mecánica en Cuestas/gi, "RUNNING · Potencia Mecánica en Rectas o Cuestas Cortas")
      .replace(/y toboganes para simular Madrid Río y Casa de Campo\./gi, "en el terreno llano de Zuera, afianzando la economía de zancada y el ritmo uniforme.")
      .replace(/en terreno con toboganes/gi, "en terreno llano continuo")
      .replace(/tras las cuestas o series del martes/gi, "tras las series de intensidad del martes")
      .replace(/· \+\d+m D\+/gi, "")
      .replace(/\+\d+m D\+ · /gi, "");

    newNotes = newNotes
      .replace(/En los últimos \d+ km buscar cuestas tendidas y toboganes manteniendo el ritmo a Ritmo Maratón \([^)]+\)\./gi, "En los últimos 3-4 km sostener el Ritmo Maratón en terreno llano y continuo, focalizando en cadencia constante (175 ppm) y zancada económica.")
      .replace(/- Bloque específico en pendiente: En los últimos 3-4 km buscar repechos y toboganes manteniendo el esfuerzo a Ritmo Maratón \([^)]+\)\./gi, "- Bloque específico de ritmo: En los últimos 3-4 km consolidar el Ritmo Maratón en terreno llano de Zuera, priorizando la economía de carrera y el control de pulso.")
      .replace(/- Bloque de Cuestas: (\d+x\d+m) en rampa tendida \(4-5% de pendiente\) a ritmo vivo y potente/gi, "- Bloque de Cuestas Cortas o Rectas de Potencia: $1 en rampa/puente de Zuera o rectas en progresión llana con braceo activo y zancada elástica");

    newNotes = newNotes.replace(
      /En las cuestas, mirar el ritmo por kilómetro solo genera frustración\./gi,
      "En pendientes o aceleraciones, mirar el ritmo por kilómetro solo genera ruido mental."
    );

    if (newNotes !== notes) {
      notes = newNotes;
      wasChanged = true;
    }

    if (wasChanged) {
      updateStmt.run(code, notes, s.id);
      count++;
    }
  }

  console.log(`Updated ${count} sessions in ${dbPath}`);
  db.close();
}

console.log("Elevation fix applied successfully to all databases!");
