const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType
} = require('docx');

async function generateDoc() {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "GUÍA SEMANAL Y PLAN MARATÓN 2026-2027",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 }
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Plan de Entrenamiento y Nutrición Periodizado · Adaptado a Test VAM 3:59 min/km",
                bold: true,
                size: 24,
                color: "2B579A"
              })
            ],
            spacing: { after: 240 }
          }),
          new Paragraph({
            text: "Atleta: Daniel Espinosa | Objetivo: Maratón (26 de Abril de 2027) | VAM Oficial: 3:59 min/km (15.06 km/h)",
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 }
          }),

          // TABLA DE ZONAS VAM
          new Paragraph({
            text: "1. TUS ZONAS DE RITMO DE ENTRENAMIENTO (BASADAS EN TEST VAM 3:59)",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
          }),
          new Paragraph({
            text: "Tras tu resultado oficial en el Test VAM de 5 minutos (ritmo medio 3:59 min/km · 15.06 km/h), todos tus ritmos de carrera quedan recalculados con máxima precisión:",
            spacing: { after: 180 }
          }),

          createVamTable(),

          new Paragraph({
            text: "Ritmo Maratón Confirmado/Objetivo (RMC): 5:00 - 5:15 min/km (Tiempo meta: 3h30 - 3h41)",
            spacing: { before: 120, after: 300 }
          }),

          // FASE 1A
          new Paragraph({
            text: "2. FASE 1A — SEPTIEMBRE 2026 (SEMANAS 1 A 4): ADAPTACIÓN ANATÓMICA Y BASE",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
          }),
          createPhase1aTable(),

          new Paragraph({
            text: "Menú Fase 1a (Objetivo: ~2.800 kcal · P:145g / C:325g / F:85g):",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 }
          }),
          createMenuTableFase1(),

          // FASE 1B
          new Paragraph({
            text: "3. FASE 1B — OCTUBRE A DICIEMBRE 2026 (SEMANAS 5 A 16): FUERZA CON CROSSFIT Y VOLUMEN",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 }
          }),
          createPhase1bTable(),

          // FASE 2
          new Paragraph({
            text: "4. FASE 2 — DICIEMBRE 2026 A FEBRERO 2027 (SEMANAS 17 A 24): BUILD / TRANSICIÓN Y SERIES R3",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 }
          }),
          createPhase2Table(),

          new Paragraph({
            text: "Menú Fase 2 (Objetivo: ~3.050 kcal · P:145g / C:385g / F:80g):",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 }
          }),
          createMenuTableFase2(),

          // FASE 3
          new Paragraph({
            text: "5. FASE 3 — FEBRERO A ABRIL 2027 (SEMANAS 25 A 31): ESPECÍFICO MARATÓN Y RITMO OBJETIVO",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 }
          }),
          createPhase3Table(),

          new Paragraph({
            text: "Menú Fase 3 (Objetivo: ~3.300 kcal · P:140g / C:460g / F:75g):",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 }
          }),
          createMenuTableFase3(),

          // FASE 4
          new Paragraph({
            text: "6. FASE 4 — TAPERING (12 A 25 ABRIL 2027) Y DÍA DE LA MARATÓN",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 120 }
          }),
          createPhase4Table(),

          new Paragraph({
            text: "LUNES 26 DE ABRIL DE 2027: DÍA DE LA MARATÓN (42.195 km)",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 }
          }),
          new Paragraph({
            text: "• Estrategia de Ritmo: Salir los primeros 5 km conservadores a 5:15/km. Estabilizar el ritmo de crucero entre 5:05-5:10/km hasta el km 30-32. Si las sensaciones son óptimas, mantener o apretar a 5:00/km los últimos 10K para cerrar en sub-3h35.\n• Nutrición en carrera: 1 gel isotónico cada 40-45 minutos (~35-40g HC/hora). Hidratación constante de agua/sales cada 20-25 min en cada avituallamiento oficial.\n• Carga de carbohidratos previa: Jueves a Domingo previos con dieta rica en carbohidratos (8-10g HC/kg peso corporal) y baja en fibra/grasas.",
            spacing: { after: 240 }
          })
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = path.resolve("Plan_Maraton_2026-2027_VAM_Actualizado.docx");
  fs.writeFileSync(outPath, buffer);
  console.log("Word document created successfully at:", outPath);
}

function createCell(text, bold = false, bg = null, widthPct = null) {
  return new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: bg ? { fill: bg, type: ShadingType.CLEAR } : undefined,
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20 })]
      })
    ]
  });
}

function createVamTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell("Zona", true, "2B579A", 15),
          createCell("Denominación / Fisiología", true, "2B579A", 25),
          createCell("% VAM", true, "2B579A", 15),
          createCell("Ritmo Objetivo Actualizado", true, "2B579A", 25),
          createCell("Aplicación Práctica", true, "2B579A", 20)
        ]
      }),
      new TableRow({
        children: [
          createCell("R0", true, "E8F0FE"),
          createCell("Regenerativo / Muy suave"),
          createCell("< 65%"),
          createCell("> 5:23 min/km", true),
          createCell("Calentamiento, descalentamiento y recuperación")
        ]
      }),
      new TableRow({
        children: [
          createCell("R1", true, "D2E3FC"),
          createCell("Por debajo del umbral aeróbico"),
          createCell("65% - 75%"),
          createCell("5:23 - 4:59 min/km", true),
          createCell("Rodajes base aeróbica, volumen semanal, RPE 4-5")
        ]
      }),
      new TableRow({
        children: [
          createCell("R2", true, "CEEAD6"),
          createCell("Entre umbral aeróbico y anaeróbico"),
          createCell("75% - 85%"),
          createCell("4:59 - 4:35 min/km", true),
          createCell("Rodajes moderados progresivos y tempo")
        ]
      }),
      new TableRow({
        children: [
          createCell("R3", true, "FEF7E0"),
          createCell("Umbral anaeróbico (Tempo/Series)"),
          createCell("90% - 95%"),
          createCell("4:23 - 4:11 min/km", true),
          createCell("Series de 1000m, 1500m y 2000m")
        ]
      }),
      new TableRow({
        children: [
          createCell("R3+", true, "FEEFC3"),
          createCell("VAM / VO2máx"),
          createCell("100%"),
          createCell("0:03:59 min/km", true),
          createCell("Potencia aeróbica máxima (bloques 3-5 min)")
        ]
      }),
      new TableRow({
        children: [
          createCell("R4", true, "FEDFC8"),
          createCell("Capacidad anaeróbica / Tolerancia lactato"),
          createCell("105% - 120%"),
          createCell("3:47 - 3:11 min/km", true),
          createCell("Series cortas de 400m a 800m")
        ]
      }),
      new TableRow({
        children: [
          createCell("R5", true, "FAD2CF"),
          createCell("Potencia anaeróbica láctica"),
          createCell("120% - 140%"),
          createCell("3:11 - 2:23 min/km", true),
          createCell("Repeticiones de 200m a 400m")
        ]
      }),
      new TableRow({
        children: [
          createCell("R6", true, "F6AEA9"),
          createCell("Potencia anaeróbica aláctica"),
          createCell("> 150%"),
          createCell("< 2:00 min/km", true),
          createCell("Progresiones y sprints <100m")
        ]
      })
    ]
  });
}

function createPhase1aTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell("Día", true, "2B579A", 15),
          createCell("Sesión y Prescripción Completa (Actualizada con VAM 3:59)", true, "2B579A", 85)
        ]
      }),
      new TableRow({
        children: [
          createCell("Lunes", true),
          createCell("GIMNASIO Día A (tren inferior/full body):\n- Sentadilla goblet / barra: 4x8-10, RPE 7-8\n- Peso muerto rumano: 3x10-12, RPE 7\n- Zancada búlgara / caminando: 3x10-12/pierna, RPE 7\n- Hip thrust / puente glúteo: 3x12-15, RPE 7\n- Elevación de talones de pie: 3x15-20, RPE 8\n- Plancha frontal: 3x30-45s")
        ]
      }),
      new TableRow({
        children: [
          createCell("Martes", true),
          createCell("RUNNING suave (receta R1):\n- Calentamiento: 5 min trote muy suave (>5:25/km)\n- Rodaje continuo: 30-40 min a 5:23 - 4:59 min/km, RPE 4-5 (conversacional)\n- Técnica: 4x100m progresiones/reactividad tobillo\n- Vuelta a la calma: 5 min andando + estiramientos")
        ]
      }),
      new TableRow({
        children: [
          createCell("Miércoles", true),
          createCell("NATACIÓN técnica + aeróbica (receta N1 · ~45-60 min / 2000-2400m):\n- Calentamiento: 400m suave crol\n- Técnica: 4x50m ejercicios (catch-up, recobro alto, rolido) desc. 20s\n- Principal: 8x100m crol a ritmo moderado (RPE 6) desc. 15-20s\n- Vuelta a la calma: 200m suave")
        ]
      }),
      new TableRow({
        children: [
          createCell("Jueves", true),
          createCell("GIMNASIO Día B (tren superior y core):\n- Remo en máquina / polea: 4x10-12, RPE 7-8\n- Jalón al pecho / Dominadas: 3x10-12, RPE 7-8\n- Press militar con mancuernas: 3x8-10, RPE 7-8\n- Press banca: 4x8-10, RPE 7-8\n- Tríceps polea + Bíceps: 3x12-15\n- Face pulls: 3x15 (salud escapular)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Viernes", true),
          createCell("DESCANSO ACTIVO:\n- Movilidad de cadera y tobillos + Core 15-20 min, o descanso total regenerativo.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Sábado", true),
          createCell("RUNNING moderado progresivo (receta R2):\n- Calentamiento: 10 min suave R0 (>5:25/km)\n- Cuerpo (8-12 km): 1er tercio suave en R1 (5:20-5:05/km), 2º tercio en R2 (4:55-4:45/km), 3er tercio progresivo culminando a 4:35/km\n- Vuelta a la calma: 5-10 min suave")
        ]
      }),
      new TableRow({
        children: [
          createCell("Domingo", true),
          createCell("RUNNING tirada larga aeróbica (receta R5):\n- Distancias: 10 km (sem 1), 11 km (sem 2), 13 km (sem 3), 9 km (sem 4 descarga)\n- Ritmo aeróbico fácil: 5:25 - 5:05 min/km, RPE ≤6\n- Vuelta a la calma: 5 min andando + estiramientos")
        ]
      })
    ]
  });
}

