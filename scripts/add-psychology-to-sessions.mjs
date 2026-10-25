import { DatabaseSync } from "node:sqlite";

// Catálogo de estrategias y tips de psicología deportiva profesional
const PSYCHO_TIPS = {
  // Tirada Larga (R5 / Maratón)
  long_run: [
    "Estrategia de 'Chunking' (Fragmentación mental): No corras la distancia completa en tu cabeza; divídela en micro-bloques de 4 km. La mente se satura anticipando fatiga lejana, pero siempre tiene energía para completar los próximos 15 minutos.",
    "Gobernador Central de Noakes: Cuando hacia el final sientas ganas de aflojar, recuerda que el cerebro genera alarma y fatiga al 60% de tu capacidad fisiológica real para protegerte. No es tu límite físico, es una sugerencia de tu mente. Respira profundo y mantén el paso.",
    "Atención Disociativa vs. Asociativa: En los tramos llanos y fáciles, desconecta la cabeza (música, paisaje, mente libre); en las cuestas o cuando cueste, cambia a 'atención asociativa' interna: escanea postura, hombros bajos, pisada ágil y cadencia viva.",
    "La Regla de los 10 Minutos para la pereza: Si antes de salir la mente te pone excusas (pesadez, frío, dudas), negocia: 'Solo salgo 10 minutos y si sigo mal, vuelvo'. En el 99% de los casos, la dopamina y la circulación rompen la inercia y completas la sesión.",
    "Visualización del Retiro: En los últimos kilómetros exigentes, recrea mentalmente la subida de Alfonso XII hacia la meta del Maratón de Madrid. Asocia el cansancio muscular de hoy con la recompensa de cruzar la meta.",
    "Aceptación del Aburrimiento: En tiradas de volumen, el cerebro busca estímulos rápidos. Acepta el ritmo monótono como un entrenamiento de resiliencia cognitiva; la paciencia es el arma secreta del maratoniano.",
    "Anclaje de Zancada Rítmica: Cuando la fatiga mental aparezca, sincroniza tu respiración en 3 pasos inhalando y 2 exhalando. Contar respiraciones bloquea los pensamientos intrusivos de abandono."
  ],

  // Intervalos / Umbral (R3 / Series / Fartlek)
  intervals: [
    "Aceptación del Lactato (ACT en el Deporte): El ardor muscular y la falta de aire no son señales de peligro ni de fallo; son la evidencia biológica de que tu umbral se está expandiendo. Saluda a la incomodidad y no luches mentalmente contra ella.",
    "Micro-Enfoque 'Solo esta serie': Prohibido pensar en cuántas series te quedan en el entrenamiento. En tu mente solo existe la repetición actual. El resto del entreno no existe hasta que suene el reloj.",
    "Suspiro Fisiológico de Huberman en los descansos: Durante la recuperación, haz 2 inhalaciones rápidas por la nariz y una exhalación lenta y prolongada por la boca. Esto resetea el sistema nervioso parasimpático y baja las pulsaciones 10-15 lpm más rápido.",
    "Diálogo Interno Técnico e Instructivo: Sustituye pensamientos derrotistas ('no aguanto este ritmo') por comandos operativos concretos: 'pecho abierto', 'cadencia alta', 'rodilla adelante', 'empuja el suelo'. La mente obedece órdenes mecánicas.",
    "El efecto 'Finisher': En los últimos 200 metros de cada serie, cuando el cuerpo pide frenar, adelanta ligeramente el centro de gravedad y bracea con más intención. Entrenas a tu cerebro a acelerar donde otros claudican.",
    "Desensibilización al Esfuerzo Máximo: Recuerda que la sensación de agonía en una serie dura solo unos minutos, pero la confianza que deja en tu autoconcepto como atleta dura semanas."
  ],

  // Cuestas / Potencia Mecánica
  hills: [
    "Foco en el Esfuerzo, no en el Reloj: En las cuestas, mirar el ritmo por kilómetro solo genera frustración. Enfócate en el esfuerzo percibido (RPE) y en la cadencia rápida; el reloj no sabe medir la gravedad.",
    "Metáfora del Resorte: Visualiza tus tendones de Aquiles como resortes elásticos que te devuelven energía gratis en cada impacto contra la pendiente. La biomecánica positiva reduce la fatiga percibida.",
    "La Cima no es el Final: No aflojes justo al coronar la cuesta; entrena a tu mente a dar 5 zancadas vivas tras la pendiente. Ahí es donde marcas la diferencia psicológica sobre el resto."
  ],

  // Rodaje Progresivo / Tempo (R2)
  tempo: [
    "Sensación de 'Crucero Controlado': El objetivo mental en R2 es sentir que llevas una marcha más guardada en el bolsillo. Ruedas firme y rápido pero sin llegar a la desesperación del umbral.",
    "Chequeo de Tensión Innecesaria: Cada 10 minutos, escanea mandíbula, cuello y manos. Si estás apretando los puños o los dientes, estás derrochando glucógeno valioso. Relaja el rostro y sonríe ligeramente."
  ],

  // Rodajes Suaves / Regenerativos (R1 / R0)
  easy_run: [
    "Disciplina del Ego (Saber ir lento): Rodar despacio exige más madurez mental que rodar rápido. El atleta novato se deja llevar por el orgullo del ritmo; el profesional sabe que el rodaje regenerativo construye los capilares que le harán volar en competición.",
    "Mindfulness en Carrera: Conecta con el placer del movimiento sin presiones. Siente el viento, la respiración suave y la ligereza de piernas. Entrenar el disfrute es el mejor antídoto contra el burnout deportivo.",
    "Gratitud y Perspectiva: Dedica los primeros kilómetros a agradecer a tu cuerpo la capacidad de sumar salud y kilómetros. La mentalidad de gratitud reduce los niveles de cortisol en sangre."
  ],

  // CrossFit Fuerza
  crossfit_strength: [
    "Foco Externo en Levantamientos: En sentadillas o peso muerto pesados, no pienses en la tensión de tus cuádriceps; piensa en 'hundir los talones en el cemento' o 'empujar el suelo lejos de ti'. El foco atencional externo aumenta el reclutamiento motor hasta un 12%.",
    "Ritual Pre-Levantamiento: Diseña una rutina fija de 5 segundos antes de tocar la barra (tiza, 2 respiraciones diafragmáticas, fijar la mirada al frente). La rutina da seguridad y silencia las dudas previas al esfuerzo.",
    "Control de la Respiración Valsalva: Bloquea el aire en el core antes de bajar y expulsa con potencia al superar el punto de estancamiento. La solidez física refuerza la convicción mental."
  ],

  // CrossFit WOD / Metcon
  crossfit_wod: [
    "La Regla de los 3 Segundos en las Transiciones: El cerebro intentará convencerte de parar a respirar frente a la barra o el cajón. Cuenta mentalmente '3, 2, 1' y arranca. La indecisión cansa más que la propia repetición.",
    "Modulación del Pánico Láctico: En los WODs asfixiantes, el cerebro interpreta el pulso alto como peligro. Mantén la mirada fija en un punto neutro, no mires al suelo con hombros caídos (lenguaje corporal de derrota) y respira con ritmo mecánico.",
    "Divide las Series Grandes: Si tocan 20 repeticiones, no mires el 20. Di a tu cabeza: 'Hago 8, respiro 3 segundos, hago 7 y remato con 5'. Fragmentar tareas neutraliza la sensación de inmensidad."
  ],

  // Natación
  swimming: [
    "Aislamiento Sensorial y Calma Mental: El agua es tu cámara de descompresión. El sonido rítmico del agua y las burbujas actúa como un metrónomo meditativo; úsalo para vaciar la sobrecarga mental del día.",
    "Fluir en vez de Pelear: En el agua no gana quien más fuerza aplica, sino quien menos resistencia genera. Si te notas tenso o peleando con la brazada, baja un punto la fuerza y alarga el deslizamiento con el dorsal.",
    "Conexión Cuerpo-Mente sin Impacto: Aprovecha la ingravidez para liberar la tensión psicológica de la articulación y la pisada de asfalto. Nada con sensación de ingravidez y soltura."
  ],

  // Descanso / Movilidad
  rest_day: [
    "Desactivación de la Culpa del Atleta: Tu cuerpo no mejora mientras entrenas; mejora mientras descansas y asimila la carga. Hoy estás construyendo mitocondrias y regenerando glucógeno tan activamente como en una tirada larga.",
    "Tolerancia a la Quietud: Saber parar requiere tanta autodisciplina como salir a correr lloviendo. Quien no programa el descanso a tiempo, su cuerpo le obligará a descansar por lesión cuando no quiera.",
    "Visualización Guiada del Maratón: Dedica 5 minutos de hoy a cerrar los ojos y visualizarte con dorsal, corriendo cómodo en Gran Vía y cruzando la meta del Maratón de Madrid. La mente no distingue entre experiencia vívida y realidad."
  ],

  // Días previos / Taper / Competición
  taper: [
    "Gestión de los 'Fantasmas del Taper': Cuando bajes volumen las semanas previas a Madrid, tu mente inventará dolores y te hará dudar de tu estado de forma. Es un proceso neurobiológico normal. Confía en los cientos de kilómetros acumulados.",
    "Control de Factores Propios (Círculo de Control): Puedes controlar tu ritmo, tu desayuno y tus geles; no puedes controlar el viento, la lluvia ni a los demás corredores. Enfoca el 100% de tu energía mental solo en lo que depende de ti."
  ]
};

