"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[NextAppError] Error en la ruta:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="surface p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 max-w-md w-full text-center shadow-lg space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
          <AlertTriangle size={28} />
        </div>

        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Algo no ha cargado como se esperaba
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
            Se ha producido un error inesperado al renderizar la vista. Tus datos locales y entrenamientos están a salvo.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <RefreshCw size={14} />
            <span>Reintentar</span>
          </button>
          <Link
            href="/hoy"
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center gap-1.5 transition-all no-underline"
          >
            <Home size={14} />
            <span>Ir a Hoy</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
