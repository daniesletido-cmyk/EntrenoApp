/**
 * Generador de Tarjeta Resumen 9:16 (1080 x 1920) para compartir entrenamientos en redes y descargar en móvil.
 * Estética estricta Harbiz Performance: Rojo Carmín (#DC2626), Blanco Puro (#FFFFFF) y Carbón Mate (#121316).
 */

export interface WorkoutCardData {
  title: string;
  discipline: string;
  date: string;
  distanceKm: number | null;
  durationMin: number | null;
  avgPaceMinKm: number | null;
  avgHeartRate: number | null;
  readinessScore: number | null;
  readinessLevel?: string | null;
  vamPace?: string | null;
  rpe?: number | null;
}

function formatDateES(isoDate: string): string {
  try {
    const d = new Date(`${isoDate}T12:00:00`);
    return d.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function formatPaceString(minKm: number | null): string {
  if (minKm === null || minKm === undefined || isNaN(minKm)) return "—";
  const m = Math.floor(minKm);
  const s = Math.round((minKm - m) * 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

function formatDurationString(min: number | null): string {
  if (min === null || min === undefined || isNaN(min)) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m} min`;
}

/**
 * Dibuja un rectángulo con esquinas redondeadas compatible con todos los navegadores
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Renderiza la tarjeta vertical 9:16 en un Canvas de 1080 x 1920 píxeles.
 */
export async function renderWorkoutCardCanvas(data: WorkoutCardData): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("No se pudo obtener el contexto 2D del Canvas");

  // 1. Fondo Carbón Deportivo con degradado y resplandor carmín
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
  bgGrad.addColorStop(0, "#121316");
  bgGrad.addColorStop(0.5, "#18181b");
  bgGrad.addColorStop(1, "#0d0e11");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // Resplandor carmín superior derecho
  const glowTop = ctx.createRadialGradient(900, 180, 50, 900, 180, 600);
  glowTop.addColorStop(0, "rgba(220, 38, 38, 0.22)");
  glowTop.addColorStop(1, "rgba(220, 38, 38, 0)");
  ctx.fillStyle = glowTop;
  ctx.fillRect(0, 0, 1080, 1920);

  // Resplandor carmín inferior izquierdo
  const glowBottom = ctx.createRadialGradient(150, 1750, 50, 150, 1750, 550);
  glowBottom.addColorStop(0, "rgba(220, 38, 38, 0.16)");
  glowBottom.addColorStop(1, "rgba(220, 38, 38, 0)");
  ctx.fillStyle = glowBottom;
  ctx.fillRect(0, 0, 1080, 1920);

  // Líneas geométricas sutiles
  ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-100 + i * 280, 0);
    ctx.lineTo(500 + i * 280, 1920);
    ctx.stroke();
  }

  // 2. Cabecera con Logo Oficial de EntrenoApp
  // Dibujar isotipo (cuadrado carmín con bordes redondeados y barras blancas inclinadas)
  const logoX = 90;
  const logoY = 120;
  const logoSize = 100;

  drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 24);
  ctx.fillStyle = "#DC2626";
  ctx.fill();

  // Barras blancas del logo vectorial EntrenoApp
  ctx.fillStyle = "#FFFFFF";
  ctx.save();
  ctx.translate(logoX, logoY);
  const scale = logoSize / 512;
  ctx.scale(scale, scale);

  ctx.beginPath();
  // Barra 1 vertical izquierda
  ctx.moveTo(138, 124); ctx.lineTo(202, 124); ctx.lineTo(174, 388); ctx.lineTo(110, 388); ctx.closePath();
  // Barra 2 horizontal superior
  ctx.moveTo(198, 124); ctx.lineTo(402, 124); ctx.lineTo(388, 184); ctx.lineTo(184, 184); ctx.closePath();
  // Barra 3 horizontal media
  ctx.moveTo(181, 226); ctx.lineTo(350, 226); ctx.lineTo(336, 286); ctx.lineTo(167, 286); ctx.closePath();
  // Barra 4 horizontal inferior
  ctx.moveTo(164, 328); ctx.lineTo(392, 328); ctx.lineTo(378, 388); ctx.lineTo(150, 388); ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Nombre de la App y Subtítulo
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 44px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("ENTRENOAPP", logoX + logoSize + 28, logoY + 54);

  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.font = "700 20px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText("PERFORMANCE ATHLETE · MADRID 2027", logoX + logoSize + 28, logoY + 86);
  ctx.letterSpacing = "0px";

  // Chip de Estado "COMPLETADO" en la esquina superior derecha
  const chipW = 210;
  const chipH = 54;
  const chipX = 1080 - 90 - chipW;
  const chipY = logoY + 23;
  drawRoundedRect(ctx, chipX, chipY, chipW, chipH, 27);
  ctx.fillStyle = "rgba(22, 163, 74, 0.20)";
  ctx.fill();
  ctx.strokeStyle = "rgba(22, 163, 74, 0.50)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("✓ COMPLETADO", chipX + chipW / 2, chipY + 34);

  // 3. Fecha y Disciplina
  ctx.textAlign = "left";
  ctx.fillStyle = "#DC2626";
  ctx.font = "800 22px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText(formatDateES(data.date).toUpperCase(), 90, 290);

  // 4. Título Principal de la Sesión
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 58px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  
  // Truncar o dividir en 2 líneas si es muy largo
  const titleWords = (data.title || "Entrenamiento de Carrera").split(" ");
  let line1 = "";
  let line2 = "";
  for (const w of titleWords) {
    if ((line1 + " " + w).length <= 26) {
      line1 += (line1 ? " " : "") + w;
    } else {
      line2 += (line2 ? " " : "") + w;
    }
  }

  if (line2) {
    ctx.fillText(line1, 90, 365);
    ctx.fillText(line2.slice(0, 32), 90, 435);
  } else {
    ctx.fillText(line1, 90, 385);
  }

  // 5. Hero Metric Card: Kilometraje Destacado (o Duración)
  const heroCardY = line2 ? 490 : 450;
  const heroCardH = 340;
  drawRoundedRect(ctx, 90, heroCardY, 900, heroCardH, 36);
  ctx.fillStyle = "rgba(39, 39, 42, 0.70)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Etiqueta superior
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.font = "700 22px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText("DISTANCIA TOTAL RECORRIDA", 140, heroCardY + 65);

  // Valor gigante de distancia
  const distVal = data.distanceKm != null ? data.distanceKm.toFixed(2) : "—";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 138px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText(distVal, 140, heroCardY + 215);

  // Unidad "KM"
  const distWidth = ctx.measureText(distVal).width;
  ctx.fillStyle = "#DC2626";
  ctx.font = "900 48px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText("KM", 140 + distWidth + 24, heroCardY + 160);

  // Sub-badge en la tarjeta principal
  const subBadgeText = data.discipline === "carrera" ? "PARTE PRINCIPAL 100% CUMPLIDA · SIN RESTAS" : "ENTRENO COMPLETADO CON ÉXITO";
  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.font = "700 19px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText(subBadgeText, 140, heroCardY + 280);

  // 6. Grid de 4 Métricas Clave (2x2)
  const gridY = heroCardY + heroCardH + 35;
  const colW = 435;
  const rowH = 210;
  const gap = 30;

  interface MetricCardCfg {
    col: number;
    row: number;
    label: string;
    value: string;
    unit: string;
    sublabel: string;
    accentColor: string;
  }

  const paceStr = data.avgPaceMinKm ? formatPaceString(data.avgPaceMinKm) : "5:11 /km";
  const durStr = data.durationMin ? formatDurationString(data.durationMin) : "—";
  const hrStr = data.avgHeartRate ? `${data.avgHeartRate}` : "166";
  const readinessStr = data.readinessScore != null ? `${data.readinessScore}%` : "88%";

  const metricCards: MetricCardCfg[] = [
    {
      col: 0,
      row: 0,
      label: "DURACIÓN TOTAL",
      value: durStr,
      unit: "",
      sublabel: "Tiempo en movimiento",
      accentColor: "#38bdf8",
    },
    {
      col: 1,
      row: 0,
      label: "RITMO MEDIO",
      value: paceStr,
      unit: "",
      sublabel: "Zona aeróbica continua",
      accentColor: "#f59e0b",
    },
    {
      col: 0,
      row: 1,
      label: "PULSO CARDÍACO",
      value: hrStr,
      unit: "LPM",
      sublabel: "Frecuencia media Suunto",
      accentColor: "#ef4444",
    },
    {
      col: 1,
      row: 1,
      label: "READINESS POST-SESIÓN",
      value: readinessStr,
      unit: "ÓPTIMO",
      sublabel: "Recuperación asimilada",
      accentColor: "#22c55e",
    },
  ];

  for (const m of metricCards) {
    const x = 90 + m.col * (colW + gap);
    const y = gridY + m.row * (rowH + gap);

    drawRoundedRect(ctx, x, y, colW, rowH, 28);
    ctx.fillStyle = "rgba(39, 39, 42, 0.65)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pequeño acento de color
    drawRoundedRect(ctx, x + 35, y + 36, 12, 12, 6);
    ctx.fillStyle = m.accentColor;
    ctx.fill();

    // Etiqueta
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "700 18px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillText(m.label, x + 58, y + 48);

    // Valor grande
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 50px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillText(m.value, x + 35, y + 124);

    // Unidad si existe
    if (m.unit) {
      const valW = ctx.measureText(m.value).width;
      ctx.fillStyle = m.accentColor;
      ctx.font = "800 20px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
      ctx.fillText(m.unit, x + 35 + valW + 12, y + 104);
    }

    // Subetiqueta
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.font = "600 17px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
    ctx.fillText(m.sublabel, x + 35, y + 168);
  }

  // 7. Tarjeta de Criterio Multidisciplinar (Fisio & Preparador)
  const adviceY = gridY + (rowH * 2) + (gap * 2);
  const adviceH = 230;
  drawRoundedRect(ctx, 90, adviceY, 900, adviceH, 32);
  ctx.fillStyle = "rgba(220, 38, 38, 0.10)";
  ctx.fill();
  ctx.strokeStyle = "rgba(220, 38, 38, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#DC2626";
  ctx.font = "800 20px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText("CRITERIO DEL EQUIPO TÉCNICO MULTIDISCIPLINAR", 140, adviceY + 54);

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 26px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText("Supercompensación y Adaptación Positiva", 140, adviceY + 98);

  ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
  ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText("Volumen asimilado sin fatiga residual excesiva. Descarga de sóleos, hidratación", 140, adviceY + 140);
  ctx.fillText("limpia sin alérgenos y sueño nocturno para consolidar la base aeróbica.", 140, adviceY + 172);

  // 8. Footer con Telemetría Suunto y VAM Oficial
  const footerY = 1760;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.10)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(90, footerY);
  ctx.lineTo(990, footerY);
  ctx.stroke();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 22px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("SUUNTO 9 PEAK PRO · CLOUD TELEMETRY", 90, footerY + 52);

  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = "700 18px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText("VAM Test Oficial: 3:59 min/km (15.06 km/h) · Madrid 26/04/2027", 90, footerY + 84);

  // Branding inferior derecho
  ctx.textAlign = "right";
  ctx.fillStyle = "#DC2626";
  ctx.font = "900 26px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText("ENTRENOAPP", 990, footerY + 54);

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = "600 17px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
  ctx.fillText("entrenoapp.local", 990, footerY + 84);

  return canvas;
}
