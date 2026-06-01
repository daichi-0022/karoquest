import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, {
  Circle, Ellipse, Path, Rect, G, Defs,
  RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import { type EquippedStats } from '@/src/db/equipment';

// ─────────────────────────────────────────────────────────────
//  CGHero  —  アニメSDキャラクター（SVGベース）
//  viewBox: 120 × 200
//  頭部: y0〜90  胴体: y90〜145  脚部: y145〜195
//  光源: 左上固定 / ミックス目（タレ×ツリ）
// ─────────────────────────────────────────────────────────────

interface Props {
  level: number;
  size?: number;
  animate?: boolean;
  equipped?: EquippedStats;
}

// ── レベル別テーマ ──────────────────────────────────────────
interface Theme {
  // 髪
  hairBase: string; hairDark: string; hairHL: string; hairStyle: 'short'|'spiky'|'long'|'crown'|'flame';
  // 目
  irisTop: string; irisBot: string; pupil: string;
  // 鎧
  armorTop: string; armorBot: string; armorAccent: string;
  // エフェクト
  auraColor: string | null;
  glowEyes: boolean;
}

const THEMES: Record<string, Theme> = {
  lv1: {
    hairBase:'#4A2C0A', hairDark:'#2C1503', hairHL:'#8B5E3C', hairStyle:'short',
    irisTop:'#4A90D9', irisBot:'#1A3A8C', pupil:'#050515',
    armorTop:'#C4A878', armorBot:'#7B6248', armorAccent:'#5C4530',
    auraColor: null, glowEyes: false,
  },
  lv5: {
    hairBase:'#7C3AED', hairDark:'#4C1D95', hairHL:'#C4B5FD', hairStyle:'spiky',
    irisTop:'#9B5DE5', irisBot:'#4C1D95', pupil:'#0A0020',
    armorTop:'#A78BFA', armorBot:'#7C3AED', armorAccent:'#4C1D95',
    auraColor:'#8B5CF6', glowEyes: false,
  },
  lv10: {
    hairBase:'#94A3B8', hairDark:'#475569', hairHL:'#E2E8F0', hairStyle:'spiky',
    irisTop:'#7C3AED', irisBot:'#3B0764', pupil:'#0A0020',
    armorTop:'#CBD5E1', armorBot:'#64748B', armorAccent:'#334155',
    auraColor:'#7C3AED', glowEyes: true,
  },
  lv20: {
    hairBase:'#DAA520', hairDark:'#8B6914', hairHL:'#FFF8DC', hairStyle:'crown',
    irisTop:'#3B82F6', irisBot:'#1E3A8A', pupil:'#050520',
    armorTop:'#FDE68A', armorBot:'#D97706', armorAccent:'#92400E',
    auraColor:'#F59E0B', glowEyes: false,
  },
  lv30: {
    hairBase:'#EF4444', hairDark:'#7F1D1D', hairHL:'#FCA5A5', hairStyle:'flame',
    irisTop:'#FFD700', irisBot:'#FF6B00', pupil:'#1A0000',
    armorTop:'#FCA5A5', armorBot:'#DC2626', armorAccent:'#7F1D1D',
    auraColor:'#EF4444', glowEyes: true,
  },
};

function getTheme(level: number): Theme {
  if (level >= 30) return THEMES.lv30;
  if (level >= 20) return THEMES.lv20;
  if (level >= 10) return THEMES.lv10;
  if (level >= 5)  return THEMES.lv5;
  return THEMES.lv1;
}

// ── 目コンポーネント ────────────────────────────────────────
function Eye({ cx, cy, flip, theme }: { cx: number; cy: number; flip?: boolean; theme: Theme }) {
  const sc = flip ? -1 : 1;
  // 白目の形（ミックス目：内側タレ外側ツリ）
  const white = `M ${cx-14} ${cy+2} Q ${cx-10} ${cy-7} ${cx} ${cy-8} Q ${cx+10} ${cy-7} ${cx+14} ${cy+1} Q ${cx+10} ${cy+8} ${cx} ${cy+9} Q ${cx-10} ${cy+8} ${cx-14} ${cy+2}`;
  return (
    <G>
      {/* 白目 */}
      <Path d={white} fill="#F5F5FF" />
      {/* 虹彩グラデーション */}
      <Ellipse cx={cx} cy={cy+0.5} rx="9" ry="9.5" fill={`url(#iris_${flip?'r':'l'})`} />
      {/* 瞳孔 */}
      <Ellipse cx={cx} cy={cy+1} rx="4.5" ry="5.5" fill={theme.pupil} />
      {/* ハイライト大（左上） */}
      <Ellipse cx={cx-3.5} cy={cy-3} rx="3" ry="2.8" fill="#FFFFFF" fillOpacity="0.95" />
      {/* ハイライト小（右上） */}
      <Circle cx={cx+4} cy={cy-1.5} r="1.4" fill="#FFFFFF" fillOpacity="0.75" />
      {/* ハイライト点（下） */}
      <Circle cx={cx+2} cy={cy+5} r="1" fill="#FFFFFF" fillOpacity="0.4" />
      {/* 上まぶた（影） */}
      <Path d={`M ${cx-14} ${cy+2} Q ${cx-10} ${cy-7} ${cx} ${cy-8} Q ${cx+10} ${cy-7} ${cx+14} ${cy+1}`}
        fill="#00000022" />
      {/* 上まつ毛 */}
      <Path d={`M ${cx-14} ${cy+2} Q ${cx-12} ${cy-9} ${cx-8} ${cy-10} Q ${cx-4} ${cy-11} ${cx} ${cy-8}`}
        stroke={theme.hairDark} strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <Path d={`M ${cx} ${cy-8} Q ${cx+6} ${cy-10} ${cx+10} ${cy-8} Q ${cx+13} ${cy-6} ${cx+14} ${cy+1}`}
        stroke={theme.hairDark} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* 発光エフェクト（高レベル） */}
      {theme.glowEyes && (
        <Ellipse cx={cx} cy={cy} rx="10" ry="10.5" fill={theme.irisTop} fillOpacity="0.15" />
      )}
    </G>
  );
}

