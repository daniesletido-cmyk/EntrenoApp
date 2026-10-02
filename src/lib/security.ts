"use client";

// Sistema de Seguridad y Bloqueo para EntrenoApp
// Utiliza Web Crypto API para hash SHA-256 nativo, seguro y sin dependencias

const STORAGE_KEY_ENABLED = "entrenoapp_lock_enabled";
const STORAGE_KEY_TYPE = "entrenoapp_lock_type";
const STORAGE_KEY_HASH = "entrenoapp_lock_hash";
const SESSION_KEY_UNLOCKED = "entrenoapp_session_unlocked";
const APP_SALT = "entrenoapp_secure_salt_2026";

export type LockType = "pin" | "password";

/**
 * Genera el hash SHA-256 de una contraseña o PIN con salt
 */
export async function hashSecret(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${APP_SALT}:${secret.trim()}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Comprueba si el bloqueo por PIN/contraseña está activo en el dispositivo
 */
export function isAppLockEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY_ENABLED) === "true";
  } catch {
    return false;
  }
}

/**
 * Obtiene el tipo de bloqueo configurado ('pin' o 'password')
 */
export function getAppLockType(): LockType {
  if (typeof window === "undefined") return "pin";
  try {
    const t = localStorage.getItem(STORAGE_KEY_TYPE);
    return t === "password" ? "password" : "pin";
  } catch {
    return "pin";
  }
}

/**
 * Comprueba si la sesión actual del navegador / app ya fue desbloqueada
 */
export function isSessionUnlocked(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(SESSION_KEY_UNLOCKED) === "true";
  } catch {
    return true;
  }
}

/**
 * Marca la sesión como desbloqueada
 */
export function unlockSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY_UNLOCKED, "true");
  } catch {}
}

/**
 * Bloquea la sesión actual para obligar a introducir el PIN de nuevo
 */
export function lockSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY_UNLOCKED);
    window.dispatchEvent(new CustomEvent("entrenoapp:lock"));
  } catch {}
}

/**
 * Valida si el secret introducido coincide con el hash guardado
 */
export async function verifyAppLock(secret: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const savedHash = localStorage.getItem(STORAGE_KEY_HASH);
    if (!savedHash) return true;
    const computedHash = await hashSecret(secret);
    return computedHash === savedHash;
  } catch {
    return false;
  }
}

/**
 * Configura o modifica el PIN / contraseña
 */
export async function setAppLock(secret: string, type: LockType): Promise<void> {
  if (typeof window === "undefined") return;
  const hash = await hashSecret(secret);
  localStorage.setItem(STORAGE_KEY_ENABLED, "true");
  localStorage.setItem(STORAGE_KEY_TYPE, type);
  localStorage.setItem(STORAGE_KEY_HASH, hash);
  unlockSession();
  window.dispatchEvent(new CustomEvent("entrenoapp:security_changed"));
}

/**
 * Desactiva y elimina el PIN / contraseña de la app
 */
export function removeAppLock(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY_ENABLED);
  localStorage.removeItem(STORAGE_KEY_TYPE);
  localStorage.removeItem(STORAGE_KEY_HASH);
  sessionStorage.removeItem(SESSION_KEY_UNLOCKED);
  window.dispatchEvent(new CustomEvent("entrenoapp:security_changed"));
}
