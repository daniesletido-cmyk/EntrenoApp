"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Brain,
  Sparkles,
  Zap,
  Target,
  Flame,
  Footprints,
  Dumbbell,
  Waves,
  BedDouble,
  ShieldCheck,
  CheckCircle2,
  Clock,
  HeartPulse,
  Sliders,
  ChevronRight,
  Smile,
  Meh,
  Frown,
  Activity,
  ArrowRight,
  BookOpen,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { todayISO } from "@/lib/dates";
import { haptics } from "@/lib/haptics";

function formatDateSpanish(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Categorías del catálogo de psicología deportiva
type CategoryKey = "all" | "marathon" | "intervals" | "hills" | "crossfit" | "recovery" | "swimming";

interface MentalTechnique {
  id: string;
  category: CategoryKey;
  categoryLabel: string;
  title: string;
  subtitle: string;
  body: string;
  scienceNote?: string;
  actionableStep: string;
  icon: any;
  color: string;
}

const PSYCHO_TECHNIQUES: MentalTechnique[] = [
  // TIRADA LARGA / MARATÓN
  {
    id: "chunking",
    category: "marathon",
    categoryLabel: "Tirada Larga & Maratón",
    title: "Estrategia de 'Chunking' (Fragmentación Mental)",
    subtitle: "Divide la inmensidad del kilometraje en micro-objetivos digeribles",
    body: "No corras la distancia completa en tu cabeza; divídela en micro-bloques de 4 km o tramos de 20 minutos. La corteza prefrontal se satura y activa mecanismos de ahorro energético cuando anticipa fatiga a horas de distancia, pero siempre encuentra energía para completar los próximos 15 minutos.",
    scienceNote: "Reduce la fatiga cognitiva percibida en un 28% (Marcora et al., Psychobiological Model of Endurance).",
    actionableStep: "Al salir hoy, fija tu atención únicamente en el primer punto de referencia o en los primeros 4 km. Olvídate del resto hasta llegar allí.",
    icon: Footprints,
    color: "#10b981",
  },
  {
    id: "central-governor",
    category: "marathon",
    categoryLabel: "Tirada Larga & Maratón",
    title: "Teoría del Gobernador Central de Noakes",
    subtitle: "El cansancio inicial es una sugerencia de tu mente, no tu límite físico",
    body: "Cuando hacia el final de un entreno largo sientas ganas intensas de aflojar, recuerda que el cerebro genera alarma y fatiga al 60-65% de tu capacidad fisiológica real como mecanismo evolutivo de supervivencia. No es fallo muscular ni celular, es una propuesta de tu mente.",
    scienceNote: "Descrito por el Dr. Tim Noakes: el cerebro anticipa la homeostasis antes de que exista daño real en el tejido.",
    actionableStep: "Cuando aparezca el impulso de parar, realiza 3 respiraciones profundas y di mentalmente: 'Mi cuerpo tiene reservas de sobra para 10 minutos más'.",
    icon: Zap,
    color: "#f59e0b",
  },
  {
    id: "attention-switching",
    category: "marathon",
    categoryLabel: "Tirada Larga & Maratón",
    title: "Atención Disociativa vs. Asociativa",
    subtitle: "Saber cuándo apagar la cabeza y cuándo escanear el cuerpo",
    body: "En los tramos llanos y cómodos de rodaje, desconecta la mente (atención disociativa: paisaje, respiración relajada, música rítmica); en las cuestas o en los kilómetros críticos, cambia a 'atención asociativa' interna: escanea postura, hombros bajos, mandíbula suelta, pisada ágil de mediopié y cadencia viva (>175 spm).",
    scienceNote: "Los corredores de élite alternan deliberadamente entre ambos focos atencionales durante los 42k.",
    actionableStep: "Cada 3 km haz un 'body scan' de 20 segundos de la coronilla a los dedos de los pies y suelta tensión parásita.",
    icon: Activity,
    color: "#3b82f6",
  },
  {
    id: "10-minute-rule",
    category: "marathon",
    categoryLabel: "Tirada Larga & Maratón",
    title: "La Regla de los 10 Minutos para la Pereza",
    subtitle: "Vence la inercia del sofá mediante negociación dopaminérgica",
    body: "Si antes de salir tu mente te pone excusas (frío, pesadez, dudas o pereza), negocia con ella: 'Solo me calzo las zapatillas y salgo 10 minutos al trote suave. Si sigo mal, vuelvo a casa'. En el 99% de las ocasiones, el bombeo de sangre, la dopamina y la oxigenación rompen la inercia y completas la sesión programada.",
    scienceNote: "La corteza motriz supera la resistencia de la amígdala una vez iniciado el movimiento mecánico.",
    actionableStep: "No debatas con tu cabeza en parado; ponte las zapatillas y sal a dar la primera zancada.",
    icon: Clock,
    color: "#6366f1",
  },
  {
    id: "visualize-madrid",
    category: "marathon",
    categoryLabel: "Tirada Larga & Maratón",
    title: "Visualización de Meta: Alfonso XII & Retiro",
    subtitle: "Ancla el dolor de hoy al éxtasis de cruzar la meta en Madrid",
    body: "En los tramos de mayor exigencia, traslada tu mente a los últimos 800 metros del Maratón de Madrid: visualiza la subida de la calle Alfonso XII entrando hacia el Parque del Retiro, el rugido de la multitud y la alfombra de meta. Asocia el ardor de cuádriceps de hoy con la gloria de colgarte la medalla.",
    scienceNote: "La imaginería motora activa las mismas redes neuronales del córtex motor primario que la ejecución física real.",
    actionableStep: "Cierra los ojos 30 segundos antes de empezar y siente la sensación de cruzar la meta con tu tiempo soñado.",
    icon: Target,
    color: "#ec4899",
  },

  // INTERVALOS Y SERIES DE UMBRAL
  {
    id: "lactate-acceptance",
    category: "intervals",
    categoryLabel: "Series & Umbral (R3/VAM)",
    title: "Aceptación del Lactato (ACT en Deporte)",
    subtitle: "El ardor muscular no es peligro: es la prueba de que tu umbral se expande",
    body: "La quemazón muscular y la falta de aire no son señales de alarma ni de fallo inminente; son la evidencia biológica de que estás empujando tu umbral anaeróbico hacia arriba. Saluda a la incomodidad, no luches mentalmente contra ella. Decir 'esto quema pero lo tolero' reduce drásticamente la reactividad del sistema nervioso.",
    scienceNote: "Terapia de Aceptación y Compromiso (ACT) aplicada al alto rendimiento deportivo.",
    actionableStep: "En plena serie de 1000m o 2000m, cuando llegue el lactato, sonríe 2 segundos y dite a ti mismo: 'Exactamente aquí es donde se mejora'.",
    icon: Flame,
    color: "#ef4444",
  },
  {
    id: "huberman-sigh",
    category: "intervals",
    categoryLabel: "Series & Umbral (R3/VAM)",
    title: "Suspiro Fisiológico de Andrew Huberman",
    subtitle: "Baja 10-15 lpm más rápido en las pausas de recuperación entre series",
    body: "Durante el descanso activo al trote entre series intensas, ejecuta el Suspiro Fisiológico: 2 inhalaciones rápidas y profundas por la nariz (la segunda estira los alvéolos colapsados) seguidas de una exhalación lenta y prolongada por la boca hasta vaciar los pulmones. Esto dispara de inmediato el tono parasimpático y ralentiza el nodo sinusal del corazón.",
    scienceNote: "Demostrado por el laboratorio de neurobiología de Stanford (Dr. Andrew Huberman).",
    actionableStep: "Haz 3 suspiros fisiológicos justo en los primeros 30 segundos tras terminar cada serie rápida.",
    icon: HeartPulse,
    color: "#06b6d4",
  },
  {
    id: "micro-focus",
    category: "intervals",
    categoryLabel: "Series & Umbral (R3/VAM)",
    title: "Micro-Enfoque 'Solo Esta Serie'",
    subtitle: "Prohibido pensar en cuántas repeticiones quedan",
    body: "El error mental número uno en las series es calcular mentalmente el sufrimiento futuro: 'Si voy reventado en la serie 2 de 5, ¿cómo voy a hacer la 4?'. En tu universo mental solo existe la repetición que estás corriendo. El resto del entrenamiento no existe hasta que suene el reloj.",
    scienceNote: "Elimina la ansiedad anticipatoria y preserva el gasto metabólico de la memoria de trabajo.",
    actionableStep: "Cuando arranques la serie, concéntrate únicamente en los primeros 100 metros. Repite este micro-foco hasta completarla.",
    icon: Sliders,
    color: "#8b5cf6",
  },
  {
    id: "finisher-effect",
    category: "intervals",
    categoryLabel: "Series & Umbral (R3/VAM)",
    title: "El Efecto Finisher (Últimos 200 Metros)",
    subtitle: "Entrena a tu mente para acelerar donde los demás claudican",
    body: "En los últimos 200 metros de una serie o en la recta final de un rodaje con ritmo objetivo, cuando tu cuerpo suplica frenar, adelanta ligeramente el centro de gravedad, relaja la cara y aumenta la cadencia de brazos. Al acelerar en el punto de máxima fatiga, reprogramas tu autoimagen como competidor.",
    scienceNote: "Fortalecimiento de la autoeficacia según la teoría cognitivo-social de Albert Bandura.",
    actionableStep: "En cada serie, en cuanto falten 200 metros, da 5 brazadas con más intención y cruza la marca con potencia.",
    icon: Sparkles,
    color: "#f43f5e",
  },

  // CUESTAS Y POTENCIA
  {
    id: "spring-metaphor",
    category: "hills",
    categoryLabel: "Cuestas & Potencia",
    title: "Metáfora del Resorte en Cuestas",
    subtitle: "Usa la elasticidad tendinosa en vez de desgastar glucógeno muscular",
    body: "Al subir una pendiente pronunciada, visualiza tus tendones de Aquiles y fascia plantar como resortes elásticos de titanio que te devuelven energía mecánica gratuita en cada impacto contra el suelo. Mantén la mirada en el horizonte (no en tus pies) y acorta la zancada manteniendo la cadencia rápida.",
    scienceNote: "El almacenamiento y retorno de energía elástica del tríceps sural reduce el costo metabólico del ascenso.",
    actionableStep: "En las cuestas explosivas, céntrate en apoyar el mediopié con ligereza y 'rebotar' hacia arriba.",
    icon: Zap,
    color: "#eab308",
  },
  {
    id: "past-the-crest",
    category: "hills",
    categoryLabel: "Cuestas & Potencia",
    title: "Las 5 Zancadas tras Coronar",
    subtitle: "No frenes en la cima: el triunfo psicológico está tras la pendiente",
    body: "El 90% de los corredores aflojan el paso exactamente al llegar a la cima de la cuesta. Entrena a tu cerebro para lo contrario: una vez coronada la pendiente, lanza 5 zancadas vivas y amplias en el llano antes de recuperar. Ahí es donde marcas la diferencia psicológica sobre el resto en competición.",
    scienceNote: "Condicionamiento operante de persistencia motriz post-obstáculo.",
    actionableStep: "Cuenta mentalmente: '1, 2, 3, 4, 5 zancadas fuertes' justo al terminar la pendiente.",
    icon: Target,
    color: "#14b8a6",
  },

  // CROSSFIT & FUERZA
  {
    id: "external-cue",
    category: "crossfit",
    categoryLabel: "CrossFit & Fuerza",
    title: "Foco Atencional Externo en Levantamientos",
    subtitle: "Multiplica el reclutamiento motor en sentadilla, peso muerto y empujes",
    body: "En un levantamiento pesado de halterofilia o powerlifting, no pienses en la contracción de tus cuádriceps ni glúteos (foco interno). Piensa en 'hundir los talones en el hormigón' o 'empujar el suelo lejos de mí con la máxima violencia' (foco externo).",
    scienceNote: "Gabriele Wulf (UNLV): el foco externo incrementa la fuerza electromiográfica efectiva y la eficiencia biomecánica hasta un 12%.",
    actionableStep: "Antes de tirar del peso muerto hoy, visualiza tus pies taladrando el suelo hacia el núcleo de la tierra.",
    icon: Dumbbell,
    color: "#a855f7",
  },
  {
    id: "3-second-transition",
    category: "crossfit",
    categoryLabel: "CrossFit & Fuerza",
    title: "La Regla de los 3 Segundos en WODs",
    subtitle: "Vence la parálisis del lactato entre estaciones de trabajo",
    body: "Durante los AMRAPs o metcons asfixiantes de CrossFit, el cerebro intentará convencerte de quedarte mirando la barra o el cajón con las manos en las rodillas. La indecisión cansa más que la propia repetición. Cuenta mentalmente '3, 2, 1' y agarra la mancuerna o la barra.",
    scienceNote: "La acción motriz inmediata suprime el bucle de rumiación de la red por defecto cerebral (DMN).",
    actionableStep: "En cuanto termines una estación, camina con paso firme hacia la siguiente, cuenta 3 segundos y arranca.",
    icon: Flame,
    color: "#f97316",
  },

  // DESCANSO Y ASIMILACIÓN
  {
    id: "athlete-guilt",
    category: "recovery",
    categoryLabel: "Descanso & Asimilación",
    title: "Desactivación de la Culpa del Atleta",
    subtitle: "Tu cuerpo no mejora mientras entrenas; mejora mientras descansas",
    body: "El entrenamiento es únicamente el estímulo catabólico que rompe fibras y vacía glucógeno. La mejora fisiológica real (creación de capilares, biogénesis mitocondrial, aumento del volumen plasmático) ocurre mientras duermes y descansas. El día de descanso es una sesión activa de construcción celular.",
    scienceNote: "La supercompensación fisiológica solo ocurre en balance parasimpático sostenido.",
    actionableStep: "Celebra los días de descanso con la misma satisfacción que un entrenamiento de 20 km bien ejecutado.",
    icon: BedDouble,
    color: "#38bdf8",
  },
  {
    id: "taper-phantoms",
    category: "recovery",
    categoryLabel: "Descanso & Asimilación",
    title: "Gestión de los 'Fantasmas del Taper'",
    subtitle: "Comprende los dolores imaginarios y dudas antes del maratón",
    body: "Durante las 2-3 semanas previas al Maratón de Madrid, al bajar drásticamente el volumen de kilómetros, tu mente inventará pinchazos en la rodilla, pesadez y dudas sobre tu capacidad. Es una desadaptación neuroquímica pasajera por la reducción de endorfinas. Confía en el proceso.",
    scienceNote: "La hipervigilancia propioceptiva previa a la competición es universal en atletas de resistencia.",
    actionableStep: "Cuando aparezca una duda, revisa tu historial de entrenamientos completados en la app. Los datos no mienten.",
    icon: ShieldCheck,
    color: "#10b981",
  },
];

export default function PsicologiaPage() {
  const toast = useToast();
  const [selectedCategory, setSelectedCategory] = useState<CategoryKey>("all");
  const [todaySession, setTodaySession] = useState<any>(null);
  const [mentalLog, setMentalLog] = useState({
    motivation: 4,
    mental_stress: 2,
    mental_energy: 4,
    focus_technique: "Chunking & Visualización",
    notes: "",
  });
  const [savingLog, setSavingLog] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"Inhala (4s)" | "Retén (4s)" | "Exhala (4s)" | "Pausa (4s)">("Inhala (4s)");
  const [isBreathingActive, setIsBreathingActive] = useState(false);

  // Cargar sesión de hoy y registro mental
  useEffect(() => {
    async function loadData() {
      try {
        const today = todayISO();
        // Cargar sesión de hoy
        const sRes = await fetch(`/api/sessions?date=${today}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.sessions && sData.sessions.length > 0) {
            setTodaySession(sData.sessions[0]);
          }
        }

        // Cargar registro mental
        const mRes = await fetch(`/api/mental?date=${today}`);
        if (mRes.ok) {
          const mData = await mRes.json();
          if (mData.log) {
            setMentalLog({
              motivation: mData.log.motivation ?? 4,
              mental_stress: mData.log.mental_stress ?? 2,
              mental_energy: mData.log.mental_energy ?? 4,
              focus_technique: mData.log.focus_technique ?? "Chunking & Visualización",
              notes: mData.log.notes ?? "",
            });
          }
        }
      } catch (err) {
        console.warn("Error cargando datos de psicología:", err);
      }
    }
    loadData();
  }, []);

  // Temporizador de respiración cuadrada (Box Breathing) para reseteo mental rápido
  useEffect(() => {
    if (!isBreathingActive) return;
    const phases: Array<"Inhala (4s)" | "Retén (4s)" | "Exhala (4s)" | "Pausa (4s)"> = [
      "Inhala (4s)",
      "Retén (4s)",
      "Exhala (4s)",
      "Pausa (4s)",
    ];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % phases.length;
      setBreathPhase(phases[idx]);
    }, 4000);
    return () => clearInterval(interval);
  }, [isBreathingActive]);

  // Tip del día adaptado automáticamente a la sesión de hoy
  const todayTip = useMemo(() => {
    if (todaySession?.notes) {
      const match = todaySession.notes.match(/- Enfoque Psicológico & Tip Mental:\s*([^\n]+)/i);
      if (match) {
        const raw = match[1].trim();
        const colon = raw.indexOf(":");
        return {
          title: colon > -1 ? raw.slice(0, colon).trim() : "Estrategia para Hoy",
          body: colon > -1 ? raw.slice(colon + 1).trim() : raw,
          source: "Plan de entrenamiento de hoy",
        };
      }
    }

    // Si hoy es CrossFit o carrera larga, asignamos uno clave
    const d = todaySession?.discipline || "carrera";
    if (d === "crossfit") {
      return {
        title: PSYCHO_TECHNIQUES[11].title,
        body: PSYCHO_TECHNIQUES[11].body,
        source: "Recomendado para CrossFit de hoy",
      };
    }
    return {
      title: PSYCHO_TECHNIQUES[0].title,
      body: PSYCHO_TECHNIQUES[0].body,
      source: "Estrategia base de resistencia",
    };
  }, [todaySession]);

  // Técnicas filtradas
  const filteredTechniques = useMemo(() => {
    if (selectedCategory === "all") return PSYCHO_TECHNIQUES;
    return PSYCHO_TECHNIQUES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  // Guardar check-in mental
  const handleSaveMentalLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingLog(true);
      haptics.medium();
      const res = await fetch("/api/mental", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayISO(),
          ...mentalLog,
        }),
      });
      if (!res.ok) throw new Error("Fallo al guardar registro mental");
      toast.push("success", "Check-in mental guardado correctamente");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error guardando";
      toast.push("error", message);
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto px-3 sm:px-4 pt-2">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Brain size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Psicología Deportiva & Foco Mental
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                Estrategias cognitivas, gestión del sufrimiento láctico y fortaleza para el Maratón de Madrid
              </p>
            </div>
          </div>
        </div>

        {/* Botón SOS de reseteo rápido */}
        <div>
          <button
            onClick={() => {
              setIsBreathingActive(!isBreathingActive);
              haptics.selection();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
              isBreathingActive
                ? "bg-purple-600 text-white border-purple-500 shadow-md animate-pulse"
                : "bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20"
            }`}
          >
            <HeartPulse size={15} />
            <span>{isBreathingActive ? "Pausar Respiración" : "Reseteo en 60s (Box Breathing)"}</span>
          </button>
        </div>
      </div>

      {/* Widget Interactivo de Respiración Cuadrada (si está activo) */}
      {isBreathingActive && (
        <div className="surface p-6 rounded-3xl border border-purple-500/40 bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-950 text-center space-y-3 animate-in shadow-xl">
          <div className="text-xs font-extrabold uppercase tracking-widest text-purple-400">
            Respiración Táctica Cuadrada (Protocolo Navy SEAL)
          </div>
          <div className="text-3xl font-black text-white font-mono tracking-tight animate-bounce">
            {breathPhase}
          </div>
          <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
            Sincroniza tu diafragma con el contador. Expande el estómago en la inhalación y relaja la mandíbula al exhalar para desactivar el cortisol antes de la sesión.
          </p>
        </div>
      )}

      {/* 1. HERO CARD: FOCO MENTAL DE HOY */}
      <div className="surface p-5 sm:p-6 rounded-3xl border border-purple-500/30 bg-gradient-to-br from-[#120B24] via-slate-900 to-[#0A0D18] relative overflow-hidden shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                Foco Mental del Día · {formatDateSpanish(todayISO())}
              </span>
              <h2 className="text-base sm:text-lg font-black text-foreground mt-0.5">
                {todayTip.title}
              </h2>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 shrink-0">
            {todayTip.source}
          </span>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
          <p className="text-xs sm:text-sm text-purple-100/90 leading-relaxed font-sans">
            {todayTip.body}
          </p>
        </div>

        {todaySession && (
          <div className="mt-3 flex items-center justify-between text-xs text-muted pt-2 border-t border-purple-500/20">
            <span className="font-semibold text-slate-300">
              Sesión vinculada: <span className="text-purple-300">{todaySession.planned_code || todaySession.discipline}</span>
            </span>
            <Link href="/hoy" className="flex items-center gap-1 font-bold text-purple-400 hover:text-purple-300">
              <span>Ver entrenamiento</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}
      </div>

      {/* 2. CHECK-IN MENTAL DIARIO (REGISTRO INTERACTIVO) */}
      <div className="surface p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-foreground flex items-center gap-2">
              <Sliders size={18} className="text-purple-400" />
              <span>Check-in de Disposición Psicológica</span>
            </h3>
            <p className="text-xs text-muted">
              Evalúa tu nivel de motivación, estrés y energía cognitiva para correlacionar con tu rendimiento
            </p>
          </div>
          <span className="text-[10px] font-mono text-muted uppercase">Registro Diario</span>
        </div>

        <form onSubmit={handleSaveMentalLog} className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Motivación */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase">Motivación</span>
                <span className="text-sm font-black text-emerald-400 font-mono">{mentalLog.motivation} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={mentalLog.motivation}
                onChange={(e) => setMentalLog({ ...mentalLog, motivation: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted">
                <span>Baja</span>
                <span>Óptima</span>
                <span>Fuego</span>
              </div>
            </div>

            {/* Estrés Mental */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase">Estrés Externo</span>
                <span className={`text-sm font-black font-mono ${mentalLog.mental_stress <= 2 ? "text-emerald-400" : "text-amber-400"}`}>
                  {mentalLog.mental_stress} / 5
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={mentalLog.mental_stress}
                onChange={(e) => setMentalLog({ ...mentalLog, mental_stress: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted">
                <span>Zen (Bajo)</span>
                <span>Moderado</span>
                <span>Alto</span>
              </div>
            </div>

            {/* Energía Cognitiva */}
            <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted uppercase">Energía Mental</span>
                <span className="text-sm font-black text-purple-400 font-mono">{mentalLog.mental_energy} / 5</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={mentalLog.mental_energy}
                onChange={(e) => setMentalLog({ ...mentalLog, mental_energy: parseInt(e.target.value, 10) })}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted">
                <span>Agotado</span>
                <span>Despejado</span>
                <span>Afilado</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-muted uppercase">Técnica Mental Seleccionada</label>
              <input
                type="text"
                value={mentalLog.focus_technique}
                onChange={(e) => setMentalLog({ ...mentalLog, focus_technique: e.target.value })}
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-foreground focus:outline-hidden focus:border-purple-500"
                placeholder="Ej: Chunking de 4 km, Suspiro fisiológico..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted uppercase">Diálogo Interno / Sensaciones</label>
              <input
                type="text"
                value={mentalLog.notes}
                onChange={(e) => setMentalLog({ ...mentalLog, notes: e.target.value })}
                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-foreground focus:outline-hidden focus:border-purple-500"
                placeholder="Sensación previa, intención de la sesión..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              disabled={savingLog}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
            >
              {savingLog ? "Guardando..." : "Guardar Check-in Mental"}
            </Button>
          </div>
        </form>
      </div>

      {/* 3. CATÁLOGO COMPLETO DE TÉCNICAS PSICOLÓGICAS */}
      <div className="surface p-5 sm:p-6 rounded-3xl border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <BookOpen size={18} className="text-purple-400" />
              <span>Catálogo & Protocolos de Psicología Aplicada</span>
            </h3>
            <p className="text-xs text-muted">
              Herramientas probadas por la neurociencia del deporte para desbloquear rendimiento
            </p>
          </div>

          {/* Filtros de Categoría */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { id: "all", label: "Todas" },
              { id: "marathon", label: "Tirada & Maratón" },
              { id: "intervals", label: "Series / Umbral" },
              { id: "hills", label: "Cuestas" },
              { id: "crossfit", label: "CrossFit" },
              { id: "recovery", label: "Descanso" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as CategoryKey)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-slate-900 text-muted hover:text-foreground border border-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rejilla de Técnicas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {filteredTechniques.map((tech) => {
            const Icon = tech.icon;
            return (
              <div
                key={tech.id}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-purple-500/30 transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border"
                      style={{
                        backgroundColor: `${tech.color}15`,
                        borderColor: `${tech.color}30`,
                        color: tech.color,
                      }}
                    >
                      {tech.categoryLabel}
                    </span>
                    <Icon size={16} style={{ color: tech.color }} />
                  </div>

                  <h4 className="text-base font-bold text-foreground leading-snug">
                    {tech.title}
                  </h4>
                  <div className="text-xs text-purple-300/80 font-medium mt-0.5">
                    {tech.subtitle}
                  </div>

                  <p className="text-xs text-muted leading-relaxed mt-2.5">
                    {tech.body}
                  </p>

                  {tech.scienceNote && (
                    <div className="mt-2.5 p-2 rounded-lg bg-slate-950/50 border border-slate-800/80 text-[11px] text-slate-400 italic">
                      🔬 {tech.scienceNote}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800/80">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Paso Práctico:
                  </div>
                  <div className="text-xs font-semibold text-slate-200">
                    👉 {tech.actionableStep}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
