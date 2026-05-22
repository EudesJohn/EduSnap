import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';

export default function CreateTabWrapper() {
  const { user, profile, setProfile } = useAuthStore();
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // Si déjà créateur, rediriger immédiatement vers le dashboard créateur
    if (profile?.account_type === 'creator') {
      router.replace('/creator/dashboard');
    }
  }, [profile]);

  const handleBecomeCreator = async () => {
    if (!user || !profile) return;
    
    setUpdating(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ account_type: 'creator' })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        alert('Félicitations ! Vous êtes désormais Créateur sur EduSnap. 🚀');
        router.replace('/creator/dashboard');
      }
    } catch (e) {
      console.error('Erreur lors du passage au statut créateur:', e);
      alert('Une erreur est survenue lors de la mise à jour de votre compte.');
    } finally {
      setUpdating(false);
    }
  };

  if (profile?.account_type === 'creator') {
    return (
      <View className="flex-1 bg-[#090A1A] justify-center items-center">
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#090A1A] pt-14">
      <StatusBar style="light" />

      <ScrollView className="flex-1 px-6 pb-12" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="items-center mt-6 mb-8">
          <View className="w-18 h-18 bg-indigo-950/40 rounded-full justify-center items-center border border-indigo-500/25 mb-4">
            <Ionicons name="sparkles" size={32} color="#8B5CF6" />
          </View>
          <Text className="text-white text-2xl font-black text-center tracking-tight leading-8">
            Rejoignez le programme{'\n'}Créateurs d'EduSnap
          </Text>
          <Text className="text-slate-400 text-xs font-semibold text-center mt-2 px-4 leading-5">
            Partagez vos connaissances en vidéos courtes et ludiques et gagnez de l'XP !
          </Text>
        </View>

        {/* Benefits list */}
        <View className="space-y-4 mb-10">
          {[
            {
              icon: 'videocam',
              title: 'Vidéos de 15 à 60s',
              desc: 'Expliquez des théorèmes, des dates ou du vocabulaire simplement.',
              color: '#38BDF8',
            },
            {
              icon: 'school',
              title: 'Quiz interactifs IA',
              desc: 'Générez des QCM automatiques basés sur votre cours avec notre IA.',
              color: '#818CF8',
            },
            {
              icon: 'bar-chart',
              title: 'Tableau de bord complet',
              desc: 'Suivez le nombre de vues, de likes et l\'XP généré par vos élèves.',
              color: '#10B981',
            },
            {
              icon: 'flash',
              title: 'Double XP de contribution',
              desc: 'Chaque vidéo approuvée vous octroie des bonus d\'XP massifs.',
              color: '#F59E0B',
            },
          ].map((benefit, index) => (
            <View
              key={index}
              className="flex-row items-start bg-[#131538] border border-white/5 p-4 rounded-2xl"
            >
              <View
                style={{ backgroundColor: benefit.color + '20' }}
                className="w-10 h-10 rounded-xl justify-center items-center mr-4"
              >
                <Ionicons name={benefit.icon as any} size={20} color={benefit.color} />
              </View>
              <View className="flex-1">
                <Text className="text-white text-sm font-bold mb-1">{benefit.title}</Text>
                <Text className="text-slate-400 text-xs leading-4">{benefit.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          onPress={handleBecomeCreator}
          disabled={updating}
          className="w-full bg-indigo-600 h-14 rounded-2xl justify-center items-center shadow-lg shadow-indigo-600/35 mb-6"
        >
          {updating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-white font-extrabold text-sm uppercase tracking-wider">
              🚀 Devenir Créateur gratuitement
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)')}
          className="w-full h-12 rounded-xl justify-center items-center bg-white/5 border border-white/10"
        >
          <Text className="text-slate-300 font-bold text-xs">Retourner au flux élève</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
