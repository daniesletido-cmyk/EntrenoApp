"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Activity,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Flame,
  Award,
  Crown,
  Lock,
  Layers,
  HeartPulse,
  Watch,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { PLANS, PlanConfig } from "@/lib/stripe";

const FAQS = [
  {
    q: "¿Cómo funciona la prueba gratuita de 7 días?",
    a: "Al elegir el plan Atleta Premium Anual, disfrutas de 7 días completos de acceso ilimitado a todas las herramientas: Entrenador IA, sincronización de relojes Suunto y Zepp, y análisis de fatiga ACWR. Puedes cancelar en cualquier momento con 1 clic antes de que venza el periodo y no se te cobrará nada.",
  },
  {
    q: "¿Qué relojes y dispositivos son compatibles?",
    a: "EntrenoApp se conecta directamente en la nube con la API oficial de Suunto Cloud y Huami/Zepp (Amazfit). Además, admite la importación directa por arrastrar y soltar de cualquier archivo .FIT estándar (Garmin, Polar, Coros, Wahoo, Apple Watch exportado).",
  },
  {
    q: "¿Cómo adapta el Entrenador IA mis entrenamientos?",
    a: "El algoritmo analiza tu ratio de carga aguda vs crónica (ACWR), tu pulso en reposo matutino, la calidad y fases del sueño (REM y profundo) y tu RPE. Si detecta fatiga excesiva, reprograma inteligentemente la sesión del día (por ejemplo, convirtiendo series en rodaje regenerativo o ajustando los ritmos de paso).",
  },
  {
    q: "¿Puedo cancelar o cambiar mi suscripción cuando quiera?",
    a: "Sí, sin ninguna permanencia. Desde la pantalla de Configuración de tu cuenta tienes acceso al Portal de Facturación seguro de Stripe donde puedes cancelar tu renovación, cambiar de tarjeta de crédito o descargar tus facturas fiscales oficiales.",
  },
  {
    q: "¿Qué formas de pago aceptáis?",
    a: "Aceptamos todas las tarjetas de crédito y débito principales (Visa, Mastercard, American Express), así como Apple Pay y Google Pay a través de la pasarela cifrada y segura de Stripe.",
  },
];

const COMPARISON_ROWS = [
  { feature: "Registro diario de entrenos y notas", free: true, premium: true, coach: true },
  { feature: "Calendario y planificación tripartita", free: true, premium: true, coach: true },
  { feature: "Catálogo de marcas de gimnasio y PRs", free: true, premium: true, coach: true },
  { feature: "Entrenador Personal IA 24/7 interactivo", free: false, premium: true, coach: true },
  { feature: "Sincronización automática Suunto Cloud & Zepp", free: false, premium: true, coach: true },
  { feature: "Importación directa de archivos .FIT", free: "Básica", premium: "Ilimitada", coach: "Ilimitada" },
  { feature: "Monitor de fatiga y ratio ACWR", free: false, premium: true, coach: true },
  { feature: "Readiness Score diario y recuperación", free: false, premium: true, coach: true },
  { feature: "Informes semanales automáticos con IA", free: false, premium: true, coach: true },
  { feature: "Cálculo y ajuste de zonas de ritmo VAM", free: false, premium: true, coach: true },
  { feature: "Gestión multi-atleta y grupos de entreno", free: false, premium: false, coach: true },
  { feature: "Exportación de informes ejecutivos en PDF", free: false, premium: false, coach: true },
];

function PreciosContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [billingPeriod, setBillingPeriod] = useState<"annual" | "monthly">("annual");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Leer estado de suscripción actual
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.subscription) {
          setCurrentPlan(data.subscription.plan);
          setIsSubscribed(data.subscription.status === "active" || data.subscription.status === "trialing");
        }
      })
      .catch(() => {});

    // Gestionar feedback de Stripe Checkout
    const status = searchParams.get("status");
    if (status === "success") {
      toast.push("success", "¡Suscripción Activada! Todas las funciones avanzadas y el Entrenador IA están desbloqueados.");
    } else if (status === "cancelled") {
      toast.push("info", "Proceso cancelado. No se ha realizado ningún cobro.");
    } else if (status === "demo_checkout") {
      toast.push("info", "Modo Demostración: Para procesar tarjetas reales, configura tus claves de Stripe.");
    }
  }, [searchParams, toast]);

  const handleStartCheckout = async (planKey: string) => {
    if (planKey === "free") {
      toast.push("info", "Ya estás disfrutando de las funciones gratuitas de EntrenoApp.");
      return;
    }

    setLoadingPlan(planKey);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planKey,
          userId: "default_user",
          simulateSuccess: true, // Si Stripe no tiene claves, permite activar demo
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo iniciar la sesión de pago.");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.push("success", data.message || "Tu plan ha sido actualizado correctamente.");
      }
    } catch (err: any) {
      toast.push("error", err.message || "Ocurrió un error al contactar con la pasarela de pago.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    try {
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "default_user" }),
      });
      const data = await res.json();
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        toast.push("info", data.message || "Gestiona tu suscripción directamente desde aquí.");
      }
    } catch {
      toast.push("error", "No se pudo abrir el portal de cliente.");
    }
  };

  const selectedPremiumPlanKey = billingPeriod === "annual" ? "premium_annual" : "premium_monthly";
  const selectedPremiumPlan = PLANS[selectedPremiumPlanKey];

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-b from-sky-950/40 via-slate-900/80 to-slate-950 p-6 md:p-12 text-center shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-sky-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sky-400 mb-6">
          <Sparkles size={14} className="animate-pulse" />
          <span>Inteligencia Artificial y Métricas Deportivas 2.0</span>
        </div>

        <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-tight">
          Tu entrenamiento de carrera, fuerza y descanso{" "}
          <span className="bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
            optimizado por IA
          </span>
        </h1>

        <p className="mt-4 text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          La única plataforma diseñada para corredores y atletas híbridos que sincroniza automáticamente tus relojes
          (Suunto, Zepp, Garmin), calcula tu fatiga real y adapta tus ritmos sin perder un minuto en hojas de cálculo.
        </p>

        {/* Badges de Confianza */}
        <div className="mt-8 flex flex-wrap justify-center items-center gap-4 text-xs font-medium text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-emerald-400" />
            Garantía de 7 días gratis
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 size={16} className="text-sky-400" />
            Sin permanencia · Cancela en 1 clic
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Watch size={16} className="text-amber-400" />
            Compatible con Suunto, Zepp y .FIT
          </span>
        </div>

        {/* Selector Mensual / Anual */}
        <div className="mt-10 inline-flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-700/60 shadow-inner">
          <button
            type="button"
            onClick={() => setBillingPeriod("monthly")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              billingPeriod === "monthly"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Facturación Mensual
          </button>
          <button
            type="button"
            onClick={() => setBillingPeriod("annual")}
            className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              billingPeriod === "annual"
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Facturación Anual
            <span className="ml-2 inline-block rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
              Ahorra 33%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
        {/* Plan 1: Básico (Gratis) */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/50 p-6 lg:p-8 backdrop-blur-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold uppercase tracking-wider text-slate-400">Atleta Básico</span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">Gratis</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 text-white">
              <span className="text-4xl font-extrabold tracking-tight">0 €</span>
              <span className="text-sm text-slate-400">/ siempre</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Ideal para quienes quieren un diario limpio y estructurado de sus entrenamientos y marcas personales.
            </p>

            <div className="my-6 border-t border-slate-800" />

            <ul className="space-y-3 text-xs text-slate-300">
              {PLANS.free.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <Button
              variant="secondary"
              className="w-full text-slate-300 border-slate-700 hover:bg-slate-800"
              onClick={() => handleStartCheckout("free")}
            >
              {currentPlan === "free" ? "Tu Plan Actual" : "Usar Plan Básico"}
            </Button>
          </div>
        </div>

        {/* Plan 2: Premium (Destacado) */}
        <div className="relative flex flex-col justify-between rounded-3xl border-2 border-sky-500 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 p-6 lg:p-8 shadow-2xl shadow-sky-500/10 scale-105 z-10">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-sky-500 to-teal-400 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-950 shadow-md">
            Recomendado · Más Popular
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 mt-2">
              <span className="text-sm font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Crown size={16} className="text-sky-400" />
                Atleta Premium
              </span>
              <span className="rounded-full bg-sky-500/20 border border-sky-400/30 px-3 py-1 text-xs font-semibold text-sky-300">
                {billingPeriod === "annual" ? "7 Días Gratis" : "Mensual"}
              </span>
            </div>

            <div className="mt-2 flex items-baseline gap-1 text-white">
              <span className="text-5xl font-black tracking-tight">
                {billingPeriod === "annual" ? "39,99 €" : "4,99 €"}
              </span>
              <span className="text-sm text-slate-400">
                {billingPeriod === "annual" ? "/ año (3,33 €/mes)" : "/ mes"}
              </span>
            </div>

            <p className="mt-3 text-xs text-sky-200/80">
              Desbloquea el análisis científico de cargas, tu Entrenador IA 24/7 y la sincronización automática de relojes.
            </p>

            <div className="my-6 border-t border-sky-500/20" />

            <ul className="space-y-3 text-xs text-slate-200">
              {selectedPremiumPlan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-sky-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 space-y-2">
            <Button
              variant="primary"
              className="w-full bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-950 font-bold py-3 text-sm shadow-lg shadow-sky-500/25 transition-all"
              onClick={() => handleStartCheckout(selectedPremiumPlanKey)}
              disabled={loadingPlan === selectedPremiumPlanKey}
            >
              {loadingPlan === selectedPremiumPlanKey ? (
                "Cargando pago seguro..."
              ) : isSubscribed ? (
                "Gestionar Suscripción Activa"
              ) : billingPeriod === "annual" ? (
                "Comenzar Prueba Gratis (7 Días)"
              ) : (
                "Suscribirme Ahora (4,99 €/mes)"
              )}
            </Button>
            <p className="text-[10px] text-center text-slate-400">
              Pago 100% cifrado y seguro con Stripe · Cancela en cualquier momento
            </p>
          </div>
        </div>

        {/* Plan 3: Pro Coach & Equipos */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900/50 p-6 lg:p-8 backdrop-blur-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Award size={16} />
                Pro Coach
              </span>
              <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-300">
                Para Equipos
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 text-white">
              <span className="text-4xl font-extrabold tracking-tight">14,99 €</span>
              <span className="text-sm text-slate-400">/ mes</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Para entrenadores personales, preparadores físicos y clubes que coordinan múltiples deportistas.
            </p>

            <div className="my-6 border-t border-slate-800" />

            <ul className="space-y-3 text-xs text-slate-300">
              {PLANS.pro_coach.features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <Button
              variant="secondary"
              className="w-full text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
              onClick={() => handleStartCheckout("pro_coach")}
              disabled={loadingPlan === "pro_coach"}
            >
              {loadingPlan === "pro_coach" ? "Cargando..." : "Elegir Plan Pro Coach"}
            </Button>
          </div>
        </div>
      </div>

      {/* Si el usuario ya está suscrito, botón de acceso directo al portal de Stripe */}
      {isSubscribed && (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <div className="text-sm font-semibold text-sky-300">Tienes una suscripción activa a EntrenoApp</div>
            <div className="text-xs text-slate-400">
              Gestiona tus métodos de pago, descarga facturas oficiales o actualiza tu periodo desde el portal oficial.
            </div>
          </div>
          <Button variant="ghost" onClick={handleOpenPortal} className="text-sky-300 border-sky-500/40">
            Abrir Portal de Stripe
          </Button>
        </div>
      )}

      {/* Feature Comparison Table */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 md:p-8 overflow-x-auto">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
          Comparativa Detallada de Funcionalidades
        </h2>

        <table className="w-full text-left text-xs md:text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="pb-4 font-semibold">Funcionalidad</th>
              <th className="pb-4 font-semibold text-center">Básico (0 €)</th>
              <th className="pb-4 font-semibold text-center text-sky-400">Premium (4,99 €)</th>
              <th className="pb-4 font-semibold text-center text-amber-400">Pro Coach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {COMPARISON_ROWS.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="py-3 font-medium text-white">{row.feature}</td>
                <td className="py-3 text-center">
                  {typeof row.free === "boolean" ? (
                    row.free ? (
                      <CheckCircle2 size={16} className="text-emerald-400 mx-auto" />
                    ) : (
                      <span className="text-slate-600">—</span>
                    )
                  ) : (
                    <span className="text-slate-400 text-xs">{row.free}</span>
                  )}
                </td>
                <td className="py-3 text-center bg-sky-500/5">
                  {typeof row.premium === "boolean" ? (
                    row.premium ? (
                      <CheckCircle2 size={16} className="text-sky-400 mx-auto" />
                    ) : (
                      <span className="text-slate-600">—</span>
                    )
                  ) : (
                    <span className="text-sky-300 font-semibold text-xs">{row.premium}</span>
                  )}
                </td>
                <td className="py-3 text-center">
                  {typeof row.coach === "boolean" ? (
                    row.coach ? (
                      <CheckCircle2 size={16} className="text-amber-400 mx-auto" />
                    ) : (
                      <span className="text-slate-600">—</span>
                    )
                  ) : (
                    <span className="text-amber-300 font-semibold text-xs">{row.coach}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Social Proof & Testimonials */}
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl md:text-2xl font-bold text-white">Lo que dicen los atletas que ya entrenan con nosotros</h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Diseñada desde la experiencia real de corredores de asfalto, trail y atletas de fuerza.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="currentColor" />
              ))}
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              &quot;Llevaba 3 años usando TrainingPeaks y era un suplicio configurarlo. EntrenoApp me importa las sesiones de
              mi Suunto solas y me dice si mis ritmos de maratón están bien o si tengo riesgo de lesión.&quot;
            </p>
            <div className="pt-2 border-t border-slate-800 text-xs">
              <span className="font-semibold text-white">Carlos M.</span> · Maratonista (3h08)
            </div>
          </div>

          <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-5 space-y-3">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="currentColor" />
              ))}
            </div>
            <p className="text-xs text-slate-200 italic leading-relaxed">
              &quot;Entrenar fuerza en el gimnasio y meter 50 km semanales de carrera solía terminar en sobrecargas continuas.
              La gráfica de ACWR y el Readiness diario me salvaron la preparación.&quot;
            </p>
            <div className="pt-2 border-t border-sky-500/20 text-xs">
              <span className="font-semibold text-white">Laura G.</span> · Atleta Híbrida & CrossFit
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill="currentColor" />
              ))}
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              &quot;El Entrenador IA no te suelta respuestas genéricas de ChatGPT. Sabe qué entrenaste ayer, tus horas de
              sueño de Zepp y te ajusta la sesión con base científica.&quot;
            </p>
            <div className="pt-2 border-t border-slate-800 text-xs">
              <span className="font-semibold text-white">David S.</span> · Entrenador de Resistencia
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 md:p-8">
        <h2 className="text-xl md:text-2xl font-bold text-white mb-6 text-center">
          Preguntas Frecuentes
        </h2>

        <div className="space-y-4 max-w-3xl mx-auto">
          {FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="rounded-xl border border-slate-800/80 bg-slate-950/50 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left font-medium text-sm text-slate-200 hover:text-white"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} className="text-sky-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-500 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA Final */}
      <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 p-8 text-center space-y-4 shadow-xl">
        <h3 className="text-2xl font-bold text-white">¿Listo para optimizar tu rendimiento?</h3>
        <p className="text-xs md:text-sm text-slate-300 max-w-xl mx-auto">
          Únete hoy y empieza tus 7 días de prueba gratuita. Sin compromiso y con cancelación en 1 clic.
        </p>
        <div className="pt-2">
          <Button
            variant="primary"
            className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-8 py-3 shadow-lg shadow-sky-500/20"
            onClick={() => handleStartCheckout("premium_annual")}
          >
            Comenzar Prueba Gratuita de 7 Días
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PreciosPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent mb-3" />
          <p className="text-sm">Cargando planes de suscripción...</p>
        </div>
      }
    >
      <PreciosContent />
    </Suspense>
  );
}
