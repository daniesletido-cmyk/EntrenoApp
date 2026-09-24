"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarRange,
  Activity,
  TrendingUp,
  Target,
  Calendar,
  UtensilsCrossed,
  Settings,
  Menu,
  X,
  Sun,
  Dumbbell,
  Bot,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const NAV_GROUPS = [
  {
    title: "Panel",
    links: [
      { href: "/", label: "Resumen", icon: LayoutDashboard },
      { href: "/hoy", label: "Hoy", icon: Sun },
      { href: "/entrenador", label: "Entrenador", icon: Bot },
    ],
  },
  {
    title: "Entrenamiento",
    links: [
      { href: "/registro", label: "Registro", icon: ClipboardList },
      { href: "/plan-semanal", label: "Plan semanal", icon: CalendarRange },
      { href: "/gimnasio", label: "Gimnasio", icon: Dumbbell },
      { href: "/calendario", label: "Calendario", icon: Calendar },
      { href: "/recomendaciones", label: "Recomendaciones", icon: Activity },
    ],
  },
  {
    title: "Seguimiento",
    links: [
      { href: "/progreso", label: "Progreso", icon: TrendingUp },
      { href: "/objetivos", label: "Objetivos", icon: Target },
    ],
  },
  {
    title: "Ajustes",
    links: [
      { href: "/menu", label: "Menú", icon: UtensilsCrossed },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

const BOTTOM_NAV = [
  { href: "/", label: "Resumen", icon: LayoutDashboard },
  { href: "/hoy", label: "Hoy", icon: Sun },
  { href: "/entrenador", label: "Entrenador", icon: Bot },
  { href: "/plan-semanal", label: "Plan", icon: CalendarRange },
  { href: "/registro", label: "Registro", icon: ClipboardList },
];

const LINKS = NAV_GROUPS.flatMap((g) => g.links);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [raceDate, setRaceDate] = useState("26/04/2027");
  const current = LINKS.find((l) => l.href === pathname);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const iso = d.settings?.goal_race_date;
        if (iso) {
          const [y, m, day] = iso.split("-");
          if (y && m && day) setRaceDate(`${day}/${m}/${y}`);
        }
      })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar — Escritorio */}
      <aside
        className="hidden md:flex"
        style={{
          width: 240,
          flexShrink: 0,
          borderRight: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          transition: "background-color var(--duration-base) var(--ease), border-color var(--duration-base) var(--ease)",
        }}
      >
        <Brand />
        <nav
          style={{
            padding: "var(--space-3) var(--space-2)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            flex: 1,
            overflowY: "auto",
          }}
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div
                className="text-faint"
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "0 0.75rem",
                  marginBottom: 4,
                }}
              >
                {group.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {group.links.map((l) => (
                  <NavItem key={l.href} href={l.href} label={l.label} Icon={l.icon} active={pathname === l.href} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer del sidebar con selector de tema */}
        <div
          style={{
            padding: "var(--space-3) var(--space-3)",
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Tema visual</span>
            <ThemeToggle />
          </div>
          <div className="text-xs text-faint" style={{ marginTop: 2 }}>
            <div>Maratón · {raceDate}</div>
            <div style={{ color: "var(--color-text-muted)", fontSize: "0.72rem" }}>Daniel Espinosa</div>
          </div>
        </div>
      </aside>

      {/* Topbar móvil */}
      <div className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "calc(var(--space-2) + env(safe-area-inset-top, 0px)) var(--space-3) var(--space-2)",
            background: "var(--color-surface-translucent)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--color-border)",
            minHeight: 52,
          }}
        >
          <div className="flex items-center gap-2">
            <button
              className="btn btn-ghost btn-icon"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              style={{ width: 40, height: 40, minWidth: 40 }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Image src="/brand/logo-mark.png" alt="" width={24} height={24} className="rounded-md" />
            <span className="font-semibold text-sm" style={{ letterSpacing: "-0.01em" }}>
              {current?.label ?? "EntrenoApp"}
            </span>
          </div>

          <ThemeToggle />
        </div>

        {/* Drawer móvil */}
        {mobileOpen && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.45)",
                backdropFilter: "blur(4px)",
                zIndex: -1,
              }}
              aria-hidden="true"
              onClick={() => setMobileOpen(false)}
            />
            <nav
              className="animate-in"
              style={{
                background: "var(--color-surface)",
                borderBottom: "1px solid var(--color-border)",
                padding: "var(--space-2)",
                display: "flex",
                flexDirection: "column",
                gap: 2,
                maxHeight: "calc(100vh - 120px)",
                overflowY: "auto",
                boxShadow: "var(--shadow-md)",
              }}
            >
              {LINKS.map((l) => (
                <NavItem
                  key={l.href}
                  href={l.href}
                  label={l.label}
                  Icon={l.icon}
                  active={pathname === l.href}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
              <div
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  borderTop: "1px solid var(--color-border)",
                  marginTop: "var(--space-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                    EntrenoApp
                  </div>
                  <div className="text-xs text-faint">Maratón · {raceDate}</div>
                </div>
                <ThemeToggle showLabel />
              </div>
            </nav>
          </>
        )}
      </div>

      {/* Barra de navegación inferior móvil (Touch target 44px+) */}
      <nav
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--color-surface-translucent)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: "1px solid var(--color-border)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          zIndex: 45,
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {BOTTOM_NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                minHeight: 52,
                color: active ? "var(--color-brand)" : "var(--color-text-muted)",
                transition: "color var(--duration-fast) var(--ease)",
                textDecoration: "none",
                position: "relative",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 26,
                  borderRadius: "var(--radius-full)",
                  background: active ? "var(--color-brand-subtle)" : "transparent",
                  transition: "background var(--duration-fast) var(--ease)",
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
              </div>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: active ? 600 : 500,
                  letterSpacing: "-0.01em",
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Área de contenido principal */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <div className="main-content-container">
          <div className="md:hidden" style={{ height: "calc(52px + env(safe-area-inset-top, 0px))" }} />
          {children}
        </div>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-4) var(--space-4)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={30}
        height={30}
        className="rounded-lg"
        style={{ flexShrink: 0 }}
      />
      <div>
        <div style={{ fontWeight: 700, fontSize: "var(--text-base)", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          EntrenoApp
        </div>
        <div className="text-xs text-faint">Por Daniel Espinosa</div>
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  Icon,
  active,
  onClick,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "0.5rem 0.75rem",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--text-sm)",
        fontWeight: active ? 600 : 500,
        color: active ? "var(--color-brand)" : "var(--color-text-muted)",
        background: active ? "var(--color-brand-subtle)" : "transparent",
        transition: "background var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease)",
        minHeight: 40,
        textDecoration: "none",
      }}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}
