import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, Clock, Zap, Heart, ArrowLeft, CheckCircle2, TrendingUp, Calendar, ExternalLink } from "lucide-react";
import { getWorkoutById } from "@/lib/repo/workouts";
import { getTrainingPlanForWeek } from "@/lib/repo/training-plan";
import { weekStartOf } from "@/lib/dates";
import { WorkoutShareButton } from "@/components/dashboard/workout-share-button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkoutDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) notFound();

  const workout = getWorkoutById(numId);
  if (!workout) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="p-4 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 mb-6">
          <h2 className="text-lg font-bold">Entrenamiento no encontrado</h2>
          <p className="text-sm text-zinc-600 mt-1">El entrenamiento solicitado con identificador #{id} no existe o fue eliminado.</p>
        </div>
        <Link
          href="/hoy"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors shadow-xs"
        >
          <ArrowLeft size={16} />
          Volver a Hoy
        </Link>
      </div>
    );
  }

  const weekStart = weekStartOf(workout.fecha);
  const plan = getTrainingPlanForWeek(weekStart);
  let latestAdaptations: any[] = [];
  if (plan?.adaptaciones_ia) {
    try {
      const parsed = JSON.parse(plan.adaptaciones_ia);
      latestAdaptations = Array.isArray(parsed) ? parsed : [parsed];
    } catch {}
  }

  const relatedAdaptation = latestAdaptations.find(
    (a) => a.workoutId === workout.id || a.workoutType === workout.tipo
  ) || latestAdaptations[0];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-zinc-200 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/hoy"
            className="p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors border border-zinc-200"
            title="Volver"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Sincronizado vía Suunto Cloud
              </span>
              <span className="text-xs text-zinc-500 font-mono">{workout.fecha}</span>
            </div>
            <h1 className="text-2xl font-black text-zinc-900 capitalize mt-1">
              {workout.tipo} #{workout.id}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <WorkoutShareButton
            workout={{
              title: `${workout.tipo.toUpperCase()} #${workout.id}`,
              discipline: workout.tipo,
              date: workout.fecha,
              distanceKm: workout.distancia ?? null,
              durationMin: workout.duracion ?? null,
              avgPaceMinKm:
                workout.distancia && workout.duracion
                  ? workout.duracion / workout.distancia
                  : null,
              avgHeartRate: workout.fc_media ?? null,
              readinessScore: 88,
              readinessLevel: "Óptimo",
              vamPace: "3:59 min/km",
              rpe: workout.rpe ?? null,
            }}
          />
          <Link
            href={`/plan-semanal?semana=${weekStart}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors"
          >
            <Calendar size={14} />
            <span>Plan Semanal</span>
            <ExternalLink size={12} className="opacity-60" />
          </Link>
        </div>
      </div>

      {/* Tarjetas de métricas principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <Clock size={14} className="text-sky-600" />
            <span>Duración</span>
          </div>
          <div className="text-2xl font-black text-zinc-900 font-mono mt-1">
            {workout.duracion} <span className="text-xs font-normal text-zinc-500">min</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <Activity size={14} className="text-emerald-600" />
            <span>Distancia</span>
          </div>
          <div className="text-2xl font-black text-zinc-900 font-mono mt-1">
            {workout.distancia != null ? Number(workout.distancia).toFixed(2) : "--"}
            <span className="text-xs font-normal text-zinc-500"> km</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
            <Heart size={14} className="text-rose-600" />
            <span>FC Media / Máx</span>
          </div>
          <div className="text-2xl font-black text-zinc-900 font-mono mt-1">
            {workout.fc_media ?? "--"}
            <span className="text-xs font-normal text-zinc-500"> / {workout.fc_max ?? "--"} ppm</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold uppercase tracking-wider">
            <Zap size={14} />
            <span>Carga TSS</span>
          </div>
          <div className="text-2xl font-black text-emerald-900 font-mono mt-1">
            {workout.carga_tss != null ? Math.round(workout.carga_tss) : "--"}
            <span className="text-xs font-normal text-emerald-700"> pts</span>
          </div>
        </div>
      </div>

      {/* Resumen de Adaptación del Plan por IA */}
      <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100">
            <TrendingUp size={18} />
          </div>
          <h3 className="text-base font-bold text-zinc-900">Análisis de Asimilación & Ajuste del Plan</h3>
        </div>

        <p className="text-sm text-zinc-700 leading-relaxed">
          {relatedAdaptation?.recommendationSummary ||
            `Carga de ${workout.carga_tss ?? 0} TSS asimilada para ${workout.tipo}. Las métricas se han sincronizado automáticamente con tu historial de entrenamiento y el cálculo de fatiga ACWR.`}
        </p>

        {relatedAdaptation?.modifications && relatedAdaptation.modifications.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2">
              Modificaciones aplicadas en tu semana:
            </h4>
            <div className="space-y-2">
              {relatedAdaptation.modifications.map((m: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">
                  <CheckCircle2 size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-zinc-900">{m.date} ({m.discipline}):</span> {m.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Enlaces de navegación */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={`/detalle?id=${workout.id}`}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 transition-colors"
        >
          Ver en Detalle Completo
        </Link>
        <Link
          href="/hoy"
          className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs"
        >
          Ir al Panel de Hoy
        </Link>
      </div>
    </div>
  );
}
