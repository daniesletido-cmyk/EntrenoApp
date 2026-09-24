"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  RotateCcw,
  Zap,
  Activity,
  BedDouble,
  Bot,
  User,
  Flame,
  ArrowRight,
  Info,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import type { CoachActionProposal, CoachActionResult } from "@/lib/coach-ai/actions";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  appliedAction?: CoachActionResult;
  proposedAction?: CoachActionProposal;
}

const SUGGESTED_QUESTIONS = [
  "Cámbiame el entreno de hoy por natación",
  "¿Puedo meter natación hoy tras el CrossFit de ayer?",
  "¿Por qué tengo el ACWR en 0.54 y qué pauta debo seguir?",
  "¿Cómo debo enfocar la tirada larga del fin de semana?",
  "Analiza mi descanso de anoche y dime si debo ajustar la intensidad hoy",
];

const INITIAL_MESSAGE: Message = {
  id: "welcome-1",
  role: "assistant",
  content: `¡Hola Daniel! Soy tu **Entrenador Personal** en EntrenoApp.

Tengo acceso directo a tus datos biométricos de esta semana: tus entrenamientos completados, tu ratio ACWR, las horas de sueño registradas en Zepp y tu Readiness diario.

¿Tienes dudas sobre cómo adaptar una sesión, qué ritmo llevar, cómo gestionar la fatiga o qué comer antes de una tirada larga? Pregúntame lo que necesites.`,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export default function EntrenadorPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [contextSummary, setContextSummary] = useState<string>("Conectado a tus datos en vivo");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar historial de localStorage si existe
  useEffect(() => {
    try {
      const saved = localStorage.getItem("entrenoapp_coach_chat");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {
      // Ignorar fallo de parseo
    }
  }, []);

  // Guardar en localStorage
  useEffect(() => {
    try {
      if (messages.length > 1) {
        localStorage.setItem("entrenoapp_coach_chat", JSON.stringify(messages));
      }
    } catch {
      // Ignorar fallo de guardado
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      const data = await res.json();
      if (data.contextSummary) {
        setContextSummary(data.contextSummary);
      }

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.reply || "No he podido procesar la respuesta en este momento.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        appliedAction: data.appliedAction,
        proposedAction: data.proposedAction,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content:
            "Ha ocurrido un error al conectar con el entrenador. Por favor, revisa tu conexión o intenta formular la pregunta de nuevo.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyProposed = async (msgId: string, action: CoachActionProposal) => {
    try {
      const res = await fetch("/api/coach/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.ok && data.result) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, proposedAction: undefined, appliedAction: data.result } : m
          )
        );
      }
    } catch (e) {
      console.error("Error aplicando propuesta:", e);
    }
  };

  const handleUndo = async (msgId: string, sessionId: number, previousState: any) => {
    try {
      const res = await fetch("/api/coach/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ undo: true, sessionId, previousState }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, appliedAction: undefined } : m
          )
        );
      }
    } catch (e) {
      console.error("Error deshaciendo cambio:", e);
    }
  };

  const resetChat = () => {
    if (confirm("¿Quieres reiniciar la conversación con tu entrenador?")) {
      setMessages([INITIAL_MESSAGE]);
      try {
        localStorage.removeItem("entrenoapp_coach_chat");
      } catch {
        // Ignorar
      }
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: "var(--space-6)" }}>
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3" style={{ flexWrap: "wrap", marginBottom: "var(--space-3)" }}>
        <PageHeader
          title="Entrenador"
          description="Tu preparador personal y fisiólogo deportivo con acceso a tus datos en vivo."
        />
        <Button variant="ghost" onClick={resetChat} title="Reiniciar conversación" style={{ fontSize: "var(--text-xs)" }}>
          <RotateCcw size={14} />
          Reiniciar chat
        </Button>
      </div>

      {/* Barra de Contexto Biométrico en Vivo */}
      <div
        className="surface flex items-center justify-between gap-3"
        style={{
          padding: "var(--space-2) var(--space-3)",
          borderRadius: "var(--radius-md)",
          border: "1px solid rgba(47, 111, 235, 0.3)",
          background: "linear-gradient(135deg, rgba(47, 111, 235, 0.08) 0%, rgba(47, 111, 235, 0.02) 100%)",
          marginBottom: "var(--space-4)",
        }}
      >
        <div className="flex items-center gap-2 text-xs">
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "var(--color-success)",
              boxShadow: "0 0 8px var(--color-success)",
            }}
          />
          <span className="font-semibold text-brand">Datos en tiempo real sincronizados:</span>
          <span className="text-muted">{contextSummary}</span>
        </div>

        <Link
          href="/configuracion"
          className="text-xs text-brand hover:underline flex items-center gap-1 flex-shrink-0"
          style={{ fontSize: "0.75rem" }}
        >
          <span>Configuración</span>
          <ArrowRight size={12} />
        </Link>
      </div>

      {/* Preguntas rápidas sugeridas */}
      <div style={{ marginBottom: "var(--space-3)" }}>
        <div className="text-xs font-semibold text-muted" style={{ marginBottom: 6 }}>
          Preguntas frecuentes al entrenador:
        </div>
        <div className="flex gap-2" style={{ overflowX: "auto", paddingBottom: 4 }}>
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(q)}
              disabled={loading}
              className="badge text-xs"
              style={{
                cursor: "pointer",
                padding: "0.4rem 0.75rem",
                borderRadius: 999,
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                color: "var(--color-foreground)",
                whiteSpace: "nowrap",
                fontSize: "0.75rem",
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--color-brand)";
                e.currentTarget.style.background = "rgba(47, 111, 235, 0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.background = "var(--color-surface-raised)";
              }}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Ventana de Chat */}
      <div
        className="surface"
        style={{
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          minHeight: 380,
          height: "calc(100dvh - 320px)",
          maxHeight: 680,
        }}
      >
        {/* Mensajes */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "var(--space-4)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className="animate-in"
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                  alignItems: "flex-start",
                  gap: "var(--space-2)",
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-brand)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={18} />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: "82%",
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    background: isUser ? "var(--color-brand)" : "var(--color-surface-raised)",
                    color: isUser ? "#ffffff" : "var(--color-foreground)",
                    border: isUser ? "none" : "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-sm)",
                    lineHeight: 1.6,
                    fontSize: "var(--text-sm)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  <div style={{ wordBreak: "break-word" }}>{m.content}</div>

                  {/* Tarjeta de acción aplicada directamente en la app */}
                  {m.appliedAction?.success && (
                    <div
                      className="animate-in"
                      style={{
                        marginTop: "var(--space-3)",
                        padding: "var(--space-2) var(--space-3)",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(34, 197, 94, 0.12)",
                        border: "1px solid rgba(34, 197, 94, 0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "var(--space-2)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--color-success)" }}>
                        <CheckCircle2 size={15} />
                        <span>{m.appliedAction.message || "Plan actualizado en la app"}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href="/plan-semanal"
                          className="text-xs font-bold text-brand hover:underline"
                          style={{ fontSize: "0.75rem" }}
                        >
                          Ver plan ↗
                        </Link>
                        {m.appliedAction.sessionId && m.appliedAction.previousState && (
                          <button
                            type="button"
                            onClick={() => handleUndo(m.id, m.appliedAction!.sessionId!, m.appliedAction!.previousState!)}
                            className="text-xs text-muted hover:underline"
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                          >
                            Deshacer
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tarjeta de propuesta de cambio (para aplicar con 1 toque) */}
                  {m.proposedAction && !m.appliedAction && (
                    <div
                      className="animate-in"
                      style={{
                        marginTop: "var(--space-3)",
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(47, 111, 235, 0.08)",
                        border: "1px solid rgba(47, 111, 235, 0.3)",
                      }}
                    >
                      <div className="text-xs font-semibold text-brand flex items-center gap-1.5" style={{ marginBottom: 4 }}>
                        <Sparkles size={14} />
                        <span>Ajuste recomendado en tu plan:</span>
                      </div>
                      <div className="text-xs" style={{ marginBottom: 8, color: "var(--color-foreground)" }}>
                        {m.proposedAction.summary}
                      </div>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleApplyProposed(m.id, m.proposedAction!)}
                        style={{ fontSize: "var(--text-xs)", padding: "0.3rem 0.75rem" }}
                      >
                        <CheckCircle2 size={13} />
                        <span>Aplicar cambio en la app</span>
                      </Button>
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: "0.65rem",
                      marginTop: 4,
                      opacity: 0.7,
                      textAlign: isUser ? "right" : "left",
                    }}
                  >
                    {m.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--color-surface-raised)",
                      border: "1px solid var(--color-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-muted)",
                      flexShrink: 0,
                    }}
                  >
                    <User size={18} />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div
              className="animate-in"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--color-brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <Bot size={18} />
              </div>
              <div
                className="surface-raised"
                style={{
                  padding: "var(--space-2) var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-muted)",
                }}
              >
                Analizando tus métricas de entrenamiento y descanso...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: "var(--space-3)",
            borderTop: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            borderBottomLeftRadius: "var(--radius-lg)",
            borderBottomRightRadius: "var(--radius-lg)",
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Pregúntale a tu entrenador (ej: ¿Cómo ves si hoy cambio carrera por natación?)..."
              disabled={loading}
              className="field"
              style={{
                flex: 1,
                fontSize: "var(--text-sm)",
                padding: "0.6rem 0.85rem",
              }}
            />
            <Button
              type="submit"
              variant="primary"
              disabled={!input.trim() || loading}
              style={{ flexShrink: 0, padding: "0.6rem 1.1rem" }}
            >
              <Send size={15} />
              <span className="hidden sm:inline">Preguntar</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
