import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Profile, AccountType } from '../types';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, psw: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    psw: string,
    username: string,
    fullName: string,
    accountType: AccountType
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ success: boolean; error?: string }>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  setUser: (user: any) => void;
  setProfile: (profile: Profile | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  // Initialisation à l'ouverture de l'application
  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      if (session?.user) {
        set({ user: session.user });
        const profile = await get().fetchProfile(session.user.id);
        set({ profile });
      } else {
        set({ user: null, profile: null });
      }
    } catch (e) {
      console.error('Erreur lors de l\'initialisation de la session:', e);
      set({ user: null, profile: null });
    } finally {
      set({ isLoading: false });
    }

    // Écouter les changements d'état de l'authentification (connexion, déconnexion...)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        set({ user: session.user });
        const profile = await get().fetchProfile(session.user.id);
        set({ profile });
      } else {
        set({ user: null, profile: null });
      }
      set({ isLoading: false });
    });
  },

  // Connexion utilisateur
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      set({ user: data.user });
      const profile = await get().fetchProfile(data.user.id);
      set({ profile });

      return { success: true };
    } catch (e: any) {
      console.error('Erreur de connexion:', e.message);
      return { success: false, error: e.message || 'Identifiants invalides' };
    } finally {
      set({ isLoading: false });
    }
  },

  // Inscription utilisateur
  register: async (email, password, username, fullName, accountType) => {
    set({ isLoading: true });
    try {
      // Nettoyer et valider le username
      const cleanUsername = username.trim().toLowerCase();

      // Vérifier si le nom d'utilisateur est déjà pris
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingUser) {
        return { success: false, error: 'Ce nom d\'utilisateur est déjà utilisé' };
      }

      // Inscription dans Supabase Auth. Les métadonnées utilisateur seront transmises
      // à notre trigger PostgreSQL 'handle_new_user' pour créer le profil automatiquement.
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: cleanUsername,
            full_name: fullName.trim(),
            account_type: accountType,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        set({ user: data.user });
        
        // Attendre un court instant que le trigger de profil s'exécute
        let profile = null;
        let attempts = 0;
        while (!profile && attempts < 5) {
          await new Promise((res) => setTimeout(res, 500));
          profile = await get().fetchProfile(data.user.id);
          attempts++;
        }
        
        set({ profile });
      }

      return { success: true };
    } catch (e: any) {
      console.error('Erreur d\'inscription:', e.message);
      return { success: false, error: e.message || 'Une erreur est survenue lors de la création du compte' };
    } finally {
      set({ isLoading: false });
    }
  },

  // Déconnexion
  logout: async () => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (e) {
      console.error('Erreur de déconnexion:', e);
    } finally {
      set({ user: null, profile: null, isLoading: false });
    }
  },

  // Récupérer un profil utilisateur
  fetchProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data as Profile;
    } catch (e) {
      console.error(`Erreur de récupération du profil (${userId}):`, e);
      return null;
    }
  },

  // Mettre à jour le profil de l'utilisateur connecté
  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return { success: false, error: 'Utilisateur non connecté' };

    set({ isLoading: true });
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Recharger le profil local mis à jour
      const updatedProfile = await get().fetchProfile(user.id);
      set({ profile: updatedProfile });

      return { success: true };
    } catch (e: any) {
      console.error('Erreur de mise à jour du profil:', e.message);
      return { success: false, error: e.message || 'Erreur lors de la mise à jour' };
    } finally {
      set({ isLoading: false });
    }
  },
}));
