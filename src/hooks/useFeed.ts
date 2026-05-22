import { useEffect, useCallback } from 'react';
import { useFeedStore } from '../stores/feedStore';
import { useAuthStore } from '../stores/authStore';

export const useFeed = () => {
  const user = useAuthStore((state) => state.user);
  const {
    videos,
    isLoading,
    isRefreshing,
    hasMore,
    currentVideoId,
    fetchFeed,
    likeVideo,
    unlikeVideo,
    incrementViews,
    setCurrentVideoId,
  } = useFeedStore();

  const userId = user?.id || null;

  // Charger le flux initialement
  useEffect(() => {
    if (videos.length === 0) {
      fetchFeed(userId, true);
    }
  }, [userId, fetchFeed, videos.length]);

  // Rafraîchir le flux
  const handleRefresh = useCallback(async () => {
    await fetchFeed(userId, true);
  }, [userId, fetchFeed]);

  // Charger plus de vidéos (infinite scroll)
  const handleLoadMore = useCallback(async () => {
    if (hasMore && !isLoading && !isRefreshing) {
      await fetchFeed(userId, false);
    }
  }, [userId, hasMore, isLoading, isRefreshing, fetchFeed]);

  // Gérer l'action d'aimer / enlever le like
  const handleToggleLike = useCallback(
    async (videoId: string, isCurrentlyLiked: boolean) => {
      if (!userId) {
        console.warn('Utilisateur non connecté pour effectuer un Like');
        return;
      }

      if (isCurrentlyLiked) {
        await unlikeVideo(videoId, userId);
      } else {
        await likeVideo(videoId, userId);
      }
    },
    [userId, likeVideo, unlikeVideo]
  );

  return {
    videos,
    isLoading,
    isRefreshing,
    hasMore,
    currentVideoId,
    refreshFeed: handleRefresh,
    loadMoreVideos: handleLoadMore,
    toggleLike: handleToggleLike,
    incrementViews,
    setCurrentVideo: setCurrentVideoId,
  };
};
export default useFeed;
