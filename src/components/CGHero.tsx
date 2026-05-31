import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, {
  Circle, Ellipse, Path, Rect, G, Defs,
  RadialGradient, LinearGradient, Stop, Filter,
  FeGaussianBlur, FeMerge, FeMergeNode,
} from 'react-native-svg';
import { type EquippedStats } from '@/src/db/equipment';

// ─────────────────────────────────────────────────────────────
//  CGHero — SVGベースのSDキャラクター（2.5頭身）
//  ・ミックス目（タレ×ツリ）
//  ・装備に応じて外見が変化
//  ・レベルに応じてオーラ・エフェクトが変化
// ─────────────────────────────────────────────────────────────

interface Props {
  level: number;
  size?: number;
  animate?: boolean;
  equipped?: EquippedStats;
}

// レベル別の配色テーマ
function getTheme(level: number) {
  if (level >= 30) return {
    hair: '#C41E3A', hairShadow: '#8B0000', hairHL: '#FF6B6B',
    armor: '#8B0000', armorHL: '#DC143C', armorShadow: '#4A0000',
    aura: '#FF4500', auraDim: '#FF6347',
    eyeColor: '#FFD700', special: true,
  };
  if (level >= 20) return {
    hair: '#B8860B', hairShadow: '#8B6914', hairHL: '#FFD700',
    armor: '#DAA520', armorHL: '#FFD700', armorShadow: '#8B6914',
    aura: '#FFD700', auraDim: '#FFA500',
    eyeColor: '#4169E1', special: false,
  };
  if (level >= 10) return {
    hair: '#4A5568', hairShadow: '#2D3748', hairHL: '#CBD5E0',
    armor: '#718096', armorHL: '#CBD5E0', armorShadow: '#2D3748',
    aura: '#A78BFA', auraDim: '#7C3AED',
    eyeColor: '#7C3AED', special: false,
  };
  if (level >= 5) return {
    hair: '#5B21B6', hairShadow: '#3B0764', hairHL: '#A78BFA',
    armor: '#7C3AED', armorHL: '#C4B5FD', armorShadow: '#4C1D95',
    aura: '#8B5CF6', auraDim: '#6D28D9',
    eyeColor: '#2244CC', special: false,
  };
  return {
    hair: '#3D1F0A', hairShadow: '#1A0A00', hairHL: '#8B5E3C',
    armor: '#7B6248', armorHL: '#B09878', armorShadow: '#4A3520',
    aura: null, auraDim: null,
    eyeColor: '#1A44CC', special: false,
  };
}

// 装備による色オーバーライド
function getArmorColor(equipped?: EquippedStats) {
  const body = equipped?.body?.equipment;
  if (!body) return null;
  const map: Record<string, string> = {
    body_cloth:      '#9B8060',
    body_leather:    '#7C3AED',
    body_iron_armor: '#718096',
    body_gold_armor: '#F59E0B',
    body_hero_robe:  '#EF4444',
  };
  return map[body.id] ?? null;
}

