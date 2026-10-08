"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Lock, Delete, Eye, EyeOff, ShieldCheck, ArrowRight, X } from "lucide-react";
import {
  isAppLockEnabled,
  getAppLockType,
  isSessionUnlocked,
  unlockSession,
  verifyAppLock,
  LockType,
} from "@/lib/security";

export function AppLockGuard({ children }: { children: React.ReactNode }) {
  // Estado de la entrada dinámica (Splash screen)
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  // Estado del bloqueo de seguridad
  const [locked, setLocked] = useState(false);
  const [lockType, setLockType] = useState<LockType>("pin");

  // Entrada de datos del usuario
  const [pinDigits, setPinDigits] = useState<string>("");
  const [passwordValue, setPasswordValue] = useState("");
  const [showPasswordText, setShowPasswordText] = useState(false);

  // Feedback y errores
  const [errorShake, setErrorShake] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // 1. Inicialización y chequeo de seguridad
  const checkSecurityState = useCallback(() => {
    const enabled = isAppLockEnabled();
    const type = getAppLockType();
    setLockType(type);

    if (enabled && !isSessionUnlocked()) {
      setLocked(true);
    } else {
      setLocked(false);
    }
  }, []);

  useEffect(() => {
    checkSecurityState();

    // Eventos personalizados para cambio de seguridad o bloqueo manual
    const handleSecChange = () => checkSecurityState();
    const handleLock = () => {
      setPinDigits("");
      setPasswordValue("");
      setErrorMessage("");
      setLocked(true);
    };

    window.addEventListener("entrenoapp:security_changed", handleSecChange);
    window.addEventListener("entrenoapp:lock", handleLock);

    // Animación de entrada dinámica: dura 1.1s y luego se desvanece suavemente
    const splashTimer = setTimeout(() => {
      setSplashFading(true);
      setTimeout(() => {
        setShowSplash(false);
      }, 450);
    }, 1100);

    // Fallback de seguridad incondicional (especialmente útil en Safari standalone / iOS)
    const safetyTimer = setTimeout(() => {
      setShowSplash(false);
      setSplashFading(false);
    }, 2500);

    return () => {
      window.removeEventListener("entrenoapp:security_changed", handleSecChange);
      window.removeEventListener("entrenoapp:lock", handleLock);
      clearTimeout(splashTimer);
      clearTimeout(safetyTimer);
    };
  }, [checkSecurityState]);

  // 2. Validación de PIN o Contraseña
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setErrorShake(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    setTimeout(() => {
      setErrorShake(false);
      setPinDigits("");
    }, 600);
  };

  const handleVerify = async (secretToTest: string) => {
    if (!secretToTest.trim() || isVerifying) return;
    setIsVerifying(true);
    setErrorMessage("");

    try {
      const isValid = await verifyAppLock(secretToTest);
      if (isValid) {
        unlockSession();
        setLocked(false);
        setPinDigits("");
        setPasswordValue("");
        setErrorMessage("");
      } else {
        triggerError(lockType === "pin" ? "PIN incorrecto" : "Contraseña incorrecta");
      }
    } catch {
      triggerError("Error al verificar");
    } finally {
      setIsVerifying(false);
    }
  };

  // 3. Manejo de teclado numérico táctil para PIN
  const handlePinDigit = (digit: string) => {
    if (pinDigits.length >= 6 || isVerifying) return;
    const next = pinDigits + digit;
    setPinDigits(next);
    setErrorMessage("");

    // Si alcanza 4 o 6 dígitos, verificamos automáticamente
    if (next.length === 4 || next.length === 6) {
      handleVerify(next);
    }
  };

  const handlePinBackspace = () => {
    if (pinDigits.length > 0) {
      setPinDigits(pinDigits.slice(0, -1));
      setErrorMessage("");
    }
  };

  const handlePinClear = () => {
    setPinDigits("");
    setErrorMessage("");
  };

  // 4. Captura de teclas físicas en escritorio o teclado externo
  useEffect(() => {
    if (!locked || showSplash) return;

    function onKeyDown(e: KeyboardEvent) {
      if (lockType === "pin") {
        if (/^[0-9]$/.test(e.key)) {
          handlePinDigit(e.key);
        } else if (e.key === "Backspace") {
          handlePinBackspace();
        } else if (e.key === "Escape") {
          handlePinClear();
        }
      } else if (lockType === "password") {
        if (e.key === "Enter") {
          handleVerify(passwordValue);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [locked, showSplash, lockType, pinDigits, passwordValue]);

  return (
    <>
      {/* Contenido de la Aplicación (Oculto detrás de la pantalla de bloqueo si está bloqueada) */}
      <div style={{ visibility: locked ? "hidden" : "visible" }}>
        {children}
      </div>

      {/* Pantalla de Bloqueo por PIN / Contraseña */}
      {locked && !showSplash && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99990,
            backgroundColor: "#070b14",
            backgroundImage: "radial-gradient(ellipse at 50% 15%, rgba(59, 130, 246, 0.15) 0%, rgba(7, 11, 20, 1) 70%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-4)",
            userSelect: "none",
          }}
        >
          <div
            className={`flex flex-col items-center max-w-sm w-full animate-in ${errorShake ? "shake-anim" : ""}`}
            style={{
              padding: "var(--space-5)",
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: "var(--radius-xl, 20px)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
            }}
          >
            {/* Logo de la aplicación con icono de candado */}
            <div
              style={{
                position: "relative",
                width: 72,
                height: 72,
                borderRadius: "20px",
                padding: 4,
                background: "linear-gradient(135deg, rgba(59, 130, 246, 0.4), rgba(30, 41, 59, 0.8))",
                boxShadow: "0 8px 24px rgba(59, 130, 246, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "var(--space-3)",
              }}
            >
              <Image
                src="/brand/logo-mark.png"
                alt="EntrenoApp"
                width={56}
                height={56}
                className="rounded-xl"
                priority
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -4,
                  right: -4,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-brand)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}
              >
                <Lock size={13} />
              </div>
            </div>

            <div className="font-bold text-lg" style={{ letterSpacing: "-0.02em" }}>
              EntrenoApp
            </div>
            <div className="text-xs text-muted" style={{ marginBottom: "var(--space-4)" }}>
              {lockType === "pin" ? "Introduce tu PIN de acceso" : "Introduce tu contraseña"}
            </div>

            {/* MODO A: PIN NUMÉRICO */}
            {lockType === "pin" && (
              <div className="flex flex-col items-center w-full">
                {/* Indicadores de puntos (Dots) */}
                <div
                  className="flex items-center justify-center gap-3"
                  style={{
                    marginBottom: "var(--space-5)",
                    height: 28,
                  }}
                >
                  {Array.from({ length: 4 }).map((_, i) => {
                    const filled = i < pinDigits.length;
                    return (
                      <div
                        key={i}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          backgroundColor: filled ? "var(--color-brand)" : "rgba(255, 255, 255, 0.15)",
                          border: `2px solid ${filled ? "var(--color-brand)" : "rgba(255, 255, 255, 0.3)"}`,
                          boxShadow: filled ? "0 0 12px rgba(59, 130, 246, 0.6)" : "none",
                          transform: filled ? "scale(1.15)" : "scale(1)",
                          transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                        }}
                      />
                    );
                  })}
                </div>

                {/* Mensaje de Error */}
                <div
                  style={{
                    height: 20,
                    marginBottom: "var(--space-3)",
                    color: "var(--color-danger, #ef4444)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {errorMessage}
                </div>

                {/* Teclado Numérico Táctil Optimizado para Móvil */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "12px",
                    width: "100%",
                    maxWidth: 270,
                  }}
                >
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handlePinDigit(d)}
                      className="keypad-btn"
                      disabled={isVerifying}
                    >
                      {d}
                    </button>
                  ))}

                  {/* Fila inferior: Limpiar, 0, Borrar */}
                  <button
                    type="button"
                    onClick={handlePinClear}
                    className="keypad-btn-secondary"
                    title="Limpiar"
                    disabled={isVerifying || pinDigits.length === 0}
                  >
                    <X size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePinDigit("0")}
                    className="keypad-btn"
                    disabled={isVerifying}
                  >
                    0
                  </button>

                  <button
                    type="button"
                    onClick={handlePinBackspace}
                    className="keypad-btn-secondary"
                    title="Borrar"
                    disabled={isVerifying || pinDigits.length === 0}
                  >
                    <Delete size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* MODO B: CONTRASEÑA ALFANUMÉRICA */}
            {lockType === "password" && (
              <div className="flex flex-col items-center w-full gap-3">
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type={showPasswordText ? "text" : "password"}
                    value={passwordValue}
                    onChange={(e) => {
                      setPasswordValue(e.target.value);
                      setErrorMessage("");
                    }}
                    placeholder="Contraseña"
                    className="input"
                    autoFocus
                    style={{
                      width: "100%",
                      paddingRight: "40px",
                      fontSize: "1rem",
                      height: "46px",
                      textAlign: "center",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="btn btn-ghost"
                    style={{
                      position: "absolute",
                      right: 4,
                      top: 4,
                      bottom: 4,
                      width: 36,
                      height: 36,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={showPasswordText ? "Ocultar" : "Mostrar"}
                  >
                    {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {errorMessage && (
                  <div
                    style={{
                      color: "var(--color-danger, #ef4444)",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                  >
                    {errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleVerify(passwordValue)}
                  className="btn btn-primary w-full"
                  disabled={!passwordValue.trim() || isVerifying}
                  style={{ height: 44, marginTop: 6 }}
                >
                  <span>{isVerifying ? "Verificando..." : "Desbloquear"}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Entrada Dinámica (Splash Screen Animada al Abrir la App) */}
      {showSplash && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "#060911",
            backgroundImage: "radial-gradient(ellipse at 50% 35%, rgba(59, 130, 246, 0.22) 0%, rgba(6, 9, 17, 1) 75%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: splashFading ? 0 : 1,
            transform: splashFading ? "scale(1.04)" : "scale(1)",
            transition: "opacity 0.45s cubic-bezier(0.4, 0, 0.2, 1), transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: splashFading ? "none" : "auto",
          }}
        >
          {/* Logo animado con efecto pulso */}
          <div
            style={{
              position: "relative",
              width: 100,
              height: 100,
              borderRadius: "28px",
              padding: 6,
              background: "linear-gradient(135deg, rgba(59, 130, 246, 0.6) 0%, rgba(37, 99, 235, 0.15) 100%)",
              boxShadow: "0 0 50px rgba(59, 130, 246, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "var(--space-4)",
              animation: "splashPulse 2s infinite ease-in-out",
            }}
          >
            <Image
              src="/brand/logo-mark.png"
              alt="EntrenoApp Logo"
              width={82}
              height={82}
              className="rounded-2xl"
              priority
            />
          </div>

          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              marginBottom: 4,
              textAlign: "center",
            }}
          >
            EntrenoApp
          </div>

          <div
            style={{
              fontSize: "0.85rem",
              color: "rgba(255, 255, 255, 0.6)",
              fontWeight: 500,
              letterSpacing: "0.02em",
              textAlign: "center",
              marginBottom: "var(--space-5)",
            }}
          >
            Diseñada por Daniel Espinosa
          </div>

          {/* Barra de progreso de carga sutil */}
          <div
            style={{
              width: 140,
              height: 3,
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              borderRadius: 999,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "45%",
                backgroundColor: "var(--color-brand, #3b82f6)",
                borderRadius: 999,
                animation: "splashLoading 1.1s infinite ease-in-out",
                boxShadow: "0 0 10px rgba(59, 130, 246, 0.8)",
              }}
            />
          </div>
        </div>
      )}

      {/* Estilos CSS inline para animaciones de la entrada y teclado numérico */}
      <style jsx global>{`
        @keyframes splashPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 35px rgba(59, 130, 246, 0.35);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 55px rgba(59, 130, 246, 0.65);
          }
        }

        @keyframes splashLoading {
          0% {
            left: -40%;
          }
          50% {
            left: 30%;
          }
          100% {
            left: 100%;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }

        .shake-anim {
          animation: shake 0.4s ease-in-out;
        }

        .keypad-btn {
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          background-color: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          transition: background-color 0.1s, transform 0.1s;
        }

        .keypad-btn:active {
          background-color: var(--color-brand, #3b82f6);
          transform: scale(0.92);
        }

        .keypad-btn-secondary {
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted, #94a3b8);
          background-color: transparent;
          border: none;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.15s, transform 0.1s;
        }

        .keypad-btn-secondary:active:not(:disabled) {
          color: #ffffff;
          transform: scale(0.9);
        }

        .keypad-btn-secondary:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
