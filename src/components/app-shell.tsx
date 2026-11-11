"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Dumbbell,
  BookOpen,
  TrendingUp,
  User,
  RefreshCw,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { haptics } from "@/lib/haptics";

interface NavItemDef {
  href: string;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;
  aliases?: string[];
}

// Únicamente 4 secciones principales consolidadas (Arquitectura Harbiz)
const MAIN_NAV: NavItemDef[] = [
  {
    href: "/hoy",
    label: "Hoy / Plan",
    mobileLabel: "Hoy",
    icon: Dumbbell,
    aliases: ["/plan-semanal", "/calendario", "/registro", "/detalle", "/entrenos"],
  },
  {
    href: "/marcas",
    label: "Biblioteca & Ejercicios",
    mobileLabel: "Biblioteca",
    icon: BookOpen,
    aliases: ["/gimnasio"],
  },
  {
    href: "/",
    label: "Progreso & Salud",
    mobileLabel: "Progreso",
    icon: TrendingUp,
    aliases: ["/progreso", "/sueno", "/informe-semanal", "/objetivos"],
  },
  {
    href: "/configuracion",
    label: "Perfil & Ajustes",
    mobileLabel: "Perfil",
    icon: User,
    aliases: ["/menu", "/entrenador", "/psicologia", "/precios", "/recomendaciones"],
  },
];