function createPhase1bTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell("Día", true, "2B579A", 15),
          createCell("Sesión y Prescripción Completa (Fase 1b · CrossFit + Zonas VAM)", true, "2B579A", 85)
        ]
      }),
      new TableRow({
        children: [
          createCell("Lunes", true),
          createCell("CROSSFIT (Fuerza y Potencia):\n- Clase dirigida en Box, RPE 7-8. Foco en fuerza pura y trabajo gimnástico.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Martes", true),
          createCell("RUNNING suave (receta R1):\n- 35-45 min a ritmo zona R1 (5:23 - 4:59 min/km), RPE 4-5\n- 4x80m progresiones con cadencia alta\n- Vuelta a la calma 5 min suave")
        ]
      }),
      new TableRow({
        children: [
          createCell("Miércoles", true),
          createCell("NATACIÓN técnica + aeróbica (receta N1 · ~2000-2400m):\n- 400m calentamiento + 4x50m técnica + 8x100m aeróbico moderado (RPE 5-6) + 200m vuelta")
        ]
      }),
      new TableRow({
        children: [
          createCell("Jueves", true),
          createCell("CROSSFIT (WOD y Condicionamiento):\n- Clase dirigida en Box, RPE 7-8. Dosificar sóleos/gemelos si hay dobles de comba.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Viernes", true),
          createCell("DESCANSO ACTIVO / DESCARGA:\n- Movilidad articular, liberación miofascial y estiramientos suaves.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Sábado", true),
          createCell("RUNNING moderado progresivo (receta R2 · 9-13 km):\n- Calentamiento 10 min suave + tramos en zona R2 (4:59 - 4:35 min/km) + últimos km ritmo vivo")
        ]
      }),
      new TableRow({
        children: [
          createCell("Domingo", true),
          createCell("RUNNING tirada larga (receta R5):\n- Progresión de volumen: 12, 14, 16, 11 (sem 5-8) / 14, 16, 18, 12 (sem 9-12) / 16, 18, 20, 14 km (sem 13-16)\n- Ritmo aeróbico base: 5:25 - 5:05 min/km (RPE ≤6)\n- Hidratación y geles en tiradas >14 km")
        ]
      })
    ]
  });
}