// Función para seleccionar el mejor tip psicológico según la disciplina y código del entreno
function pickPsychologyTip(session, index) {
  const d = session.discipline;
  const p = (session.planned_code || "").toLowerCase();
  const n = (session.notes || "").toLowerCase();

  if (d === "descanso") {
    return PSYCHO_TIPS.rest_day[index % PSYCHO_TIPS.rest_day.length];
  }
  if (d === "natacion") {
    return PSYCHO_TIPS.swimming[index % PSYCHO_TIPS.swimming.length];
  }
  if (d === "crossfit") {
    if (p.includes("fuerza") || p.includes("deadlift") || p.includes("squat") || p.includes("press")) {
      return PSYCHO_TIPS.crossfit_strength[index % PSYCHO_TIPS.crossfit_strength.length];
    }
    return PSYCHO_TIPS.crossfit_wod[index % PSYCHO_TIPS.crossfit_wod.length];
  }
  if (d === "carrera") {
    if (session.is_long_run || p.includes("r5") || p.includes("tirada") || p.includes("maratón") || p.includes("maraton") || (session.distance_km && session.distance_km >= 12)) {
      return PSYCHO_TIPS.long_run[index % PSYCHO_TIPS.long_run.length];
    }
    if (p.includes("r3") || p.includes("series") || p.includes("intervalos") || p.includes("umbral") || p.includes("fartlek")) {
      return PSYCHO_TIPS.intervals[index % PSYCHO_TIPS.intervals.length];
    }
    if (p.includes("cuesta") || p.includes("desnivel") || p.includes("potencia")) {
      return PSYCHO_TIPS.hills[index % PSYCHO_TIPS.hills.length];
    }
    if (p.includes("r2") || p.includes("progresivo") || p.includes("tempo")) {
      return PSYCHO_TIPS.tempo[index % PSYCHO_TIPS.tempo.length];
    }
    return PSYCHO_TIPS.easy_run[index % PSYCHO_TIPS.easy_run.length];
  }
  return PSYCHO_TIPS.easy_run[index % PSYCHO_TIPS.easy_run.length];
}

