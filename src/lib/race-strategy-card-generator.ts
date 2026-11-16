import { RaceStrategyResult } from "./race-strategy";

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
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
 * Genera una tarjeta vertical 9:16 (1080 x 1920 px) en alta resolución con la estrategia de competición
 */
export function generateRaceStrategyCard(
  strategy: RaceStrategyResult
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // Fondo carbón oscuro premium
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
  bgGrad.addColorStop(0, "#0b0c0e");
  bgGrad.addColorStop(0.5, "#121316");
  bgGrad.addColorStop(1, "#070809");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // Decoración de luz roja sutil superior
  const redGlow = ctx.createRadialGradient(540, 0, 50, 540, 200, 700);
  redGlow.addColorStop(0, "rgba(220, 38, 38, 0.25)");
  redGlow.addColorStop(1, "rgba(220, 38, 38, 0)");
  ctx.fillStyle = redGlow;
  ctx.fillRect(0, 0, 1080, 800);

  // 1. HEADER & LOGO
  ctx.save();
  const logoX = 90;
  const logoY = 80;
  const logoSize = 64;

  ctx.fillStyle = "#DC2626";
  drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 16);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  const cx = logoX + logoSize / 2;
  const cy = logoY + logoSize / 2;
  ctx.moveTo(cx - 10, cy - 14);
  ctx.lineTo(cx + 14, cy - 14);
  ctx.lineTo(cx - 2, cy + 2);
  ctx.lineTo(cx + 8, cy + 2);
  ctx.lineTo(cx - 14, cy + 16);
  ctx.lineTo(cx - 4, cy + 5);
  ctx.lineTo(cx - 12, cy + 5);
  ctx.closePath();
  ctx.fill();

  // Texto Logo
  ctx.font = "bold 34px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("EntrenoApp", logoX + logoSize + 20, logoY + 38);

  ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#DC2626";
  ctx.fillText("ESTRATEGIA DE COMPETICIÓN", logoX + logoSize + 22, logoY + 62);

  // Distintivo derecho
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  drawRoundedRect(ctx, 770, logoY + 10, 220, 48, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.stroke();

  ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "center";
  ctx.fillText(`${strategy.distanceKm} KM · ${strategy.targetTimeFormatted}`, 880, logoY + 41);
  ctx.restore();

  // 2. BANNER DE TIEMPO Y RITMO OBJETIVO
  const bannerY = 180;
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  drawRoundedRect(ctx, 90, bannerY, 900, 160, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(220, 38, 38, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Métricas Clave en Grid de 4
  const kpiData = [
    { label: "TIEMPO OBJETIVO", val: strategy.targetTimeFormatted, color: "#FFFFFF" },
    { label: "RITMO MEDIO", val: strategy.avgPaceFormatted, color: "#DC2626" },
    { label: "ESTRATEGIA", val: strategy.pacingStrategy === "negative_split" ? "Split Negativo" : "Ritmo Parejo", color: "#38BDF8" },
    { label: "NUTRICIÓN", val: `${strategy.carbsPerHour}g CHO/h`, color: "#F59E0B" },
  ];

  kpiData.forEach((item, i) => {
    const kpiX = 90 + (i * 225) + 112;
    ctx.textAlign = "center";
    ctx.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#94A3B8";
    ctx.fillText(item.label, kpiX, bannerY + 52);

    ctx.font = "bold 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = item.color;
    ctx.fillText(item.val, kpiX, bannerY + 105);
  });
  ctx.restore();

  // 3. TABLA DE PARCIALES CADA 5 KM Y AVITUALLAMIENTO
  const tableY = 370;
  ctx.save();

  // Encabezado de la tabla
  ctx.fillStyle = "#DC2626";
  drawRoundedRect(ctx, 90, tableY, 900, 52, 12);
  ctx.fill();

  ctx.font = "bold 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.fillText("TRAMO / KM", 115, tableY + 33);
  ctx.fillText("RITMO", 280, tableY + 33);
  ctx.fillText("PASO ACUM.", 430, tableY + 33);
  ctx.fillText("PAUTA DE AVITUALLAMIENTO & NUTRICIÓN", 610, tableY + 33);

  // Filas de la tabla (hasta 9 filas para caber limpiamente)
  const maxRows = Math.min(strategy.segments.length, 9);
  const rowHeight = 110;

  for (let i = 0; i < maxRows; i++) {
    const seg = strategy.segments[i];
    const y = tableY + 62 + (i * rowHeight);
    const isEven = i % 2 === 0;

    // Fondo de fila
    ctx.fillStyle = isEven ? "rgba(255, 255, 255, 0.03)" : "rgba(255, 255, 255, 0.06)";
    drawRoundedRect(ctx, 90, y, 900, rowHeight - 8, 14);
    ctx.fill();

    // Tramo
    ctx.font = "bold 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.fillText(seg.label, 115, y + 42);

    // Ritmo
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#DC2626";
    ctx.fillText(seg.paceFormatted, 280, y + 42);

    // Tiempo acumulado
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#38BDF8";
    ctx.fillText(seg.cumulativeTimeFormatted, 430, y + 42);

    // Nutrición & Avituallamiento
    const nut = seg.nutrition;
    let nutTitle = "Agua 150ml";
    let nutColor = "#94A3B8";

    if (nut.badge === "gel") {
      nutTitle = `⚡ ${nut.carbsLabel ?? "Gel CHO 30g"} + Agua 150ml`;
      nutColor = "#F59E0B";
    } else if (nut.badge === "cafeina") {
      nutTitle = `🔥 Gel con Cafeína 50mg + Sales + Agua`;
      nutColor = "#EF4444";
    } else if (nut.badge === "sales") {
      nutTitle = `🧂 Cápsula de Sales + Agua 150ml`;
      nutColor = "#38BDF8";
    } else if (nut.badge === "meta") {
      nutTitle = `🏁 Recuperador líquido (40g CHO) + Sales`;
      nutColor = "#10B981";
    }

    ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = nutColor;
    ctx.fillText(nutTitle, 610, y + 36);

    // Consejo breve
    ctx.font = "12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#94A3B8";
    const adviceShort = nut.advice.length > 52 ? nut.advice.substring(0, 50) + "..." : nut.advice;
    ctx.fillText(adviceShort, 610, y + 66);
  }
  ctx.restore();

  // 4. CRITERIO TÉCNICO MULTIDISCIPLINAR (Inferior)
  const adviceY = 1430;
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.04)";
  drawRoundedRect(ctx, 90, adviceY, 900, 340, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.stroke();

  // Título del bloque de asesoramiento
  ctx.font = "bold 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.textAlign = "left";
  ctx.fillText("PAUTA MULTIDISCIPLINAR (PREPARADOR FÍSICO + NUTRICIONISTA)", 125, adviceY + 45);

  const tips = [
    { title: "Preparador Físico (Pacing)", text: "No aceleres en el primer 5K. El split negativo asegura frescura neuromuscular para los últimos 10 km.", icon: "🏃" },
    { title: "Nutricionista Deportivo", text: `Consumo de ${strategy.carbsPerHour}g CHO/h mediante geles limpios (glucosa/fructosa) y sales minerales en cada hora.`, icon: "⚡" },
    { title: "Seguridad Médica (Alergia)", text: "Pauta 100% limpia de frutos secos. Prohibidas nueces, avellanas o almendras antes, durante o tras la prueba.", icon: "🛡️" },
    { title: "Fisioterapeuta", text: "Mantén zancada elástica a 176-180 ppm sin talonar para amortiguar el impacto contra el asfalto.", icon: "🩺" },
  ];

  tips.forEach((t, idx) => {
    const tipY = adviceY + 90 + (idx * 58);
    ctx.font = "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#DC2626";
    ctx.fillText(`${t.icon} ${t.title}:`, 125, tipY);

    ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#E2E8F0";
    ctx.fillText(t.text, 125, tipY + 22);
  });
  ctx.restore();

  // 5. FOOTER
  ctx.save();
  ctx.font = "14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillStyle = "#64748B";
  ctx.textAlign = "center";
  ctx.fillText("EntrenoApp · Plan de Alto Rendimiento diseñado para Daniel Espinosa", 540, 1840);
  ctx.restore();

  return canvas;
}
