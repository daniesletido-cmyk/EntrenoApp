export interface ExerciseCatalogItem {
  name: string;
  category: "Halterofilia" | "Fuerza & Powerlifting" | "Gimnásticos" | "Mancuernas" | "Kettlebells & Funcional" | "Ergómetros & Benchmarks" | "Accesorios";
  unit: "kg" | "reps" | "tiempo" | "cals";
}

export const EXERCISE_CATEGORIES = [
  "Todos",
  "Halterofilia",
  "Fuerza & Powerlifting",
  "Gimnásticos",
  "Mancuernas",
  "Kettlebells & Funcional",
  "Ergómetros & Benchmarks",
  "Accesorios",
] as const;

export const DEFAULT_EXERCISES: ExerciseCatalogItem[] = [
  // --- Halterofilia Olímpica ---
  { name: "Snatch / Arrancada", category: "Halterofilia", unit: "kg" },
  { name: "Power Snatch", category: "Halterofilia", unit: "kg" },
  { name: "Hang Snatch", category: "Halterofilia", unit: "kg" },
  { name: "Squat Snatch", category: "Halterofilia", unit: "kg" },
  { name: "Clean & Jerk / Dos Tiempos", category: "Halterofilia", unit: "kg" },
  { name: "Power Clean / Cargada de Fuerza", category: "Halterofilia", unit: "kg" },
  { name: "Squat Clean", category: "Halterofilia", unit: "kg" },
  { name: "Hang Power Clean", category: "Halterofilia", unit: "kg" },
  { name: "Hang Squat Clean", category: "Halterofilia", unit: "kg" },
  { name: "Split Jerk / Envite", category: "Halterofilia", unit: "kg" },
  { name: "Push Jerk", category: "Halterofilia", unit: "kg" },
  { name: "Push Press", category: "Halterofilia", unit: "kg" },
  { name: "Overhead Squat / Sentadilla de Arranque", category: "Halterofilia", unit: "kg" },
  { name: "Thruster con Barra", category: "Halterofilia", unit: "kg" },
  { name: "Cluster (Clean + Thruster)", category: "Halterofilia", unit: "kg" },

  // --- Fuerza & Powerlifting ---
  { name: "Sentadilla Trasera (Back Squat)", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Sentadilla Frontal (Front Squat)", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Sentadilla en Caja (Box Squat)", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Sentadilla Búlgara", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Peso Muerto Convencional (Deadlift)", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Peso Muerto Sumo", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Peso Muerto Rumano (RDL)", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Press de Banca (Bench Press)", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Press de Banca Inclinado", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Press Militar Estricto (Strict Press)", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Hip Thrust con Barra", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Remo con Barra (Pendlay / Bent-over)", category: "Fuerza & Powerlifting", unit: "kg" },
  { name: "Buenos Días con Barra (Good Mornings)", category: "Fuerza & Powerlifting", unit: "kg" },

  // --- Gimnásticos & Peso Corporal ---
  { name: "Dominadas Estrictas (Strict Pull-ups)", category: "Gimnásticos", unit: "reps" },
  { name: "Dominadas con Lastre (Weighted Pull-ups)", category: "Gimnásticos", unit: "kg" },
  { name: "Kipping Pull-ups", category: "Gimnásticos", unit: "reps" },
  { name: "Butterfly Pull-ups", category: "Gimnásticos", unit: "reps" },
  { name: "Pecho a Barra (Chest to Bar - C2B)", category: "Gimnásticos", unit: "reps" },
  { name: "Bar Muscle-up (Muscle-up en Barra)", category: "Gimnásticos", unit: "reps" },
  { name: "Ring Muscle-up (Muscle-up en Anillas)", category: "Gimnásticos", unit: "reps" },
  { name: "Fondos en Paralelas con Lastre (Weighted Dips)", category: "Gimnásticos", unit: "kg" },
  { name: "Fondos en Anillas (Ring Dips)", category: "Gimnásticos", unit: "reps" },
  { name: "Handstand Push-ups Estrictas (Strict HSPU)", category: "Gimnásticos", unit: "reps" },
  { name: "Handstand Push-ups Kipping (Kipping HSPU)", category: "Gimnásticos", unit: "reps" },
  { name: "Caminar de Pino (Handstand Walk - metros)", category: "Gimnásticos", unit: "reps" },
  { name: "Pies a la Barra (Toes to Bar - T2B)", category: "Gimnásticos", unit: "reps" },
  { name: "Pistols / Sentadilla a una Pierna", category: "Gimnásticos", unit: "reps" },

  // --- Mancuernas ---
  { name: "Dumbbell Snatch (Mancuerna)", category: "Mancuernas", unit: "kg" },
  { name: "Dumbbell Clean & Jerk", category: "Mancuernas", unit: "kg" },
  { name: "Devil Press con Mancuernas", category: "Mancuernas", unit: "kg" },
  { name: "Dumbbell Thruster", category: "Mancuernas", unit: "kg" },
  { name: "Press de Banca con Mancuernas", category: "Mancuernas", unit: "kg" },
  { name: "Press de Hombro con Mancuernas", category: "Mancuernas", unit: "kg" },
  { name: "Remo con Mancuerna a 1 Brazo", category: "Mancuernas", unit: "kg" },
  { name: "Zancadas con Mancuernas (Walking Lunges)", category: "Mancuernas", unit: "kg" },
  { name: "Paseo del Granjero (Farmer's Walk)", category: "Mancuernas", unit: "kg" },
  { name: "Curl de Bíceps con Mancuernas", category: "Mancuernas", unit: "kg" },
  { name: "Extensión de Tríceps con Mancuerna", category: "Mancuernas", unit: "kg" },

  // --- Kettlebells & Funcional ---
  { name: "Kettlebell Swing Americano", category: "Kettlebells & Funcional", unit: "kg" },
  { name: "Kettlebell Swing Ruso", category: "Kettlebells & Funcional", unit: "kg" },
  { name: "Turkish Get-up (Levantamiento Turco)", category: "Kettlebells & Funcional", unit: "kg" },
  { name: "Kettlebell Clean & Press", category: "Kettlebells & Funcional", unit: "kg" },
  { name: "Kettlebell Snatch", category: "Kettlebells & Funcional", unit: "kg" },
  { name: "Goblet Squat con Kettlebell", category: "Kettlebells & Funcional", unit: "kg" },
  { name: "Wall Ball Shots (Balón a Diana)", category: "Kettlebells & Funcional", unit: "kg" },
  { name: "Carga de Saco al Hombro (Sandbag Clean)", category: "Kettlebells & Funcional", unit: "kg" },

  // --- Ergómetros & Benchmarks ---
  { name: "Remo Concept2 500m (Tiempo seg)", category: "Ergómetros & Benchmarks", unit: "tiempo" },
  { name: "Remo Concept2 2000m (Tiempo min)", category: "Ergómetros & Benchmarks", unit: "tiempo" },
  { name: "SkiErg 500m (Tiempo seg)", category: "Ergómetros & Benchmarks", unit: "tiempo" },
  { name: "SkiErg 1000m (Tiempo min)", category: "Ergómetros & Benchmarks", unit: "tiempo" },
  { name: "Echo Bike / Assault Bike 1 min (Max Cals)", category: "Ergómetros & Benchmarks", unit: "cals" },
  { name: "Echo Bike / Assault Bike 50 Cals (Tiempo seg)", category: "Ergómetros & Benchmarks", unit: "tiempo" },

  // --- Accesorios & Máquinas ---
  { name: "Jalón al Pecho en Polea (Lat Pulldown)", category: "Accesorios", unit: "kg" },
  { name: "Remo en Polea Baja / Máquina", category: "Accesorios", unit: "kg" },
  { name: "Tríceps en Polea (Pushdown)", category: "Accesorios", unit: "kg" },
  { name: "Face Pull en Polea", category: "Accesorios", unit: "kg" },
  { name: "Elevaciones Laterales con Mancuernas", category: "Accesorios", unit: "kg" },
  { name: "Prensa de Piernas (Leg Press)", category: "Accesorios", unit: "kg" },
  { name: "Curl Femoral Tumbado / Sentado", category: "Accesorios", unit: "kg" },
  { name: "Extensión de Cuádriceps en Máquina", category: "Accesorios", unit: "kg" },
  { name: "Gemelos de Pie en Máquina (Calf Raises)", category: "Accesorios", unit: "kg" },
];