export default function CGHero({ level, size = 160, animate = true, equipped }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const theme = getTheme(level);
  const armorOverride = getArmorColor(equipped);
  const armorColor = armorOverride ?? theme.armor;
  const armorHL = armorOverride ? '#FFFFFF' : theme.armorHL;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 900, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate]);

  // SVG 座標系: 100x160 (内部)
  // 表示: size x size * (160/100) → size x size の正方形にfitさせる
  const vw = 100;
  const vh = 160;

  return (
    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
      <Svg width={size} height={size * 1.6} viewBox={`0 0 ${vw} ${vh}`}>
        <Defs>
          {/* 肌グラデーション */}
          <RadialGradient id="skinGrad" cx="40%" cy="35%" r="60%">
            <Stop offset="0%" stopColor="#FFE0C0" />
            <Stop offset="70%" stopColor="#FFCBA4" />
            <Stop offset="100%" stopColor="#D4845A" />
          </RadialGradient>

          {/* 髪グラデーション */}
          <LinearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={theme.hairHL} />
            <Stop offset="50%" stopColor={theme.hair} />
            <Stop offset="100%" stopColor={theme.hairShadow} />
          </LinearGradient>

          {/* 鎧グラデーション */}
          <LinearGradient id="armorGrad" x1="0%" y1="0%" x2="60%" y2="100%">
            <Stop offset="0%" stopColor={armorHL} stopOpacity="0.9" />
            <Stop offset="40%" stopColor={armorColor} />
            <Stop offset="100%" stopColor={theme.armorShadow} />
          </LinearGradient>

          {/* 目グラデーション */}
          <RadialGradient id="eyeGrad" cx="35%" cy="30%" r="70%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="40%" stopColor={theme.eyeColor} />
            <Stop offset="100%" stopColor="#000033" />
          </RadialGradient>

          {/* オーラグラデーション */}
          {theme.aura && (
            <RadialGradient id="auraGrad" cx="50%" cy="60%" r="50%">
              <Stop offset="0%" stopColor={theme.aura} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={theme.aura} stopOpacity="0" />
            </RadialGradient>
          )}
        </Defs>

        {/* ── オーラ（Lv5以上） ── */}
        {theme.aura && (
          <Ellipse cx="50" cy="120" rx="42" ry="25"
            fill={`url(#auraGrad)`} />
        )}

        {/* ── 影（地面） ── */}
        <Ellipse cx="50" cy="155" rx="22" ry="5"
          fill="#000000" fillOpacity="0.25" />

        {/* ─────── ボディ ─────── */}
        {/* 脚・ズボン */}
        <G>
          {/* 左脚 */}
          <Rect x="34" y="120" width="14" height="28" rx="6"
            fill={`url(#armorGrad)`} />
          {/* 右脚 */}
          <Rect x="52" y="120" width="14" height="28" rx="6"
            fill={`url(#armorGrad)`} />
          {/* ズボン装備ハイライト */}
          <Rect x="35" y="121" width="4" height="10" rx="2"
            fill="#FFFFFF" fillOpacity="0.25" />
          <Rect x="53" y="121" width="4" height="10" rx="2"
            fill="#FFFFFF" fillOpacity="0.25" />
          {/* ブーツ */}
          <Rect x="32" y="140" width="16" height="10" rx="5"
            fill={theme.armorShadow} />
          <Rect x="52" y="140" width="16" height="10" rx="5"
            fill={theme.armorShadow} />
        </G>

        {/* 胴体・鎧 */}
        <G>
          <Rect x="28" y="88" width="44" height="36" rx="10"
            fill={`url(#armorGrad)`} />
          {/* 鎧ハイライト */}
          <Rect x="30" y="90" width="14" height="8" rx="4"
            fill="#FFFFFF" fillOpacity="0.3" />
          {/* 紋章（中央） */}
          <Circle cx="50" cy="106" r="5"
            fill={theme.eyeColor} fillOpacity="0.8" />
          <Circle cx="50" cy="106" r="3"
            fill="#FFFFFF" fillOpacity="0.6" />
          {/* ベルト */}
          <Rect x="28" y="118" width="44" height="6" rx="3"
            fill={theme.armorShadow} />
          <Rect x="46" y="118" width="8" height="6" rx="2"
            fill="#C8A830" />
        </G>

        {/* 左腕（剣を持つ） */}
        <G>
          <Ellipse cx="22" cy="108" rx="8" ry="14"
            fill={`url(#armorGrad)`} />
          {/* 剣 */}
          {level >= 1 && (
            <G>
              {/* 柄 */}
              <Rect x="8" y="92" width="4" height="12" rx="2"
                fill="#8B6914" />
              {/* ガード */}
              <Rect x="4" y="102" width="12" height="4" rx="2"
                fill="#C8A830" />
              {/* 刃 */}
              <Path d="M10 90 L12 90 L13 68 L9 68 Z"
                fill={level >= 20 ? '#FFD700' : level >= 10 ? '#CBD5E0' : '#C0C0C0'}
                stroke={level >= 20 ? '#DAA520' : '#888'}
                strokeWidth="0.5" />
              {/* 刃ハイライト */}
              <Path d="M10.5 90 L11.5 90 L12 70 L10 70 Z"
                fill="#FFFFFF" fillOpacity="0.5" />
            </G>
          )}
        </G>

        {/* 右腕（盾または素手） */}
        <G>
          <Ellipse cx="78" cy="108" rx="8" ry="14"
            fill={`url(#armorGrad)`} />
          {/* Lv10以上は盾 */}
          {level >= 10 && (
            <G>
              <Path d="M85 96 Q94 100 94 110 Q94 120 85 124 L82 120 Q90 115 90 110 Q90 105 82 101 Z"
                fill={`url(#armorGrad)`}
                stroke={armorColor}
                strokeWidth="1" />
              <Circle cx="88" cy="110" r="4"
                fill={theme.eyeColor} fillOpacity="0.8" />
            </G>
          )}
        </G>

        {/* ─────── 頭部 ─────── */}
        <G>
          {/* 首 */}
          <Rect x="42" y="78" width="16" height="12" rx="4"
            fill="url(#skinGrad)" />

          {/* 頭（丸み帯びた形） */}
          <Ellipse cx="50" cy="56" rx="28" ry="30"
            fill="url(#skinGrad)" />

          {/* 頬の赤み */}
          <Ellipse cx="30" cy="62" rx="7" ry="5"
            fill="#FF9999" fillOpacity="0.4" />
          <Ellipse cx="70" cy="62" rx="7" ry="5"
            fill="#FF9999" fillOpacity="0.4" />

          {/* ── 目（ミックス目：内側タレ・外側微ツリ） ── */}
          {/* 左目の白目 */}
          <Path d="M30 54 Q35 50 42 52 Q42 60 35 61 Q28 60 30 54 Z"
            fill="#F8F8FF" />
          {/* 左目の虹彩 */}
          <Ellipse cx="36" cy="56" rx="5" ry="5.5"
            fill={`url(#eyeGrad)`} />
          {/* 左目の瞳孔 */}
          <Circle cx="36" cy="57" r="2.5" fill="#050520" />
          {/* 左目ハイライト（大） */}
          <Circle cx="34.5" cy="54.5" r="1.8" fill="#FFFFFF" fillOpacity="0.95" />
          {/* 左目ハイライト（小） */}
          <Circle cx="38" cy="58" r="0.8" fill="#FFFFFF" fillOpacity="0.7" />
          {/* 左まつ毛 */}
          <Path d="M29 53 Q31 50 33 51" stroke="#2C1503" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <Path d="M42 52 Q40 49 38 50" stroke="#2C1503" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          {/* 右目の白目 */}
          <Path d="M58 52 Q65 50 70 54 Q72 60 65 61 Q58 60 58 52 Z"
            fill="#F8F8FF" />
          {/* 右目の虹彩 */}
          <Ellipse cx="64" cy="56" rx="5" ry="5.5"
            fill={`url(#eyeGrad)`} />
          {/* 右目の瞳孔 */}
          <Circle cx="64" cy="57" r="2.5" fill="#050520" />
          {/* 右目ハイライト（大） */}
          <Circle cx="62.5" cy="54.5" r="1.8" fill="#FFFFFF" fillOpacity="0.95" />
          {/* 右目ハイライト（小） */}
          <Circle cx="66" cy="58" r="0.8" fill="#FFFFFF" fillOpacity="0.7" />
          {/* 右まつ毛 */}
          <Path d="M58 52 Q60 49 62 50" stroke="#2C1503" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          <Path d="M71 53 Q69 50 67 51" stroke="#2C1503" strokeWidth="1.2" fill="none" strokeLinecap="round" />

          {/* 鼻（小さなドット） */}
          <Circle cx="50" cy="63" r="1.2" fill="#D4845A" fillOpacity="0.6" />

          {/* 口（笑顔） */}
          <Path d="M43 69 Q50 75 57 69"
            stroke="#D4845A" strokeWidth="1.5" fill="none" strokeLinecap="round" />

          {/* ── 髪型 ── */}
          {/* 後ろ髪 */}
          <Path d="M22 45 Q20 30 30 22 Q50 14 70 22 Q80 30 78 45"
            fill="url(#hairGrad)" />
          {/* 前髪メイン */}
          <Path d="M22 50 Q20 30 26 20 Q36 10 50 8 Q64 10 74 20 Q80 30 78 50"
            fill="url(#hairGrad)" />
          {/* 前髪バング（左） */}
          <Path d="M26 42 Q22 30 26 18 Q32 26 34 40 Z"
            fill={theme.hair} fillOpacity="0.9" />
          {/* 前髪バング（右） */}
          <Path d="M74 42 Q78 30 74 18 Q68 26 66 40 Z"
            fill={theme.hair} fillOpacity="0.9" />
          {/* 前髪バング（中央） */}
          <Path d="M44 20 Q50 14 56 20 Q52 30 50 32 Q48 30 44 20 Z"
            fill={theme.hair} fillOpacity="0.85" />
          {/* 髪ハイライト */}
          <Path d="M32 18 Q50 10 68 18 Q60 14 50 13 Q40 14 32 18 Z"
            fill="#FFFFFF" fillOpacity="0.3" />

          {/* Lv20以上：王冠 */}
          {level >= 20 && (
            <G>
              <Path d="M30 22 L35 10 L42 18 L50 6 L58 18 L65 10 L70 22 Q60 18 50 16 Q40 18 30 22 Z"
                fill="#DAA520" stroke="#FFD700" strokeWidth="0.5" />
              <Circle cx="50" cy="8" r="3" fill="#4169E1" />
              <Circle cx="35" cy="11" r="2" fill="#DC143C" />
              <Circle cx="65" cy="11" r="2" fill="#DC143C" />
            </G>
          )}

          {/* Lv30：炎オーラ */}
          {level >= 30 && (
            <G opacity="0.7">
              <Path d="M24 40 Q20 30 26 20 Q22 32 28 38 Z" fill="#FF4500" />
              <Path d="M76 40 Q80 30 74 20 Q78 32 72 38 Z" fill="#FF4500" />
              <Path d="M42 10 Q50 2 58 10 Q52 6 50 8 Q48 6 42 10 Z" fill="#FF6347" />
            </G>
          )}

          {/* Lv5以上：ヘルメット飾り */}
          {level >= 5 && level < 20 && (
            <G>
              <Path d="M38 18 Q50 12 62 18 Q56 14 50 13 Q44 14 38 18 Z"
                fill={armorColor} fillOpacity="0.6" stroke={armorColor} strokeWidth="0.5" />
            </G>
          )}
        </G>

        {/* ── 耳 ── */}
        <Ellipse cx="22" cy="58" rx="5" ry="7" fill="url(#skinGrad)" />
        <Ellipse cx="78" cy="58" rx="5" ry="7" fill="url(#skinGrad)" />
        <Ellipse cx="22" cy="58" rx="3" ry="4.5" fill="#D4845A" fillOpacity="0.4" />
        <Ellipse cx="78" cy="58" rx="3" ry="4.5" fill="#D4845A" fillOpacity="0.4" />

      </Svg>
    </Animated.View>
  );
}
