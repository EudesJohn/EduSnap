import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

interface VideoPlayerProps {
  videoUrl: string;
  shouldPlay: boolean;
  isMuted: boolean;
  onProgress?: (progress: number) => void;
  onVideoEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  shouldPlay,
  isMuted,
  onProgress,
  onVideoEnded,
}) => {
  const videoRef = useRef<Video>(null);

  // Gérer la lecture / pause réactive
  useEffect(() => {
    if (!videoRef.current) return;

    if (shouldPlay) {
      videoRef.current.playAsync();
    } else {
      videoRef.current.pauseAsync();
    }
  }, [shouldPlay]);

  // Gérer le mode muet réactif
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.setIsMutedAsync(isMuted);
    }
  }, [isMuted]);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    // Progression de lecture
    if (status.positionMillis && status.durationMillis && onProgress) {
      const progress = status.positionMillis / status.durationMillis;
      onProgress(progress);
    }

    // Détecter la fin de la vidéo
    if (status.didJustFinish && !status.isLooping) {
      if (onVideoEnded) {
        onVideoEnded();
      }
    }
  };

  return (
    <View className="flex-1 bg-[#090A1A] justify-center items-center">
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.COVER}
        shouldPlay={shouldPlay}
        isMuted={isMuted}
        isLooping={false} // Pas de boucle automatique pour forcer le quiz en fin de vidéo
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        className="w-full h-full"
      />
    </View>
  );
};

export default VideoPlayer;
