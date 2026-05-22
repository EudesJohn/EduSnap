import React, { useState, useRef, useCallback } from 'react';
import { View, FlatList, ActivityIndicator, Text, TouchableOpacity, Dimensions, ViewToken } from 'react-native';
import { useFeed } from '../../hooks/useFeed';
import { VideoCard } from '../../components/feed/VideoCard';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

export default function Feed() {
  const {
    videos,
    isLoading,
    isRefreshing,
    currentVideoId,
    refreshFeed,
    loadMoreVideos,
    setCurrentVideo,
  } = useFeed();

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // 1. Détection de la vidéo visible à l'écran (Autoplay)
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      const newIndex = viewableItems[0].index;
      setActiveIndex(newIndex);
      
      const activeVideo = viewableItems[0].item;
      if (activeVideo) {
        setCurrentVideo(activeVideo.id);
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60, // Déclenche lorsque 60% de la vidéo est visible
  }).current;

  // 2. Faire défiler automatiquement vers la vidéo suivante (effet Quiz complété)
  const handleScrollToNext = useCallback(() => {
    if (activeIndex < videos.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: activeIndex + 1,
        animated: true,
      });
    } else {
      // Plus de vidéos dispo, relancer un chargement
      loadMoreVideos();
    }
  }, [activeIndex, videos.length, loadMoreVideos]);

  // Pré-calculer la taille des cellules pour optimiser le rendu et éviter les lags sur Android/iOS
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: height,
      offset: height * index,
      index,
    }),
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isVisible = index === activeIndex;
      return (
        <VideoCard
          video={item}
          shouldPlay={isVisible}
          isActive={isVisible}
          onScrollToNext={handleScrollToNext}
        />
      );
    },
    [activeIndex, handleScrollToNext]
  );

  return (
    <View className="flex-1 bg-[#090A1A]">
      <StatusBar style="light" />

      {/* Chargement Initial */}
      {isLoading && videos.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text className="text-white text-sm font-semibold mt-4">Préparation de votre flux personnalisé...</Text>
        </View>
      ) : videos.length === 0 ? (
        // Écran "Flux vide" premium
        <View className="flex-1 justify-center items-center px-8">
          <View className="w-20 h-20 bg-indigo-950/40 border border-indigo-500/20 rounded-full justify-center items-center mb-6">
            <Ionicons name="film-outline" size={40} color="#8B5CF6" />
          </View>
          
          <Text className="text-white text-xl font-extrabold text-center mb-2">Aucune vidéo disponible</Text>
          <Text className="text-slate-400 text-center text-xs leading-5 mb-8">
            Les créateurs préparent de nouveaux cours scolaires. Rejoignez le programme créateur pour publier vos premières vidéos !
          </Text>

          <TouchableOpacity
            onPress={refreshFeed}
            className="flex-row bg-indigo-600 px-6 py-3 rounded-full items-center justify-center shadow-lg shadow-indigo-600/30"
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text className="text-white font-bold text-sm ml-2">Actualiser le flux</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Flux FlatList TikTok Vertical Snapping
        <FlatList
          ref={flatListRef}
          data={videos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={loadMoreVideos}
          onEndReachedThreshold={0.5}
          refreshing={isRefreshing}
          onRefresh={refreshFeed}
          getItemLayout={getItemLayout}
          decelerationRate="fast"
          className="flex-1"
        />
      )}
    </View>
  );
}