function createPhase2Table() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell("Día", true, "2B579A", 15),
          createCell("Sesión y Prescripción Completa (Fase 2 · Build / Transición)", true, "2B579A", 85)
        ]
      }),
      new TableRow({
        children: [
          createCell("Lunes", true),
          createCell("CROSSFIT (Mantenimiento):\n- Moderar volumen de sentadillas/peso muerto pesado si toca tirada larga exigente el fin de semana.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Martes", true),
          createCell("RUNNING series de umbral (receta R3):\n- Calentamiento: 15 min suave + 4x80m progresiones\n- Bloque principal: 6x1000m a 4:23 - 4:11 min/km (recuperación 90s trote suave)\n- Variantes: 4x1500m (rec. 2 min) o 3x2000m (rec. 2-3 min) a 4:20-4:15 min/km\n- Vuelta a la calma: 10 min suave")
        ]
      }),
      new TableRow({
        children: [
          createCell("Miércoles", true),
          createCell("NATACIÓN suave de recuperación (receta N2 · 1200-1500m):\n- 300m suave + 6x100m crol suave (RPE 4-5) desc. 20s + 200m vuelta. Cero impacto articular.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Jueves", true),
          createCell("CROSSFIT (Mantenimiento funcional y core).")
        ]
      }),
      new TableRow({
        children: [
          createCell("Viernes", true),
          createCell("RUNNING suave corto (receta R1 · 30 min):\n- 30 min en zona R1 a 5:23 - 4:59 min/km, RPE 4-5 regenerativo.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Sábado", true),
          createCell("RUNNING moderado (receta R2 · 10-14 km):\n- Incluye 4-6 km sostenidos a Ritmo Maratón (5:00 - 5:15 min/km).")
        ]
      }),
      new TableRow({
        children: [
          createCell("Domingo", true),
          createCell("RUNNING tirada larga (receta R5):\n- Progresión: 18, 20, 22, 15 km (sem 17-20) / 20, 24, 26, 18 km (sem 21-24)\n- Base a 5:25 - 5:10 min/km + últimos 3-4 km a Ritmo Maratón (5:05 - 5:15 min/km)")
        ]
      })
    ]
  });
}

function createPhase3Table() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell("Día", true, "2B579A", 15),
          createCell("Sesión y Prescripción Completa (Fase 3 · Específico Maratón)", true, "2B579A", 85)
        ]
      }),
      new TableRow({
        children: [
          createCell("Lunes", true),
          createCell("CROSSFIT ligero / movilidad y core:\n- Trabajo postural y tren superior, eliminando cargas máximas en piernas.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Martes", true),
          createCell("RUNNING Ritmo Maratón (receta R4):\n- Calentamiento 15 min suave + 10-14 km totales con 6-8 km centrales clavados a 5:00 - 5:10 min/km + 10 min vuelta.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Miércoles", true),
          createCell("RUNNING suave corto (receta R1 · 35 min) a 5:20-5:00/km + trabajo de core ligero.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Jueves", true),
          createCell("DESCANSO TOTAL o natación muy suave / paseo.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Viernes", true),
          createCell("RUNNING activación corta (receta R6):\n- 20-25 min suave + 4 progresiones de 80m a ritmo rápido (<2:00/km).")
        ]
      }),
      new TableRow({
        children: [
          createCell("Sábado", true),
          createCell("RUNNING moderado corto (receta R2 · 8-10 km) a 4:55-4:40/km.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Domingo", true),
          createCell("RUNNING tirada larga específica (receta R5):\n- Progresión: 24, 28, 30 km (Test RMC), 20 km descarga / 32, 34 km (TIRADA PICO), 22 km\n- Base a 5:20-5:10/km con bloques finales a 5:00-5:05/km. Ensayar geles cada 40-45 min.")
        ]
      })
    ]
  });
}

function createPhase4Table() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell("Día", true, "2B579A", 15),
          createCell("Sesión y Prescripción Completa (Fase 4 · Tapering Pre-Competición)", true, "2B579A", 85)
        ]
      }),
      new TableRow({
        children: [
          createCell("Lunes", true),
          createCell("Movilidad y activación suave (15-20 min). Cero pesas ni CrossFit.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Martes", true),
          createCell("RUNNING corto con ritmo (receta R4 corta): Salida de 6 km con 2-3 km a Ritmo Maratón (5:05/km) para recordar la zancada.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Miércoles", true),
          createCell("Descanso total o 20 min de natación muy suave y relajada.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Jueves", true),
          createCell("RUNNING muy suave (receta R1 reducido): 20-25 min a 5:30-5:15/km.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Viernes", true),
          createCell("Descanso total y movilidad articular suave.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Sábado", true),
          createCell("RUNNING activación corta (receta R6): 15-20 min trote muy suave + 3 progresiones de 60m.")
        ]
      }),
      new TableRow({
        children: [
          createCell("Domingo", true),
          createCell("Tiradas de taper reducidas: 21 km (sem 32), 14 km (sem 33), 8 km (sem 34 previa a la carrera).")
        ]
      })
    ]
  });
}

