import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

/**
 * XPAnimation — Particule flottante "+N XP" qui monte et disparaît.
 * S'efface automatiquement après l'animation. Appeler onDone() pour nettoyer.
 */

interface XPAnimationProps {
  amount: number;           // ex: +10 ou -2
  positive?: boolean;       // vrai = vert, faux = rouge
  x?: number;               // position X absolue dans le parent
  y?: number;               // position Y de départ
  onDone?: () => void;      // callback de nettoyage après disparition
}

export const XPAnimation: React.FC<XPAnimationProps> = ({
  amount,
  positive = true,
  x = 0,
  y = 0,
  onDone,
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    // Phase 1 : Apparition + montée
    scale.value = withTiming(1.3, { duration: 200, easing: Easing.out(Easing.back(1.8)) });
    translateY.value = withTiming(-80, { duration: 900, easing: Easing.out(Easing.cubic) });

    // Phase 2 : Disparition en fondu + diminution (après 600ms)
    opacity.value = withSequence(
      withTiming(1, { duration: 400 }),
      withDelay(
        300,
        withTiming(0, { duration: 500 }, (finished) => {
          if (finished && onDone) {
            runOnJS(onDone)();
          }
        })
      )
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const color = positive ? '#10B981' : '#EF4444';
  const label = positive ? `+${amount} XP` : `${amount} XP`;

  return (
    <Animated.View
      style={[
        styles.container,
        containerStyle,
        {
          left: x,
          top: y,
          shadowColor: color,
        },
      ]}
      pointerEvents="none"
    >
      <Animated.Text
        style={[
          styles.text,
          {
            color,
            textShadowColor: color,
          },
        ]}
      >
        {label}
      </Animated.Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 999,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  text: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});

export default XPAnimation;
