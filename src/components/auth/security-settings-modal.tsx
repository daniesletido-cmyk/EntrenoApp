"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Lock, KeyRound, ShieldAlert, Check, X, Eye, EyeOff } from "lucide-react";
import {
  isAppLockEnabled,
  getAppLockType,
  verifyAppLock,
  setAppLock,
  removeAppLock,
  lockSession,
  LockType,
} from "@/lib/security";

interface SecuritySettingsModalProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function SecuritySettingsModal({ open, onClose, onChanged }: SecuritySettingsModalProps) {
  const currentlyEnabled = isAppLockEnabled();
  const currentType = getAppLockType();

  const [mode, setMode] = useState<"configure" | "change" | "remove">(
    currentlyEnabled ? "change" : "configure"
  );
  const [selectedType, setSelectedType] = useState<LockType>(currentType);

  // Campos de formulario
  const [currentSecret, setCurrentSecret] = useState("");
  const [newSecret, setNewSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const resetForm = () => {
    setCurrentSecret("");
    setNewSecret("");
    setConfirmSecret("");
    setErrorMsg("");
    setShowSecret(false);
  };

  const handleSave = async () => {
    setErrorMsg("");
    setSaving(true);

    try {
      // 1. Si ya había bloqueo, verificar el secreto actual
      if (currentlyEnabled) {
        const isCurrentValid = await verifyAppLock(currentSecret);
        if (!isCurrentValid) {
          setErrorMsg(currentType === "pin" ? "El PIN actual no es correcto" : "La contraseña actual no es correcta");
          setSaving(false);
          return;
        }
      }

      // 2. Si es modo eliminación
      if (mode === "remove") {
        removeAppLock();
        onChanged();
        onClose();
        return;
      }

      // 3. Validar nuevo secreto
      if (!newSecret.trim()) {
        setErrorMsg("Debes introducir un valor");
        setSaving(false);
        return;
      }

      if (selectedType === "pin") {
        if (!/^\d{4}$|^\d{6}$/.test(newSecret.trim())) {
          setErrorMsg("El PIN debe tener exactamente 4 o 6 números");
          setSaving(false);
          return;
        }
      } else {
        if (newSecret.length < 4) {
          setErrorMsg("La contraseña debe tener al menos 4 caracteres");
          setSaving(false);
          return;
        }
      }

      if (newSecret !== confirmSecret) {
        setErrorMsg("Las confirmaciones no coinciden");
        setSaving(false);
        return;
      }

      // 4. Guardar
      await setAppLock(newSecret, selectedType);
      onChanged();
      onClose();
    } catch {
      setErrorMsg("Ocurrió un error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      onClose={onClose}
      title={
        !currentlyEnabled
          ? "Configurar Bloqueo de la App"
          : mode === "remove"
          ? "Quitar Bloqueo de la App"
          : "Modificar PIN / Contraseña"
      }
    >
      <div className="grid gap-4">
        {/* Selector de modo si ya está activo */}
        {currentlyEnabled && (
          <div className="flex items-center gap-2 p-1 surface-raised" style={{ borderRadius: "var(--radius-md)" }}>
            <button
              type="button"
              onClick={() => {
                setMode("change");
                resetForm();
              }}
              className={`btn ${mode === "change" ? "btn-primary" : "btn-ghost"} text-xs flex-1`}
              style={{ padding: "0.4rem 0.5rem" }}
            >
              Cambiar clave
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("remove");
                resetForm();
              }}
              className={`btn ${mode === "remove" ? "btn-danger" : "btn-ghost"} text-xs flex-1`}
              style={{ padding: "0.4rem 0.5rem" }}
            >
              Desactivar bloqueo
            </button>
          </div>
        )}

        {/* Si ya estaba activo, solicitar el PIN/contraseña actual */}
        {currentlyEnabled && (
          <div>
            <label className="text-xs font-semibold uppercase text-muted" style={{ marginBottom: 4, display: "block" }}>
              {currentType === "pin" ? "PIN actual:" : "Contraseña actual:"}
            </label>
            <Input
              type={currentType === "pin" ? "password" : "password"}
              pattern={currentType === "pin" ? "[0-9]*" : undefined}
              inputMode={currentType === "pin" ? "numeric" : "text"}
              value={currentSecret}
              onChange={(e) => setCurrentSecret(e.target.value)}
              placeholder={currentType === "pin" ? "Introduce tu PIN actual" : "Introduce tu contraseña actual"}
              autoFocus
            />
          </div>
        )}

        {/* Configurar nuevo PIN o Contraseña (solo si no es modo eliminar) */}
        {mode !== "remove" && (
          <>
            {/* Selector de tipo (PIN vs Contraseña) */}
            <div>
              <span className="text-xs font-semibold uppercase text-muted" style={{ marginBottom: 6, display: "block" }}>
                Tipo de protección:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedType("pin")}
                  className={`surface-interactive text-left p-2.5 rounded-lg border ${
                    selectedType === "pin" ? "border-brand bg-brand-subtle" : "border-border"
                  }`}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <KeyRound size={18} className={selectedType === "pin" ? "text-brand" : "text-muted"} />
                  <div>
                    <div className="font-semibold text-xs">PIN Numérico</div>
                    <div className="text-faint text-xs">4 o 6 números (Rápido)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedType("password")}
                  className={`surface-interactive text-left p-2.5 rounded-lg border ${
                    selectedType === "password" ? "border-brand bg-brand-subtle" : "border-border"
                  }`}
                  style={{ display: "flex", alignItems: "center", gap: 8 }}
                >
                  <Lock size={18} className={selectedType === "password" ? "text-brand" : "text-muted"} />
                  <div>
                    <div className="font-semibold text-xs">Contraseña</div>
                    <div className="text-faint text-xs">Letras y números</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Nuevo valor */}
            <div>
              <label className="text-xs font-semibold uppercase text-muted" style={{ marginBottom: 4, display: "block" }}>
                {selectedType === "pin" ? "Nuevo PIN (4 o 6 dígitos):" : "Nueva Contraseña:"}
              </label>
              <div style={{ position: "relative" }}>
                <Input
                  type={showSecret ? "text" : selectedType === "pin" ? "password" : "password"}
                  pattern={selectedType === "pin" ? "[0-9]*" : undefined}
                  inputMode={selectedType === "pin" ? "numeric" : "text"}
                  maxLength={selectedType === "pin" ? 6 : 40}
                  value={newSecret}
                  onChange={(e) => setNewSecret(e.target.value)}
                  placeholder={selectedType === "pin" ? "Ej: 1234" : "Introduce una contraseña"}
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="btn btn-ghost"
                  style={{
                    position: "absolute",
                    right: 4,
                    top: 4,
                    bottom: 4,
                    width: 32,
                    height: 32,
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title={showSecret ? "Ocultar" : "Mostrar"}
                >
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirmar valor */}
            <div>
              <label className="text-xs font-semibold uppercase text-muted" style={{ marginBottom: 4, display: "block" }}>
                {selectedType === "pin" ? "Confirmar nuevo PIN:" : "Confirmar nueva Contraseña:"}
              </label>
              <Input
                type="password"
                pattern={selectedType === "pin" ? "[0-9]*" : undefined}
                inputMode={selectedType === "pin" ? "numeric" : "text"}
                maxLength={selectedType === "pin" ? 6 : 40}
                value={confirmSecret}
                onChange={(e) => setConfirmSecret(e.target.value)}
                placeholder={selectedType === "pin" ? "Repite los dígitos" : "Repite la contraseña"}
              />
            </div>
          </>
        )}

        {/* Mensaje de aviso al desactivar */}
        {mode === "remove" && (
          <div
            style={{
              padding: "var(--space-3)",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              fontSize: "var(--text-xs)",
              color: "#f87171",
            }}
          >
            Al desactivar el bloqueo, cualquier persona con acceso a tu dispositivo podrá abrir EntrenoApp directamente sin necesidad de clave.
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              color: "var(--color-danger, #ef4444)",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex items-center justify-end gap-2" style={{ marginTop: "var(--space-2)" }}>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant={mode === "remove" ? "danger" : "primary"}
            onClick={handleSave}
            loading={saving}
          >
            {mode === "remove"
              ? "Desactivar bloqueo"
              : currentlyEnabled
              ? "Actualizar clave"
              : "Guardar y Activar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
