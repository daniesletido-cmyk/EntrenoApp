export * from "./pace-zones-calc";
import { calculatePaceZonesFromVam, paceToSecKm, PaceZonesConfig } from "./pace-zones-calc";
import { getSetting, setSetting } from "@/lib/repo/settings";
import { getDb } from "@/lib/db";

/**
 * Obtiene la configuración de zonas de ritmo activa desde la BD o la calcula a partir del VAM del atleta.
 */
export function getActivePaceZones(userId?: string): PaceZonesConfig {
  if (userId && userId !== "default_user") {
    try {
      const db = getDb();
      const p = db.prepare<{ vam_pace: string; vam_sec_km: number }>("SELECT vam_pace, vam_sec_km FROM profiles WHERE id = ?").get(userId);
      if (p && p.vam_sec_km) {
        return calculatePaceZonesFromVam(Number(p.vam_sec_km), 5);
      }
    } catch {}
  }

  try {
    const customJson = getSetting("pace_zones_json");
    if (customJson) {
      const parsed = JSON.parse(customJson) as PaceZonesConfig;
      if (parsed && parsed.zones && parsed.zones.z1 && parsed.zones.z4) {
        return parsed;
      }
    }
  } catch {}

  const vamPaceSetting = getSetting("vam_pace") || "3:59 min/km";
  const sec = paceToSecKm(vamPaceSetting) || 239;
  const tolSetting = Number(getSetting("pace_tolerance_sec_km") || "5");
  const tolerance = Number.isFinite(tolSetting) && tolSetting >= 0 && tolSetting <= 20 ? tolSetting : 5;

  return calculatePaceZonesFromVam(sec, tolerance);
}

/**
 * Guarda las zonas de ritmo personalizadas en settings.
 */
export function saveActivePaceZones(config: PaceZonesConfig, userId?: string): void {
  if (userId && userId !== "default_user") {
    try {
      const db = getDb();
      db.prepare(`
        UPDATE profiles
        SET vam_pace = ?, vam_sec_km = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(config.vamPaceStr, config.vamSecKm, userId);
      return;
    } catch {}
  }

  setSetting("pace_zones_json", JSON.stringify(config));
  setSetting("vam_pace", `${config.vamPaceStr} min/km`);
  setSetting("pace_tolerance_sec_km", String(config.toleranceSecKm));
}
