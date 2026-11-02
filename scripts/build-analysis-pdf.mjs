import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outputPdfPath = path.resolve('ANALISIS_PLANIFICACION_DANI_ESPINOSA.pdf');
const publicPdfPath = path.resolve('public', 'ANALISIS_PLANIFICACION_DANI_ESPINOSA.pdf');
const tempHtmlPath = path.resolve('temp_analisis_report.html');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Informe Pericial y Análisis de Planificación · Dani Espinosa</title>
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
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.45;
    font-size: 9pt;
    margin: 0;
    padding: 0;
  }
  .page {
    page-break-after: always;
    position: relative;
    padding-bottom: 15px;
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
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .brand-title {
    font-size: 16pt;
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
    font-size: 8.5pt;
    color: #64748b;
    font-weight: 500;
    margin-top: 3px;
  }
  .header-meta {
    text-align: right;
    font-size: 8pt;
    color: #475569;
    line-height: 1.35;
  }
  .header-meta strong {
    color: #0f172a;
  }

  /* Section Titles */
  h2 {
    font-size: 12pt;
    font-weight: 800;
    color: #0f172a;
    margin: 14px 0 8px 0;
    display: flex;
    align-items: center;
    gap: 6px;
    border-left: 4px solid #2563eb;
    padding-left: 8px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }

  h3 {
    font-size: 10pt;
    font-weight: 700;
    color: #1e3a8a;
    margin: 10px 0 6px 0;
  }

  p {
    margin: 0 0 8px 0;
    text-align: justify;
  }

  /* Verdict Banner */
  .verdict-box {
    background: #f8fafc;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    padding: 12px 14px;
    margin-bottom: 14px;
    display: flex;
    gap: 14px;
    align-items: center;
  }
  .verdict-pill {
    background: #e0e7ff;
    color: #3730a3;
    font-weight: 800;
    font-size: 11pt;
    padding: 8px 12px;
    border-radius: 6px;
    text-align: center;
    min-width: 130px;
    border: 1px solid #c7d2fe;
  }
  .verdict-pill.warning {
    background: #fef3c7;
    color: #92400e;
    border-color: #fde68a;
  }
  .verdict-desc {
    flex: 1;
    font-size: 8.5pt;
    color: #334155;
    line-height: 1.4;
  }

  /* Grid Layouts */
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 12px;
  }

  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 12px;
  }
  .card-header {
    font-weight: 700;
    font-size: 9.5pt;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-pos {
    border-top: 3px solid #10b981;
    background: #f0fdf4;
  }
  .card-pos .card-header {
    color: #065f46;
  }
  .card-neg {
    border-top: 3px solid #ef4444;
    background: #fef2f2;
  }
  .card-neg .card-header {
    color: #991b1b;
  }
  .card-idea {
    border-top: 3px solid #3b82f6;
    background: #eff6ff;
  }
  .card-idea .card-header {
    color: #1e40af;
  }

  ul {
    margin: 4px 0 6px 18px;
    padding: 0;
  }
  li {
    margin-bottom: 4px;
    font-size: 8.5pt;
    color: #334155;
  }
  li strong {
    color: #0f172a;
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 8px 0 12px 0;
    font-size: 8pt;
  }
  th {
    background: #1e293b;
    color: #ffffff;
    padding: 6px 8px;
    text-align: left;
    font-weight: 700;
    border: 1px solid #334155;
  }
  td {
    padding: 5px 8px;
    border: 1px solid #cbd5e1;
    color: #334155;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background: #f8fafc;
  }
  .highlight-row td {
    background: #fef9c3 !important;
    font-weight: 600;
  }
  .danger-text {
    color: #dc2626;
    font-weight: 700;
  }
  .success-text {
    color: #16a34a;
    font-weight: 700;
  }

  /* Callout */
  .callout {
    background: #f1f5f9;
    border-left: 3.5px solid #64748b;
    padding: 8px 12px;
    margin: 8px 0 10px 0;
    border-radius: 0 4px 4px 0;
    font-size: 8.5pt;
  }
  .callout.danger {
    background: #fef2f2;
    border-left-color: #ef4444;
    color: #991b1b;
  }
  .callout.info {
    background: #eff6ff;
    border-left-color: #2563eb;
    color: #1e40af;
  }

  /* Footer */
  .footer {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-between;
    font-size: 7.5pt;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
  }
</style>
</head>
<body>

<!-- ==================== PÁGINA 1 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">INFORME TÉCNICO</span></div>
      <div class="subtitle">Auditoría y Análisis Comparativo de Planificación de Entrenamiento</div>
    </div>
    <div class="header-meta">
      <strong>Atleta:</strong> Daniel Espinosa<br>
      <strong>Test VAM Oficial:</strong> 3:59 min/km (15.06 km/h)<br>
      <strong>Objetivo A:</strong> Maratón Madrid (Sub-3h35 · 5:05/km)<br>
      <strong>Fecha:</strong> Octubre 2026
    </div>
  </div>

  <div class="verdict-box">
    <div class="verdict-pill warning">
      VEREDICTO:<br>PARCIALMENTE VÁLIDO
    </div>
    <div class="verdict-desc">
      <strong>Diagnóstico Global:</strong> El plan analizado contiene una <strong>excelente base metodológica en prescripción de fuerza, pliometría y crioterapia</strong>, pero resulta <strong>desfasado, incompleto e ineficiente en su estructura de carrera</strong> para el nivel fisiológico real de Dani (VAM 3:59 min/km) y su objetivo de Maratón. <strong>No debe seguirse al pie de la letra</strong>, pero podemos <strong>extraer joyas tácticas de fuerza y recuperación</strong> para integrarlas en su plan maestro.
    </div>
  </div>

  <h2>1. Perfil Fisiológico y Contexto de Dani Espinosa</h2>
  <p>
    Para emitir un juicio riguroso sobre este plan (documento <em>"PLANIFICACIÓN ENTRENAMIENTO (Dani Espinosa)"</em> fechado en Septiembre 2025), debemos contrastarlo con los parámetros biométricos y deportivos reales de Dani a día de hoy:
  </p>
  <table>
    <tr>
      <th style="width: 25%;">Parámetro</th>
      <th style="width: 35%;">Dato Real Comprobado</th>
      <th style="width: 40%;">Implicación para el Entrenamiento</th>
    </tr>
    <tr>
      <td><strong>VAM (Velocidad Aeróbica Máx.)</strong></td>
      <td><strong>15.06 km/h · 3:59 min/km</strong> (Test 5' Máx.)</td>
      <td>Fórmula la base de todos los ritmos: R1 (5:23-4:59), R2 (4:59-4:35), R3 (4:23-4:11).</td>
    </tr>
    <tr>
      <td><strong>Objetivo Principal (A)</strong></td>
      <td><strong>Maratón de Madrid 2027</strong> (25 Abril 2027)</td>
      <td>Meta: Sub-3h35:00 (5:05 min/km). Requiere volumen específico de asfalto y desnivel.</td>
    </tr>
    <tr>
      <td><strong>Entrenamiento Cruzado</strong></td>
      <td><strong>CrossFit (Box) + Natación (~1.5-2km)</strong></td>
      <td>2 sesiones semanales de CrossFit dirigidas + natación de descarga miofascial.</td>
    </tr>
    <tr>
      <td><strong>Recuperación y Sueño</strong></td>
      <td>HRV 52-60 ms · Sueño 7.5 - 9.3h · Bañera Fría</td>
      <td>Excelente capacidad parasimpática y herramientas avanzadas de crioterapia.</td>
    </tr>
  </table>

  <h2>2. Análisis Comparativo: ¿Está bien o mal para ti?</h2>
  <div class="grid-2">
    <div class="card card-pos">
      <div class="card-header">
        <span>EN QUÉ ACIERTA EL PLAN (BIEN)</span>
        <span>✔️</span>
      </div>
      <ul>
        <li><strong>Fuerza orientada al corredor:</strong> Selección de ejercicios multiarticulares (Back Squat, RDL, Zancadas, Hip Thrust) que construyen la base de propulsión y prevención lesional.</li>
        <li><strong>Inclusión de Pliometría (Box Jumps):</strong> Muy pocos planes la incluyen; mejora el ciclo estiramiento-acortamiento (CEA) y la rigidez tendinosa (stiffness).</li>
        <li><strong>Criterio de RIR 1-3 y velocidad:</strong> Prohíbe ir al fallo muscular, priorizando velocidad concéntrica e indemnidad del sistema nervioso.</li>
        <li><strong>Uso magistral del baño de hielo:</strong> Acierta plenamente advirtiendo que NO debe usarse post-fuerza (evita apagar la vía mTOR) y sí post-tirada.</li>
      </ul>
    </div>

    <div class="card card-neg">
      <div class="card-header">
        <span>DÓNDE FALLA Y ES PERJUDICIAL (MAL)</span>
        <span>❌</span>
      </div>
      <ul>
        <li><strong>Desajuste total de ritmos VAM:</strong> Los ritmos asignados (rodaje a 5:45-6:00 y series a 4:20-4:25) son demasiado lentos para tu motor aeróbico de 3:59 min/km.</li>
        <li><strong>Conflicto fin de semana:</strong> Colocar series duras el sábado (6x800m) y tirada larga progresiva el domingo es una bomba de fatiga neuromuscular para los sóleos.</li>
        <li><strong>Grave error de prioridades:</strong> Afirmar que <em>"si estás cansado puedes saltarte el rodaje o las series, pero nunca la natación"</em> es letal para un maratoniano.</li>
        <li><strong>Volumen insuficiente:</strong> 70-80' de tirada larga es apto para 10k/Media Maratón, pero ridículo para preparar los 42 km con cuestas de Madrid.</li>
      </ul>
    </div>
  </div>

  <h2>3. Desajuste Fisiológico Crítico: Ritmos del Plan vs. Tu VAM</h2>
  <table>
    <tr>
      <th>Sesión Prescrita en PDF</th>
      <th>Ritmo en el PDF</th>
      <th>FC en el PDF</th>
      <th>Tu Ritmo Real Fisiológico (VAM 3:59)</th>
      <th>Veredicto Técnico</th>
    </tr>
    <tr>
      <td><strong>Día 3: Rodaje Suave</strong> (35-45')</td>
      <td>5:45 – 6:00/km</td>
      <td>150 – 160 lpm</td>
      <td><strong>5:23 – 4:59/km</strong> (R1 Base)</td>
      <td class="danger-text">Desfasado (demasiado lento; a 5:50 tu FC sería <135 lpm).</td>
    </tr>
    <tr>
      <td><strong>Día 6: Series 6 × 800m</strong> (rec. 2')</td>
      <td>4:20 – 4:25/km</td>
      <td>180 – 185 lpm</td>
      <td><strong>3:55 – 4:02/km</strong> (R3+/VO2máx)</td>
      <td class="danger-text">Ritmo de umbral, no de VAM. A 4:25 jamás llegarás a 185 lpm.</td>
    </tr>
    <tr>
      <td><strong>Día 7: Tirada Larga Progresiva</strong></td>
      <td>5:30-5:40 / 4:45-4:55</td>
      <td>155 – 180 lpm</td>
      <td><strong>5:20-5:05 (Base) / 4:45-4:35 (Final)</strong></td>
      <td class="success-text">Concepto excelente; ajustar ritmos a zonas VAM y ampliar tiempo.</td>
    </tr>
  </table>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Deportivo</span>
    <span>Página 1 de 3 · Auditoría de Planificación</span>
  </div>
</div>

<!-- ==================== PÁGINA 2 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">ANÁLISIS PROFUNDO</span></div>
      <div class="subtitle">Evaluación de Cargas, Sobrecarga Concurrente y Transferencia</div>
    </div>
    <div class="header-meta">
      <strong>Atleta:</strong> Daniel Espinosa<br>
      <strong>Microciclo Auditado:</strong> 7 Días Híbrido<br>
      <strong>Enfoque:</strong> Maratón + CrossFit + Natación
    </div>
  </div>

  <h2>4. Auditoría Técnica de Puntos Positivos y Negativos</h2>

  <h3>A. Puntos Positivos Destacados (Aspectos que aportan valor)</h3>
  <ul>
    <li><strong>Fortalecimiento del Sóleo y Complejo Gastrosóleo:</strong> El PDF prescribe <em>Elevación de talones en prensa (3x12-15)</em>. El sóleo absorbe hasta 6.5 a 8 veces el peso corporal en cada impacto en carrera. Este trabajo aislado es imprescindible para aguantar los kilómetros 30 a 42 de Madrid sin calambres.</li>
    <li><strong>Pliometría Reactiva (Box Jumps 3x8):</strong> Estimula el reclutamiento de unidades motoras tipo IIx y mejora la elasticidad del tendón de Aquiles, reduciendo el coste de oxígeno (mayor economía de carrera a 5:05/km).</li>
    <li><strong>Core Funcional Anti-Movimiento:</strong> Incluye <em>Rueda abdominal</em> (anti-extensión) y <em>Pallof Press</em> (anti-rotación). Esto supera con creces los típicos 'crunch' o abdominales convencionales, estabilizando la pelvis contra el colapso al final de la maratón.</li>
    <li><strong>Pautas de Recuperación y Crioterapia:</strong> Valida tu <strong>bañera de hielo</strong>. Advierte con rigor científico evitar sumergirse tras el entrenamiento de fuerza (la crioterapia atenúa la señalización de p70S6K y la síntesis proteica), reservándola para después de tiradas de alto impacto articular.</li>
  </ul>

  <h3>B. Puntos Negativos y Riesgos si lo Sigues a Ciegas</h3>
  <div class="callout danger">
    <strong>⚠️ ALERTA DE FATIGA CONCURRENTE (Sábado Series + Domingo Tirada):</strong><br>
    Colocar 6x800m a ritmo intenso el sábado por la mañana y una tirada larga progresiva el domingo supone concentrar el 75% del estrés glucogénico y muscular en 24 horas. Para tu objetivo de Madrid, la tirada dominical requiere frescura para poder acumular volumen cualitativo y practicar nutrición intra-carrera. Las series deben separarse al menos 48h (ej. martes o miércoles).
  </div>

  <div class="callout danger">
    <strong>⚠️ LA PARADOJA DE PRIORIZAR LA NATACIÓN:</strong><br>
    El PDF indica textualmente: <em>"Si algún día te notas muy cargado, el entrenamiento que puedes saltar sin problema es el rodaje del miércoles o las series... lo único que debes mantener siempre son las sesiones de natación"</em>. Para un maratoniano, este consejo es un disparate fisiológico. En la maratón rige la ley de la especificidad: adaptaciones cardíacas excéntricas, tolerancia al impacto del asfalto y biogénesis mitocondrial en cuádriceps/sóleos solo se consiguen corriendo. Si hay fatiga aguda, se reduce intensidad o volumen de carrera, pero la natación es la que se sacrifica o se usa como nado regenerativo muy corto.
  </div>

  <div class="callout danger">
    <strong>⚠️ SOLAPAMIENTO DE FUERZA CON TU BOX DE CROSSFIT:</strong><br>
    Tú ya realizas 2 sesiones de CrossFit estructuradas por semana (donde ya hay sentadillas, peso muerto, wall walks, dominadas y trabajo metabólico). Añadir 2 días enteros de gimnasio de aislamiento como propone el PDF (Día 1 Pierna + Día 5 Torso) llevaría tu volumen de fuerza a 4 días semanales, provocando fatiga residual crónica que sabotearía tus rodajes.
  </div>

  <h2>5. Ideas Concretas que Debemos "Robar" para tus Entrenos Actuales</h2>
  <div class="grid-2">
    <div class="card card-idea">
      <div class="card-header">
        <span>1. BLOQUE DE PLIOMETRÍA PRE-CARRERA</span>
        <span>⚡</span>
      </div>
      <p style="font-size: 8pt; margin-bottom: 4px;">
        <strong>Qué coger:</strong> Box Jumps (3x6-8) y saltos reactivos a una pierna.<br>
        <strong>Cómo aplicarlo:</strong> Meter 5 minutos tras el calentamiento articular antes de tu sesión de series o de ritmo tempo (R2). Despierta el reflejo miotático y mejora la zancada sin fatigar.
      </p>
    </div>

    <div class="card card-idea">
      <div class="card-header">
        <span>2. REFUERZO DE SÓLEOS Y GEMELOS</span>
        <span>🦶</span>
      </div>
      <p style="font-size: 8pt; margin-bottom: 4px;">
        <strong>Qué coger:</strong> Elevaciones de talones en prensa (3x15) con rodilla flexionada.<br>
        <strong>Cómo aplicarlo:</strong> En tus días de fuerza o al terminar una sesión de CrossFit, añadir 3 series lentas con 2 segundos de pausa en contracción máxima para blindar el tendón de Aquiles ante el desnivel de Madrid.
      </p>
    </div>

    <div class="card card-idea">
      <div class="card-header">
        <span>3. PALLOF PRESS Y RUEDA ABDOMINAL</span>
        <span>🛡️</span>
      </div>
      <p style="font-size: 8pt; margin-bottom: 4px;">
        <strong>Qué coger:</strong> Pallof press con polea/goma (3x10/lado) y rueda.<br>
        <strong>Cómo aplicarlo:</strong> Sustituir planchas frontales pasivas de 45" en tus sesiones de movilidad por estos dos ejercicios. Generan rigidez lumbo-pélvica activa en carrera.
      </p>
    </div>

    <div class="card card-idea">
      <div class="card-header">
        <span>4. REGLA ESTRICTA DE CRIOTERAPIA</span>
        <span>❄️</span>
      </div>
      <p style="font-size: 8pt; margin-bottom: 4px;">
        <strong>Qué coger:</strong> Timing exacto de la bañera de hielo.<br>
        <strong>Cómo aplicarlo:</strong> Baño frío de 8-10 min únicamente los domingos post-tirada larga o sábados tras series exigentes. Vetado absolutamente tras CrossFit o fuerza de piernas.
      </p>
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Deportivo</span>
    <span>Página 2 de 3 · Diagnóstico y Transferencias</span>
  </div>
</div>

<!-- ==================== PÁGINA 3 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">PLAN DE ACCIÓN</span></div>
      <div class="subtitle">Integración Táctica Optimizada en tu Microciclo Real</div>
    </div>
    <div class="header-meta">
      <strong>Ecosistema:</strong> Carrera + CrossFit + Natación + Sueño<br>
      <strong>Horizonte:</strong> Zurich Maratón de Madrid 2027<br>
      <strong>Estado:</strong> Optimizado y Calibrado
    </div>
  </div>

  <h2>6. Tu Microciclo Semanal Híbrido Perfecto (Fusión Inteligente)</h2>
  <p>
    Integrando lo mejor de tu plan actual de Maratón de Madrid con las mejores ideas de fuerza y pliometría del documento analizado, esta es tu distribución semanal de máximo rendimiento:
  </p>

  <table>
    <tr>
      <th style="width: 13%;">Día</th>
      <th style="width: 17%;">Disciplina</th>
      <th style="width: 48%;">Prescripción Detallada con Mejoras Integradas</th>
      <th style="width: 22%;">Zonas / RPE / Fisiología</th>
    </tr>
    <tr>
      <td><strong>LUNES</strong></td>
      <td><strong>CrossFit Fuerza & Potencia</strong></td>
      <td>Clase Box: Trabajo principal de fuerza (Sentadilla/Halterofilia) + <strong>+ AÑADIR: Box Jumps 3x6 y Rueda Abdominal 3x8</strong> al final.</td>
      <td>RPE 7-8<br>Fuerza máxima y CEA</td>
    </tr>
    <tr>
      <td><strong>MARTES</strong></td>
      <td><strong>Running Calidad / Series (R3)</strong></td>
      <td>15' cal. + 4 progresiones + <strong>Series VAM ajustadas: 6x1000m a 4:20-4:15 min/km</strong> (rec. 90") o <strong>8x500m a 3:55 min/km</strong> + 10' trote suave.</td>
      <td>RPE 8-8.5<br>Umbral Anaeróbico / VAM</td>
    </tr>
    <tr>
      <td><strong>MIÉRCOLES</strong></td>
      <td><strong>Natación Regenerativa</strong></td>
      <td>1.500m - 2.000m suaves: 400m calentamiento + técnica + <strong>bloques con aletas cortas</strong> para descomprimir sóleos/tendón + estiramiento en bordillo.</td>
      <td>RPE 4-5<br>Descompresión articular</td>
    </tr>
    <tr>
      <td><strong>JUEVES</strong></td>
      <td><strong>CrossFit WOD & Condicionamiento</strong></td>
      <td>Clase Box con enfoque metabólico + <strong>+ AÑADIR: Pallof Press 3x12/lado y Elevación Talones Sóleo 3x15</strong> para proteger tobillos de cara al domingo.</td>
      <td>RPE 7-8<br>Potencia aeróbica y core</td>
    </tr>
    <tr>
      <td><strong>VIERNES</strong></td>
      <td><strong>Running Suave R1 (Regenerativo)</strong></td>
      <td>35-45' carrera muy suave y continua a <strong>5:23 - 4:59 min/km</strong>. Respiración nasal y cadencia fluida (178-180 ppm). Sensación regenerativa.</td>
      <td>RPE 4-5<br>Base aeróbica pura</td>
    </tr>
    <tr>
      <td><strong>SÁBADO</strong></td>
      <td><strong>Descanso Activo & Movilidad</strong></td>
      <td>20' movilidad lumbo-pélvica (cadera, glúteos, tobillos) + foam roller suave + 4 progresiones de activación. <em>Permite llegar al domingo con piernas frescas</em>.</td>
      <td>RPE 2-3<br>Recuperación parasimpática</td>
    </tr>
    <tr>
      <td><strong>DOMINGO</strong></td>
      <td><strong>Running Tirada Larga Madrid (R5)</strong></td>
      <td><strong>14 a 22 km (progresivos hasta 30k)</strong> con simulación de cuestas Madrid (+120m a +250m D+).<br>
      • Tramo 1 (70%): Base R1 a 5:20-5:10 min/km.<br>
      • Tramo 2 (30% final): <strong>Progresión a Ritmo Maratón (5:05-4:55 min/km)</strong>.<br>
      • <strong>Post-entreno: Bañera de hielo 8-10 min</strong> + batido de carbohidrato/proteína.</td>
      <td>RPE 6-7.5<br>Resistencia específica 42K y gestión de glucógeno</td>
    </tr>
  </table>

  <h2>7. Conclusiones y Resumen Ejecutivo para Dani</h2>
  <div class="callout info">
    <strong>📋 CONCLUSIONES FINALES DE LA AUDITORÍA:</strong><br>
    1. <strong>No adoptes el plan PDF de forma global:</strong> Su estructura de carrera destrozaría tu progresión hacia el Maratón de Madrid al entrenar a ritmos que no corresponden a tu VAM de 3:59 y sobrecargar el fin de semana con series + tirada.<br>
    2. <strong>Adopta sus 4 grandes armas:</strong> Integra de inmediato los <strong>Box Jumps</strong>, el <strong>aislamiento de sóleos</strong>, el <strong>Pallof Press</strong> y la <strong>disciplina del baño de hielo</strong> solo post-tirada.<br>
    3. <strong>Tu ecosistema actual es infinitamente superior:</strong> Tienes métricas reales (VAM, HRV en tu reloj Zepp de 50-60 ms, periodización de nutrición 2.800-3.300 kcal y registro en EntrenoApp). Úsalo como brújula.<br>
    4. <strong>Foco Madrid 2027:</strong> El reto de Madrid es su orografía quebrada en la segunda mitad (Casa de Campo y subida por Paseo Imperial/Atocha). La fuerza excéntrica que aportan el CrossFit y los ejercicios del PDF te darán el blindaje necesario para romper el crono en <strong>Sub-3h35:00</strong>.
  </div>

  <div class="footer">
    <span>EntrenoApp · Sistema de Rendimiento Deportivo</span>
    <span>Página 3 de 3 · Conclusiones y Plan Híbrido</span>
  </div>
</div>

</body>
</html>`;

fs.writeFileSync(tempHtmlPath, html, 'utf8');
console.log('HTML temporal guardado en:', tempHtmlPath);

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const cmd = `"${chromePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${outputPdfPath}" --no-pdf-header-footer "${tempHtmlPath}"`;

console.log('Ejecutando Chrome headless...');
execSync(cmd, { stdio: 'inherit' });
console.log('PDF generado en:', outputPdfPath);

// Copiar también a public y a la carpeta de artefactos de esta conversación
if (fs.existsSync('public')) {
  fs.copyFileSync(outputPdfPath, publicPdfPath);
  console.log('Copia guardada en public:', publicPdfPath);
}

const artifactDir = 'C:\\Users\\danie\\.gemini\\antigravity\\brain\\665c654b-d891-454d-bae8-5fad32cdce4b';
if (fs.existsSync(artifactDir)) {
  const artifactPdf = path.join(artifactDir, 'ANALISIS_PLANIFICACION_DANI_ESPINOSA.pdf');
  fs.copyFileSync(outputPdfPath, artifactPdf);
  console.log('Copia guardada en artifact dir:', artifactPdf);
}

// Limpiar HTML temporal
fs.unlinkSync(tempHtmlPath);
console.log('Listo con éxito!');
