"use client";

import { useEffect, useState } from "react";
import {
  Scale,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Activity,
  Sparkles,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  Zap,
  Droplets,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface LatestWeight {
  date: string;
  weight_kg: number | null;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
  water_pct?: number | null;
  source?: string | null;
  updated_at?: string | null;
}

export function XiaomiScaleSettingsCard() {
  const [latest, setLatest] = useState<LatestWeight | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [testing, setTesting] = useState(false);
  const toast = useToast();

  const syncUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/peso/sync`
      : "https://entrenoapp-blond.vercel.app/api/peso/sync";

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/peso", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setLatest(data.latest ?? null);
        setTotalCount(data.count ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const copyEndpoint = async () => {
    try {
      await navigator.clipboard.writeText(syncUrl);
      setCopiedUrl(true);
      toast.push("success", "URL copiada al portapapeles");
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      toast.push("error", "No se pudo copiar la URL");
    }
  };

  const handleTestSync = async () => {
    setTesting(true);
    try {
      const testPayload = {
        peso: latest?.weight_kg || 71.5,
        fecha: new Date().toISOString(),
        origen: "test_manual_configuracion",
      };

      const res = await fetch("/api/peso/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testPayload),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        toast.push("success", `¡Prueba exitosa! Registrado: ${data.weight_kg} kg`);
        loadStatus();
      } else {
        toast.push("error", data.error || "Error al probar endpoint");
      }
    } catch {
      toast.push("error", "No se pudo contactar con el endpoint");
    } finally {
      setTesting(false);
    }
  };

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return "—";
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;
      return new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return ts;
    }
  };

  return (
    <div className="surface p-3.5 sm:p-5 min-w-0 w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-900/50 flex items-center justify-center shrink-0">
            <Scale size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 truncate">
                Báscula Xiaomi S200 / Apple Salud
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Sincronización Automática
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              Conexión directa vía Atajos de iOS (Shortcuts) al pesarte
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadStatus}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 inline-flex items-center gap-1 cursor-pointer"
          title="Actualizar datos"
        >
          <RefreshCw size={12} className={loading ? "animate-spin text-red-500" : ""} />
          <span className="hidden sm:inline">Refrescar</span>
        </button>
      </div>

      {/* Resumen del último pesaje */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Último peso registrado
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">
              {latest?.weight_kg ? `${latest.weight_kg}` : "—"}
            </span>
            <span className="text-xs font-bold text-zinc-500">kg</span>
            {latest?.body_fat_pct && (
              <span className="text-xs text-zinc-500 ml-1">
                · {latest.body_fat_pct}% grasa
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
            {latest?.date ? `Fecha: ${latest.date}` : "Sin datos registrados"}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 flex flex-col justify-between min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            Estado & Origen
          </span>
          <div className="mt-1 flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${latest ? "bg-emerald-500" : "bg-amber-400"}`} />
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
              {latest ? "Vinculado y sincronizando" : "Esperando primer pesaje"}
            </span>
          </div>
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 truncate">
            {latest?.updated_at
              ? `Última sincronización: ${formatTimestamp(latest.updated_at)}`
              : "Dispositivo: Xiaomi Smart Scale S200"}
          </span>
        </div>
      </div>

      {/* URL del Webhook para Atajos de iOS */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
          <span>URL Webhook para Atajos de iOS (Shortcuts)</span>
          <span className="text-[10px] text-zinc-400 font-normal">POST · JSON</span>
        </label>
        <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 min-w-0">
          <code className="text-[11px] font-mono text-zinc-800 dark:text-zinc-200 truncate flex-1 select-all px-1">
            {syncUrl}
          </code>
          <Button
            type="button"
            variant="secondary"
            onClick={copyEndpoint}
            className="shrink-0 gap-1.5 text-xs font-semibold py-1 px-3 shadow-2xs"
          >
            {copiedUrl ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            <span>{copiedUrl ? "Copiada" : "Copiar URL"}</span>
          </Button>
        </div>
      </div>

      {/* Botones de acción rápida: Probar conexión + Guía desplegable */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <Button
          type="button"
          variant="secondary"
          onClick={handleTestSync}
          loading={testing}
          className="text-xs font-semibold gap-1.5"
        >
          <Zap size={13} className="text-red-500" />
          <span>Probar recepción de peso</span>
        </Button>

        <button
          type="button"
          onClick={() => setShowInstructions(!showInstructions)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
        >
          <span>{showInstructions ? "Ocultar guía de Atajos" : "Cómo configurar en iPhone (3 pasos)"}</span>
          {showInstructions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Guía detallada de Atajos (iOS Shortcuts) */}
      {showInstructions && (
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
          <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-zinc-100">
            <Smartphone size={15} className="text-red-500" />
            <span>Guía de Automatización en iPhone (Xiaomi S200 → EntrenoApp)</span>
          </div>

          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Tu báscula <strong>Xiaomi S200</strong> sincroniza por Bluetooth con la app <em>Mi Fitness</em>, y ésta vuelca automáticamente tu peso a <strong>Apple Salud</strong>. Solo necesitas una pequeña automatización en la app <strong>Atajos</strong> de tu iPhone para que se envíe a EntrenoApp al instante sin pulsar nada:
          </p>

          <ol className="space-y-2 list-decimal list-inside pl-1 text-[11px] leading-relaxed">
            <li>
              Abre la app <strong>Atajos</strong> en tu iPhone y ve a la pestaña <strong>Automatización</strong>.
            </li>
            <li>
              Toca el botón <strong>+</strong> y busca el disparador <strong>&quot;Al registrar nuevo dato de Salud&quot;</strong> (o selecciona <em>&quot;Al abrir la app Mi Fitness&quot;</em>).
            </li>
            <li>
              Elige el tipo de dato: <strong>Peso</strong>. Marca <strong>&quot;Ejecutar inmediatamente&quot;</strong> y desmarca <em>&quot;Preguntar antes de ejecutar&quot;</em>.
            </li>
            <li>
              Añade la acción <strong>&quot;Obtener contenido de URL&quot;</strong> con estos parámetros:
              <div className="mt-1 p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px] space-y-1">
                <div><strong>URL:</strong> {syncUrl}</div>
                <div><strong>Método:</strong> POST</div>
                <div><strong>Cabeceras:</strong> Content-Type: application/json</div>
                <div>
                  <strong>Cuerpo (JSON):</strong>
                  <pre className="mt-0.5 text-zinc-600 dark:text-zinc-400">
{`{
  "peso": [Muestra de Salud: Peso en kg],
  "fecha": [Fecha actual]
}`}
                  </pre>
                </div>
              </div>
            </li>
          </ol>

          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-start gap-2">
            <ShieldCheck size={14} className="shrink-0 mt-0.5" />
            <span>
              <strong>Upsert Inteligente:</strong> Si te pesas dos veces la misma mañana, EntrenoApp actualiza automáticamente el registro del día con la medición más reciente.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
