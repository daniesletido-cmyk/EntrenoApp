"use client";

import { useAuth } from "@/context/auth-context";
import { PageHeader } from "@/components/ui/page-header";
import { UniversalWatchConnector } from "@/components/settings/universal-watch-connector";
import { User, LogOut, ShieldCheck, Target, Timer, Weight, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PerfilPage() {
  const { profile, user, signOut } = useAuth();
  const router = useRouter();

  const athleteName = profile?.full_name || user?.user_metadata?.full_name || "Atleta";
  const athleteEmail = profile?.email || user?.email || "atleta@entrenoapp.es";
  const athleteVam = profile?.vam_pace || "3:59";
  const athleteGoal = profile?.target_distance || "Maratón";
  const athleteDate = profile?.target_date
    ? new Date(profile.target_date).toLocaleDateString()
    : "Sin fecha definida";

  const handleSignOut = async () => {
    if (confirm("¿Seguro que deseas cerrar sesión?")) {
      await signOut();
      router.push("/login");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
      <PageHeader
        title="Mi Perfil & Ecosistema"
        description="Gestión de tu cuenta privada, marcas fisiológicas y conectores de reloj"
      />

      {/* Tarjeta de Identidad y Cuenta Privada */}
      <div
        className="p-5 sm:p-6 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg text-[#DC2626]"
            style={{
              background: "rgba(220, 38, 38, 0.08)",
              border: "1px solid rgba(220, 38, 38, 0.2)",
            }}
          >
            {athleteName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black">{athleteName}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/20 uppercase">
                {profile?.role === "owner" ? "Propietario" : "Atleta"}
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {athleteEmail}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/onboarding"
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center no-underline"
            style={{
              background: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          >
            Reconfigurar Objetivos
          </Link>
          <button
            onClick={handleSignOut}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-500/10 hover:bg-red-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={14} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>

      {/* Métricas Fisiológicas y Marcas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          className="p-4 rounded-2xl flex flex-col gap-1 shadow-sm"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
            <Timer size={14} className="text-[#DC2626]" />
            VAM Oficial
          </span>
          <span className="text-lg font-black font-mono text-[#DC2626]">{athleteVam} /km</span>
        </div>

        <div
          className="p-4 rounded-2xl flex flex-col gap-1 shadow-sm"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
            <Target size={14} className="text-[#DC2626]" />
            Objetivo
          </span>
          <span className="text-base font-black truncate">{athleteGoal}</span>
        </div>

        <div
          className="p-4 rounded-2xl flex flex-col gap-1 shadow-sm"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
            <Calendar size={14} className="text-[#DC2626]" />
            Fecha Prueba
          </span>
          <span className="text-sm font-black truncate">{athleteDate}</span>
        </div>

        <div
          className="p-4 rounded-2xl flex flex-col gap-1 shadow-sm"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
            <Weight size={14} className="text-[#DC2626]" />
            Peso Registrado
          </span>
          <span className="text-base font-black">{profile?.weight_kg || "—"} kg</span>
        </div>
      </div>

      {/* Módulo Conector Universal de Relojes */}
      <UniversalWatchConnector />
    </div>
  );
}
