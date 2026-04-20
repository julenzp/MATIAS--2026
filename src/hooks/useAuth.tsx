import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'matia' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isMatia: boolean;
  userRole: UserRole;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  signInAsMatia: () => void;
}

const MATIA_SESSION_KEY = 'erbi:matia_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [isMatiaLocal, setIsMatiaLocal] = useState(() => {
    try { return localStorage.getItem(MATIA_SESSION_KEY) === 'true'; } catch { return false; }
  });
  const [isLoading, setIsLoading] = useState(true);

  const adminCheckRef = useRef<{ userId: string; promise: Promise<boolean> } | null>(null);

  const checkAdminRole = async (userId: string): Promise<boolean> => {
    if (adminCheckRef.current?.userId === userId) {
      return adminCheckRef.current.promise;
    }
    const promise = (async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) return false;
      return !!data;
    })();
    adminCheckRef.current = { userId, promise };
    return promise;
  };

  useEffect(() => {
    let subscriptionCleanup: (() => void) | null = null;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        checkAdminRole(initialSession.user.id).then((admin) => {
          setIsAdminRole(admin);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          setSession(newSession);
          setUser(newSession?.user ?? null);

          if (newSession?.user) {
            checkAdminRole(newSession.user.id).then(setIsAdminRole);
          } else {
            setIsAdminRole(false);
            adminCheckRef.current = null;
          }
        }
      );

      subscriptionCleanup = () => subscription.unsubscribe();
    });

    return () => { subscriptionCleanup?.(); };
  }, []);

  // MATIA local session takes absolute priority over any Supabase admin role
  const isMatia = isMatiaLocal;
  const isAdmin = isAdminRole && !isMatiaLocal;
  const userRole: UserRole = isMatia ? 'matia' : isAdmin ? 'admin' : null;

  const signInAsMatia = () => {
    try { localStorage.setItem(MATIA_SESSION_KEY, 'true'); } catch {}
    setIsMatiaLocal(true);
  };

  const signIn = async (email: string, password: string) => {
    // Clear MATIA session flag on admin login to avoid stale profile filtering
    try { localStorage.removeItem(MATIA_SESSION_KEY); } catch {}
    setIsMatiaLocal(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithMagicLink = async (email: string) => {
    const baseUrl = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${baseUrl}/`, shouldCreateUser: true }
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` }
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdminRole(false);
    try { localStorage.removeItem(MATIA_SESSION_KEY); } catch {}
    setIsMatiaLocal(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isMatia, userRole, isLoading, signIn, signInWithMagicLink, signUp, resetPassword, updatePassword, signOut, signInAsMatia }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
