import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outputPdfPath = path.resolve('ENTRENO_CROSSFIT_TREN_SUPERIOR_DANI.pdf');
const publicPdfPath = path.resolve('public', 'ENTRENO_CROSSFIT_TREN_SUPERIOR_DANI.pdf');
const tempHtmlPath = path.resolve('temp_crossfit_wod.html');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>CrossFit Open Box · Tren Superior & Blindaje Maratón · Dani Espinosa</title>
<style>
  @page {
    size: A4 portrait;
    margin: 10mm 12mm 12mm 12mm;
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
    line-height: 1.38;
    font-size: 8.5pt;
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
    padding-bottom: 8px;
    margin-bottom: 10px;
  }
  .brand-title {
    font-size: 15pt;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: #0f172a;
    line-height: 1.1;
  }
  .brand-badge {
    display: inline-block;
    background: #2563eb;
    color: white;
    font-size: 7pt;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 5px;
    vertical-align: middle;
  }
  .subtitle {
    font-size: 8pt;
    color: #64748b;
    font-weight: 500;
    margin-top: 2px;
  }
  .header-meta {
    text-align: right;
    font-size: 7.5pt;
    color: #475569;
    line-height: 1.3;
  }
  .header-meta strong {
    color: #0f172a;
  }

  /* Section Titles */
  h2 {
    font-size: 10.5pt;
    font-weight: 800;
    color: #0f172a;
    margin: 10px 0 6px 0;
    display: flex;
    align-items: center;
    gap: 5px;
    border-left: 3.5px solid #2563eb;
    padding-left: 6px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  h3 {
    font-size: 9pt;
    font-weight: 700;
    color: #1e3a8a;
    margin: 6px 0 3px 0;
  }

  p {
    margin: 0 0 6px 0;
    text-align: justify;
  }

  /* Whiteboard Hero */
  .whiteboard {
    background: #0f172a;
    color: #f8fafc;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 10px;
    border: 2px solid #334155;
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  }
  .wb-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px dashed #475569;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }
  .wb-title {
    font-size: 12pt;
    font-weight: 900;
    color: #38bdf8;
    letter-spacing: 0.03em;
  }
  .wb-badge {
    background: #10b981;
    color: #064e3b;
    font-size: 7pt;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 4px;
  }

  /* Grids */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }

  /* Exercise Visual Card */
  .ex-card {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px 10px;
    background: #ffffff;
    margin-bottom: 8px;
    display: flex;
    gap: 10px;
    align-items: center;
  }
  .ex-visual {
    width: 110px;
    height: 95px;
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
    align-items: baseline;
    margin-bottom: 3px;
  }
  .ex-title {
    font-size: 8.5pt;
    font-weight: 800;
    color: #0f172a;
  }
  .ex-reps {
    background: #dbeafe;
    color: #1e40af;
    font-weight: 800;
    font-size: 7pt;
    padding: 2px 6px;
    border-radius: 4px;
  }
  .ex-desc {
    font-size: 7.2pt;
    color: #475569;
    line-height: 1.35;
  }
  .ex-desc strong {
    color: #0f172a;
  }

  /* Metcon Circuit Flow */
  .metcon-box {
    background: #fffbeb;
    border: 1.5px solid #fde68a;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
  }
  .metcon-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .metcon-badge {
    background: #d97706;
    color: white;
    font-weight: 900;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 8pt;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 6px 0 8px 0;
    font-size: 7.5pt;
  }
  th {
    background: #1e293b;
    color: #ffffff;
    padding: 5px 6px;
    text-align: left;
    font-weight: 700;
    border: 1px solid #334155;
  }
  td {
    padding: 4px 6px;
    border: 1px solid #cbd5e1;
    color: #334155;
    vertical-align: middle;
  }
  tr:nth-child(even) td {
    background: #f8fafc;
  }

  /* Callout */
  .callout {
    background: #f1f5f9;
    border-left: 3px solid #64748b;
    padding: 6px 8px;
    margin: 6px 0;
    border-radius: 0 4px 4px 0;
    font-size: 7.5pt;
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

  /* Footer */
  .footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    font-size: 7pt;
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
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">CROSSFIT OPEN BOX</span></div>
      <div class="subtitle">Sesión Guiada · Tren Superior, Potencia Metabólica y Blindaje de Sóleos</div>
    </div>
    <div class="header-meta">
      <strong>Atleta:</strong> Daniel Espinosa | <strong>Fecha:</strong> Miércoles, 28/10/2026<br>
      <strong>Modalidad:</strong> Open Box CrossFit | <strong>Duración:</strong> 50 min<br>
      <strong>Estado Previo:</strong> Post-Series R3 (4x1.200m) | <strong>Objetivo:</strong> Cero fatiga en piernas
    </div>
  </div>

  <div class="whiteboard">
    <div class="wb-header">
      <div class="wb-title">⚡ PIZARRA DEL BOX: UPPER BODY ENGINE & MARATHON ARMOR</div>
      <div class="wb-badge">RPE 7.5 – 8 · CALIDAD ESTRICTA</div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 7.5pt; color: #cbd5e1;">
      <div>
        <strong style="color: #38bdf8;">1. WARM-UP (8'):</strong><br>
        3 Rondas fluidas:<br>
        • 250m Row / SkiErg<br>
        • 10 PVC Pass-throughs<br>
        • 8 Scapular Pull-ups<br>
        • 20s Hollow Hold
      </div>
      <div>
        <strong style="color: #38bdf8;">2. STRENGTH (E2:30M x 5):</strong><br>
        5 Rondas pesadas:<br>
        • 5 Strict Overhead Press<br>
        • 6-8 Strict Ring Dips (o Ring Rows pies elevados)<br>
        <em>Tempo 3-0-1 (3s bajada)</em>
      </div>
      <div>
        <strong style="color: #38bdf8;">3. METCON & CASH-OUT:</strong><br>
        • <strong>AMRAP 12':</strong> 250m Remo + 10 DB Push Press + 8 Strict Pull-ups + 3 Wall Walks + 12 V-ups.<br>
        • <strong>CASH-OUT (3 Rondas):</strong> 15 Sóleos en cajón + 10 Pallof Press + 15 Face Pulls.
      </div>
    </div>
  </div>

  <h2>1. Contexto Fisiológico: Por qué esta sesión hoy</h2>
  <div class="grid-2">
    <div class="callout success">
      <strong>🛡️ PROTECCIÓN TOTAL DE PIERNAS:</strong> Ayer completaste 4 × 1.200 m a ritmo de umbral (4:18–4:20/km). Las fibras de contracción rápida de tus cuádriceps e isquios están en plena regeneración. Este WOD no incluye saltos al cajón, comba ni zancadas para no interferir en su recuperación.
    </div>
    <div class="callout info">
      <strong>💪 ESTIMULO DIRIGIDO DE HIPERTROFIA:</strong> Al hacer el press overhead y los fondos en anillas con carácter estricto y bajadas de 3 segundos, generamos tensión mecánica óptima en deltoides, pectorales y tríceps sin acumular fatiga central.
    </div>
  </div>

  <h2>2. Protocolo de Calentamiento (Warm-Up Dinámico · 8 min)</h2>
  <p>Realiza 3 rondas sin prisa. El objetivo es elevar temperatura corporal, activar la cintura escapular y despertar el core.</p>

  <div class="grid-2">
    <div class="ex-card">
      <div class="ex-visual">
        <!-- SVG Row Icon / Ergometer -->
        <svg width="90" height="70" viewBox="0 0 120 90" fill="none">
          <path d="M15 70 L95 70" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
          <path d="M95 70 L110 50" stroke="#64748b" stroke-width="4" stroke-linecap="round"/>
          <circle cx="105" cy="45" r="16" stroke="#2563eb" stroke-width="3" fill="#dbeafe"/>
          <path d="M40 65 L55 45 L65 52 L50 68 Z" fill="#3b82f6"/>
          <circle cx="58" cy="30" r="7" fill="#1e293b"/>
          <path d="M56 37 L50 52 L35 48" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
          <path d="M50 52 L75 48" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="ex-info">
        <div class="ex-header">
          <span class="ex-title">250 m Remo Concept2 (o SkiErg)</span>
          <span class="ex-reps">3 Rondas</span>
        </div>
        <div class="ex-desc">
          Ritmo regenerativo (~2:05–2:10/500m). Enfócate en el empuje coordinado y la respiración diafragmática. Cero fatiga láctica.
        </div>
      </div>
    </div>

    <div class="ex-card">
      <div class="ex-visual">
        <!-- SVG Scapular pull up -->
        <svg width="90" height="70" viewBox="0 0 120 90" fill="none">
          <path d="M20 15 L100 15" stroke="#334155" stroke-width="5" stroke-linecap="round"/>
          <circle cx="60" cy="32" r="7" fill="#1e293b"/>
          <path d="M60 39 L60 62 L54 82 M60 62 L66 82" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M45 15 L52 35 L60 40 M75 15 L68 35 L60 40" stroke="#2563eb" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M52 48 L68 48" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="2 2"/>
        </svg>
      </div>
      <div class="ex-info">
        <div class="ex-header">
          <span class="ex-title">Activación Escapular en Barra</span>
          <span class="ex-reps">8 reps</span>
        </div>
        <div class="ex-desc">
          Colgado de la barra con codos totalmente bloqueados. Sube y deprime las escápulas activamente aguantando 1s arriba. Despierta serratos y dorsal.
        </div>
      </div>
    </div>
  </div>

  <div class="grid-2">
    <div class="ex-card">
      <div class="ex-visual">
        <!-- SVG PVC pass through -->
        <svg width="90" height="70" viewBox="0 0 120 90" fill="none">
          <circle cx="60" cy="25" r="7" fill="#1e293b"/>
          <path d="M60 32 L60 65 L52 82 M60 65 L68 82" stroke="#1e293b" stroke-width="3" stroke-linecap="round"/>
          <path d="M25 35 Q60 10 95 35" stroke="#ef4444" stroke-width="2" stroke-dasharray="3 2"/>
          <path d="M20 30 L100 45" stroke="#10b981" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="28" cy="31" r="3" fill="#1e293b"/>
          <circle cx="92" cy="43" r="3" fill="#1e293b"/>
        </svg>
      </div>
      <div class="ex-info">
        <div class="ex-header">
          <span class="ex-title">Dislocaciones con Pica PVC</span>
          <span class="ex-reps">10 reps</span>
        </div>
        <div class="ex-desc">
          Agarre ancho, brazos estirados. Pasa la pica desde la cadera hacia la espalda sin doblar codos ni arquear la zona lumbar.
        </div>
      </div>
    </div>

    <div class="ex-card">
      <div class="ex-visual">
        <!-- SVG Hollow hold -->
        <svg width="90" height="70" viewBox="0 0 120 90" fill="none">
          <path d="M15 65 Q60 78 105 50" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
          <circle cx="98" cy="46" r="6" fill="#1e293b"/>
          <path d="M94 51 Q60 68 25 58" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
          <path d="M45 74 L65 74" stroke="#f59e0b" stroke-width="3"/>
        </svg>
      </div>
      <div class="ex-info">
        <div class="ex-header">
          <span class="ex-title">Hollow Body Hold</span>
          <span class="ex-reps">20 seg</span>
        </div>
        <div class="ex-desc">
          Espalda baja completamente pegada al suelo. Brazos y piernas extendidos en el aire. Tensión activa en todo el recto abdominal.
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 1 de 3 · Whiteboard & Calentamiento</span>
  </div>
</div>

<!-- ==================== PÁGINA 2 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">PARTE A: FUERZA ESTRICTA</span></div>
      <div class="subtitle">Bloque de Tensión Mecánica Pura · Hombros, Pectoral y Tríceps</div>
    </div>
    <div class="header-meta">
      <strong>Estructura:</strong> Every 2:30 min x 5 Rondas<br>
      <strong>Tempo:</strong> 3-0-1 (3s excéntrico)<br>
      <strong>Carga:</strong> RPE 7.5 - 8 (1-2 en recámara)
    </div>
  </div>

  <h2>3. Part A: Barbell & Gymnastics Strength (15 min)</h2>
  <p>
    La hipertrofia del tren superior requiere **tensión mecánica estricta**. Nada de balanceos ni rebotes. Realiza una ronda de la biserie cada 2 minutos y medio; el tiempo restante es tu pausa de recuperación.
  </p>

  <!-- EJERCICIO 1: STRICT OVERHEAD PRESS -->
  <div class="ex-card" style="border-left: 4px solid #2563eb;">
    <div class="ex-visual" style="width: 140px; height: 110px;">
      <!-- SVG Strict Press Bar Path -->
      <svg width="130" height="100" viewBox="0 0 140 100" fill="none">
        <line x1="70" y1="95" x2="70" y2="10" stroke="#38bdf8" stroke-width="2" stroke-dasharray="3 3"/>
        <path d="M58 92 L66 65 L66 42 L60 26 M74 92 L66 65" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <circle cx="67" cy="22" r="7" fill="#1e293b"/>
        <!-- Barbell overhead -->
        <path d="M40 16 L94 16" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round"/>
        <rect x="36" y="10" width="4" height="12" fill="#ef4444" rx="1"/>
        <rect x="94" y="10" width="4" height="12" fill="#ef4444" rx="1"/>
        <!-- Arms locked out -->
        <path d="M64 35 L48 20 M68 35 L86 20" stroke="#2563eb" stroke-width="3.5" stroke-linecap="round"/>
        <text x="8" y="55" font-size="7" fill="#2563eb" font-weight="bold">Barra Recta</text>
        <path d="M22 60 L22 40 L26 44" stroke="#2563eb" stroke-width="1.5" fill="none"/>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">1. Strict Overhead Press con Barra (Desde Rack)</span>
        <span class="ex-reps">5 Series × 5 Reps (RPE 7.5–8)</span>
      </div>
      <div class="ex-desc">
        • **Posición inicial:** Barra apoyada sobre clavículas y deltoides anterior, codos ligeramente adelantados, pies al ancho de cadera.<br>
        • **Ejecución:** Aprieta glúteos y cuádriceps al 100%. Retira ligeramente la cabeza hacia atrás para dejar paso a la barra y empuja en línea vertical recta. Bloquea codos arriba metiendo la cabeza entre los brazos (*active shoulders*).<br>
        • **Tempo:** **Baja en 3 segundos controlados** hasta el pecho. Prohibido doblar rodillas o impulsarse con las piernas.<br>
        • **Carga sugerida:** Si tu RM estimada son ~50 kg, trabaja las 5 series con **35 a 40 kg**.
      </div>
    </div>
  </div>

  <!-- EJERCICIO 2: RING DIPS / RING ROWS -->
  <div class="ex-card" style="border-left: 4px solid #10b981;">
    <div class="ex-visual" style="width: 140px; height: 110px;">
      <!-- SVG Ring Dips -->
      <svg width="130" height="100" viewBox="0 0 140 100" fill="none">
        <!-- Straps -->
        <line x1="45" y1="5" x2="45" y2="40" stroke="#64748b" stroke-width="2.5"/>
        <line x1="95" y1="5" x2="95" y2="40" stroke="#64748b" stroke-width="2.5"/>
        <!-- Rings -->
        <circle cx="45" cy="45" r="7" stroke="#0f172a" stroke-width="3" fill="none"/>
        <circle cx="95" cy="45" r="7" stroke="#0f172a" stroke-width="3" fill="none"/>
        <!-- Athlete in dip -->
        <circle cx="70" cy="30" r="7" fill="#1e293b"/>
        <path d="M70 37 L70 65 L65 88 M70 65 L75 88" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <path d="M70 42 L52 46 L45 42 M70 42 L88 46 L95 42" stroke="#10b981" stroke-width="3.5" stroke-linecap="round"/>
        <text x="50" y="98" font-size="7" fill="#047857" font-weight="bold">90° en codos</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">2. Strict Ring Dips (Fondos en Anillas Estrictos)</span>
        <span class="ex-reps">5 Series × 6–8 Reps</span>
      </div>
      <div class="ex-desc">
        • **Ajuste:** Coloca las anillas a la altura de tu cadera. Mantén el agarre neutro.<br>
        • **Ejecución:** Empieza en bloqueo completo con anillas pegadas al cuerpo y rotadas ligeramente hacia fuera (*turn-out*). Desciende hasta que el hombro baje por debajo del codo (90° de flexión) y empuja con pectoral y tríceps.<br>
        • **Escalado opcional:** Si los fondos en anillas resultan inestables, haz **Ring Rows horizontales con los pies sobre un cajón** (misma demanda brutal de hipertrofia para espalda y bíceps).
      </div>
    </div>
  </div>

  <h2>4. Consejos Técnicos de Biomecánica para Ganar Masa Muscular</h2>
  <div class="grid-3">
    <div class="callout info">
      <strong>🎯 Tensión Mecánica > Peso:</strong> En el Press con barra, un peso de 38 kg bajado en 3 segundos fatiga mucho más las fibras del deltoides que 45 kg soltados sin control. Prioriza el tempo.
    </div>
    <div class="callout warning">
      <strong>🔒 Bloqueo Lumbar:</strong> Mantén el abdomen metido y las costillas hacia abajo (*ribs down*). Evita arquear la espalda baja para trampear el peso arriba.
    </div>
    <div class="callout success">
      <strong>⏱️ Descanso Real:</strong> Si completas la biserie en 50 segundos, descansa los 1:40 min restantes. El sistema nervioso central necesita ese tiempo para reclutar unidades motoras de alto umbral.
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 2 de 3 · Fuerza Estricta Barbell & Rings</span>
  </div>
</div>

<!-- ==================== PÁGINA 3 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">PARTE B & C: METCON & CASH-OUT</span></div>
      <div class="subtitle">WOD de Pizarra AMRAP 12' + Blindaje de Sóleos y Core Anti-Rotación</div>
    </div>
    <div class="header-meta">
      <strong>Metcon:</strong> AMRAP 12 min (Ritmo RPE 7.5)<br>
      <strong>Cash-Out:</strong> 3 Rondas x Calidad (Sin crono)<br>
      <strong>Objetivo:</strong> Potencia metabólica + Crioterapia
    </div>
  </div>

  <h2>5. Part B: The Metcon (AMRAP 12 Minutos)</h2>
  
  <div class="metcon-box">
    <div class="metcon-header">
      <div>
        <span class="metcon-badge">AMRAP 12 MIN</span>
        <strong style="font-size: 9.5pt; color: #92400e; margin-left: 8px;">COMPLETA TANTAS RONDAS COMO PUEDAS EN 12 MINUTOS</strong>
      </div>
      <span style="font-size: 7.5pt; font-weight: 700; color: #b45309;">ESTRATEGIA: PASO CONSTANTE (4-5 RONDAS)</span>
    </div>

    <table>
      <tr>
        <th style="width: 18%;">Ejercicio</th>
        <th style="width: 14%;">Volumen</th>
        <th style="width: 48%;">Pautas de Ejecución y Ritmo</th>
        <th style="width: 20%;">Músculos Activos</th>
      </tr>
      <tr>
        <td><strong>Remo Concept2</strong></td>
        <td><strong>250 m</strong></td>
        <td>Ritmo de crucero (~1:48-1:52/500m). No sprintes; úsalo para recuperar aire entre rondas.</td>
        <td>Cardiovascular / Dorsal</td>
      </tr>
      <tr>
        <td><strong>Dual DB Push Press</strong></td>
        <td><strong>10 Reps</strong></td>
        <td>2 mancuernas de 15 o 17.5 kg. *Dip* corto de cadera (5 cm) y empuje violento con hombros.</td>
        <td>Deltoides / Tríceps</td>
      </tr>
      <tr>
        <td><strong>Strict Pull-ups</strong></td>
        <td><strong>8 Reps</strong></td>
        <td>Dominadas estrictas (o Ring Rows). Si te atascas, parte en 5 + 3. Nada de kipping descontrolado.</td>
        <td>Dorsal / Bíceps</td>
      </tr>
      <tr>
        <td><strong>Wall Walks</strong></td>
        <td><strong>3 Reps</strong></td>
        <td>Desde plancha en suelo, camina con los pies por la pared hasta tocar pecho. Baja con control.</td>
        <td>Hombros / Core</td>
      </tr>
      <tr>
        <td><strong>V-Ups / Toes to Bar</strong></td>
        <td><strong>12 Reps</strong></td>
        <td>Flexión activa de tronco en suelo o barra. Trabajo de flexores y pared abdominal.</td>
        <td>Recto Abdominal</td>
      </tr>
    </table>
  </div>

  <h2>6. Part C: Cash-Out & Marathon Armor (6-8 min · Sin reloj)</h2>
  <p>Al sonar la campana de los 12 minutos, respira 2 minutos y realiza estas 3 rondas enfocadas en blindar tendones:</p>

  <div class="grid-2">
    <div class="ex-card">
      <div class="ex-visual" style="width: 120px;">
        <!-- SVG Seated Soleus -->
        <svg width="110" height="75" viewBox="0 0 120 85" fill="none">
          <!-- Box -->
          <rect x="15" y="40" width="40" height="40" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
          <text x="24" y="63" font-size="7" fill="#475569" font-weight="bold">CAJÓN</text>
          <!-- Seated person -->
          <circle cx="35" cy="22" r="6" fill="#1e293b"/>
          <path d="M35 28 L35 52 L65 52 L65 72" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
          <!-- Bumper plate on knee -->
          <ellipse cx="65" cy="50" rx="14" ry="5" fill="#ef4444" stroke="#0f172a" stroke-width="2"/>
          <text x="56" y="52" font-size="6" fill="white" font-weight="bold">20kg</text>
          <!-- Elevated heel -->
          <path d="M65 72 L75 66" stroke="#2563eb" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M72 74 L78 64" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="2 1"/>
        </svg>
      </div>
      <div class="ex-info">
        <div class="ex-header">
          <span class="ex-title">Elevación de Sóleo Sentado</span>
          <span class="ex-reps">3 × 15 reps (Disco 20kg)</span>
        </div>
        <div class="ex-desc">
          Siéntate en el cajón, coloca un disco *bumper* de 20 kg sobre las rodillas. Sube talones y aguanta **2s de pausa arriba**. El sóleo es el escudo de tu tendón de Aquiles para Madrid.
        </div>
      </div>
    </div>

    <div class="ex-card">
      <div class="ex-visual" style="width: 120px;">
        <!-- SVG Pallof Press -->
        <svg width="110" height="75" viewBox="0 0 120 85" fill="none">
          <!-- Rig Post -->
          <rect x="15" y="10" width="8" height="70" fill="#334155" rx="1"/>
          <!-- Band -->
          <path d="M23 45 L60 45" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
          <!-- Athlete -->
          <circle cx="70" cy="24" r="6" fill="#1e293b"/>
          <path d="M70 30 L70 58 L63 80 M70 58 L77 80" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
          <!-- Hands pushing forward -->
          <path d="M70 38 L60 45 L85 45" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
          <circle cx="85" cy="45" r="3" fill="#0f172a"/>
          <text x="55" y="60" font-size="6" fill="#2563eb" font-weight="bold">Anti-Rotación</text>
        </svg>
      </div>
      <div class="ex-info">
        <div class="ex-header">
          <span class="ex-title">Press Pallof con Goma en Rig</span>
          <span class="ex-reps">3 × 10 / lado</span>
        </div>
        <div class="ex-desc">
          Banda atada al rig a la altura del pecho. Empuja hacia delante y aguanta 2 segundos sin dejar que el tronco rote. Fortalece los oblicuos y el plano transversal de carrera.
        </div>
      </div>
    </div>
  </div>

  <h2>7. Pautas de Nutrición y Recuperación Inmediata</h2>
  <div class="grid-2">
    <div class="callout warning">
      <strong>🥤 VENTANA ANABÓLICA (0–45 min):</strong><br>
      • Al terminar, tómate un batido de **25–30 g de proteína whey con 1 plátano** (o 150 g de queso batido con miel). Tus deltoides y dorsales necesitan aminoácidos inmediatos para sintetizar miofibrillas.
    </div>
    <div class="callout info">
      <strong>🚫 RECORDATORIO DE CRIOTERAPIA:</strong><br>
      • **Hoy NO toca bañera de hielo.** Como hemos trabajado hipertrofia de tren superior, el hielo bloquearía la señalización de la vía mTOR y frenaría el crecimiento muscular. Ducha templada/caliente.
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 3 de 3 · Metcon, Cash-Out & Nutrición</span>
  </div>
</div>

</body>
</html>`;

fs.writeFileSync(tempHtmlPath, html, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outputPdfPath}" --no-pdf-header-footer "${tempHtmlPath}"`;

console.log('Generando PDF del entrenamiento CrossFit con ilustraciones vectoriales...');
execSync(cmd, { stdio: 'inherit' });
console.log('PDF generado en:', outputPdfPath);

if (fs.existsSync('public')) {
  fs.copyFileSync(outputPdfPath, publicPdfPath);
  console.log('Copia guardada en public:', publicPdfPath);
}

const artifactDir = 'C:\\Users\\danie\\.gemini\\antigravity\\brain\\665c654b-d891-454d-bae8-5fad32cdce4b';
if (fs.existsSync(artifactDir)) {
  const artifactPdf = path.join(artifactDir, 'ENTRENO_CROSSFIT_TREN_SUPERIOR_DANI.pdf');
  fs.copyFileSync(outputPdfPath, artifactPdf);
  console.log('Copia guardada en artifact dir:', artifactPdf);
}

fs.unlinkSync(tempHtmlPath);
console.log('Proceso completado con éxito.');
