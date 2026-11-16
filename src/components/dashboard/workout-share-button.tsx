"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { WorkoutShareCardModal } from "@/components/modals/workout-share-card-modal";
import type { WorkoutCardData } from "@/lib/workout-card-generator";

export function WorkoutShareButton({ workout }: { workout: WorkoutCardData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all harbiz-press cursor-pointer"
        style={{
          background: "var(--color-brand)",
          minHeight: 36,
          border: "none",
        }}
        title="Generar tarjeta resumen 9:16 para compartir o descargar"
      >
        <Sparkles size={14} />
        <span>Tarjeta Resumen</span>
      </button>

      <WorkoutShareCardModal
        isOpen={open}
        onClose={() => setOpen(false)}
        workout={workout}
      />
    </>
  );
}
