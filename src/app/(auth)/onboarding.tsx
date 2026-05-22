import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    title: 'Le TikTok de la connaissance',
    description: 'Faites défiler un flux infini de vidéos courtes éducatives sélectionnées et modérées par IA.',
    icon: 'play-circle-outline',
    color: 'from-indigo-600 to-indigo-900',
  },
  {
    id: 2,
    title: 'Apprenez avec des Quiz',
    description: 'Validez vos acquis à la fin de chaque vidéo avec un mini-quiz en 15 secondes chrono pour gagner de l\'XP.',
    icon: 'school-outline',
    color: 'from-cyan-500 to-blue-800',
  },
  {
    id: 3,
    title: 'Débloquez des Trophées',
    description: 'Augmentez vos séries de jours actifs, grimpez dans le classement général et débloquez 10 badges exclusifs.',
    icon: 'trophy-outline',
    color: 'from-purple-600 to-pink-900',
  },
];

export default function Onboarding() {
  const [activeSlide, setActiveSlide] = useState(0);
  const router = useRouter();

  const handleNext = () => {
    if (activeSlide < SLIDES.length - 1) {
      setActiveSlide(activeSlide + 1);
    } else {
      router.push('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.push('/(auth)/login');
  };

  return (
    <View className="flex-1 bg-[#090A1A]">
      <StatusBar style="light" />
      
      {/* Fond Dégradé Principal dynamique selon le slide */}
      <View className={`absolute inset-0 bg-gradient-to-br ${SLIDES[activeSlide].color} opacity-40`} />

      {/* Bouton Ignorer en haut à droite */}
      {activeSlide < SLIDES.length - 1 && (
        <TouchableOpacity 
          onPress={handleSkip}
          className="absolute top-12 right-6 z-10 px-4 py-2 rounded-full bg-white/10"
        >
          <Text className="text-white/80 font-semibold text-sm">Ignorer</Text>
        </TouchableOpacity>
      )}

      {/* Contenu Slide Principal */}
      <View className="flex-1 justify-center items-center px-8">
        
        {/* Bulbe d'Icône Glassmorphic */}
        <View className="w-40 h-40 rounded-full items-center justify-center bg-white/5 border border-white/10 shadow-2xl mb-12">
          <Ionicons 
            name={SLIDES[activeSlide].icon as any} 
            size={80} 
            color={activeSlide === 1 ? '#06B6D4' : '#8B5CF6'} 
          />
        </View>

        {/* Panneau d'Information */}
        <View className="bg-white/5 border border-white/10 p-8 rounded-3xl w-full items-center shadow-xl">
          <Text className="text-white text-3xl font-extrabold text-center mb-4 tracking-tight">
            {SLIDES[activeSlide].title}
          </Text>
          <Text className="text-slate-300 text-base text-center leading-6">
            {SLIDES[activeSlide].description}
          </Text>
        </View>
      </View>

      {/* Zone de Navigation Inférieure */}
      <View className="px-8 pb-12">
        {/* Indicateurs de Pages (Dots) */}
        <View className="flex-row justify-center mb-8 space-x-3">
          {SLIDES.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeSlide ? 'w-8 bg-cyan-400' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </View>

        {/* Actions CTA */}
        {activeSlide === SLIDES.length - 1 ? (
          <View className="space-y-4">
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              className="w-full h-14 rounded-2xl bg-indigo-600 items-center justify-center shadow-lg shadow-indigo-600/30"
            >
              <Text className="text-white font-bold text-lg">Créer un compte</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              className="w-full h-14 rounded-2xl border border-white/20 bg-white/5 items-center justify-center"
            >
              <Text className="text-white font-bold text-lg">Se connecter</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleNext}
            className="w-full h-14 rounded-2xl bg-white items-center justify-center shadow-lg shadow-white/10"
          >
            <View className="flex-row items-center">
              <Text className="text-slate-900 font-bold text-lg mr-2">Suivant</Text>
              <Ionicons name="arrow-forward" size={20} color="#0F172A" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
