import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Planificación Maratón de Madrid · Daniel Espinosa</title>
<style>
  @page {
    size: A4 portrait;
    margin: 12mm 14mm 14mm 14mm;
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
    line-height: 1.45;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
  }
  .page {
    page-break-after: always;
    position: relative;
    padding-bottom: 20px;
  }
  .page:last-child {
    page-break-after: avoid;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2.5px solid #2563eb;
    padding-bottom: 10px;
    margin-bottom: 16px;
  }
  .brand-title {
    font-size: 18pt;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: #0f172a;
    line-height: 1.1;
  }
  .brand-badge {
    display: inline-block;
    background: #2563eb;
    color: white;
    font-size: 7.5pt;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 4px;
    margin-left: 6px;
    vertical-align: middle;
  }
  .subtitle {
    font-size: 9pt;
    color: #64748b;
    font-weight: 500;
    margin-top: 2px;
  }
  .header-meta {
    text-align: right;
    font-size: 8.5pt;
    color: #475569;
  }
  .header-meta strong {
    color: #0f172a;
    font-weight: 700;
  }
  h2 {
    font-size: 12.5pt;
    font-weight: 800;
    color: #0f172a;
    margin: 14px 0 8px 0;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  h3 {
    font-size: 10.5pt;
    font-weight: 700;
    color: #1e293b;
    margin: 10px 0 4px 0;
  }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  .kpi-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
  }
  .kpi-label {
    font-size: 7.5pt;
    text-transform: uppercase;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.04em;
  }
  .kpi-value {
    font-size: 13pt;
    font-weight: 900;
    color: #0f172a;
    margin-top: 2px;
    line-height: 1.1;
  }
  .kpi-sub {
    font-size: 7.5pt;
    color: #2563eb;
    font-weight: 600;
    margin-top: 2px;
  }
  .alert-box {
    background: #eff6ff;
    border-left: 4px solid #2563eb;
    padding: 8px 12px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 12px;
    font-size: 8.8pt;
    color: #1e3a8a;
  }
  .warning-box {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    padding: 8px 12px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 12px;
    font-size: 8.8pt;
    color: #78350f;
  }
  .sector-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 8px;
  }
  .sector-header {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    font-size: 9pt;
    color: #0f172a;
    margin-bottom: 4px;
  }
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
  }
  .badge-danger { background: #fee2e2; color: #991b1b; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .badge-success { background: #dcfce7; color: #166534; }
  .badge-blue { background: #dbeafe; color: #1e40af; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 6px;
    margin-bottom: 12px;
    font-size: 8.5pt;
  }
  th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    font-size: 8pt;
    text-transform: uppercase;
  }
  td {
    padding: 5px 8px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background: #f8fafc;
  }
  .discipline-carrera { color: #166534; font-weight: 700; }
  .discipline-crossfit { color: #b45309; font-weight: 700; }
  .discipline-natacion { color: #0369a1; font-weight: 700; }
  .discipline-descanso { color: #64748b; font-weight: 600; }

  .footer-note {
    font-size: 7.5pt;
    color: #94a3b8;
    text-align: center;
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    margin-top: 10px;
  }
</style>
</head>
<body>

<!-- PÁGINA 1: AUDITORÍA Y PERFIL DEL MARATÓN DE MADRID -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">PRO EDITION</span></div>
      <div class="subtitle">Auditoría Técnica & Planificación Fisiológica · Maratón de Madrid 2027</div>
    </div>
    <div class="header-meta">
      <strong>Atleta:</strong> Daniel Espinosa<br>
      <strong>Objetivo:</strong> Sub-3h35 / 3h40 (5:00 - 5:12/km)<br>
      <strong>Fecha Carrera:</strong> Domingo 25 de Abril de 2027
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">VAM de Referencia</div>
      <div class="kpi-value">3:59 <span style="font-size:9pt;font-weight:600">min/km</span></div>
      <div class="kpi-sub">15,06 km/h · Test 5 min</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ritmo Objetivo (RMC)</div>
      <div class="kpi-value">5:05 <span style="font-size:9pt;font-weight:600">min/km</span></div>
      <div class="kpi-sub">Rango: 5:00 - 5:12/km</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Desnivel Madrid</div>
      <div class="kpi-value">+420m <span style="font-size:9pt;font-weight:600">D+</span></div>
      <div class="kpi-sub">Cota: 580m a 720m</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Modelo Concurrente</div>
      <div class="kpi-value">Híbrido</div>
      <div class="kpi-sub">Run + Crossfit + Natación</div>
    </div>
  </div>

  <div class="alert-box">
    <strong>DIAGNÓSTICO FISIOLÓGICO:</strong> El Maratón de Madrid (Zurich Rock 'n' Roll Running Series) penaliza severamente el ritmo plano constante. Presenta dos grandes trampas biomecánicas: el <strong>daño excéntrico acumulado en cuádriceps</strong> por las bajadas de los primeros 20 km y el <strong>ascenso continuado de +100m en los últimos 11 km</strong> (Pirámides -> Atocha -> Calle Alfonso XII -> Retiro). Quien no entrene la potencia en pendiente y la tolerancia muscular previa colapsa entre el km 32 y el 38.
  </div>

  <h2>1. Desglose Táctico del Recorrido de Madrid</h2>

  <div class="sector-card">
    <div class="sector-header">
      <span>Sector 1 (Km 0 a 5) · Salida en Castellana a Cuatro Torres</span>
      <span class="badge badge-warning">Pendiente Positiva +50m (1-2%)</span>
    </div>
    <div style="font-size:8.5pt; color:#475569">
      <strong>Pauta Fisiológica:</strong> Salida a 670m subiendo hacia 720m en Plaza de Castilla. No dejarse llevar por la masa ni la adrenalina. Correr a 5:05/km aquí exige un coste cardíaco equivalente a 4:45/km en llano. <em>Táctica:</em> Ceder +10-15s/km (<strong>5:15 – 5:25 min/km</strong>), RPE 4-5.
    </div>
  </div>

  <div class="sector-card">
    <div class="sector-header">
      <span>Sector 2 (Km 5 a 20) · Bravo Murillo, Gran Vía y Calle Mayor</span>
      <span class="badge badge-danger">Impacto Excéntrico Severo (-70m)</span>
    </div>
    <div style="font-size:8.5pt; color:#475569">
      <strong>Pauta Biomecánica:</strong> Bajada rápida con adoquines y curvas. El frenado del impacto vertical destruye las fibras del vasto medial y tendón rotuliano. <em>Táctica:</em> Mantener cadencia alta (180 ppm), zancada corta y rodar a ritmo crucero fluido (<strong>4:58 – 5:05 min/km</strong>) sin zancadas amplias de talón.
    </div>
  </div>

  <div class="sector-card">
    <div class="sector-header">
      <span>Sector 3 (Km 20 a 30) · Casa de Campo y Madrid Río</span>
      <span class="badge badge-blue">Cota Mínima 580m · Toboganes</span>
    </div>
    <div style="font-size:8.5pt; color:#475569">
      <strong>Pauta Metabólica:</strong> Superficie mixta de tierra prensada y asfalto. Zona de estabilización de ritmo maratón (<strong>5:00 – 5:08 min/km</strong>). Obligatorio ingerir 1 gel de 30-40g de HC cada 40 min + agua/sales en cada avituallamiento.
    </div>
  </div>

  <div class="sector-card">
    <div class="sector-header">
      <span>Sector 4 (Km 31 a 42.195) · Pirámides, Atocha y Muro de Alfonso XII a Retiro</span>
      <span class="badge badge-danger">La Gran Subida (+100m D+)</span>
    </div>
    <div style="font-size:8.5pt; color:#475569">
      <strong>El Desafío Decisivo:</strong> Subida continua desde Pirámides hasta meta. Las rampas del 3-4% en Alfonso XII (km 38-40) castigan cuádriceps y sóleos fatigosos. <em>Táctica:</em> Apoyo de glúteo mayor y braceo firme a <strong>5:10 – 5:15 min/km</strong> para cruzar meta con la cabeza alta.
    </div>
  </div>

  <h2>2. Escala de Zonas VAM (Base: 3:59 min/km · 15,06 km/h)</h2>
  <table>
    <thead>
      <tr>
        <th>Zona</th>
        <th>Nombre y Enfoque</th>
        <th>Ritmo / km</th>
        <th>% VAM</th>
        <th>RPE</th>
        <th>Propósito Específico Madrid</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>R0</strong></td>
        <td>Regenerativo</td>
        <td>> 5:25 (5:30 - 6:00)</td>
        <td>< 70%</td>
        <td>3 - 4</td>
        <td>Drenar fatiga tras CrossFit o tiradas sin estrés articular.</td>
      </tr>
      <tr>
        <td><strong>R1</strong></td>
        <td>Base Aeróbica</td>
        <td>5:00 - 5:25</td>
        <td>70% - 78%</td>
        <td>4 - 5</td>
        <td>Construcción mitocondrial y quema de grasas. Ritmo conversacional.</td>
      </tr>
      <tr>
        <td><strong>R2</strong></td>
        <td>Tempo Progresivo</td>
        <td>4:35 - 4:59</td>
        <td>78% - 85%</td>
        <td>6 - 7</td>
        <td>Velocidad de crucero medio. Tolerancia y reciclaje de lactato.</td>
      </tr>
      <tr>
        <td><strong>R3</strong></td>
        <td>Series de Umbral</td>
        <td>4:10 - 4:35</td>
        <td>85% - 92%</td>
        <td>7 - 8</td>
        <td>Series largas (1.200m a 2.000m). Aclaramiento de lactato sin acidosis extrema.</td>
      </tr>
      <tr>
        <td><strong>R4</strong></td>
        <td>Ritmo Maratón Objetivo</td>
        <td>5:00 - 5:12</td>
        <td>75% - 80%</td>
        <td>6</td>
        <td>Ritmo específico clavado de carrera para Madrid con pulsaciones estables.</td>
      </tr>
      <tr>
        <td><strong>R5</strong></td>
        <td>Tirada Larga Volumen</td>
        <td>5:10 - 5:30 (ondulado)</td>
        <td>70% - 77%</td>
        <td>5 - 6</td>
        <td>Suma de volumen (14k a 34k) con desnivel para habituación excéntrica.</td>
      </tr>
      <tr>
        <td><strong>R6</strong></td>
        <td>Activación / Cuestas</td>
        <td>Sub-3:55 (o cuestas 80m)</td>
        <td>> 100%</td>
        <td>8 - 9</td>
        <td>Potencia elástica, reclutamiento neural y cadencia sin impacto articular.</td>
      </tr>
    </tbody>
  </table>

  <div class="footer-note">EntrenoApp · Preparación Oficial Maratón de Madrid · Daniel Espinosa · Hoja 1 de 2</div>
</div>

<!-- PÁGINA 2: PLANIFICACIÓN DETALLADA Y PROTOCOLO DE CARGA -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">PLAN DE ACCIÓN</span></div>
      <div class="subtitle">Programación de Cargas, Intervalos y Adaptaciones Semanales</div>
    </div>
    <div class="header-meta">
      <strong>VAM:</strong> 3:59 min/km · <strong>ACWR:</strong> 0.8 - 1.25<br>
      <strong>Estado:</strong> Guardado en Sistema (SQLite)
    </div>
  </div>

  <h2>3. Veredicto sobre Intervalos y Prevención en Modelo Concurrente</h2>
  <div class="sector-card" style="margin-bottom:12px">
    <div style="font-size:8.8pt; color:#334155; line-height:1.5">
      <strong>Veredicto del Entrenador:</strong> Para un atleta que entrena <strong>CrossFit 2 días por semana</strong>, las series tradicionales en pista (400-800m a tope) son un factor de riesgo para el tendón de Aquiles, sóleos y fascies plantares. En su lugar, el plan integra:
      <ul style="margin:4px 0 4px 16px; padding:0">
        <li><strong>Fase 1B (Base y Potencia):</strong> <em>Cuestas cortas (8x70m en rampa 4-5%)</em> con bajada al paso. La pendiente reduce el impacto vertical a cero y dispara la potencia de propulsión.</li>
        <li><strong>Fase 2 (Construcción):</strong> <em>Intervalos fraccionados de umbral R3 (4x1.200m a 4:18-4:20/km o 3x2.000m a 4:15/km)</em> con descansos activos de 90s al trote suave.</li>
        <li><strong>Fase 3 (Especificidad Madrid):</strong> <em>Tiradas largas con tramo final en pendiente simulada</em> a Ritmo Maratón (5:05/km).</li>
        <li><strong>Papel de la Natación:</strong> Funciona como <strong>descarga articular y regeneración activa</strong> los miércoles con uso de pull-buoy para aislar la cadena posterior y relajar sóleos.</li>
      </ul>
    </div>
  </div>

  <h2>4. Planificación Semanal Optimizada en la App (Semanas Clave)</h2>
  <table>
    <thead>
      <tr>
        <th style="width:14%">Día / Fecha</th>
        <th style="width:14%">Disciplina</th>
        <th style="width:24%">Código / Sesión</th>
        <th style="width:48%">Estructura & Pauta Fisiológica Detallada</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Sáb 17/10</strong></td>
        <td><span class="discipline-descanso">DESCANSO</span></td>
        <td><strong>Movilidad + 6x60m</strong></td>
        <td>15 min movilidad articular de cadera + 6x60m aceleraciones suaves en llano a alta cadencia (180 ppm). Despertar neural pre-tirada.</td>
      </tr>
      <tr>
        <td><strong>Dom 18/10</strong></td>
        <td><span class="discipline-carrera">CARRERA</span></td>
        <td><strong>R5 (Tirada 14k · +120m D+)</strong></td>
        <td><strong>14 km continuos:</strong> 10 km base R1 (5:20-5:10/km) + 4 km buscando toboganes y repechos moderados a ritmo maratón (5:05-5:10/km). Gel en km 8.</td>
      </tr>
      <tr>
        <td><strong>Lun 19/10</strong></td>
        <td><span class="discipline-crossfit">CROSSFIT</span></td>
        <td><strong>Fuerza Box (Sem 7)</strong></td>
        <td>Clase dirigida en Box (RPE 7-8). Progresión de fuerza básica, tren superior y estabilidad lumbo-pélvica.</td>
      </tr>
      <tr>
        <td><strong>Mar 20/10</strong></td>
        <td><span class="discipline-carrera">CARRERA</span></td>
        <td><strong>R1 + 8 Cuestas Cortas</strong></td>
        <td><strong>7.5 km:</strong> 20 min rodaje suave R1 + técnica de carrera + <strong>8x70m en rampa 5%</strong> a ritmo vivo potente (RPE 7-8). Bajada caminando despacio.</td>
      </tr>
      <tr>
        <td><strong>Mié 21/10</strong></td>
        <td><span class="discipline-natacion">NATACIÓN</span></td>
        <td><strong>NAT-C (1.900m Umbral)</strong></td>
        <td>350m cal. + 4x50m cambios + <strong>3x(300m pull-buoy ritmo tempo + 100m suave)</strong> desc. 30s. El pull-buoy neutraliza la fatiga de sóleos.</td>
      </tr>
      <tr>
        <td><strong>Jue 22/10</strong></td>
        <td><span class="discipline-crossfit">CROSSFIT</span></td>
        <td><strong>WOD Box (Sem 7)</strong></td>
        <td>Condicionamiento metabólico y core (RPE 7-8). Dosificar impactos repetitivos en gemelos de cara al fin de semana.</td>
      </tr>
      <tr>
        <td><strong>Vie 23/10</strong></td>
        <td><span class="discipline-descanso">DESCANSO</span></td>
        <td><strong>Descanso Total</strong></td>
        <td>Descanso total y estiramientos suaves de psoas y glúteos. Asimilación de carga y recarga de glucógeno muscular.</td>
      </tr>
      <tr>
        <td><strong>Sáb 24/10</strong></td>
        <td><span class="discipline-carrera">CARRERA</span></td>
        <td><strong>R1 Regenerativo 6 km</strong></td>
        <td>6 km continuos muy suaves (>5:25/km) + 4 rectas progresivas de 80m. Piernas frescas y llenas de energía para el domingo.</td>
      </tr>
      <tr>
        <td><strong>Dom 25/10</strong></td>
        <td><span class="discipline-carrera">CARRERA</span></td>
        <td><strong>R5 (Tirada 16k · +150m D+)</strong></td>
        <td><strong>16 km:</strong> 12 km base (5:25-5:10/km) + <strong>últimos 4 km a Ritmo Maratón (5:00-5:05/km)</strong> con repechos. Geles en km 8 y 13.</td>
      </tr>
      <tr>
        <td><strong>Mar 27/10</strong></td>
        <td><span class="discipline-carrera">CARRERA</span></td>
        <td><strong>R3 (Umbral: 4x1.200m)</strong></td>
        <td>2 km cal. + <strong>4x1.200m a 4:18-4:20 min/km</strong> (recup. activa: 90s al trote 6:00/km) + 1.5 km soltar. Aclaramiento de lactato.</td>
      </tr>
    </tbody>
  </table>

  <h2>5. Estrategia Nutricional e Hidratación para Madrid</h2>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Frecuencia Geles</div>
      <div class="kpi-value">40-45 <span style="font-size:9pt;font-weight:600">min</span></div>
      <div class="kpi-sub">Total: 5 geles en carrera</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ratio Carbohidratos</div>
      <div class="kpi-value">50-60 <span style="font-size:9pt;font-weight:600">g HC/h</span></div>
      <div class="kpi-sub">Mezcla Maltodextrina:Fructosa</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Hidratación</div>
      <div class="kpi-value">150-200 <span style="font-size:9pt;font-weight:600">ml</span></div>
      <div class="kpi-sub">Cada 20 min (sales + agua)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Carga Previa</div>
      <div class="kpi-value">8-10 <span style="font-size:9pt;font-weight:600">g/kg/día</span></div>
      <div class="kpi-sub">48h previas a la prueba</div>
    </div>
  </div>

  <div class="footer-note">
    Documento oficial generado por EntrenoApp · Entrenador Personal & Fisiología Deportiva · <strong>Daniel Espinosa</strong>
  </div>
</div>

</body>
</html>
`;

const tempHtmlPath = path.join(process.cwd(), "temp-plan-report.html");
const pdfOutputPath = path.join(process.cwd(), "public", "Plan_Maraton_Madrid_Daniel_Espinosa.pdf");

fs.writeFileSync(tempHtmlPath, htmlContent, "utf8");
console.log("HTML temporal creado en:", tempHtmlPath);

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const cmd = `"${chromePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfOutputPath}" --no-pdf-header-footer "${tempHtmlPath}"`;

console.log("Generando PDF con Chrome headless...");
execSync(cmd, { stdio: "inherit" });

console.log("PDF generado con éxito en:", pdfOutputPath);

// También copiar a los artefactos de la conversación
const artifactDir = "C:\\Users\\danie\\.gemini\\antigravity\\brain\\d0e3ab16-658c-455f-aedc-c3cb3daab02f";
if (fs.existsSync(artifactDir)) {
  const artifactPdfPath = path.join(artifactDir, "Plan_Maraton_Madrid_Daniel_Espinosa.pdf");
  fs.copyFileSync(pdfOutputPath, artifactPdfPath);
  console.log("Copia de artefacto guardada en:", artifactPdfPath);
}

// Limpiar HTML temporal
fs.unlinkSync(tempHtmlPath);
console.log("Proceso de generación finalizado con éxito.");
