import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outputPngPath = path.resolve('GUIA_CROSSFIT_TREN_SUPERIOR_DANI.png');
const publicPngPath = path.resolve('public', 'GUIA_CROSSFIT_TREN_SUPERIOR_DANI.png');
const tempHtmlPath = path.resolve('temp_mobile_card.html');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    width: 1080px;
    height: 2050px;
    background: #090d16;
    color: #f1f5f9;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    padding: 44px 40px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
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
    letter-spacing: -0.02em;
    color: #ffffff;
    line-height: 1.15;
  }
  .title-group h1 span {
    color: #38bdf8;
  }
  .title-group p {
    font-size: 19px;
    color: #94a3b8;
    margin-top: 8px;
    font-weight: 500;
  }
  .badge {
    background: #2563eb;
    color: #ffffff;
    font-size: 15px;
    font-weight: 800;
    padding: 10px 18px;
    border-radius: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border: 1px solid #60a5fa;
  }

  /* Section Title */
  .section-title {
    font-size: 22px;
    font-weight: 800;
    color: #38bdf8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 22px 0 14px 0;
  }
  .section-title::after {
    content: "";
    flex: 1;
    height: 2px;
    background: #1e293b;
  }

  /* Cards Grid */
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
  }
  .class-card {
    background: #0f172a;
    border-radius: 18px;
    padding: 20px 18px;
    border: 2px solid #1e293b;
    position: relative;
    overflow: hidden;
  }
  .card-prio-1 { border-color: #10b981; background: #06231a; }
  .card-prio-2 { border-color: #38bdf8; background: #082136; }
  .card-prio-3 { border-color: #f59e0b; background: #261b07; }

  .prio-badge {
    display: inline-block;
    font-size: 13px;
    font-weight: 900;
    padding: 4px 10px;
    border-radius: 8px;
    margin-bottom: 10px;
    text-transform: uppercase;
  }
  .bg-prio-1 { background: #10b981; color: #022c22; }
  .bg-prio-2 { background: #38bdf8; color: #082f49; }
  .bg-prio-3 { background: #f59e0b; color: #451a03; }

  .class-card h3 {
    font-size: 20px;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 8px;
    line-height: 1.2;
  }
  .class-card ul {
    list-style: none;
    font-size: 15px;
    color: #cbd5e1;
    line-height: 1.45;
  }
  .class-card ul li {
    margin-bottom: 6px;
  }
  .class-card ul li strong {
    color: #ffffff;
  }

  /* Warning Box */
  .avoid-box {
    background: #200d11;
    border: 2px solid #e11d48;
    border-radius: 16px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 14px;
  }
  .avoid-icon {
    font-size: 32px;
  }
  .avoid-text {
    font-size: 15px;
    color: #fda4af;
    line-height: 1.4;
  }
  .avoid-text strong {
    color: #ffffff;
  }

  /* Finisher Routines Grid */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px;
  }
  .routine-card {
    background: #0f172a;
    border: 2px solid #334155;
    border-radius: 20px;
    padding: 22px 24px;
  }
  .routine-card.empuje {
    border-top: 5px solid #ec4899;
  }
  .routine-card.traccion {
    border-top: 5px solid #8b5cf6;
  }
  .routine-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid #1e293b;
  }
  .routine-header h4 {
    font-size: 20px;
    font-weight: 800;
    color: #ffffff;
  }
  .routine-tag {
    font-size: 13px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 8px;
  }
  .tag-empuje { background: #500724; color: #f472b6; border: 1px solid #db2777; }
  .tag-traccion { background: #2e1065; color: #c084fc; border: 1px solid #9333ea; }

  .exercise-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 11px 0;
    border-bottom: 1px solid #1e293b;
    font-size: 16px;
  }
  .exercise-item:last-child {
    border-bottom: none;
  }
  .ex-name {
    color: #f1f5f9;
    font-weight: 600;
  }
  .ex-detail {
    color: #38bdf8;
    font-weight: 800;
    font-size: 15px;
    background: #082136;
    padding: 4px 10px;
    border-radius: 8px;
    border: 1px solid #0369a1;
  }

  /* Golden Rules */
  .rules-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    margin-top: 10px;
  }
  .rule-card {
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    border: 1.5px solid #334155;
    border-radius: 18px;
    padding: 20px 18px;
    text-align: center;
  }
  .rule-icon {
    font-size: 34px;
    margin-bottom: 8px;
  }
  .rule-title {
    font-size: 16px;
    font-weight: 800;
    color: #ffffff;
    margin-bottom: 6px;
  }
  .rule-desc {
    font-size: 13.5px;
    color: #94a3b8;
    line-height: 1.4;
  }
  .rule-desc strong {
    color: #38bdf8;
  }

  /* Footer */
  .footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 2px solid #1e293b;
    padding-top: 18px;
    font-size: 14px;
    color: #64748b;
  }
  .footer strong {
    color: #94a3b8;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="title-group">
      <h1>GUÍA <span>CROSSFIT & HIPERTROFIA</span></h1>
      <p>Tren Superior Potente sin interferir con Maratón · Dani Espinosa</p>
    </div>
    <div class="badge">ROAD TO MADRID 2027</div>
  </div>

  <!-- SECCIÓN 1: QUÉ CLASES RESERVAR -->
  <div>
    <div class="section-title">1. ¿Qué clases reservar en la App del Box?</div>
    <div class="grid-3">
      <div class="class-card card-prio-1">
        <span class="prio-badge bg-prio-1">TOP 1 · OBLIGATORIA</span>
        <h3>STRENGTH / BARBELL</h3>
        <ul>
          <li>• <strong>Press Militar</strong> estricto</li>
          <li>• <strong>Press de Banca</strong> / Dips pesados</li>
          <li>• <strong>Dominadas lastradas</strong></li>
          <li>• <strong>Remos con barra</strong> (6–10 reps)</li>
          <li>🎯 <em>Tensión mecánica pura (RIR 1-2)</em></li>
        </ul>
      </div>

      <div class="class-card card-prio-2">
        <span class="prio-badge bg-prio-2">TOP 2 · EXCELENTE</span>
        <h3>GYMNASTICS / SKILL</h3>
        <ul>
          <li>• <strong>Fondos en anillas</strong> estrictos</li>
          <li>• <strong>Cuerda</strong> (Rope climbs)</li>
          <li>• <strong>HSPU</strong> (Pino estricto)</li>
          <li>• <strong>Isometrías y Core</strong></li>
          <li>🎯 <em>Hombros y dorsales densos</em></li>
        </ul>
      </div>

      <div class="class-card card-prio-3">
        <span class="prio-badge bg-prio-3">TOP 3 · METABÓLICO</span>
        <h3>UPPER BODY WODs</h3>
        <ul>
          <li>• <strong>Devil Press</strong> / DB Snatches</li>
          <li>• <strong>Wall Walks</strong> / Push-ups</li>
          <li>• <strong>Remo Concept2</strong> ergómetro</li>
          <li>• <strong>Pull-ups</strong> y Hand Release</li>
          <li>🎯 <em>Resistencia muscular anaeróbica</em></li>
        </ul>
      </div>
    </div>

    <div class="avoid-box">
      <div class="avoid-icon">⚠️</div>
      <div class="avoid-text">
        <strong>QUÉ EVITAR O MODERAR EN EL BOX:</strong> WODs con más de 100 saltos dobles de comba (*Double Unders*), saltos altos continuos a cajón o series de carrera al fallo en cinta curva. <em>Protege tus sóleos y tendones para el asfalto.</em>
      </div>
    </div>
  </div>

  <!-- SECCIÓN 2: FINISHER HIPERTROFIA 10 MIN -->
  <div>
    <div class="section-title">2. El Finisher Ninja de 10 Minutos (Post-WOD / Open Box)</div>
    <div class="grid-2">
      
      <!-- RUTINA EMPUJE -->
      <div class="routine-card empuje">
        <div class="routine-header">
          <h4>DÍA A · EMPUJE</h4>
          <span class="routine-tag tag-empuje">PECHO · HOMBRO · TRÍCEPS</span>
        </div>
        <div class="exercise-item">
          <span class="ex-name">Press inclinado mancuernas / Fondos</span>
          <span class="ex-detail">3 × 8–10 reps</span>
        </div>
        <div class="exercise-item">
          <span class="ex-name">Elevaciones laterales mancuerna</span>
          <span class="ex-detail">3 × 12–15 reps</span>
        </div>
        <div class="exercise-item">
          <span class="ex-name">Extensiones tríceps (anillas / polea)</span>
          <span class="ex-detail">2 × 12–15 reps</span>
        </div>
      </div>

      <!-- RUTINA TRACCIÓN -->
      <div class="routine-card traccion">
        <div class="routine-header">
          <h4>DÍA B · TRACCIÓN</h4>
          <span class="routine-tag tag-traccion">ESPALDA EN V · BÍCEPS</span>
        </div>
        <div class="exercise-item">
          <span class="ex-name">Remo mancuerna a 1 mano en banco</span>
          <span class="ex-detail">3 × 8–10 / lado</span>
        </div>
        <div class="exercise-item">
          <span class="ex-name">Face Pull con goma o polea</span>
          <span class="ex-detail">3 × 15 reps</span>
        </div>
        <div class="exercise-item">
          <span class="ex-name">Curl de bíceps con mancuernas</span>
          <span class="ex-detail">3 × 10–12 reps</span>
        </div>
      </div>

    </div>
  </div>

  <!-- SECCIÓN 3: REGLAS DE ORO -->
  <div>
    <div class="section-title">3. Las 3 Reglas de Oro para Crecer mientras Corres</div>
    <div class="rules-grid">
      <div class="rule-card">
        <div class="rule-icon">🥩</div>
        <div class="rule-title">130 – 140 g PROTEÍNA</div>
        <div class="rule-desc">
          Mantén <strong>1.9 g / kg de peso</strong>. Si no comes suficiente, el running catabolizará el músculo del torso.
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-icon">⏱️</div>
        <div class="rule-title">REGLA DE LAS 48 HORAS</div>
        <div class="rule-desc">
          Si vas al box el viernes o sábado, <strong>cero paliza en piernas</strong>: entrena solo torso y core para llegar fresco al domingo.
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-icon">🥤</div>
        <div class="rule-title">SHAKE POST-WOD (60')</div>
        <div class="rule-desc">
          Batido de <strong>25-30g proteína de suero + 1 plátano</strong> tras salir del box para frenar el desgaste y activar la síntesis muscular.
        </div>
      </div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div><strong>EntrenoApp</strong> · Algoritmo de Alto Rendimiento Híbrido</div>
    <div>Atleta: <strong>Daniel Espinosa</strong> · Objetivo: <strong>Sub-3h35:00</strong></div>
  </div>

</body>
</html>`;

fs.writeFileSync(tempHtmlPath, html, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless --disable-gpu --screenshot="${outputPngPath}" --window-size=1080,2050 --default-background-color=090d16 "${tempHtmlPath}"`;

console.log('Capturando imagen infográfica en resolución móvil...');
execSync(cmd, { stdio: 'inherit' });
console.log('Imagen generada en:', outputPngPath);

if (fs.existsSync('public')) {
  fs.copyFileSync(outputPngPath, publicPngPath);
  console.log('Copia guardada en public:', publicPngPath);
}

const artifactDir = 'C:\\Users\\danie\\.gemini\\antigravity\\brain\\665c654b-d891-454d-bae8-5fad32cdce4b';
if (fs.existsSync(artifactDir)) {
  const artifactPng = path.join(artifactDir, 'GUIA_CROSSFIT_TREN_SUPERIOR_DANI.png');
  fs.copyFileSync(outputPngPath, artifactPng);
  console.log('Copia guardada en artifact dir:', artifactPng);
}

fs.unlinkSync(tempHtmlPath);
console.log('Listo con éxito!');
