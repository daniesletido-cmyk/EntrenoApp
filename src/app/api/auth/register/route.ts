import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { hashPassword, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth-native";

export async function POST(req: Request) {
  try {
    const { email, password, full_name } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Introduce un email válido" }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }
    const cleanName = (full_name || email.split("@")[0]).trim();

    const db = getDb();

    // Comprobar si ya existe una cuenta con este email
    const existing = db.prepare("SELECT id FROM auth_accounts WHERE email = ?").get(email.toLowerCase().trim()) as { id: string } | undefined;
    if (existing) {
      return NextResponse.json({ error: "Ya existe una cuenta registrada con este correo electrónico" }, { status: 409 });
    }

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);
    const now = new Date().toISOString();
    const webhookToken = `whk_${crypto.randomBytes(16).toString("hex")}`;

    // Insertar en auth_accounts
    db.prepare(`
      INSERT INTO auth_accounts (id, email, password_hash, full_name, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'athlete', ?, ?)
    `).run(userId, email.toLowerCase().trim(), passwordHash, cleanName, now, now);

    // Crear perfil nuevo en estado pendiente de onboarding
    db.prepare(`
      INSERT INTO profiles (
        id, email, full_name, role, vam_pace, vam_sec_km, target_distance,
        days_per_week, webhook_token, onboarded, created_at, updated_at
      ) VALUES (?, ?, ?, 'athlete', '4:30', 270, '10K', 3, ?, 0, ?, ?)
    `).run(userId, email.toLowerCase().trim(), cleanName, webhookToken, now, now);

    const userObj = {
      id: userId,
      email: email.toLowerCase().trim(),
      role: "athlete" as const,
      full_name: cleanName,
    };

    const token = createSessionToken(userObj);

    const res = NextResponse.json({
      success: true,
      user: userObj,
      profile: {
        id: userId,
        email: email.toLowerCase().trim(),
        full_name: cleanName,
        role: "athlete",
        onboarded: 0,
        webhook_token: webhookToken,
      },
    });

    res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 días
      path: "/",
    });

    return res;
  } catch (err: any) {
    console.error("[API Auth Register] Error:", err);
    return NextResponse.json({ error: err.message || "Error al registrar la cuenta" }, { status: 500 });
  }
}
