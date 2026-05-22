import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Share, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useFeed } from '../../hooks/useFeed';
import { supabase } from '../../lib/supabase';
import { VideoPlayer } from './VideoPlayer';
import { QuizOverlay } from './QuizOverlay';

const { height } = Dimensions.get('window');

interface VideoCardProps {
  video: Video;
  shouldPlay: boolean;
  isActive: boolean;
  onScrollToNext: () => void;
}

export const VideoCard: React.FC<VideoCardProps> = ({
  video,
  shouldPlay,
  isActive,
  onScrollToNext,
}) => {
  const currentUser = useAuthStore((state) => state.user);
  const { toggleLike } = useFeed();

  // États locaux
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(video.likes_count || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);

  const creator = video.profiles;
  const subject = video.subjects;

  // 1. Charger les états d'interaction Supabase (Like, Follow, Sauvegarde) au montage
  useEffect(() => {
    if (!currentUser) return;

    const checkInteractions = async () => {
      try {
        // A. Vérifier si aimé
        const { data: likeData } = await supabase
          .from('likes')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('video_id', video.id)
          .maybeSingle();

        setIsLiked(!!likeData);

        // B. Vérifier si créateur suivi
        if (video.creator_id) {
          const { data: followData } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', currentUser.id)
            .eq('following_id', video.creator_id)
            .maybeSingle();

          setIsFollowing(!!followData);
        }
      } catch (e) {
        console.error('Erreur lors du chargement des états d\'interaction:', e);
      }
    };

    checkInteractions();
  }, [video.id, video.creator_id, currentUser]);

  // Réinitialiser la barre de progression et le quiz quand le scroll s'écarte
  useEffect(() => {
    if (!isActive) {
      setVideoProgress(0);
      setShowQuiz(false);
    }
  }, [isActive]);

  // 2. Gestion du Like
  const handleLikePress = async () => {
    if (!currentUser) return;

    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));

    await toggleLike(video.id, isLiked);
  };

  // 3. Gestion du Follow
  const handleFollowPress = async () => {
    if (!currentUser || !video.creator_id) return;

    try {
      if (isFollowing) {
        setIsFollowing(false);
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', video.creator_id);
      } else {
        setIsFollowing(true);
        await supabase
          .from('follows')
          .insert({ follower_id: currentUser.id, following_id: video.creator_id });
        
        // Créer une notification in-app au créateur
        await supabase.from('notifications').insert({
          user_id: video.creator_id,
          type: 'follow',
          message: `${useAuthStore.getState().profile?.username || 'Quelqu\'un'} a commencé à vous suivre.`,
        });
      }
    } catch (e) {
      console.error('Erreur de gestion du Follow:', e);
    }
  };

  // 4. Gestion de la Sauvegarde
  const handleSavePress = () => {
    setIsSaved(!isSaved);
    // Dans cette version, nous sauvegardons en local/state.
    alert(isSaved ? 'Retiré des favoris' : 'Vidéo enregistrée dans vos favoris ! 📌');
  };

  // 5. Gestion du Partage natif
  const handleSharePress = async () => {
    try {
      await Share.share({
        message: `Découvrez ce super cours d'EduSnap sur "${video.title}" ! Regardez ici : ${video.video_url}`,
      });
    } catch (e) {
      console.error('Erreur lors du partage:', e);
    }
  };

  // 6. Gestion du Signalement
  const handleReportPress = async () => {
    if (!currentUser) return;
    
    alert('Vidéo signalée. Notre équipe de modération va examiner le contenu sous 24h. 🛡️');
    
    try {
      await supabase.from('reports').insert({
        video_id: video.id,
        reporter_id: currentUser.id,
        reason: 'Pas éducatif',
        status: 'pending',
      });
    } catch (e) {
      console.error('Erreur de signalement:', e);
    }
  };

  // 7. Fin de la vidéo -> Activer le Quiz Overlay
  const handleVideoEnded = () => {
    setShowQuiz(true);
  };

  // 8. Résolution du Quiz
  const handleQuizClose = (quizPassed: boolean) => {
    setShowQuiz(false);
    // Faire défiler automatiquement vers la vidéo suivante (effet TikTok fluide)
    onScrollToNext();
  };

  return (
    <View style={{ height }} className="w-full bg-black relative justify-end">
      
      {/* 1. LECTEUR VIDÉO D'ARRIÈRE-PLAN */}
      <VideoPlayer
        videoUrl={video.video_url}
        shouldPlay={shouldPlay && !showQuiz}
        isMuted={false}
        onProgress={setVideoProgress}
        onVideoEnded={handleVideoEnded}
      />

      {/* 2. BADGE MATIÈRE & NIVEAU (Coin haut gauche) */}
      {subject && (
        <View className="absolute top-16 left-6 z-10 flex-row items-center bg-[#131538]/85 border border-white/10 px-3 py-1.5 rounded-full shadow-lg">
          <Ionicons name="school" size={14} color="#06B6D4" />
          <Text className="text-white text-xs font-bold ml-1.5">{subject.name}</Text>
          <Text className="text-slate-400 text-[10px] mx-1.5">•</Text>
          <Text className="text-cyan-400 text-[10px] font-extrabold uppercase">{video.difficulty || 'Débutant'}</Text>
        </View>
      )}

      {/* 3. TRAY SOCIAL & CRÉATEUR (Côté droit) */}
      <View className="absolute right-4 bottom-24 z-10 items-center space-y-6">
        
        {/* Bulbe Profil Créateur */}
        {creator && (
          <View className="items-center mb-3">
            <TouchableOpacity 
              onPress={handleFollowPress} 
              className="relative w-12 h-12 rounded-full border-2 border-indigo-500 shadow-md bg-slate-900 justify-center items-center overflow-hidden"
            >
              {creator.avatar_url ? (
                <Image source={{ uri: creator.avatar_url }} className="w-full h-full" />
              ) : (
                <Ionicons name="person" size={24} color="#94A3B8" />
              )}
            </TouchableOpacity>
            
            {/* Bouton de follow miniature (+) */}
            {currentUser?.id !== video.creator_id && (
              <TouchableOpacity
                onPress={handleFollowPress}
                className={`absolute bottom-[-6px] w-5 h-5 rounded-full items-center justify-center border border-background shadow ${
                  isFollowing ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
              >
                <Ionicons name={isFollowing ? 'checkmark' : 'add'} size={12} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bouton J'aime (Heart) */}
        <View className="items-center">
          <TouchableOpacity
            onPress={handleLikePress}
            className="w-12 h-12 rounded-full bg-black/45 border border-white/5 items-center justify-center shadow"
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={isLiked ? '#EF4444' : '#FFFFFF'}
            />
          </TouchableOpacity>
          <Text className="text-white text-xs font-bold mt-1 shadow-sm">{likesCount}</Text>
        </View>

        {/* Bouton Commentaire */}
        <View className="items-center">
          <TouchableOpacity
            onPress={() => alert('Les commentaires en temps réel arrivent bientôt sur EduSnap ! 💬')}
            className="w-12 h-12 rounded-full bg-black/45 border border-white/5 items-center justify-center shadow"
          >
            <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-white text-xs font-bold mt-1 shadow-sm">12</Text>
        </View>

        {/* Bouton Sauvegarder */}
        <View className="items-center">
          <TouchableOpacity
            onPress={handleSavePress}
            className="w-12 h-12 rounded-full bg-black/45 border border-white/5 items-center justify-center shadow"
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={isSaved ? '#F59E0B' : '#FFFFFF'}
            />
          </TouchableOpacity>
          <Text className="text-white text-[10px] font-bold mt-1 shadow-sm">Sauver</Text>
        </View>

        {/* Bouton Partager */}
        <View className="items-center">
          <TouchableOpacity
            onPress={handleSharePress}
            className="w-12 h-12 rounded-full bg-black/45 border border-white/5 items-center justify-center shadow"
          >
            <Ionicons name="share-social-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-white text-[10px] font-bold mt-1 shadow-sm">Partager</Text>
        </View>

        {/* Bouton Plus / Signaler */}
        <TouchableOpacity
          onPress={handleReportPress}
          className="w-8 h-8 rounded-full bg-black/40 items-center justify-center border border-white/5"
        >
          <Ionicons name="flag-outline" size={16} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* 4. BLOC D'INFOS DESCRIPTION (Bas gauche) */}
      <View className="absolute left-4 bottom-8 right-20 z-10 space-y-2 p-2">
        {creator && (
          <Text className="text-white text-base font-extrabold tracking-tight">
            @{creator.username}
          </Text>
        )}
        
        <Text className="text-slate-100 text-sm font-bold leading-5">
          {video.title}
        </Text>
        
        {video.description && (
          <Text className="text-slate-300 text-xs leading-4" numberOfLines={2}>
            {video.description}
          </Text>
        )}
      </View>

      {/* 5. BARRE DE PROGRESSION VIDÉO */}
      <View className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-20">
        <View
          style={{ width: `${videoProgress * 100}%` }}
          className="h-full bg-cyan-400"
        />
      </View>

      {/* 6. SYSTEME DE QUIZ OVERLAY */}
      {showQuiz && (
        <QuizOverlay
          videoId={video.id}
          videoTitle={video.title}
          subjectName={subject?.name || 'Général'}
          onClose={handleQuizClose}
        />
      )}
    </View>
  );
};

export default VideoCard;
