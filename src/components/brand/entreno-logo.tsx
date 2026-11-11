import React from "react";

interface EntrenoLogoProps {
  size?: number;
  className?: string;
}

/**
 * Isotipo vectorial oficial de EntrenoApp:
 * Monograma geométrico deportivo "E" combinado con barras ascendentes inclinadas.
 * Paleta estricta: Rojo Carmín Deportivo Mate (#DC2626) y Blanco Puro (#FFFFFF).
 */
export function EntrenoLogo({ size = 32, className = "" }: EntrenoLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-label="EntrenoApp"
    >
      <rect width="512" height="512" rx="118" fill="#DC2626" />
      <path d="M138 124H202L174 388H110L138 124Z" fill="#FFFFFF" />
      <path d="M198 124H402L388 184H184L198 124Z" fill="#FFFFFF" />
      <path d="M181 226H350L336 286H167L181 226Z" fill="#FFFFFF" />
      <path d="M164 328H392L378 388H150L164 328Z" fill="#FFFFFF" />
    </svg>
  );
}
