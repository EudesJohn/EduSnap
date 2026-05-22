import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

/**
 * StreakBadge — Affiche la série de jours actifs avec un feu animé.
 * La couleur du badge s'intensifie selon le nombre de jours consécutifs.
 */

// Palettes par milestone de streak
const getStreakConfig = (streak: number) => {
  if (streak >= 30) {
    return { color: '#EF4444', glow: '#EF4444', label: 'Légendaire 🔥', intensity: 1.0 };
  } else if (streak >= 14) {
    return { color: '#F97316', glow: '#F97316', label: 'En feu 🔥', intensity: 0.85 };
  } else if (streak >= 7) {
    return { color: '#FBBF24', glow: '#FBBF24', label: 'Chaud 🔥', intensity: 0.7 };
  } else if (streak >= 3) {
    return { color: '#FB923C', glow: '#FB923C', label: 'En route 🔥', intensity: 0.55 };
  }
  return { color: '#94A3B8', glow: '#94A3B8', label: 'Débutant', intensity: 0.3 };
};

interface StreakBadgeProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({
  streak = 0,
  size = 'md',
  showLabel = false,
}) => {
  const config = getStreakConfig(streak);

  // Animation de flamme pulsante
  const flameScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(config.intensity * 0.4)).current;

  useEffect(() => {
    if (streak < 1) return;

    // Pulsation de la flamme
    const flameAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(flameScale, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(flameScale, {
          toValue: 0.92,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    // Halo pulsant
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: config.intensity,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: config.intensity * 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    flameAnim.start();
    glowAnim.start();

    return () => {
      flameAnim.stop();
      glowAnim.stop();
    };
  }, [streak]);

  // Tailles
  const fireSize = { sm: 16, md: 22, lg: 30 }[size];
  const numberSize = { sm: 11, md: 14, lg: 18 }[size];
  const padding = { sm: { px: 6, py: 3 }, md: { px: 10, py: 5 }, lg: { px: 14, py: 8 } }[size];

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View
        style={[
          styles.container,
          {
            paddingHorizontal: padding.px,
            paddingVertical: padding.py,
            borderColor: config.color + '55',
            backgroundColor: config.color + '12',
            shadowColor: config.glow,
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 4,
          },
        ]}
      >
        {/* Halo glow derrière la flamme */}
        <Animated.View
          style={[
            styles.glowCircle,
            {
              backgroundColor: config.glow,
              opacity: glowOpacity,
              width: fireSize + 10,
              height: fireSize + 10,
              borderRadius: (fireSize + 10) / 2,
            },
          ]}
        />

        {/* Flamme animée */}
        <Animated.Text
          style={[
            styles.fireEmoji,
            {
              fontSize: fireSize,
              transform: [{ scale: flameScale }],
            },
          ]}
        >
          🔥
        </Animated.Text>

        {/* Nombre de jours */}
        <Text
          style={[
            styles.streakNumber,
            {
              color: config.color,
              fontSize: numberSize,
              marginLeft: 4,
            },
          ]}
        >
          {streak}
        </Text>
      </Animated.View>

      {/* Label optionnel sous le badge */}
      {showLabel && streak > 0 && (
        <Text style={[styles.label, { color: config.color + 'CC', marginTop: 4 }]}>
          {streak} jour{streak > 1 ? 's' : ''} de suite
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 20,
    position: 'relative',
    overflow: 'visible',
  },
  glowCircle: {
    position: 'absolute',
    left: -2,
  },
  fireEmoji: {
    zIndex: 1,
  },
  streakNumber: {
    fontWeight: '900',
    letterSpacing: 0.5,
    zIndex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default StreakBadge;
