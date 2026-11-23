"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { AuthScreen } from "@/components/auth/auth-screen";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/landing", "/api/biometria/sync"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, isConfigured } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading || !isConfigured) return;

    // Si el usuario está autenticado pero aún no completó el onboarding
    if (user && profile && !profile.onboarded && pathname !== "/onboarding") {
      router.push("/onboarding");
    }
  }, [user, profile, loading, isConfigured, pathname, router]);

  // Durante la carga inicial, dejar pasar para no bloquear la animación de splash
  if (loading) {
    return <>{children}</>;
  }

  // Si Supabase está configurado en producción y no hay usuario autenticado
  if (isConfigured && !user) {
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      return <>{children}</>;
    }
    return <AuthScreen />;
  }

  return <>{children}</>;
}
