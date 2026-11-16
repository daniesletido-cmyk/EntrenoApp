/**
 * Rutinas Express de Fisioterapia y Movilidad (10 min)
 * Diseñadas bajo el criterio del Fisioterapeuta Deportivo del Equipo Técnico
 */

export interface PhysioExercise {
  id: string;
  name: string;
  durationSec: number;
  repsOrSets?: string;
  side?: "ambos" | "derecha" | "izquierda" | "alterno";
  instructions: string;
  physioTip: string;
  muscleGroup: string;
}

export interface PhysioRoutine {
  id: "descarga-post-series" | "movilidad-pre-rodaje" | "aquiles-fascia";
  title: string;
  shortTitle: string;
  durationMinutes: number;
  badge: string;
  targetArea: string;
  description: string;
  recommendedWhen: string;
  triggerKeywords: string[];
  exercises: PhysioExercise[];
}

export const PHYSIO_ROUTINES: PhysioRoutine[] = [
  {
    id: "descarga-post-series",
    title: "Descarga de Piernas Post-Series (10 min)",
    shortTitle: "Descarga Post-Series",
    durationMinutes: 10,
    badge: "Recuperación Activa",
    targetArea: "Isquiotibiales, Cuádriceps y Sóleos",
    description: "Rutina miofascial y de drenaje circulatorio diseñada para acelerar la eliminación de metabolitos y relajar el tono muscular tras series R3/R4 o tiradas en Zuera.",
    recommendedWhen: "Tras entrenamientos intensos de series, cambios de ritmo o RPE >= 7",
    triggerKeywords: ["series", "umbral", "r3", "r4", "fatiga", "pesadez", "pesadas", "cansancio", "tirada"],
    exercises: [
      {
        id: "d1",
        name: "Auto-liberación miofascial de gemelos y sóleo",
        durationSec: 90,
        repsOrSets: "45s cada pierna",
        side: "alterno",
        instructions: "Sentado en el suelo con rodillo o manos, aplica presión lenta desde el tendón hacia el hueco poplíteo, deteniéndote en puntos gatillo.",
        physioTip: "Respira hondo al encontrar un punto tenso; el suspiro fisiológico relaja el tono simpático.",
        muscleGroup: "Sóleo y Gemelos",
      },
      {
        id: "d2",
        name: "Descarga de cuádriceps y tensor de la fascia lata",
        durationSec: 90,
        repsOrSets: "45s cada pierna",
        side: "alterno",
        instructions: "Boca abajo, rueda suavemente la cara anterior y lateral del muslo sin presionar directamente sobre la rótula.",
        physioTip: "Evita presionar el hueso de la cadera; céntrate en el vientre muscular del vasto externo.",
        muscleGroup: "Cuádriceps y Cintilla",
      },
      {
        id: "d3",
        name: "Estiramiento activo de cadena posterior con toalla",
        durationSec: 90,
        repsOrSets: "45s cada pierna",
        side: "alterno",
        instructions: "Tumbado boca arriba, sujeta una toalla bajo el antepié y eleva la pierna con rodilla semiflexionada hasta notar tensión suave.",
        physioTip: "No bloquees la rodilla; la microflexión protege la inserción isquiática en el isquion.",
        muscleGroup: "Isquiotibiales",
      },
      {
        id: "d4",
        name: "Apertura pélvica en mariposa asistida",
        durationSec: 90,
        repsOrSets: "Sostenido con respiración diafragmática",
        side: "ambos",
        instructions: "Junta las plantas de los pies, deja caer las rodillas hacia los lados y exhala suavemente bajando el pecho.",
        physioTip: "Alivia la tensión acumulada en los aductores y estabiliza el pubis.",
        muscleGroup: "Aductores y Pelvis",
      },
      {
        id: "d5",
        name: "Drenaje venoso: Piernas elevadas en pared (Viparita Karani)",
        durationSec: 120,
        repsOrSets: "2 min de relajación pasiva",
        side: "ambos",
        instructions: "Acerca los glúteos a la pared y apoya las piernas en vertical a 90°. Brazos en cruz y respiraciones nasales profundas.",
        physioTip: "Acelera el retorno venoso y linfático, disminuyendo la sensación de piernas hinchadas.",
        muscleGroup: "Retorno Venoso Global",
      },
    ],
  },
  {
    id: "movilidad-pre-rodaje",
    title: "Movilidad de Cadera y Tobillo Pre-Rodaje (10 min)",
    shortTitle: "Movilidad Pre-Rodaje",
    durationMinutes: 10,
    badge: "Activación Dinámica",
    targetArea: "Complejo Tobillo-Pie, Flexores y Glúteo",
    description: "Desbloquea el rango articular de dorsiflexión de tobillo y extensión de cadera antes de calzar zapatillas para correr en Zuera.",
    recommendedWhen: "Antes de cualquier sesión de running matutina o tras pasar horas sentado",
    triggerKeywords: ["cadera", "tobillo", "rigidez", "agarrotado", "calentamiento", "frio", "mañana"],
    exercises: [
      {
        id: "m1",
        name: "Dorsiflexión dinámica de tobillo en pared (Knee-to-Wall)",
        durationSec: 90,
        repsOrSets: "10 rebotes controlados por pierna",
        side: "alterno",
        instructions: "Coloca el pie a 8-10 cm de la pared y lleva la rodilla hacia delante sin despegar el talón del suelo.",
        physioTip: "Ganar 2 cm de dorsiflexión reduce un 30% la sobrecarga en la fascia plantar al correr.",
        muscleGroup: "Tobillo y Tendón de Aquiles",
      },
      {
        id: "m2",
        name: "Círculos articulares y eversión/inversión de tobillo",
        durationSec: 60,
        repsOrSets: "30s por lado",
        side: "alterno",
        instructions: "De pie o sentado, traza círculos amplios y lentos con la punta del pie en ambos sentidos.",
        physioTip: "Estimula la secreción de líquido sinovial en la articulación tibio-tarsiana.",
        muscleGroup: "Articulación del Tobillo",
      },
      {
        id: "m3",
        name: "Apertura de cadera 90/90 en suelo",
        durationSec: 90,
        repsOrSets: "45s por lado",
        side: "alterno",
        instructions: "Sentado en el suelo, flexiona ambas piernas a 90° (una delante y otra detrás). Cambia de lado rotando las rodillas sin usar las manos.",
        physioTip: "Clave para liberar la cápsula articular de la cadera y optimizar la extensión de zancada.",
        muscleGroup: "Rotadores de Cadera",
      },
      {
        id: "m4",
        name: "Estocada dinámica del 'Mayor Estiramiento del Mundo'",
        durationSec: 90,
        repsOrSets: "5 repeticiones por pierna con torsión",
        side: "alterno",
        instructions: "Paso largo hacia delante, apoya las manos dentro del pie adelantado y gira el tronco mirando al techo.",
        physioTip: "Moviliza tobillo, psoas y columna torácica en un único patrón funcional de carrera.",
        muscleGroup: "Psoas, Cuádriceps y Tórax",
      },
      {
        id: "m5",
        name: "Puente de glúteo unipodal con activación isquiosural",
        durationSec: 90,
        repsOrSets: "10 elevaciones por pierna (2s pausa arriba)",
        side: "alterno",
        instructions: "Tumbado boca arriba con una pierna estirada en el aire, empuja el suelo con el talón apoyado elevando la pelvis.",
        physioTip: "Despierta el glúteo mayor para evitar que los isquios asuman toda la propulsión.",
        muscleGroup: "Glúteo Mayor y Core",
      },
    ],
  },
  {
    id: "aquiles-fascia",
    title: "Prevención de Tendón de Aquiles y Fascia Plantar (10 min)",
    shortTitle: "Aquiles & Fascia Plantar",
    durationMinutes: 10,
    badge: "Terapia Preventiva",
    targetArea: "Fascia Plantar, Sóleo y Tendón de Aquiles",
    description: "Protocolo clínico excéntrico y de flexión plantar basado en la evidencia Rathleff para blindar el tríceps sural frente al impacto continuado.",
    recommendedWhen: "Si notas tirantez en el talón por la mañana, sobrecarga en sóleo o acumulas tiradas largas",
    triggerKeywords: ["aquiles", "talon", "fascia", "plantar", "soleo", "sobrecarga", "gemelo", "tirantez"],
    exercises: [
      {
        id: "a1",
        name: "Liberación miofascial con pelota dura bajo el arco plantar",
        durationSec: 90,
        repsOrSets: "45s cada pie",
        side: "alterno",
        instructions: "De pie o sentado, pisa una pelota rígida (tenis o lacrosse) y rueda despacio desde el talón hasta las cabezas de los metatarsos.",
        physioTip: "Aplica presión moderada pero tolerable; el objetivo es elastificar el tejido colágeno engrosado.",
        muscleGroup: "Fascia Plantar",
      },
      {
        id: "a2",
        name: "Protocolo Rathleff: Elevación excéntrica de talón con toalla",
        durationSec: 120,
        repsOrSets: "10 repeticiones lentas por pierna (3s subida, 2s pausa, 3s bajada)",
        side: "alterno",
        instructions: "En el borde de un escalón, enrolla una toalla bajo los dedos del pie para forzar dorsiflexión de las falanges y baja el talón lentamente.",
        physioTip: "El estímulo de alta carga lenta (HSR) es el único con evidencia para regenerar la síntesis de colágeno en la fascia.",
        muscleGroup: "Fascia Plantar y Sóleo",
      },
      {
        id: "a3",
        name: "Descenso excéntrico de sóleo con rodilla flexionada",
        durationSec: 90,
        repsOrSets: "8 repeticiones lentas por pierna",
        side: "alterno",
        instructions: "En el escalón, mantén la rodilla doblada a 20-30° mientras dejas caer el talón por debajo del escalón.",
        physioTip: "Flexionar la rodilla anula el gemelo y dirige el 100% de la carga al sóleo y al tendón de Aquiles profundo.",
        muscleGroup: "Sóleo y Aquiles",
      },
      {
        id: "a4",
        name: "Estiramiento del flexor largo del primer dedo (hallux)",
        durationSec: 90,
        repsOrSets: "45s por pie",
        side: "alterno",
        instructions: "Apoya los dedos del pie flexionados hacia arriba contra la pared o suelo con el talón apoyado, empujando suavemente hacia delante.",
        physioTip: "Un primer dedo rígido traslada el estrés del despegue al tendón de Aquiles.",
        muscleGroup: "Flexor del Hallux",
      },
      {
        id: "a5",
        name: "Isometric Hold de Sóleo en apoyo monopodal",
        durationSec: 90,
        repsOrSets: "45s cada pierna en elevación fija",
        side: "alterno",
        instructions: "De pie en un solo pie, eleva el talón 3-4 cm y mantén la posición estática sin oscilar.",
        physioTip: "La contracción isométrica inhibe el dolor tendinoso y aporta analgesia mecánica inmediata.",
        muscleGroup: "Estabilidad de Tobillo y Sóleo",
      },
    ],
  },
];

