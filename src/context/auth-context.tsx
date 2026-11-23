"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createBrowserSupabase, isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/profile";

export interface AppUser {
  id: string;
  email?: string;
  role?: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface AuthContextType {
  user: AppUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isSupabaseConfigured = isSupabaseBrowserConfigured();

  const fetchProfile = useCallback(async (currentUserId?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (currentUserId) {
        headers["x-user-id"] = currentUserId;
      }
      const res = await fetch("/api/profile", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (err) {
      console.warn("[Auth] Error cargando perfil:", err);
    }
  }, []);

  // Comprobar sesión al iniciar (Supabase o Nativo)
  useEffect(() => {
    async function initSession() {
      // 1. Si Supabase está configurado, escuchar cambios de Supabase
      if (isSupabaseConfigured) {
        const supabase = createBrowserSupabase();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              user_metadata: session.user.user_metadata as any,
            });
            await fetchProfile(session.user.id);
            setLoading(false);
            return;
          }
        }
      }

      // 2. Comprobar sesión nativa en servidor (/api/auth/me)
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser({
              id: data.user.id,
              email: data.user.email,
              role: data.user.role,
              user_metadata: { full_name: data.user.full_name },
            });
            if (data.profile) {
              setProfile(data.profile);
            } else {
              await fetchProfile(data.user.id);
            }
          }
        }
      } catch (err) {
        console.warn("[Auth] Error verificando sesión nativa:", err);
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [isSupabaseConfigured, fetchProfile]);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      return {
        error: new Error("Para acceder con Google, inicia sesión con tu Email o añade las claves de Supabase."),
      };
    }

    const supabase = createBrowserSupabase();
    if (!supabase) return { error: new Error("Supabase no configurado") };

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    return { error: error as Error | null };
  };

  const signInWithEmail = async (email: string, password: string) => {
    // 1. Probar Supabase si está disponible
    if (isSupabaseConfigured) {
      const supabase = createBrowserSupabase();
      if (supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error && data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            user_metadata: data.user.user_metadata as any,
          });
          await fetchProfile(data.user.id);
          return { error: null };
        }
      }
    }

    // 2. Probar autenticación nativa
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: new Error(data.error || "Error al iniciar sesión") };
      }

      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        user_metadata: { full_name: data.user.full_name },
      });
      if (data.profile) {
        setProfile(data.profile);
      } else {
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Error de red al iniciar sesión") };
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    // 1. Probar Supabase si está disponible
    if (isSupabaseConfigured) {
      const supabase = createBrowserSupabase();
      if (supabase) {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${origin}/auth/callback`,
          },
        });
        if (!error && data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email,
            user_metadata: { full_name: fullName },
          });
          await fetchProfile(data.user.id);
          return { error: null };
        }
      }
    }

    // 2. Registro nativo
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { error: new Error(data.error || "Error al registrar cuenta") };
      }

      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        user_metadata: { full_name: data.user.full_name },
      });
      if (data.profile) {
        setProfile(data.profile);
      } else {
        await fetchProfile(data.user.id);
      }
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Error de red al registrar") };
    }
  };

  const signOut = async () => {
    // Cerrar en Supabase si está disponible
    if (isSupabaseConfigured) {
      const supabase = createBrowserSupabase();
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
    }

    // Cerrar sesión nativa
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}

    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await fetchProfile(user?.id);
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user?.id) headers["x-user-id"] = user.id;

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers,
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        await refreshProfile();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isConfigured: true, // El sistema de autenticación multi-tenant siempre está activo
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