// Actualizar bases de datos
for (const dbPath of ["data/entrenoapp.db", "seed/entrenoapp.db"]) {
  const db = new DatabaseSync(dbPath);
  const sessions = db.prepare("SELECT id, date, discipline, planned_code, is_long_run, distance_km, notes FROM sessions WHERE date >= '2026-10-25' ORDER BY date ASC").all();

  console.log(`Processing ${sessions.length} sessions in ${dbPath}...`);

  const updateStmt = db.prepare("UPDATE sessions SET notes = ? WHERE id = ?");

  let updatedCount = 0;
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    let notes = s.notes || "";

    // Evitar duplicar si ya tiene sección de psicología
    if (notes.includes("Enfoque Psicológico") || notes.includes("Psicología Deportiva")) {
      // Reemplazar la existente con una limpia
      notes = notes.replace(/- Enfoque Psicológico[^\n]*\n?/g, "").trim();
      notes = notes.replace(/🧠 CLAVE DE PSICOLOGÍA DEPORTIVA[^\n]*\n?/g, "").trim();
    }

    const tip = pickPsychologyTip(s, i);
    const psychoBullet = `- Enfoque Psicológico & Tip Mental: ${tip}`;

    // Insertar justo antes de la vuelta a la calma si existe, o al final
    let newNotes = "";
    if (notes.includes("- Vuelta a la calma:")) {
      newNotes = notes.replace("- Vuelta a la calma:", `${psychoBullet}\n- Vuelta a la calma:`);
    } else if (notes.includes("3. VUELTA A LA CALMA")) {
      newNotes = notes.replace("3. VUELTA A LA CALMA", `${psychoBullet}\n\n3. VUELTA A LA CALMA`);
    } else {
      newNotes = notes ? `${notes}\n${psychoBullet}` : psychoBullet;
    }

    updateStmt.run(newNotes, s.id);
    updatedCount++;
  }

  console.log(`Updated ${updatedCount} sessions in ${dbPath} with sports psychology tips.`);
}
