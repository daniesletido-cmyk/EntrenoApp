"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/components/ui/toast";
import {
  Watch,
  Activity,
  Link as LinkIcon,
  Check,
  Copy,
  Smartphone,
  Upload,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
  Flame,
  FileCheck,
} from "lucide-react";

export function UniversalWatchConnector() {
  const { profile, user } = useAuth();
  const toast = useToast();

  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  // Formulario Intervals.icu
  const [intervalsAthleteId, setIntervalsAthleteId] = useState("");
  const [intervalsApiKey, setIntervalsApiKey] = useState("");
  const [savingIntervals, setSavingIntervals] = useState(false);

  // Subida de archivos (.FIT, .GPX, .TCX)
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadedResult, setUploadedResult] = useState<string | null>(null);

  const webhookToken = profile?.webhook_token || "default_daniel_webhook_token";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://entrenoapp-blond.vercel.app";
  const webhookUrl = `${baseUrl}/api/biometria/sync?token=${webhookToken}`;

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/integrations", {
        headers: user?.id ? { "x-user-id": user.id } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchIntegrations();
  }, [user]);

  const stravaConnected = integrations.some((i) => i.provider === "strava" && i.isActive);
  const intervalsConnected = integrations.some((i) => i.provider === "intervals" && i.isActive);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedToken(true);
    toast.push("success", "URL del Webhook copiada al portapapeles");
    setTimeout(() => setCopiedToken(false), 2500);
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    try {
      const res = await fetch(`/api/biometria/sync?token=${webhookToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight_kg: profile?.weight_kg || 71.5,
          body_fat_pct: 12.8,
          sleep_hours: 7.8,
          sleep_score: 88,
          source: "Prueba Manual Webhook",
          notes: "Envío de verificación exitoso",
        }),
      });

      if (res.ok) {
        toast.push("success", "¡Webhook validado! Datos biométricos de prueba recibidos correctamente.");
      } else {
        toast.push("error", "Error al validar webhook. Revisa la configuración.");
      }
    } catch {
      toast.push("error", "Fallo de red al probar el webhook.");
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleSaveIntervals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intervalsAthleteId.trim() || !intervalsApiKey.trim()) {
      toast.push("error", "Introduce tu Athlete ID y API Key de Intervals.icu");
      return;
    }

    setSavingIntervals(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(user?.id ? { "x-user-id": user.id } : {}),
        },
        body: JSON.stringify({
          provider: "intervals",
          athleteId: intervalsAthleteId.trim(),
          accessToken: intervalsApiKey.trim(),
        }),
      });

      if (res.ok) {
        toast.push("success", "Intervals.icu conectado exitosamente");
        setIntervalsApiKey("");
        await fetchIntegrations();
      } else {
        toast.push("error", "Error al conectar Intervals.icu");
      }
    } catch {
      toast.push("error", "Error de conexión");
    } finally {
      setSavingIntervals(false);
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      const res = await fetch(`/api/integrations?provider=${provider}`, {
        method: "DELETE",
        headers: user?.id ? { "x-user-id": user.id } : {},
      });
      if (res.ok) {
        toast.push("success", `Desconectado de ${provider.toUpperCase()}`);
        await fetchIntegrations();
      }
    } catch {
      toast.push("error", "Error al desconectar");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    setUploadedResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (user?.id) formData.append("userId", user.id);

    try {
      const res = await fetch("/api/sessions/import-fit", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedResult(`¡Archivo ${file.name} importado con éxito!`);
        toast.push("success", `Entrenamiento cargado correctamente (${file.name})`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.push("error", err.error || "Error al procesar el archivo");
      }
    } catch {
      toast.push("error", "Error de red al subir el archivo");
    } finally {
      setIsUploadingFile(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* 1. SECCIÓN: CONEXIÓN AUTOMÁTICA UNIVERSAL */}
      <div
        className="p-5 sm:p-6 rounded-3xl flex flex-col gap-4 shadow-sm"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#DC2626]"
              style={{
                background: "rgba(220, 38, 38, 0.08)",
                border: "1px solid rgba(220, 38, 38, 0.2)",
              }}
            >
              <Watch size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Conectar mi Reloj / Plataforma
              </h3>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Garmin, Suunto, Coros, Polar, Apple Watch, Amazfit y Wahoo
              </p>
            </div>
          </div>
        </div>

        {/* Explicación de Conexión Universal */}
        <div
          className="p-3.5 rounded-2xl text-xs flex items-start gap-2.5"
          style={{
            background: "var(--color-surface-raised)",
            color: "var(--color-text-muted)",
          }}
        >
          <Zap size={16} className="text-[#DC2626] shrink-0 mt-0.5" />
          <span>
            <strong>Conector Universal Gratuito:</strong> Vincula tu cuenta de <strong>Strava</strong> o <strong>Intervals.icu</strong> para que tus carreras y actividades de cualquier marca se sincronicen automáticamente en EntrenoApp al terminar de entrenar.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Card Strava */}
          <div
            className="p-4 rounded-2xl flex flex-col justify-between gap-3"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FC4C02] text-white flex items-center justify-center font-bold text-xs">
                  S
                </div>
                <div>
                  <div className="text-sm font-bold">Strava API</div>
                  <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    Puente oficial multimarca
                  </div>
                </div>
              </div>
              {stravaConnected && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Conectado
                </span>
              )}
            </div>

            {stravaConnected ? (
              <button
                onClick={() => handleDisconnect("strava")}
                className="w-full py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                Desconectar Strava
              </button>
            ) : (
              <button
                onClick={() => {
                  toast.push("info", "Conectando con Strava API...");
                  window.location.href = `/api/integrations/strava/auth?userId=${user?.id || "default_user"}`;
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#FC4C02] text-white hover:bg-[#e04302] transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Conectar con Strava</span>
                <ExternalLink size={13} />
              </button>
            )}
          </div>

          {/* Card Intervals.icu */}
          <div
            className="p-4 rounded-2xl flex flex-col justify-between gap-3"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  ICU
                </div>
                <div>
                  <div className="text-sm font-bold">Intervals.icu API</div>
                  <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                    Garmin, Coros, Polar & TSS
                  </div>
                </div>
              </div>
              {intervalsConnected && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Conectado
                </span>
              )}
            </div>

            {intervalsConnected ? (
              <button
                onClick={() => handleDisconnect("intervals")}
                className="w-full py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                Desconectar Intervals.icu
              </button>
            ) : (
              <form onSubmit={handleSaveIntervals} className="flex flex-col gap-2">
                <input
                  type="text"
                  placeholder="Athlete ID (ej. i12345)"
                  value={intervalsAthleteId}
                  onChange={(e) => setIntervalsAthleteId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  required
                />
                <input
                  type="password"
                  placeholder="API Key de Intervals.icu"
                  value={intervalsApiKey}
                  onChange={(e) => setIntervalsApiKey(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl text-xs outline-none"
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                  required
                />
                <button
                  type="submit"
                  disabled={savingIntervals}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-[#DC2626] text-white hover:bg-[#b91c1c] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {savingIntervals ? "Guardando…" : "Vincular Intervals"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* 2. SECCIÓN: SINCRONIZACIÓN DE BIOMETRÍA (APPLE SALUD / HEALTH CONNECT) */}
      <div
        className="p-5 sm:p-6 rounded-3xl flex flex-col gap-4 shadow-sm"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-emerald-600"
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <Smartphone size={20} />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">
                Sincronización de Biometría & Báscula
              </h3>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Apple Salud, Google Fit y Báscula Inteligente
              </p>
            </div>
          </div>

          <button
            onClick={handleTestWebhook}
            disabled={testingWebhook}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <RefreshCw size={12} className={testingWebhook ? "animate-spin text-[#DC2626]" : ""} />
            <span>{testingWebhook ? "Probando…" : "Probar"}</span>
          </button>
        </div>

        {/* Token Personal y URL de Webhook */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
            Tu Enlace Privado de Webhook:
          </label>
          <div
            className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl font-mono text-xs overflow-hidden"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            <span className="truncate flex-1 select-all">{webhookUrl}</span>
            <button
              onClick={handleCopyWebhook}
              type="button"
              className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              style={{
                background: copiedToken ? "#16A34A" : "#DC2626",
                color: "#ffffff",
              }}
            >
              {copiedToken ? (
                <>
                  <Check size={14} />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copiar URL</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Acordeón de Instrucciones */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            border: "1px solid var(--color-border)",
          }}
        >
          <button
            type="button"
            onClick={() => setInstructionsOpen(!instructionsOpen)}
            className="w-full p-3.5 text-xs font-bold flex items-center justify-between cursor-pointer"
            style={{
              background: "var(--color-surface-raised)",
              color: "var(--color-text)",
            }}
          >
            <span className="flex items-center gap-2">
              <Activity size={15} className="text-[#DC2626]" />
              Cómo conectar tu Báscula o Reloj en 1 minuto (Atajos iOS / Android)
            </span>
            {instructionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {instructionsOpen && (
            <div
              className="p-4 text-xs flex flex-col gap-3 leading-relaxed"
              style={{
                background: "var(--color-surface)",
                color: "var(--color-text-muted)",
              }}
            >
              <div className="font-bold text-[var(--color-text)]">
                🍏 En iPhone (Atajos de iOS + Apple Salud):
              </div>
              <ol className="list-decimal pl-4 flex flex-col gap-1.5">
                <li>Abre la aplicación <strong>Atajos (Shortcuts)</strong> en tu iPhone.</li>
                <li>Ve a la pestaña <strong>Automatización</strong> y pulsa en <em>Nueva automatización</em>.</li>
                <li>Elige un disparador (ej. <em>"A una hora del día"</em> por la mañana, o <em>"Al detener la alarma"</em>).</li>
                <li>Añade la acción <strong>"Buscar muestras de salud"</strong>: selecciona Tipo: <em>Peso corporal</em> (Ordenar por fecha, más reciente).</li>
                <li>Añade la acción <strong>"Obtener contenido de URL"</strong>:
                  <ul className="list-disc pl-4 mt-1">
                    <li>URL: Pega tu enlace de webhook privado de arriba.</li>
                    <li>Método: <strong>POST</strong>.</li>
                    <li>Cuerpo de la solicitud: <strong>JSON</strong> con la clave <code>weight_kg</code> = Valor de la muestra.</li>
                  </ul>
                </li>
                <li>¡Listo! Tu báscula Withings, Xiaomi, Garmin Index o Apple Health se enviará sola a tu cuenta privada.</li>
              </ol>

              <div className="font-bold text-[var(--color-text)] pt-2">
                🤖 En Android (Google Health Connect / Tasker):
              </div>
              <p>
                Envía una petición POST JSON a tu webhook con los campos <code>{`{ "weight_kg": 72.5, "date": "YYYY-MM-DD" }`}</code> y se reflejará al instante en tus gráficas de progreso.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. SECCIÓN: IMPORTADOR UNIVERSAL MANUAL (.FIT, .GPX, .TCX) */}
      <div
        className="p-5 sm:p-6 rounded-3xl flex flex-col gap-4 shadow-sm"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-blue-600"
            style={{
              background: "rgba(37, 99, 235, 0.08)",
              border: "1px solid rgba(37, 99, 235, 0.2)",
            }}
          >
            <Upload size={20} />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">
              Importar Archivo de Reloj (.FIT, .GPX, .TCX)
            </h3>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Sube directamente el archivo exportado desde Garmin, Suunto, Polar o Apple
            </p>
          </div>
        </div>

        <label
          className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer transition-colors hover:border-[#DC2626]"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface-raised)",
          }}
        >
          <input
            type="file"
            accept=".fit,.gpx,.tcx"
            onChange={handleFileUpload}
            disabled={isUploadingFile}
            className="hidden"
          />
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#DC2626]/10 text-[#DC2626]">
            {isUploadingFile ? <RefreshCw className="animate-spin" size={20} /> : <FileCheck size={20} />}
          </div>
          <div>
            <span className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
              {isUploadingFile ? "Analizando métricas del entrenamiento…" : "Haz clic para subir o arrastra aquí tu archivo"}
            </span>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Formatos compatibles: .FIT (Garmin/Suunto/Coros), .GPX, .TCX
            </div>
          </div>
        </label>

        {uploadedResult && (
          <div
            className="p-3 rounded-2xl text-xs flex items-center gap-2 text-emerald-600"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <Check size={16} className="shrink-0" />
            <span>{uploadedResult}</span>
          </div>
        )}
      </div>
    </div>
  );
}