// ── 髪型別コンポーネント ────────────────────────────────────
function Hair({ style, theme }: { style: Theme['hairStyle']; theme: Theme }) {
  switch (style) {
    case 'short': return (
      <G>
        {/* 後ろ髪 */}
        <Path d="M18 58 Q15 35 22 20 Q35 5 60 4 Q85 5 98 20 Q105 35 102 58"
          fill={theme.hairDark} />
        {/* メイン前髪 */}
        <Path d="M20 55 Q18 30 24 16 Q38 2 60 0 Q82 2 96 16 Q102 30 100 55"
          fill={theme.hairBase} />
        {/* バング左 */}
        <Path d="M22 48 Q16 30 22 14 Q30 24 34 44 Z" fill={theme.hairDark} fillOpacity="0.85" />
        {/* バング中央 */}
        <Path d="M46 18 Q60 8 74 18 Q68 30 60 34 Q52 30 46 18 Z" fill={theme.hairDark} fillOpacity="0.8" />
        {/* バング右 */}
        <Path d="M98 48 Q104 30 98 14 Q90 24 86 44 Z" fill={theme.hairDark} fillOpacity="0.85" />
        {/* ハイライト */}
        <Path d="M36 10 Q60 2 84 10 Q72 6 60 5 Q48 6 36 10 Z" fill="#FFFFFF" fillOpacity="0.35" />
      </G>
    );

    case 'spiky': return (
      <G>
        {/* 後ろ髪 */}
        <Path d="M16 56 Q12 30 20 14 Q36 -2 60 -4 Q84 -2 100 14 Q108 30 104 56"
          fill={theme.hairDark} />
        {/* トゲ左 */}
        <Path d="M22 45 Q14 28 18 10 Q24 22 28 40 Z" fill={theme.hairBase} />
        <Path d="M30 38 Q20 18 28 4 Q32 16 36 34 Z" fill={theme.hairBase} />
        {/* トゲ中央 */}
        <Path d="M48 22 Q56 4 60 -2 Q64 4 72 22 Q65 18 60 22 Q55 18 48 22 Z" fill={theme.hairBase} />
        {/* トゲ右 */}
        <Path d="M90 38 Q100 18 92 4 Q88 16 84 34 Z" fill={theme.hairBase} />
        <Path d="M98 45 Q106 28 102 10 Q96 22 92 40 Z" fill={theme.hairBase} />
        {/* ベース */}
        <Path d="M22 54 Q20 32 26 18 Q40 4 60 2 Q80 4 94 18 Q100 32 98 54"
          fill={theme.hairBase} />
        {/* ハイライト */}
        <Path d="M40 10 Q60 2 80 10 Q68 5 60 4 Q52 5 40 10 Z" fill="#FFFFFF" fillOpacity="0.4" />
      </G>
    );

    case 'crown': return (
      <G>
        {/* 後ろ髪・なびき */}
        <Path d="M14 58 Q10 38 16 20 Q28 2 60 -2 Q92 2 104 20 Q110 38 106 58"
          fill={theme.hairDark} />
        {/* 王冠 */}
        <Path d="M24 28 L30 10 L40 20 L50 4 L60 -4 L70 4 L80 20 L90 10 L96 28 Q78 20 60 18 Q42 20 24 28 Z"
          fill="#DAA520" stroke="#FFD700" strokeWidth="0.8" />
        {/* 王冠の宝石 */}
        <Ellipse cx="60" cy="0" rx="5" ry="5" fill="#4169E1" />
        <Ellipse cx="60" cy="0" rx="3" ry="3" fill="#87CEEB" fillOpacity="0.7" />
        <Circle cx="38" cy="13" r="3.5" fill="#DC143C" />
        <Circle cx="82" cy="13" r="3.5" fill="#DC143C" />
        {/* メイン髪 */}
        <Path d="M22 56 Q20 34 26 20 Q40 6 60 4 Q80 6 94 20 Q100 34 98 56"
          fill={theme.hairBase} />
        <Path d="M26 16 Q40 4 60 2 Q80 4 94 16 Q80 10 60 8 Q40 10 26 16 Z"
          fill="#FFFFFF" fillOpacity="0.35" />
      </G>
    );

    case 'flame': return (
      <G>
        {/* 炎の後光 */}
        <Path d="M10 60 Q4 40 8 18 Q14 -4 30 -8 Q22 8 26 20 Q28 -6 42 -12 Q36 6 40 18 Q46 -8 60 -14 Q60 4 60 14 Q74 -8 80 -12 Q74 6 80 18 Q82 -6 92 -8 Q88 8 94 20 Q98 -4 106 18 Q110 40 116 60" fill="#FF4500" fillOpacity="0.5" />
        {/* メイン炎髪 */}
        <Path d="M20 58 Q16 36 22 18 Q30 -2 60 -6 Q90 -2 98 18 Q104 36 100 58"
          fill={theme.hairDark} />
        {/* 炎バング */}
        <Path d="M24 46 Q18 28 24 12 Q28 0 36 -4 Q30 12 34 28 Z" fill={theme.hairBase} />
        <Path d="M36 30 Q32 10 42 -2 Q44 12 46 26 Z" fill="#FF6B35" />
        <Path d="M48 20 Q50 2 60 -4 Q68 -2 72 14 Q64 8 60 18 Q56 8 52 14 Z" fill={theme.hairBase} />
        <Path d="M74 30 Q76 10 84 -2 Q86 12 84 26 Z" fill="#FF6B35" />
        <Path d="M96 46 Q102 28 96 12 Q92 0 84 -4 Q90 12 86 28 Z" fill={theme.hairBase} />
        {/* ベース */}
        <Path d="M22 56 Q20 34 26 20 Q40 6 60 4 Q80 6 94 20 Q100 34 98 56"
          fill={theme.hairBase} />
        <Path d="M36 12 Q60 4 84 12 Q70 7 60 6 Q50 7 36 12 Z" fill="#FFFFFF" fillOpacity="0.3" />
      </G>
    );

    default: return null;
  }
}

