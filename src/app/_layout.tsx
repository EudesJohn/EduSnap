import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../stores/authStore';
import '../global.css';

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const segments = useSegments();
  const router = useRouter();

  // 1. Initialiser la session Supabase et écouter l'état d'authentification
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 2. Logique de redirection automatique (Session Guard)
  useEffect(() => {
    if (isLoading) return;

    // Segment de l'URL courante (ex: '(auth)', '(tabs)', etc.)
    const inAuthGroup = segments[0] === '(auth)';
    
    // Si l'utilisateur n'est pas connecté et n'est pas déjà dans le groupe d'authentification
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/onboarding');
    } 
    // Si l'utilisateur est connecté et se trouve dans le groupe d'authentification (login, register...)
    else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, router]);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#090A1A' } }}>
        {/* Navigation par Onglets */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Navigation Authentification */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        
        {/* Lecteur Vidéo Modal (Premium slide effect) */}
        <Stack.Screen 
          name="video/[id]" 
          options={{ 
            presentation: 'modal', 
            animation: 'slide_from_bottom',
            headerShown: false 
          }} 
        />
        
        {/* Espace Créateur */}
        <Stack.Screen name="creator/dashboard" options={{ headerShown: false }} />
        
        {/* Espace Administrateur */}
        <Stack.Screen name="admin/index" options={{ headerShown: false }} />
        
        {/* Détail Parcours d'apprentissage */}
        <Stack.Screen name="path/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
