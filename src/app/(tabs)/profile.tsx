import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useXP } from '../../hooks/useXP';
import { supabase } from '../../lib/supabase';
import { Badge, XPTransaction } from '../../types';
import { LevelBadge } from '../../components/ui/LevelBadge';
import { StreakBadge } from '../../components/ui/StreakBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { profile, logout } = useAuthStore();
  const { xp, level, streak, refreshStats } = useXP();
  
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [userBadgeIds, setUserBadgeIds] = useState<number[]>([]);
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les badges et l'historique d'XP
  useEffect(() => {
    if (!profile) return;

    const fetchProfileData = async () => {
      setLoading(true);
      try {
        // A. Tous les badges disponibles
        const { data: badgesData } = await supabase
          .from('badges')
          .select('*')
          .order('id');
        setAllBadges(badgesData || []);

        // B. Badges gagnés par cet utilisateur
        const { data: earnedBadges } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', profile.id);
        
        const earnedIds = (earnedBadges || []).map((b) => b.badge_id);
        setUserBadgeIds(earnedIds);

        // C. Transactions XP récentes
        const { data: txs } = await supabase
          .from('xp_transactions')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5);
        setTransactions(txs || []);

        // Actualiser les stats globales via le hook
        refreshStats();
      } catch (e) {
        console.error('Erreur lors du chargement du profil:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [profile]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/(auth)/onboarding');
    } catch (e) {
      console.error('Erreur de déconnexion:', e);
    }
  };

  if (!profile) return null;

  return (
    <View className="flex-1 bg-[#090A1A] pt-14">
      <StatusBar style="light" />

      {/* En-tête avec bouton paramètres/logout */}
      <View className="flex-row justify-between items-center px-6 pb-4">
        <Text className="text-white text-2xl font-extrabold tracking-tight">Mon Profil</Text>
        <TouchableOpacity
          onPress={handleLogout}
          className="w-10 h-10 rounded-full bg-red-950/20 border border-red-500/25 items-center justify-center"
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#06B6D4" />
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pb-24">
            
            {/* ── CARTES DE PROFIL PRINCIPALE ── */}
            <View className="bg-gradient-to-tr from-[#131538] to-[#1d204a] border border-white/5 rounded-3xl p-6 shadow-xl items-center relative mb-6">
              {/* Avatar */}
              <View className="w-24 h-24 rounded-full border-4 border-cyan-400 overflow-hidden bg-slate-900 justify-center items-center shadow-lg mb-4">
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} className="w-full h-full" />
                ) : (
                  <Ionicons name="person" size={48} color="#94A3B8" />
                )}
              </View>

              {/* Noms */}
              <Text className="text-white text-lg font-black">{profile.full_name || profile.username}</Text>
              <Text className="text-slate-400 text-xs font-semibold mt-1">@{profile.username}</Text>
              {profile.bio ? (
                <Text className="text-slate-300 text-xs text-center mt-3 px-4 leading-5">{profile.bio}</Text>
              ) : null}

              {/* Rôle Créateur (Tag) */}
              <View className="flex-row gap-3 mt-4 items-center">
                <LevelBadge level={level} size="sm" animated />
                <StreakBadge streak={streak} size="sm" />
              </View>

              {profile.account_type === 'creator' && (
                <TouchableOpacity
                  onPress={() => router.push('/creator/dashboard')}
                  className="flex-row bg-[#06B6D4] px-5 py-2.5 rounded-full items-center justify-center mt-5 shadow shadow-cyan-400/25"
                >
                  <Ionicons name="briefcase-outline" size={14} color="#FFFFFF" />
                  <Text className="text-white font-extrabold text-xs ml-2">Espace Créateur</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── BARRE DE PROGRESSION DU NIVEAU ── */}
            <View className="bg-[#131538] border border-white/5 rounded-3xl p-5 mb-6">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-white text-sm font-extrabold">Niveau Actuel</Text>
                <Text className="text-cyan-400 font-extrabold text-sm">{xp} XP</Text>
              </View>
              
              <ProgressBar progress={(xp % 500) / 500} />
              
              <Text className="text-slate-400 text-[10px] font-semibold mt-3">
                Plus que {500 - (xp % 500)} XP avant d'atteindre le prochain palier !
              </Text>
            </View>

            {/* ── BADGES & RÉCOMPENSES (GAMIFICATION) ── */}
            <View className="mb-6">
              <Text className="text-white text-base font-extrabold mb-4">🎖️ Badges débloqués ({userBadgeIds.length}/10)</Text>

              <View className="bg-[#131538] border border-white/5 rounded-3xl p-5">
                <View className="flex-row flex-wrap justify-between">
                  {allBadges.map((badge) => {
                    const isEarned = userBadgeIds.includes(badge.id);
                    return (
                      <View
                        key={badge.id}
                        style={{ width: (width - 88) / 3 }}
                        className="items-center mb-4 p-2 rounded-xl"
                      >
                        <View
                          style={{
                            backgroundColor: isEarned ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255,255,255,0.02)',
                            borderColor: isEarned ? '#06B6D4' : 'rgba(255,255,255,0.05)',
                          }}
                          className="w-14 h-14 rounded-full border-2 justify-center items-center mb-2 shadow"
                        >
                          <Ionicons
                            name={(badge.icon || 'ribbon-outline') as any}
                            size={24}
                            color={isEarned ? '#06B6D4' : '#475569'}
                          />
                        </View>
                        <Text
                          className={`text-[9px] font-black text-center ${
                            isEarned ? 'text-white' : 'text-slate-500'
                          }`}
                          numberOfLines={1}
                        >
                          {badge.name}
                        </Text>
                        <Text className="text-slate-500 text-[7px] text-center mt-0.5 leading-3" numberOfLines={2}>
                          {badge.description}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ── HISTORIQUE D'ACTIVITÉ (TRANSACTIONS XP) ── */}
            <View className="mb-6">
              <Text className="text-white text-base font-extrabold mb-4">⚡ Activité récente</Text>

              <View className="bg-[#131538] border border-white/5 rounded-3xl p-4">
                {transactions.length === 0 ? (
                  <Text className="text-slate-400 text-xs text-center py-4 font-semibold">Aucune activité enregistrée.</Text>
                ) : (
                  transactions.map((tx) => (
                    <View
                      key={tx.id}
                      className="flex-row justify-between items-center py-3 border-b border-white/5 last:border-b-0"
                    >
                      <View className="flex-row items-center flex-1 mr-4">
                        <View
                          style={{
                            backgroundColor: tx.amount > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          }}
                          className="w-8 h-8 rounded-lg justify-center items-center mr-3"
                        >
                          <Ionicons
                            name={tx.amount > 0 ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                            size={18}
                            color={tx.amount > 0 ? '#10B981' : '#EF4444'}
                          />
                        </View>
                        <Text className="text-white text-xs font-semibold flex-1 leading-5">
                          {tx.reason}
                        </Text>
                      </View>

                      <Text
                        className={`text-xs font-black ${
                          tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} XP
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>

          </View>
        </ScrollView>
      )}
    </View>
  );
}
