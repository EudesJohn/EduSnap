import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { Video } from '../../types';
import { VideoCard } from '../../components/feed/VideoCard';

export default function VideoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchVideo = async () => {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('*, profiles(username, avatar_url), subjects(name)')
          .eq('id', id)
          .single();

        if (error) throw error;

        if (data) {
          setVideo(data as Video);
        }
      } catch (e) {
        console.error('Erreur lors du chargement de la vidéo:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  const handleClose = () => {
    router.back();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#06B6D4" />
      </View>
    );
  }

  if (!video) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text className="text-white text-base font-extrabold mt-4 text-center">Vidéo introuvable</Text>
        <Text className="text-slate-400 text-xs text-center mt-2">
          Le cours recherché a pu être retiré ou n'est plus disponible.
        </Text>
        <TouchableOpacity
          onPress={handleClose}
          className="mt-6 bg-[#131538] px-6 py-3 rounded-full border border-white/10"
        >
          <Text className="text-white font-bold text-xs">Retourner</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" />

      {/* Bouton retour flotant */}
      <TouchableOpacity
        onPress={handleClose}
        style={{ top: 58, left: 20 }}
        className="absolute w-10 h-10 rounded-full bg-black/60 border border-white/10 justify-center items-center z-30"
      >
        <Ionicons name="close" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <VideoCard
        video={video}
        shouldPlay={true}
        isActive={true}
        onScrollToNext={handleClose}
      />
    </View>
  );
}
