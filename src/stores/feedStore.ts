import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Video } from '../types';

interface FeedState {
  videos: Video[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  currentVideoId: string | null;
  page: number;
  fetchFeed: (userId: string | null, refresh?: boolean) => Promise<void>;
  likeVideo: (videoId: string, userId: string) => Promise<void>;
  unlikeVideo: (videoId: string, userId: string) => Promise<void>;
  incrementViews: (videoId: string) => Promise<void>;
  setCurrentVideoId: (videoId: string | null) => void;
}

const ITEMS_PER_PAGE = 5;

export const useFeedStore = create<FeedState>((set, get) => ({
  videos: [],
  isLoading: false,
  isRefreshing: false,
  hasMore: true,
  currentVideoId: null,
  page: 0,

  setCurrentVideoId: (currentVideoId) => set({ currentVideoId }),

  // Chargement du flux vidéo avec algorithme de recommandation personnalisé
  fetchFeed: async (userId, refresh = false) => {
    const { isLoading, videos, page, hasMore } = get();
    if (isLoading || (!hasMore && !refresh)) return;

    if (refresh) {
      set({ isRefreshing: true, page: 0, hasMore: true });
    } else {
      set({ isLoading: true });
    }

    const currentPage = refresh ? 0 : page;
    const startRange = currentPage * ITEMS_PER_PAGE;
    const endRange = startRange + ITEMS_PER_PAGE - 1;

    try {
      let preferredSubjectIds: number[] = [];
      let userLevel = 'Novice';

      // 1. Récupération des préférences utilisateur si authentifié
      if (userId) {
        // A. Matières favorites
        const { data: userSubjects } = await supabase
          .from('user_subjects')
          .select('subject_id')
          .eq('user_id', userId);

        if (userSubjects) {
          preferredSubjectIds = userSubjects.map((us) => us.subject_id);
        }

        // B. Niveau actuel
        const { data: profile } = await supabase
          .from('profiles')
          .select('level')
          .eq('id', userId)
          .single();

        if (profile) {
          userLevel = profile.level;
        }
      }

      // Déterminer la difficulté recommandée
      // Novice -> Débutant | Apprenti, Scholar -> Intermédiaire | Expert, Master -> Avancé
      let recommendedDifficulties: string[] = ['Débutant'];
      if (userLevel === 'Apprenti' || userLevel === 'Scholar') {
        recommendedDifficulties = ['Intermédiaire', 'Débutant'];
      } else if (userLevel === 'Expert' || userLevel === 'Master') {
        recommendedDifficulties = ['Avancé', 'Intermédiaire'];
      }

      // 2. Requête Supabase pour récupérer les vidéos approuvées
      // Nous chargeons les infos du créateur et de la matière en jointure
      let query = supabase
        .from('videos')
        .select('*, profiles!videos_creator_id_fkey(*), subjects(*)')
        .eq('status', 'approved');

      // Algorithme de tri intelligent en SQL/JS :
      // On récupère les vidéos approuvées et on applique une pondération.
      // Pour la pagination, on ordonne par date de création ou popularité.
      query = query
        .order('created_at', { ascending: false })
        .range(startRange, endRange);

      const { data: rawVideos, error } = await query;

      if (error) throw error;

      let fetchedVideos = (rawVideos || []) as Video[];

      // 3. Algorithme de Recommandation Local :
      // On trie ou réorganise les vidéos de la page en fonction des préférences de l'utilisateur
      if (userId && fetchedVideos.length > 0) {
        fetchedVideos.sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;

          // A. Bonus pour matières préférées (+10 pts)
          if (a.subject_id && preferredSubjectIds.includes(a.subject_id)) scoreA += 10;
          if (b.subject_id && preferredSubjectIds.includes(b.subject_id)) scoreB += 10;

          // B. Bonus pour niveau de difficulté aligné (+5 pts)
          if (a.difficulty && recommendedDifficulties.includes(a.difficulty)) scoreA += 5;
          if (b.difficulty && recommendedDifficulties.includes(b.difficulty)) scoreB += 5;

          // C. Priorisation de la nouveauté
          return scoreB - scoreA;
        });
      }

      // 4. Mise à jour de l'état global
      const newVideos = refresh ? fetchedVideos : [...videos, ...fetchedVideos];
      
      set({
        videos: newVideos,
        page: currentPage + 1,
        hasMore: fetchedVideos.length === ITEMS_PER_PAGE,
      });

      // Si c'est le premier chargement ou refresh, définir la première vidéo comme active
      if (newVideos.length > 0 && (refresh || !get().currentVideoId)) {
        set({ currentVideoId: newVideos[0].id });
      }
    } catch (e) {
      console.error('Erreur lors du chargement du feed vidéo:', e);
    } finally {
      set({ isLoading: false, isRefreshing: false });
    }
  },

  // Aimer une vidéo
  likeVideo: async (videoId, userId) => {
    try {
      // Insertion optimiste
      const updatedVideos = get().videos.map((vid) => {
        if (vid.id === videoId) {
          return { ...vid, likes_count: vid.likes_count + 1 };
        }
        return vid;
      });
      set({ videos: updatedVideos });

      const { error } = await supabase
        .from('likes')
        .insert({ user_id: userId, video_id: videoId });

      if (error) {
        // En cas d'erreur de clé primaire en double (déjà aimé), on ignore silencieusement
        if (error.code !== '23505') throw error;
      }
    } catch (e) {
      console.error('Erreur lors du like de la vidéo:', e);
      // Revenir à l'état précédent en cas d'échec
      get().fetchFeed(userId, true);
    }
  },

  // Enlever le like d'une vidéo
  unlikeVideo: async (videoId, userId) => {
    try {
      // Retrait optimiste
      const updatedVideos = get().videos.map((vid) => {
        if (vid.id === videoId) {
          return { ...vid, likes_count: Math.max(0, vid.likes_count - 1) };
        }
        return vid;
      });
      set({ videos: updatedVideos });

      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('video_id', videoId);

      if (error) throw error;
    } catch (e) {
      console.error('Erreur lors de l\'unlike de la vidéo:', e);
      get().fetchFeed(userId, true);
    }
  },

  // Incrémenter les vues d'une vidéo
  incrementViews: async (videoId) => {
    try {
      // Incrémentation locale optimiste
      const updatedVideos = get().videos.map((vid) => {
        if (vid.id === videoId) {
          return { ...vid, views_count: vid.views_count + 1 };
        }
        return vid;
      });
      set({ videos: updatedVideos });

      // Appel Supabase pour incrémenter la valeur
      // Note : on peut exécuter un update ou créer un RPC. Ici un simple update de supression concurrentielle
      const { data: video } = await supabase
        .from('videos')
        .select('views_count')
        .eq('id', videoId)
        .single();
      
      if (video) {
        await supabase
          .from('videos')
          .update({ views_count: video.views_count + 1 })
          .eq('id', videoId);
      }
    } catch (e) {
      console.error('Erreur lors de l\'incrémentation des vues:', e);
    }
  },
}));
