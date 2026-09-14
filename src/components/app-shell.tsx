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
} from "lucide-react";

const NAV_GROUPS = [
  {
    title: "Panel",
    links: [
      { href: "/", label: "Resumen", icon: LayoutDashboard },
      { href: "/hoy", label: "Hoy", icon: Sun },
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
    title: "Otros",
    links: [
      { href: "/menu", label: "Menú", icon: UtensilsCrossed },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
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
      {/* Sidebar — escritorio */}
      <aside
        className="hidden md:flex"
        style={{
          width: 248,
          flexShrink: 0,
          borderRight: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <Brand />
        <nav style={{ padding: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-3)", flex: 1, overflowY: "auto" }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div
                className="text-faint"
                style={{
                  fontSize: "0.7rem",
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
        <div className="text-xs text-faint" style={{ padding: "var(--space-4)" }}>
          Maratón · {raceDate}
        </div>
      </aside>

      {/* Topbar + drawer — móvil */}
      <div className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <button
            className="btn btn-ghost btn-icon"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Image src="/brand/logo-mark.png" alt="" width={28} height={28} className="rounded-lg" />
          <span className="font-semibold">{current?.label ?? "EntrenoApp"}</span>
        </div>
        {mobileOpen && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.6)",
                backdropFilter: "blur(2px)",
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
                maxHeight: "calc(100vh - 60px)",
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
            </nav>
          </>
        )}
      </div>

      <main style={{ flex: 1, minWidth: 0 }}>
        <div className="mx-auto" style={{ maxWidth: 1240, padding: "var(--space-8) var(--space-6)" }}>
          <div className="md:hidden" style={{ height: 44 }} />
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
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-4)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(120px 60px at 20% 0%, rgba(47,111,235,0.16), transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={34}
        height={34}
        className="rounded-lg"
        style={{ boxShadow: "0 4px 12px rgba(47,111,235,0.35)", position: "relative" }}
      />
      <div style={{ position: "relative" }}>
        <div style={{ fontWeight: 800, fontSize: "var(--text-base)", lineHeight: 1.1, letterSpacing: "-0.01em" }}>EntrenoApp</div>
        <div className="text-xs text-faint">JavaTec</div>
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
        padding: "0.55rem 0.75rem",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--text-sm)",
        fontWeight: 600,
        color: active ? "var(--color-brand-contrast)" : "var(--color-text-muted)",
        background: active ? "var(--gradient-brand)" : "transparent",
        boxShadow: active ? "0 4px 14px rgba(47, 111, 235, 0.32)" : "none",
        transition: "background var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease)",
        minHeight: 44,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--color-surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}