function createMenuTableFase1() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell("Comida", true, "2B579A", 20),
          createCell("Opción 1 (Ejemplo)", true, "2B579A", 40),
          createCell("Opción 2 (Ejemplo)", true, "2B579A", 40)
        ]
      }),
      new TableRow({
        children: [
          createCell("Desayuno", true),
          createCell("Huevo entero 110g, Avena 100g, AOVE 10g\n(616 kcal · P27 C61 F29)"),
          createCell("Claras 135g, Pan integral 105g, Aguacate 175g\n(630 kcal · P28 C62 F30)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Media Mañana", true),
          createCell("Skyr 55g, Plátano 125g, Chía 40g\n(364 kcal · P14 C48 F13)"),
          createCell("Queso batido 0% 170g, Miel 50g, AOVE 10g\n(335 kcal · P14 C47 F10)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Comida Principal", true),
          createCell("Pechuga pollo 100g, Arroz crudo 110g, AOVE 25g, Verdura 150g\n(810 kcal · P42 C94 F30)"),
          createCell("Ternera magra 110g, Patata cruda 515g, AOVE 20g, Verdura 150g\n(810 kcal · P42 C94 F30)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Merienda", true),
          createCell("Pechuga pavo 40g, Pan integral 110g, AOVE 10g\n(403 kcal · P22 C47 F14)"),
          createCell("Proteína en polvo 10g, Avena 60g, Chía 25g\n(383 kcal · P20 C47 F13)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Cena", true),
          createCell("Pechuga pollo 80g, Patata cruda 330g, AOVE 35g, Verdura 150g\n(734 kcal · P34 C62 F39)"),
          createCell("Ternera magra 105g, Arroz crudo 70g, AOVE 25g, Verdura 150g\n(697 kcal · P35 C62 F34)")
        ]
      })
    ]
  });
}

function createMenuTableFase2() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell("Comida", true, "2B579A", 20),
          createCell("Opción 1", true, "2B579A", 40),
          createCell("Opción 2", true, "2B579A", 40)
        ]
      }),
      new TableRow({
        children: [
          createCell("Desayuno", true),
          createCell("Huevo 75g, Avena 125g, AOVE 10g (650 kcal · P26 C76 F27)"),
          createCell("Skyr 100g, Avena 120g, AOVE 20g (668 kcal · P27 C76 F29)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Media Mañana", true),
          createCell("Skyr 50g, Plátano 180g, Chía 35g (390 kcal · P13 C58 F11)"),
          createCell("Queso batido 0% 165g, Miel 65g, AOVE 10g (381 kcal · P13 C59 F10)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Comida Principal", true),
          createCell("Pollo 85g, Arroz 135g, AOVE 25g, Verdura 150g (875 kcal · P39 C114 F29)"),
          createCell("Ternera 90g, Patata 635g, AOVE 20g, Verdura 150g (867 kcal · P39 C114 F28)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Merienda", true),
          createCell("Pavo 25g, Pan integral 135g, AOVE 5g (400 kcal · P19 C58 F10)"),
          createCell("Skyr 160g, Plátano 220g, AOVE 10g (407 kcal · P20 C57 F11)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Cena", true),
          createCell("Pollo 70g, Patata 415g, AOVE 30g, Verdura 150g (739 kcal · P33 C77 F33)"),
          createCell("Ternera 90g, Arroz 90g, AOVE 25g, Verdura 150g (742 kcal · P33 C78 F33)")
        ]
      })
    ]
  });
}

function createMenuTableFase3() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          createCell("Comida", true, "2B579A", 20),
          createCell("Opción 1", true, "2B579A", 40),
          createCell("Opción 2", true, "2B579A", 40)
        ]
      }),
      new TableRow({
        children: [
          createCell("Desayuno", true),
          createCell("Avena 160g, Huevo 20g, AOVE 10g (689 kcal · P23 C96 F23)"),
          createCell("Pan integral 200g, Claras 30g, Aguacate 120g (708 kcal · P24 C97 F25)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Media Mañana", true),
          createCell("Plátano 255g, Skyr 35g, Chía 30g (429 kcal · P12 C73 F10)"),
          createCell("Queso batido 0% 145g, Miel 85g, AOVE 10g (435 kcal · P12 C74 F10)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Comida Principal", true),
          createCell("Pollo 65g, Arroz 175g, AOVE 20g, Verdura 150g (940 kcal · P35 C146 F24)"),
          createCell("Ternera 60g, Patata 820g, AOVE 20g, Verdura 150g (956 kcal · P35 C145 F26)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Merienda", true),
          createCell("Pan integral 170g, Pavo 10g, AOVE 5g (465 kcal · P18 C73 F11)"),
          createCell("Skyr 130g, Plátano 295g, AOVE 10g (463 kcal · P18 C73 F11)")
        ]
      }),
      new TableRow({
        children: [
          createCell("Cena", true),
          createCell("Pollo 50g, Patata 535g, AOVE 25g, Verdura 150g (755 kcal · P29 C97 F28)"),
          createCell("Ternera 70g, Arroz 115g, AOVE 25g, Verdura 150g (795 kcal · P29 C98 F32)")
        ]
      })
    ]
  });
}

generateDoc().catch(console.error);
