import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/entrenoapp.db");
const sessions = db.prepare("SELECT id, date, discipline, planned_code, notes FROM sessions").all();

console.log(`Analyzing ${sessions.length} sessions...`);
const toUpdate = [];

for (const s of sessions) {
  let code = s.planned_code || "";
  let notes = s.notes || "";
  let changed = false;

  // 1. Remove fake +...m D+ from planned_code
  if (/·?\s*(?:Desnivel\s+Madrid\s*)?\+\d+m\s*D\+/i.test(code) || /Madrid\s+Spec\s*\+\d+m\s*D\+/i.test(code)) {
    const newCode = code
      .replace(/·?\s*Desnivel\s+Madrid\s*\+\d+m\s*D\+/gi, "")
      .replace(/·?\s*Madrid\s+Spec\s*\+\d+m\s*D\+/gi, "")
      .replace(/\s*·\s*\+\d+m\s*D\+/gi, "")
      .replace(/\s*\(\s*\)/g, "")
      .trim();
    if (newCode !== code) {
      code = newCode;
      changed = true;
    }
  }

  // 2. Adjust notes referencing fake elevation
  if (/desnivel|\+\d+m\s*d\+|cuestas\s+tendidas|toboganes|repechos|madrid\s+río/i.test(notes)) {
    let newNotes = notes;

    // Replace Madrid elevation justification
    newNotes = newNotes.replace(
      /y simulación del perfil de Madrid \(\+\d+m D\+\)/gi,
      "en terreno llano y estable de Zuera (~279m altitud)"
    );
    newNotes = newNotes.replace(
      /Tirada Larga con Desnivel Específico Madrid \(([^)]+)\+\d+m D\+([^)]*)\)/gi,
      "Tirada Larga Aeróbica en Terreno Llano Zuera ($1Terreno Estable$2)"
    );
    newNotes = newNotes.replace(
      /Tirada Larga Específica Maratón Madrid/gi,
      "Tirada Larga de Volumen Aeróbico (Terreno Zuera)"
    );
    newNotes = newNotes.replace(
      /Tirada Específica \d+k \(([^)]+)\+\d+m D\+([^)]*)\)/gi,
      (match) => match.replace(/\+\d+m D\+ · /g, "").replace(/\+\d+m D\+/g, "Terreno Llano Zuera")
    );
    newNotes = newNotes.replace(
      /TEST RMC 30K \(SIMULACIÓN MADRID\) \(([^)]+)\+\d+m D\+([^)]*)\)/gi,
      "TEST RMC 30K (SIMULACIÓN RITMO MARATÓN ZUERA) ($1Terreno Estable$2)"
    );
    newNotes = newNotes.replace(
      /TIRADA PICO MÁXIMA 34K \(([^)]+)\+\d+m D\+([^)]*)\)/gi,
      "TIRADA PICO MÁXIMA 34K ($1Terreno Llano Zuera$2)"
    );

    // Replace instructions about searching for hills in Zuera
    newNotes = newNotes.replace(
      /En los últimos \d+ km buscar cuestas tendidas y toboganes manteniendo el ritmo a Ritmo Maratón \([^)]+\)\./gi,
      "En los últimos 3-4 km sostener el Ritmo Maratón en terreno llano y continuo, focalizando en cadencia constante (175 ppm) y zancada económica."
    );
    newNotes = newNotes.replace(
      /- Bloque específico en pendiente: En los últimos 3-4 km buscar repechos y toboganes manteniendo el esfuerzo a Ritmo Maratón \([^)]+\)\./gi,
      "- Bloque específico de ritmo: En los últimos 3-4 km consolidar el Ritmo Maratón en terreno llano/falso llano de Zuera, priorizando la economía de carrera y el control de pulso."
    );
    newNotes = newNotes.replace(
      /en terreno con toboganes para simular Madrid Río y Casa de Campo\./gi,
      "en terreno llano continuo de Zuera, priorizando el control del lactato y ritmo uniforme."
    );

    // Replace pool reference "tras las cuestas o series"
    newNotes = newNotes.replace(
      /tras las cuestas o series del martes/gi,
      "tras las series de intensidad del martes"
    );

    // Clarify short hill sprint sessions in Zuera
    newNotes = newNotes.replace(
      /- Bloque de Cuestas: (\d+x\d+m) en rampa tendida \(4-5% de pendiente\) a ritmo vivo y potente/gi,
      "- Bloque de Cuestas o Rectas de Potencia: $1 en rampa/puente de Zuera (o rectas progresivas en llano con braceo activo y zancada elástica)"
    );

    if (newNotes !== notes) {
      notes = newNotes;
      changed = true;
    }
  }

  if (changed) {
    toUpdate.push({ id: s.id, date: s.date, code, notes });
  }
}

console.log(`Found ${toUpdate.length} sessions to update.`);
for (const u of toUpdate.slice(0, 5)) {
  console.log(`\n--- [${u.date}] ID ${u.id} ---`);
  console.log("New code:", u.code);
  console.log("Sample notes snippet:", u.notes.slice(0, 150));
}

db.close();
