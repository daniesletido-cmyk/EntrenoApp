import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outputPdfPath = path.resolve('CROSSFIT_OPENBOX_TORSO_Y_BLINDAJE_DANI.pdf');
const publicPdfPath = path.resolve('public', 'CROSSFIT_OPENBOX_TORSO_Y_BLINDAJE_DANI.pdf');
const tempHtmlPath = path.resolve('temp_crossfit_pure.html');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>CrossFit Open Box · Hipertrofia de Torso & Blindaje Maratón · Dani Espinosa</title>
<style>
  @page {
    size: A4 portrait;
    margin: 9mm 11mm 11mm 11mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.34;
    font-size: 8pt;
    margin: 0;
    padding: 0;
  }
  .page {
    page-break-after: always;
    position: relative;
    padding-bottom: 12px;
  }
  .page:last-child {
    page-break-after: avoid;
  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 7px;
    margin-bottom: 9px;
  }
  .brand-title {
    font-size: 14pt;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: #0f172a;
    line-height: 1.1;
  }
  .brand-badge {
    display: inline-block;
    background: #2563eb;
    color: white;
    font-size: 6.5pt;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 5px;
    vertical-align: middle;
  }
  .subtitle {
    font-size: 7.5pt;
    color: #64748b;
    font-weight: 500;
    margin-top: 2px;
  }
  .header-meta {
    text-align: right;
    font-size: 7pt;
    color: #475569;
    line-height: 1.3;
  }
  .header-meta strong {
    color: #0f172a;
  }

  /* Section Titles */
  h2 {
    font-size: 9.8pt;
    font-weight: 800;
    color: #0f172a;
    margin: 9px 0 5px 0;
    display: flex;
    align-items: center;
    gap: 5px;
    border-left: 3.5px solid #2563eb;
    padding-left: 6px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  /* Grids */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
    margin-bottom: 6px;
  }
  .grid-4 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 6px;
    margin-bottom: 7px;
  }

  /* Warmup Mini Card */
  .warmup-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .warmup-title {
    font-size: 7.2pt;
    font-weight: 800;
    color: #0f172a;
    margin-top: 4px;
  }
  .warmup-desc {
    font-size: 6.5pt;
    color: #64748b;
    margin-top: 2px;
    line-height: 1.25;
  }

  /* Exercise Visual Card */
  .ex-card {
    border: 1px solid #cbd5e1;
    border-radius: 7px;
    padding: 7px 9px;
    background: #ffffff;
    margin-bottom: 6px;
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .card-rings { border-left: 4px solid #10b981; }
  .card-barbell { border-left: 4px solid #3b82f6; }
  .card-rig { border-left: 4px solid #8b5cf6; }
  .card-floor { border-left: 4px solid #f59e0b; }
  .card-wall { border-left: 4px solid #ec4899; }
  .card-strongman { border-left: 4px solid #06b6d4; }
  .card-armor { border-left: 4px solid #d97706; }

  .ex-visual {
    width: 105px;
    height: 85px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .ex-info {
    flex: 1;
  }
  .ex-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .ex-title {
    font-size: 8.2pt;
    font-weight: 800;
    color: #0f172a;
  }
  .ex-target {
    font-size: 6.5pt;
    font-weight: 800;
    padding: 2px 5px;
    border-radius: 4px;
    display: inline-block;
  }
  .target-green { background: #d1fae5; color: #065f46; }
  .target-blue { background: #dbeafe; color: #1e40af; }
  .target-purple { background: #ede9fe; color: #5b21b6; }
  .target-amber { background: #fef3c7; color: #92400e; }
  .target-pink { background: #fce7f3; color: #9d174d; }
  .target-cyan { background: #cffafe; color: #155e75; }

  .ex-metrics {
    font-size: 6.8pt;
    font-weight: 700;
    color: #0369a1;
    margin-bottom: 2px;
  }
  .ex-desc {
    font-size: 6.8pt;
    color: #475569;
    line-height: 1.3;
  }
  .ex-desc strong {
    color: #0f172a;
  }
  .ex-error {
    font-size: 6.5pt;
    color: #b91c1c;
  }

  /* Callout */
  .callout {
    background: #f1f5f9;
    border-left: 3px solid #64748b;
    padding: 5px 8px;
    margin: 5px 0;
    border-radius: 0 4px 4px 0;
    font-size: 7.2pt;
  }
  .callout.info {
    background: #eff6ff;
    border-left-color: #2563eb;
    color: #1e40af;
  }
  .callout.warning {
    background: #fffbeb;
    border-left-color: #f59e0b;
    color: #92400e;
  }
  .callout.success {
    background: #f0fdf4;
    border-left-color: #10b981;
    color: #065f46;
  }

  /* Whiteboard Mini Box */
  .whiteboard-mini {
    background: #0f172a;
    color: #f8fafc;
    border-radius: 6px;
    padding: 7px 10px;
    margin-bottom: 8px;
    border: 1px solid #334155;
    font-size: 7.2pt;
  }

  /* Footer */
  .footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    font-size: 6.8pt;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 4px;
  }
</style>
</head>
<body>

<!-- ==================== PÁGINA 1 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">CROSSFIT PURO · OPEN BOX</span></div>
      <div class="subtitle">Sesión 100% CrossFit por Series y Calidad · Sin Cronómetro · Dani Espinosa</div>
    </div>
    <div class="header-meta">
      <strong>Atleta:</strong> Daniel Espinosa | <strong>Fecha:</strong> Miércoles, 28/10/2026<br>
      <strong>Material:</strong> Barra Olímpica, Bumpers, Anillas, Rig, Wall, Kettlebells, Cajón, Remo<br>
      <strong>Seguridad:</strong> Cero fatiga en cuádriceps (frescos para los 12 Thrusters de mañana)
    </div>
  </div>

  <div class="whiteboard-mini">
    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #475569; padding-bottom: 4px; margin-bottom: 4px;">
      <strong style="color: #38bdf8; font-size: 8pt;">⚡ PIZARRA DEL BOX (SIN CRONÓMETRO · FOR QUALITY):</strong>
      <span style="background: #10b981; color: #064e3b; padding: 1px 6px; border-radius: 3px; font-weight: 800; font-size: 6.5pt;">DESCANSOS 1:30–2:00 MIN</span>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; color: #cbd5e1; font-size: 7pt;">
      <div>
        • <strong>Warm-Up:</strong> 250m Remo + 10 PVC + 8 Scapulars + 20s Hollow<br>
        • <strong>1. Strict Ring Dips:</strong> 4 × 6–8 reps (Anillas)<br>
        • <strong>2. Pendlay Row:</strong> 4 × 8 reps (Barra olímpica y bumpers en suelo)<br>
        • <strong>3. Strict Pull-ups:</strong> 4 × 6–8 reps (Rig de dominadas)
      </div>
      <div>
        • <strong>4. Z-Press Mancuernas:</strong> 3 × 8–10 reps (Sentado en suelo en L)<br>
        • <strong>5. Wall Walks Estrictos:</strong> 3 × 3–4 reps (Pared con control)<br>
        • <strong>6. Heavy Farmer's Walk:</strong> 3 × 35m (2 Kettlebells pesadas)<br>
        • <strong>7. Sóleo Sentado en Cajón:</strong> 3 × 15 reps (Disco 20kg en rodillas)
      </div>
    </div>
  </div>

  <h2>1. Calentamiento Dinámico en Box (Remo, PVC, Escápulas & Core)</h2>
  <p>Realiza 2 a 3 rondas sin prisa para lubricar hombros y preparar la cintura escapular sin gastar glucógeno:</p>

  <div class="grid-4">
    <div class="warmup-card">
      <svg width="70" height="50" viewBox="0 0 120 90" fill="none">
        <path d="M15 70 L95 70" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
        <path d="M95 70 L110 50" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
        <circle cx="105" cy="45" r="16" stroke="#2563eb" stroke-width="3" fill="#dbeafe"/>
        <path d="M40 65 L55 45 L65 52 L50 68 Z" fill="#3b82f6"/>
        <circle cx="58" cy="30" r="7" fill="#1e293b"/>
        <path d="M56 37 L50 52 L35 48" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M50 52 L75 48" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <div class="warmup-title">250 m Remo Concept2</div>
      <div class="warmup-desc">Ritmo suave (~2:05/500m). Flujo sanguíneo a dorsales y corazón.</div>
    </div>

    <div class="warmup-card">
      <svg width="70" height="50" viewBox="0 0 120 90" fill="none">
        <circle cx="60" cy="22" r="6" fill="#1e293b"/>
        <path d="M60 28 L60 62 L52 82 M60 62 L68 82" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M25 35 Q60 8 95 35" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 2"/>
        <path d="M20 30 L100 45" stroke="#10b981" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="28" cy="31" r="3" fill="#1e293b"/>
        <circle cx="92" cy="43" r="3" fill="#1e293b"/>
      </svg>
      <div class="warmup-title">10 Dislocaciones PVC</div>
      <div class="warmup-desc">Pica de adelante hacia atrás con brazos rectos para abrir hombros.</div>
    </div>

    <div class="warmup-card">
      <svg width="70" height="50" viewBox="0 0 120 90" fill="none">
        <path d="M20 15 L100 15" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
        <circle cx="60" cy="32" r="6" fill="#1e293b"/>
        <path d="M60 38 L60 62 L54 82 M60 62 L66 82" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M45 15 L52 35 L60 40 M75 15 L68 35 L60 40" stroke="#2563eb" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M52 48 L68 48" stroke="#ef4444" stroke-width="2" stroke-dasharray="2 2"/>
      </svg>
      <div class="warmup-title">8 Scapular Pull-ups</div>
      <div class="warmup-desc">Colgado de la barra. Sube y baja escápulas con codos estirados.</div>
    </div>

    <div class="warmup-card">
      <svg width="70" height="50" viewBox="0 0 120 90" fill="none">
        <path d="M15 65 Q60 78 105 50" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
        <circle cx="98" cy="46" r="6" fill="#1e293b"/>
        <path d="M94 51 Q60 68 25 58" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <path d="M45 74 L65 74" stroke="#f59e0b" stroke-width="3"/>
      </svg>
      <div class="warmup-title">20 seg Hollow Hold</div>
      <div class="warmup-desc">Espalda baja pegada al suelo, abdomen en tensión máxima.</div>
    </div>
  </div>

  <h2>2. Bloque 1: Fuerza Gimnástica en Anillas & Barra Olímpica</h2>

  <!-- EJERCICIO 1: RING DIPS -->
  <div class="ex-card card-rings">
    <div class="ex-visual">
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <line x1="45" y1="5" x2="45" y2="35" stroke="#64748b" stroke-width="2.5"/>
        <line x1="95" y1="5" x2="95" y2="35" stroke="#64748b" stroke-width="2.5"/>
        <circle cx="45" cy="40" r="7" stroke="#0f172a" stroke-width="3" fill="none"/>
        <circle cx="95" cy="40" r="7" stroke="#0f172a" stroke-width="3" fill="none"/>
        <circle cx="70" cy="26" r="6" fill="#1e293b"/>
        <path d="M70 32 L70 58 L65 82 M70 58 L75 82" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M70 38 L52 42 L45 38 M70 38 L88 42 L95 38" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
        <text x="50" y="92" font-size="6.5" fill="#047857" font-weight="bold">90° en codos</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">1. Fondos en Anillas Estrictos (Strict Ring Dips)</span>
        <span class="ex-target target-green">PECTORAL, TRÍCEPS & ESTABILIZADORES</span>
      </div>
      <div class="ex-metrics">4 Series × 6 a 8 Reps | Descanso: 1:30 - 2:00 min | Calistenia Pura</div>
      <div class="ex-desc">
        • <strong>Por qué es CrossFit puro:</strong> Fuerza isométrica y tensión profunda en pectoral y tríceps sin peso externo.<br>
        • <strong>Técnica:</strong> Agarre neutro con anillas pegadas al cuerpo. Desciende controlado hasta que el hombro toque o rebase el codo (90° de flexión) y empuja fuerte hasta el bloqueo completo arriba con ligera rotación externa (*turn-out*).<br>
        • <span class="ex-error"><strong>Escalado:</strong> Si las anillas oscilan mucho hoy, haz <strong>Ring Rows inclinados a 45°</strong> o fondos en paralelas.</span>
      </div>
    </div>
  </div>

  <!-- EJERCICIO 2: PENDLAY ROW -->
  <div class="ex-card card-barbell">
    <div class="ex-visual">
      <!-- SVG Pendlay Row Barbell on floor -->
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <line x1="15" y1="85" x2="115" y2="85" stroke="#94a3b8" stroke-width="2"/>
        <!-- Bumper plate on floor -->
        <circle cx="50" cy="73" r="12" fill="#ef4444" stroke="#0f172a" stroke-width="2"/>
        <circle cx="50" cy="73" r="3" fill="#cbd5e1"/>
        <!-- Athlete pulling from floor -->
        <circle cx="85" cy="28" r="5" fill="#1e293b"/>
        <!-- Flat horizontal back -->
        <path d="M85 33 L55 33 L45 55 L38 85" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Arm pulling barbell to chest -->
        <path d="M65 33 L50 48 L50 73" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
        <!-- Barbell lifted -->
        <line x1="30" y1="48" x2="70" y2="48" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Lat muscle highlight -->
        <ellipse cx="62" cy="33" rx="8" ry="3" fill="#3b82f6"/>
        <text x="65" y="24" font-size="6" fill="#1e40af" font-weight="bold">Desde el suelo</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">2. Remo Pendlay con Barra Olímpica y Bumpers</span>
        <span class="ex-target target-blue">DORSAL ANCHO & ESPALDA MEDIA</span>
      </div>
      <div class="ex-metrics">4 Series × 8 Reps | Carga: 40–50 kg total | Descanso: 1:30 min</div>
      <div class="ex-desc">
        • <strong>Por qué es CrossFit puro:</strong> Fuerza bruta de *Barbell Club*. A diferencia del remo culturista, cada repetición sale **completamente apoyada en el suelo** (cero inercia, tirón explosivo al esternón).<br>
        • <strong>Técnica:</strong> Espalda 100% plana paralela al suelo. Tira explosivo hacia la boca del estómago, apoya en el suelo, pausa de 1s y vuelve a tirar. Cero tensión en cuádriceps.<br>
        • <span class="ex-error"><strong>Error:</strong> Levantar el torso a 45° para trampear el peso con la cadera.</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 1 de 3 · Calentamiento & Bloque 1 (Anillas y Barra Olímpica)</span>
  </div>
</div>

<!-- ==================== PÁGINA 2 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">BLOQUE 2: RIG, SUELO EN L & WALL</span></div>
      <div class="subtitle">Dominadas Estrictas, Z-Press y Wall Walks · Sin Ayuda de Piernas</div>
    </div>
    <div class="header-meta">
      <strong>Gimnásticos de Rig:</strong> Cero kipping (tensión pura)<br>
      <strong>Hombros:</strong> Empuje sin impulsos para proteger mañana
    </div>
  </div>

  <h2>3. Bloque 2: Tracción Vertical & Empuje Estricto</h2>

  <!-- EJERCICIO 3: STRICT PULL-UPS EN RIG -->
  <div class="ex-card card-rig">
    <div class="ex-visual">
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <line x1="25" y1="15" x2="105" y2="15" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
        <circle cx="65" cy="26" r="6" fill="#1e293b"/>
        <path d="M65 32 L65 58 L58 82 M65 58 L72 82" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M48 15 L56 32 L65 34 M82 15 L74 32 L65 34" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/>
        <path d="M57 34 L73 34 L65 54 Z" fill="#8b5cf6" opacity="0.6"/>
        <text x="46" y="92" font-size="6.5" fill="#6d28d9" font-weight="bold">Barbilla a barra</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">3. Dominadas Estrictas en Barra de Rig</span>
        <span class="ex-target target-purple">DORSAL ANCHO (ESPALDA EN V)</span>
      </div>
      <div class="ex-metrics">4 Series × 6 a 8 Reps | Descanso: 1:30 - 2:00 min | Prohibido Kipping</div>
      <div class="ex-desc">
        • <strong>Por qué es CrossFit puro:</strong> La base antes de hacer butterfly o kipping. Construye la anchura de espalda y la fuerza escapular.<br>
        • <strong>Técnica:</strong> Agarre prono o neutro un poco más ancho que los hombros. Cuerpo en posición de *hollow* (piernas juntas estiradas hacia delante, abdomen de piedra). Sube llevando la barbilla claramente sobre la barra y baja hasta extensión total de brazos.<br>
        • <span class="ex-error"><strong>Escalado:</strong> Si te cuesta cerrar las 8 repeticiones, pisa una banda elástica fina colgada de la barra.</span>
      </div>
    </div>
  </div>

  <!-- EJERCICIO 4: Z-PRESS EN SUELO -->
  <div class="ex-card card-floor">
    <div class="ex-visual">
      <!-- SVG Z-Press seated on floor in L-Sit -->
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <line x1="20" y1="80" x2="110" y2="80" stroke="#94a3b8" stroke-width="2"/>
        <circle cx="45" cy="30" r="5" fill="#1e293b"/>
        <!-- Torso upright and legs in L on floor -->
        <path d="M45 35 L45 78 L95 78" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <!-- Arms pressing overhead -->
        <path d="M45 42 L35 22 M45 42 L55 22" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
        <!-- DBs -->
        <rect x="28" y="18" width="14" height="5" rx="1" fill="#0f172a"/>
        <rect x="48" y="18" width="14" height="5" rx="1" fill="#0f172a"/>
        <!-- Core highlight -->
        <rect x="42" y="45" width="7" height="22" fill="#f59e0b" opacity="0.6"/>
        <text x="56" y="65" font-size="6.5" fill="#b45309" font-weight="bold">Piernas en L</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">4. Z-Press con Mancuernas (Sentado en Suelo en L)</span>
        <span class="ex-target target-amber">DELTOIDES & ESTABILIDAD DE CORE</span>
      </div>
      <div class="ex-metrics">3 Series × 8 a 10 Reps | Carga: 12–15 kg / mano | Descanso: 1:30 min</div>
      <div class="ex-desc">
        • <strong>Por qué es CrossFit puro:</strong> Ejercicio icónico de fuerza sin trampas. Al sentarte en el suelo con piernas estiradas, no puedes usar piernas ni arquearte hacia atrás.<br>
        • <strong>Técnica:</strong> Siéntate erguido como una L en el suelo. Mancuernas a la altura de los hombros y empuja en línea vertical sobre la cabeza bloqueando arriba. El core trabaja al 100% para mantenerte erguido.<br>
        • <span class="ex-error"><strong>Error:</strong> Doblar las rodillas o dejarse caer hacia atrás al empujar.</span>
      </div>
    </div>
  </div>

  <!-- EJERCICIO 5: WALL WALKS ESTRICTOS -->
  <div class="ex-card card-wall">
    <div class="ex-visual">
      <!-- SVG Wall Walk Inverted against Wall -->
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <!-- Vertical Wall -->
        <line x1="30" y1="10" x2="30" y2="85" stroke="#334155" stroke-width="4"/>
        <line x1="20" y1="85" x2="110" y2="85" stroke="#94a3b8" stroke-width="2"/>
        <!-- Inverted Athlete on wall -->
        <circle cx="48" cy="65" r="5" fill="#1e293b"/>
        <path d="M48 60 L40 40 L34 18" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Hands on floor pushing -->
        <path d="M48 60 L58 85" stroke="#ec4899" stroke-width="3" stroke-linecap="round"/>
        <circle cx="58" cy="85" r="2.5" fill="#0f172a"/>
        <!-- Feet on wall -->
        <circle cx="33" cy="18" r="2.5" fill="#0f172a"/>
        <text x="62" y="45" font-size="6.5" fill="#be185d" font-weight="bold">Pecho a pared</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">5. Wall Walks Controlados (Caminar a la Pared)</span>
        <span class="ex-target target-pink">HOMBROS 3D & SERRATOS</span>
      </div>
      <div class="ex-metrics">3 Series × 3 a 4 Reps lentas | Descanso: 1:15 min | CrossFit Games Icon</div>
      <div class="ex-desc">
        • <strong>Por qué es CrossFit puro:</strong> Movimiento estrella de los Games. Construye hombros estables, escapulas fuertes y un abdomen blindado.<br>
        • <strong>Técnica:</strong> Empieza tumbado boca abajo en el suelo con pies en la pared. Haz una flexión y sube los pies caminando con las manos hacia atrás hasta tocar el pecho contra la pared. Aguanta 1 segundo empujando el suelo con fuerza y camina hacia delante con control.<br>
        • <span class="ex-error"><strong>Error:</strong> Dejar caer la cadera (*hollow* roto) o bajar de golpe sin controlar los pasos.</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 2 de 3 · Bloque 2 (Dominadas, Z-Press y Wall Walks)</span>
  </div>
</div>

<!-- ==================== PÁGINA 3 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">STRONGMAN & BLINDAJE MARATÓN</span></div>
      <div class="subtitle">Heavy Farmer's Walk, Sóleo en Cajón y Nutrición Post-Entreno</div>
    </div>
    <div class="header-meta">
      <strong>Funcional:</strong> Agarre, trapecios y postura erguida<br>
      <strong>Blindaje Aquiles:</strong> Sóleo aislado sin fatiga en cuádriceps
    </div>
  </div>

  <h2>4. Bloque 3: Strongman Funcional & Blindaje de Aquiles</h2>

  <!-- EJERCICIO 6: HEAVY FARMER'S WALK -->
  <div class="ex-card card-strongman">
    <div class="ex-visual">
      <!-- SVG Heavy Farmer's Walk with Kettlebells -->
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <circle cx="65" cy="22" r="5" fill="#1e293b"/>
        <path d="M65 27 L65 58 L58 85 M65 58 L72 85" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Arms carrying heavy KBs -->
        <path d="M65 32 L52 50 L52 65 M65 32 L78 50 L78 65" stroke="#06b6d4" stroke-width="3" stroke-linecap="round"/>
        <!-- Kettlebells -->
        <rect x="47" y="62" width="10" height="12" rx="3" fill="#0f172a"/>
        <path d="M49 62 Q52 57 55 62" stroke="#0f172a" stroke-width="2" fill="none"/>
        <rect x="73" y="62" width="10" height="12" rx="3" fill="#0f172a"/>
        <path d="M75 62 Q78 57 81 62" stroke="#0f172a" stroke-width="2" fill="none"/>
        <!-- Traps highlight -->
        <path d="M57 28 L73 28 L65 35 Z" fill="#06b6d4"/>
        <text x="44" y="12" font-size="6.5" fill="#0891b2" font-weight="bold">Pecho erguido</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">6. Heavy Farmer's Walk (Paseo del Granjero)</span>
        <span class="ex-target target-cyan">TRAPECIOS, AGARRE & POSTURA</span>
      </div>
      <div class="ex-metrics">3 Series × 35 a 40 Metros | 2 Kettlebells pesadas (24–28 kg) | 1:30 min</div>
      <div class="ex-desc">
        • <strong>Por qué es CrossFit puro:</strong> Trabajo de *Strongman* funcional. Desarrolla trapecios masivos, antebrazos de roca y la fuerza postural que te mantendrá erguido en el km 35 de la maratón.<br>
        • <strong>Técnica:</strong> Levanta las kettlebells del suelo con la espalda recta como en un peso muerto. Camina con paso firme y corto, pecho orgulloso y hombros encajados hacia atrás. Prohibido balancear los pesos.<br>
        • <span class="ex-error"><strong>Error:</strong> Dejar que los hombros se vayan hacia delante (*postura encorvada*).</span>
      </div>
    </div>
  </div>

  <!-- EJERCICIO 7: SÓLEO SENTADO EN CAJÓN -->
  <div class="ex-card card-armor">
    <div class="ex-visual">
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <rect x="20" y="45" width="40" height="40" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
        <circle cx="40" cy="25" r="5" fill="#1e293b"/>
        <path d="M40 30 L40 54 L72 54 L72 75" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="72" cy="52" rx="14" ry="5" fill="#ef4444" stroke="#0f172a" stroke-width="2"/>
        <text x="63" y="54" font-size="6" fill="white" font-weight="bold">20kg</text>
        <path d="M72 75 L84 68" stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round"/>
        <ellipse cx="72" cy="65" rx="3.5" ry="6" fill="#f59e0b"/>
        <text x="82" y="78" font-size="6.5" fill="#b45309" font-weight="bold">Talón arriba</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">7. Elevación de Sóleo Sentado en Cajón con Bumper</span>
        <span class="ex-target target-amber">SÓLEO (ESCUDO DE AQUILES)</span>
      </div>
      <div class="ex-metrics">3 Series × 15 Reps | Pausa: 2s arriba | Disco 20 kg | 1:00 min</div>
      <div class="ex-desc">
        • <strong>Por qué lo hacemos hoy:</strong> Al estar sentado con las rodillas a 90°, el cuádriceps y el gemelo se desactivan completamente. **El 100% de la carga recae en el sóleo**, blindando tu tendón de Aquiles para Madrid sin cansar tus piernas para los Thrusters de mañana.<br>
        • <strong>Técnica:</strong> Disco bumper de 20 kg sobre las rodillas. Sube los talones al máximo, **aguanta 2 segundos de pausa en contracción máxima arriba** y desciende despacio.
      </div>
    </div>
  </div>

  <h2>5. Pautas de Nutrición y Recuperación Inmediata</h2>
  <div class="grid-2">
    <div class="callout success">
      <strong>🥤 PROTEÍNA INMEDIATA POST-ENTRENO (0–45 min):</strong><br>
      • Al terminar la sesión, tómate un batido de **25–30 g de proteína whey con 1 plátano** (o 150 g de queso batido / pechuga de pavo). Tus fibras musculares del torso necesitan aminoácidos para reparar y crecer.
    </div>
    <div class="callout info">
      <strong>🚫 RECORDATORIO DE CRIOTERAPIA:</strong><br>
      • **Hoy NO uses la bañera de hielo.** El frío extremo post-fuerza apaga la vía anabólica mTOR y frenaría las ganancias de masa muscular en el torso que acabas de estimular. Ducha templada/caliente.
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 3 de 3 · Strongman, Blindaje & Nutrición</span>
  </div>
</div>

</body>
</html>`;

fs.writeFileSync(tempHtmlPath, html, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outputPdfPath}" --no-pdf-header-footer "${tempHtmlPath}"`;

console.log('Generando PDF 100% CrossFit Open Box ilustrado...');
execSync(cmd, { stdio: 'inherit' });
console.log('PDF generado en:', outputPdfPath);

if (fs.existsSync('public')) {
  fs.copyFileSync(outputPdfPath, publicPdfPath);
  console.log('Copia guardada en public:', publicPdfPath);
}

const artifactDir = 'C:\\Users\\danie\\.gemini\\antigravity\\brain\\665c654b-d891-454d-bae8-5fad32cdce4b';
if (fs.existsSync(artifactDir)) {
  const artifactPdf = path.join(artifactDir, 'CROSSFIT_OPENBOX_TORSO_Y_BLINDAJE_DANI.pdf');
  fs.copyFileSync(outputPdfPath, artifactPdf);
  console.log('Copia guardada en artifact dir:', artifactPdf);
}

fs.unlinkSync(tempHtmlPath);
console.log('Proceso completado con éxito.');
