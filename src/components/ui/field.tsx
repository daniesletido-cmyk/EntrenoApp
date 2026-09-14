"use client";

import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef, useId } from "react";

interface FieldWrapProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string) => React.ReactNode;
}

function FieldWrap({ label, hint, error, required, children }: FieldWrapProps) {
  const id = useId();
  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span style={{ color: "var(--color-danger)" }}> *</span>}
        </label>
      )}
      {children(id)}
      {error ? (
        <p className="text-xs mt-1" style={{ color: "var(--color-danger)" }} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs mt-1 text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & Omit<FieldWrapProps, "children">;
export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, hint, error, required, className = "", ...props }, ref) => (
  <FieldWrap label={label} hint={hint} error={error} required={required}>
    {(id) => <input ref={ref} id={id} className={`field ${className}`} aria-invalid={!!error} {...props} />}
  </FieldWrap>
));
Input.displayName = "Input";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & Omit<FieldWrapProps, "children">;
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, required, className = "", ...props }, ref) => (
    <FieldWrap label={label} hint={hint} error={error} required={required}>
      {(id) => <textarea ref={ref} id={id} className={`field ${className}`} aria-invalid={!!error} {...props} />}
    </FieldWrap>
  )
);
Textarea.displayName = "Textarea";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & Omit<FieldWrapProps, "children">;
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, required, className = "", children, ...props }, ref) => (
    <FieldWrap label={label} hint={hint} error={error} required={required}>
      {(id) => (
        <select ref={ref} id={id} className={`field ${className}`} aria-invalid={!!error} {...props}>
          {children}
        </select>
      )}
    </FieldWrap>
  )
);
Select.displayName = "Select";
