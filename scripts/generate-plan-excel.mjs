import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';

const planData = [
  {
    dia: 'Lunes',
    disciplina: 'gimnasio',
    codigo: 'Día A',
    notas: `GIMNASIO Día A (tren inferior/full body):
Sentadilla goblet o con barra — 4x8-10, RPE 7-8 (empieza conservador, ej. goblet 16-20kg)
Peso muerto rumano (mancuerna o barra) — 3x10-12, RPE 7
Zancada búlgara o caminando — 3x10-12/pierna, RPE 7
Hip thrust / puente de glúteo — 3x12-15, RPE 7
Elevación de talones de pie — 3x15-20, RPE 8
Plancha frontal — 3x30-45 seg`
  },
  {
    dia: 'Martes',
    disciplina: 'carrera',
    codigo: 'R1',
    notas: `RUNNING suave (receta R1):
Calentamiento 5 min trote muy suave
Cuerpo: 30-40 min a 6:00-6:30/km, RPE 4-5 (conversacional)
Técnica: 4x100m skipping/talón-glúteo/zancada progresiva
Vuelta a la calma: 5 min andando + estiramientos suaves`
  },
  {
    dia: 'Miércoles',
    disciplina: 'natacion',
    codigo: 'N1',
    notas: `NATACIÓN técnica + aeróbica (receta N1, ~45-60 min / 2000-2400m):
Calentamiento: 400m suave estilo libre
Técnica: 4x50m ejercicios (catch-up, dedos, 6-1-6...) desc. 20 seg
Principal: 8x100m crol a ritmo moderado (RPE 6) desc. 15-20 seg
Vuelta a la calma: 200m suave`
  },
  {
    dia: 'Jueves',
    disciplina: 'gimnasio',
    codigo: 'Día B',
    notas: `GIMNASIO Día B (tren superior):
Remo en máquina — 4x10-12, RPE 7-8 (ref. 47,5kg)
Jalón al pecho — 3x10-12, RPE 7-8 (ref. 42,5kg)
Press militar — 3x8-10, RPE 7-8 (ref. 34kg)
Press banca — 4x8-10, RPE 7-8 (ref. 44kg)
Tríceps en polea — 3x12-15, RPE 7-8 (ref. 22,5kg)
Curl bíceps con mancuerna — 3x10-12, RPE 7-8 (ref. 12kg/mano)
Face pull o pájaros — 3x15, RPE 6 (salud de hombro)`
  },
  {
    dia: 'Viernes',
    disciplina: 'otro',
    codigo: 'Descanso activo',
    notas: `DESCANSO ACTIVO: movilidad de cadera/tobillo + core 15-20 min, o descanso total`
  },
  {
    dia: 'Sábado',
    disciplina: 'carrera',
    codigo: 'R2',
    notas: `RUNNING moderado progresivo (receta R2):
Calentamiento 10 min suave
Cuerpo (8-12 km): primer tercio suave (R1), segundo tercio moderado (15-20 seg/km más rápido), último tercio progresivo
Vuelta a la calma: 5-10 min suave`
  },
  {
    dia: 'Domingo',
    disciplina: 'carrera',
    codigo: 'R5',
    notas: `RUNNING tirada larga (receta R5):
Distancia de esta fase: 10, 11, 13 y 9 km en las semanas 1, 2, 3 y 4 (ver hoja de seguimiento para la semana exacta)
Calentamiento 5 min suave
Cuerpo: ritmo fácil 6:00-6:20/km, RPE <= 6
Vuelta a la calma: andar 5 min + estiramientos`
  }
];

async function generate() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Plan Semanal');

  worksheet.columns = [
    { header: 'Día', key: 'dia', width: 14 },
    { header: 'Disciplina', key: 'disciplina', width: 16 },
    { header: 'Código', key: 'codigo', width: 18 },
    { header: 'Notas', key: 'notas', width: 75 }
  ];

  // Style headers
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2E7D32' } // Green header matching the user image
  };

  for (const item of planData) {
    const row = worksheet.addRow(item);
    row.alignment = { vertical: 'top', wrapText: true };
  }

  const projectDir = 'c:/Users/danie/Desktop/Aplicaciones/EntrenoApp';
  const downloadsDir = 'D:/Users/Dani/Downloads';

  const outProject = path.join(projectDir, 'Plan-Semanal.xlsx');
  await workbook.xlsx.writeFile(outProject);
  console.log('Generado en proyecto:', outProject);

  if (fs.existsSync(downloadsDir)) {
    const outDownloads = path.join(downloadsDir, 'Plan-Semanal.xlsx');
    await workbook.xlsx.writeFile(outDownloads);
    console.log('Generado en Descargas:', outDownloads);
  }
}

generate().catch(err => console.error(err));
