"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Trash2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

interface CalendarSyncState {
  hasIcsUrl: boolean;
  icsUrl: string | null;
  lastSync: string | null;
  totalEvents: number;
}

export function CalendarIPhoneCard() {
  const [syncState, setSyncState] = useState<CalendarSyncState | null>(null);
  const [icsUrlInput, setIcsUrlInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showShortcutInfo, setShowShortcutInfo] = useState(false);
  const [copiedShortcutUrl, setCopiedShortcutUrl] = useState(false);
  const [testingShortcut, setTestingShortcut] = useState(false);
  const toast = useToast();

  const shortcutWebhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/calendar/ios-shortcut`
      : "https://entrenoapp-blond.vercel.app/api/calendar/ios-shortcut";

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/calendar/sync", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) {
        setSyncState({
          hasIcsUrl: data.hasIcsUrl,
          icsUrl: data.icsUrl,
          lastSync: data.lastSync,
          totalEvents: data.totalEvents,
        });
        if (data.icsUrl && !icsUrlInput) {
          setIcsUrlInput(data.icsUrl);
        }
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

  const handleConnect = async () => {
    if (!icsUrlInput.trim()) {
      toast.push("error", "Pega primero tu URL de calendario (.ics o webcal://)");
      return;
    }

    setConnecting(true);
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icsUrl: icsUrlInput.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error sincronizando con el calendario");
      }

      toast.push("success", data.message || `Sincronizados ${data.count} eventos`);
      loadStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push("error", msg);
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncingNow(true);
    try {
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo actualizar el calendario");
      }

      toast.push("success", data.message || "Calendario actualizado con éxito");
      loadStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push("error", msg);
    } finally {
      setSyncingNow(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("¿Deseas desconectar el calendario y eliminar los eventos almacenados?")) {
      return;
    }

    setDisconnecting(true);
    try {
      const res = await fetch("/api/calendar/events", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al desconectar");

      toast.push("success", "Calendario desconectado");
      setIcsUrlInput("");
      loadStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push("error", msg);
    } finally {
      setDisconnecting(false);
    }
  };

  const copyShortcutUrl = async () => {
    try {
      await navigator.clipboard.writeText(shortcutWebhookUrl);
      setCopiedShortcutUrl(true);
      toast.push("success", "URL del Webhook de Atajos copiada al portapapeles");
      setTimeout(() => setCopiedShortcutUrl(false), 2500);
    } catch {
      toast.push("error", "No se pudo copiar la URL");
    }
  };

  const handleTestShortcut = async () => {
    setTestingShortcut(true);
    try {
      const todayIso = new Date().toISOString().slice(0, 10);
      const res = await fetch("/api/calendar/ios-shortcut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: [
            {
              title: "Reunión de prueba (Atajos iOS)",
              startDate: `${todayIso}T11:00:00`,
              endDate: `${todayIso}T12:00:00`,
              isAllDay: false,
              location: "Oficina",
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Fallo en la prueba");

      toast.push("success", "Evento de prueba recibido desde Atajos correctamente");
      loadStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.push("error", msg);
    } finally {
      setTestingShortcut(false);
    }
  };

  const isConnected = syncState?.hasIcsUrl || (syncState?.totalEvents ?? 0) > 0;

  return (
    <section className="surface p-5 sm:p-6 space-y-4">
      {/* Cabecera de la tarjeta */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: isConnected ? "var(--color-brand-subtle)" : "var(--color-surface-raised)",
              color: isConnected ? "var(--color-brand)" : "var(--color-text-muted)",
            }}
          >
            <CalendarDays size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base" style={{ color: "var(--color-text)" }}>
                Calendario iPhone
              </h3>
              {isConnected ? (
                <span className="badge badge-success">
                  Conectado · {syncState?.totalEvents || 0} eventos
                </span>
              ) : (
                <span className="badge badge-neutral">Sin conectar</span>
              )}
            </div>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Sincroniza tus compromisos, trabajo y viajes para adaptar la duración y franja de tus entrenos.
            </p>
          </div>
        </div>
      </div>

      {/* Vía 1: Enlace iCloud iCal (.ics / webcal://) */}
      <div
        className="p-4 rounded-2xl space-y-3.5"
        style={{
          background: "var(--color-surface-raised)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-brand)" }}>
            Vía Principal · Suscripción iCloud (iCal)
          </div>
          {syncState?.lastSync && (
            <div className="text-[11px] flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
              <Clock size={11} />
              Última sincro: {new Date(syncState.lastSync).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>

        <Input
          label="URL del Calendario de iCloud (.ics o webcal://)"
          placeholder="webcal://pXX-caldav.icloud.com/... o https://..."
          value={icsUrlInput}
          onChange={(e) => setIcsUrlInput(e.target.value)}
        />

        <div className="text-[11px] leading-relaxed p-2.5 rounded-xl bg-white/5 border border-white/10" style={{ color: "var(--color-text-muted)" }}>
          <strong className="text-white">¿Cómo obtenerla en 30 segundos?:</strong> En tu iPhone abre <strong>Calendario</strong> → pulsa <strong>Calendarios</strong> (abajo centro) → toca el botón <strong>(i)</strong> en tu calendario de iCloud → activa <strong>&quot;Calendario público&quot;</strong> y pulsa <strong>&quot;Compartir enlace...&quot;</strong>.
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <Button
            variant="primary"
            loading={connecting}
            onClick={handleConnect}
          >
            <span>{isConnected ? "Actualizar URL y Sincronizar" : "Conectar y Sincronizar"}</span>
          </Button>

          {isConnected && (
            <>
              <Button
                variant="secondary"
                loading={syncingNow}
                onClick={handleSyncNow}
                title="Actualizar eventos ahora"
              >
                <RefreshCw size={14} className={syncingNow ? "animate-spin" : ""} />
                <span>Actualizar Ahora</span>
              </Button>
              <Button
                variant="ghost"
                loading={disconnecting}
                onClick={handleDisconnect}
                className="text-red-400 hover:text-red-300"
                title="Desconectar calendario"
              >
                <Trash2 size={14} />
                <span>Desconectar</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Vía 2: Acordeón para Atajos de iOS (Shortcuts) */}
      <div
        className="rounded-2xl border transition-all"
        style={{
          background: "var(--color-surface-raised)",
          borderColor: "var(--color-border)",
        }}
      >
        <button
          type="button"
          onClick={() => setShowShortcutInfo(!showShortcutInfo)}
          className="w-full p-4 flex items-center justify-between text-left cursor-pointer select-none"
        >
          <div className="flex items-center gap-2.5">
            <Smartphone size={16} style={{ color: "var(--color-brand)" }} />
            <div>
              <div className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                Vía Alternativa: Atajos de iOS (Automatización Diaria)
              </div>
              <div className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>
                Ideal para calendarios locales, de empresa o Exchange
              </div>
            </div>
          </div>
          {showShortcutInfo ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showShortcutInfo && (
          <div className="p-4 pt-0 space-y-3.5 border-t border-white/5 animate-in">
            <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              Configura una automatización personal en la app <strong>Atajos</strong> de tu iPhone para enviar tus eventos matinales sin depender de iCloud público:
            </p>

            {/* URL del webhook con botón de copiar */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                URL del Webhook en tu EntrenoApp
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shortcutWebhookUrl}
                  className="w-full text-xs font-mono p-2.5 rounded-xl border bg-black/20 text-white/90 select-all"
                  style={{ borderColor: "var(--color-border)" }}
                />
                <Button variant="secondary" onClick={copyShortcutUrl}>
                  {copiedShortcutUrl ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedShortcutUrl ? "Copiada" : "Copiar"}</span>
                </Button>
              </div>
            </div>

            {/* Pasos en 3 líneas */}
            <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-2 text-xs" style={{ color: "var(--color-text)" }}>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>En tu iPhone abre <strong>Atajos</strong> → pestaña <strong>Automatización</strong> → <strong>Crear automatización personal</strong> (ej. Diaria a las 07:00 h).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>Añade la acción <strong>&quot;Buscar eventos del calendario&quot;</strong> (filtrar por fecha: próximos 7 días).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>Añade la acción <strong>&quot;Obtener contenido de URL&quot;</strong> (Método <code>POST</code> a la URL de arriba con el cuerpo en <code>JSON</code> pasando los eventos).</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="secondary"
                loading={testingShortcut}
                onClick={handleTestShortcut}
              >
                <Sparkles size={13} />
                <span>Enviar Evento de Prueba (Test)</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
