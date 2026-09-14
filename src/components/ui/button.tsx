"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", loading, icon, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`btn ${VARIANT_CLASS[variant]} ${icon ? "btn-icon" : ""} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" size={16} /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
