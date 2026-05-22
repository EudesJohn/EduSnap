import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useXP } from '../../hooks/useXP';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { Subject } from '../../types';
import { StatusBar } from 'expo-status-bar';

export default function Leaderboard() {
  const { leaderboard, isLoading, fetchLeaderboard } = useXP();
  const currentUser = useAuthStore((state) => state.profile);

  // Filtres
  const [filterType, setFilterType] = useState<'global' | 'subject'>('global');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  // 1. Charger le classement au montage
  useEffect(() => {
    if (filterType === 'global') {
      fetchLeaderboard('global');
    } else if (filterType === 'subject' && selectedSubjectId) {
      fetchLeaderboard('subject', selectedSubjectId);
    }
  }, [filterType, selectedSubjectId]);

  // 2. Charger les matières scolaires pour le filtre
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const { data } = await supabase.from('subjects').select('*');
        if (data && data.length > 0) {
          setSubjects(data);
          setSelectedSubjectId(data[0].id); // Sélectionner la 1ère par défaut
        }
      } catch (e) {
        console.error('Erreur lors du chargement des matières du leaderboard:', e);
      }
    };
    fetchSubjects();
  }, []);

  // Extraction du Top 3 et des autres
  const top3 = leaderboard.slice(0, 3);
  const restUsers = leaderboard.slice(3);

  // Trouver la position de l'utilisateur actuel
  const currentUserRank = leaderboard.findIndex((item) => item.id === currentUser?.id) + 1;

  return (
    <View className="flex-1 bg-[#090A1A] pt-14">
      <StatusBar style="light" />

      {/* En-tête principal */}
      <View className="px-6 pb-4">
        <Text className="text-white text-2xl font-extrabold tracking-tight flex-row items-center">
          🏆 Classement
        </Text>
        <Text className="text-slate-400 text-xs mt-1">
          Mesurez vos acquis avec les apprenants d'EduSnap
        </Text>
      </View>

      {/* Toggle Global / Par Matière */}
      <View className="mx-6 flex-row bg-[#131538] rounded-xl p-1 border border-white/5 mb-4">
        <TouchableOpacity
          onPress={() => setFilterType('global')}
          className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
            filterType === 'global' ? 'bg-indigo-600' : 'bg-transparent'
          }`}
        >
          <Text className="text-white text-xs font-extrabold">🌍 Global</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setFilterType('subject')}
          className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
            filterType === 'subject' ? 'bg-indigo-600' : 'bg-transparent'
          }`}
        >
          <Text className="text-white text-xs font-extrabold">📚 Par Matière</Text>
        </TouchableOpacity>
      </View>

      {/* Filtre horizontal par matière (si activé) */}
      {filterType === 'subject' && subjects.length > 0 && (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="pl-6 mb-4 max-h-[46px]"
          contentContainerStyle={{ paddingRight: 30 }}
        >
          {subjects.map((subj) => {
            const isSelected = selectedSubjectId === subj.id;
            return (
              <TouchableOpacity
                key={subj.id}
                onPress={() => setSelectedSubjectId(subj.id)}
                className={`flex-row items-center px-4 py-2 rounded-full border mr-3 h-[38px] ${
                  isSelected 
                    ? 'bg-indigo-950/40 border-cyan-400' 
                    : 'bg-[#131538] border-white/5'
                }`}
              >
                <Text className="text-white text-xs font-bold">{subj.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {isLoading && leaderboard.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#06B6D4" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pb-24" showsVerticalScrollIndicator={false}>
          
          {/* ================= PODIUM TOP 3 ================= */}
          {top3.length > 0 && (
            <View className="flex-row justify-center items-end mt-6 mb-8 h-[210px] relative">
              
              {/* #2 : Argent (Gauche) */}
              {top3[1] && (
                <View className="items-center w-[30%] mx-1">
                  <View className="relative">
                    <View className="w-14 h-14 rounded-full border-2 border-slate-300 overflow-hidden bg-slate-800">
                      {top3[1].avatar_url ? (
                        <Image source={{ uri: top3[1].avatar_url }} className="w-full h-full" />
                      ) : (
                        <Ionicons name="person" size={24} color="#94A3B8" className="m-auto" />
                      )}
                    </View>
                    <View className="absolute top-[-8px] right-[-8px] bg-slate-400 w-6 h-6 rounded-full items-center justify-center border-2 border-[#090A1A]">
                      <Text className="text-white font-extrabold text-[10px]">2</Text>
                    </View>
                  </View>
                  
                  <Text className="text-white text-[10px] font-bold mt-2 text-center" numberOfLines={1}>
                    {top3[1].username}
                  </Text>
                  
                  <View className="w-full h-20 bg-slate-600/20 border-t border-slate-400/35 rounded-t-xl mt-3 items-center justify-center shadow-lg shadow-black/20">
                    <Text className="text-slate-300 font-extrabold text-xs">{top3[1].xp_points} XP</Text>
                    <Text className="text-slate-400 text-[8px] mt-0.5 uppercase">{top3[1].level}</Text>
                  </View>
                </View>
              )}

              {/* #1 : Or (Milieu) */}
              {top3[0] && (
                <View className="items-center w-[34%] mx-1">
                  <View className="relative">
                    {/* Couronne */}
                    <Ionicons 
                      name="ribbon" 
                      size={28} 
                      color="#F59E0B" 
                      className="absolute top-[-22px] left-[18px] z-10" 
                    />
                    
                    <View className="w-18 h-18 rounded-full border-4 border-amber-400 overflow-hidden bg-slate-800 shadow-xl shadow-amber-400/20">
                      {top3[0].avatar_url ? (
                        <Image source={{ uri: top3[0].avatar_url }} className="w-full h-full" />
                      ) : (
                        <Ionicons name="person" size={32} color="#94A3B8" className="m-auto" />
                      )}
                    </View>
                    <View className="absolute top-[-8px] right-[-4px] bg-amber-400 w-6 h-6 rounded-full items-center justify-center border-2 border-[#090A1A]">
                      <Text className="text-slate-900 font-extrabold text-[10px]">1</Text>
                    </View>
                  </View>
                  
                  <Text className="text-white text-xs font-extrabold mt-2 text-center" numberOfLines={1}>
                    {top3[0].username}
                  </Text>
                  
                  <View className="w-full h-28 bg-amber-500/20 border-t border-amber-400/50 rounded-t-2xl mt-3 items-center justify-center shadow-xl shadow-amber-400/10">
                    <Text className="text-amber-400 font-black text-sm">{top3[0].xp_points} XP</Text>
                    <Text className="text-amber-500 text-[8px] font-bold mt-0.5 uppercase">{top3[0].level}</Text>
                  </View>
                </View>
              )}

              {/* #3 : Bronze (Droite) */}
              {top3[2] && (
                <View className="items-center w-[30%] mx-1">
                  <View className="relative">
                    <View className="w-14 h-14 rounded-full border-2 border-amber-700 overflow-hidden bg-slate-800">
                      {top3[2].avatar_url ? (
                        <Image source={{ uri: top3[2].avatar_url }} className="w-full h-full" />
                      ) : (
                        <Ionicons name="person" size={24} color="#94A3B8" className="m-auto" />
                      )}
                    </View>
                    <View className="absolute top-[-8px] right-[-8px] bg-amber-700 w-6 h-6 rounded-full items-center justify-center border-2 border-[#090A1A]">
                      <Text className="text-white font-extrabold text-[10px]">3</Text>
                    </View>
                  </View>
                  
                  <Text className="text-white text-[10px] font-bold mt-2 text-center" numberOfLines={1}>
                    {top3[2].username}
                  </Text>
                  
                  <View className="w-full h-16 bg-[#a75d34]/15 border-t border-amber-700/40 rounded-t-xl mt-3 items-center justify-center shadow-lg shadow-black/20">
                    <Text className="text-orange-400 font-extrabold text-xs">{top3[2].xp_points} XP</Text>
                    <Text className="text-orange-500 text-[8px] mt-0.5 uppercase">{top3[2].level}</Text>
                  </View>
                </View>
              )}

            </View>
          )}

          {/* ================= RESTE DU CLASSEMENT ================= */}
          <View className="bg-white/5 border border-white/10 rounded-3xl p-4 shadow-xl mb-12">
            {restUsers.length === 0 ? (
              <Text className="text-slate-400 text-center text-xs py-6">Rejoignez le classement en résolvant vos premiers quiz !</Text>
            ) : (
              restUsers.map((item, index) => {
                const rank = index + 4; // Commence au 4ème
                const isMe = item.id === currentUser?.id;

                return (
                  <View
                    key={item.id}
                    className={`flex-row items-center justify-between py-3 px-3 rounded-xl mb-2 ${
                      isMe ? 'bg-indigo-950/40 border border-cyan-500/20' : 'bg-transparent'
                    }`}
                  >
                    {/* Rank & Profile */}
                    <View className="flex-row items-center flex-1">
                      <Text className="text-slate-400 text-sm font-extrabold w-6 text-center">{rank}</Text>
                      
                      <View className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden border border-white/10 ml-2">
                        {item.avatar_url ? (
                          <Image source={{ uri: item.avatar_url }} className="w-full h-full" />
                        ) : (
                          <Ionicons name="person" size={16} color="#94A3B8" className="m-auto" />
                        )}
                      </View>
                      
                      <View className="ml-3">
                        <Text className="text-white text-xs font-bold">{item.username}</Text>
                        <Text className="text-slate-400 text-[8px] uppercase font-semibold mt-0.5">
                          {item.level}
                        </Text>
                      </View>
                    </View>

                    {/* XP Points */}
                    <View className="items-end">
                      <Text className="text-cyan-400 font-extrabold text-xs">{item.xp_points} XP</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* ================= FLOATING STICKY FOOTER (Mon Rang) ================= */}
      {currentUser && (
        <View 
          className="absolute bottom-4 left-6 right-6 h-16 rounded-2xl bg-[#131538]/90 border border-cyan-500/25 flex-row items-center justify-between px-5 shadow-2xl"
          style={{
            shadowColor: '#06B6D4',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
          }}
        >
          <View className="flex-row items-center">
            <Text className="text-cyan-400 font-extrabold text-base mr-3">
              #{currentUserRank > 0 ? currentUserRank : '-'}
            </Text>
            
            <View className="w-8 h-8 rounded-full border border-white/20 overflow-hidden bg-slate-900 justify-center items-center">
              {currentUser.avatar_url ? (
                <Image source={{ uri: currentUser.avatar_url }} className="w-full h-full" />
              ) : (
                <Ionicons name="person" size={16} color="#94A3B8" />
              )}
            </View>
            
            <View className="ml-3">
              <Text className="text-white text-xs font-extrabold">Vous ({currentUser.username})</Text>
              <Text className="text-slate-400 text-[9px] uppercase font-bold mt-0.5">{currentUser.level}</Text>
            </View>
          </View>

          <Text className="text-cyan-400 font-black text-sm">{currentUser.xp_points} XP</Text>
        </View>
      )}
    </View>
  );
}
