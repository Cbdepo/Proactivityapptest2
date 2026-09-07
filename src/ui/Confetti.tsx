import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface Particle {
  x: number;
  size: number;
  color: string;
  delay: number;
  drift: number;
  spin: number;
  duration: number;
}

/**
 * A burst of falling pieces. Deliberately cheap: each particle is one
 * transform-only animation on the native driver, so a 40-piece burst does not
 * cost a frame on a mid-range phone.
 */
export function Confetti({
  count = 36,
  colors,
  /** Restarts the burst whenever this value changes. */
  runKey,
}: {
  count?: number;
  colors: string[];
  runKey: string | number;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, () => ({
        x: Math.random() * SCREEN_W,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.25,
        drift: (Math.random() - 0.5) * 160,
        spin: (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3),
        duration: 0.75 + Math.random() * 0.35,
      })),
    // Re-rolled per burst so two bursts never look identical.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runKey, count],
  );

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 2200,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [runKey, progress]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {particles.map((p, i) => {
        const start = p.delay;
        const end = Math.min(1, p.delay + p.duration);
        const clamp = { extrapolate: 'clamp' as const };

        const translateY = progress.interpolate({
          inputRange: [start, end],
          outputRange: [-40, SCREEN_H * 0.85],
          ...clamp,
        });
        const translateX = progress.interpolate({
          inputRange: [start, end],
          outputRange: [0, p.drift],
          ...clamp,
        });
        const rotate = progress.interpolate({
          inputRange: [start, end],
          outputRange: ['0deg', `${p.spin * 360}deg`],
          ...clamp,
        });
        const opacity = progress.interpolate({
          inputRange: [start, start + 0.02, end - 0.15, end],
          outputRange: [0, 1, 1, 0],
          ...clamp,
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: 0,
              width: p.size,
              height: p.size * 1.6,
              borderRadius: 2,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}
