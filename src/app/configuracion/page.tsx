"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Upload, Save, ShieldCheck, Sparkles, RefreshCw, Sun } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [anthropicKeyInput, setAnthropicKeyInput] = useState("");
  const [hasAnthropicKey, setHasAnthropicKey] = useState(false);
  const [savingAnthropicKey, setSavingAnthropicKey] = useState(false);

  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [savingGeminiKey, setSavingGeminiKey] = useState(false);

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

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.settings ?? {});
        setHasAnthropicKey(!!d.settings?.has_anthropic_api_key);
        setHasGeminiKey(!!d.settings?.has_gemini_api_key);
        if (d.app_info) setAppInfo(d.app_info);
      });
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
            🛡️ <strong>Privacidad</strong>: Las claves se almacenan exclusivamente en la base de datos de tu servidor y nunca
            se comparten con terceros. Sin ninguna clave, el <strong>Motor Fisiológico Experto</strong> sigue activo respondiendo
            con tus métricas de RPE, sueño y carga.
          </div>
        </div>

        <div className="surface" style={{ padding: "var(--space-4)" }}>
          <div className="font-semibold text-sm" style={{ marginBottom: "var(--space-2)" }}>
            Copia de seguridad
          </div>
          <p className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            Crea una copia de tu base de datos cuando quieras y guárdala donde tú decidas (por ejemplo, una carpeta
            de tu Google Drive de escritorio). La app nunca sube ni sincroniza nada por su cuenta.
          </p>
          <a href="/api/backup/export" className="btn btn-primary" style={{ display: "inline-flex", marginBottom: "var(--space-4)" }}>
            <Download size={15} />
            Crear copia de seguridad
          </a>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
            <div className="text-sm font-medium" style={{ marginBottom: "var(--space-2)" }}>
              Restaurar una copia
            </div>
            <label className="btn btn-secondary" style={{ display: "inline-flex", cursor: "pointer" }}>
              <Upload size={15} />
              {restoring ? "Restaurando…" : "Elegir archivo .db"}
              <input type="file" accept=".db" onChange={handleRestore} disabled={restoring} style={{ display: "none" }} />
            </label>
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
    </div>
  );
}
