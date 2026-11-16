"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Error capturado:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="surface p-4 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 text-left my-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
            <AlertTriangle size={16} />
            <span className="font-bold text-xs sm:text-sm">
              {this.props.fallbackTitle || "Módulo temporalmente no disponible"}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2.5">
            {this.props.fallbackMessage ||
              "Ha ocurrido un error al cargar este elemento. Pulsa para reintentar."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-2xs"
          >
            <RefreshCw size={12} />
            <span>Reintentar</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
