import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createBaseClient } from "@supabase/supabase-js";
import { getSessionUser } from "@/lib/auth-native";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key && url.startsWith("https://") && !url.includes("your-project"));
}

export async function createServerSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL)!;
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)!;

  try {
    const cookieStore = await cookies();

    return createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as CookieOptions)
            );
          } catch {
            // Se puede ignorar si se llama desde Server Component de solo lectura
          }
        },
      },
    });
  } catch (err) {
    // Si cookies() no está disponible (ej. en ciertos contextos de script)
    return createBaseClient(url, key);
  }
}

/**
 * Cliente con permisos de Administrador (Service Role) para migraciones o tareas del sistema
 */
export function createAdminSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey || !url.startsWith("https://") || url.includes("your-project")) {
    return null;
  }

  return createBaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Obtiene el usuario autenticado actual a partir del token o cookies de sesión
 */
export async function getAuthenticatedUser(req?: Request) {
  // 1. Probar Bearer token en headers
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
      if (url && anonKey) {
        const client = createBaseClient(url, anonKey);
        const { data: { user }, error } = await client.auth.getUser(token);
        if (user && !error) return user;
      }
    }
  }

  // 2. Probar sesión por cookies de Supabase
  const supabase = await createServerSupabase();
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) return user;
    } catch {}
  }

  // 3. Probar sesión nativa (cookies entrenoapp_session o header)
  const native = await getSessionUser(req);
  if (native) {
    return {
      id: native.userId,
      email: native.email,
      role: native.role,
      user_metadata: {
        full_name: native.role === "owner" ? "Daniel Espinosa" : "Atleta",
      },
    } as any;
  }

  return null;
}
