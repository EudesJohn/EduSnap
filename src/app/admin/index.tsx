import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Video, Report } from '../../types';

const { width } = Dimensions.get('window');

export default function AdminScreen() {
  const [pendingVideos, setPendingVideos] = useState<Video[]>([]);
  const [reports, setReports] = useState<(Report & { videos: Video & { profiles: { username: string } } })[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'reports'>('pending');
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. Charger les vidéos en attente de modération (status = 'pending')
      const { data: videosData } = await supabase
        .from('videos')
        .select('*, profiles(username), subjects(name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setPendingVideos((videosData || []) as any);

      // 2. Charger les signalements en attente (status = 'pending')
      const { data: reportsData } = await supabase
        .from('reports')
        .select('*, videos(*, profiles(username))')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setReports((reportsData || []) as any);
    } catch (e) {
      console.error('Erreur de chargement admin:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Approbation d'une vidéo
  const handleApproveVideo = async (videoId: string, creatorId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ status: 'approved' })
        .eq('id', videoId);

      if (error) throw error;

      // Envoyer une notification au créateur
      await supabase.from('notifications').insert({
        user_id: creatorId,
        type: 'video_approved',
        message: `Félicitations ! Votre cours "${title}" a été validé par la modération et est en ligne ! 🎉`,
      });

      // Donner 50 XP bonus de publication au créateur (via RPC add_user_xp)
      await supabase.rpc('add_user_xp', {
        p_user_id: creatorId,
        p_xp_to_add: 50,
        p_xp_reason: 'Contribution : Cours validé par la modération (+50 XP) 📺',
      });

      Alert.alert('Succès', 'La vidéo a été approuvée avec succès !');
      fetchAdminData();
    } catch (e) {
      console.error('Erreur approbation:', e);
      Alert.alert('Erreur', 'Impossible d\'approuver la vidéo.');
    }
  };

  // Rejet d'une vidéo
  const handleRejectVideo = async (videoId: string, creatorId: string, title: string) => {
    Alert.prompt(
      'Motif du rejet',
      'Spécifiez la raison pour laquelle le cours est rejeté (ex: Qualité audio, hors sujet...)',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Confirmer le rejet',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              const { error } = await supabase
                .from('videos')
                .update({ 
                  status: 'rejected',
                  ai_reason: `[REJET MANUEL] ${reason || 'Contenu non conforme aux directives.'}`
                })
                .eq('id', videoId);

              if (error) throw error;

              // Envoyer une notification explicative au créateur
              await supabase.from('notifications').insert({
                user_id: creatorId,
                type: 'video_rejected',
                message: `Votre vidéo "${title}" a été refusée par la modération. Motif: ${reason || 'Contenu non conforme.'}`,
              });

              Alert.alert('Vidéo rejetée', 'Le créateur a été notifié.');
              fetchAdminData();
            } catch (e) {
              console.error('Erreur rejet:', e);
              Alert.alert('Erreur', 'Impossible de rejeter la vidéo.');
            }
          },
        },
      ]
    );
  };

  // Ignorer un signalement
  const handleIgnoreReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'ignored' })
        .eq('id', reportId);

      if (error) throw error;

      Alert.alert('Ignoré', 'Le signalement a été classé sans suite.');
      fetchAdminData();
    } catch (e) {
      console.error('Erreur classement signalement:', e);
    }
  };

  // Traiter un signalement (suspendre la vidéo liée)
  const handleResolveReport = async (reportId: string, videoId: string, creatorId: string, title: string) => {
    try {
      // 1. Marquer le signalement comme résolu
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId);

      // 2. Mettre la vidéo en rejeté
      await supabase.from('videos').update({ 
        status: 'rejected', 
        ai_reason: '[SIGNALEMENT UTILISATEUR] Supprimé pour contenu signalé et vérifié.'
      }).eq('id', videoId);

      // 3. Notifier le créateur
      await supabase.from('notifications').insert({
        user_id: creatorId,
        type: 'video_rejected',
        message: `Votre vidéo "${title}" a été suspendue suite à un signalement d'utilisateur vérifié par l'équipe.`,
      });

      Alert.alert('Signalement résolu', 'Vidéo suspendue et créateur notifié.');
      fetchAdminData();
    } catch (e) {
      console.error('Erreur traitement signalement:', e);
    }
  };

  return (
    <View className="flex-1 bg-[#090A1A] pt-14">
      <StatusBar style="light" />

      {/* Header */}
      <View className="flex-row items-center px-6 pb-4 border-b border-white/5">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-lg font-black">Espace Modérateur</Text>
          <Text className="text-slate-400 text-xs mt-0.5">Veille et respect de la charte académique</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="flex-row bg-[#131538] mx-6 my-4 rounded-xl p-1 border border-white/5">
        <TouchableOpacity
          onPress={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
            activeTab === 'pending' ? 'bg-indigo-600' : 'bg-transparent'
          }`}
        >
          <Text className="text-white text-xs font-extrabold">
            ⏳ À Valider ({pendingVideos.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setActiveTab('reports')}
          className={`flex-1 py-2.5 rounded-lg items-center justify-center ${
            activeTab === 'reports' ? 'bg-indigo-600' : 'bg-transparent'
          }`}
        >
          <Text className="text-white text-xs font-extrabold">
            🛡️ Signalés ({reports.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#06B6D4" />
        </View>
      ) : (
        <ScrollView className="flex-1 px-6 pb-12" showsVerticalScrollIndicator={false}>
          {activeTab === 'pending' ? (
            // A. VIDÉOS À VALIDER
            pendingVideos.length === 0 ? (
              <View className="items-center py-20">
                <Ionicons name="shield-checkmark" size={48} color="#10B981" />
                <Text className="text-slate-400 text-xs font-bold mt-4 text-center">
                  Aucun cours en attente de modération.{'\n'}Bon travail !
                </Text>
              </View>
            ) : (
              pendingVideos.map((video) => (
                <View key={video.id} className="bg-[#131538] border border-white/5 rounded-3xl p-5 mb-4 shadow-lg">
                  {/* Matière / Difficulté */}
                  <View className="flex-row items-center mb-3">
                    <View className="bg-indigo-950/40 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      <Text className="text-indigo-400 text-[9px] font-extrabold uppercase">
                        {video.subjects?.name || 'Général'}
                      </Text>
                    </View>
                    <Text className="text-slate-400 text-[10px] mx-1.5">•</Text>
                    <Text className="text-cyan-400 text-[9px] font-extrabold uppercase">
                      {video.difficulty || 'Débutant'}
                    </Text>
                  </View>

                  {/* Infos */}
                  <Text className="text-white text-sm font-extrabold leading-5 mb-1">{video.title}</Text>
                  <Text className="text-slate-400 text-[10px] font-bold">Par @{video.profiles?.username || 'Auteur'}</Text>
                  
                  {video.description && (
                    <Text className="text-slate-300 text-xs leading-4 mt-2.5">{video.description}</Text>
                  )}

                  {/* AI Score Modération Box */}
                  <View className="mt-4 bg-black/40 border border-white/5 p-3 rounded-2xl">
                    <View className="flex-row justify-between items-center mb-1.5">
                      <Text className="text-slate-400 text-[10px] font-bold">Analyse IA Score :</Text>
                      <Text
                        className={`text-xs font-black ${
                          (video.ai_score || 0) >= 80 
                            ? 'text-emerald-400' 
                            : (video.ai_score || 0) >= 50 
                            ? 'text-amber-400' 
                            : 'text-rose-400'
                        }`}
                      >
                        {video.ai_score !== null ? `${video.ai_score}/100` : 'En cours d\'analyse'}
                      </Text>
                    </View>
                    <Text className="text-slate-400 text-[10px] leading-4">
                      {video.ai_reason || 'L\'IA évalue le contenu pédagogique et la pertinence académique.'}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View className="flex-row gap-3 mt-5">
                    <TouchableOpacity
                      onPress={() => router.push(`/video/${video.id}`)}
                      className="flex-1 bg-white/5 border border-white/10 h-10 rounded-xl justify-center items-center"
                    >
                      <Text className="text-slate-200 font-bold text-xs">Vérifier</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => handleRejectVideo(video.id, video.creator_id, video.title)}
                      className="flex-1 bg-rose-950/20 border border-rose-500/30 h-10 rounded-xl justify-center items-center"
                    >
                      <Text className="text-rose-400 font-bold text-xs">Rejeter</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleApproveVideo(video.id, video.creator_id, video.title)}
                      className="flex-1 bg-emerald-600 h-10 rounded-xl justify-center items-center shadow"
                    >
                      <Text className="text-white font-black text-xs">Approuver</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          ) : (
            // B. SIGNALEMENTS
            reports.length === 0 ? (
              <View className="items-center py-20">
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                <Text className="text-slate-400 text-xs font-bold mt-4 text-center">
                  Aucun signalement en attente de traitement.
                </Text>
              </View>
            ) : (
              reports.map((rep) => (
                <View key={rep.id} className="bg-[#131538] border border-white/5 rounded-3xl p-5 mb-4 shadow-lg">
                  {/* Signalement Motif */}
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="bg-rose-950/30 px-3 py-1.5 rounded-full border border-rose-500/20 flex-row items-center">
                      <Ionicons name="flag" size={12} color="#EF4444" />
                      <Text className="text-rose-400 text-[10px] font-bold ml-1.5">{rep.reason}</Text>
                    </View>
                    <Text className="text-slate-400 text-[9px] font-semibold">
                      Signalé par : ID_{rep.reporter_id.slice(0, 6)}
                    </Text>
                  </View>

                  {/* Vidéo liée */}
                  {rep.videos && (
                    <View className="bg-black/30 border border-white/5 p-3 rounded-2xl mb-4">
                      <Text className="text-white text-xs font-extrabold" numberOfLines={1}>
                        {rep.videos.title}
                      </Text>
                      <Text className="text-slate-400 text-[9px] mt-0.5">Par @{rep.videos.profiles?.username || 'Auteur'}</Text>
                    </View>
                  )}

                  {/* Actions signalement */}
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => rep.videos && router.push(`/video/${rep.videos.id}`)}
                      className="flex-1 bg-white/5 border border-white/10 h-10 rounded-xl justify-center items-center"
                    >
                      <Text className="text-slate-200 font-bold text-xs">Visionner</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleIgnoreReport(rep.id)}
                      className="flex-1 bg-[#131538] border border-slate-500/20 h-10 rounded-xl justify-center items-center"
                    >
                      <Text className="text-slate-400 font-bold text-xs">Ignorer</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => rep.videos && handleResolveReport(rep.id, rep.video_id, rep.videos.creator_id, rep.videos.title)}
                      className="flex-1 bg-rose-600 h-10 rounded-xl justify-center items-center shadow"
                    >
                      <Text className="text-white font-black text-xs">Suspendre</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
    </View>
  );
}
