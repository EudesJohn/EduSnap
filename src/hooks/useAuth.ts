import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const {
    user,
    profile,
    isLoading,
    initialize,
    login,
    register,
    logout,
    updateProfile,
    fetchProfile,
  } = useAuthStore();

  // Initialisation automatique de l'état d'authentification au montage
  useEffect(() => {
    if (!user && isLoading) {
      initialize();
    }
  }, [user, isLoading, initialize]);

  return {
    user,
    profile,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    fetchProfile,
    isCreator: profile?.account_type === 'creator',
    isAdmin: profile?.is_admin || false,
  };
};
export default useAuth;
