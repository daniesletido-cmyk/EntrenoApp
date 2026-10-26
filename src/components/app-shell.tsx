"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
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
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  aliases?: string[];
}

const NAV_GROUPS: { title: string; links: NavItemDef[] }[] = [
  {
    title: "Principal",
    links: [
      { href: "/hoy", label: "Hoy", icon: Sun },
      { href: "/plan-semanal", label: "Planificación", icon: CalendarRange, aliases: ["/calendario"] },
      { href: "/gimnasio", label: "Gimnasio & Box", icon: Dumbbell },
      { href: "/registro", label: "Registrar entreno", icon: ClipboardList },
    ],
  },
  {
    title: "Rendimiento",
    links: [
      { href: "/progreso", label: "Progreso & Objetivos", icon: TrendingUp, aliases: ["/objetivos"] },
      { href: "/entrenador", label: "Entrenador IA", icon: Bot, aliases: ["/recomendaciones"] },
      { href: "/", label: "Resumen Semanal", icon: LayoutDashboard },
    ],
  },
  {
    title: "Más",
    links: [
      { href: "/menu", label: "Nutrición", icon: UtensilsCrossed },
      { href: "/configuracion", label: "Configuración", icon: Settings },
    ],
  },
];

const BOTTOM_NAV: NavItemDef[] = [
  { href: "/hoy", label: "Hoy", icon: Sun },
  { href: "/plan-semanal", label: "Plan", icon: CalendarRange, aliases: ["/calendario"] },
  { href: "/gimnasio", label: "Gimnasio", icon: Dumbbell },
  { href: "/progreso", label: "Progreso", icon: TrendingUp, aliases: ["/objetivos"] },
  { href: "/entrenador", label: "Entrenador", icon: Bot, aliases: ["/recomendaciones"] },
];

