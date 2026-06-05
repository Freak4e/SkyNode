import type { Provider, Session, User } from "@supabase/supabase-js";
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    profile?: {
      firstName: string;
      lastName: string;
      avatarUrl?: string;
    },
  ) => Promise<"created" | "already_exists" | "confirmation_required">;
  signInWithProvider: (provider: Provider, redirectTo: string) => Promise<void>;
  signOut: () => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const productionSiteUrl = "https://sky-node-three.vercel.app";

export function authRedirectUrl(path = "/"): string {
  const configuredSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || import.meta.env.VITE_APP_URL;
  const origin = (configuredSiteUrl || (import.meta.env.PROD ? productionSiteUrl : window.location.origin)).replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${origin}${normalizedPath}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    supabase.auth.getSession()
      .then(({ data }) => {
        if (mounted) {
          setSession(data.session);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user || null,
    session,
    loading,
    async signIn(email: string, password: string) {
      if (!supabase) throw new Error("Auth is disabled: missing Supabase environment variables.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        throw error;
      }
    },
    async signUp(email: string, password: string, profile) {
      if (!supabase) throw new Error("Auth is disabled: missing Supabase environment variables.");
      const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : undefined;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: authRedirectUrl("/"),
          data: profile
            ? {
              first_name: profile.firstName,
              last_name: profile.lastName,
              full_name: fullName,
              avatar_url: profile.avatarUrl,
            }
            : undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return "already_exists";
      }

      if (!data.session) {
        return "confirmation_required";
      }

      return "created";
    },
    async signInWithProvider(provider: Provider, redirectTo: string) {
      if (!supabase) throw new Error("Auth is disabled: missing Supabase environment variables.");
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      });

      if (error) {
        throw error;
      }
    },
    async signOut() {
      if (!supabase) throw new Error("Auth is disabled: missing Supabase environment variables.");
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    },
    async updatePassword(password: string) {
      if (!supabase) throw new Error("Auth is disabled: missing Supabase environment variables.");
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
