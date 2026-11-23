import type { SessionRow } from "@/lib/repo/sessions";
import { secKmToPace, getActivePaceZones } from "@/lib/pace-zones";

export interface RoutePoi {
  km: number;
  timeMin: number;
  name: string;
  desc: string;
  type: "water" | "food" | "warning" | "finish" | "start";
  sym: string;
}

/**
 * Calcula los puntos de interés nutricionales (POIs) en función de la distancia y ritmo objetivo
 */
export function calculateNutritionPoisForSession(s: SessionRow): RoutePoi[] {
  const totalKm = s.distance_km && s.distance_km > 0 ? s.distance_km : 18;
  const paceConfig = getActivePaceZones();
  // Ritmo estimado medio ~ 5:15/km (315 s/km) para rodajes/tiradas
  const estSecKm = paceConfig.zones.z2?.minSecKm ?? 310;
  const kmPerMin = 60 / estSecKm;

  const pois: RoutePoi[] = [];

  // 1. Salida
  pois.push({
    km: 0,
    timeMin: 0,
    name: "Salida",
    desc: `Inicio: Calentamiento progresivo R0 (> ${secKmToPace(paceConfig.zones.z1.minSecKm)}/km)`,
    type: "start",
    sym: "Begin",
  });

  // 2. Avisos periódicos de hidratación (cada 30 min) y geles (cada 45 min)
  const totalDurationMin = Math.round((totalKm * estSecKm) / 60);

  for (let min = 15; min < totalDurationMin - 5; min += 15) {
    const kmAtMin = Number(((min * 60) / estSecKm).toFixed(1));
    if (kmAtMin >= totalKm - 0.5) break;

    const isHydra = min % 30 === 0;
    const isGel = min % 45 === 0;

    if (isGel && isHydra) {
      pois.push({
        km: kmAtMin,
        timeMin: min,
        name: `Gel + Agua (Km ${kmAtMin})`,
        desc: "Tomar 1 Gel ~30g CHO con 150ml de agua/sales",
        type: "food",
        sym: "Food",
      });
    } else if (isGel) {
      const gelNum = Math.floor(min / 45);
      pois.push({
        km: kmAtMin,
        timeMin: min,
        name: `Gel ${gelNum} (Km ${kmAtMin})`,
        desc: `Tomar Gel ${gelNum} (30g hidratos de carbono rápidos)`,
        type: "food",
        sym: "Food",
      });
    } else if (isHydra) {
      pois.push({
        km: kmAtMin,
        timeMin: min,
        name: `Hidratación (Km ${kmAtMin})`,
        desc: "Beber 150-200ml agua o sales hipotónicas",
        type: "water",
        sym: "Water",
      });
    }
  }

  // 3. Final / Enfriamiento
  pois.push({
    km: totalKm,
    timeMin: totalDurationMin,
    name: `Meta / Fin ${totalKm}k`,
    desc: "Enfriamiento, descarga muscular y rehidratación inmediata",
    type: "finish",
    sym: "End",
  });

  return pois;
}

/**
 * Genera el documento XML estándar GPX 1.1 con POIs reconocibles por Suunto 9 Peak Pro
 */
export function buildNutritionGpxForSession(s: SessionRow): string {
  const pois = calculateNutritionPoisForSession(s);
  const routeName = s.planned_code ? s.planned_code.slice(0, 50) : `Tirada ${s.distance_km || 18}km`;

  // Coordenadas base en Zuera / Zaragoza como plantilla de ruta estándar si no hay track GPS real
  const baseLat = 41.8680;
  const baseLon = -0.7870;

  const waypointsXml = pois
    .map((poi, idx) => {
      // Desplazamiento sintético en latitud a lo largo de la distancia
      const lat = (baseLat + (poi.km * 0.009)).toFixed(6);
      const lon = baseLon.toFixed(6);

      return `  <wpt lat="${lat}" lon="${lon}">
    <name>${escapeXml(poi.name)}</name>
    <desc>${escapeXml(poi.desc)}</desc>
    <sym>${poi.sym}</sym>
    <type>${poi.type}</type>
    <extensions>
      <suunto:routepoint>
        <suunto:type>${poi.type === "water" ? "Water" : poi.type === "food" ? "Food" : "Waypoint"}</suunto:type>
        <suunto:distance>${Math.round(poi.km * 1000)}</suunto:distance>
      </suunto:routepoint>
    </extensions>
  </wpt>`;
    })
    .join("\n");

  const trackpointsXml = pois
    .map((poi) => {
      const lat = (baseLat + (poi.km * 0.009)).toFixed(6);
      const lon = baseLon.toFixed(6);
      return `      <trkpt lat="${lat}" lon="${lon}"><ele>280</ele></trkpt>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="EntrenoApp Suunto Route Generator"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:suunto="http://www.suunto.com/schemas/gpx">
  <metadata>
    <name>${escapeXml(routeName)} · Nutrición & Avituallamiento</name>
    <desc>Ruta con waypoints automáticos de hidratación cada 30 min y geles cada 45 min para Suunto 9 Peak Pro.</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
${waypointsXml}
  <trk>
    <name>${escapeXml(routeName)}</name>
    <type>Running</type>
    <trkseg>
${trackpointsXml}
    </trkseg>
  </trk>
</gpx>`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
