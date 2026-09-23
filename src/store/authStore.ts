import type { Session } from '@supabase/supabase-js';
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { UserRow } from '../types/database';

interface AuthState {
  session: Session | null;
  profile: UserRow | null;
  initializing: boolean;
  init: () => () => void;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

async function fetchProfile(userId: string): Promise<UserRow | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
  if (error) {
    console.warn('Erro ao carregar perfil:', error.message);
    return null;
  }
  return data;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  initializing: true,

  init: () => {
    supabase.auth.getSession().then(async ({ data }) => {
      const profile = data.session ? await fetchProfile(data.session.user.id) : null;
      set({ session: data.session, profile, initializing: false });
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const profile = session ? await fetchProfile(session.user.id) : null;
      set({ session, profile, initializing: false });
    });

    return () => subscription.subscription.unsubscribe();
  },

  signInWithPassword: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  },

  signUp: async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return error ? error.message : null;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  refreshProfile: async () => {
    const session = get().session;
    if (!session) return;
    const profile = await fetchProfile(session.user.id);
    set({ profile });
  },
}));
