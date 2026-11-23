"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabase, isSupabaseBrowserConfigured } from "@/lib/supabase/client";
import type { UserProfile } from "@/types/profile";

interface AuthContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isConfigured = isSupabaseBrowserConfigured();

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

  useEffect(() => {
    if (!isConfigured) {
      // Modo local/offline: cargar perfil de SQLite por defecto
      fetchProfile("default_user").finally(() => setLoading(false));
      return;
    }

    const supabase = createBrowserSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Comprobar sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de estado de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (event === "SIGNED_IN" && currentUser) {
        // Si el usuario que inicia sesión es Daniel Espinosa, ejecutar auto-migración
        const email = currentUser.email?.toLowerCase() || "";
        if (email === "danielespinosa@entrenoapp.es" || email.includes("daniel")) {
          try {
            await fetch("/api/profile/migrate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ user_id: currentUser.id }),
            });
          } catch {}
        }
        await fetchProfile(currentUser.id);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isConfigured, fetchProfile]);

  const signInWithGoogle = async () => {
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
    const supabase = createBrowserSupabase();
    if (!supabase) return { error: new Error("Supabase no configurado") };

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    const supabase = createBrowserSupabase();
    if (!supabase) return { error: new Error("Supabase no configurado") };

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const supabase = createBrowserSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
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
        isConfigured,
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
