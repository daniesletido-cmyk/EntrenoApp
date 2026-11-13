import type { SessionRow } from "@/lib/repo/sessions";

export interface StructuredStep {
  label: string;
  phase: "warmup" | "active" | "rest" | "cooldown";
  durationType: "distance" | "time";
  /** Metros si durationType === 'distance'; segundos si durationType === 'time' */
  durationValue: number;
  repeatCount?: number;
  /** Ritmo en segundos por km (ej: 258 = 4:18/km) para target min/max */
  targetPaceLowSecKm?: number;
  targetPaceHighSecKm?: number;
  /** Texto compatible con Intervals.icu Workout Builder */
  intervalsLine: string;
}

export interface BuiltStructuredWorkout {
  name: string;
  sportTypeIntervals: "Run" | "Swim" | "WeightTraining" | "Ride" | "Walk" | "Rowing" | "Workout";
  suuntoSportId: number;
  externalId: string;
  startDateLocal: string;
  intervalsDescription: string;
  steps: StructuredStep[];
  suuntoGuidePayload: {
    name: string;
    sport: string;
    scheduledDate: string;
    externalId: string;
    description: string;
    steps: Array<{
      order: number;
      name: string;
      intensity: "warmup" | "active" | "rest" | "cooldown";
      durationType: "distance" | "time";
      durationValue: number;
      targetType: "speed" | "open";
      targetSpeedMinMs?: number;
      targetSpeedMaxMs?: number;
    }>;
  };
}

