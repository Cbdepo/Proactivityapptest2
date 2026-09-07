import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { colors, font, radius, space } from '../theme';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type TxtProps = {
  children: React.ReactNode;
  variant?: keyof typeof font;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export function Txt({ children, variant = 'body', color = colors.text, style, numberOfLines }: TxtProps) {
  return (
    <Text numberOfLines={numberOfLines} style={[font[variant], { color }, style]}>
      {children}
    </Text>
  );
}

/** All-caps micro label used for section headers and chips. */
export function Label({ children, color = colors.textFaint, style }: { children: React.ReactNode; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[font.micro, { color, textTransform: 'uppercase' }, style]}>{children}</Text>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export function Card({
  children,
  style,
  accent,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Draws a colour bar down the left edge. */
  accent?: string;
}) {
  return (
    <View style={[styles.card, style]}>
      {accent ? <View style={[styles.accentBar, { backgroundColor: accent }]} /> : null}
      {children}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Pressable that dips under the finger
// ---------------------------------------------------------------------------

export function Squish({
  children,
  style,
  wrapperStyle,
  scaleTo = 0.96,
  ...rest
}: PressableProps & {
  children: React.ReactNode;
  /** Styles the animated inner view — visuals belong here. */
  style?: StyleProp<ViewStyle>;
  /** Styles the touchable itself — put layout (flex, width) here. */
  wrapperStyle?: StyleProp<ViewStyle>;
  scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const to = (value: number) =>
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();

  return (
    <Pressable
      onPressIn={() => to(scaleTo)}
      onPressOut={() => to(1)}
      style={({ pressed }) => [
        { opacity: rest.disabled ? 0.45 : pressed ? 0.95 : 1 },
        wrapperStyle,
      ]}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export function Button({
  label,
  onPress,
  tone = colors.primary,
  /** Override when `tone` is a dark fill and the default ink would vanish. */
  ink = colors.bg,
  disabled,
  full,
  small,
}: {
  label: string;
  onPress: () => void;
  tone?: string;
  ink?: string;
  disabled?: boolean;
  full?: boolean;
  small?: boolean;
}) {
  return (
    <Squish onPress={onPress} disabled={disabled} wrapperStyle={full ? { alignSelf: 'stretch' } : undefined}>
      <View
        style={[
          styles.button,
          { backgroundColor: tone },
          small && { paddingVertical: space.sm, paddingHorizontal: space.md },
        ]}
      >
        <Text style={[small ? font.small : font.heading, { color: ink }]}>{label}</Text>
      </View>
    </Squish>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  tone = colors.primary,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  tone?: string;
}) {
  return (
    <Squish onPress={onPress} scaleTo={0.93}>
      <View
        style={[
          styles.chip,
          selected
            ? { backgroundColor: tone, borderColor: tone }
            : { backgroundColor: 'transparent', borderColor: colors.border },
        ]}
      >
        <Text style={[font.small, { color: selected ? '#0B0B14' : colors.textDim }]}>{label}</Text>
      </View>
    </Squish>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

export function ProgressBar({
  pct,
  tone = colors.primary,
  height = 10,
  track = colors.surfaceHi,
  /** Animate from the previous value rather than snapping. */
  animate = true,
}: {
  pct: number;
  tone?: string;
  height?: number;
  track?: string;
  animate?: boolean;
}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const width = useRef(new Animated.Value(clamped)).current;

  useEffect(() => {
    if (!animate) {
      width.setValue(clamped);
      return;
    }
    Animated.timing(width, {
      toValue: clamped,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, animate, width]);

  return (
    <View style={[styles.track, { height, backgroundColor: track, borderRadius: height / 2 }]}>
      <Animated.View
        style={{
          height: '100%',
          borderRadius: height / 2,
          backgroundColor: tone,
          width: width.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Divider / spacing helpers
// ---------------------------------------------------------------------------

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

export function Row({
  children,
  style,
  gap = space.sm,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function SectionHeader({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Label>{title}</Label>
      {right}
    </View>
  );
}

export function Empty({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 40, marginBottom: space.sm }}>{icon}</Text>
      <Txt variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      <Txt variant="small" color={colors.textFaint} style={{ textAlign: 'center', marginTop: space.xs }}>
        {body}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  button: {
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
    marginTop: space.lg,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    paddingHorizontal: space.xl,
  },
});
