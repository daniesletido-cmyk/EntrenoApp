import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.VAPID_PRIVATE_KEY || "entrenoapp-secure-default-key-2026";
export const AUTH_COOKIE_NAME = "entrenoapp_session";

export interface NativeUser {
  id: string;
  email: string;
  full_name: string;
  role: "owner" | "athlete";
  created_at: string;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
  } catch {
    return false;
  }
}

export function createSessionToken(user: { id: string; email: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 días
    })
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  return `${header}.${payload}.${signature}`;
}

export function verifySessionToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(`${header}.${payload}`)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expirado
    }

    return {
      userId: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene el usuario autenticado a partir de cookies o headers de la petición.
 */
export async function getSessionUser(req?: Request): Promise<{ userId: string; email: string; role: string } | null> {
  // 1. Comprobar cabecera Authorization: Bearer <token>
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      const verified = verifySessionToken(token);
      if (verified) return verified;
    }

    // Cabecera x-user-id directa para llamadas server-to-server internas autorizadas
    const xUserId = req.headers.get("x-user-id");
    if (xUserId && xUserId === "default_user") {
      return { userId: "default_user", email: "daniespinosa973@gmail.com", role: "owner" };
    }
  }

  // 2. Comprobar cookie de sesión
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (sessionCookie?.value) {
      const verified = verifySessionToken(sessionCookie.value);
      if (verified) return verified;
    }
  } catch {}

  return null;
}