function paceToSecKm(paceStr: string): number | null {
  const m = paceStr.match(/(\d):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function secKmToSpeedMs(secKm: number): number {
  return Number((1000 / Math.max(120, secKm)).toFixed(3));
}

function parseMainDistanceKm(s: SessionRow): number {
  const combined = `${s.planned_code ?? ""} ${s.notes ?? ""}`;
  const mainMatch = combined.match(/Parte\s+principal\s*\((\d+(?:[.,]\d+)?)\s*km/i);
  if (mainMatch) {
    return parseFloat(mainMatch[1].replace(",", "."));
  }
  const titleKm = (s.planned_code ?? "").match(/(\d+(?:[.,]\d+)?)\s*k(?:m|\b)/i);
  if (titleKm) {
    return parseFloat(titleKm[1].replace(",", "."));
  }
  if (s.distance_km && s.distance_km >= 4) {
    const wu = s.distance_km >= 15 ? 2 : s.distance_km >= 10 ? 1.5 : 1;
    const cd = s.distance_km >= 15 ? 1.5 : 1;
    return Math.max(3, Number((s.distance_km - wu - cd).toFixed(1)));
  }
  return 8;
}

export function buildStructuredWorkoutForSession(s: SessionRow): BuiltStructuredWorkout {
  const externalId = `entrenoapp-session-${s.id}`;
  const name = s.planned_code ? s.planned_code.slice(0, 80) : `EntrenoApp · ${s.discipline}`;
  const startDateLocal = `${s.date}T08:00:00`;
  const steps: StructuredStep[] = [];
  const textAll = `${s.planned_code ?? ""}\n${s.notes ?? ""}`;
  const lower = textAll.toLowerCase();

  let sportTypeIntervals: BuiltStructuredWorkout["sportTypeIntervals"] = "Workout";
  let suuntoSportId = 1; // 1 = running in FIT
  const intervalsBlocks: string[] = [];

  if (s.discipline === "carrera") {
    sportTypeIntervals = "Run";
    suuntoSportId = 1;

    const mainKm = parseMainDistanceKm(s);
    // Calentamiento y Vuelta a la Calma programados estrictamente por tiempo (minutos)
    const wuMin = mainKm >= 15 ? 15 : mainKm >= 10 ? 12 : 10;
    const cdMin = mainKm >= 15 ? 10 : 8;
    const wuSec = wuMin * 60;
    const cdSec = cdMin * 60;

    // 1. Calentamiento (Regla de Oro: por tiempo en segundos, intensidad warmup)
    steps.push({
      label: `Calentamiento ${wuMin} min`,
      phase: "warmup",
      durationType: "time",
      durationValue: wuSec,
      targetPaceLowSecKm: 330, // 5:30/km
      targetPaceHighSecKm: 345, // 5:45/km
      intervalsLine: `- Calentamiento R0 ${wuMin}m 5:30-5:45/km Pace`,
    });
    intervalsBlocks.push(`Warmup\n- Calentamiento R0 ${wuMin}m 5:30-5:45/km Pace`);

    // 2. Detección de tipo de parte principal
    const intervalMatch = textAll.match(/(\d+)\s*[xX]\s*(\d+(?:\.\d{3})?|\d+(?:[.,]\d+)?)\s*(m|km)\b/i);
    if (intervalMatch && (lower.includes("r3") || lower.includes("interval") || lower.includes("serie") || lower.includes("umbral"))) {
      const reps = Math.min(20, Math.max(1, parseInt(intervalMatch[1], 10)));
      const rawUnitVal = parseFloat(intervalMatch[2].replace(/\./g, "").replace(",", "."));
      const isMeters = intervalMatch[3].toLowerCase() === "m";
      const repDistM = isMeters ? rawUnitVal : rawUnitVal * 1000;
      const repLabel = repDistM >= 1000 ? `${(repDistM / 1000).toFixed(2).replace(/\.00$/, "")}km` : `${Math.round(repDistM)}mtr`;

      const paceRange = textAll.match(/(\d:\d{2})\s*[-–]\s*(\d:\d{2})/);
      const pLow = paceRange ? paceToSecKm(paceRange[1]) ?? 258 : 258; // 4:18
      const pHigh = paceRange ? paceToSecKm(paceRange[2]) ?? 260 : 260; // 4:20
      const paceLabel = paceRange ? `${paceRange[1]}-${paceRange[2]}/km` : "4:18-4:20/km";

      for (let r = 0; r < reps; r++) {
        steps.push({
          label: `Serie ${r + 1}/${reps} Umbral`,
          phase: "active",
          durationType: "distance",
          durationValue: Math.round(repDistM),
          targetPaceLowSecKm: pLow,
          targetPaceHighSecKm: pHigh,
          intervalsLine: `- Serie Umbral ${repLabel} ${paceLabel} Pace`,
        });
        steps.push({
          label: `Recuperación activa ${r + 1}`,
          phase: "rest",
          durationType: "time",
          durationValue: 90,
          targetPaceLowSecKm: 350,
          targetPaceHighSecKm: 375,
          intervalsLine: `- Trote suave 90s 5:50-6:15/km Pace`,
        });
      }

      intervalsBlocks.push(`Main Set ${reps}x\n- Serie Umbral ${repLabel} ${paceLabel} Pace\n- Trote recuperacion 90s 5:50-6:15/km Pace`);
    } else if (lower.includes("cuesta")) {
      const reps = 8;
      for (let r = 0; r < reps; r++) {
        steps.push({
          label: `Cuesta explosiva ${r + 1}`,
          phase: "active",
          durationType: "time",
          durationValue: 30,
          intervalsLine: `- Cuesta fuerte 30s`,
        });
        steps.push({
          label: `Bajada caminando ${r + 1}`,
          phase: "rest",
          durationType: "time",
          durationValue: 90,
          intervalsLine: `- Bajada caminando 90s`,
        });
      }
      intervalsBlocks.push(`Main Set ${reps}x\n- Cuesta explosiva 30s\n- Bajada caminando 90s`);
    } else if (lower.includes("r5") || lower.includes("tirada larga") || mainKm >= 14) {
      const finishKm = Math.min(4, Math.max(3, Math.round(mainKm * 0.25)));
      const baseKm = Number((mainKm - finishKm).toFixed(1));

      steps.push({
        label: `Rodaje Aeróbico ${baseKm} km`,
        phase: "active",
        durationType: "distance",
        durationValue: Math.round(baseKm * 1000),
        targetPaceLowSecKm: 310, // 5:10
        targetPaceHighSecKm: 325, // 5:25
        intervalsLine: `- Base aerobica ${baseKm}km 5:10-5:25/km Pace`,
      });
      steps.push({
        label: `Cierre Ritmo Maratón ${finishKm} km`,
        phase: "active",
        durationType: "distance",
        durationValue: Math.round(finishKm * 1000),
        targetPaceLowSecKm: 305, // 5:05
        targetPaceHighSecKm: 310, // 5:10
        intervalsLine: `- Ritmo Maraton ${finishKm}km 5:05-5:10/km Pace`,
      });

      intervalsBlocks.push(`Main Set\n- Base aerobica ${baseKm}km 5:10-5:25/km Pace\n- Cierre Maraton ${finishKm}km 5:05-5:10/km Pace`);
    } else if (lower.includes("r2") || lower.includes("tempo") || lower.includes("progresivo")) {
      steps.push({
        label: `Tempo R2 ${mainKm} km`,
        phase: "active",
        durationType: "distance",
        durationValue: Math.round(mainKm * 1000),
        targetPaceLowSecKm: 275, // 4:35
        targetPaceHighSecKm: 299, // 4:59
        intervalsLine: `- Bloque Tempo R2 ${mainKm}km 4:35-4:59/km Pace`,
      });
      intervalsBlocks.push(`Main Set\n- Bloque Tempo R2 ${mainKm}km 4:35-4:59/km Pace`);
    } else if (lower.includes("r0") || lower.includes("regenerativo")) {
      steps.push({
        label: `Regenerativo R0 ${mainKm} km`,
        phase: "active",
        durationType: "distance",
        durationValue: Math.round(mainKm * 1000),
        targetPaceLowSecKm: 325, // 5:25
        targetPaceHighSecKm: 345, // 5:45
        intervalsLine: `- Rodaje R0 ${mainKm}km 5:25-5:45/km Pace`,
      });
      intervalsBlocks.push(`Main Set\n- Rodaje R0 ${mainKm}km 5:25-5:45/km Pace`);
    } else {
      steps.push({
        label: `Rodaje Base R1 ${mainKm} km`,
        phase: "active",
        durationType: "distance",
        durationValue: Math.round(mainKm * 1000),
        targetPaceLowSecKm: 299, // 4:59
        targetPaceHighSecKm: 325, // 5:25
        intervalsLine: `- Rodaje Base R1 ${mainKm}km 4:59-5:25/km Pace`,
      });
      intervalsBlocks.push(`Main Set\n- Rodaje Base R1 ${mainKm}km 4:59-5:25/km Pace`);
    }

    // 3. Vuelta a la calma (programada estrictamente por tiempo en segundos)
    steps.push({
      label: `Vuelta a la calma ${cdMin} min`,
      phase: "cooldown",
      durationType: "time",
      durationValue: cdSec,
      targetPaceLowSecKm: 360,
      targetPaceHighSecKm: 420,
      intervalsLine: `- Vuelta a la calma ${cdMin}m 6:00-7:00/km Pace`,
    });
    intervalsBlocks.push(`Cooldown\n- Vuelta a la calma ${cdMin}m 6:00-7:00/km Pace`);
  } else if (s.discipline === "natacion") {
    sportTypeIntervals = "Swim";
    suuntoSportId = 5; // 5 = swimming in FIT
    const totalM = s.distance_km ? Math.round(s.distance_km * 1000) : 1900;
    const wuM = 350;
    const cdM = 150;
    const mainM = Math.max(400, totalM - wuM - cdM);

    steps.push({
      label: "Calentamiento piscina",
      phase: "warmup",
      durationType: "distance",
      durationValue: wuM,
      intervalsLine: `- Calentamiento crol/espalda ${wuM}mtr`,
    });
    steps.push({
      label: "Bloque principal Pull-Buoy & Técnica",
      phase: "active",
      durationType: "distance",
      durationValue: mainM,
      intervalsLine: `- Pull-Buoy + Tecnica ${mainM}mtr`,
    });
    steps.push({
      label: "Vuelta a la calma",
      phase: "cooldown",
      durationType: "distance",
      durationValue: cdM,
      intervalsLine: `- Nado suave ${cdM}mtr`,
    });

    intervalsBlocks.push(
      `Warmup\n- Calentamiento crol/espalda ${wuM}mtr\n\nMain Set\n- Bloque Pull-Buoy y Tecnica ${mainM}mtr\n\nCooldown\n- Nado suave ${cdM}mtr`
    );
  } else if (s.discipline === "crossfit" || s.discipline === "gimnasio") {
    sportTypeIntervals = "WeightTraining";
    suuntoSportId = 10; // training
    const totalMin = s.duration_min && s.duration_min >= 20 ? Math.round(s.duration_min) : 60;
    const wuSec = 10 * 60;
    const cdSec = 5 * 60;
    const mainSec = Math.max(15 * 60, (totalMin - 15) * 60);

    steps.push({
      label: "Calentamiento y Movilidad Box",
      phase: "warmup",
      durationType: "time",
      durationValue: wuSec,
      intervalsLine: `- Movilidad articular 10m`,
    });
    steps.push({
      label: s.planned_code ? s.planned_code.slice(0, 40) : "Fuerza + WOD",
      phase: "active",
      durationType: "time",
      durationValue: mainSec,
      intervalsLine: `- Bloque Fuerza + WOD ${Math.round(mainSec / 60)}m`,
    });
    steps.push({
      label: "Vuelta a la calma y estiramientos",
      phase: "cooldown",
      durationType: "time",
      durationValue: cdSec,
      intervalsLine: `- Estiramientos 5m`,
    });

    const cleanSummary = (s.notes || "")
      .replace(/^-\s*/gm, "")
      .slice(0, 600);
    intervalsBlocks.push(
      `Warmup\n- Movilidad y activacion 10m\n\nMain Set\n- Fuerza y WOD ${Math.round(mainSec / 60)}m\n\nCooldown\n- Vuelta a la calma 5m\n\n${cleanSummary}`
    );
  } else {
    sportTypeIntervals =
      s.discipline === "ciclismo" ? "Ride" : s.discipline === "remo" ? "Rowing" : s.discipline === "caminata" ? "Walk" : "Workout";
    suuntoSportId = s.discipline === "ciclismo" ? 2 : s.discipline === "caminata" ? 11 : 0;
    const durMin = s.duration_min && s.duration_min >= 10 ? Math.round(s.duration_min) : 30;
    steps.push({
      label: s.planned_code || s.discipline,
      phase: "active",
      durationType: "time",
      durationValue: durMin * 60,
      intervalsLine: `- ${s.planned_code || s.discipline} ${durMin}m`,
    });
    intervalsBlocks.push(`- ${s.planned_code || s.discipline} ${durMin}m`);
  }

  const intervalsDescription = intervalsBlocks.join("\n\n");

  const suuntoGuidePayload = {
    name,
    sport: sportTypeIntervals,
    scheduledDate: s.date,
    externalId,
    description: intervalsDescription,
    steps: steps.map((st, idx) => ({
      order: idx + 1,
      name: st.label,
      intensity: st.phase,
      durationType: st.durationType,
      durationValue: st.durationValue,
      targetType: st.targetPaceLowSecKm ? ("speed" as const) : ("open" as const),
      targetSpeedMinMs: st.targetPaceHighSecKm ? secKmToSpeedMs(st.targetPaceHighSecKm) : undefined,
      targetSpeedMaxMs: st.targetPaceLowSecKm ? secKmToSpeedMs(st.targetPaceLowSecKm) : undefined,
    })),
  };

  return {
    name,
    sportTypeIntervals,
    suuntoSportId,
    externalId,
    startDateLocal,
    intervalsDescription,
    steps,
    suuntoGuidePayload,
  };
}

/**
 * Calcula CRC-16 oficial del protocolo Garmin/Suunto .FIT
 */
function fitCrc16(buf: Uint8Array): number {
  const crcTable = [
    0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
    0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400,
  ];
  let crc = 0;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    let tmp = crcTable[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ crcTable[byte & 0xf];
    tmp = crcTable[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ crcTable[(byte >> 4) & 0xf];
  }
  return crc;
}

function encodeAsciiFixed(str: string | undefined | null, len: number): Buffer {
  const out = Buffer.alloc(len, 0);
  const clean = (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  out.write(clean.slice(0, len - 1), 0, "ascii");
  return out;
}

/**
 * Genera un archivo binario estándar .FIT tipo WORKOUT (File Type 5)
 * compatible con relojes Suunto y Garmin.
 */
export function buildStructuredWorkoutFitBuffer(s: SessionRow): Buffer {
  const built = buildStructuredWorkoutForSession(s);
  const chunks: Buffer[] = [];

  const pushDef = (localMsg: number, globalMsg: number, fields: Array<[number, number, number]>) => {
    const header = Buffer.alloc(6 + fields.length * 3);
    header[0] = 0x40 | (localMsg & 0x0f); // definition message
    header[1] = 0; // reserved
    header[2] = 0; // little-endian
    header.writeUInt16LE(globalMsg, 3);
    header[5] = fields.length;
    fields.forEach(([defNum, size, baseType], idx) => {
      header[6 + idx * 3] = defNum;
      header[6 + idx * 3 + 1] = size;
      header[6 + idx * 3 + 2] = baseType;
    });
    chunks.push(header);
  };

  // 1. file_id (global 0): type=5 (workout), manufacturer=23 (suunto), time_created
  pushDef(0, 0, [
    [0, 1, 0], // type (enum)
    [1, 2, 132], // manufacturer (uint16)
    [4, 4, 134], // time_created (uint32)
  ]);
  const fitEpochOffset = 631065600;
  const nowFitSec = Math.max(0, Math.floor(Date.now() / 1000) - fitEpochOffset);
  const fileIdData = Buffer.alloc(1 + 1 + 2 + 4);
  fileIdData[0] = 0;
  fileIdData[1] = 5; // workout file
  fileIdData.writeUInt16LE(23, 2); // 23 = Suunto
  fileIdData.writeUInt32LE(nowFitSec, 4);
  chunks.push(fileIdData);

  // 2. workout (global 26): sport(4), capabilities(5), num_valid_steps(6), wkt_name(8, 32 bytes)
  pushDef(1, 26, [
    [4, 1, 0], // sport (enum)
    [5, 4, 134], // capabilities (uint32z)
    [6, 2, 132], // num_valid_steps (uint16)
    [8, 32, 7], // wkt_name (string)
  ]);
  const wktData = Buffer.alloc(1 + 1 + 4 + 2 + 32);
  wktData[0] = 1;
  wktData[1] = built.suuntoSportId;
  wktData.writeUInt32LE(0x00000020, 2); // fitness equipment / speed capability
  wktData.writeUInt16LE(built.steps.length, 6);
  encodeAsciiFixed(built.name, 32).copy(wktData, 8);
  chunks.push(wktData);

  // 3. workout_step (global 27): message_index(254), wkt_step_name(0,24), duration_type(1), duration_value(2), target_type(3), custom_target_low(5), custom_target_high(6), intensity(7)
  pushDef(2, 27, [
    [254, 2, 132], // message_index
    [0, 24, 7], // wkt_step_name
    [1, 1, 0], // duration_type (0=time, 1=distance)
    [2, 4, 134], // duration_value (ms or cm)
    [3, 1, 0], // target_type (0=speed, 2=open)
    [5, 4, 134], // custom_target_value_low (mm/s)
    [6, 4, 134], // custom_target_value_high (mm/s)
    [7, 1, 0], // intensity (0=active, 1=rest, 2=warmup, 3=cooldown)
  ]);

  const intensityMap = { active: 0, rest: 1, warmup: 2, cooldown: 3 };
  built.steps.forEach((st, idx) => {
    const row = Buffer.alloc(1 + 2 + 24 + 1 + 4 + 1 + 4 + 4 + 1);
    row[0] = 2;
    row.writeUInt16LE(idx, 1);
    encodeAsciiFixed(st.label, 24).copy(row, 3);
    row[27] = st.durationType === "distance" ? 1 : 0; // FIT: 0=time(ms), 1=distance(cm)
    const durFitVal =
      st.durationType === "distance"
        ? Math.round(st.durationValue * 100) // meters -> cm
        : Math.round(st.durationValue * 1000); // sec -> ms
    row.writeUInt32LE(durFitVal, 28);

    const hasPaceTarget = st.targetPaceLowSecKm && st.targetPaceHighSecKm;
    row[32] = hasPaceTarget ? 0 : 2; // 0 = speed, 2 = open
    const speedLowMms = hasPaceTarget ? Math.round((1000 / st.targetPaceHighSecKm!) * 1000) : 0;
    const speedHighMms = hasPaceTarget ? Math.round((1000 / st.targetPaceLowSecKm!) * 1000) : 0;
    row.writeUInt32LE(speedLowMms, 33);
    row.writeUInt32LE(speedHighMms, 37);
    row[41] = intensityMap[st.phase] ?? 0;
    chunks.push(row);
  });

  const dataBody = Buffer.concat(chunks);
  const header = Buffer.alloc(14);
  header[0] = 14; // header size
  header[1] = 0x20; // protocol 2.0
  header.writeUInt16LE(2132, 2); // profile 21.32
  header.writeUInt32LE(dataBody.length, 4);
  header.write(".FIT", 8, "ascii");
  const headerCrc = fitCrc16(header.subarray(0, 12));
  header.writeUInt16LE(headerCrc, 12);

  const fileWithoutCrc = Buffer.concat([header, dataBody]);
  const fileCrc = Buffer.alloc(2);
  fileCrc.writeUInt16LE(fitCrc16(fileWithoutCrc), 0);

  return Buffer.concat([fileWithoutCrc, fileCrc]);
}
