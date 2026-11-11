"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarRange,
  Activity,
  TrendingUp,
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
  Moon,
  Brain,
  User,
  BookOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ReportNotificationBanner } from "@/components/report-notification-banner";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { haptics } from "@/lib/haptics";

interface NavItemDef {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;
  aliases?: string[];
}

const NAV_GROUPS: { title: string; links: NavItemDef[] }[] = [
  {
    title: "Entrenamiento",
    links: [
      { href: "/hoy", label: "Entrenamientos · Hoy", icon: Sun, aliases: ["/registro", "/detalle"] },
      { href: "/plan-semanal", label: "Plan Semanal", icon: CalendarRange, aliases: ["/calendario"] },
      { href: "/marcas", label: "Biblioteca & Marcas", icon: Dumbbell, aliases: ["/gimnasio"] },
    ],
  },
  {
    title: "Progreso & Salud",
    links: [
      { href: "/", label: "Métricas & Carga", icon: Activity },
      { href: "/sueno", label: "Sueño & Descanso", icon: Moon, aliases: ["/sleep"] },
      { href: "/informe-semanal", label: "Informe Semanal", icon: BarChart3 },
      { href: "/progreso", label: "Progreso Histórico", icon: TrendingUp, aliases: ["/objetivos"] },
    ],
  },
  {
    title: "Coach & Nutrición",
    links: [
      { href: "/menu", label: "Nutrición", icon: UtensilsCrossed },
      { href: "/entrenador", label: "Entrenador IA", icon: Bot, aliases: ["/recomendaciones"] },
      { href: "/psicologia", label: "Psicología Deportiva", icon: Brain, aliases: ["/mental", "/mindset"] },
    ],
  },
  {
    title: "Perfil",
    links: [
      { href: "/configuracion", label: "Perfil & Ajustes", icon: Settings },
      { href: "/precios", label: "Planes & Pro", icon: Crown, aliases: ["/landing"] },
    ],
  },
];

// Barra de navegación inferior Harbiz Mobile-First: Entrenamientos, Biblioteca, Progreso, Perfil
const BOTTOM_NAV: NavItemDef[] = [
  {
    href: "/hoy",
    label: "Entrenos",
    icon: Dumbbell,
    aliases: ["/plan-semanal", "/calendario", "/registro", "/detalle"],
  },
  {
    href: "/marcas",
    label: "Biblioteca",
    icon: BookOpen,
    aliases: ["/gimnasio"],
  },
  {
    href: "/",
    label: "Progreso",
    icon: TrendingUp,
    aliases: ["/progreso", "/informe-semanal", "/sueno", "/objetivos"],
  },
  {
    href: "/configuracion",
    label: "Perfil",
    icon: User,
    aliases: ["/menu", "/entrenador", "/psicologia", "/precios", "/recomendaciones"],
  },
];

const LINKS = NAV_GROUPS.flatMap((g) => g.links);

