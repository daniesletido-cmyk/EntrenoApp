const { createClient } = require('@libsql/client');

const tuesdayCode = 'CrossFit Box · "Pain Cave" (Power Clean & Jerk + Chipper 52.5 kg & Cajón)';
const tuesdayDuration = 55;
const tuesdayNotes = `CROSSFIT BOX · PAIN CAVE (Fuerza + Chipper Metabólico · RPE 7-8):
- 🟢 Calentamiento & Activación: Movilidad dinámica de cadera, tobillos y muñecas + series de aproximación con barra vacía hasta peso moderado.
- ⚡ Fuerza (Cada 2:00 min · 5 series):
  • 5 Power Clean & Jerk (Touch and Go con técnica estricta).
  • Intensidad: Moderado a Moderado-Pesado (RPE 8). Priorizar trayectoria vertical de barra y bloqueo sólido arriba.
- ⚡ WOD "Freedom" Rx (For Time):
  • 10 Box Jumps (30/24") → ⚠️ ADAPTACIÓN FISIO: Realizar STEP-UPS (subidas al cajón) o cajón bajo (20") para eliminar rebote excéntrico y proteger tendón de Aquiles y sóleos de cara al fin de semana.
  • 50 Deadlifts (52.5 kg) → Fraccionar en series controladas (ej. 10x5 reps) manteniendo lordosis lumbar neutra.
  • 10 Box Jumps / Step-ups
  • 40 Hang Power Cleans (52.5 kg)
  • 10 Box Jumps / Step-ups
  • 30 Shoulder to Overhead (52.5 kg · Push Press / Push Jerk)
  • 10 Box Jumps / Step-ups
  • 20 Power Clean & Jerk (52.5 kg)
  • 10 Box Jumps / Step-ups
- 🔵 Vuelta a la Calma: 5-8 min caminata suave y descompresión lumbar en barra (dead hang suave) + estiramiento de glúteos y cadena posterior.
- 🥗 Estrategia Nutrición (Media Mañana / Tarde):
  • Si entrenas a las 13:30h (tomar 11:45h – 12:00h): 3 tortitas de maíz con 35g de pechuga de pavo (o 1 yogur proteico bajo en grasa + 2 tortitas). Sin plátano. Cero frutos secos. Aporte proteico y glucosa limpia para no tener fatiga neuromuscular ni sensación de pesadez.
  • Si vas a las 19:00h (habitual): Comida a las 13:30h rica en carbohidratos complejos (arroz/pasta con proteína magra). Merienda a las 17:15h: 3 tortitas de arroz con miel/membrillo o avena con leche vegetal/desnatada y semillas de chía o calabaza (100% libre de frutos secos).
- 🧠 Enfoque Psicológico & Tip Mental: Disciplina de Ritmo: En los chippers largos, quien empieza al 100% colapsa en el minuto 8. Empieza a un ritmo conservador del 75%, respira en cada bloqueo y no compitas con el cronómetro de la pizarra, sino con tu pulcritud técnica.`;

const thursdayCode = 'CrossFit Box · "Steady" (AMRAP 24 min · Run + Air Bike Aeróbico)';
const thursdayDuration = 50;
const thursdayNotes = `CROSSFIT BOX · STEADY (Capacidad Aeróbica & Condicionamiento · RPE 6-7):
- 🟢 Calentamiento & Movilidad: 8-10 min movilidad de tobillos, apertura de cadera y pedaleo progresivo en Air Bike.
- ⚡ WOD "Freedom" Rx (AMRAP 24:00 min):
  • 200 m Run
  • 20 Calorías Air Bike (16 cal chicas)
  • 400 m Run
  • 20 Calorías Air Bike
  • 600 m Run
  • 20 Calorías Air Bike
  • (Cada 100m de carrera = 1 rep · Puntuación: Rondas + Repeticiones).
- ⚠️ ADAPTACIÓN FISIOTERAPIA & PREPARADOR:
  • Trabajo enfocado en "Motor Aeróbico" (Steady State / Z2-Z3 controlada).
  • No convertir la Air Bike en un sprint láctico anaeróbico (mantén cadencia regular y respiración rítmica, RPE 6-7).
  • En la carrera, zancada fluida, buscando economía de carrera sin golpear el talón. Cero impacto de barra pesada, lo que deja tus piernas libres de agujetas para el fin de semana.
- 🔵 Vuelta a la Calma: 5 min pedaleo regenerativo suave en bici estática/Air Bike (<30 RPM) + estiramientos de cuádriceps, psoas y gemelos.
- 🥗 Estrategia Nutrición (Media Mañana / Tarde):
  • Si vas a las 19:00h (habitual): Comida equilibrada a las 13:30h. Merienda a las 17:15h: 3 tortitas de maíz/arroz con mermelada o dulce de membrillo + agua. Hidratación constante durante la tarde. Cero frutos secos.
  • Cena post-entreno: Buena ración de carbohidratos (patata asada, boniato o arroz) + pescado blanco o pollo para reponer glucógeno y afrontar el descanso del viernes.
- 🧠 Enfoque Psicológico & Tip Mental: El Poder del Ritmo Crucero: "Steady" significa constante. Encuentra una velocidad en la bici y en la carrera que puedas sostener durante los 24 minutos exactos sin caídas de rendimiento ni jadeo agónico.`;

async function updateDb(dbPath) {
  console.log(`Actualizando base de datos en: ${dbPath}`);
  const db = createClient({ url: `file:${dbPath}` });

  // Update Tuesday 2026-11-17
  await db.execute({
    sql: `UPDATE sessions 
          SET planned_code = ?, duration_min = ?, notes = ?, updated_at = datetime('now')
          WHERE date = '2026-11-17' AND discipline = 'crossfit'`,
    args: [tuesdayCode, tuesdayDuration, tuesdayNotes]
  });

  // Update Thursday 2026-11-19
  await db.execute({
    sql: `UPDATE sessions 
          SET planned_code = ?, duration_min = ?, notes = ?, updated_at = datetime('now')
          WHERE date = '2026-11-19' AND discipline = 'crossfit'`,
    args: [thursdayCode, thursdayDuration, thursdayNotes]
  });

  const check = await db.execute({
    sql: `SELECT date, planned_code, duration_min FROM sessions WHERE date IN ('2026-11-17', '2026-11-19') ORDER BY date ASC`,
    args: []
  });
  console.log(`Verificación ${dbPath}:`, check.rows);
}

async function main() {
  await updateDb('data/entrenoapp.db');
  await updateDb('seed/entrenoapp.db');
  console.log('Sincronización dual completada con éxito.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
