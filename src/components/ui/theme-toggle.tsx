"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({
  className = "",
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentTheme = document.documentElement.getAttribute("data-theme") as "light" | "dark" | null;
    if (currentTheme) {
      setTheme(currentTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("entrenoapp_theme", nextTheme);
    } catch {
      // Ignorar error de acceso a storage
    }
  };

  if (!mounted) {
    return (
      <button
        type="button"
        className={`btn btn-ghost btn-icon ${className}`}
        aria-label="Cambiar tema"
        style={{ width: showLabel ? "auto" : 40, height: 40 }}
      >
        <div style={{ width: 18, height: 18 }} />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`btn btn-ghost ${showLabel ? "" : "btn-icon"} ${className}`}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-2)",
        minHeight: 40,
        minWidth: showLabel ? "auto" : 40,
        padding: showLabel ? "0.4rem 0.75rem" : "0.5rem",
        borderRadius: "var(--radius-md)",
        color: "var(--color-text-muted)",
        transition: "color var(--duration-fast) var(--ease), background var(--duration-fast) var(--ease)",
      }}
    >
      {isDark ? (
        <Sun size={18} className="text-warning" strokeWidth={2} />
      ) : (
        <Moon size={18} className="text-brand" strokeWidth={2} />
      )}
      {showLabel && (
        <span style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}>
          {isDark ? "Modo Claro" : "Modo Oscuro"}
        </span>
      )}
    </button>
  );
}