function isNavActive(pathname: string, item: NavItemDef): boolean {
  if (pathname === item.href) return true;
  if (item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`))) return true;
  if (item.href === "/hoy" && pathname.startsWith("/entrenos/")) return true;
  return false;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [raceDate, setRaceDate] = useState("26/04/2027");
  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);

  const current = MAIN_NAV.find((item) => isNavActive(pathname, item)) ?? MAIN_NAV[0];

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
    setTimeout(() => setIsGlobalRefreshing(false), 800);
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

  return (
    <div style={{ display: "flex", minHeight: "100dvh", position: "relative" }}>
      {/* Sidebar delgada y limpia para Tablet / Escritorio (>= 768px) */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 z-30 flex-col overflow-hidden transition-all duration-200 ${
          sidebarCollapsed ? "w-0 invisible pointer-events-none" : "w-60 visible"
        }`}
        style={{
          width: sidebarCollapsed ? 0 : 240,
          background: "var(--color-surface)",
          borderRight: sidebarCollapsed ? "none" : "1px solid var(--color-border)",
        }}
      >
        <div style={{ width: 240, height: "100%", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <Brand onCollapse={() => toggleSidebar(true)} />

          <nav
            aria-label="Navegación principal"
            style={{
              padding: "16px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              flex: "1 1 0%",
              minHeight: 0,
              overflowY: "auto",
            }}
          >
            {MAIN_NAV.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                label={item.label}
                Icon={item.icon}
                active={isNavActive(pathname, item)}
              />
            ))}
          </nav>

          {/* Perfil del usuario anclado abajo */}
          <div
            className="flex-shrink-0"
            style={{
              borderTop: "1px solid var(--color-border)",
              padding: "14px 12px calc(14px + env(safe-area-inset-bottom, 0px))",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <Link
              href="/configuracion"
              className="flex items-center gap-2.5 p-2.5 rounded-xl no-underline transition-colors harbiz-press"
              style={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{
                  background: "var(--color-brand-subtle)",
                  color: "var(--color-brand)",
                }}
              >
                DE
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: "var(--color-text)" }}>
                  Daniel Espinosa
                </div>
                <div className="text-[11px] truncate tabular-nums" style={{ color: "var(--color-text-muted)" }}>
                  Maratón · {raceDate}
                </div>
              </div>
            </Link>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={triggerGlobalRefresh}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl text-xs font-semibold transition-colors harbiz-press cursor-pointer"
                style={{
                  background: "var(--color-surface-raised)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-muted)",
                }}
                title="Actualizar datos"
              >
                <RefreshCw size={14} className={isGlobalRefreshing ? "animate-spin text-brand" : ""} />
                <span>{isGlobalRefreshing ? "Actualizando…" : "Actualizar"}</span>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Topbar móvil minimalista con Safe Area Inset Top */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-40">
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
            paddingLeft: "calc(14px + env(safe-area-inset-left, 0px))",
            paddingRight: "calc(14px + env(safe-area-inset-right, 0px))",
            minHeight: "calc(56px + env(safe-area-inset-top, 0px))",
          }}
        >
          <Link
            href="/hoy"
            onClick={() => haptics.light()}
            className="flex items-center gap-2.5 min-w-0 no-underline harbiz-press"
          >
            <Image src="/brand/logo-mark.png" alt="EntrenoApp" width={30} height={30} className="rounded-xl" />
            <div className="flex flex-col min-w-0">
              <span
                className="font-bold text-sm leading-tight truncate"
                style={{ color: "var(--color-text)", letterSpacing: "-0.015em" }}
              >
                {current.label}
              </span>
              <span className="text-[11px] leading-tight truncate" style={{ color: "var(--color-text-muted)" }}>
                Daniel Espinosa
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => {
                haptics.medium();
                triggerGlobalRefresh();
              }}
              className="btn-ghost btn-icon harbiz-press rounded-xl flex items-center justify-center"
              aria-label="Actualizar"
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
      </header>

      {/* Bottom Tab Bar limpia (< 768px): 4 accesos directos con iconos 24px y text-xs */}
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
            gridTemplateColumns: "repeat(4, 1fr)",
            alignItems: "center",
          }}
        >
          {MAIN_NAV.map((item) => {
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
                <Icon
                  size={24}
                  strokeWidth={active ? 2.2 : 1.75}
                  style={{
                    color: active ? "var(--color-brand)" : "var(--color-text-muted)",
                  }}
                />
                <span
                  className="text-xs leading-none truncate max-w-full"
                  style={{
                    color: active ? "var(--color-brand)" : "var(--color-text-muted)",
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {item.mobileLabel}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Área de contenido principal */}
      <main
        className={`flex-1 min-w-0 transition-[margin] duration-200 ${
          sidebarCollapsed ? "md:ml-0" : "md:ml-60"
        }`}
        style={{ flex: 1, minWidth: 0 }}
      >
        {sidebarCollapsed && (
          <button
            onClick={() => toggleSidebar(false)}
            className="btn-ghost hidden md:flex items-center justify-center animate-in harbiz-press cursor-pointer"
            title="Mostrar menú"
            aria-label="Mostrar menú"
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
          {children}
          <div className="md:hidden" style={{ height: "calc(80px + env(safe-area-inset-bottom, 16px))" }} />
          <div className="hidden md:block" style={{ height: "24px" }} />
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
      >
        <Image src="/brand/logo-mark.png" alt="EntrenoApp" width={32} height={32} className="rounded-xl flex-shrink-0" />
        <span
          style={{
            fontWeight: 800,
            fontSize: "1.05rem",
            lineHeight: 1.1,
            letterSpacing: "-0.025em",
            color: "var(--color-text)",
          }}
        >
          EntrenoApp
        </span>
      </Link>
      {onCollapse && (
        <button
          onClick={onCollapse}
          className="btn-ghost flex items-center justify-center rounded-xl harbiz-press cursor-pointer"
          title="Ocultar menú"
          aria-label="Ocultar menú"
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
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; style?: React.CSSProperties }>;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 no-underline min-h-[44px] harbiz-press"
      style={{
        background: active ? "var(--color-brand-subtle)" : "transparent",
        color: active ? "var(--color-brand)" : "var(--color-text-muted)",
        fontWeight: active ? 700 : 500,
      }}
    >
      <Icon
        size={20}
        strokeWidth={active ? 2.2 : 1.75}
        style={{ color: active ? "var(--color-brand)" : "var(--color-text-muted)", flexShrink: 0 }}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
