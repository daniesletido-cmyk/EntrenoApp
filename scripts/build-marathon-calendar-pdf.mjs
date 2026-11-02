import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const outputPdfPath = path.resolve('PLAN_MARATON_MADRID_CALENDARIO_Y_226ERS_DANI.pdf');
const publicPdfPath = path.resolve('public', 'PLAN_MARATON_MADRID_CALENDARIO_Y_226ERS_DANI.pdf');
const tempHtmlPath = path.resolve('temp_marathon_calendar.html');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Planificación Maratón Madrid 2027 · Calendario de Tiradas y Nutrición 226ERS</title>
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
    margin: 8px 0 4px 0;
  }

  p {
    margin: 0 0 6px 0;
    text-align: justify;
  }

  /* Grids & Cards */
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

  .card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 7px 9px;
  }
  .card-header {
    font-weight: 700;
    font-size: 8.5pt;
    margin-bottom: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-blue {
    border-top: 3px solid #2563eb;
    background: #f8fafc;
  }
  .card-blue .card-header { color: #1e40af; }
  .card-amber {
    border-top: 3px solid #f59e0b;
    background: #fffbeb;
  }
  .card-amber .card-header { color: #b45309; }
  .card-green {
    border-top: 3px solid #10b981;
    background: #f0fdf4;
  }
  .card-green .card-header { color: #047857; }

  /* Product Box */
  .product-box {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 8px;
    background: #ffffff;
    margin-bottom: 6px;
  }
  .product-title {
    font-weight: 800;
    font-size: 8.5pt;
    color: #0f172a;
    display: flex;
    justify-content: space-between;
  }
  .product-tag {
    background: #e0e7ff;
    color: #3730a3;
    font-size: 6.5pt;
    font-weight: 800;
    padding: 1px 5px;
    border-radius: 3px;
  }
  .product-desc {
    font-size: 7.5pt;
    color: #475569;
    margin-top: 2px;
    line-height: 1.3;
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
  .row-deload td {
    background: #f0fdf4 !important;
    font-weight: 600;
    color: #166534;
  }
  .row-peak td {
    background: #fef2f2 !important;
    font-weight: 700;
    color: #991b1b;
  }
  .row-race td {
    background: #fef08a !important;
    font-weight: 800;
    color: #854d0e;
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
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">ROAD TO MADRID 2027</span></div>
      <div class="subtitle">Guía de Tiradas Largas, Nutrición 226ERS y Matriz de CrossFit Flexible</div>
    </div>
    <div class="header-meta">
      <strong>Atleta:</strong> Daniel Espinosa | <strong>VAM:</strong> 3:59 min/km<br>
      <strong>Objetivo:</strong> Sub-3h35:00 (5:05/km) | <strong>Carrera:</strong> 25/04/2027<br>
      <strong>Ecosistema:</strong> Carrera + CrossFit Flex + Natación + Bañera Fría
    </div>
  </div>

  <h2>1. Regla de Oro: CrossFit Flexible (Cómo adaptarlo según tu semana)</h2>
  <p>
    Tus días de CrossFit <strong>NO tienen que ser fijos</strong>. La vida laboral y personal cambia cada semana. El único requisito fisiológico es respetar la <strong>"Regla de Incompatibilidad Neuromuscular"</strong> para que las piernas lleguen frescas al estímulo dominical:
  </p>

  <div class="grid-3">
    <div class="card card-green">
      <div class="card-header"><span>DÍAS IDEALES (LUZ VERDE)</span><span>LUN / MAR / MIÉ</span></div>
      <p style="font-size: 7.2pt; margin: 0;">
        Puedes meter WODs pesados de piernas (Front Squats, Deadlifts, Wall Balls). Al quedar 72h-96h para la tirada del domingo, el daño muscular se habrá reparado completamente.
      </p>
    </div>
    <div class="card card-amber">
      <div class="card-header"><span>DÍA DE TRANSICIÓN</span><span>JUEVES</span></div>
      <p style="font-size: 7.2pt; margin: 0;">
        Perfecto para CrossFit si es metabólico o gimnástico. Si tocan sentadillas pesadas, dosifica el RIR a 2-3 (sin llegar al fallo) para no arrastrar agujetas residuales al fin de semana.
      </p>
    </div>
    <div class="card card-blue">
      <div class="card-header"><span>FIN DE SEMANA (REGLA 48H)</span><span>VIE / SÁB</span></div>
      <p style="font-size: 7.2pt; margin: 0;">
        <strong>Si vas al box el viernes o sábado:</strong> Pide al coach enfocar en <em>Tren Superior y Core</em> (Dominadas, Press Banca, Hombro, Rueda). <strong>PROHIBIDO:</strong> 100 saltos dobles de comba o sentadillas pesadas.
      </p>
    </div>
  </div>

  <h2>2. Lista de la Compra Oficial: 226ERS (Protocolo Anti-Muro)</h2>
  <p>
    Para evitar el vaciado de glucógeno que sufriste en abril, utilizaremos la gama técnica de <strong>226ERS</strong>, basada en <em>Ciclodextrina (Cluster Dextrin®)</em>: no fermenta en el estómago, tiene vaciado gástrico ultrarrápido y aporta 50 g de carbohidratos en una sola toma.
  </p>

  <div class="grid-2">
    <div>
      <div class="product-box">
        <div class="product-title">
          <span>1. 226ERS High Energy Gel (76g)</span>
          <span class="product-tag">TU ARMA PRINCIPAL</span>
        </div>
        <div class="product-desc">
          <strong>Qué es:</strong> 50 g de hidratos por gel (Ciclodextrina). Textura fluida.<br>
          <strong>Sabores recomendados:</strong> Plátano o Fresa (Sin cafeína).<br>
          <strong>Uso:</strong> 1 gel cada 40–45 min a partir del km 10 en tiradas >18 km.
        </div>
      </div>

      <div class="product-box">
        <div class="product-title">
          <span>2. 226ERS High Energy Gel CON CAFEÍNA</span>
          <span class="product-tag">PICO KM 25-35</span>
        </div>
        <div class="product-desc">
          <strong>Qué es:</strong> 50 g HC + 100 mg de cafeína anhidra natural.<br>
          <strong>Sabores recomendados:</strong> Cola o Cereza con cafeína.<br>
          <strong>Uso:</strong> Para la segunda mitad de tiradas largas y el km 28 de la maratón.
        </div>
      </div>
    </div>

    <div>
      <div class="product-box">
        <div class="product-title">
          <span>3. 226ERS Sub9 Salts Electrolytes</span>
          <span class="product-tag">ANTI-CALAMBRES</span>
        </div>
        <div class="product-desc">
          <strong>Qué es:</strong> Cápsulas con 250 mg de sodio, potasio, magnesio y jengibre.<br>
          <strong>Por qué:</strong> Evita la deshidratación y la deriva cardíaca con calor.<br>
          <strong>Uso:</strong> 1 cápsula cada 60–70 minutos con agua desde el inicio.
        </div>
      </div>

      <div class="product-box">
        <div class="product-title">
          <span>4. 226ERS Hydrazero (Monodosis 7.5g)</span>
          <span class="product-tag">PRE-HIDRATACIÓN</span>
        </div>
        <div class="product-desc">
          <strong>Qué es:</strong> Bebida hipotónica con 500 mg de sodio y cero azúcares.<br>
          <strong>Sabores recomendados:</strong> Limón o Tropical.<br>
          <strong>Uso:</strong> 1 sobre en 500 ml de agua el día anterior y 2h antes de correr.
        </div>
      </div>
    </div>
  </div>

  <h2>3. Protocolo de Ingesta Intra-Carrera (El Ritmo de Gasolina)</h2>
  <table>
    <tr>
      <th style="width: 15%;">Momento / Tiempo</th>
      <th style="width: 25%;">Qué Tomar (226ERS)</th>
      <th style="width: 20%;">Hidratos / Sales</th>
      <th style="width: 40%;">Objetivo Fisiológico</th>
    </tr>
    <tr>
      <td><strong>30 min ANTES</strong></td>
      <td>500 ml agua con <strong>Hydrazero</strong></td>
      <td>500 mg Sodio</td>
      <td>Cargar volemia y sales sin elevar glucosa en sangre en reposo.</td>
    </tr>
    <tr>
      <td><strong>Minuto 40 (~Km 8)</strong></td>
      <td><strong>1x High Energy Gel</strong> (Sin cafeína) + agua</td>
      <td>50 g HC</td>
      <td>Primera inyección de glucosa exógena; protege el glucógeno hepático.</td>
    </tr>
    <tr>
      <td><strong>Minuto 75 (~Km 15)</strong></td>
      <td><strong>1x Sub9 Salts</strong> + agua</td>
      <td>250 mg Sodio</td>
      <td>Reponer pérdidas de sudor antes de que empiece la deshidratación.</td>
    </tr>
    <tr>
      <td><strong>Minuto 85 (~Km 17)</strong></td>
      <td><strong>1x High Energy Gel</strong> (Sin cafeína) + agua</td>
      <td>50 g HC</td>
      <td>Mantener flujo de 55-60 g HC/hora constante hacia los cuádriceps.</td>
    </tr>
    <tr>
      <td><strong>Minuto 130 (~Km 25)</strong></td>
      <td><strong>1x High Energy Gel (CON Cafeína)</strong> + agua</td>
      <td>50 g HC + 100mg Caf</td>
      <td>Despertar el sistema nervioso central justo al entrar al tramo crítico.</td>
    </tr>
    <tr>
      <td><strong>Minuto 145 (~Km 28)</strong></td>
      <td><strong>1x Sub9 Salts</strong> + agua</td>
      <td>250 mg Sodio</td>
      <td>Blindaje contra calambres para las subidas del km 30 al 40.</td>
    </tr>
    <tr>
      <td><strong>Minuto 175 (~Km 34)</strong></td>
      <td><strong>1x High Energy Gel</strong> (o Isotonic) + agua</td>
      <td>30–50 g HC</td>
      <td>Última carga para rematar en sub-5:00/km hacia la meta en El Retiro.</td>
    </tr>
  </table>

  <div class="footer">
    <span>EntrenoApp · Preparación Zurich Maratón Madrid 2027</span>
    <span>Página 1 de 3 · Matriz CrossFit Flex y Protocolo 226ERS</span>
  </div>
</div>

<!-- ==================== PÁGINA 2 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">CALENDARIO FASE 1 & FASE 2</span></div>
      <div class="subtitle">Evolución de Tiradas Largas Dominicales: Octubre 2026 a Enero 2027</div>
    </div>
    <div class="header-meta">
      <strong>Fase 1:</strong> Base Aeróbica y Adaptación Funcional<br>
      <strong>Fase 2:</strong> Construcción Específica y Ritmo VAM<br>
      <strong>Zonas de Ritmo:</strong> R1 (5:23 - 4:59) | R2 (4:59 - 4:35)
    </div>
  </div>

  <h2>4. Esquema Semanal: Bloque Otoño / Invierno (Semanas 1 a 15)</h2>
  <p>
    A continuación tienes la planificación exacta de las tiradas dominicales de aquí a finales de enero. Observa la <strong>periodización ondulada 3:1</strong> (3 semanas de carga ascendente seguidas de 1 semana de descarga para supercompensar y descansar tendones):
  </p>

  <table>
    <tr>
      <th style="width: 10%;">Sem.</th>
      <th style="width: 15%;">Fecha Domingo</th>
      <th style="width: 12%;">Distancia</th>
      <th style="width: 25%;">Estructura y Ritmos VAM</th>
      <th style="width: 23%;">Nutrición 226ERS en Tirada</th>
      <th style="width: 15%;">Enfoque CrossFit</th>
    </tr>
    <tr>
      <td><strong>Sem 1</strong></td>
      <td>18 Oct 2026</td>
      <td><strong>14 km</strong></td>
      <td>14 km en R1 cómodo (5:25 - 5:10/km) <em>[Realizada]</em></td>
      <td>Agua e hidratación básica</td>
      <td>2 sesiones Box</td>
    </tr>
    <tr>
      <td><strong>Sem 2</strong></td>
      <td>25 Oct 2026</td>
      <td><strong>15 km</strong></td>
      <td>11 km R1 (5:20) + 4 km progresivos a 5:05/km</td>
      <td>1x High Energy Gel en min 45</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr>
      <td><strong>Sem 3</strong></td>
      <td>01 Nov 2026</td>
      <td><strong>16 km</strong></td>
      <td>12 km base R1 + 4 km a ritmo maratón (5:05)</td>
      <td>1x Gel min 45 + 1x Sub9 Salt</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr class="row-deload">
      <td><strong>Sem 4</strong></td>
      <td>08 Nov 2026</td>
      <td><strong>12 km (DESCARGA)</strong></td>
      <td>12 km suaves regenerativos a 5:25/km. Cero fatiga.</td>
      <td>Solo agua o Hydrazero</td>
      <td>CrossFit técnico</td>
    </tr>
    <tr>
      <td><strong>Sem 5</strong></td>
      <td>15 Nov 2026</td>
      <td><strong>17 km</strong></td>
      <td>12 km R1 (5:15) + 5 km en toboganes suaves (+80m D+)</td>
      <td>2x High Energy Gel (min 40 y 75)</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr>
      <td><strong>Sem 6</strong></td>
      <td>22 Nov 2026</td>
      <td><strong>18 km</strong></td>
      <td>14 km base aeróbica + 4 km vivos (5:00/km)</td>
      <td>2x Gel + 1x Sub9 Salt</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr>
      <td><strong>Sem 7</strong></td>
      <td>29 Nov 2026</td>
      <td><strong>20 km</strong></td>
      <td><strong>Barrera de los 20k:</strong> 15 km R1 + 5 km a 5:05/km</td>
      <td>2x High Energy Gel + 1x Sub9 Salt</td>
      <td>Descarga piernas Vie</td>
    </tr>
    <tr class="row-deload">
      <td><strong>Sem 8</strong></td>
      <td>06 Dic 2026</td>
      <td><strong>14 km (DESCARGA)</strong></td>
      <td>Rodaje fluido regenerativo. Asimilación muscular.</td>
      <td>1x High Energy Gel</td>
      <td>CrossFit movilidad</td>
    </tr>
    <tr>
      <td><strong>Sem 9</strong></td>
      <td>13 Dic 2026</td>
      <td><strong>21.1 km</strong></td>
      <td><strong>Test Media Maratón:</strong> Ritmo controlado 5:08/km</td>
      <td>3x Gel (min 35, 70, 95) + Sub9</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr>
      <td><strong>Sem 10</strong></td>
      <td>20 Dic 2026</td>
      <td><strong>22 km</strong></td>
      <td>16 km base + 6 km con cuestas simuladas (+120m)</td>
      <td>3x High Energy Gel + 1x Sub9</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr class="row-deload">
      <td><strong>Sem 11</strong></td>
      <td>27 Dic 2026</td>
      <td><strong>15 km (NAVIDAD)</strong></td>
      <td>Semana de descarga festiva. 15 km a ritmo cómodo.</td>
      <td>1x High Energy Gel</td>
      <td>1-2 sesiones Box</td>
    </tr>
    <tr>
      <td><strong>Sem 12</strong></td>
      <td>03 Ene 2027</td>
      <td><strong>23 km</strong></td>
      <td>17 km R1 + 6 km en progresión terminando a 4:55/km</td>
      <td>3x Gel (incluye 1 con cafeína)</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr>
      <td><strong>Sem 13</strong></td>
      <td>10 Ene 2027</td>
      <td><strong>24 km</strong></td>
      <td>18 km aeróbico base + 6 km clavados a 5:05/km</td>
      <td>3x High Energy Gel + 2x Sub9</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr>
      <td><strong>Sem 14</strong></td>
      <td>17 Ene 2027</td>
      <td><strong>25 km</strong></td>
      <td>Tirada de volumen puro: 25 km sostenidos a 5:15/km</td>
      <td>3x High Energy Gel + 2x Sub9</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr class="row-deload">
      <td><strong>Sem 15</strong></td>
      <td>24 Ene 2027</td>
      <td><strong>16 km (DESCARGA)</strong></td>
      <td>Descarga de mitad de preparación. Cuidar sóleos.</td>
      <td>1x High Energy Gel</td>
      <td>CrossFit técnica</td>
    </tr>
  </table>

  <div class="callout info">
    <strong>💡 OBJETIVO CLAVE DE ESTE PRIMER BLOQUE:</strong> Al superar los 25 km en enero, habrás duplicado el volumen máximo que hiciste el año pasado con Adri. Tus mitocondrias habrán aprendido a quemar grasa y tu estómago tolerará 50 g de hidratos por hora sin la más mínima molestia.
  </div>

  <div class="footer">
    <span>EntrenoApp · Preparación Zurich Maratón Madrid 2027</span>
    <span>Página 2 de 3 · Calendario Fase 1 y 2 (Octubre 2026 a Enero 2027)</span>
  </div>
</div>

<!-- ==================== PÁGINA 3 ==================== -->
<div class="page">
  <div class="header">
    <div>
      <div class="brand-title">ENTRENOAPP <span class="brand-badge">CALENDARIO FASE 3 & DÍA D</span></div>
      <div class="subtitle">Tiradas Reinas, Cuestas Madrid, Tapering y Ejecución: Febrero a Abril 2027</div>
    </div>
    <div class="header-meta">
      <strong>Fase 3:</strong> Específico Maratón y Tiradas de 30 km<br>
      <strong>Fase 4:</strong> Tapering (Afilado) y Carrera Oficial<br>
      <strong>Ritmo Meta Madrid:</strong> 5:05 min/km (3h34:28)
    </div>
  </div>

  <h2>5. Esquema Semanal: Bloque Específico y Tiradas Reinas (Semanas 16 a 27)</h2>
  <table>
    <tr>
      <th style="width: 10%;">Sem.</th>
      <th style="width: 15%;">Fecha Domingo</th>
      <th style="width: 12%;">Distancia</th>
      <th style="width: 25%;">Estructura y Ritmos VAM</th>
      <th style="width: 23%;">Nutrición 226ERS en Tirada</th>
      <th style="width: 15%;">Enfoque CrossFit</th>
    </tr>
    <tr>
      <td><strong>Sem 16</strong></td>
      <td>31 Ene 2027</td>
      <td><strong>26 km</strong></td>
      <td>18 km R1 (5:15) + 8 km a Ritmo Maratón (5:05/km)</td>
      <td>3x High Energy Gel + 2x Sub9</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr>
      <td><strong>Sem 17</strong></td>
      <td>07 Feb 2027</td>
      <td><strong>28 km</strong></td>
      <td>20 km base + 8 km con desnivel simulado (+160m)</td>
      <td>4x High Energy Gel + 2x Sub9</td>
      <td>Descarga piernas Vie</td>
    </tr>
    <tr class="row-deload">
      <td><strong>Sem 18</strong></td>
      <td>14 Feb 2027</td>
      <td><strong>18 km (DESCARGA)</strong></td>
      <td>Descarga post-28k. Rodaje cómodo a 5:20/km.</td>
      <td>1x Gel + 1x Sub9 Salt</td>
      <td>CrossFit movilidad</td>
    </tr>
    <tr>
      <td><strong>Sem 19</strong></td>
      <td>21 Feb 2027</td>
      <td><strong>28 km</strong></td>
      <td>20 km R1 + 8 km a 5:05/km (Simulación bloque 3)</td>
      <td>4x High Energy Gel + 2x Sub9</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr class="row-peak">
      <td><strong>Sem 20</strong></td>
      <td>28 Feb 2027</td>
      <td><strong>30 km (REINA 1)</strong></td>
      <td><strong>Tirada Reina 1:</strong> 22 km a 5:15 + 8 km a 5:05/km</td>
      <td><strong>Simulación 100% Maratón:</strong> 4 geles + 2 sales</td>
      <td>Solo tren superior</td>
    </tr>
    <tr class="row-deload">
      <td><strong>Sem 21</strong></td>
      <td>07 Mar 2027</td>
      <td><strong>20 km (DESCARGA)</strong></td>
      <td>Recuperación activa. Bañera fría + sueño.</td>
      <td>2x High Energy Gel</td>
      <td>CrossFit ligero</td>
    </tr>
    <tr class="row-peak">
      <td><strong>Sem 22</strong></td>
      <td>14 Mar 2027</td>
      <td><strong>30 km (REINA 2)</strong></td>
      <td><strong>Tirada Reina 2:</strong> 15 km R1 + 10 km RMC + 5k vivos</td>
      <td>4x Gel 226ERS (2 con cafeína) + sales</td>
      <td>Solo movilidad / core</td>
    </tr>
    <tr>
      <td><strong>Sem 23</strong></td>
      <td>21 Mar 2027</td>
      <td><strong>24 km</strong></td>
      <td>Última tirada larga seria. Ritmo estable 5:10/km.</td>
      <td>3x High Energy Gel + 2x Sub9</td>
      <td>2 sesiones Flex</td>
    </tr>
    <tr class="row-deload">
      <td><strong>Sem 24</strong></td>
      <td>28 Mar 2027</td>
      <td><strong>18 km (TAPER 1)</strong></td>
      <td><strong>Inicio Tapering (-4 sem):</strong> Reducción volumen 30%.</td>
      <td>2x High Energy Gel</td>
      <td>Mantenimiento fuerza</td>
    </tr>
    <tr class="row-deload">
      <td><strong>Sem 25</strong></td>
      <td>04 Abr 2027</td>
      <td><strong>15 km (TAPER 2)</strong></td>
      <td>10 km suaves + 5 km a ritmo 5:05/km para recordar sensaciones.</td>
      <td>1x High Energy Gel</td>
      <td>Solo core y movilidad</td>
    </tr>
    <tr class="row-deload">
      <td><strong>Sem 26</strong></td>
      <td>11 Abr 2027</td>
      <td><strong>11 km (TAPER 3)</strong></td>
      <td>Sensación de flotar. Activación ligera sin desgaste.</td>
      <td>1x High Energy Gel</td>
      <td>Sin CrossFit pesado</td>
    </tr>
    <tr class="row-race">
      <td><strong>Sem 27</strong></td>
      <td><strong>25 Abr 2027</strong></td>
      <td><strong>42.195 km</strong></td>
      <td><strong>DÍA D: ZURICH MARATÓN DE MADRID</strong><br>
      • Km 0 a 5: 5:15 - 5:20/km (Control de nervios)<br>
      • Km 5 a 32: 5:05/km (Crucero de precisión)<br>
      • Km 32 a 42: Mantener / Apretar a 4:55–5:00</td>
      <td><strong>ESTRATEGIA 226ERS COMPLETA:</strong><br>
      • Hydrazero previo.<br>
      • 5 geles High Energy (min 40, 80, 120, 160, 195).<br>
      • 2 cápsulas Sub9 Salts.<br>
      <strong>¡SUB-3h35:00 CONSEGUIDO!</strong></td>
      <td>DESCANSO ABSOLUTO</td>
    </tr>
  </table>

  <h2>6. Cuadro Resumen de Compras para la Temporada</h2>
  <div class="grid-2">
    <div class="callout warning">
      <strong>📦 PACK INICIAL RECOMENDADO (Octubre a Enero):</strong><br>
      • <strong>1 Caja (12 uds) 226ERS High Energy Gel</strong> sabor Plátano o Fresa (Sin cafeína).<br>
      • <strong>1 Bote de 226ERS Sub9 Salts Electrolytes</strong> (100 cápsulas).<br>
      • <strong>1 Caja de 226ERS Hydrazero</strong> sabor Limón (20 sobres monodosis).
    </div>
    <div class="callout info">
      <strong>📦 REFUERZO FASE FINAL (Febrero a Abril):</strong><br>
      • <strong>1 Caja (12 uds) 226ERS High Energy Gel CON Cafeína</strong> sabor Cola o Cereza.<br>
      • <strong>1 Caja extra de High Energy Gel sin cafeína</strong> para las tiradas de 30k y la carrera.
    </div>
  </div>

  <div class="footer">
    <span>EntrenoApp · Preparación Zurich Maratón Madrid 2027</span>
    <span>Página 3 de 3 · Tiradas Reinas, Tapering y Ejecución Oficial</span>
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

if (fs.existsSync('public')) {
  fs.copyFileSync(outputPdfPath, publicPdfPath);
  console.log('Copia guardada en public:', publicPdfPath);
}

const artifactDir = 'C:\\Users\\danie\\.gemini\\antigravity\\brain\\665c654b-d891-454d-bae8-5fad32cdce4b';
if (fs.existsSync(artifactDir)) {
  const artifactPdf = path.join(artifactDir, 'PLAN_MARATON_MADRID_CALENDARIO_Y_226ERS_DANI.pdf');
  fs.copyFileSync(outputPdfPath, artifactPdf);
  console.log('Copia guardada en artifact dir:', artifactPdf);
}

fs.unlinkSync(tempHtmlPath);
console.log('Listo con éxito!');
