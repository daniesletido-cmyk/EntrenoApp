import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outputPdfPath = path.resolve('RUTINA_HIPERTROFIA_TORSO_Y_BLINDAJE_DANI.pdf');
const publicPdfPath = path.resolve('public', 'RUTINA_HIPERTROFIA_TORSO_Y_BLINDAJE_DANI.pdf');
const tempHtmlPath = path.resolve('temp_complete_routine.html');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Rutina Completa Ilustrada · Torso, Anillas y Blindaje Maratón · Dani Espinosa</title>
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
    font-size: 10pt;
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
  .card-blue { border-left: 4px solid #3b82f6; }
  .card-green { border-left: 4px solid #10b981; }
  .card-purple { border-left: 4px solid #8b5cf6; }
  .card-pink { border-left: 4px solid #ec4899; }
  .card-amber { border-left: 4px solid #f59e0b; }
  .card-cyan { border-left: 4px solid #06b6d4; }

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
  .target-blue { background: #dbeafe; color: #1e40af; }
  .target-green { background: #d1fae5; color: #065f46; }
  .target-purple { background: #ede9fe; color: #5b21b6; }
  .target-pink { background: #fce7f3; color: #9d174d; }
  .target-amber { background: #fef3c7; color: #92400e; }
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
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">RUTINA COMPLETA ILUSTRADA</span></div>
      <div class="subtitle">Calentamiento de Remo, Anillas, Hipertrofia de Torso y Blindaje · Dani Espinosa</div>
    </div>
    <div class="header-meta">
      <strong>Atleta:</strong> Daniel Espinosa | <strong>Fecha:</strong> Miércoles, 28/10/2026<br>
      <strong>Formato:</strong> Sin cronómetro (Calidad Pura) | <strong>Descansos:</strong> 1:30 - 2:00 min<br>
      <strong>Seguridad:</strong> Cuádriceps y hombros frontales intactos para los Thrusters de mañana
    </div>
  </div>

  <h2>1. Calentamiento Dinámico en Box (Remo, PVC, Escápulas & Core)</h2>
  <p>Realiza 2 a 3 rondas tranquilas a tu propio ritmo. El objetivo es activar la caja torácica, elevar la temperatura y lubricar los hombros sin gastar energía:</p>

  <div class="grid-4">
    <div class="warmup-card">
      <!-- SVG Concept2 Rower -->
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
      <div class="warmup-desc">Ritmo suave (~2:05/500m). Flujo sanguíneo a dorsales y piernas.</div>
    </div>

    <div class="warmup-card">
      <!-- SVG PVC pass through -->
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
      <!-- SVG Scapular pull up -->
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
      <!-- SVG Hollow hold -->
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

  <h2>2. Bloque 1: Pecho Masivo & Gimnásticos en Anillas</h2>

  <!-- EJERCICIO 1: PRESS BANCA MANCUERNAS -->
  <div class="ex-card card-blue">
    <div class="ex-visual">
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <rect x="25" y="55" width="80" height="8" rx="2" fill="#334155"/>
        <line x1="35" y1="63" x2="35" y2="85" stroke="#475569" stroke-width="3"/>
        <line x1="95" y1="63" x2="95" y2="85" stroke="#475569" stroke-width="3"/>
        <rect x="35" y="47" width="55" height="8" rx="3" fill="#1e293b"/>
        <circle cx="28" cy="51" r="5" fill="#1e293b"/>
        <path d="M90 51 L105 51 L105 85" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <ellipse cx="55" cy="48" rx="10" ry="4" fill="#3b82f6"/>
        <path d="M48 48 L42 32 M62 48 L68 32" stroke="#2563eb" stroke-width="3" stroke-linecap="round"/>
        <rect x="34" y="29" width="16" height="5" rx="1" fill="#0f172a"/>
        <rect x="60" y="29" width="16" height="5" rx="1" fill="#0f172a"/>
        <text x="44" y="16" font-size="6.5" fill="#2563eb" font-weight="bold">3s bajada</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">1. Press de Banca con Mancuernas en Banco Plano</span>
        <span class="ex-target target-blue">PECTORAL MAYOR & TRÍCEPS</span>
      </div>
      <div class="ex-metrics">4 Series × 8 a 10 Reps | Descanso: 1:30 - 2:00 min | Tempo 3-0-1</div>
      <div class="ex-desc">
        • <strong>Músculo:</strong> Pectoral mayor (fibras medias e inferiores). Empuje horizontal que no fatiga el hombro vertical de mañana.<br>
        • <strong>Técnica:</strong> Escápulas retraídas contra el banco. Codos en ángulo de 45° (forma de flecha, nunca en T abierta). <strong>Baja en 3 segundos lentos</strong> y empuja con fuerza hacia arriba.<br>
        • <span class="ex-error"><strong>Error:</strong> Rebotar las mancuernas en el pecho o arquear en exceso la zona lumbar.</span>
      </div>
    </div>
  </div>

  <!-- EJERCICIO 2: FONDOS EN ANILLAS O RING ROWS -->
  <div class="ex-card card-green">
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
        <span class="ex-title">2. Fondos en Anillas Estrictos (Ring Dips) o Ring Rows</span>
        <span class="ex-target target-green">PECTORAL, TRÍCEPS & ESTABILIZADORES</span>
      </div>
      <div class="ex-metrics">4 Series × 6 a 8 Reps | Descanso: 1:30 - 2:00 min | Calistenia Pura</div>
      <div class="ex-desc">
        • <strong>Músculo:</strong> Pectoral inferior, tríceps y estabilizadores escapulares profundos de la articulación del hombro.<br>
        • <strong>Técnica:</strong> En las anillas, mantén los brazos pegados al cuerpo. Desciende hasta 90° de codo con las anillas rozando las costillas y empuja hasta el bloqueo completo arriba con ligera rotación externa (*turn out*).<br>
        • <strong>Variante escalada en anillas:</strong> Si los fondos son muy inestables, haz **Ring Rows inclinados a 45°** (cuerpo recto como tabla, tirando hasta tocar el pecho a las anillas y aguantando 1s arriba).
      </div>
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 1 de 3 · Calentamiento & Bloque 1 (Pecho y Anillas)</span>
  </div>
</div>

<!-- ==================== PÁGINA 2 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">BLOQUE 2 & 3: ESPALDA & HOMBROS</span></div>
      <div class="subtitle">Densidad Dorsal, Espalda en V y Hombros 3D sin Sobrecarga</div>
    </div>
    <div class="header-meta">
      <strong>Foco Estético:</strong> Anchura de hombro y espalda en V<br>
      <strong>Seguridad:</strong> Cero fatiga en el deltoides anterior (fresco para Thrusters)
    </div>
  </div>

  <h2>3. Bloque 2: Espalda Densa & Expansión en V</h2>

  <!-- EJERCICIO 3: REMO EN CAJON -->
  <div class="ex-card card-green">
    <div class="ex-visual">
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <rect x="15" y="45" width="40" height="40" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
        <circle cx="35" cy="22" r="5" fill="#1e293b"/>
        <path d="M35 27 L75 27 L95 65 L95 85" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
        <path d="M40 27 L40 45" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M75 27 L60 45" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M55 27 L68 18 L68 40" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
        <rect x="62" y="38" width="12" height="6" rx="1" fill="#0f172a"/>
        <ellipse cx="60" cy="26" rx="9" ry="3.5" fill="#10b981"/>
        <text x="50" y="14" font-size="6.5" fill="#047857" font-weight="bold">Codo a cadera</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">3. Remo con Mancuerna a 1 Mano en Cajón</span>
        <span class="ex-target target-green">DORSAL ANCHO & ESPALDA MEDIA</span>
      </div>
      <div class="ex-metrics">4 Series × 10 Reps / brazo | Descanso: 1:15 - 1:30 min | Pausa 1s arriba</div>
      <div class="ex-desc">
        • <strong>Músculo:</strong> Dorsal ancho, redondo mayor y romboides. Construye la densidad y grosor de la espalda.<br>
        • <strong>Técnica:</strong> Apoya rodilla y mano firme en el cajón con espalda plana paralela al suelo. Tira de la mancuerna <strong>llevando el codo hacia la cadera</strong> (rozando el bolsillo). Aprieta 1 segundo arriba y baja despacio.<br>
        • <span class="ex-error"><strong>Error:</strong> Girar el tronco hacia arriba para subir el peso con inercia. El pecho mira siempre al cajón.</span>
      </div>
    </div>
  </div>

  <!-- EJERCICIO 4: DOMINADAS / RING ROWS CON PIES EN CAJÓN -->
  <div class="ex-card card-green">
    <div class="ex-visual">
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <line x1="25" y1="15" x2="105" y2="15" stroke="#334155" stroke-width="4" stroke-linecap="round"/>
        <circle cx="65" cy="26" r="6" fill="#1e293b"/>
        <path d="M65 32 L65 58 L58 82 M65 58 L72 82" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M48 15 L56 32 L65 34 M82 15 L74 32 L65 34" stroke="#10b981" stroke-width="3" stroke-linecap="round"/>
        <path d="M57 34 L73 34 L65 54 Z" fill="#10b981" opacity="0.7"/>
        <text x="46" y="92" font-size="6.5" fill="#047857" font-weight="bold">Pecho a la barra</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">4. Dominadas Estrictas (o Ring Rows Horizontales en Anillas)</span>
        <span class="ex-target target-green">DORSAL ANCHO (ANCHURA V)</span>
      </div>
      <div class="ex-metrics">4 Series × 6 a 8 Reps | Descanso: 1:30 - 2:00 min | Prohibido Kipping</div>
      <div class="ex-desc">
        • <strong>Músculo:</strong> Fibras laterales del dorsal ancho (la clave de la forma de V estética) y bíceps.<br>
        • <strong>Técnica:</strong> Agarre prono o neutro ligeramente más ancho que los hombros. Tira con los codos hacia abajo llevando el pecho alto hacia la barra o anillas. Baja controlando hasta estirar los brazos al 100%.<br>
        • <span class="ex-error"><strong>Error:</strong> Cruzar y patear con las piernas para trampear el ascenso.</span>
      </div>
    </div>
  </div>

  <h2>4. Bloque 3: Hombros 3D & Aislamiento de Brazos</h2>

  <!-- EJERCICIO 5: ELEVACIONES LATERALES -->
  <div class="ex-card card-purple">
    <div class="ex-visual">
      <svg width="100" height="75" viewBox="0 0 130 95" fill="none">
        <circle cx="65" cy="20" r="6" fill="#1e293b"/>
        <path d="M65 26 L65 58 L58 85 M65 58 L72 85" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
        <path d="M65 30 L30 32 M65 30 L100 32" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/>
        <rect x="22" y="27" width="8" height="10" rx="1" fill="#0f172a"/>
        <rect x="100" y="27" width="8" height="10" rx="1" fill="#0f172a"/>
        <circle cx="56" cy="30" r="3.5" fill="#8b5cf6"/>
        <circle cx="74" cy="30" r="3.5" fill="#8b5cf6"/>
        <text x="40" y="10" font-size="6.5" fill="#6d28d9" font-weight="bold">Hombro redondo</text>
      </svg>
    </div>
    <div class="ex-info">
      <div class="ex-header">
        <span class="ex-title">5. Elevaciones Laterales con Mancuernas</span>
        <span class="ex-target target-purple">DELTOIDES LATERAL</span>
      </div>
      <div class="ex-metrics">3 Series × 12 a 15 Reps | Descanso: 1:00 min | Carga moderada (6–10 kg)</div>
      <div class="ex-desc">
        • <strong>Músculo:</strong> Cabeza lateral del deltoides (responsable de la anchura y aspecto redondo del hombro).<br>
        • <strong>Técnica:</strong> Tronco inclinado 5° hacia delante con rodillas suaves. Eleva los brazos hacia los lados guiando con los codos como si vertieras dos jarras de agua. Baja en 2 segundos controlados.<br>
        • <span class="ex-error"><strong>Error:</strong> Usar balanceo de cadera o levantar las mancuernas por encima de los codos.</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 2 de 3 · Bloque 2 y 3 (Espalda Densa y Hombros)</span>
  </div>
</div>

<!-- ==================== PÁGINA 3 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">BLOQUE 3B & 4: BRAZOS & BLINDAJE</span></div>
      <div class="subtitle">Salud Escapular, Bíceps, Sóleo en Cajón y Core Anti-Rotación</div>
    </div>
    <div class="header-meta">
      <strong>Clave Maratón:</strong> Sóleo sentado a 90° (cuádriceps intactos)<br>
      <strong>Nutrición:</strong> Batido whey + plátano (0 frío hoy)
    </div>
  </div>

  <h2>5. Bloque 3B: Salud de Hombro & Bíceps</h2>

  <div class="grid-2">
    <!-- EJERCICIO 6: FACE PULLS -->
    <div class="ex-card card-purple">
      <div class="ex-visual">
        <svg width="90" height="70" viewBox="0 0 130 95" fill="none">
          <rect x="15" y="10" width="6" height="80" fill="#334155"/>
          <path d="M21 35 L68 35" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="78" cy="24" r="5" fill="#1e293b"/>
          <path d="M78 29 L78 56 L72 82 M78 56 L84 82" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M78 35 L68 35 M78 35 L88 28" stroke="#8b5cf6" stroke-width="3" stroke-linecap="round"/>
          <text x="45" y="48" font-size="6.5" fill="#b91c1c" font-weight="bold">A la frente</text>
        </svg>
      </div>
      <div class="ex-info">
        <div class="ex-header">
          <span class="ex-title">6. Face Pulls con Banda al Rig</span>
          <span class="ex-target target-purple">DELTOIDES POSTERIOR</span>
        </div>
        <div class="ex-metrics">3 Series × 15 Reps | 1:00 min</div>
        <div class="ex-desc">
          Banda a la altura de los ojos. Tira hacia tu frente abriendo las manos y llevando los codos hacia atrás y arriba como un doble bíceps. Protege el hombro.
        </div>
      </div>
    </div>

    <!-- EJERCICIO 7: CURL DE BÍCEPS -->
    <div class="ex-card card-pink">
      <div class="ex-visual">
        <svg width="90" height="70" viewBox="0 0 130 95" fill="none">
          <circle cx="65" cy="20" r="6" fill="#1e293b"/>
          <path d="M65 26 L65 58 L58 85 M65 58 L72 85" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M65 30 L55 45 L52 35 M65 30 L75 45 L78 35" stroke="#ec4899" stroke-width="3" stroke-linecap="round"/>
          <rect x="46" y="30" width="10" height="6" rx="1" fill="#0f172a"/>
          <rect x="74" y="30" width="10" height="6" rx="1" fill="#0f172a"/>
          <circle cx="53" cy="38" r="3.5" fill="#ec4899"/>
          <circle cx="77" cy="38" r="3.5" fill="#ec4899"/>
          <text x="44" y="10" font-size="6.5" fill="#be185d" font-weight="bold">Codos fijos</text>
        </svg>
      </div>
      <div class="ex-info">
        <div class="ex-header">
          <span class="ex-title">7. Curl de Bíceps Mancuerna</span>
          <span class="ex-target target-pink">BÍCEPS BRAQUIAL</span>
        </div>
        <div class="ex-metrics">3 Series × 10–12 Reps | 1:15 min</div>
        <div class="ex-desc">
          Codos pegados a las costillas. Sube girando la palma hacia arriba (o en martillo), aprieta 1s arriba y baja en 2s lentos sin balanceo de tronco.
        </div>
      </div>
    </div>
  </div>

  <h2>6. Bloque 4: Blindaje para la Maratón (Músculos Clave)</h2>

  <div class="grid-2">
    <!-- EJERCICIO 8: ELEVACIÓN DE SÓLEO -->
    <div class="ex-card card-amber">
      <div class="ex-visual">
        <svg width="90" height="70" viewBox="0 0 130 95" fill="none">
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
          <span class="ex-title">8. Elevación de Sóleo Sentado en Cajón</span>
          <span class="ex-target target-amber">SÓLEO (ESCUDO DE AQUILES)</span>
        </div>
        <div class="ex-metrics">3 Series × 15 Reps | Pausa: 2s arriba | 1:00 min</div>
        <div class="ex-desc">
          Disco de 20 kg sobre las rodillas. Sube talones al máximo, <strong>aguanta 2s de pausa isométrica arriba</strong> y desciende despacio. Al estar sentado a 90°, el cuádriceps descansa al 100%.
        </div>
      </div>
    </div>

    <!-- EJERCICIO 9: PRESS PALLOF -->
    <div class="ex-card card-cyan">
      <div class="ex-visual">
        <svg width="90" height="70" viewBox="0 0 130 95" fill="none">
          <rect x="18" y="15" width="7" height="70" fill="#334155" rx="1"/>
          <path d="M25 48 L65 48" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="75" cy="25" r="5" fill="#1e293b"/>
          <path d="M75 30 L75 60 L68 85 M75 60 L82 85" stroke="#1e293b" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M75 38 L65 48 L94 48" stroke="#06b6d4" stroke-width="3" stroke-linecap="round"/>
          <circle cx="94" cy="48" r="3" fill="#0f172a"/>
          <text x="50" y="62" font-size="6.5" fill="#0891b2" font-weight="bold">Anti-Rotación</text>
        </svg>
      </div>
      <div class="ex-info">
        <div class="ex-header">
          <span class="ex-title">9. Press Pallof con Banda en Rig</span>
          <span class="ex-target target-cyan">CORE ANTI-ROTACIÓN</span>
        </div>
        <div class="ex-metrics">3 Series × 10 Reps / lado | 1:00 min</div>
        <div class="ex-desc">
          Ponte de lado a la goma. Empuja hacia delante y aguanta 2 segundos resistiendo la torsión. Fortalece los oblicuos y estabiliza la pelvis para correr erguido en el km 35.
        </div>
      </div>
    </div>
  </div>

  <h2>7. Pauta de Nutrición y Recuperación Inmediata</h2>
  <div class="grid-2">
    <div class="callout success">
      <strong>🥤 PROTEÍNA INMEDIATA POST-ENTRENO (0–45 min):</strong><br>
      • Al terminar, tómate un batido de <strong>25–30 g de proteína whey con 1 plátano</strong> (o 150 g de queso batido / pechuga de pavo). Tus fibras musculares del torso necesitan aminoácidos para reparar y crecer.
    </div>
    <div class="callout info">
      <strong>🚫 RECORDATORIO DE CRIOTERAPIA:</strong><br>
      • <strong>Hoy NO uses la bañera de hielo.</strong> El frío extremo post-fuerza apaga la vía anabólica mTOR y frenaría las ganancias de masa muscular en el torso que acabas de estimular. Ducha templada/caliente.
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Dani Espinosa</span>
    <span>Página 3 de 3 · Bíceps, Sóleo, Core & Nutrición</span>
  </div>
</div>

</body>
</html>`;

fs.writeFileSync(tempHtmlPath, html, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outputPdfPath}" --no-pdf-header-footer "${tempHtmlPath}"`;

console.log('Generando PDF actualizado con calentamiento de remo y anillas...');
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
