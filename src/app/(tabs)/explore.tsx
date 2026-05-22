import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Subject, Video, LearningPath } from '../../types';

const { width } = Dimensions.get('window');

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  // 1. Charger les matières et les données initiales
  useEffect(() => {
    const initExplore = async () => {
      setIsLoading(true);
      try {
        // A. Matières
        const { data: subjectsData } = await supabase
          .from('subjects')
          .select('*')
          .order('name');
        setSubjects(subjectsData || []);

        // B. Vidéos les plus vues (Tendances)
        const { data: videosData } = await supabase
          .from('videos')
          .select('*, profiles(username, avatar_url), subjects(name)')
          .eq('status', 'approved')
          .order('views_count', { ascending: false })
          .limit(6);
        setVideos(videosData || []);

        // C. Parcours d'apprentissage
        const { data: pathsData } = await supabase
          .from('learning_paths')
          .select('*, subjects(name), profiles(username)')
          .limit(4);
        setPaths(pathsData || []);
      } catch (e) {
        console.error('Erreur initialisation explore:', e);
      } finally {
        setIsLoading(false);
      }
    };
    initExplore();
  }, []);

  // 2. Gérer la recherche en temps réel ou filtrée
  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (!text.trim() && !selectedSubjectId) {
      // Réinitialiser la recherche
      setIsSearching(false);
      const { data: videosData } = await supabase
        .from('videos')
        .select('*, profiles(username, avatar_url), subjects(name)')
        .eq('status', 'approved')
        .order('views_count', { ascending: false })
        .limit(6);
      setVideos(videosData || []);
      return;
    }

    setIsSearching(true);
    try {
      let query = supabase
        .from('videos')
        .select('*, profiles(username, avatar_url), subjects(name)')
        .eq('status', 'approved');

      if (text.trim()) {
        query = query.ilike('title', `%${text.trim()}%`);
      }
      if (selectedSubjectId) {
        query = query.eq('subject_id', selectedSubjectId);
      }

      const { data } = await query.order('created_at', { ascending: false });
      setVideos(data || []);
    } catch (e) {
      console.error('Erreur recherche explore:', e);
    }
  };

  const handleSubjectSelect = async (subjectId: number | null) => {
    const newSubjectId = selectedSubjectId === subjectId ? null : subjectId;
    setSelectedSubjectId(newSubjectId);

    setIsSearching(true);
    try {
      let query = supabase
        .from('videos')
        .select('*, profiles(username, avatar_url), subjects(name)')
        .eq('status', 'approved');

      if (newSubjectId) {
        query = query.eq('subject_id', newSubjectId);
      }
      if (searchQuery.trim()) {
        query = query.ilike('title', `%${searchQuery.trim()}%`);
      }

      const { data } = await query.order('created_at', { ascending: false });
      setVideos(data || []);
    } catch (e) {
      console.error('Erreur filtrage matières explore:', e);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#090A1A] justify-center items-center">
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#06B6D4" />
        <Text className="text-slate-400 text-xs mt-4">Exploration des savoirs en cours...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#090A1A] pt-14">
      <StatusBar style="light" />

      {/* ── BARRE DE RECHERCHE ULTRA-PREMIUM ── */}
      <View className="px-6 pb-4">
        <View className="flex-row items-center bg-[#131538] border border-white/5 rounded-2xl px-4 py-3 shadow-lg shadow-black/25">
          <Ionicons name="search-outline" size={20} color="#64748B" />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="Rechercher un concept, une formule..."
            placeholderTextColor="#64748B"
            className="flex-1 text-white text-sm font-semibold ml-3"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* ── FILTRE HORIZONTAL DES MATIÈRES ── */}
        <View className="mb-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingLeft: 24, paddingRight: 24 }}
          >
            {subjects.map((subj) => {
              const isSelected = selectedSubjectId === subj.id;
              return (
                <TouchableOpacity
                  key={subj.id}
                  onPress={() => handleSubjectSelect(subj.id)}
                  style={{
                    backgroundColor: isSelected ? `${subj.color || '#4F46E5'}25` : '#131538',
                    borderColor: isSelected ? subj.color || '#4F46E5' : 'rgba(255,255,255,0.05)',
                  }}
                  className="flex-row items-center border px-4 py-2.5 rounded-full mr-3"
                >
                  <Ionicons
                    name={(subj.icon || 'book-outline') as any}
                    size={15}
                    color={isSelected ? subj.color || '#4F46E5' : '#94A3B8'}
                  />
                  <Text
                    style={{ color: isSelected ? '#FFFFFF' : '#94A3B8' }}
                    className="text-xs font-bold ml-2"
                  >
                    {subj.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {isSearching ? (
          /* ── RÉSULTATS DE RECHERCHE ── */
          <View className="px-6 pb-24">
            <Text className="text-white text-base font-extrabold mb-4">
              Résultats ({videos.length})
            </Text>

            {videos.length === 0 ? (
              <View className="items-center py-20">
                <Ionicons name="search-outline" size={48} color="#334155" />
                <Text className="text-slate-400 text-xs font-bold mt-4 text-center">
                  Aucun résultat trouvé pour votre recherche.
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {videos.map((video) => (
                  <TouchableOpacity
                    key={video.id}
                    onPress={() => router.push(`/video/${video.id}`)}
                    style={{ width: (width - 60) / 2 }}
                    className="bg-[#131538] border border-white/5 rounded-2xl mb-4 overflow-hidden shadow-lg"
                  >
                    {/* Miniature */}
                    <View className="h-44 bg-slate-950 justify-center items-center relative">
                      {video.thumbnail_url ? (
                        <Image source={{ uri: video.thumbnail_url }} className="w-full h-full object-cover" />
                      ) : (
                        <Ionicons name="play-circle" size={36} color="#475569" />
                      )}
                      {/* Difficulté */}
                      <View className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded">
                        <Text className="text-cyan-400 text-[8px] font-extrabold uppercase">
                          {video.difficulty || 'Débutant'}
                        </Text>
                      </View>
                    </View>

                    {/* Titre & Description */}
                    <View className="p-3">
                      <Text className="text-white text-xs font-bold leading-4 mb-1" numberOfLines={2}>
                        {video.title}
                      </Text>
                      <Text className="text-slate-400 text-[9px] font-semibold">
                        @{video.profiles?.username || 'EduSnap'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          /* ── CONTENU PAR DÉFAUT (TENDANCES + PARCOURS) ── */
          <View className="pb-24">
            
            {/* 1. PARCOURS D'APPRENTISSAGE (LEARNING PATHS) */}
            {paths.length > 0 && (
              <View className="mb-8">
                <View className="flex-row justify-between items-center px-6 mb-4">
                  <Text className="text-white text-base font-extrabold">🛣️ Parcours guidés</Text>
                  <TouchableOpacity>
                    <Text className="text-cyan-400 text-xs font-bold">Voir tout</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 24, paddingRight: 24 }}
                >
                  {paths.map((path) => (
                    <TouchableOpacity
                      key={path.id}
                      onPress={() => router.push(`/path/${path.id}`)}
                      style={{ width: width * 0.72 }}
                      className="bg-gradient-to-tr from-[#131538] to-[#1d204a] border border-white/5 rounded-3xl p-5 mr-4 shadow-xl"
                    >
                      <View className="flex-row items-center mb-3">
                        <View className="bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-500/20">
                          <Text className="text-indigo-400 text-[9px] font-extrabold uppercase">
                            {path.subjects?.name || 'Général'}
                          </Text>
                        </View>
                        <Text className="text-slate-400 text-[10px] mx-1.5">•</Text>
                        <Text className="text-cyan-400 text-[9px] font-extrabold uppercase">
                          {path.difficulty || 'Débutant'}
                        </Text>
                      </View>

                      <Text className="text-white text-sm font-extrabold leading-5 mb-2" numberOfLines={1}>
                        {path.title}
                      </Text>
                      <Text className="text-slate-400 text-[11px] leading-4 mb-4" numberOfLines={2}>
                        {path.description || 'Apprenez pas à pas avec ce guide complet.'}
                      </Text>

                      <View className="flex-row items-center justify-between border-t border-white/5 pt-3">
                        <View className="flex-row items-center">
                          <Ionicons name="videocam-outline" size={13} color="#94A3B8" />
                          <Text className="text-slate-400 text-[10px] font-bold ml-1">
                            Cours structuré
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#06B6D4" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* 2. VIDÉOS TENDANCES (COURS RECOMMANDÉS) */}
            <View className="px-6">
              <Text className="text-white text-base font-extrabold mb-4">🔥 Cours populaires</Text>

              <View className="flex-row flex-wrap justify-between">
                {videos.map((video) => (
                  <TouchableOpacity
                    key={video.id}
                    onPress={() => router.push(`/video/${video.id}`)}
                    style={{ width: (width - 60) / 2 }}
                    className="bg-[#131538] border border-white/5 rounded-2xl mb-4 overflow-hidden shadow-lg"
                  >
                    {/* Miniature */}
                    <View className="h-44 bg-slate-950 justify-center items-center relative">
                      {video.thumbnail_url ? (
                        <Image source={{ uri: video.thumbnail_url }} className="w-full h-full object-cover" />
                      ) : (
                        <Ionicons name="play-circle" size={36} color="#475569" />
                      )}
                      {/* Difficulté */}
                      <View className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded">
                        <Text className="text-cyan-400 text-[8px] font-extrabold uppercase">
                          {video.difficulty || 'Débutant'}
                        </Text>
                      </View>
                    </View>

                    {/* Titre & Description */}
                    <View className="p-3">
                      <Text className="text-white text-xs font-bold leading-4 mb-1" numberOfLines={2}>
                        {video.title}
                      </Text>
                      <Text className="text-slate-400 text-[9px] font-semibold">
                        @{video.profiles?.username || 'EduSnap'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

          </View>
        )}
      </ScrollView>
    </View>
  );
}
