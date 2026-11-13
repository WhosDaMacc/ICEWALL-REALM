// Auth state for the multiplayer (Phase 1) features. Wraps the Supabase
// client from src/utils/supabaseClient.ts. Signed-out play is untouched:
// nothing here redirects or walls anything off — the game works exactly
// as before without a session, and this provider only adds auth where a
// page (Profile) asks for it.
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // The last sign-in/up error, as a short message for the UI. Null when
  // the last auth action succeeded (or none ran yet).
  authError: string | null;
  // A non-error status line, e.g. the "check your email" note after a
  // sign-up that needs confirmation. Null when there is nothing to say.
  authNotice: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  authNotice: null,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) setUser(data.session?.user ?? null);
      })
      .catch(() => {
        // No session (or the client is offline) — signed-out play stays
        // available; the UI shows the sign-in form, never a crash.
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setAuthNotice(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError(error.message);
      return;
    }
    // Supabase's default requires email confirmation, so a fresh
    // sign-up usually comes back with no session. That is not an
    // error — the player confirms from their inbox, then signs in.
    if (!data.session) {
      setAuthNotice('Account created — check your email to confirm it, then sign in.');
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setAuthNotice(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthNotice(null);
    // NOTE: the Google provider must be enabled in the Supabase
    // dashboard (Authentication > Providers > Google) or this returns
    // a clear provider error instead of redirecting.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/ICEWALL-REALM/profile` },
    });
    if (error) setAuthError(error.message);
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    setAuthNotice(null);
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(error.message);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, authError, authNotice, signUp, signIn, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
