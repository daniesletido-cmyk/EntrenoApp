"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError] Error global capturado:", error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ margin: 0, padding: "20px", background: "#09090b", color: "#f4f4f5", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "24px", padding: "28px", maxWidth: "380px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "16px", background: "rgba(220, 38, 38, 0.15)", color: "#dc2626", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
            ⚠️
          </div>
          <h1 style={{ fontSize: "18px", margin: "0 0 8px", color: "#f4f4f5", fontWeight: 800 }}>
            EntrenoApp
          </h1>
          <p style={{ fontSize: "13px", color: "#a1a1aa", margin: "0 0 20px", lineHeight: 1.5 }}>
            La aplicación ha detectado un error al cargar. Pulsa el botón para recargar de forma segura.
          </p>
          <div style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
            <button
              onClick={() => reset()}
              style={{ background: "#dc2626", color: "white", border: "none", borderRadius: "12px", padding: "12px 18px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}
            >
              Reintentar
            </button>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/hoy";
                }
              }}
              style={{ background: "#27272a", color: "#e4e4e7", border: "none", borderRadius: "12px", padding: "12px 18px", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
            >
              Ir a Hoy
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
