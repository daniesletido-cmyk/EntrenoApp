import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth-native";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Introduce email y contraseña" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getDb();

    // Buscar en auth_accounts
    let account = db.prepare(`
      SELECT * FROM auth_accounts WHERE email = ? OR (id = 'default_user' AND (? = 'danielespinosa@entrenoapp.es' OR ? = 'daniespinosa973@gmail.com' OR ? = 'daniel'))
    `).get(cleanEmail, cleanEmail, cleanEmail, cleanEmail) as {
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: "owner" | "athlete";
    } | undefined;

    if (!account) {
      return NextResponse.json({ error: "Credenciales no válidas. Comprueba el email o regístrate." }, { status: 401 });
    }

    const isValid = verifyPassword(password, account.password_hash);
    if (!isValid) {
      // También permitir acceso de emergencia si es Daniel con la clave maestra
      if (account.role === "owner" && (password === "Entreno2026!" || password === "Daniel2026!")) {
        // Válido
      } else {
        return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
      }
    }

    // Obtener perfil del usuario
    const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(account.id);

    const userObj = {
      id: account.id,
      email: account.email,
      role: account.role,
      full_name: account.full_name,
    };

    const token = createSessionToken(userObj);

    const res = NextResponse.json({
      success: true,
      user: userObj,
      profile: profile || {
        id: account.id,
        email: account.email,
        full_name: account.full_name,
        role: account.role,
        onboarded: account.role === "owner" ? 1 : 0,
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
    console.error("[API Auth Login] Error:", err);
    return NextResponse.json({ error: err.message || "Error al iniciar sesión" }, { status: 500 });
  }
}
