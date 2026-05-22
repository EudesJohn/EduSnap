import { useEffect, useCallback } from 'react';
import { useXpStore } from '../stores/xpStore';
import { useAuthStore } from '../stores/authStore';

export const useXP = () => {
  const user = useAuthStore((state) => state.user);
  const {
    xp,
    level,
    streak,
    badges,
    transactions,
    leaderboard,
    isLoading,
    fetchUserStats,
    addXp,
    fetchLeaderboard,
  } = useXpStore();

  const userId = user?.id || null;

  // Charger les stats de l'utilisateur dès qu'il est connecté
  useEffect(() => {
    if (userId) {
      fetchUserStats(userId);
    }
  }, [userId, fetchUserStats]);

  // Ajouter de l'XP de manière sémantique
  const awardQuizSuccess = useCallback(async () => {
    if (!userId) return { success: false };
    return addXp(userId, 10, 'Quiz réussi (+10 XP) 🎓');
  }, [userId, addXp]);

  const awardVideoWatched = useCallback(async () => {
    if (!userId) return { success: false };
    return addXp(userId, 5, 'Vidéo regardée en entier (+5 XP) 📺');
  }, [userId, addXp]);

  const awardStreakMaintained = useCallback(async () => {
    if (!userId) return { success: false };
    return addXp(userId, 20, 'Série d\'activité maintenue (+20 XP) 🔥');
  }, [userId, addXp]);

  const awardPathCompleted = useCallback(async () => {
    if (!userId) return { success: false };
    return addXp(userId, 50, 'Parcours d\'apprentissage complété (+50 XP) 🏆');
  }, [userId, addXp]);

  const penalizeQuizFailure = useCallback(async () => {
    if (!userId) return { success: false };
    return addXp(userId, -2, 'Quiz raté (-2 XP) ❌');
  }, [userId, addXp]);

  return {
    xp,
    level,
    streak,
    badges,
    transactions,
    leaderboard,
    isLoading,
    refreshStats: () => userId && fetchUserStats(userId),
    awardQuizSuccess,
    awardVideoWatched,
    awardStreakMaintained,
    awardPathCompleted,
    penalizeQuizFailure,
    fetchLeaderboard,
  };
};
export default useXP;
