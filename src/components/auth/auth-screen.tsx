"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EntrenoLogo } from "@/components/brand/entreno-logo";
import { useAuth } from "@/context/auth-context";
import { Lock, Mail, User, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from "lucide-react";

interface AuthScreenProps {
  onSuccess?: () => void;
}

export function AuthScreen({ onSuccess }: AuthScreenProps) {
  const router = useRouter();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, isConfigured } = useAuth();

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Introduce tu correo y contraseña");
      return;
    }
    if (mode === "signup" && !fullName) {
      setErrorMsg("Introduce tu nombre completo");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    if (mode === "login") {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setErrorMsg(error.message === "Invalid login credentials" ? "Credenciales incorrectas" : error.message);
        setLoading(false);
      } else {
        if (onSuccess) onSuccess();
        else router.push("/hoy");
      }
    } else {
      const { error } = await signUpWithEmail(email, password, fullName);
      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
      } else {
        if (onSuccess) onSuccess();
        else router.push("/onboarding");
      }
    }
  };

  const handleQuickLoginDaniel = async () => {
    setLoading(true);
    setErrorMsg(null);
    const { error } = await signInWithEmail("daniespinosa973@gmail.com", "Entreno2026!");
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      if (onSuccess) onSuccess();
      else router.push("/hoy");
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{
        background: "var(--color-bg)",
        color: "var(--color-text)",
      }}
    >
      <div
        className="w-full max-w-[390px] sm:max-w-md rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative overflow-hidden"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Glow sutil rojo atlético */}
        <div
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: "#DC2626" }}
        />

        {/* Encabezado de Marca */}
        <div className="flex flex-col items-center text-center gap-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md mb-1"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
            }}
          >
            <EntrenoLogo size={36} />
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
            Entreno<span style={{ color: "#DC2626" }}>App</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>
            Rendimiento, periodización y salud individualizada
          </p>
        </div>

        {/* Notificación si Supabase no está configurado (Modo local) */}
        {!isConfigured && (
          <div
            className="p-3.5 rounded-2xl text-xs flex items-start gap-2.5"
            style={{
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.25)",
              color: "var(--color-text)",
            }}
          >
            <AlertCircle size={16} className="text-[#DC2626] shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold">Modo Local Activo:</span> Configura las variables de Supabase en Vercel para activar el inicio multiusuario global en la nube.
            </div>
          </div>
        )}

        {/* Botón rápido con Google */}
        <button
          onClick={handleGoogle}
          disabled={loading || !isConfigured}
          type="button"
          className="w-full min-h-[48px] rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
          style={{
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>

        {/* Separador */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
            o con tu correo
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
        </div>

        {/* Conmutador Modo */}
        <div
          className="flex p-1 rounded-2xl"
          style={{
            background: "var(--color-surface-raised)",
            border: "1px solid var(--color-border)",
          }}
        >
          <button
            type="button"
            onClick={() => { setMode("login"); setErrorMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === "login"
                ? "bg-[#DC2626] text-white shadow"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setErrorMsg(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              mode === "signup"
                ? "bg-[#DC2626] text-white shadow"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Mensajes de Alerta */}
        {errorMsg && (
          <div
            className="p-3 rounded-2xl text-xs flex items-center gap-2"
            style={{
              background: "rgba(220, 38, 38, 0.1)",
              border: "1px solid rgba(220, 38, 38, 0.3)",
              color: "#DC2626",
            }}
          >
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {infoMsg && (
          <div
            className="p-3 rounded-2xl text-xs flex items-center gap-2"
            style={{
              background: "rgba(34, 197, 94, 0.1)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              color: "#16A34A",
            }}
          >
            <Sparkles size={15} className="shrink-0" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {mode === "signup" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
                Nombre Completo
              </label>
              <div
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all focus-within:ring-2 focus-within:ring-[#DC2626]"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <User size={16} style={{ color: "var(--color-text-muted)" }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre y apellidos"
                  className="w-full bg-transparent text-sm font-medium outline-none"
                  style={{ color: "var(--color-text)" }}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
              Correo Electrónico
            </label>
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all focus-within:ring-2 focus-within:ring-[#DC2626]"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Mail size={16} style={{ color: "var(--color-text-muted)" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-transparent text-sm font-medium outline-none"
                style={{ color: "var(--color-text)" }}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold" style={{ color: "var(--color-text-muted)" }}>
              Contraseña
            </label>
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all focus-within:ring-2 focus-within:ring-[#DC2626]"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
              }}
            >
              <Lock size={16} style={{ color: "var(--color-text-muted)" }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm font-medium outline-none"
                style={{ color: "var(--color-text)" }}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 min-h-[48px] rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-[#DC2626] text-white hover:bg-[#b91c1c] active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-red-600/20 disabled:opacity-60"
          >
            {loading ? (
              <span>Cargando…</span>
            ) : mode === "login" ? (
              <>
                <span>Acceder a mi Espacio</span>
                <ArrowRight size={16} />
              </>
            ) : (
              <>
                <span>Crear mi Cuenta Privada</span>
                <Sparkles size={16} />
              </>
            )}
          </button>
          {mode === "login" && (
            <button
              type="button"
              onClick={handleQuickLoginDaniel}
              disabled={loading}
              className="w-full mt-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer opacity-80 hover:opacity-100"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px dashed var(--color-border)",
                color: "var(--color-text-muted)",
              }}
            >
              <span>⚡ Acceso Rápido Daniel Espinosa (Propietario)</span>
            </button>
          )}
        </form>

        {/* Garantía de Aislamiento y Privacidad */}
        <div
          className="p-3 rounded-2xl flex items-center gap-2.5 text-[11px]"
          style={{
            background: "var(--color-surface-raised)",
            color: "var(--color-text-muted)",
          }}
        >
          <ShieldCheck size={16} className="text-[#DC2626] shrink-0" />
          <span>Espacio personal blindado con Supabase Row Level Security (RLS). Cero acceso cruzado a datos de otros atletas.</span>
        </div>
      </div>
    </div>
  );
}
