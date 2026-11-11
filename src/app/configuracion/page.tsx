"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Upload, Save, ShieldCheck, Sparkles, RefreshCw, Sun, Lock, KeyRound, ShieldAlert, Crown, CreditCard, ExternalLink, Database, Cloud, HardDrive, Copy, Check, Watch } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { SecuritySettingsModal } from "@/components/auth/security-settings-modal";
import { isAppLockEnabled, getAppLockType } from "@/lib/security";
import { PushNotificationBanner } from "@/components/push/push-notification-banner";
import { downloadJSONBackupFile, importDataFromJSON } from "@/lib/client-persistence";
import { SUPABASE_SQL_SCHEMA } from "@/lib/supabase";
import { AiObservabilityPanel } from "@/components/settings/ai-observability";

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [anthropicKeyInput, setAnthropicKeyInput] = useState("");
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [savingAnthropicKey, setSavingAnthropicKey] = useState(false);

  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [savingGeminiKey, setSavingGeminiKey] = useState(false);

  const [intervalsAthleteId, setIntervalsAthleteId] = useState("");
  const [intervalsApiKeyInput, setIntervalsApiKeyInput] = useState("");
  const [hasIntervalsKey, setHasIntervalsKey] = useState(false);
  const [savingIntervals, setSavingIntervals] = useState(false);
  const [syncingIntervals, setSyncingIntervals] = useState(false);

  const [suuntoStatus, setSuuntoStatus] = useState<{
    directOAuthConfigured: boolean;
    directOAuthConnected: boolean;
    intervalsSuuntoBridgeConnected: boolean;
    suuntoUserId: string | null;
    uploadPlannedWorkoutsEnabled: boolean;
    scopes: string | null;
    tokenExpiresAt: string | null;
    autoPushEnabled: boolean;
  } | null>(null);
  const [suuntoAutoPush, setSuuntoAutoPush] = useState(false);
  const [togglingAutoPush, setTogglingAutoPush] = useState(false);
  const [pushingWeekToSuunto, setPushingWeekToSuunto] = useState(false);

  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    tone?: "danger" | "warning" | "brand";
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });
  const [appInfo, setAppInfo] = useState<{
    version?: string;
    bundle_source?: string;
    node_env?: string;
  } | null>(null);
  const toast = useToast();

  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [lockEnabled, setLockEnabled] = useState(false);
  const [lockType, setLockType] = useState<"pin" | "password">("pin");

  const [subInfo, setSubInfo] = useState<{
    plan?: string;
    status?: string;
    isActive?: boolean;
    periodEnd?: string | null;
  } | null>(null);

  const refreshSubscription = () => {
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((data) => {
        if (data?.subscription) {
          setSubInfo({
            plan: data.subscription.plan,
            status: data.subscription.status,
            isActive: data.subscription.status === "active" || data.subscription.status === "trialing",
            periodEnd: data.subscription.current_period_end,
          });
        }
      })
      .catch(() => {});
  };

  const refreshSecurity = () => {
    setLockEnabled(isAppLockEnabled());
    setLockType(getAppLockType());
  };

  useEffect(() => {
    refreshSecurity();
    refreshSubscription();
    const handleSec = () => refreshSecurity();
    window.addEventListener("entrenoapp:security_changed", handleSec);
    return () => window.removeEventListener("entrenoapp:security_changed", handleSec);
  }, []);

  const loadSuuntoStatus = () => {
    fetch("/api/suunto/auth?status=1")
      .then((r) => r.json())
      .then((d) => {
        if (d?.status) setSuuntoStatus(d.status);
        else if (d && "intervalsSuuntoBridgeConnected" in d) setSuuntoStatus(d);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings ?? {});
        setHasAnthropicKey(!!d.settings?.has_anthropic_api_key);
        setHasGeminiKey(!!d.settings?.has_gemini_api_key);
        setHasIntervalsKey(!!d.settings?.has_intervals_api_key);
        setIntervalsAthleteId(d.settings?.intervals_athlete_id ?? "");
        setSuuntoAutoPush(Boolean(d.settings?.suunto_auto_push));
        if (d.app_info) setAppInfo(d.app_info);
      });
    loadSuuntoStatus();

    const params = new URLSearchParams(window.location.search);
    if (params.get("suunto") === "connected") {
      toast.push("success", "Cuenta Suunto Cloud OAuth conectada correctamente");
    } else if (params.get("suunto_error")) {
      toast.push("error", `Error Suunto OAuth: ${params.get("suunto_error")}`);
    }
  }, []);

  async function saveAnthropicKey() {
    if (!anthropicKeyInput) return;
    setSavingAnthropicKey(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anthropic_api_key: anthropicKeyInput }),
      });
      setHasAnthropicKey(true);
      setAnthropicKeyInput("");
      toast.push("success", "Clave de Anthropic guardada");
    } finally {
      setSavingAnthropicKey(false);
    }
  }

  function removeAnthropicKey() {
    setConfirmState({
      open: true,
      title: "¿Quitar la clave de Anthropic?",
      description: "Dejarás de poder importar PDFs o imágenes usando Claude.",
      confirmLabel: "Quitar clave",
      tone: "danger",
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ anthropic_api_key: "" }),
        });
        setHasAnthropicKey(false);
        toast.push("info", "Clave de Anthropic eliminada");
      },
    });
  }

  async function saveGeminiKey() {
    if (!geminiKeyInput) return;
    setSavingGeminiKey(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gemini_api_key: geminiKeyInput }),
      });
      setHasGeminiKey(true);
      setGeminiKeyInput("");
      toast.push("success", "Clave de Google Gemini guardada con éxito");
    } finally {
      setSavingGeminiKey(false);
    }
  }

  function removeGeminiKey() {
    setConfirmState({
      open: true,
      title: "¿Quitar la clave de Google Gemini?",
      description: "El Entrenador volverá a usar el motor fisiológico local para responder a tus dudas y modificar entrenamientos.",
      confirmLabel: "Quitar clave",
      tone: "danger",
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        await fetch("/api/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gemini_api_key: "" }),
        });
        setHasGeminiKey(false);
        toast.push("info", "Clave de Gemini eliminada");
      },
    });
  }

  async function saveIntervalsConfig() {
    if (!intervalsAthleteId.trim() || (!intervalsApiKeyInput.trim() && !hasIntervalsKey)) return;
    setSavingIntervals(true);
    try {
      const payload: Record<string, string> = { intervals_athlete_id: intervalsAthleteId.trim() };
      if (intervalsApiKeyInput.trim()) {
        payload.intervals_api_key = intervalsApiKeyInput.trim();
      }
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setHasIntervalsKey(true);
      setIntervalsApiKeyInput("");
      toast.push("success", "Conexión Suunto / Intervals.icu guardada");
      await runIntervalsSync();
    } finally {
      setSavingIntervals(false);
    }
  }

  async function runIntervalsSync() {
    setSyncingIntervals(true);
    try {
      const res = await fetch("/api/sync/intervals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 21 }),
      });
      const data = await res.json();
      if (data.success) {
        toast.push("success", data.message || "Sincronización completada");
        loadSuuntoStatus();
      } else {
        toast.push("error", data.message || "No se pudo sincronizar con Intervals.icu");
      }
    } catch {
      toast.push("error", "Error conectando con el servidor");
    } finally {
      setSyncingIntervals(false);
    }
  }

  async function toggleSuuntoAutoPush(nextVal: boolean) {
    setTogglingAutoPush(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suunto_auto_push: nextVal ? "true" : "false" }),
      });
      setSuuntoAutoPush(nextVal);
      toast.push(
        "success",
        nextVal
          ? "Sincronización automática hacia Suunto activada"
          : "Sincronización automática hacia Suunto desactivada"
      );
      loadSuuntoStatus();
    } catch {
      toast.push("error", "No se pudo actualizar la preferencia");
    } finally {
      setTogglingAutoPush(false);
    }
  }

  async function pushWeekToSuunto() {
    setPushingWeekToSuunto(true);
    try {
      const res = await fetch("/api/suunto/push-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success || data.pushedCount > 0) {
        toast.push("success", data.message || `${data.pushedCount} sesiones enviadas a Suunto`);
      } else {
        toast.push("error", data.message || "No se pudieron enviar los entrenamientos");
      }
    } catch {
      toast.push("error", "Error conectando con el servidor de Suunto");
    } finally {
      setPushingWeekToSuunto(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      toast.push("success", "Perfil guardado");
    } finally {
      setSaving(false);
    }
  }

  async function handleOpenPortal() {
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "default_user" }),
      });
      const data = await res.json();
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        toast.push("info", data.message || "Gestiona tu suscripción en la sección de planes.");
      }
    } catch {
      toast.push("error", "No se pudo conectar con el portal de facturación.");
    }
  }

  const [exportingJSON, setExportingJSON] = useState(false);
  const [restoringJSON, setRestoringJSON] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);

  async function handleDownloadJSONBackup() {
    setExportingJSON(true);
    try {
      const filename = await downloadJSONBackupFile();
      toast.push("success", `Copia de seguridad descargada: ${filename}`);
    } catch {
      toast.push("error", "Error al exportar la copia de seguridad JSON");
    } finally {
      setExportingJSON(false);
    }
  }

  function handleRestoreJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      setConfirmState({
        open: true,
        title: `¿Restaurar copia de seguridad "${file.name}"?`,
        description: "Se importarán todos tus entrenamientos y registros de sueño tanto a la base de datos como a la memoria local protegida (IndexedDB).",
        confirmLabel: "Restaurar ahora",
        tone: "warning",
        onConfirm: async () => {
          setConfirmState((prev) => ({ ...prev, open: false }));
          setRestoringJSON(true);
          try {
            const res = await importDataFromJSON(content);
            toast.push("success", `¡Restauración completada! ${res.sessionsCount} sesiones y ${res.sleepCount} noches de sueño cargadas con éxito.`);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Error al restaurar JSON";
            toast.push("error", msg);
          } finally {
            setRestoringJSON(false);
          }
        },
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function copySupabaseSchema() {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    toast.push("success", "Script SQL de Supabase copiado al portapapeles");
    setTimeout(() => setCopiedSchema(false), 3000);
  }

  function handleRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setConfirmState({
      open: true,
      title: `¿Restaurar copia "${file.name}"?`,
      description: "Se aplicará al reiniciar la app y sustituirá los datos actuales (se guarda una copia de seguridad automática del estado previo).",
      confirmLabel: "Restaurar copia",
      tone: "warning",
      onConfirm: async () => {
        setConfirmState((prev) => ({ ...prev, open: false }));
        setRestoring(true);
        try {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/backup/restore", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) toast.push("error", data.error ?? "Error al restaurar");
          else toast.push("success", data.message);
        } finally {
          setRestoring(false);
        }
      },
    });
    e.target.value = "";
  }

  const fields: { key: string; label: string; textarea?: boolean; hint?: string }[] = [
    { key: "resting_hr_note", label: "Nota sobre frecuencia cardíaca", textarea: true, hint: "Usada por el motor de recomendaciones para no basarse en pulso." },
    { key: "allergies", label: "Alergias" },
    { key: "current_phase", label: "Fase actual del plan", hint: "1a, 1b, 2, 3 o 4" },
  ];

  return (
    <div>
      <PageHeader title="Configuración" description="Perfil usado por el motor de recomendaciones y copia de seguridad de tus datos." />

      <div className="grid gap-5">
        {/* SECCIÓN APARIENCIA & TEMA */}
        <div className="surface" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-2)", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Sun size={16} />
              Apariencia y Tema Visual
            </div>
            <ThemeToggle showLabel />
          </div>
          <p className="text-sm text-muted">
            Alterna entre <strong>Modo Claro</strong> (fondos limpios y grises tenues de alto contraste) y <strong>Modo Oscuro</strong> (grafito pizarra suave para evitar fatiga visual). La app también detecta la preferencia de tu sistema operativo automáticamente.
          </p>
        </div>

        {/* SECCIÓN NOTIFICACIONES PUSH */}
        <PushNotificationBanner variant="card" />

        {/* SECCIÓN PLAN & FACTURACIÓN */}
        <div className="surface" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-2)", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Crown size={16} className="text-amber-400" />
              Suscripción y Estado de la Cuenta
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                subInfo?.isActive
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              {subInfo?.plan === "pro_coach"
                ? "Pro Coach"
                : subInfo?.plan === "premium_annual"
                ? "Atleta Premium (Anual)"
                : subInfo?.plan === "premium_monthly"
                ? "Atleta Premium (Mensual)"
                : "Atleta Básico (Gratis)"}
            </span>
          </div>

          <p className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            {subInfo?.isActive
              ? "Tu cuenta tiene acceso completo al Entrenador IA, sincronización de relojes Suunto/Zepp y análisis de fatiga ACWR."
              : "Estás en el plan gratuito con registro básico de sesiones. Desbloquea el Entrenador IA y la sincronización con el plan Premium."}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/precios">
              <Button variant="primary">
                <Crown size={14} />
                {subInfo?.isActive ? "Ver o Cambiar Plan" : "Mejorar a Premium"}
              </Button>
            </Link>
            {subInfo?.isActive && (
              <Button variant="ghost" onClick={handleOpenPortal}>
                <CreditCard size={14} />
                Portal de Facturación Stripe
              </Button>
            )}
          </div>
        </div>

        <div className="surface" style={{ padding: "var(--space-4)" }}>
          <div className="font-semibold text-sm" style={{ marginBottom: "var(--space-3)" }}>
            Perfil
          </div>
          <p className="text-xs text-muted" style={{ marginBottom: "var(--space-3)" }}>
            La fecha del maratón y el ritmo objetivo se editan ahora en la pestaña{" "}
            <Link href="/objetivos" style={{ color: "var(--color-brand)", fontWeight: 600 }}>
              Objetivos
            </Link>
            . Aquí solo va lo que usa el motor de recomendaciones para no ajustarte mal la carga.
          </p>
          <div className="grid gap-3">
            {fields.map((f) =>
              f.textarea ? (
                <Textarea
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  rows={2}
                  value={settings[f.key] ?? ""}
                  onChange={(e) => setSettings((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              ) : (
                <Input
                  key={f.key}
                  label={f.label}
                  hint={f.hint}
                  value={settings[f.key] ?? ""}
                  onChange={(e) => setSettings((p) => ({ ...p, [f.key]: e.target.value }))}
                />
              )
            )}
          </div>
          <Button variant="primary" loading={saving} style={{ marginTop: "var(--space-3)" }} onClick={saveSettings}>
            <Save size={15} />
            Guardar perfil
          </Button>
        </div>

        {/* SECCIÓN IA & ENTRENADOR */}
        <div className="surface" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-center gap-2 font-semibold text-sm" style={{ marginBottom: "var(--space-2)" }}>
            <Sparkles size={16} />
            Inteligencia Artificial y Entrenador Personal
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: "var(--space-4)" }}>
            EntrenoApp integra a tu **Entrenador Personal** capaz de razonar sobre tus datos en vivo y modificar sesiones
            directamente en tu calendario. Para el diálogo libre ilimitado puedes conectar **Google Gemini** (100% gratuito)
            o **Anthropic Claude**.
          </p>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
            {/* GOOGLE GEMINI */}
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
                background: "var(--color-bg-subtle)",
              }}
            >
              <div className="flex items-center justify-between gap-2" style={{ marginBottom: 6 }}>
                <span className="font-semibold text-sm">Google Gemini 2.0</span>
                <span className="badge badge-brand">Recomendado · Gratis</span>
              </div>
              <p className="text-xs text-muted" style={{ marginBottom: "var(--space-3)" }}>
                Totalmente gratuito y sin tarjeta de crédito. Consigue tu clave en 30 segundos en{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--color-brand)", textDecoration: "underline" }}
                >
                  Google AI Studio ↗
                </a>
              </p>
              {hasGeminiKey ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="badge badge-success">Activo (Gemini 2.0 Flash)</span>
                  <Button variant="ghost" onClick={removeGeminiKey}>
                    Quitar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Input
                    type="password"
                    placeholder="AIzaSy…"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    loading={savingGeminiKey}
                    disabled={!geminiKeyInput}
                    onClick={saveGeminiKey}
                  >
                    Guardar clave Gemini
                  </Button>
                </div>
              )}
            </div>

            {/* ANTHROPIC CLAUDE */}
            <div
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-3)",
                background: "var(--color-bg-subtle)",
              }}
            >
              <div className="flex items-center justify-between gap-2" style={{ marginBottom: 6 }}>
                <span className="font-semibold text-sm">Anthropic Claude</span>
                <span className="badge badge-neutral">Alternativa</span>
              </div>
              <p className="text-xs text-muted" style={{ marginBottom: "var(--space-3)" }}>
                Usado para razonamiento con Claude y lectura automática de fotos/PDFs de planes semanales.
              </p>
              {hasAnthropicKey ? (
                <div className="flex items-center justify-between gap-2">
                  <span className="badge badge-success">Activo (Claude 3.5 Sonnet)</span>
                  <Button variant="ghost" onClick={removeAnthropicKey}>
                    Quitar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Input
                    type="password"
                    placeholder="sk-ant-…"
                    value={anthropicKeyInput}
                    onChange={(e) => setAnthropicKeyInput(e.target.value)}
                  />
                  <Button
                    variant="primary"
                    loading={savingAnthropicKey}
                    disabled={!anthropicKeyInput}
                    onClick={saveAnthropicKey}
                  >
                    Guardar clave Anthropic
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div
            className="text-xs text-muted"
            style={{
              marginTop: "var(--space-3)",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--color-bg)",
              borderRadius: "var(--radius-sm)",
              borderLeft: "3px solid var(--color-brand)",
            }}
          >
            <ShieldCheck size={14} className="inline mr-1 text-brand" /> <strong>Privacidad</strong>: Las claves se almacenan exclusivamente en la base de datos de tu servidor y nunca
            se comparten con terceros. Sin ninguna clave, el <strong>Motor Fisiológico Experto</strong> sigue activo respondiendo
            con tus métricas de RPE, sueño y carga.
          </div>
        </div>

        {/* OBSERVABILIDAD DE IA */}
        <AiObservabilityPanel />

        {/* SECCIÓN SEGURIDAD Y BLOQUEO DE LA APP */}
        <div className="surface" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-center justify-between gap-2" style={{ marginBottom: "var(--space-2)" }}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Lock size={16} className="text-brand" />
              <span>Seguridad y Bloqueo de Acceso</span>
            </div>
            {lockEnabled ? (
              <span className="badge badge-success">
                {lockType === "pin" ? "PIN Activo (4-6 dígitos)" : "Contraseña Activa"}
              </span>
            ) : (
              <span className="badge badge-neutral">Desactivado (Acceso libre)</span>
            )}
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            Protege el acceso a tus métricas y registros con un código PIN o contraseña alfanumérica. La app te pedirá
            la clave al iniciarse para garantizar tu máxima privacidad en el móvil o escritorio.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {lockEnabled ? (
              <Button variant="primary" onClick={() => setSecurityModalOpen(true)}>
                <KeyRound size={15} />
                <span>Modificar o Quitar Clave</span>
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setSecurityModalOpen(true)}>
                <Lock size={15} />
                <span>Activar PIN o Contraseña</span>
              </Button>
            )}
          </div>
        </div>

        {/* SECCIÓN SINCRONIZACIÓN AUTOMÁTICA DE DISPOSITIVOS (SUUNTO & AMAZFIT HELIO) */}
        <div className="surface" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-2)", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Watch size={16} className="text-brand" />
              <span>Sincronización Automática (Reloj Suunto & Pulsera Amazfit)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-success">Amazfit Helio (ZeppBridge): Activa</span>
              {hasIntervalsKey ? (
                <span className="badge badge-success">Suunto / Intervals.icu: Conectado</span>
              ) : (
                <span className="badge badge-warning">Suunto Auto-Pull: Pendiente de clave</span>
              )}
            </div>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            Olvídate de exportar archivos <code>.fit</code> manualmente. Conecta tu reloj <strong>Suunto</strong> mediante <strong>Intervals.icu</strong> (gratis, 1 minuto en la app Suunto → Ajustes → Servicios asociados → Intervals.icu) para que EntrenoApp descargue tus entrenos automáticamente en la nube.
          </p>

          <div
            style={{
              background: "var(--color-bg-subtle)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ marginBottom: "var(--space-3)" }}>
              <Input
                label="Athlete ID (Intervals.icu)"
                placeholder="Ej: i123456"
                value={intervalsAthleteId}
                onChange={(e) => setIntervalsAthleteId(e.target.value)}
              />
              <Input
                label={hasIntervalsKey ? "API Key (ya guardada — escribe para reemplazar)" : "API Key (Intervals.icu → Settings → API Key)"}
                type="password"
                placeholder="Tu clave API personal de Intervals.icu"
                value={intervalsApiKeyInput}
                onChange={(e) => setIntervalsApiKeyInput(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                loading={savingIntervals}
                disabled={!intervalsAthleteId.trim() || (!intervalsApiKeyInput.trim() && !hasIntervalsKey)}
                onClick={saveIntervalsConfig}
              >
                <Save size={15} />
                <span>Guardar y Vincular Suunto</span>
              </Button>
              {hasIntervalsKey && (
                <Button variant="secondary" loading={syncingIntervals} onClick={runIntervalsSync}>
                  <RefreshCw size={15} />
                  <span>Descargar de Suunto Ahora</span>
                </Button>
              )}
              <Button variant="secondary" loading={pushingWeekToSuunto} onClick={pushWeekToSuunto}>
                <Upload size={15} />
                <span>Enviar Semana al Reloj</span>
              </Button>
              {suuntoStatus?.directOAuthConfigured && (
                <a href="/api/suunto/auth" className="btn btn-secondary text-xs inline-flex items-center gap-1.5">
                  <Watch size={14} />
                  <span>{suuntoStatus.directOAuthConnected ? "Reautorizar Suunto Cloud OAuth" : "Conectar Suunto Cloud OAuth"}</span>
                </a>
              )}
            </div>

            {/* Estado bidireccional y subida automática al reloj */}
            <div
              className="mt-3 pt-3 flex flex-col gap-2"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold">
                    Sincronización automática hacia el reloj (Auto-Push)
                  </div>
                  <div className="text-xs text-muted">
                    Envía automáticamente a tu Suunto cada entrenamiento nuevo o adaptado en el calendario.
                  </div>
                </div>
                <Button
                  variant={suuntoAutoPush ? "primary" : "secondary"}
                  loading={togglingAutoPush}
                  onClick={() => toggleSuuntoAutoPush(!suuntoAutoPush)}
                >
                  {suuntoAutoPush ? "Auto-Push: ACTIVO" : "Auto-Push: Manual"}
                </Button>
              </div>

              {suuntoStatus && (
                <div className="text-xs text-muted flex flex-wrap gap-3">
                  <span>
                    Puente Suunto ↔ Intervals:{" "}
                    <strong>
                      {suuntoStatus.intervalsSuuntoBridgeConnected
                        ? `Conectado (${suuntoStatus.suuntoUserId || "Suunto"})`
                        : "Sin vincular"}
                    </strong>
                  </span>
                  <span>
                    Subida de planes (SuuntoPlus Guides):{" "}
                    <strong>{suuntoStatus.uploadPlannedWorkoutsEnabled ? "Habilitada ✓" : "Deshabilitada"}</strong>
                  </span>
                  {suuntoStatus.directOAuthConnected && (
                    <span>
                      Suunto Cloud OAuth:{" "}
                      <strong>Conectado (scopes: {suuntoStatus.scopes || "workout"})</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECCIÓN PERSISTENCIA Y COPIAS DE SEGURIDAD (JSON & SUPABASE) */}
        <div className="surface" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-2)", flexWrap: "wrap", gap: "var(--space-2)" }}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Database size={16} className="text-emerald-400" />
              Persistencia Blindada & Copias de Seguridad
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-success flex items-center gap-1">
                <HardDrive size={11} />
                IndexedDB Activo
              </span>
              {settings.has_blob_sync ? (
                <span className="badge badge-brand flex items-center gap-1">
                  <Cloud size={11} />
                  Vercel Blob 24/7 Conectado
                </span>
              ) : settings.has_supabase ? (
                <span className="badge badge-brand flex items-center gap-1">
                  <Cloud size={11} />
                  Supabase Conectado
                </span>
              ) : (
                <span className="badge badge-neutral flex items-center gap-1">
                  <Cloud size={11} />
                  Nube SQLite
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-muted" style={{ marginBottom: "var(--space-4)" }}>
            Tus entrenamientos y registros de sueño cuentan con <strong>doble blindaje</strong>: almacenamiento local en <strong>IndexedDB</strong> en tu navegador (a prueba de recargas y reinicios de servidor) y sincronización con base de datos permanente.
          </p>

          {/* ACCIONES DE RESPALDO JSON UNIVERSALES */}
          <div
            style={{
              background: "var(--color-bg-subtle)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              marginBottom: "var(--space-4)",
            }}
          >
            <div className="text-xs font-semibold" style={{ marginBottom: "var(--space-2)", color: "var(--color-brand)" }}>
              RESPALDO UNIVERSAL JSON (INDEPENDIENTE DEL SERVIDOR)
            </div>
            <p className="text-xs text-muted" style={{ marginBottom: "var(--space-3)" }}>
              Exporta tu historial completo de entrenamientos y sueños en un archivo JSON portable, o restaúralo en cualquier dispositivo o navegador en 1 segundo.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                loading={exportingJSON}
                onClick={handleDownloadJSONBackup}
              >
                <Download size={14} />
                <span>Descargar copia de seguridad (JSON)</span>
              </Button>

              <label className="btn btn-secondary" style={{ display: "inline-flex", cursor: "pointer", gap: 6, margin: 0 }}>
                <Upload size={14} />
                <span>{restoringJSON ? "Restaurando…" : "Restaurar datos (JSON)"}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreJSON}
                  disabled={restoringJSON}
                  style={{ display: "none" }}
                />
              </label>
            </div>
          </div>

          {/* PERSISTENCIA EN LA NUBE SUPABASE */}
          <div
            style={{
              background: "var(--color-bg-subtle)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              marginBottom: "var(--space-3)",
            }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-1)" }}>
              <div className="text-xs font-semibold flex items-center gap-1.5">
                <Cloud size={13} className="text-sky-400" />
                Persistencia en Supabase (PostgreSQL en la Nube)
              </div>
              <Button variant="ghost" onClick={copySupabaseSchema}>
                {copiedSchema ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedSchema ? "SQL Copiado" : "Copiar SQL para Supabase"}</span>
              </Button>
            </div>
            <p className="text-xs text-muted">
              {settings.has_supabase
                ? "Conexión activa con Supabase. Cada sesión y registro de sueño se escribe simultáneamente en PostgreSQL en la nube."
                : "Para persistencia permanente en Vercel, añade NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en los Environment Variables de tu proyecto en Vercel."}
            </p>
          </div>

          {/* COPIA NATIVA .DB */}
          <div className="flex items-center justify-between pt-2 text-xs text-muted">
            <span>Copia de base de datos SQLite (.db clásica):</span>
            <div className="flex items-center gap-2">
              <a href="/api/backup/export" className="btn btn-ghost" style={{ fontSize: "11px", padding: "4px 8px" }}>
                <Download size={12} />
                Exportar .db
              </a>
              <label className="btn btn-ghost" style={{ fontSize: "11px", padding: "4px 8px", cursor: "pointer", margin: 0 }}>
                <Upload size={12} />
                {restoring ? "…" : "Restaurar .db"}
                <input type="file" accept=".db" onChange={handleRestore} disabled={restoring} style={{ display: "none" }} />
              </label>
            </div>
          </div>
        </div>

        <div className="surface" style={{ padding: "var(--space-4)" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-2)" }}>
            <div className="flex items-center gap-2 font-semibold text-sm">
              <RefreshCw size={16} />
              Versión y Actualizaciones
            </div>
            <span className="badge badge-brand">v{appInfo?.version || "0.1.0"}</span>
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            EntrenoApp cuenta con un motor de actualización directa. Las mejoras de código, diseño o nuevas funciones
            se aplican al instante sin necesidad de reinstalar el instalador .exe.
          </p>
          <div
            className="grid gap-2 text-xs"
            style={{
              background: "var(--color-bg-subtle)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div>
              <span className="text-muted">Origen del ejecutable en uso:</span>{" "}
              <span className="font-semibold" style={{ color: "var(--color-brand)" }}>
                {appInfo?.bundle_source || "Desarrollo Local"}
              </span>
            </div>
            <div>
              <span className="text-muted">¿Cómo actualizar sin reinstalar?</span>{" "}
              <span>
                Ejecuta el archivo <code style={{ color: "var(--color-brand)" }}>actualizar-app.bat</code> en la carpeta de
                EntrenoApp. Compila y despliega las actualizaciones en ~15 segundos manteniendo todos tus datos intactos.
              </span>
            </div>
          </div>
        </div>

        <div className="surface" style={{ padding: "var(--space-4)" }}>
          <div className="font-semibold text-sm" style={{ marginBottom: "var(--space-1)" }}>
            Acerca de EntrenoApp
          </div>
          <p className="text-sm text-muted">
            Aplicación de seguimiento y planificación de entrenamiento, descanso y nutrición.
          </p>
          <div className="text-xs font-semibold" style={{ marginTop: "var(--space-2)", color: "var(--color-brand)" }}>
            Diseñada por Daniel Espinosa
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-faint">
          <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          En la versión de escritorio (Electron), el botón de copia de seguridad abrirá el diálogo nativo de Windows
          &quot;Guardar como&quot; en vez de descargar el archivo al navegador.
        </div>
      </div>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        description={confirmState.description}
        confirmLabel={confirmState.confirmLabel}
        tone={confirmState.tone}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, open: false }))}
      />

      <SecuritySettingsModal
        open={securityModalOpen}
        onClose={() => setSecurityModalOpen(false)}
        onChanged={refreshSecurity}
      />
    </div>
  );
}
