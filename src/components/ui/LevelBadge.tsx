import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Palettes par niveau — couleurs harmonisées avec le design system EduSnap
const LEVEL_CONFIG: Record<
  string,
  { icon: string; color: string; glow: string; bg: string; border: string; emoji: string }
> = {
  Novice: {
    icon: 'leaf-outline',
    color: '#94A3B8',
    glow: 'rgba(148,163,184,0.25)',
    bg: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.25)',
    emoji: '🌱',
  },
  Apprenti: {
    icon: 'flash-outline',
    color: '#38BDF8',
    glow: 'rgba(56,189,248,0.25)',
    bg: 'rgba(56,189,248,0.08)',
    border: 'rgba(56,189,248,0.30)',
    emoji: '⚡',
  },
  Scholar: {
    icon: 'book-outline',
    color: '#818CF8',
    glow: 'rgba(129,140,248,0.25)',
    bg: 'rgba(129,140,248,0.08)',
    border: 'rgba(129,140,248,0.30)',
    emoji: '📚',
  },
  Expert: {
    icon: 'trophy-outline',
    color: '#FB923C',
    glow: 'rgba(251,146,60,0.25)',
    bg: 'rgba(251,146,60,0.08)',
    border: 'rgba(251,146,60,0.30)',
    emoji: '🏆',
  },
  Master: {
    icon: 'star',
    color: '#FBBF24',
    glow: 'rgba(251,191,36,0.35)',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.40)',
    emoji: '👑',
  },
};

interface LevelBadgeProps {
  level: string;
  /** 'sm' pour les listes, 'md' par défaut, 'lg' pour le profil */
  size?: 'sm' | 'md' | 'lg';
  /** Animer un halo pulsant autour du badge */
  animated?: boolean;
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level = 'Novice',
  size = 'md',
  animated = false,
}) => {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG['Novice'];
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  // Animation de halo pulsant pour les niveaux élevés
  useEffect(() => {
    if (!animated) return;

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    return () => pulse.stop();
  }, [animated, glowAnim]);

  // Dimensions selon la taille
  const containerSizes = {
    sm: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    md: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    lg: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14 },
  };

  const textSizes = {
    sm: { fontSize: 10, lineHeight: 14 },
    md: { fontSize: 12, lineHeight: 16 },
    lg: { fontSize: 14, lineHeight: 20 },
  };

  const iconSizes = { sm: 10, md: 13, lg: 16 };

  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: config.bg,
          borderWidth: 1,
          borderColor: config.border,
          ...containerSizes[size],
          // Glow effet via shadow
          shadowColor: config.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: animated ? glowAnim : 0.3,
          shadowRadius: animated ? 8 : 4,
          elevation: 4,
        },
      ]}
    >
      <Text style={{ marginRight: 4, fontSize: iconSizes[size] }}>{config.emoji}</Text>
      <Text
        style={[
          textSizes[size],
          {
            color: config.color,
            fontWeight: '800',
            letterSpacing: 0.4,
          },
        ]}
      >
        {level}
      </Text>
    </Animated.View>
  );
};

export default LevelBadge;
