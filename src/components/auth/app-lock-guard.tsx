"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Lock, Delete, Eye, EyeOff, ShieldCheck, ArrowRight, X } from "lucide-react";
import { EntrenoLogo } from "@/components/brand/entreno-logo";
import {
  isAppLockEnabled,
  getAppLockType,
  isSessionUnlocked,
  unlockSession,
  verifyAppLock,
  LockType,
} from "@/lib/security";
import { haptics } from "@/lib/haptics";

const KEYPAD_LETTERS: Record<string, string> = {
  "1": "",
  "2": "A B C",
  "3": "D E F",
  "4": "G H I",
  "5": "J K L",
  "6": "M N O",
  "7": "P Q R S",
  "8": "T U V",
  "9": "W X Y Z",
  "0": "+",
};

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

    // Animación de entrada dinámica: dura 0.8s y luego se desvanece suavemente
    const splashTimer = setTimeout(() => {
      setSplashFading(true);
      setTimeout(() => {
        setShowSplash(false);
      }, 300);
    }, 700);

    return () => {
      window.removeEventListener("entrenoapp:security_changed", handleSecChange);
      window.removeEventListener("entrenoapp:lock", handleLock);
      clearTimeout(splashTimer);
    };
  }, [checkSecurityState]);

  // 2. Validación de PIN o Contraseña
  const triggerError = (msg: string) => {
    haptics.error();
    setErrorMessage(msg);
    setErrorShake(true);
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
        haptics.success();
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
    haptics.light();
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
      haptics.selection();
      setPinDigits(pinDigits.slice(0, -1));
      setErrorMessage("");
    }
  };

  const handlePinClear = () => {
    haptics.medium();
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
            backgroundColor: "var(--color-bg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "calc(var(--space-4) + env(safe-area-inset-top, 0px)) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom, 0px))",
            userSelect: "none",
          }}
        >
          <div
            className={`flex flex-col items-center max-w-sm w-full animate-in ${errorShake ? "shake-anim" : ""}`}
            style={{
              padding: "var(--space-6) var(--space-5)",
              backgroundColor: "var(--color-surface)",
              borderRadius: "24px",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {/* Logo de la aplicación con icono de candado */}
            <div
              style={{
                position: "relative",
                width: 68,
                height: 68,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "var(--space-3)",
              }}
            >
              <EntrenoLogo size={64} />
              <div
                style={{
                  position: "absolute",
                  bottom: -4,
                  right: -4,
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-brand)",
                  border: "1px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={13} strokeWidth={2.5} />
              </div>
            </div>

            <div className="font-bold text-xl text-white" style={{ letterSpacing: "-0.02em" }}>
              EntrenoApp
            </div>
            <div className="text-xs text-slate-400" style={{ marginBottom: "var(--space-5)" }}>
              {lockType === "pin" ? "Introduce tu código de acceso" : "Introduce tu contraseña"}
            </div>

            {/* MODO A: PIN NUMÉRICO NATIVO iOS */}
            {lockType === "pin" && (
              <div className="flex flex-col items-center w-full">
                {/* Indicadores de puntos (Dots) */}
                <div
                  className="flex items-center justify-center gap-3.5"
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
                          backgroundColor: filled ? "#30d158" : "rgba(255, 255, 255, 0.15)",
                          border: `2px solid ${filled ? "#30d158" : "rgba(255, 255, 255, 0.3)"}`,
                          boxShadow: filled ? "0 0 14px rgba(48, 209, 88, 0.7)" : "none",
                          transform: filled ? "scale(1.15)" : "scale(1)",
                          transition: "all 0.15s cubic-bezier(0.2, 0.9, 0.2, 1)",
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
                    color: "var(--color-danger, #ff453a)",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  {errorMessage}
                </div>

                {/* Teclado Numérico Táctil iOS HIG con Subtítulos */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "14px",
                    width: "100%",
                    maxWidth: 270,
                  }}
                >
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handlePinDigit(d)}
                      className="keypad-btn ios-press"
                      disabled={isVerifying}
                    >
                      <span className="keypad-num">{d}</span>
                      {KEYPAD_LETTERS[d] ? (
                        <span className="keypad-letters">{KEYPAD_LETTERS[d]}</span>
                      ) : (
                        <span className="keypad-letters-spacer" />
                      )}
                    </button>
                  ))}

                  {/* Fila inferior: Limpiar, 0, Borrar */}
                  <button
                    type="button"
                    onClick={handlePinClear}
                    className="keypad-btn-secondary ios-press"
                    title="Limpiar"
                    disabled={isVerifying || pinDigits.length === 0}
                  >
                    <X size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePinDigit("0")}
                    className="keypad-btn ios-press"
                    disabled={isVerifying}
                  >
                    <span className="keypad-num">0</span>
                    <span className="keypad-letters-spacer" />
                  </button>

                  <button
                    type="button"
                    onClick={handlePinBackspace}
                    className="keypad-btn-secondary ios-press"
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

            {/* Acceso directo sin bloqueo para que nunca se quede bloqueada la app */}
            <button
              type="button"
              onClick={() => {
                haptics.success();
                unlockSession();
                setLocked(false);
              }}
              className="mt-4 text-xs text-slate-400 hover:text-white transition-colors underline py-2 cursor-pointer"
            >
              Entrar directamente a la app
            </button>
          </div>
        </div>
      )}

      {/* Entrada Dinámica (Splash Screen Limpia Rojo & Blanco) */}
      {showSplash && (
        <div
          onClick={() => setShowSplash(false)}
          title="Toca para entrar"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "var(--color-bg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "calc(var(--space-4) + env(safe-area-inset-top, 0px)) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom, 0px))",
            opacity: splashFading ? 0 : 1,
            transform: splashFading ? "scale(1.03)" : "scale(1)",
            transition: "opacity 0.35s cubic-bezier(0.2, 0.9, 0.2, 1), transform 0.35s cubic-bezier(0.2, 0.9, 0.2, 1)",
            pointerEvents: splashFading ? "none" : "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "var(--space-4)",
            }}
          >
            <EntrenoLogo size={88} />
          </div>

          <div
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--color-text)",
              marginBottom: 4,
              textAlign: "center",
            }}
          >
            EntrenoApp
          </div>

          <div
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-muted)",
              fontWeight: 500,
              letterSpacing: "0.01em",
              textAlign: "center",
              marginBottom: "var(--space-5)",
            }}
          >
            Alto Rendimiento & Salud · Daniel Espinosa
          </div>

          {/* Barra de progreso de carga sutil estilo iOS */}
          <div
            style={{
              width: 140,
              height: 3,
              backgroundColor: "rgba(255, 255, 255, 0.12)",
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
                backgroundColor: "#30d158",
                borderRadius: 999,
                animation: "splashLoading 1.1s infinite ease-in-out",
                boxShadow: "0 0 10px rgba(48, 209, 88, 0.8)",
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
            box-shadow: 0 0 35px rgba(48, 209, 88, 0.25);
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 0 55px rgba(48, 209, 88, 0.55);
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
          height: 64px;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          color: #ffffff;
          background-color: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
          -webkit-tap-highlight-color: transparent;
          transition: background-color 0.12s, transform 0.1s cubic-bezier(0.2, 0.9, 0.2, 1);
        }

        .keypad-btn .keypad-num {
          font-size: 1.45rem;
          font-weight: 700;
          line-height: 1;
        }

        .keypad-btn .keypad-letters {
          font-size: 0.58rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 2px;
          line-height: 1;
        }

        .keypad-btn .keypad-letters-spacer {
          height: 9px;
        }

        .keypad-btn:active {
          background-color: rgba(48, 209, 88, 0.35);
          border-color: #30d158;
          transform: scale(0.92);
        }

        .keypad-btn-secondary {
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justifyContent: center;
          color: #8e8e93;
          background-color: transparent;
          border: none;
          cursor: pointer;
          user-select: none;
          -webkit-user-select: none;
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