const LINKS = NAV_GROUPS.flatMap((g) => g.links);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [raceDate, setRaceDate] = useState("26/04/2027");
  const current =
    LINKS.find((l) => l.href === pathname) ??
    LINKS.find((l) => l.aliases?.includes(pathname)) ??
    (pathname === "/calendario"
      ? { label: "Calendario" }
      : pathname === "/objetivos"
      ? { label: "Objetivos" }
      : pathname === "/detalle"
      ? { label: "Detalle Entreno" }
      : pathname === "/recomendaciones"
      ? { label: "Recomendaciones" }
      : undefined);

  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("entrenoapp_sidebar_collapsed");
      if (saved !== null) {
        setSidebarCollapsed(saved === "true");
      }
    } catch {}
  }, []);

  const toggleSidebar = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try {
      localStorage.setItem("entrenoapp_sidebar_collapsed", String(collapsed));
    } catch {}
  };

  const triggerGlobalRefresh = () => {
    setIsGlobalRefreshing(true);
    window.dispatchEvent(new CustomEvent("entrenoapp:refresh"));
    router.refresh();
    setTimeout(() => setIsGlobalRefreshing(false), 900);
  };

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
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      {/* Sidebar — Escritorio */}
      <aside
        className="hidden md:flex border-r border-white/10 bg-slate-950/95"
        style={{
          width: sidebarCollapsed ? 0 : 256,
          flexShrink: 0,
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          maxHeight: "100vh",
          overflow: "hidden",
          transition: "width 0.22s var(--ease), border-color var(--duration-base) var(--ease), background-color var(--duration-base) var(--ease)",
          visibility: sidebarCollapsed ? "hidden" : "visible",
        }}
      >
        <div style={{ width: 256, height: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <Brand onCollapse={() => toggleSidebar(true)} />
          <nav
            style={{
              padding: "10px 10px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              flex: "1 1 0%",
              minHeight: 0,
              overflowY: "auto",
            }}
          >
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <div
                  className="text-slate-400 font-extrabold uppercase tracking-widest"
                  style={{
                    fontSize: "0.68rem",
                    letterSpacing: "0.08em",
                    padding: "0 0.75rem",
                    marginBottom: 4,
                  }}
                >
                  {group.title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {group.links.map((l) => (
                    <NavItem
                      key={l.href}
                      href={l.href}
                      label={l.label}
                      Icon={l.icon}
                      active={pathname === l.href || (l.aliases?.includes(pathname) ?? false)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer del sidebar estilo El Míster — flex-shrink: 0 para que NUNCA se corte */}
          <div
            className="flex-shrink-0 border-t border-white/10 bg-slate-950/60"
            style={{
              padding: "12px 14px calc(14px + env(safe-area-inset-bottom, 0px))",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {/* Card de atleta con initials avatar y glowing dot */}
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all duration-150">
              <div className="relative w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-400 flex-shrink-0">
                DE
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 brand-dot-glow" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-100 truncate leading-tight">
                  Daniel Espinosa
                </div>
                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                  <span>Maratón</span>
                  <span className="text-slate-600">·</span>
                  <span className="font-mono tabular-nums text-emerald-400 font-medium">{raceDate}</span>
                </div>
              </div>
            </div>

            {/* Fila de controles compactos: Refrescar + Tema */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={triggerGlobalRefresh}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 transition-colors"
                title="Refrescar métricas, cargas y consejos"
              >
                <RefreshCw size={13} className={isGlobalRefreshing ? "animate-spin text-emerald-400" : "text-slate-400"} />
                <span className="truncate">{isGlobalRefreshing ? "Actualizando..." : "Refrescar"}</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Topbar móvil */}
      <div className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 40 }}>
        <div
          className="backdrop-blur-md bg-slate-950/80 border-b border-white/10"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "calc(var(--space-2) + env(safe-area-inset-top, 0px)) var(--space-3) var(--space-2)",
            minHeight: 52,
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              className="btn btn-ghost btn-icon"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              style={{ width: 38, height: 38, minWidth: 38 }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href="/hoy" className="relative flex-shrink-0" title="Ir a Hoy">
              <Image src="/brand/logo-mark.png" alt="" width={26} height={26} className="rounded-md" />
            </Link>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm leading-tight truncate text-foreground" style={{ letterSpacing: "-0.01em" }}>
                {current?.label ?? "Hoy"}
              </span>
              <span className="text-[11px] text-muted leading-tight truncate">
                Daniel Espinosa · Maratón {raceDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={triggerGlobalRefresh}
              className="btn btn-ghost btn-icon"
              aria-label="Refrescar datos"
              title="Refrescar métricas y consejos"
              style={{ width: 38, height: 38, minWidth: 38, borderRadius: "50%" }}
            >
              <RefreshCw size={17} className={isGlobalRefreshing ? "animate-spin text-primary" : "text-muted"} />
            </button>
            <ThemeToggle />
          </div>
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
              className="animate-in backdrop-blur-md bg-slate-950/95 border-b border-white/10 shadow-2xl"
              style={{
                padding: "var(--space-3) var(--space-2)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-3)",
                maxHeight: "calc(100vh - 120px)",
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
                      <NavItem
                        key={l.href}
                        href={l.href}
                        label={l.label}
                        Icon={l.icon}
                        active={pathname === l.href || (l.aliases?.includes(pathname) ?? false)}
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}
                  </div>
                </div>
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
                  <div className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                    Daniel Espinosa
                  </div>
                  <div className="text-xs text-faint">Maratón · {raceDate}</div>
                </div>
                <ThemeToggle showLabel />
              </div>
            </nav>
          </>
        )}
      </div>

      {/* Barra de navegación inferior móvil flotante estilo Glass Island */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          pointerEvents: "none",
          padding: "0 12px calc(10px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <nav
          className="backdrop-blur-md bg-slate-950/85 border border-white/10 rounded-2xl shadow-2xl p-1.5 grid"
          style={{
            pointerEvents: "auto",
            margin: "0 auto",
            maxWidth: 460,
            gridTemplateColumns: `repeat(${BOTTOM_NAV.length}, 1fr)`,
            gap: "4px",
          }}
        >
          {BOTTOM_NAV.map((item) => {
            const active = pathname === item.href || (item.aliases?.includes(pathname) ?? false);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-[46px] py-1 px-1 rounded-xl transition-colors duration-150 no-underline relative overflow-hidden ${
                  active
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5 font-medium"
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.5 : 1.8} />
                <span
                  className="text-[10px] tracking-tight leading-none truncate max-w-full"
                  style={{
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Área de contenido principal */}
      <main style={{ flex: 1, minWidth: 0 }}>
        {sidebarCollapsed && (
          <button
            onClick={() => toggleSidebar(false)}
            className="btn btn-ghost btn-icon hidden md:flex items-center justify-center animate-in"
            title="Mostrar barra lateral"
            aria-label="Mostrar barra lateral"
            style={{
              position: "fixed",
              top: 14,
              left: 14,
              zIndex: 35,
              width: 34,
              height: 34,
              borderRadius: "var(--radius-sm)",
              background: "var(--color-surface-translucent)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              color: "var(--color-text)",
            }}
          >
            <PanelLeftOpen size={16} />
          </button>
        )}
        <div className="main-content-container">
          <div className="md:hidden" style={{ height: "calc(56px + env(safe-area-inset-top, 0px))" }} />
          {children}
          {/* Espaciador de seguridad para garantizar que nada se corte por abajo */}
          <div className="md:hidden" style={{ height: "calc(100px + env(safe-area-inset-bottom, 24px))" }} />
          <div className="hidden md:block" style={{ height: "48px" }} />
        </div>
      </main>
    </div>
  );
}

function Brand({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <div
      className="flex-shrink-0"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-2)",
        padding: "16px 14px 14px 16px",
        borderBottom: "1px solid var(--color-border)",
        position: "relative",
      }}
    >
      <Link
        href="/hoy"
        className="flex items-center gap-3 min-w-0 flex-1 no-underline text-inherit hover:opacity-90 transition-opacity"
        title="Ir a Hoy"
      >
        <div className="relative flex-shrink-0">
          <Image
            src="/brand/logo-mark.png"
            alt=""
            width={32}
            height={32}
            className="rounded-lg shadow-sm"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 brand-dot-glow" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span style={{ fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.1, letterSpacing: "-0.02em", color: "var(--color-text)" }}>
              ENTRENO
            </span>
            <span
              style={{
                fontSize: "0.62rem",
                padding: "1px 6px",
                borderRadius: "9999px",
                background: "rgba(16, 185, 129, 0.14)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                fontWeight: 800,
                lineHeight: 1.2,
                letterSpacing: "0.04em",
              }}
            >
              PRO
            </span>
          </div>
          <div className="text-xs text-slate-400 truncate flex items-center gap-1" style={{ fontSize: "0.72rem", marginTop: 2 }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Plan Maratón 2027</span>
          </div>
        </div>
      </Link>
      {onCollapse && (
        <button
          onClick={onCollapse}
          className="btn btn-ghost btn-icon"
          title="Ocultar barra lateral"
          aria-label="Ocultar barra lateral"
          style={{
            width: 28,
            height: 28,
            minWidth: 28,
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-muted)",
            padding: 0,
          }}
        >
          <PanelLeftClose size={15} />
        </button>
      )}
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
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 no-underline min-h-[38px] ${
        active
          ? "bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30 shadow-[inset_0_0_12px_rgba(16,185,129,0.08)]"
          : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
      }`}
    >
      <Icon size={17} strokeWidth={active ? 2.3 : 1.8} className={active ? "text-emerald-400" : "text-slate-400"} />
      <span className="truncate">{label}</span>
      {active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 brand-dot-glow flex-shrink-0" />
      )}
    </Link>
  );
}
