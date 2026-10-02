"use client";

import { useState, useEffect } from "react";
import { Mic, MicOff, Check, Sparkles, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface VoiceLoggerProps {
  open: boolean;
  onClose: () => void;
  exerciseName: string;
  onApplyParsedData: (data: { weightKg?: number; reps?: number; sets?: number }) => void;
}

export function parseGymVoiceTranscript(transcript: string): { weightKg?: number; reps?: number; sets?: number } {
  const t = transcript.toLowerCase();
  const res: { weightKg?: number; reps?: number; sets?: number } = {};

  // Parsear peso: "80 kilos", "80 kg", "con 85 kilos y medio", "peso 100"
  const weightMatch = t.match(/(\d+(?:[.,]\d+)?)\s*(?:kilos?|kg|libras?)/) ?? t.match(/con\s*(\d+(?:[.,]\d+)?)/);
  if (weightMatch) {
    const w = parseFloat(weightMatch[1].replace(",", "."));
    if (w > 0 && w < 500) res.weightKg = w;
  }

  // Parsear repeticiones: "10 repes", "12 repeticiones", "a 8 repes"
  const repsMatch = t.match(/(\d+)\s*(?:repes?|repeticiones|reps)/);
  if (repsMatch) {
    const r = parseInt(repsMatch[1], 10);
    if (r > 0 && r <= 100) res.reps = r;
  }

  // Parsear series: "3 series", "4 de 10"
  const setsMatch = t.match(/(\d+)\s*series?/) ?? t.match(/(\d+)\s*de\s*(\d+)/);
  if (setsMatch) {
    const s = parseInt(setsMatch[1], 10);
    if (s > 0 && s <= 10) res.sets = s;
    if (setsMatch[2] && !res.reps) {
      res.reps = parseInt(setsMatch[2], 10);
    }
  }

  return res;
}

export function VoiceLoggerModal({
  open,
  onClose,
  exerciseName,
  onApplyParsedData,
}: VoiceLoggerProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<{ weightKg?: number; reps?: number; sets?: number }>({});
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasSpeech = "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
      setSupported(hasSpeech);
    }
  }, []);

  const startListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript("");
      };

      recognition.onresult = (event: any) => {
        const text = Array.from(event.results)
          .map((r: any) => r[0].transcript)
          .join("");
        setTranscript(text);
        const p = parseGymVoiceTranscript(text);
        setParsed(p);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      onClose={onClose}
      title="Registro por Voz Manos Libres"
    >
      <div className="grid gap-4 text-center">
        <p className="text-xs text-muted" style={{ margin: 0 }}>
          Dicta tus series para &quot;{exerciseName}&quot; sin tocar la pantalla con magnesio o sudor.
        </p>
        {!supported ? (
          <div
            style={{
              padding: "var(--space-3)",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              fontSize: "var(--text-xs)",
              color: "var(--color-warning)",
            }}
          >
            Tu navegador actual no tiene activada la API nativa de voz. Puedes probar el dictado rápido en Chrome o escribir en las casillas.
          </div>
        ) : null}

        {/* Botón Central de Micro */}
        <div className="flex flex-col items-center justify-center" style={{ margin: "12px 0" }}>
          <button
            type="button"
            onClick={startListening}
            className={`surface-interactive flex items-center justify-center ${isListening ? "animate-pulse" : ""}`}
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              backgroundColor: isListening ? "rgba(239, 68, 68, 0.15)" : "rgba(59, 130, 246, 0.15)",
              border: `2px solid ${isListening ? "var(--color-danger)" : "var(--color-brand)"}`,
              color: isListening ? "var(--color-danger)" : "var(--color-brand)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
          <span className="text-xs font-semibold" style={{ marginTop: 8, color: isListening ? "var(--color-danger)" : "var(--color-muted)" }}>
            {isListening ? "Escuchando... Di ej: '80 kilos 10 repes'" : "Pulsa para empezar a hablar"}
          </span>
        </div>

        {/* Texto transcrito en tiempo real */}
        {transcript && (
          <div
            style={{
              padding: "var(--space-3)",
              backgroundColor: "rgba(0,0,0,0.25)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              fontSize: "var(--text-xs)",
              color: "var(--color-text)",
              fontStyle: "italic",
            }}
          >
            &quot;{transcript}&quot;
          </div>
        )}

        {/* Datos detectados */}
        {(parsed.weightKg || parsed.reps || parsed.sets) && (
          <div
            style={{
              padding: "var(--space-3)",
              backgroundColor: "rgba(16, 185, 129, 0.08)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-around",
            }}
          >
            {parsed.weightKg != null && (
              <div>
                <span className="text-xs text-muted">Peso detectado:</span>
                <div className="text-lg font-bold text-success">{parsed.weightKg} kg</div>
              </div>
            )}
            {parsed.reps != null && (
              <div>
                <span className="text-xs text-muted">Repeticiones:</span>
                <div className="text-lg font-bold text-success">{parsed.reps} reps</div>
              </div>
            )}
            {parsed.sets != null && (
              <div>
                <span className="text-xs text-muted">Series:</span>
                <div className="text-lg font-bold text-success">{parsed.sets} series</div>
              </div>
            )}
          </div>
        )}

        {/* Atajos de prueba para simulador */}
        <div className="text-xs text-muted flex items-center justify-center gap-1.5 flex-wrap">
          <span>Ejemplos rápidos:</span>
          {["80 kilos 10 repes", "60 kg 12 repeticiones", "3 series de 10 con 75 kilos"].map((sample) => (
            <button
              key={sample}
              type="button"
              className="badge badge-neutral surface-interactive"
              style={{ fontSize: "0.68rem", cursor: "pointer" }}
              onClick={() => {
                setTranscript(sample);
                setParsed(parseGymVoiceTranscript(sample));
              }}
            >
              &quot;{sample}&quot;
            </button>
          ))}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2" style={{ marginTop: "var(--space-2)" }}>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!parsed.weightKg && !parsed.reps}
            onClick={() => {
              onApplyParsedData(parsed);
              onClose();
            }}
          >
            <Check size={14} />
            <span>Aplicar a la Serie</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