// ── メインコンポーネント ────────────────────────────────────
export default function CGHero({ level, size = 160, animate = true, equipped }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const theme = getTheme(level);

  // 装備カラーオーバーライド
  const bodyEquip = equipped?.body?.equipment;
  const armorTop = bodyEquip ? {
    body_cloth: '#C4A878', body_leather: '#9B5DE5',
    body_iron_armor: '#CBD5E1', body_gold_armor: '#FDE68A', body_hero_robe: '#FCA5A5',
  }[bodyEquip.id] ?? theme.armorTop : theme.armorTop;

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -7, duration: 1000, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0,  duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [animate]);

  const W = 120, H = 200;

  return (
    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
      <Svg width={size} height={size * (H / W)} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          {/* 肌 */}
          <RadialGradient id="skin" cx="38%" cy="32%" r="65%">
            <Stop offset="0%"   stopColor="#FFE8CC" />
            <Stop offset="55%"  stopColor="#FFCBA4" />
            <Stop offset="100%" stopColor="#C87E5A" />
          </RadialGradient>
          {/* 肌（暗め・首・腕） */}
          <RadialGradient id="skinDark" cx="40%" cy="40%" r="60%">
            <Stop offset="0%"   stopColor="#FFCBA4" />
            <Stop offset="100%" stopColor="#B87040" />
          </RadialGradient>
          {/* 虹彩・左目 */}
          <RadialGradient id="iris_l" cx="35%" cy="28%" r="70%">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.6" />
            <Stop offset="25%"  stopColor={theme.irisTop} />
            <Stop offset="80%"  stopColor={theme.irisBot} />
            <Stop offset="100%" stopColor="#000022" />
          </RadialGradient>
          {/* 虹彩・右目 */}
          <RadialGradient id="iris_r" cx="65%" cy="28%" r="70%">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.6" />
            <Stop offset="25%"  stopColor={theme.irisTop} />
            <Stop offset="80%"  stopColor={theme.irisBot} />
            <Stop offset="100%" stopColor="#000022" />
          </RadialGradient>
          {/* 鎧 */}
          <LinearGradient id="armor" x1="15%" y1="0%" x2="85%" y2="100%">
            <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.4" />
            <Stop offset="20%"  stopColor={armorTop} />
            <Stop offset="80%"  stopColor={theme.armorBot} />
            <Stop offset="100%" stopColor={theme.armorAccent} />
          </LinearGradient>
          {/* 脚 */}
          <LinearGradient id="legs" x1="15%" y1="0%" x2="85%" y2="100%">
            <Stop offset="0%"   stopColor={theme.armorTop} stopOpacity="0.8" />
            <Stop offset="100%" stopColor={theme.armorAccent} />
          </LinearGradient>
          {/* オーラ */}
          {theme.auraColor && (
            <RadialGradient id="aura" cx="50%" cy="75%" r="55%">
              <Stop offset="0%"   stopColor={theme.auraColor} stopOpacity="0.35" />
              <Stop offset="70%"  stopColor={theme.auraColor} stopOpacity="0.08" />
              <Stop offset="100%" stopColor={theme.auraColor} stopOpacity="0" />
            </RadialGradient>
          )}
        </Defs>

        {/* ── オーラ ── */}
        {theme.auraColor && (
          <Ellipse cx="60" cy="160" rx="52" ry="30" fill="url(#aura)" />
        )}

        {/* ── 影 ── */}
        <Ellipse cx="60" cy="194" rx="26" ry="6" fill="#000" fillOpacity="0.18" />

        {/* ══════════════ 脚部 ══════════════ */}
        {/* 左脚 */}
        <Path d="M38 148 Q34 152 33 165 Q33 178 36 185 Q40 188 44 185 Q47 178 47 165 Q46 152 42 148 Z"
          fill="url(#legs)" />
        {/* 右脚 */}
        <Path d="M78 148 Q74 152 73 165 Q73 178 76 185 Q80 188 84 185 Q87 178 87 165 Q86 152 82 148 Z"
          fill="url(#legs)" />
        {/* 左ブーツ */}
        <Path d="M31 180 Q30 188 32 193 Q37 196 46 194 Q50 190 48 183 Q44 186 40 186 Q35 184 31 180 Z"
          fill={theme.armorAccent} />
        {/* 右ブーツ */}
        <Path d="M72 180 Q70 188 74 183 Q72 190 76 194 Q85 196 88 193 Q90 188 89 180 Q85 184 80 186 Q76 184 72 180 Z"
          fill={theme.armorAccent} />
        {/* ブーツ光沢 */}
        <Path d="M33 182 Q34 185 38 186" stroke="#FFFFFF" strokeWidth="1.2" fill="none" strokeOpacity="0.4" strokeLinecap="round" />
        <Path d="M74 182 Q75 185 79 186" stroke="#FFFFFF" strokeWidth="1.2" fill="none" strokeOpacity="0.4" strokeLinecap="round" />

        {/* ══════════════ 胴体 ══════════════ */}
        {/* 胴体メイン */}
        <Path d="M30 106 Q26 112 26 130 Q26 148 30 154 Q44 160 60 160 Q76 160 90 154 Q94 148 94 130 Q94 112 90 106 Q76 98 60 98 Q44 98 30 106 Z"
          fill="url(#armor)" />
        {/* 胴体ハイライト */}
        <Path d="M32 108 Q28 118 28 132 Q36 102 60 100 Q84 102 92 132 Q92 118 88 108 Q74 100 60 100 Q46 100 32 108 Z"
          fill="#FFFFFF" fillOpacity="0.18" />
        {/* 紋章 */}
        <Circle cx="60" cy="128" r="9" fill={theme.armorAccent} />
        <Circle cx="60" cy="128" r="6" fill={theme.armorTop} fillOpacity="0.9" />
        <Circle cx="60" cy="128" r="3.5" fill="#FFFFFF" fillOpacity="0.6" />
        {/* ベルト */}
        <Path d="M28 148 Q60 154 92 148 Q92 154 60 158 Q28 154 28 148 Z"
          fill={theme.armorAccent} />
        <Rect x="54" y="148" width="12" height="9" rx="2" fill="#C8A830" />
        <Rect x="57" y="151" width="6" height="3" rx="1" fill="#FFE066" />

        {/* ══════════════ 腕 ══════════════ */}
        {/* 左腕（剣を持つ） */}
        <Path d="M28 108 Q18 114 14 126 Q13 136 16 142 Q20 146 25 142 Q29 136 30 126 Q30 116 30 108 Z"
          fill="url(#skinDark)" />
        {/* 左手 */}
        <Ellipse cx="18" cy="144" rx="6" ry="7" fill="url(#skin)" />
        {/* 剣 */}
        <G>
          {/* 刃 */}
          <Path d={level >= 20
            ? "M6 142 L9 142 L12 92 L9 90 L6 92 Z"
            : "M6 144 L9 144 L12 100 L9 98 L6 100 Z"}
            fill={level >= 20 ? '#FDE68A' : level >= 10 ? '#CBD5E1' : '#C8D0D8'}
            stroke={level >= 20 ? '#DAA520' : '#8090A0'} strokeWidth="0.5" />
          {/* 刃ハイライト */}
          <Path d={level >= 20
            ? "M7.5 142 L8.5 142 L10 94 L8.5 96 Z"
            : "M7.5 144 L8.5 144 L10 102 L8.5 104 Z"}
            fill="#FFFFFF" fillOpacity="0.5" />
          {/* ガード */}
          <Rect x="2" y={level >= 20 ? 140 : 142} width="14" height="5" rx="2.5"
            fill={level >= 20 ? '#DAA520' : '#8090A0'} />
          <Rect x="3" y={level >= 20 ? 141 : 143} width="12" height="2" rx="1"
            fill="#FFFFFF" fillOpacity="0.4" />
          {/* 柄 */}
          <Rect x="5.5" y={level >= 20 ? 145 : 147} width="7" height="14" rx="3"
            fill="#6B3A1F" />
          <Rect x="7" y={level >= 20 ? 146 : 148} width="4" height="4" rx="1"
            fill="#C8A830" fillOpacity="0.7" />
          {/* Lv30: 炎エフェクト */}
          {level >= 30 && <>
            <Path d="M6 110 Q4 104 7 98 Q8 106 9 100 Q11 94 12 100 Q11 106 13 110"
              fill="#FF4500" fillOpacity="0.7" />
            <Path d="M7 108 Q6 104 8 100 Q9 105 10 108"
              fill="#FFD700" fillOpacity="0.8" />
          </>}
        </G>

        {/* 右腕 */}
        <Path d="M92 108 Q102 114 106 126 Q107 136 104 142 Q100 146 95 142 Q91 136 90 126 Q90 116 90 108 Z"
          fill="url(#skinDark)" />
        {/* 右手 */}
        <Ellipse cx="102" cy="144" rx="6" ry="7" fill="url(#skin)" />
        {/* Lv10以上: 盾 */}
        {level >= 10 && (
          <G>
            <Path d="M106 118 Q116 124 118 136 Q118 148 108 156 Q105 150 106 142 Q112 138 112 130 Q112 122 106 118 Z"
              fill="url(#armor)" stroke={theme.armorTop} strokeWidth="0.8" />
            <Circle cx="112" cy="136" r="5" fill={theme.irisTop} fillOpacity="0.8" />
            <Circle cx="112" cy="136" r="3" fill="#FFFFFF" fillOpacity="0.5" />
          </G>
        )}

        {/* ══════════════ 首 ══════════════ */}
        <Path d="M50 92 Q54 100 60 102 Q66 100 70 92 Q66 96 60 97 Q54 96 50 92 Z"
          fill="url(#skin)" />

        {/* ══════════════ 頭部 ══════════════ */}
        {/* 耳（先に描いて頭の下に） */}
        <Path d="M20 62 Q15 66 14 74 Q14 82 18 86 Q22 88 24 84 Q22 80 21 74 Q21 68 24 64 Z"
          fill="url(#skin)" />
        <Path d="M100 62 Q105 66 106 74 Q106 82 102 86 Q98 88 96 84 Q98 80 99 74 Q99 68 96 64 Z"
          fill="url(#skin)" />
        {/* 耳の内側 */}
        <Path d="M21 67 Q18 72 18 78 Q19 82 21 83" stroke="#C87E5A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <Path d="M99 67 Q102 72 102 78 Q101 82 99 83" stroke="#C87E5A" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* 顔（大きな丸、SDらしく） */}
        <Ellipse cx="60" cy="62" rx="40" ry="44" fill="url(#skin)" />

        {/* 頬の赤み */}
        <Ellipse cx="30" cy="72" rx="9" ry="6" fill="#FF9999" fillOpacity="0.35" />
        <Ellipse cx="90" cy="72" rx="9" ry="6" fill="#FF9999" fillOpacity="0.35" />

        {/* ── 目 ── */}
        <Eye cx={45} cy={64} theme={theme} />
        <Eye cx={75} cy={64} flip theme={theme} />

        {/* 鼻（小さく上品に） */}
        <Path d="M57 78 Q60 80 63 78" stroke="#C87E5A" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeOpacity="0.7" />

        {/* 口（笑顔） */}
        <Path d="M49 87 Q56 94 60 95 Q64 94 71 87"
          stroke="#C04040" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* 歯 */}
        <Path d="M53 89 Q60 95 67 89 Q60 92 53 89 Z"
          fill="#FFFFFF" fillOpacity="0.5" />

        {/* ── 髪 ── */}
        <Hair style={theme.hairStyle} theme={theme} />

        {/* Lv20: 王冠の光 */}
        {level >= 20 && (
          <G opacity="0.6">
            <Path d="M55 -2 L60 -8 L65 -2" stroke="#FFD700" strokeWidth="1.5" fill="none" />
            <Path d="M40 6 L36 0" stroke="#FFD700" strokeWidth="1.2" fill="none" />
            <Path d="M80 6 L84 0" stroke="#FFD700" strokeWidth="1.2" fill="none" />
          </G>
        )}

        {/* Lv30: オーラ光 */}
        {level >= 30 && (
          <G opacity="0.5">
            {[0,45,90,135,180,225,270,315].map((deg, i) => {
              const r = deg * Math.PI / 180;
              const x1 = 60 + 46 * Math.cos(r);
              const y1 = 95 + 46 * Math.sin(r);
              const x2 = 60 + 54 * Math.cos(r);
              const y2 = 95 + 54 * Math.sin(r);
              return <Path key={i} d={`M ${x1} ${y1} L ${x2} ${y2}`}
                stroke="#FF4500" strokeWidth="1.5" strokeLinecap="round" />;
            })}
          </G>
        )}

      </Svg>
    </Animated.View>
  );
}
