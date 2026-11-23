import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-native";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ user: null, profile: null });
    }

    const db = getDb();
    const profile = db.prepare("SELECT * FROM profiles WHERE id = ?").get(session.userId);
    const account = db.prepare("SELECT full_name FROM auth_accounts WHERE id = ?").get(session.userId) as { full_name?: string } | undefined;

    return NextResponse.json({
      user: {
        id: session.userId,
        email: session.email,
        role: session.role,
        full_name: account?.full_name || (profile as any)?.full_name || "Atleta",
      },
      profile: profile || null,
    });
  } catch (err: any) {
    console.error("[API Auth Me] Error:", err);
    return NextResponse.json({ user: null, profile: null });
  }
}
