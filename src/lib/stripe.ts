import Stripe from "stripe";

// Configuración de Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "";

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: "2025-02-24.acacia" as any,
      typescript: true,
    })
  : null;

export interface PlanConfig {
  id: "free" | "premium_monthly" | "premium_annual" | "pro_coach";
  name: string;
  badge?: string;
  priceEur: number;
  interval: "month" | "year" | null;
  stripePriceId?: string;
  features: string[];
  ctaLabel: string;
  popular?: boolean;
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: "free",
    name: "Atleta Básico",
    badge: "Gratis",
    priceEur: 0,
    interval: null,
    features: [
      "Registro de entrenamientos y calendario",
      "Control de volumen semanal y kilometraje",
      "Catálogo de marcas de fuerza (PRs y gimnasio)",
      "Registro manual de sueño y sensaciones",
      "PWA móvil instalable en iPhone y Android",
    ],
    ctaLabel: "Plan Actual",
  },
  premium_monthly: {
    id: "premium_monthly",
    name: "Atleta Premium (Mensual)",
    priceEur: 4.99,
    interval: "month",
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM_MONTHLY || "price_premium_monthly",
    features: [
      "Todo lo incluido en el Plan Básico",
      "Entrenador Personal IA 24/7 adaptativo",
      "Sincronización directa Suunto, Zepp y archivos FIT",
      "Monitorización de Fatiga vs Forma (ACWR y Cargas)",
      "Readiness Score diario y recomendación de intensidad",
      "Informes semanales automáticos con análisis fisiológico",
      "Cálculo y ajuste dinámico de zonas de ritmo (VAM)",
    ],
    ctaLabel: "Suscribirme (4,99 €/mes)",
  },
  premium_annual: {
    id: "premium_annual",
    name: "Atleta Premium (Anual)",
    badge: "Ahorra 33%",
    popular: true,
    priceEur: 39.99,
    interval: "year",
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || "price_premium_annual",
    features: [
      "Todo lo de Premium Mensual con 33% de descuento",
      "Equivalente a 3,33 €/mes (pago único de 39,99 €/año)",
      "7 días de prueba gratuita sin compromiso",
      "Entrenador IA ilimitado y motor de sobrecarga progresiva",
      "Análisis avanzado de recuperación cardíaca y sueño REM",
      "Soporte prioritario y acceso anticipado a nuevas funciones",
    ],
    ctaLabel: "Comenzar Prueba Gratis (7 Días)",
  },
  pro_coach: {
    id: "pro_coach",
    name: "Pro Coach & Equipos",
    badge: "Para Entrenadores",
    priceEur: 14.99,
    interval: "month",
    stripePriceId: process.env.STRIPE_PRICE_PRO_COACH || "price_pro_coach",
    features: [
      "Todas las funcionalidades Premium incluidas",
      "Gestión de hasta 15 atletas o corredores simultáneos",
      "Prescripción y ajuste de planes masivos con IA",
      "Exportación de informes ejecutivos de rendimiento en PDF",
      "Panel de control de fatiga grupal y prevención de lesiones",
      "Atención personalizada por WhatsApp y canal directo",
    ],
    ctaLabel: "Elegir Plan Pro Coach",
  },
};

export function getBaseUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://entrenoapp-blond.vercel.app";
}
