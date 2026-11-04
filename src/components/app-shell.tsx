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
  Trophy,
  BarChart3,
  Crown,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PushNotificationBanner } from "@/components/push/push-notification-banner";
import { ReportNotificationBanner } from "@/components/report-notification-banner";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { haptics } from "@/lib/haptics";

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
      { href: "/", label: "Métricas & Carga", icon: Activity },
      { href: "/marcas", label: "Pesos & Marcas", icon: Trophy, aliases: ["/gimnasio"] },
      { href: "/menu", label: "Nutrición", icon: UtensilsCrossed },
    ],
  },
  {
    title: "Análisis & Coach",
    links: [
      { href: "/entrenador", label: "Entrenador IA", icon: Bot, aliases: ["/recomendaciones"] },
      { href: "/informe-semanal", label: "Informe Semanal", icon: BarChart3 },
      { href: "/progreso", label: "Progreso Histórico", icon: TrendingUp, aliases: ["/objetivos"] },
    ],
  },
  {
    title: "Ajustes",
    links: [
      { href: "/configuracion", label: "Configuración", icon: Settings },
      { href: "/precios", label: "Planes & Pro", icon: Crown, aliases: ["/landing"] },
    ],
  },
];

const BOTTOM_NAV: NavItemDef[] = [
  { href: "/hoy", label: "Hoy", icon: Sun },
  { href: "/plan-semanal", label: "Plan", icon: CalendarRange, aliases: ["/calendario"] },
  { href: "/", label: "Métricas", icon: Activity, aliases: ["/progreso", "/objetivos"] },
  { href: "/marcas", label: "Pesos", icon: Trophy, aliases: ["/gimnasio"] },
  { href: "/menu", label: "Nutrición", icon: UtensilsCrossed },
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
      : pathname === "/marcas" || pathname === "/gimnasio"
      ? { label: "Pesos & Marcas" }
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
      {/* Sidebar — Escritorio: FIJO de arriba a abajo (top: 0, bottom: 0) para que NUNCA se corte al hacer scroll */}
      <aside
        className={`hidden md:flex border-r border-white/10 bg-[#0a0d16] fixed inset-y-0 left-0 z-30 flex-col overflow-hidden transition-all duration-200 ${
          sidebarCollapsed ? "w-0 invisible pointer-events-none" : "w-64 visible"
        }`}
        style={{
          width: sidebarCollapsed ? 0 : 256,
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

          {/* Footer del sidebar estilo El Míster — anclado abajo y flex-shrink: 0 */}
          <div
            className="flex-shrink-0 border-t border-white/10 bg-slate-950/70"
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

            {/* Fila de controles compactos: Refrescar + Notificaciones + Tema */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={triggerGlobalRefresh}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/10 transition-colors"
                title="Refrescar métricas, cargas y consejos"
              >
                <RefreshCw size={13} className={isGlobalRefreshing ? "animate-spin text-emerald-400" : "text-slate-400"} />
                <span className="truncate">{isGlobalRefreshing ? "Actualizando..." : "Refrescar"}</span>
              </button>
              <NotificationCenter variant="icon" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Topbar móvil nativo estilo Apple Navigation Bar con Glassmorphism */}
      <div className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 40 }}>
        <div
          className="ios-glass border-b border-white/10"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "calc(var(--space-2) + env(safe-area-inset-top, 0px)) var(--space-3) var(--space-2)",
            minHeight: "calc(52px + env(safe-area-inset-top, 0px))",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              className="btn btn-ghost btn-icon ios-press"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              onClick={() => {
                haptics.selection();
                setMobileOpen((v) => !v);
              }}
              style={{ width: 38, height: 38, minWidth: 38, borderRadius: "50%" }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link
              href="/hoy"
              onClick={() => haptics.light()}
              className="relative flex-shrink-0 ios-press"
              title="Ir a Hoy"
            >
              <Image src="/brand/logo-mark.png" alt="" width={28} height={28} className="rounded-lg shadow-sm" />
            </Link>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm leading-tight truncate text-white" style={{ letterSpacing: "-0.015em" }}>
                {current?.label ?? "Hoy"}
              </span>
              <span className="text-[11px] text-[#8e8e93] leading-tight truncate">
                Daniel Espinosa · Maratón {raceDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <NotificationCenter variant="icon" />
            <button
              onClick={() => {
                haptics.medium();
                triggerGlobalRefresh();
              }}
              className="btn btn-ghost btn-icon ios-press"
              aria-label="Refrescar datos"
              title="Refrescar métricas y consejos"
              style={{ width: 38, height: 38, minWidth: 38, borderRadius: "50%" }}
            >
              <RefreshCw size={17} className={isGlobalRefreshing ? "animate-spin text-[#00e599]" : "text-slate-400"} />
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

      {/* Barra de navegación inferior nativa iOS (Apple Human Interface Guidelines) */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          pointerEvents: "auto",
        }}
      >
        <nav
          className="ios-glass"
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
            paddingTop: "6px",
            paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
            display: "grid",
            gridTemplateColumns: `repeat(${BOTTOM_NAV.length}, 1fr)`,
            alignItems: "center",
          }}
        >
          {BOTTOM_NAV.map((item) => {
            const active = pathname === item.href || (item.aliases?.includes(pathname) ?? false);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => haptics.selection()}
                aria-current={active ? "page" : undefined}
                className="ios-press flex flex-col items-center justify-center gap-1 py-1 no-underline relative select-none"
                style={{
                  minHeight: 48,
                }}
              >
                <div className="relative">
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 1.7}
                    className={active ? "text-[#00e599]" : "text-slate-400"}
                  />
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: -4,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        backgroundColor: "#00e599",
                        boxShadow: "0 0 8px #00e599",
                      }}
                    />
                  )}
                </div>
                <span
                  className="text-[10px] leading-none truncate max-w-full tracking-tight"
                  style={{
                    color: active ? "#00e599" : "#94a3b8",
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
      <main
        className={`flex-1 min-w-0 transition-[margin] duration-200 ${
          sidebarCollapsed ? "md:ml-0" : "md:ml-64"
        }`}
        style={{ flex: 1, minWidth: 0 }}
      >
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
          <ReportNotificationBanner />
          {children}
          {/* Espaciador de seguridad para garantizar que nada se corte por abajo con la Tab Bar iOS */}
          <div className="md:hidden" style={{ height: "calc(80px + env(safe-area-inset-bottom, 20px))" }} />
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
