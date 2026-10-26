import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outputPngPath = path.resolve('public', 'GUIA_EJERCICIOS_GIMNASIO_DANI.png');
const artifactDir = 'C:\\Users\\danie\\.gemini\\antigravity\\brain\\d0e3ab16-658c-455f-aedc-c3cb3daab02f';
const artifactPngPath = path.join(artifactDir, 'GUIA_EJERCICIOS_GIMNASIO_DANI.png');
const tempHtmlPath = path.resolve('temp_gym_guide.html');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1200px;
    background: #090d16;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 44px 44px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  /* Header */
  .header {
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 2px solid #334155;
    border-radius: 24px;
    padding: 32px 36px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .title-group h1 {
    font-size: 34px;
    font-weight: 900;
    color: #ffffff;
    line-height: 1.15;
  }
  .title-group h1 span { color: #38bdf8; }
  .title-group p {
    font-size: 18px;
    color: #94a3b8;
    margin-top: 8px;
    font-weight: 500;
  }
  .badge-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .badge {
    background: #2563eb;
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    padding: 8px 16px;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .badge-sub {
    font-size: 13px;
    color: #cbd5e1;
    font-weight: 600;
  }

  /* Section Title */
  .section-tag {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.3);
    padding: 6px 14px;
    border-radius: 8px;
    margin-bottom: 12px;
  }

  /* Exercise Grid */
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }

  .exercise-card {
    background: #111827;
    border: 1.5px solid #1f2937;
    border-radius: 20px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    position: relative;
    overflow: hidden;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #1f2937;
    padding-bottom: 14px;
  }

  .ex-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: #3b82f6;
    color: white;
    font-weight: 900;
    border-radius: 8px;
    font-size: 15px;
    margin-right: 10px;
  }

  .ex-title-wrap {
    display: flex;
    align-items: center;
    flex: 1;
  }

  .ex-title {
    font-size: 20px;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.25;
  }

  .ex-series {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
    font-size: 13px;
    font-weight: 800;
    padding: 4px 10px;
    border-radius: 6px;
    white-space: nowrap;
  }

  /* Exercise Visual / Diagram Box */
  .visual-box {
    background: #0d131f;
    border: 1px solid #1e293b;
    border-radius: 14px;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 16px;
  }

  .diagram-step {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    text-align: center;
  }

  .diagram-step svg {
    width: 140px;
    height: 95px;
  }

  .diagram-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #94a3b8;
  }

  /* Cues and Details */
  .cues-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    line-height: 1.45;
    color: #cbd5e1;
  }

  .cue-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .cue-dot {
    color: #38bdf8;
    font-size: 16px;
    line-height: 1;
  }

  .cue-item strong {
    color: #ffffff;
  }

  .key-warning {
    background: rgba(245, 158, 11, 0.08);
    border: 1px solid rgba(245, 158, 11, 0.25);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 12.5px;
    color: #fbbf24;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Bottom Banner */
  .footer-banner {
    background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
    border: 1.5px solid #4338ca;
    border-radius: 18px;
    padding: 22px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .footer-banner h3 {
    font-size: 18px;
    color: #c7d2fe;
    font-weight: 800;
  }

  .footer-banner p {
    font-size: 14px;
    color: #94a3b8;
    margin-top: 4px;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="title-group">
      <h1>GUÍA VISUAL · <span>FUERZA COMPENSATORIA EN BOX</span></h1>
      <p>Entrenamiento de Gimnasio Libre · Miércoles 28 Octubre · Material CrossFit</p>
    </div>
    <div class="badge-col">
      <div class="badge">Miércoles Libre Box</div>
      <div class="badge-sub">Atleta: Daniel Espinosa</div>
    </div>
  </div>

  <!-- EXERCISES GRID -->
  <div class="grid">

    <!-- EJERCICIO 1: PRESS BANCA CON MANCUERNAS -->
    <div class="exercise-card">
      <div class="card-top">
        <div class="ex-title-wrap">
          <span class="ex-num">1</span>
          <div class="ex-title">Press Banca con Mancuernas</div>
        </div>
        <span class="ex-series">4 x 8-10 reps (RPE 7.5)</span>
      </div>

      <div class="visual-box">
        <div class="diagram-step">
          <!-- SVG START -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Bench -->
            <rect x="25" y="65" width="90" height="10" rx="3" fill="#334155" />
            <rect x="35" y="75" width="8" height="15" fill="#1e293b" />
            <rect x="97" y="75" width="8" height="15" fill="#1e293b" />
            <!-- Body lying -->
            <circle cx="38" cy="55" r="7" fill="#64748b" />
            <rect x="44" y="52" width="55" height="13" rx="4" fill="#38bdf8" />
            <!-- Legs bent to floor -->
            <path d="M92 58 L108 58 L114 85" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Arms lowered (elbows 45°) -->
            <path d="M58 52 L50 42" stroke="#f43f5e" stroke-width="5" stroke-linecap="round" />
            <path d="M50 42 L50 32" stroke="#f43f5e" stroke-width="5" stroke-linecap="round" />
            <!-- Dumbbell low -->
            <rect x="42" y="28" width="16" height="6" rx="2" fill="#e2e8f0" />
            <circle cx="42" cy="31" r="5" fill="#94a3b8" />
            <circle cx="58" cy="31" r="5" fill="#94a3b8" />
          </svg>
          <span class="diagram-label">Fase 1: Bajada a 45°</span>
        </div>
        <div class="diagram-step">
          <!-- SVG FINISH -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="65" width="90" height="10" rx="3" fill="#334155" />
            <rect x="35" y="75" width="8" height="15" fill="#1e293b" />
            <rect x="97" y="75" width="8" height="15" fill="#1e293b" />
            <circle cx="38" cy="55" r="7" fill="#64748b" />
            <rect x="44" y="52" width="55" height="13" rx="4" fill="#38bdf8" />
            <path d="M92 58 L108 58 L114 85" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Arms pushed up -->
            <path d="M58 52 L56 22" stroke="#10b981" stroke-width="5" stroke-linecap="round" />
            <!-- Dumbbell high -->
            <rect x="48" y="16" width="16" height="6" rx="2" fill="#e2e8f0" />
            <circle cx="48" cy="19" r="5" fill="#94a3b8" />
            <circle cx="64" cy="19" r="5" fill="#94a3b8" />
            <!-- Up arrow -->
            <path d="M78 35 L78 20 M74 24 L78 20 L82 24" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="diagram-label">Fase 2: Empuje Vertical</span>
        </div>
      </div>

      <div class="cues-list">
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Posición:</strong> Pies planos clavados al suelo, glúteos y escápulas pegados al banco.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Codos a 45°-60°:</strong> No abras los codos en cruz a 90° para blindar el manguito rotador.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Tempo 3-0-1:</strong> Baja en 3 segundos sintiendo el pectoral y sube con potencia en 1s.</span></div>
      </div>
      <div class="key-warning">⚠️ No choques las mancuernas arriba; mantén la tensión en el pectoral.</div>
    </div>

    <!-- EJERCICIO 2: REMO EN ANILLAS INCLINADO (RING ROWS) -->
    <div class="exercise-card">
      <div class="card-top">
        <div class="ex-title-wrap">
          <span class="ex-num">2</span>
          <div class="ex-title">Ring Rows Escalados a 45°-60°</div>
        </div>
        <span class="ex-series">4 x 8-10 reps (Tempo 3-0-1)</span>
      </div>

      <div class="visual-box">
        <div class="diagram-step">
          <!-- SVG START -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Rig top beam -->
            <line x1="20" y1="5" x2="120" y2="5" stroke="#475569" stroke-width="4" stroke-linecap="round" />
            <!-- Strap -->
            <line x1="50" y1="5" x2="60" y2="35" stroke="#94a3b8" stroke-width="2" />
            <circle cx="62" cy="38" r="5" stroke="#f59e0b" stroke-width="2.5" fill="none" />
            <!-- Body inclined 50deg straight line -->
            <circle cx="68" cy="48" r="6" fill="#64748b" />
            <line x1="72" y1="52" x2="105" y2="85" stroke="#38bdf8" stroke-width="8" stroke-linecap="round" />
            <!-- Arms extended -->
            <line x1="68" y1="48" x2="62" y2="38" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
            <!-- Feet anchor -->
            <line x1="100" y1="88" x2="114" y2="88" stroke="#334155" stroke-width="4" />
          </svg>
          <span class="diagram-label">Inicio: Brazos Estirados</span>
        </div>
        <div class="diagram-step">
          <!-- SVG PULL -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="20" y1="5" x2="120" y2="5" stroke="#475569" stroke-width="4" stroke-linecap="round" />
            <line x1="50" y1="5" x2="52" y2="28" stroke="#94a3b8" stroke-width="2" />
            <circle cx="53" cy="32" r="5" stroke="#f59e0b" stroke-width="2.5" fill="none" />
            <!-- Body pulled closer -->
            <circle cx="58" cy="36" r="6" fill="#64748b" />
            <line x1="62" y1="40" x2="98" y2="85" stroke="#10b981" stroke-width="8" stroke-linecap="round" />
            <!-- Arms bent, elbows back -->
            <path d="M58 36 L68 40 L53 32" stroke="#10b981" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
            <!-- Feet -->
            <line x1="93" y1="88" x2="107" y2="88" stroke="#334155" stroke-width="4" />
            <!-- Arrow -->
            <path d="M40 50 L48 40 M42 42 L48 40 L48 46" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="diagram-label">Final: Pecho a Anillas (1s)</span>
        </div>
      </div>

      <div class="cues-list">
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Regulación de Dureza:</strong> Da 2-3 pasos atrás para inclinarte a 45°-60° (menos peso corporal).</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Cuerpo como una Tabla:</strong> Abdomen y glúteos apretados; no dejes caer la cadera hacia abajo.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Giro de Muñecas:</strong> Empieza con palmas al suelo y acaba tocando el pecho con palmas neutras.</span></div>
      </div>
      <div class="key-warning">💡 Clave: Pausa de 1 seg con escápulas apretadas y baja en 3 segundos lentos.</div>
    </div>

    <!-- EJERCICIO 3: REMO UNILATERAL CON MANCUERNA EN CAJÓN -->
    <div class="exercise-card">
      <div class="card-top">
        <div class="ex-title-wrap">
          <span class="ex-num">3</span>
          <div class="ex-title">Remo Unilateral en Cajón/Banco</div>
        </div>
        <span class="ex-series">3 x 10 reps/lado (RPE 7.5)</span>
      </div>

      <div class="visual-box">
        <div class="diagram-step">
          <!-- SVG START -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Box -->
            <rect x="20" y="45" width="45" height="42" rx="4" fill="#334155" stroke="#475569" stroke-width="1.5" />
            <!-- Supporting hand and knee -->
            <circle cx="32" cy="45" r="4" fill="#94a3b8" />
            <circle cx="55" cy="45" r="4" fill="#94a3b8" />
            <!-- Spine flat -->
            <circle cx="28" cy="22" r="6" fill="#64748b" />
            <line x1="32" y1="26" x2="80" y2="28" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" />
            <!-- Standing leg back -->
            <path d="M80 28 L95 55 L95 87" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />
            <!-- Arm down with dumbbell -->
            <line x1="48" y1="28" x2="48" y2="65" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
            <rect x="41" y="65" width="14" height="6" rx="2" fill="#e2e8f0" />
            <circle cx="41" cy="68" r="5" fill="#94a3b8" />
            <circle cx="55" cy="68" r="5" fill="#94a3b8" />
          </svg>
          <span class="diagram-label">Inicio: Brazo Estirado</span>
        </div>
        <div class="diagram-step">
          <!-- SVG PULL -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="45" width="45" height="42" rx="4" fill="#334155" stroke="#475569" stroke-width="1.5" />
            <circle cx="32" cy="45" r="4" fill="#94a3b8" />
            <circle cx="55" cy="45" r="4" fill="#94a3b8" />
            <circle cx="28" cy="22" r="6" fill="#64748b" />
            <line x1="32" y1="26" x2="80" y2="28" stroke="#10b981" stroke-width="7" stroke-linecap="round" />
            <path d="M80 28 L95 55 L95 87" stroke="#10b981" stroke-width="5" stroke-linecap="round" />
            <!-- Arm pulled elbow to hip -->
            <path d="M48 28 L62 18 L60 38" stroke="#10b981" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            <rect x="53" y="38" width="14" height="6" rx="2" fill="#e2e8f0" />
            <circle cx="53" cy="41" r="5" fill="#94a3b8" />
            <circle cx="67" cy="41" r="5" fill="#94a3b8" />
            <!-- Up arrow -->
            <path d="M68 55 L68 45 M65 48 L68 45 L71 48" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="diagram-label">Final: Codo hacia la Cadera</span>
        </div>
      </div>

      <div class="cues-list">
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Espalda Paralela al Suelo:</strong> Cuello neutro, mirada ligeramente hacia adelante en el suelo.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Trayectoria en Arco:</strong> No tires en vertical hacia el hombro; lleva la mancuerna hacia el bolsillo.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Antirotación:</strong> Mantén los dos hombros a la misma altura, sin rotar el torso.</span></div>
      </div>
      <div class="key-warning">🎯 Beneficio: Elimina descompensaciones entre el lado izquierdo y derecho de tu espalda.</div>
    </div>

    <!-- EJERCICIO 4: ELEVACIONES DE SÓLEO SENTADO EN CAJÓN -->
    <div class="exercise-card">
      <div class="card-top">
        <div class="ex-title-wrap">
          <span class="ex-num">4</span>
          <div class="ex-title">Sóleo Sentado en Cajón con Discos</div>
        </div>
        <span class="ex-series">3 x 15 reps (Pausa 2s)</span>
      </div>

      <div class="visual-box">
        <div class="diagram-step">
          <!-- SVG BOTTOM -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Box sitting -->
            <rect x="25" y="42" width="40" height="45" rx="3" fill="#334155" stroke="#475569" stroke-width="1.5" />
            <!-- Torso upright -->
            <circle cx="45" cy="22" r="6" fill="#64748b" />
            <line x1="45" y1="28" x2="45" y2="52" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" />
            <!-- Thigh 90 deg -->
            <line x1="45" y1="52" x2="80" y2="52" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" />
            <!-- Shin vertical -->
            <line x1="80" y1="52" x2="80" y2="80" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" />
            <!-- Plate under toes -->
            <rect x="75" y="82" width="25" height="5" rx="1" fill="#64748b" />
            <!-- Heel dropped down -->
            <line x1="80" y1="80" x2="74" y2="86" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
            <line x1="80" y1="80" x2="95" y2="82" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" />
            <!-- Bumper Plate on knees -->
            <rect x="72" y="32" width="16" height="18" rx="2" fill="#0284c7" stroke="#38bdf8" stroke-width="2" />
          </svg>
          <span class="diagram-label">Estiramiento Abajo</span>
        </div>
        <div class="diagram-step">
          <!-- SVG RAISED -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="42" width="40" height="45" rx="3" fill="#334155" stroke="#475569" stroke-width="1.5" />
            <circle cx="45" cy="22" r="6" fill="#64748b" />
            <line x1="45" y1="28" x2="45" y2="52" stroke="#10b981" stroke-width="7" stroke-linecap="round" />
            <line x1="45" y1="52" x2="80" y2="48" stroke="#10b981" stroke-width="7" stroke-linecap="round" />
            <line x1="80" y1="48" x2="84" y2="74" stroke="#10b981" stroke-width="6" stroke-linecap="round" />
            <rect x="75" y="82" width="25" height="5" rx="1" fill="#64748b" />
            <!-- Heel raised high -->
            <line x1="84" y1="74" x2="95" y2="82" stroke="#10b981" stroke-width="4" stroke-linecap="round" />
            <!-- Bumper Plate on knees raised -->
            <rect x="72" y="28" width="16" height="18" rx="2" fill="#059669" stroke="#34d399" stroke-width="2" />
            <!-- Up arrow -->
            <path d="M100 70 L100 58 M97 61 L100 58 L103 61" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="diagram-label">Elevación Máxima (2s)</span>
        </div>
      </div>

      <div class="cues-list">
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Setup en Box:</strong> Siéntate en cajón. Pon la punta de los pies sobre un disco de 10-15 kg en el suelo.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Carga:</strong> Coloca 1 o 2 discos bumper de 15-20 kg directamente encima de las rodillas.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Rodilla flexionada a 90°:</strong> Esto desactiva el gemelo y aísla el SÓLEO al 100%.</span></div>
      </div>
      <div class="key-warning">🛡️ Vital: El sóleo soporta hasta 8x tu peso en cada pisada de maratón. ¡Blindaje puro!</div>
    </div>

    <!-- EJERCICIO 5: HIP THRUST EN BANCO CON DISCO BUMPER -->
    <div class="exercise-card">
      <div class="card-top">
        <div class="ex-title-wrap">
          <span class="ex-num">5</span>
          <div class="ex-title">Hip Thrust con Disco Bumper</div>
        </div>
        <span class="ex-series">3 x 12 reps (1s arriba)</span>
      </div>

      <div class="visual-box">
        <div class="diagram-step">
          <!-- SVG BOTTOM -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Bench -->
            <rect x="20" y="48" width="30" height="35" rx="3" fill="#334155" />
            <circle cx="36" cy="40" r="5" fill="#64748b" />
            <!-- Back inclined down to floor -->
            <line x1="36" y1="45" x2="65" y2="70" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" />
            <!-- Thigh to knee -->
            <line x1="65" y1="70" x2="88" y2="55" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" />
            <!-- Shin to floor -->
            <line x1="88" y1="55" x2="90" y2="83" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" />
            <!-- Bumper on hips -->
            <ellipse cx="65" cy="65" rx="8" ry="12" fill="#0284c7" stroke="#38bdf8" stroke-width="2" />
          </svg>
          <span class="diagram-label">Abajo: Cadera Flexionada</span>
        </div>
        <div class="diagram-step">
          <!-- SVG TOP BRIDGE -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="20" y="48" width="30" height="35" rx="3" fill="#334155" />
            <circle cx="36" cy="40" r="5" fill="#64748b" />
            <!-- Spine & Thigh horizontal table -->
            <line x1="36" y1="46" x2="85" y2="46" stroke="#10b981" stroke-width="8" stroke-linecap="round" />
            <!-- Shin vertical 90deg -->
            <line x1="85" y1="46" x2="86" y2="83" stroke="#10b981" stroke-width="6" stroke-linecap="round" />
            <!-- Bumper locked top -->
            <ellipse cx="60" cy="40" rx="8" ry="12" fill="#059669" stroke="#34d399" stroke-width="2" />
            <!-- Up arrow -->
            <path d="M60 62 L60 50 M57 53 L60 50 L63 53" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span class="diagram-label">Arriba: Puente Completo (1s)</span>
        </div>
      </div>

      <div class="cues-list">
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Apoyo:</strong> Borde inferior de las escápulas apoyado en el banco plano del box.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Ángulo de Rodillas:</strong> Al subir, tus rodillas deben quedar justo a 90° sobre los talones.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Mirada al frente:</strong> Mantén la barbilla pegada al pecho (no mires al techo para no arquear lumbar).</span></div>
      </div>
      <div class="key-warning">🍑 Activación: Aprieta los glúteos con fuerza arriba. Es el motor principal de la zancada.</div>
    </div>

    <!-- EJERCICIO 6 & 7: PRESS PALLOF EN RIG & PLANCHA LATERAL -->
    <div class="exercise-card">
      <div class="card-top">
        <div class="ex-title-wrap">
          <span class="ex-num">6+7</span>
          <div class="ex-title">Core: Press Pallof & Plancha Lateral</div>
        </div>
        <span class="ex-series">3 x 12 reps / 3 x 30s</span>
      </div>

      <div class="visual-box">
        <div class="diagram-step">
          <!-- SVG PALLOF -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Rig upright post -->
            <line x1="20" y1="10" x2="20" y2="88" stroke="#475569" stroke-width="5" />
            <!-- Band attached -->
            <path d="M20 48 Q 50 49 70 48" stroke="#a855f7" stroke-width="3" stroke-dasharray="3 2" />
            <!-- Standing human side/front -->
            <circle cx="85" cy="22" r="6" fill="#64748b" />
            <line x1="85" y1="28" x2="85" y2="58" stroke="#38bdf8" stroke-width="7" stroke-linecap="round" />
            <line x1="85" y1="58" x2="78" y2="86" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />
            <line x1="85" y1="58" x2="92" y2="86" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />
            <!-- Hands pushing band forward -->
            <line x1="85" y1="36" x2="70" y2="48" stroke="#10b981" stroke-width="4" stroke-linecap="round" />
          </svg>
          <span class="diagram-label">Press Pallof con Goma</span>
        </div>
        <div class="diagram-step">
          <!-- SVG SIDE PLANK -->
          <svg viewBox="0 0 140 95" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="20" y1="85" x2="120" y2="85" stroke="#334155" stroke-width="3" />
            <!-- Forearm on floor -->
            <line x1="45" y1="85" x2="45" y2="65" stroke="#94a3b8" stroke-width="4" stroke-linecap="round" />
            <!-- Body line in plank -->
            <circle cx="48" cy="48" r="5" fill="#64748b" />
            <line x1="50" y1="52" x2="105" y2="80" stroke="#10b981" stroke-width="7" stroke-linecap="round" />
            <!-- Leg abduction raised -->
            <line x1="75" y1="65" x2="100" y2="58" stroke="#38bdf8" stroke-width="5" stroke-linecap="round" />
          </svg>
          <span class="diagram-label">Plancha Lateral + Abducción</span>
        </div>
      </div>

      <div class="cues-list">
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Press Pallof:</strong> Ata una banda elástica al rig a la altura del pecho. Aléjate y extiende los brazos hacia adelante resistiendo la torsión.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Plancha Lateral:</strong> Codo alineado con el hombro, cadera alta y despegada del suelo.</span></div>
        <div class="cue-item"><span class="cue-dot">▸</span><span><strong>Anti-Rotación:</strong> Evita que el tronco baile al correr, transfiriendo el 100% de energía hacia adelante.</span></div>
      </div>
      <div class="key-warning">🔒 Estabilidad Lumbo-Pélvica: El pilar que protege tus rodillas del impacto repetido.</div>
    </div>

  </div>

  <!-- FOOTER BANNER -->
  <div class="footer-banner">
    <div>
      <h3>EntrenoApp · Plan de Fuerza Adaptado a Box de CrossFit</h3>
      <p>Entrenamiento complementario de carrera: cero impacto articular en piernas, máxima postura y blindaje.</p>
    </div>
    <div class="badge" style="background:#4338ca;">Objetivo Maratón Madrid</div>
  </div>

</body>
</html>`;

fs.writeFileSync(tempHtmlPath, html, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless --disable-gpu --screenshot="${outputPngPath}" --window-size=1200,1650 --default-background-color=090d16 "${tempHtmlPath}"`;

console.log('Capturando imagen infográfica de ejercicios...');
execSync(cmd, { stdio: 'inherit' });
console.log('Imagen generada en:', outputPngPath);

if (fs.existsSync(artifactDir)) {
  fs.copyFileSync(outputPngPath, artifactPngPath);
  console.log('Copia guardada en artifact dir:', artifactPngPath);
}

fs.unlinkSync(tempHtmlPath);
console.log('Listo con éxito!');
