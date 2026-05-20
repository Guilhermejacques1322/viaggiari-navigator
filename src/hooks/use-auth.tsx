import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "client";

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: Role[];
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  // `loading` representa APENAS o boot inicial. Depois que resolvemos a
  // sessão inicial (com ou sem usuário) ele nunca mais volta a true —
  // assim refresh de token em background não desmonta a árvore.
  const [loading, setLoading] = useState(true);
  const currentUserId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadRolesFor(userId: string) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      if (error) console.error("loadRoles error:", error);
      if (!mounted) return;
      setRoles((data ?? []).map((r) => r.role as Role));
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Sempre sincroniza session/user — mas NÃO mexe em `loading`, e só
      // recarrega roles quando o user.id realmente muda (login, logout,
      // troca de conta). TOKEN_REFRESHED / USER_UPDATED do mesmo usuário
      // viram no-op para a UI.
      setSession(newSession);
      setUser(newSession?.user ?? null);

      const nextId = newSession?.user?.id ?? null;
      if (nextId === currentUserId.current) return;
      currentUserId.current = nextId;

      if (nextId) {
        // Adia para fora do callback do Supabase (evita deadlocks).
        setTimeout(() => { loadRolesFor(nextId); }, 0);
      } else {
        setRoles([]);
      }
    });

    // Boot inicial — única vez que mexemos em `loading`.
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      const initialId = s?.user?.id ?? null;
      currentUserId.current = initialId;
      if (initialId) {
        loadRolesFor(initialId).finally(() => { if (mounted) setLoading(false); });
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    currentUserId.current = null;
  }

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, isAdmin: roles.includes("admin"), signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
