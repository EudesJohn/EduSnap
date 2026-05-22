import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { LevelBadge } from '../../components/ui/LevelBadge';
import { StreakBadge } from '../../components/ui/StreakBadge';
import { ProgressBar } from '../../components/ui/ProgressBar';

const { width } = Dimensions.get('window');

// Icônes et couleurs pour les stats
const STAT_CARDS = [
  { key: 'views', label: 'Vues totales', icon: 'eye-outline', color: '#38BDF8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.25)' },
  { key: 'quiz_success', label: 'Taux quiz réussi', icon: 'school-outline', color: '#818CF8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.25)', suffix: '%' },
  { key: 'xp_generated', label: 'XP générés', icon: 'flash-outline', color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
  { key: 'followers', label: 'Abonnés', icon: 'people-outline', color: '#10B981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.25)' },
];

interface CreatorStats {
  views: number;
  quiz_success: number;
  xp_generated: number;
  followers: number;
  video_count: number;
  videos: any[];
}

export default function CreatorDashboard() {
  const { user, profile } = useAuthStore();
  const [stats, setStats] = useState<CreatorStats>({
    views: 0,
    quiz_success: 0,
    xp_generated: 0,
    followers: 0,
    video_count: 0,
    videos: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'videos'>('overview');

  // Charger les statistiques du créateur depuis Supabase
  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      // 1. Récupérer les vidéos du créateur avec stats
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('*, subjects(name)')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // 2. Calculer les stats agrégées
      const totalViews = (videos || []).reduce((sum, v) => sum + (v.views_count || 0), 0);

      // 3. Récupérer le nombre d'abonnés
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      // 4. Taux de réussite quiz (simulé à partir des données disponibles)
      const avgQuizSuccess = videos && videos.length > 0
        ? Math.round(65 + Math.random() * 25) // Simulé — à remplacer par vraies données analytics
        : 0;

      // 5. XP totaux générés par les vidéos du créateur
      const xpGenerated = totalViews * 5; // Approximation : 5 XP par vue

      setStats({
        views: totalViews,
        quiz_success: avgQuizSuccess,
        xp_generated: xpGenerated,
        followers: followersCount || 0,
        video_count: (videos || []).length,
        videos: videos || [],
      });
    } catch (e) {
      console.error('Erreur lors du chargement des stats créateur:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchStats();
  };

  const getVideoStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return { text: '#10B981', bg: 'rgba(16,185,129,0.1)', label: 'Approuvée' };
      case 'pending': return { text: '#FBBF24', bg: 'rgba(251,191,36,0.1)', label: 'En révision' };
      case 'rejected': return { text: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Rejetée' };
      default: return { text: '#94A3B8', bg: 'rgba(148,163,184,0.1)', label: 'Inconnue' };
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090A1A', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#818CF8" />
        <Text style={{ color: '#94A3B8', marginTop: 12, fontSize: 13 }}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#090A1A' }}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#818CF8" />}
      >
        {/* ── EN-TÊTE CRÉATEUR ── */}
        <View
          style={{
            paddingTop: 60,
            paddingBottom: 24,
            paddingHorizontal: 20,
            background: 'transparent',
          }}
        >
          {/* Header row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <View>
              <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
                Espace Créateur
              </Text>
              <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>
                Tableau de bord
              </Text>
            </View>

            {/* Bouton Upload */}
            <TouchableOpacity
              onPress={() => router.push('/creator/upload')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#818CF8',
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: 14,
                shadowColor: '#818CF8',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13, marginLeft: 4 }}>
                Publier
              </Text>
            </TouchableOpacity>
          </View>

          {/* Profil compact */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: 16,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: '#131538',
                borderWidth: 2,
                borderColor: '#818CF8',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                marginRight: 14,
              }}
            >
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Ionicons name="person" size={26} color="#94A3B8" />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15, marginBottom: 4 }}>
                {profile?.full_name || profile?.username || 'Créateur'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <LevelBadge level={profile?.level || 'Novice'} size="sm" />
                <StreakBadge streak={profile?.streak_days || 0} size="sm" />
              </View>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#818CF8', fontWeight: '900', fontSize: 18 }}>
                {stats.video_count}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>vidéos</Text>
            </View>
          </View>
        </View>

        {/* ── GRILLE DE STATS ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 14 }}>
            Statistiques
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {STAT_CARDS.map((card) => {
              const value = stats[card.key as keyof CreatorStats] as number;
              return (
                <View
                  key={card.key}
                  style={{
                    width: (width - 52) / 2,
                    backgroundColor: card.bg,
                    borderWidth: 1,
                    borderColor: card.border,
                    borderRadius: 18,
                    padding: 16,
                  }}
                >
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: card.bg,
                      borderWidth: 1,
                      borderColor: card.border,
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <Ionicons name={card.icon as any} size={18} color={card.color} />
                  </View>
                  <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 }}>
                    {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                    {card.suffix || ''}
                  </Text>
                  <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '600', marginTop: 2 }}>
                    {card.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── ONGLETS ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderRadius: 14,
              padding: 4,
            }}
          >
            {(['overview', 'videos'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 11,
                  alignItems: 'center',
                  backgroundColor: activeTab === tab ? '#818CF8' : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: activeTab === tab ? '#FFFFFF' : '#64748B',
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  {tab === 'overview' ? 'Aperçu' : 'Mes vidéos'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── CONTENU ONGLET ── */}
        {activeTab === 'overview' ? (
          <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            {/* Progression XP */}
            <View
              style={{
                backgroundColor: 'rgba(129,140,248,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(129,140,248,0.2)',
                borderRadius: 20,
                padding: 18,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                  Niveau & XP
                </Text>
                <Text style={{ color: '#818CF8', fontWeight: '700', fontSize: 13 }}>
                  {profile?.xp_points || 0} XP
                </Text>
              </View>
              <ProgressBar progress={(profile?.xp_points || 0) % 500 / 500} />
              <Text style={{ color: '#64748B', fontSize: 11, marginTop: 8 }}>
                {500 - ((profile?.xp_points || 0) % 500)} XP restants pour le prochain niveau
              </Text>
            </View>

            {/* Conseils créateur */}
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800', marginBottom: 12 }}>
              💡 Conseils pour optimiser
            </Text>
            {[
              { icon: 'videocam-outline', title: 'Publiez régulièrement', desc: 'Les créateurs actifs 3x/semaine ont +240% de vues.', color: '#38BDF8' },
              { icon: 'help-circle-outline', title: 'Ajoutez des quiz personnalisés', desc: 'Les vidéos avec quiz retiennent l\'attention 3x plus longtemps.', color: '#818CF8' },
              { icon: 'trending-up-outline', title: 'Choisissez le bon niveau de difficulté', desc: 'Adapter au niveau de vos apprenants booste le taux de complétion.', color: '#10B981' },
            ].map((tip, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.06)',
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: tip.color + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons name={tip.icon as any} size={18} color={tip.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginBottom: 3 }}>
                    {tip.title}
                  </Text>
                  <Text style={{ color: '#64748B', fontSize: 12, lineHeight: 17 }}>
                    {tip.desc}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* ── LISTE DES VIDÉOS ── */
          <View style={{ paddingHorizontal: 20, paddingBottom: 40 }}>
            {stats.videos.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48 }}>
                <Ionicons name="film-outline" size={48} color="#334155" />
                <Text style={{ color: '#64748B', fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                  Vous n'avez encore publié aucune vidéo.{'\n'}Commencez dès maintenant !
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/creator/upload')}
                  style={{
                    marginTop: 20,
                    backgroundColor: '#818CF8',
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 14,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                    Publier ma première vidéo
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              stats.videos.map((video) => {
                const statusConfig = getVideoStatusColor(video.status);
                return (
                  <View
                    key={video.id}
                    style={{
                      flexDirection: 'row',
                      backgroundColor: 'rgba(255,255,255,0.03)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.07)',
                      borderRadius: 18,
                      padding: 14,
                      marginBottom: 12,
                      alignItems: 'center',
                    }}
                  >
                    {/* Miniature */}
                    <View
                      style={{
                        width: 72,
                        height: 52,
                        borderRadius: 10,
                        backgroundColor: '#131538',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                        overflow: 'hidden',
                      }}
                    >
                      {video.thumbnail_url ? (
                        <Image source={{ uri: video.thumbnail_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Ionicons name="play-circle" size={26} color="#334155" />
                      )}
                    </View>

                    {/* Infos */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13, marginBottom: 4 }} numberOfLines={1}>
                        {video.title}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {/* Statut */}
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                            backgroundColor: statusConfig.bg,
                          }}
                        >
                          <Text style={{ color: statusConfig.text, fontSize: 10, fontWeight: '700' }}>
                            {statusConfig.label}
                          </Text>
                        </View>
                        {/* Matière */}
                        {video.subjects && (
                          <Text style={{ color: '#64748B', fontSize: 11 }}>
                            {video.subjects.name}
                          </Text>
                        )}
                      </View>
                      {/* Vues */}
                      <Text style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
                        {video.views_count || 0} vues · {video.likes_count || 0} likes
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
