import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useXP } from '../../hooks/useXP';
import { LearningPath, Video } from '../../types';
import { ProgressBar } from '../../components/ui/ProgressBar';

const { width } = Dimensions.get('window');

interface PathVideoWithOrder {
  order_index: number;
  videos: Video & {
    profiles: { username: string };
  };
}

export default function LearningPathScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { awardPathCompleted } = useXP();

  const [path, setPath] = useState<LearningPath | null>(null);
  const [pathVideos, setPathVideos] = useState<PathVideoWithOrder[]>([]);
  const [completedVideoIds, setCompletedVideoIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimed, setIsClaimed] = useState(false);

  useEffect(() => {
    if (!id || !user) return;

    const fetchPathData = async () => {
      try {
        // A. Détails du parcours
        const { data: pathData } = await supabase
          .from('learning_paths')
          .select('*, subjects(name)')
          .eq('id', id)
          .single();
        
        setPath(pathData as LearningPath);

        // B. Vidéos associées ordonnées
        const { data: videosData } = await supabase
          .from('path_videos')
          .select('order_index, videos(*, profiles(username))')
          .eq('path_id', id)
          .order('order_index');

        setPathVideos((videosData || []) as any);

        // C. Progression de l'utilisateur
        const { data: progress } = await supabase
          .from('path_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('path_id', id)
          .maybeSingle();

        if (progress) {
          setIsClaimed(progress.completed);
          // Simuler des vidéos complétées (par exemple la moitié des vidéos ou basé sur quiz_answers)
          // Pour un vrai système : on croise les vidéos du parcours avec quiz_answers de l'utilisateur
          const videoIds = (videosData || []).map((v: any) => v.videos.id);
          const { data: answers } = await supabase
            .from('quiz_answers')
            .select('question_id, questions(video_id)')
            .eq('user_id', user.id)
            .eq('is_correct', true);

          const solvedVideoIds = (answers || [])
            .map((ans: any) => ans.questions?.video_id)
            .filter(Boolean);

          const completed = videoIds.filter((vid) => solvedVideoIds.includes(vid));
          setCompletedVideoIds(completed);

          // Si complété et pas encore marqué en BDD
          if (completed.length === videoIds.length && !progress.completed) {
            await supabase
              .from('path_progress')
              .update({ completed: true, videos_completed: completed.length })
              .eq('user_id', user.id)
              .eq('path_id', id);
            
            setIsClaimed(true);
            await awardPathCompleted();
            alert('🏆 Félicitations ! Vous avez complété ce parcours d\'apprentissage et gagné +50 XP !');
          }
        } else {
          // Créer l'état initial de progression
          await supabase.from('path_progress').insert({
            user_id: user.id,
            path_id: id,
            videos_completed: 0,
            completed: false,
          });
        }
      } catch (e) {
        console.error('Erreur chargement parcours:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPathData();
  }, [id, user]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#090A1A] justify-center items-center">
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  if (!path) {
    return (
      <View className="flex-1 bg-[#090A1A] justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text className="text-white text-base font-extrabold mt-4">Parcours introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-6 bg-[#131538] px-6 py-3 rounded-full">
          <Text className="text-white font-bold text-xs">Retourner</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completionRatio = pathVideos.length > 0 ? completedVideoIds.length / pathVideos.length : 0;

  return (
    <View className="flex-1 bg-[#090A1A]">
      <StatusBar style="light" />

      {/* Header Image/Background effect */}
      <ScrollView className="flex-1 pb-12" showsVerticalScrollIndicator={false}>
        
        {/* Navigation & Cover info */}
        <View className="px-6 pt-14 pb-6 bg-[#131538] rounded-b-3xl border-b border-white/5 shadow-xl">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-black/40 justify-center items-center mb-6">
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="flex-row items-center mb-3">
            <View className="bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-500/20">
              <Text className="text-indigo-400 text-[9px] font-extrabold uppercase">
                {path.subjects?.name || 'Matière'}
              </Text>
            </View>
            <Text className="text-slate-400 text-[10px] mx-1.5">•</Text>
            <Text className="text-cyan-400 text-[9px] font-extrabold uppercase">
              {path.difficulty || 'Tout niveau'}
            </Text>
          </View>

          <Text className="text-white text-xl font-black leading-7 mb-2">{path.title}</Text>
          <Text className="text-slate-300 text-xs leading-5">{path.description}</Text>
        </View>

        {/* ── CARD DE PROGRESSION ── */}
        <View className="mx-6 mt-6 bg-[#131538]/70 border border-white/5 p-5 rounded-3xl shadow-lg">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white text-xs font-bold">Votre Progression</Text>
            <Text className="text-cyan-400 font-extrabold text-xs">
              {completedVideoIds.length} / {pathVideos.length} cours
            </Text>
          </View>

          <ProgressBar progress={completionRatio} />

          {isClaimed ? (
            <View className="flex-row items-center mt-3.5 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2 rounded-xl">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text className="text-emerald-400 text-[10px] font-bold ml-2">
                Parcours complété ! +50 XP réclamés 🏆
              </Text>
            </View>
          ) : (
            <Text className="text-slate-400 text-[9px] font-bold mt-3">
              Validez chaque cours en répondant correctement aux quiz pour débloquer les 50 XP bonus.
            </Text>
          )}
        </View>

        {/* ── LISTE DE VIDÉOS (ÉTAPES) ── */}
        <View className="mx-6 mt-6">
          <Text className="text-white text-sm font-extrabold mb-4">📚 Programme de formation</Text>

          {pathVideos.length === 0 ? (
            <Text className="text-slate-400 text-xs text-center py-8 font-semibold">Aucune leçon dans ce parcours pour le moment.</Text>
          ) : (
            <View className="space-y-4">
              {pathVideos.map((item, index) => {
                const video = item.videos;
                const isCompleted = completedVideoIds.includes(video.id);
                // Le premier élément ou les complétés sont déverrouillés
                const isUnlocked = index === 0 || completedVideoIds.includes(pathVideos[index - 1].videos.id);

                return (
                  <TouchableOpacity
                    key={video.id}
                    disabled={!isUnlocked}
                    onPress={() => router.push(`/video/${video.id}`)}
                    className={`flex-row items-center border p-4 rounded-2xl ${
                      isUnlocked 
                        ? 'bg-[#131538] border-white/5' 
                        : 'bg-[#131538]/30 border-white/5 opacity-50'
                    }`}
                  >
                    {/* Index / Cadenas / Validation */}
                    <View
                      style={{
                        backgroundColor: isCompleted 
                          ? 'rgba(16, 185, 129, 0.1)' 
                          : isUnlocked 
                          ? 'rgba(6, 182, 212, 0.1)' 
                          : 'rgba(255,255,255,0.02)',
                      }}
                      className="w-10 h-10 rounded-xl justify-center items-center mr-4"
                    >
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={18} color="#10B981" />
                      ) : isUnlocked ? (
                        <Text className="text-cyan-400 font-extrabold text-xs">{index + 1}</Text>
                      ) : (
                        <Ionicons name="lock-closed" size={16} color="#64748B" />
                      )}
                    </View>

                    {/* Infos leçon */}
                    <View className="flex-1 mr-4">
                      <Text className="text-white text-xs font-bold leading-5" numberOfLines={1}>
                        {video.title}
                      </Text>
                      <Text className="text-slate-400 text-[10px] mt-1 font-semibold">
                        Par @{video.profiles?.username || 'EduSnap'}
                      </Text>
                    </View>

                    {/* Duration / Play */}
                    {isUnlocked && (
                      <Ionicons name="play-circle-outline" size={24} color="#06B6D4" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}