function isNavActive(pathname: string, item: NavItemDef): boolean {
  if (pathname === item.href) return true;
  if (item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`))) return true;
  if (item.href === "/hoy" && pathname.startsWith("/entrenos/")) return true;
  return false;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [raceDate, setRaceDate] = useState("26/04/2027");
  const current =
    LINKS.find((l) => isNavActive(pathname, l)) ??
    (pathname === "/calendario"
      ? { label: "Calendario" }
      : pathname === "/objetivos"
      ? { label: "Objetivos" }
      : pathname === "/marcas" || pathname === "/gimnasio"
      ? { label: "Biblioteca & Marcas" }
      : pathname === "/detalle" || pathname.startsWith("/entrenos/")
      ? { label: "Detalle Entreno" }
      : pathname === "/registro"
      ? { label: "Registrar Sesión" }
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
    <div style={{ display: "flex", minHeight: "100dvh", position: "relative" }}>
      {/* Sidebar — Escritorio & Tablet (>= 768px): colapsable, estilo Harbiz SaaS */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-30 flex-col overflow-hidden transition-all duration-200 ${
          sidebarCollapsed ? "w-0 invisible pointer-events-none" : "w-64 visible"
        }`}
        style={{
          width: sidebarCollapsed ? 0 : 256,
          background: "var(--color-surface)",
          borderRight: sidebarCollapsed ? "none" : "1px solid var(--color-border)",
        }}
      >
        <div style={{ width: 256, height: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <Brand onCollapse={() => toggleSidebar(true)} />
          <nav
            style={{
              padding: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              flex: "1 1 0%",
              minHeight: 0,
              overflowY: "auto",
            }}
          >
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <div
                  className="font-bold uppercase tracking-wider"
                  style={{
                    color: "var(--color-text-faint)",
                    fontSize: "0.68rem",
                    letterSpacing: "0.08em",
                    padding: "0 0.75rem",
                    marginBottom: 6,
                  }}
                >
                  {group.title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {group.links.map((l) => (
                    <NavItem
                      key={l.href}
                      href={l.href}
                      label={l.label}
                      Icon={l.icon}
                      active={isNavActive(pathname, l)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer del sidebar: ficha de atleta + controles rápidos */}
          <div
            className="flex-shrink-0"
            style={{
              borderTop: "1px solid var(--color-border)",
              background: "var(--color-surface-raised)",
              padding: "12px 14px calc(14px + env(safe-area-inset-bottom, 0px))",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <div
              className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-150"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="relative w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{
                  background: "var(--color-brand-subtle)",
                  color: "var(--color-brand)",
                  border: "1px solid rgba(37, 99, 235, 0.28)",
                }}
              >
                DE
                <span
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                  style={{
                    background: "var(--color-success)",
                    border: "2px solid var(--color-surface)",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate leading-tight" style={{ color: "var(--color-text)" }}>
                  Daniel Espinosa
                </div>
                <div className="text-[11px] truncate flex items-center gap-1 mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  <span>Maratón</span>
                  <span>·</span>
                  <span className="font-semibold tabular-nums" style={{ color: "var(--color-brand)" }}>
                    {raceDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={triggerGlobalRefresh}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[40px] px-2.5 rounded-xl text-xs font-semibold transition-colors harbiz-press cursor-pointer"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text)",
                }}
                title="Refrescar métricas, cargas y sincronización"
              >
                <RefreshCw size={14} className={isGlobalRefreshing ? "animate-spin text-brand" : "text-muted"} />
                <span className="truncate">{isGlobalRefreshing ? "Actualizando..." : "Refrescar"}</span>
              </button>
              <NotificationCenter variant="icon" />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Topbar móvil Mobile-First con Safe Area Insets iOS/Android */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40">
        <div
          className="harbiz-glass"
          style={{
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "calc(8px + env(safe-area-inset-top, 0px))",
            paddingBottom: "8px",
            paddingLeft: "calc(12px + env(safe-area-inset-left, 0px))",
            paddingRight: "calc(12px + env(safe-area-inset-right, 0px))",
            minHeight: "calc(56px + env(safe-area-inset-top, 0px))",
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              className="btn-ghost btn-icon harbiz-press rounded-xl flex items-center justify-center"
              aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={mobileOpen}
              onClick={() => {
                haptics.selection();
                setMobileOpen((v) => !v);
              }}
              style={{ minWidth: 44, minHeight: 44, color: "var(--color-text)" }}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link
              href="/hoy"
              onClick={() => haptics.light()}
              className="relative flex-shrink-0 harbiz-press"
              title="Ir a Hoy"
            >
              <Image src="/brand/logo-mark.png" alt="EntrenoApp" width={30} height={30} className="rounded-xl shadow-xs" />
            </Link>
            <div className="flex flex-col min-w-0">
              <span
                className="font-bold text-sm leading-tight truncate"
                style={{ color: "var(--color-text)", letterSpacing: "-0.015em" }}
              >
                {current?.label ?? "Entrenamientos"}
              </span>
              <span className="text-[11px] leading-tight truncate" style={{ color: "var(--color-text-muted)" }}>
                Daniel Espinosa · Maratón {raceDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <NotificationCenter variant="icon" />
            <button
              onClick={() => {
                haptics.medium();
                triggerGlobalRefresh();
              }}
              className="btn-ghost btn-icon harbiz-press rounded-xl flex items-center justify-center"
              aria-label="Refrescar datos"
              title="Refrescar métricas y consejos"
              style={{ minWidth: 44, minHeight: 44 }}
            >
              <RefreshCw
                size={18}
                className={isGlobalRefreshing ? "animate-spin" : ""}
                style={{ color: isGlobalRefreshing ? "var(--color-brand)" : "var(--color-text-muted)" }}
              />
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* Drawer / Hoja de navegación completa móvil */}
        {mobileOpen && (
          <>
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.55)",
                backdropFilter: "blur(4px)",
                zIndex: -1,
              }}
              aria-hidden="true"
              onClick={() => setMobileOpen(false)}
            />
            <nav
              className="animate-in rounded-b-3xl shadow-2xl"
              style={{
                background: "var(--color-surface)",
                borderBottom: "1px solid var(--color-border)",
                padding: "14px 14px 20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                maxHeight: "calc(100dvh - 130px)",
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--color-text-faint)",
                      padding: "0 10px",
                      marginBottom: 6,
                    }}
                  >
                    {group.title}
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {group.links.map((l) => (
                      <NavItem
                        key={l.href}
                        href={l.href}
                        label={l.label}
                        Icon={l.icon}
                        active={isNavActive(pathname, l)}
                        onClick={() => setMobileOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div
                className="flex items-center justify-between pt-3 px-2"
                style={{ borderTop: "1px solid var(--color-border)" }}
              >
                <div>
                  <div className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
                    Daniel Espinosa
                  </div>
                  <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    Maratón · {raceDate}
                  </div>
                </div>
                <ThemeToggle showLabel />
              </div>
            </nav>
          </>
        )}
      </div>

      {/* Bottom Tab Bar Harbiz (< 768px) con Safe Area iOS/Android & Blur */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          paddingLeft: "env(safe-area-inset-left, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
        }}
      >
        <nav
          aria-label="Navegación principal móvil"
          className="harbiz-glass"
          style={{
            borderLeft: "none",
            borderRight: "none",
            borderBottom: "none",
            borderTop: "1px solid var(--color-border)",
            paddingTop: "6px",
            paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
            display: "grid",
            gridTemplateColumns: `repeat(${BOTTOM_NAV.length}, 1fr)`,
            alignItems: "center",
          }}
        >
          {BOTTOM_NAV.map((item) => {
            const active = isNavActive(pathname, item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => haptics.selection()}
                aria-current={active ? "page" : undefined}
                className="harbiz-press flex flex-col items-center justify-center gap-1 py-1 no-underline relative select-none"
                style={{
                  minHeight: 48,
                  minWidth: 44,
                }}
              >
                {active && (
                  <span
                    className="rounded-full"
                    style={{
                      position: "absolute",
                      top: -6,
                      width: 24,
                      height: 3,
                      backgroundColor: "var(--color-brand)",
                    }}
                  />
                )}
                <div
                  className="flex items-center justify-center rounded-xl px-3 py-1 transition-colors"
                  style={{
                    background: active ? "var(--color-brand-subtle)" : "transparent",
                  }}
                >
                  <Icon
                    size={21}
                    strokeWidth={active ? 2.4 : 1.8}
                    style={{
                      color: active ? "var(--color-brand)" : "var(--color-text-muted)",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] leading-none truncate max-w-full tracking-tight"
                  style={{
                    color: active ? "var(--color-brand)" : "var(--color-text-muted)",
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
            className="btn-ghost hidden md:flex items-center justify-center animate-in harbiz-press cursor-pointer"
            title="Mostrar barra lateral"
            aria-label="Mostrar barra lateral"
            style={{
              position: "fixed",
              top: 16,
              left: 16,
              zIndex: 35,
              width: 44,
              height: 44,
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              color: "var(--color-text)",
            }}
          >
            <PanelLeftOpen size={18} />
          </button>
        )}
        <div className="main-content-container">
          <div className="md:hidden" style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />
          <ReportNotificationBanner />
          {children}
          <div className="md:hidden" style={{ height: "calc(80px + env(safe-area-inset-bottom, 16px))" }} />
          <div className="hidden md:block" style={{ height: "20px" }} />
        </div>
      </main>
    </div>
  );
}

function Brand({ onCollapse }: { onCollapse?: () => void }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-4"
      style={{
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <Link
        href="/hoy"
        className="flex items-center gap-2.5 min-w-0 flex-1 no-underline text-inherit hover:opacity-90 transition-opacity"
        title="Ir a Entrenamientos"
      >
        <div className="flex-shrink-0">
          <Image
            src="/brand/logo-mark.png"
            alt="EntrenoApp"
            width={34}
            height={34}
            className="rounded-xl shadow-xs"
          />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            style={{
              fontWeight: 800,
              fontSize: "1.05rem",
              lineHeight: 1.1,
              letterSpacing: "-0.025em",
              color: "var(--color-text)",
            }}
          >
            ENTRENO
          </span>
          <span
            style={{
              fontSize: "0.62rem",
              padding: "2px 7px",
              borderRadius: "9999px",
              background: "var(--color-brand-subtle)",
              color: "var(--color-brand)",
              border: "1px solid rgba(37, 99, 235, 0.25)",
              fontWeight: 800,
              lineHeight: 1.2,
              letterSpacing: "0.04em",
            }}
          >
            PRO
          </span>
        </div>
      </Link>
      {onCollapse && (
        <button
          onClick={onCollapse}
          className="btn-ghost flex items-center justify-center rounded-xl harbiz-press cursor-pointer"
          title="Ocultar barra lateral"
          aria-label="Ocultar barra lateral"
          style={{
            width: 36,
            height: 36,
            color: "var(--color-text-muted)",
          }}
        >
          <PanelLeftClose size={17} />
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
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] transition-all duration-150 no-underline min-h-[44px] harbiz-press"
      style={{
        background: active ? "var(--color-brand-subtle)" : "transparent",
        color: active ? "var(--color-brand)" : "var(--color-text-muted)",
        fontWeight: active ? 700 : 500,
        border: active ? "1px solid rgba(37, 99, 235, 0.25)" : "1px solid transparent",
      }}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2.3 : 1.8}
        style={{ color: active ? "var(--color-brand)" : "var(--color-text-muted)", flexShrink: 0 }}
      />
      <span className="truncate">{label}</span>
      {active && (
        <span
          className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: "var(--color-brand)" }}
        />
      )}
    </Link>
  );
}
