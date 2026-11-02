import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outputPdfPath = path.resolve('RUTINA_HIPERTROFIA_TORSO_Y_BLINDAJE_DANI.pdf');
const publicPdfPath = path.resolve('public', 'RUTINA_HIPERTROFIA_TORSO_Y_BLINDAJE_DANI.pdf');
const tempHtmlPath = path.resolve('temp_hypertrophy_routine.html');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Rutina Ilustrada · Hipertrofia Tren Superior & Blindaje Maratón · Dani Espinosa</title>
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
    line-height: 1.36;
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

  /* Grids */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 8px;
  }

  /* Exercise Visual Card */
  .ex-card {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 10px;
    background: #ffffff;
    margin-bottom: 8px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .card-chest { border-top: 3.5px solid #3b82f6; }
  .card-back { border-top: 3.5px solid #10b981; }
  .card-shoulder { border-top: 3.5px solid #8b5cf6; }
  .card-arms { border-top: 3.5px solid #ec4899; }
  .card-legs { border-top: 3.5px solid #f59e0b; }
  .card-core { border-top: 3.5px solid #06b6d4; }

  .ex-visual {
    width: 120px;
    height: 105px;
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
    margin-bottom: 3px;
  }
  .ex-title {
    font-size: 8.5pt;
    font-weight: 800;
    color: #0f172a;
  }
  .ex-target {
    font-size: 7pt;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
  }
  .target-blue { background: #dbeafe; color: #1e40af; }
  .target-green { background: #d1fae5; color: #065f46; }
  .target-purple { background: #ede9fe; color: #5b21b6; }
  .target-pink { background: #fce7f3; color: #9d174d; }
  .target-amber { background: #fef3c7; color: #92400e; }
  .target-cyan { background: #cffafe; color: #155e75; }

  .ex-metrics {
    font-size: 7.2pt;
    font-weight: 700;
    color: #0369a1;
    margin-bottom: 3px;
  }
  .ex-desc {
    font-size: 7.2pt;
    color: #475569;
    line-height: 1.35;
  }
  .ex-desc strong {
    color: #0f172a;
  }
  .ex-error {
    font-size: 6.8pt;
    color: #b91c1c;
    margin-top: 2px;
  }

  /* Callouts */
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

  /* Summary Table */
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
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">GUÍA ILUSTRADA DE EJERCICIOS</span></div>
      <div class="subtitle">Hipertrofia de Torso sin Cronómetro & Protección para Mañana</div>
    </div>
    <div class="header-meta">
      <strong>Atleta:</strong> Daniel Espinosa | <strong>Fecha:</strong> Miércoles, 28/10/2026<br>
      <strong>Formato:</strong> Series y Repeticiones (Sin reloj · Calidad pura)<br>
      <strong>Objetivo:</strong> Masa Muscular de Torso + Blindaje de Sóleos
    </div>
  </div>

  <h2>1. Fundamento Biomecánico: Cero Interferencia con Mañana</h2>
  <div class="grid-2">
    <div class="callout warning">
      <strong>⚠️ EL RETO DE MAÑANA (JUEVES):</strong> Mañana tienes programada una clase exigente de CrossFit con <strong>Remo + 12 Thrusters con 42,5 kg</strong> (sentadilla frontal profunda + empuje vertical overhead). Tus cuádriceps y el empuje de hombro frontal (*deltoides anterior*) deben llegar al 100% de frescura.
    </div>
    <div class="callout success">
      <strong>🛡️ LA SOLUCIÓN DE HOY:</strong> Atacamos el <strong>Pectoral</strong> (empuje plano), la <strong>Espalda en V</strong> (tracción vertical/horizontal), los <strong>Hombros laterales/posteriores</strong> (anchura estética 3D), los <strong>Brazos</strong> y el <strong>Sóleo</strong> (con rodilla doblada a 90° para no tocar los cuádriceps). Cero prisas, descansos de 1:30–2:00 min.
    </div>
  </div>

  <h2>2. Bloque 1: Pecho Masivo & Espalda Densa</h2>

  <!-- EJERCICIO 1: PRESS BANCA MANCUERNAS -->
  <div class="ex-card card-chest">
    <div class="ex-visual">
      <!-- SVG Dumbbell Bench Press -->
      <svg width="110" height="90" viewBox="0 0 130 95" fill="none">
        <!-- Bench -->
        <rect x="25" y="55" width="80" height="8" rx="2" fill="#334155"/>
        <line x1="35" y1="63" x2="35" y2="85" stroke="#475569" stroke-width="3"/>
        <line x1="95" y1="63" x2="95" y2="85" stroke="#475569" stroke-width="3"/>
        <!-- Torso on bench -->
        <rect x="35" y="47" width="55" height="8" rx="3" fill="#1e293b"/>
        <circle cx="28" cy="51" r="5" fill="#1e293b"/>
        <!-- Bent legs -->
        <path d="M90 51 L105 51 L105 85" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <!-- Chest highlight -->
        <ellipse cx="55" cy="48" rx="10" ry="4" fill="#3b82f6"/>
        <!-- Arms and dumbbells -->
        <path d="M48 48 L42 32 M62 48 L68 32" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
        <!-- DBs -->
        <rect x="34" y="29" width="16" height="5" rx="1" fill="#0f172a"/>
        <rect x="60" y="29" width="16" height="5" rx="1" fill="#0f172a"/>
        <!-- Arrows showing lowering tempo -->
        <path d="M42 20 L42 27" stroke="#38bdf8" stroke-width="1.5" marker-end="url(#arrow)"/>
        <path d="M68 20 L68 27" stroke="#38bdf8" stroke-width="1.5"/>
        <text x="44" y="16" font-size="6.5" fill="#2563eb" font-weight="bold">3s bajada</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">1. Press de Banca con Mancuernas en Banco Plano</span>
        <span class="ex-target target-blue">PECTORAL MAYOR</span>
      </div>
      <div class="ex-metrics">4 Series × 8 a 10 Reps | Descanso: 1:30 - 2:00 min | Tempo: 3-0-1</div>
      <div class="ex-desc">
        • <strong>Músculo principal:</strong> Fibras medias e inferiores del pectoral mayor, tríceps y deltoides.<br>
        • <strong>Ejecución técnica:</strong> Retrae escápulas contra el banco. Coloca los codos en un ángulo de 45° respecto al torso (forma de flecha, nunca en T de 90°). <strong>Baja en 3 segundos lentos</strong> sintiendo el estiramiento en el pecho y empuja fuerte hacia arriba sin chocar mancuernas.<br>
        • <span class="ex-error"><strong>Error común:</strong> Levantar los glúteos del banco o arquear la zona lumbar en exceso.</span>
      </div>
    </div>
  </div>

  <!-- EJERCICIO 2: REMO CON MANCUERNA EN CAJÓN -->
  <div class="ex-card card-back">
    <div class="ex-visual">
      <!-- SVG One Arm DB Row -->
      <svg width="110" height="90" viewBox="0 0 130 95" fill="none">
        <!-- Plyo Box -->
        <rect x="15" y="45" width="40" height="40" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
        <!-- Athlete -->
        <circle cx="35" cy="22" r="5" fill="#1e293b"/>
        <!-- Horizontal Back -->
        <path d="M35 27 L75 27 L95 65 L95 85" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <!-- Supporting arm and knee on box -->
        <path d="M40 27 L40 45" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M75 27 L60 45" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Pulling arm bringing elbow to hip -->
        <path d="M55 27 L68 18 L68 40" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
        <!-- DB -->
        <rect x="62" y="38" width="12" height="6" rx="1" fill="#0f172a"/>
        <!-- Lat highlight -->
        <ellipse cx="60" cy="26" rx="9" ry="3.5" fill="#10b981"/>
        <text x="50" y="14" font-size="6.5" fill="#047857" font-weight="bold">Codo a la cadera</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">2. Remo con Mancuerna a 1 Mano en Cajón</span>
        <span class="ex-target target-green">DORSAL ANCHO & ESPALDA MEDIA</span>
      </div>
      <div class="ex-metrics">4 Series × 10 Reps / brazo | Descanso: 1:15 - 1:30 min | Pausa: 1s arriba</div>
      <div class="ex-desc">
        • <strong>Músculo principal:</strong> Dorsal ancho, redondo mayor, romboides y trapecio medio.<br>
        • <strong>Ejecución técnica:</strong> Apoya rodilla y mano firme en el cajón con espalda plana paralela al suelo. Tira de la mancuerna <strong>llevando el codo hacia la cadera</strong> (como si rascaras el bolsillo). Aguanta 1 segundo apretando la espalda y baja controlando.<br>
        • <span class="ex-error"><strong>Error común:</strong> Rotar el tronco hacia arriba para subir el peso con impulso.</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 1 de 3 · Fundamentos & Bloque 1 (Pecho y Espalda)</span>
  </div>
</div>

<!-- ==================== PÁGINA 2 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">BLOQUE 2 & 3: HOMBROS & BRAZOS</span></div>
      <div class="subtitle">Ensanchamiento en V, Deltoides 3D y Aislamiento de Brazos</div>
    </div>
    <div class="header-meta">
      <strong>Foco Estético:</strong> Anchura de hombro y espalda en V<br>
      <strong>Seguridad:</strong> Cero sobrecarga para los Thrusters de mañana
    </div>
  </div>

  <h2>3. Bloque 2: Espalda en V & Hombro 3D (Anchura Visual)</h2>

  <!-- EJERCICIO 3: DOMINADAS / RING ROWS -->
  <div class="ex-card card-back">
    <div class="ex-visual">
      <!-- SVG Strict Pull-up / Ring Row -->
      <svg width="110" height="90" viewBox="0 0 130 95" fill="none">
        <line x1="25" y1="15" x2="105" y2="15" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
        <!-- Athlete pulling up -->
        <circle cx="65" cy="26" r="6" fill="#1e293b"/>
        <path d="M65 32 L65 58 L58 82 M65 58 L72 82" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Arms bent pulling chest to bar -->
        <path d="M48 15 L56 32 L65 34 M82 15 L74 32 L65 34" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
        <!-- Back V highlight -->
        <path d="M57 34 L73 34 L65 54 Z" fill="#10b981" opacity="0.7"/>
        <text x="46" y="92" font-size="6.5" fill="#047857" font-weight="bold">Pecho a la barra</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">3. Dominadas Estrictas o Ring Rows en Anillas</span>
        <span class="ex-target target-green">DORSAL ANCHO (ANCHURA V)</span>
      </div>
      <div class="ex-metrics">4 Series × 6 a 8 Reps | Descanso: 1:30 - 2:00 min | Prohibido Kipping</div>
      <div class="ex-desc">
        • <strong>Músculo principal:</strong> Expansión de las alas dorsales y bíceps.<br>
        • <strong>Ejecución técnica:</strong> Agarre prono o neutro ligeramente más ancho que los hombros. Tira con los codos hacia el suelo llevando la parte alta del pecho hacia la barra. Baja hasta estirar los brazos por completo en cada repetición.<br>
        • <span class="ex-error"><strong>Error común:</strong> Cruzar y balancear las piernas o no completar el rango de extensión abajo.</span>
      </div>
    </div>
  </div>

  <!-- EJERCICIO 4: ELEVACIONES LATERALES -->
  <div class="ex-card card-shoulder">
    <div class="ex-visual">
      <!-- SVG Lateral Raises -->
      <svg width="110" height="90" viewBox="0 0 130 95" fill="none">
        <circle cx="65" cy="20" r="6" fill="#1e293b"/>
        <path d="M65 26 L65 58 L58 85 M65 58 L72 85" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Arms extended laterally -->
        <path d="M65 30 L30 32 M65 30 L100 32" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/>
        <!-- DBs -->
        <rect x="22" y="27" width="8" height="10" rx="1" fill="#0f172a"/>
        <rect x="100" y="27" width="8" height="10" rx="1" fill="#0f172a"/>
        <!-- Lateral delt highlight -->
        <circle cx="56" cy="30" r="3.5" fill="#8b5cf6"/>
        <circle cx="74" cy="30" r="3.5" fill="#8b5cf6"/>
        <text x="40" y="10" font-size="6.5" fill="#6d28d9" font-weight="bold">Hombro redondo</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">4. Elevaciones Laterales con Mancuernas</span>
        <span class="ex-target target-purple">DELTOIDES LATERAL</span>
      </div>
      <div class="ex-metrics">3 Series × 12 a 15 Reps | Descanso: 1:00 min | Carga moderada (6–10 kg)</div>
      <div class="ex-desc">
        • <strong>Músculo principal:</strong> Deltoides lateral (cabeza media del hombro, da el aspecto 3D y ancho).<br>
        • <strong>Ejecución técnica:</strong> Inclina el tronco 5° hacia delante con rodillas desbloqueadas. Eleva las mancuernas hacia los lados guiando el movimiento con los codos ligeramente flexionados. Imagina que viertes agua de dos jarras. Baja en 2 segundos.<br>
        • <span class="ex-error"><strong>Error común:</strong> Encoger los trapecios o elevar las muñecas por encima de los codos.</span>
      </div>
    </div>
  </div>

  <h2>4. Bloque 3: Salud Articular & Brazos (Aislamiento Puro)</h2>

  <!-- EJERCICIO 5: FACE PULLS -->
  <div class="ex-card card-shoulder">
    <div class="ex-visual">
      <!-- SVG Face Pull on Rig -->
      <svg width="110" height="90" viewBox="0 0 130 95" fill="none">
        <!-- Rig Upright -->
        <rect x="15" y="10" width="6" height="80" fill="#334155"/>
        <!-- Resistance band -->
        <path d="M21 35 L68 35" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Athlete pulling to eyes -->
        <circle cx="78" cy="24" r="5" fill="#1e293b"/>
        <path d="M78 29 L78 56 L72 82 M78 56 L84 82" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Elbows flared back high -->
        <path d="M78 35 L68 35 M78 35 L88 28" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/>
        <text x="45" y="48" font-size="6.5" fill="#b91c1c" font-weight="bold">A la frente</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">5. Face Pulls con Banda Elástica al Rig</span>
        <span class="ex-target target-purple">DELTOIDES POSTERIOR & MANGUITO</span>
      </div>
      <div class="ex-metrics">3 Series × 15 Reps | Descanso: 1:00 min | Salud Escapular</div>
      <div class="ex-desc">
        • <strong>Músculo principal:</strong> Deltoides posterior, infraespinoso, redondo menor y trapecio medio.<br>
        • <strong>Ejecución técnica:</strong> Ancla la goma a la altura de tus ojos. Sujeta con agarre neutro, da un paso atrás y tira hacia tu frente abriendo las manos y llevando los codos hacia atrás y arriba como un doble bíceps. Aguanta 1 segundo.<br>
        • <span class="ex-error"><strong>Error común:</strong> Llevar los codos pegados a las costillas en lugar de abrirlos hacia atrás.</span>
      </div>
    </div>
  </div>

  <!-- EJERCICIO 6: CURL DE BÍCEPS -->
  <div class="ex-card card-arms">
    <div class="ex-visual">
      <!-- SVG Bicep Curl -->
      <svg width="110" height="90" viewBox="0 0 130 95" fill="none">
        <circle cx="65" cy="20" r="6" fill="#1e293b"/>
        <path d="M65 26 L65 58 L58 85 M65 58 L72 85" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Arms curling DBs -->
        <path d="M65 30 L55 45 L52 35 M65 30 L75 45 L78 35" stroke="#ec4899" stroke-width="3" stroke-linecap="round"/>
        <!-- DB in hand -->
        <rect x="46" y="30" width="10" height="6" rx="1" fill="#0f172a"/>
        <rect x="74" y="30" width="10" height="6" rx="1" fill="#0f172a"/>
        <!-- Bicep highlight -->
        <circle cx="53" cy="38" r="3.5" fill="#ec4899"/>
        <circle cx="77" cy="38" r="3.5" fill="#ec4899"/>
        <text x="44" y="10" font-size="6.5" fill="#be185d" font-weight="bold">Codos fijos</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">6. Curl de Bíceps con Mancuernas (Supino / Martillo)</span>
        <span class="ex-target target-pink">BÍCEPS BRAQUIAL</span>
      </div>
      <div class="ex-metrics">3 Series × 10 a 12 Reps | Descanso: 1:15 min | Tensión Constante</div>
      <div class="ex-desc">
        • <strong>Músculo principal:</strong> Ambas cabezas del bíceps braquial y braquiorradial.<br>
        • <strong>Ejecución técnica:</strong> Codos clavados a los costados de tus costillas en todo momento. Sube flexionando el brazo, gira la muñeca hacia arriba en la parte alta, aprieta 1 segundo el bíceps y desciende en 2 segundos.<br>
        • <span class="ex-error"><strong>Error común:</strong> Adelantar los codos para usar el hombro o balancear el tronco hacia atrás.</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 2 de 3 · Bloque 2 y 3 (Hombros 3D y Brazos)</span>
  </div>
</div>

<!-- ==================== PÁGINA 3 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">BLOQUE 4: BLINDAJE MARATÓN</span></div>
      <div class="subtitle">Sóleo Aislado sin Fatiga de Cuádriceps & Core Anti-Rotación</div>
    </div>
    <div class="header-meta">
      <strong>Clave para Madrid 2027:</strong> Absorción de impacto en asfalto<br>
      <strong>Impacto en Piernas:</strong> 0% en cuádriceps (frescos para mañana)
    </div>
  </div>

  <h2>5. Bloque 4: Blindaje para la Maratón (Músculos Clave)</h2>

  <!-- EJERCICIO 7: ELEVACIÓN DE SÓLEO -->
  <div class="ex-card card-legs">
    <div class="ex-visual">
      <!-- SVG Seated Soleus on Box -->
      <svg width="110" height="90" viewBox="0 0 130 95" fill="none">
        <!-- Plyo Box -->
        <rect x="20" y="45" width="40" height="40" fill="#cbd5e1" stroke="#64748b" stroke-width="2"/>
        <text x="28" y="68" font-size="6.5" fill="#475569" font-weight="bold">CAJÓN</text>
        <!-- Athlete seated at 90 deg -->
        <circle cx="40" cy="25" r="5" fill="#1e293b"/>
        <path d="M40 30 L40 54 L72 54 L72 75" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <!-- 20kg Bumper Plate on knees -->
        <ellipse cx="72" cy="52" rx="14" ry="5" fill="#ef4444" stroke="#0f172a" stroke-width="2"/>
        <text x="63" y="54" font-size="6" fill="white" font-weight="bold">20kg</text>
        <!-- Elevated Heel -->
        <path d="M72 75 L84 68" stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Soleus Muscle Highlight -->
        <ellipse cx="72" cy="65" rx="3.5" ry="6" fill="#f59e0b"/>
        <text x="82" y="78" font-size="6.5" fill="#b45309" font-weight="bold">Talón arriba</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">7. Elevación de Sóleo Sentado en Cajón con Disco</span>
        <span class="ex-target target-amber">SÓLEO (PANTORRILLA PROFUNDA)</span>
      </div>
      <div class="ex-metrics">3 Series × 15 Reps | Pausa: 2s arriba | Descanso: 1:00 min</div>
      <div class="ex-desc">
        • <strong>Músculo principal:</strong> Sóleo (absorbe hasta 8 veces tu peso corporal en cada zancada de maratón).<br>
        • <strong>Por qué se hace sentado:</strong> Al flexionar la rodilla a 90°, el gemelo (*gastrocnemio*) se desactiva mecánicamente por insuficiencia activa. <strong>El 100% de la carga recae en el sóleo</strong>, blindando tu tendón de Aquiles sin cansar tus piernas para los thrusters de mañana.<br>
        • <strong>Ejecución técnica:</strong> Disco de 15 o 20 kg sobre las rodillas. Sube los talones al máximo, <strong>aguanta 2 segundos de contracción isométrica arriba</strong> y desciende despacio.
      </div>
    </div>
  </div>

  <!-- EJERCICIO 8: PRESS PALLOF -->
  <div class="ex-card card-core">
    <div class="ex-visual">
      <!-- SVG Pallof Press -->
      <svg width="110" height="90" viewBox="0 0 130 95" fill="none">
        <!-- Rig Upright -->
        <rect x="18" y="15" width="7" height="70" fill="#334155" rx="1"/>
        <!-- Red Band -->
        <path d="M25 48 L65 48" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
        <!-- Athlete standing sideways -->
        <circle cx="75" cy="25" r="5" fill="#1e293b"/>
        <path d="M75 30 L75 60 L68 85 M75 60 L82 85" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Pushing hands forward -->
        <path d="M75 38 L65 48 L94 48" stroke="#06b6d4" stroke-width="3" stroke-linecap="round"/>
        <circle cx="94" cy="48" r="3" fill="#0f172a"/>
        <!-- Core highlight -->
        <rect x="71" y="40" width="8" height="14" fill="#06b6d4" opacity="0.6"/>
        <text x="50" y="62" font-size="6.5" fill="#0891b2" font-weight="bold">Anti-Rotación</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">8. Press Pallof con Banda Elástica en el Rig</span>
        <span class="ex-target target-cyan">CORE ANTI-ROTACIÓN & OBLICUOS</span>
      </div>
      <div class="ex-metrics">3 Series × 10 Reps / lado | Pausa: 2s estirado | Descanso: 1:00 min</div>
      <div class="ex-desc">
        • <strong>Músculo principal:</strong> Oblicuo interno, oblicuo externo y transverso del abdomen.<br>
        • <strong>Ejecución técnica:</strong> Ata la goma al rig a la altura de tu esternón. Sepárate de lado hasta notar tensión. Empuja las manos en línea recta hacia delante, <strong>aguanta 2 segundos resistiendo la fuerza que intenta girarte el cuerpo</strong> y vuelve al pecho con control.<br>
        • <span class="ex-error"><strong>Error común:</strong> Dejarse vencer y rotar los hombros hacia el poste del rig.</span>
      </div>
    </div>
  </div>

  <h2>6. Pauta de Nutrición y Recuperación Inmediata</h2>
  <div class="grid-2">
    <div class="callout success">
      <strong>🥤 PROTEÍNA INMEDIATA POST-ENTRENO (0–45 min):</strong><br>
      • Al terminar la sesión, tómate un batido de <strong>25–30 g de proteína whey con 1 plátano</strong> (o 150 g de queso batido / pechuga de pavo). Tus fibras musculares del torso necesitan aminoácidos libres para reparar y crecer.
    </div>
    <div class="callout info">
      <strong>🚫 RECORDATORIO DE CRIOTERAPIA:</strong><br>
      • <strong>Hoy NO uses la bañera de hielo.</strong> El frío extremo post-fuerza apaga la vía anabólica mTOR y frenaría las ganancias de masa muscular en el torso que acabas de estimular. Ducha templada/caliente.
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 3 de 3 · Bloque 4 (Sóleo y Core) & Nutrición</span>
  </div>
</div>

</body>
</html>`;

fs.writeFileSync(tempHtmlPath, html, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outputPdfPath}" --no-pdf-header-footer "${tempHtmlPath}"`;

console.log('Generando PDF ilustrativo de hipertrofia de torso y blindaje...');
execSync(cmd, { stdio: 'inherit' });
console.log('PDF generado en:', outputPdfPath);

if (fs.existsSync('public')) {
  fs.copyFileSync(outputPdfPath, publicPdfPath);
  console.log('Copia guardada en public:', publicPdfPath);
}

const artifactDir = 'C:\\Users\\danie\\.gemini\\antigravity\\brain\\665c654b-d891-454d-bae8-5fad32cdce4b';
if (fs.existsSync(artifactDir)) {
  const artifactPdf = path.join(artifactDir, 'RUTINA_HIPERTROFIA_TORSO_Y_BLINDAJE_DANI.pdf');
  fs.copyFileSync(outputPdfPath, artifactPdf);
  console.log('Copia guardada en artifact dir:', artifactPdf);
}

fs.unlinkSync(tempHtmlPath);
console.log('Proceso completado con éxito.');
