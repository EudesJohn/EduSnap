import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Badge, XPTransaction, LeaderboardItem } from '../types';
import { useAuthStore } from './authStore';

interface XPState {
  xp: number;
  level: string;
  streak: number;
  badges: Badge[];
  transactions: XPTransaction[];
  leaderboard: LeaderboardItem[];
  isLoading: boolean;
  fetchUserStats: (userId: string) => Promise<void>;
  addXp: (userId: string, amount: number, reason: string) => Promise<{ success: boolean; data?: any }>;
  fetchLeaderboard: (filterType: 'global' | 'subject', subjectId?: number) => Promise<void>;
}

export const useXpStore = create<XPState>((set, get) => ({
  xp: 0,
  level: 'Novice',
  streak: 0,
  badges: [],
  transactions: [],
  leaderboard: [],
  isLoading: false,

  // Charger les stats de l'utilisateur (badges, transactions, XP)
  fetchUserStats: async (userId) => {
    set({ isLoading: true });
    try {
      // 1. Récupération des infos du profil
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp_points, level, streak_days')
        .eq('id', userId)
        .single();

      if (profile) {
        set({
          xp: profile.xp_points,
          level: profile.level,
          streak: profile.streak_days,
        });
      }

      // 2. Récupération des badges débloqués par l'utilisateur
      const { data: userBadges, error: badgesError } = await supabase
        .from('user_badges')
        .select('earned_at, badges(*)')
        .eq('user_id', userId);

      if (badgesError) throw badgesError;

      const fetchedBadges = (userBadges || [])
        .map((ub: any) => ub.badges)
        .filter((b) => b !== null) as Badge[];

      set({ badges: fetchedBadges });

      // 3. Récupération des dernières transactions d'XP
      const { data: txs, error: txsError } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (txsError) throw txsError;

      set({ transactions: (txs || []) as XPTransaction[] });
    } catch (e) {
      console.error('Erreur lors du chargement des stats de gamification:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  // Ajouter de l'XP en appelant la fonction RPC Postgres sécurisée
  addXp: async (userId, amount, reason) => {
    try {
      // Appel de la fonction SQL 'add_user_xp' via RPC
      const { data, error } = await supabase.rpc('add_user_xp', {
        p_user_id: userId,
        p_xp_to_add: amount,
        p_xp_reason: reason,
      });

      if (error) throw error;

      // Si l'exécution SQL est réussie, recharger les stats locales
      if (data && data.success) {
        set({
          xp: data.new_xp,
          level: data.new_level,
          streak: data.streak_days,
        });

        // Mettre à jour également le profil dans authStore
        const setProfile = useAuthStore.getState().setProfile;
        const currentProfile = useAuthStore.getState().profile;
        if (currentProfile) {
          setProfile({
            ...currentProfile,
            xp_points: data.new_xp,
            level: data.new_level,
            streak_days: data.streak_days,
          });
        }

        // Recharger la liste des transactions et des badges
        await get().fetchUserStats(userId);

        return { success: true, data };
      }

      return { success: false, data };
    } catch (e: any) {
      console.error('Erreur lors de l\'ajout d\'XP (RPC):', e.message);
      return { success: false, data: e.message };
    }
  },

  // Charger le classement hebdomadaire
  fetchLeaderboard: async (filterType, subjectId) => {
    set({ isLoading: true });
    try {
      if (filterType === 'global') {
        // Classement global : trié par XP décroissant
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, xp_points, level')
          .order('xp_points', { ascending: false })
          .limit(50);

        if (error) throw error;
        set({ leaderboard: (data || []) as LeaderboardItem[] });
      } else if (filterType === 'subject' && subjectId) {
        // Classement par matière : les utilisateurs ayant cette matière préférée
        // triés par XP
        const { data, error } = await supabase
          .from('user_subjects')
          .select('profiles(id, username, full_name, avatar_url, xp_points, level)')
          .eq('subject_id', subjectId);

        if (error) throw error;

        // Formater les données extraites
        const items = (data || [])
          .map((us: any) => us.profiles)
          .filter((p) => p !== null)
          .sort((a: any, b: any) => b.xp_points - a.xp_points) as LeaderboardItem[];

        set({ leaderboard: items });
      }
    } catch (e) {
      console.error('Erreur lors de la récupération du classement:', e);
    } finally {
      set({ isLoading: false });
    }
  },
}));
