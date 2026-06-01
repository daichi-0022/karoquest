import { useEffect, useRef } from 'react';
import { Animated, Image, View, StyleSheet } from 'react-native';
import { type EquippedStats } from '@/src/db/equipment';

// AI生成キャラクター画像（Pollinations AI）
const SPRITES: Record<number, any> = {
  1:  require('@/assets/characters/kai_lv1.png'),
  5:  require('@/assets/characters/kai_lv5.png'),
  10: require('@/assets/characters/kai_lv10.png'),
  20: require('@/assets/characters/kai_lv20.png'),
  30: require('@/assets/characters/kai_lv30.png'),
};

function getSprite(level: number) {
  if (level >= 30) return SPRITES[30];
  if (level >= 20) return SPRITES[20];
  if (level >= 10) return SPRITES[10];
  if (level >= 5)  return SPRITES[5];
  return SPRITES[1];
}

// オーラカラー（レベル別）
const AURA_COLORS: Record<number, string | null> = {
  1: null, 5: '#7C3AED', 10: '#818CF8', 20: '#EAB308', 30: '#EF4444',
};

function getAura(level: number): string | null {
  if (level >= 30) return AURA_COLORS[30];
  if (level >= 20) return AURA_COLORS[20];
  if (level >= 10) return AURA_COLORS[10];
  if (level >= 5)  return AURA_COLORS[5];
  return null;
}

interface Props {
  level: number;
  size?: number;
  animate?: boolean;
  equipped?: EquippedStats;
}

export default function CGHero({ level, size = 160, animate = true }: Props) {
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0.6)).current;
  const auraColor  = getAura(level);

  useEffect(() => {
    if (!animate) return;

    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue:  0, duration: 1200, useNativeDriver: true }),
      ])
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.0, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 1400, useNativeDriver: true }),
      ])
    );

    float.start();
    if (auraColor) glow.start();
    return () => { float.stop(); glow.stop(); };
  }, [animate, auraColor]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* オーラ（Lv5+） */}
      {auraColor && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size / 2,
              backgroundColor: auraColor,
              opacity: glowAnim,
              transform: [{ scale: 1.1 }],
            },
          ]}
        />
      )}

      {/* 地面影 */}
      <View style={[styles.shadow, {
        width: size * 0.6,
        bottom: -4,
        backgroundColor: auraColor ?? '#000000',
        opacity: auraColor ? 0.25 : 0.12,
      }]} />

      {/* キャラクター画像 */}
      <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
        <Image
          source={getSprite(level)}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    height: 10,
    borderRadius: 50,
    bottom: 0,
  },
});