/**
 * Detecta qué rutina preventiva es la más adecuada según las sensaciones de Suunto o el Readiness
 */
export function getRecommendedPhysioRoutine(params: {
  readinessScore?: number | null;
  suuntoNotes?: string | null;
  userNotes?: string | null;
  rpe?: number | null;
}): PhysioRoutine {
  const combinedNotes = `${params.suuntoNotes || ""} ${params.userNotes || ""}`.toLowerCase();

  // 1. Si menciona Aquiles, talón, fascia o sóleo -> Rutina Aquiles
  if (
    combinedNotes.includes("aquiles") ||
    combinedNotes.includes("fascia") ||
    combinedNotes.includes("talon") ||
    combinedNotes.includes("talón") ||
    combinedNotes.includes("soleo") ||
    combinedNotes.includes("sóleo")
  ) {
    return PHYSIO_ROUTINES[2]; // aquiles-fascia
  }

  // 2. Si menciona series, tirada, pesadez, RPE >= 7 o fatiga post-entreno -> Descarga post-series
  if (
    combinedNotes.includes("series") ||
    combinedNotes.includes("pesadez") ||
    combinedNotes.includes("pesadas") ||
    combinedNotes.includes("fatiga") ||
    combinedNotes.includes("sobrecarga") ||
    (params.rpe && params.rpe >= 7)
  ) {
    return PHYSIO_ROUTINES[0]; // descarga-post-series
  }

  // 3. Por defecto, si el Readiness es bajo o se busca movilidad -> Movilidad pre-rodaje
  if (params.readinessScore && params.readinessScore < 75) {
    return PHYSIO_ROUTINES[0]; // descarga activa
  }

  return PHYSIO_ROUTINES[1]; // movilidad-pre-rodaje
}
