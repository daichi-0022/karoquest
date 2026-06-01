import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, {
  Circle, Ellipse, Path, Rect, G, Defs, ClipPath, Polygon,
  RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import { type EquippedStats } from '@/src/db/equipment';

// ═══════════════════════════════════════════════════════════════
//  CGHero  —  World-class SD Character （MapleStory品質目標）
//
//  調査適用：MapleStory・FEHeroes・PriConne・GBFのデザイン原則
//  ・2.0頭身（頭=全高48%）← MapleStory基準
//  ・視覚ヒエラルキー3層：顔>武器帽子>装飾
//  ・シルエット突出点5〜7個
//  ・眉毛（未実装→追加）
//  ・肩パッド（シルエット最大強化）
//  ・マント（Lv10+）
//  ・右手オーブ（Lv5+、非対称シルエット）
//  ・髪5層システム
//  ・グラデーション4層
//  ViewBox: 0 0 140 240
//  頭部:  y4〜y116  (112px = 47%)
//  胴体:  y116〜y178 (62px = 26%)
//  脚部:  y178〜y232 (54px = 22%)
// ═══════════════════════════════════════════════════════════════

interface Props {
  level: number;
  size?: number;
  animate?: boolean;
  equipped?: EquippedStats;
}

interface Theme {
  hBase: string; hDark: string; hHL: string; hMid: string;
  hairStyle: 'novice'|'warrior'|'knight'|'king'|'legend';
  eyeTop: string; eyeBot: string; eyeHL: string;
  aTop: string; aMid: string; aDark: string; aAccent: string;
  orbColor: string | null;
  capeColor: string | null;
  aura: string | null;
  shoulderSpike: boolean;
}

const THEMES: Record<string, Theme> = {
  lv1: {
    hBase:'#5C3A1E', hDark:'#2C1503', hHL:'#FFF8E8', hMid:'#8B6040',
    hairStyle:'novice',
    eyeTop:'#5B8DD9', eyeBot:'#1A3A7C', eyeHL:'#FFFFFF',
    aTop:'#AAB8C0', aMid:'#7B8D96', aDark:'#4A5C64', aAccent:'#90A4AE',
    orbColor: null, capeColor: null, aura: null, shoulderSpike: false,
  },
  lv5: {
    hBase:'#6D28D9', hDark:'#3B0764', hHL:'#FFF8E8', hMid:'#9B5DE5',
    hairStyle:'warrior',
    eyeTop:'#9B5DE5', eyeBot:'#4C1D95', eyeHL:'#FFFFFF',
    aTop:'#A78BFA', aMid:'#7C3AED', aDark:'#4C1D95', aAccent:'#C4B5FD',
    orbColor:'#A78BFA', capeColor: null, aura: null, shoulderSpike: true,
  },
  lv10: {
    hBase:'#64748B', hDark:'#1E293B', hHL:'#FFF8E8', hMid:'#94A3B8',
    hairStyle:'knight',
    eyeTop:'#818CF8', eyeBot:'#3730A3', eyeHL:'#FFFFFF',
    aTop:'#E2E8F0', aMid:'#94A3B8', aDark:'#334155', aAccent:'#818CF8',
    orbColor:'#818CF8', capeColor:'#3730A3', aura:'#818CF8', shoulderSpike: true,
  },
  lv20: {
    hBase:'#CA8A04', hDark:'#78350F', hHL:'#FFF8E8', hMid:'#EAB308',
    hairStyle:'king',
    eyeTop:'#3B82F6', eyeBot:'#1E3A8A', eyeHL:'#FFFFFF',
    aTop:'#FEF08A', aMid:'#EAB308', aDark:'#713F12', aAccent:'#FDE68A',
    orbColor:'#FDE68A', capeColor:'#1E3A8A', aura:'#EAB308', shoulderSpike: true,
  },
  lv30: {
    hBase:'#DC2626', hDark:'#450A0A', hHL:'#FFF8E8', hMid:'#EF4444',
    hairStyle:'legend',
    eyeTop:'#FBBF24', eyeBot:'#B45309', eyeHL:'#FFFFFF',
    aTop:'#FCA5A5', aMid:'#EF4444', aDark:'#7F1D1D', aAccent:'#FFD700',
    orbColor:'#FFD700', capeColor:'#7F1D1D', aura:'#EF4444', shoulderSpike: true,
  },
};

function getTheme(level: number): Theme {
  if (level >= 30) return THEMES.lv30;
  if (level >= 20) return THEMES.lv20;
  if (level >= 10) return THEMES.lv10;
  if (level >=  5) return THEMES.lv5;
  return THEMES.lv1;
}

// ── 4層グラデーション ──────────────────────────────────────────
function Grads({ id, top, mid, dark }: { id: string; top: string; mid: string; dark: string }) {
  return (
    <>
      <LinearGradient id={`${id}_s`} x1="12%" y1="0%" x2="88%" y2="100%">
        <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.36" />
        <Stop offset="28%"  stopColor={top} />
        <Stop offset="72%"  stopColor={mid} />
        <Stop offset="100%" stopColor={dark} />
      </LinearGradient>
      <RadialGradient id={`${id}_ao`} cx="50%" cy="90%" r="50%">
        <Stop offset="0%"   stopColor="#000000" stopOpacity="0.20" />
        <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id={`${id}_hl`} cx="26%" cy="12%" r="42%">
        <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.50" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </RadialGradient>
    </>
  );
}

// ── プロ仕様アニメ目（4層+眉毛） ─────────────────────────────
function Eye({ cx, cy, t, id }: { cx: number; cy: number; t: Theme; id: string }) {
  const ew = 24, eh = 22;
  // ミックス目パス（内タレ×外ツリ）
  const wp = `M ${cx-ew/2} ${cy+1} C ${cx-ew/2} ${cy-eh*0.52} ${cx-ew*0.12} ${cy-eh*0.95} ${cx} ${cy-eh*0.97} C ${cx+ew*0.12} ${cy-eh*0.95} ${cx+ew/2} ${cy-eh*0.50} ${cx+ew/2} ${cy+1} C ${cx+ew/2} ${cy+eh*0.56} ${cx+ew*0.12} ${cy+eh*0.76} ${cx} ${cy+eh*0.78} C ${cx-ew*0.12} ${cy+eh*0.76} ${cx-ew/2} ${cy+eh*0.54} ${cx-ew/2} ${cy+1} Z`;
  return (
    <G>
      <Defs>
        <RadialGradient id={`ir${id}`} cx="36%" cy="28%" r="70%">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.70" />
          <Stop offset="20%"  stopColor={t.eyeTop} />
          <Stop offset="74%"  stopColor={t.eyeBot} />
          <Stop offset="100%" stopColor="#000018" />
        </RadialGradient>
        <ClipPath id={`ec${id}`}><Path d={wp} /></ClipPath>
      </Defs>

      {/* 眉毛（左右微非対称） */}
      <Path
        d={id==='L'
          ? `M ${cx-ew*0.50} ${cy-eh*1.15} Q ${cx} ${cy-eh*1.38} ${cx+ew*0.44} ${cy-eh*1.08}`
          : `M ${cx-ew*0.44} ${cy-eh*1.10} Q ${cx} ${cy-eh*1.36} ${cx+ew*0.50} ${cy-eh*1.12}`}
        stroke={t.hDark} strokeWidth="2.6" fill="none" strokeLinecap="round"
      />

      {/* 白目 */}
      <Path d={wp} fill="#F0F3FF" />

      {/* 虹彩（クリップ付き） */}
      <Ellipse cx={cx} cy={cy+1.5} rx={ew*0.43} ry={eh*0.50}
        fill={`url(#ir${id})`} clipPath={`url(#ec${id})`} />

      {/* 瞳孔（下寄り） */}
      <Ellipse cx={cx} cy={cy+3} rx={ew*0.18} ry={eh*0.24}
        fill="#060614" clipPath={`url(#ec${id})`} />

      {/* HL大（左上・22%位置） */}
      <Ellipse cx={cx-ew*0.16} cy={cy-eh*0.20} rx={ew*0.15} ry={eh*0.15}
        fill={t.eyeHL} fillOpacity="0.97" clipPath={`url(#ec${id})`} />
      {/* HL中（右上） */}
      <Ellipse cx={cx+ew*0.20} cy={cy-eh*0.06} rx={ew*0.08} ry={eh*0.08}
        fill={t.eyeHL} fillOpacity="0.72" clipPath={`url(#ec${id})`} />
      {/* HL点（下30%） */}
      <Ellipse cx={cx+ew*0.09} cy={cy+eh*0.32} rx={ew*0.045} ry={eh*0.045}
        fill={t.eyeHL} fillOpacity="0.46" clipPath={`url(#ec${id})`} />

      {/* 上まつ毛（内→外で細くなる） */}
      <Path d={`M ${cx-ew/2-1} ${cy+1} C ${cx-ew/2} ${cy-eh*0.62} ${cx-ew*0.08} ${cy-eh*1.04} ${cx} ${cy-eh*1.06}`}
        stroke={t.hDark} strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <Path d={`M ${cx} ${cy-eh*1.06} C ${cx+ew*0.12} ${cy-eh*1.02} ${cx+ew/2} ${cy-eh*0.60} ${cx+ew/2+1} ${cy+1}`}
        stroke={t.hDark} strokeWidth="2.0" fill="none" strokeLinecap="round" />
      {/* 下まつ毛（細め・透過） */}
      <Path d={`M ${cx-ew/2+3} ${cy+2} C ${cx-ew*0.18} ${cy+eh*0.85} ${cx+ew*0.18} ${cy+eh*0.85} ${cx+ew/2-3} ${cy+2}`}
        stroke={t.hDark} strokeWidth="1.1" fill="none" strokeLinecap="round" strokeOpacity="0.55" />
    </G>
  );
}

// ── 髪型（5層システム） ────────────────────────────────────────
function Hair({ style, t }: { style: Theme['hairStyle']; t: Theme }) {
  switch (style) {
    case 'novice': return (
      <G>
        {/* L1後ろ髪 */}
        <Path d="M22 82 Q18 56 24 36 Q38 8 70 6 Q102 8 116 36 Q122 56 118 82 Q106 92 70 94 Q34 92 22 82 Z" fill={t.hDark} />
        {/* L2前髪ベース */}
        <Path d="M24 78 Q20 52 26 34 Q40 6 70 4 Q100 6 114 34 Q120 52 116 78" fill={t.hBase} />
        {/* L3バング（束感） */}
        <Path d="M24 66 Q18 46 24 28 Q30 14 40 10 Q32 28 36 54 Z" fill={t.hMid} fillOpacity="0.85" />
        <Path d="M38 52 Q32 28 42 14 Q48 24 48 46 Z" fill={t.hDark} fillOpacity="0.70" />
        <Path d="M56 24 Q68 8 82 24 Q76 36 70 40 Q64 36 56 24 Z" fill={t.hMid} fillOpacity="0.80" />
        <Path d="M100 52 Q108 28 98 14 Q92 24 92 46 Z" fill={t.hDark} fillOpacity="0.70" />
        <Path d="M114 66 Q120 46 116 28 Q110 14 100 10 Q108 28 104 54 Z" fill={t.hMid} fillOpacity="0.85" />
        {/* L4分け線 */}
        <Path d="M62 10 Q70 6 78 10 Q72 16 70 20 Q68 16 62 10 Z" fill={t.hDark} fillOpacity="0.55" />
        {/* L5ハイライト */}
        <Path d="M42 12 Q70 4 98 12 Q84 6 70 5 Q56 6 42 12 Z" fill={t.hHL} fillOpacity="0.38" />
        {/* 後ろ髪垂れ */}
        <Path d="M22 82 Q20 104 24 118" stroke={t.hDark} strokeWidth="8" fill="none" strokeLinecap="round" />
        <Path d="M118 82 Q120 104 116 118" stroke={t.hDark} strokeWidth="8" fill="none" strokeLinecap="round" />
      </G>
    );

    case 'warrior': return (
      <G>
        {/* L1後ろ */}
        <Path d="M18 80 Q14 54 20 32 Q34 4 70 2 Q106 4 120 32 Q126 54 122 80" fill={t.hDark} />
        {/* 5本トゲ（鋭角） */}
        <Path d="M26 62 Q16 40 24 18 Q26 8 34 4 Q28 24 32 50 Z" fill={t.hBase} />
        <Path d="M36 46 Q26 20 36 4 Q38 -4 48 -6 Q40 16 44 40 Z" fill={t.hBase} />
        <Path d="M56 28 Q58 6 70 -2 Q82 6 84 28 Q76 14 70 18 Q64 14 56 28 Z" fill={t.hBase} />
        <Path d="M96 46 Q100 16 92 4 Q102 -4 104 4 Q114 20 104 46 Z" fill={t.hBase} />
        <Path d="M106 62 Q112 50 116 18 Q124 8 116 4 Q112 24 108 50 Z" fill={t.hBase} />
        {/* L2前ベース */}
        <Path d="M22 78 Q18 52 24 32 Q38 6 70 4 Q102 6 116 32 Q122 52 118 78" fill={t.hBase} />
        {/* L4分け */}
        <Path d="M64 8 Q70 2 76 8 Q72 16 70 20 Q68 16 64 8 Z" fill={t.hDark} fillOpacity="0.60" />
        {/* L5ハイライト */}
        <Path d="M40 10 Q70 2 100 10 Q84 5 70 4 Q56 5 40 10 Z" fill={t.hHL} fillOpacity="0.40" />
        {/* 後ろ垂れ */}
        <Path d="M20 80 Q16 106 20 120" stroke={t.hDark} strokeWidth="10" fill="none" strokeLinecap="round" />
        <Path d="M120 80 Q124 106 120 120" stroke={t.hDark} strokeWidth="10" fill="none" strokeLinecap="round" />
      </G>
    );

    case 'knight': return (
      <G>
        {/* 兜外殻 */}
        <Path d="M16 84 Q12 56 18 32 Q30 4 70 2 Q110 4 122 32 Q128 56 124 84" fill={t.hDark} />
        {/* 兜ベース */}
        <Path d="M18 82 Q14 56 20 34 Q32 6 70 4 Q108 6 120 34 Q126 56 122 82" fill={t.hBase} />
        {/* 金属光沢 */}
        <Path d="M28 38 Q70 10 112 38 Q92 22 70 16 Q48 22 28 38 Z" fill="#FFFFFF" fillOpacity="0.40" />
        <Path d="M28 50 Q70 36 112 50" stroke="#FFFFFF" strokeWidth="1.0" fill="none" strokeOpacity="0.25" />
        {/* 鼻当て */}
        <Rect x="62" y="74" width="16" height="32" rx="5" fill={t.hDark} />
        <Rect x="63" y="75" width="7" height="30" rx="2" fill="#FFFFFF" fillOpacity="0.18" />
        {/* バイザースリット */}
        <Rect x="20" y="68" width="34" height="8" rx="4" fill={t.hDark} fillOpacity="0.80" />
        <Rect x="86" y="68" width="34" height="8" rx="4" fill={t.hDark} fillOpacity="0.80" />
        {/* 三角ジェム */}
        <Polygon points="70,14 76,26 64,26" fill="#7C3AED" />
        <Polygon points="70,16 74,24 66,24" fill="#C4B5FD" fillOpacity="0.7" />
        {/* 縁取り */}
        <Path d="M18 82 Q70 90 122 82" stroke={t.aAccent} strokeWidth="2.8" fill="none" />
        {/* ハイライト */}
        <Path d="M30 22 Q70 8 110 22 Q90 12 70 10 Q50 12 30 22 Z" fill={t.hHL} fillOpacity="0.35" />
      </G>
    );

    case 'king': return (
      <G>
        {/* 後ろ髪 */}
        <Path d="M16 82 Q12 56 18 34 Q30 6 70 4 Q110 6 122 34 Q128 56 124 82 Q110 96 70 98 Q30 96 16 82 Z" fill={t.hDark} />
        {/* 前髪 */}
        <Path d="M20 80 Q16 54 22 36 Q36 8 70 6 Q104 8 118 36 Q124 54 120 80" fill={t.hBase} />
        {/* 王冠（7歯） */}
        <Path d="M20 32 L26 14 L36 28 L44 10 L54 22 L70 4 L86 22 L96 10 L104 28 L114 14 L120 32 Q96 22 70 20 Q44 22 20 32 Z" fill="#DAA520" stroke="#FFD700" strokeWidth="1.0" />
        {/* 王冠ハイライト */}
        <Path d="M20 32 Q44 24 70 22 Q96 24 120 32 Q96 16 70 14 Q44 16 20 32 Z" fill="#FFFFFF" fillOpacity="0.32" />
        {/* 宝石（奇数3個） */}
        <Ellipse cx="70" cy="8"  rx="6"   ry="6"   fill="#4169E1" />
        <Ellipse cx="70" cy="8"  rx="3.5" ry="3.5" fill="#87CEEB" fillOpacity="0.72" />
        <Circle  cx="40" cy="18" r="4"    fill="#DC143C" />
        <Circle  cx="40" cy="18" r="2.5"  fill="#FF8080" fillOpacity="0.65" />
        <Circle  cx="100" cy="18" r="4"   fill="#DC143C" />
        <Circle  cx="100" cy="18" r="2.5" fill="#FF8080" fillOpacity="0.65" />
        {/* 分け目 */}
        <Path d="M63 10 Q70 6 77 10 Q72 18 70 22 Q68 18 63 10 Z" fill={t.hDark} fillOpacity="0.55" />
        {/* ハイライト */}
        <Path d="M36 16 Q70 6 104 16 Q86 8 70 7 Q54 8 36 16 Z" fill={t.hHL} fillOpacity="0.36" />
        {/* 後ろ垂れ（長め） */}
        <Path d="M18 80 Q14 110 18 128" stroke={t.hDark} strokeWidth="12" fill="none" strokeLinecap="round" />
        <Path d="M122 80 Q126 110 122 128" stroke={t.hDark} strokeWidth="12" fill="none" strokeLinecap="round" />
        {/* 王冠の光 */}
        <Path d="M64 6  L70 -2 L76 6"  stroke="#FFD700" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <Path d="M40 14 L34 6"          stroke="#FFD700" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <Path d="M100 14 L106 6"        stroke="#FFD700" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      </G>
    );

    case 'legend': return (
      <G>
        {/* 外炎オーラ */}
        <Path d="M8 80 Q4 54 8 30 Q14 6 30 0 Q22 18 26 32 Q24 8 40 -4 Q32 18 38 34 Q40 4 56 -8 Q52 16 56 32 Q62 -8 70 -14 Q78 -8 84 32 Q88 16 84 -8 Q100 4 102 34 Q108 18 100 -4 Q116 8 114 32 Q118 18 110 0 Q126 6 132 30 Q136 54 132 80"
          fill="#FF4500" fillOpacity="0.48" />
        {/* 内炎（後ろ） */}
        <Path d="M18 78 Q14 54 20 34 Q32 6 70 4 Q108 6 120 34 Q126 54 122 78" fill={t.hDark} />
        {/* 炎バング5本 */}
        <Path d="M24 64 Q16 44 24 22 Q26 8 38 2 Q28 22 34 50 Z" fill={t.hBase} />
        <Path d="M38 46 Q28 18 40 2 Q44 20 48 42 Z" fill="#FF6B35" fillOpacity="0.85" />
        <Path d="M56 28 Q58 8 70 -2 Q82 8 84 28 Q76 14 70 18 Q64 14 56 28 Z" fill={t.hBase} />
        <Path d="M92 46 Q96 20 100 2 Q112 18 102 46 Z" fill="#FF6B35" fillOpacity="0.85" />
        <Path d="M106 64 Q112 50 116 22 Q128 8 102 2 Q112 22 106 50 Z" fill={t.hBase} />
        {/* ベース */}
        <Path d="M22 76 Q18 52 24 34 Q38 8 70 6 Q102 8 116 34 Q122 52 118 76" fill={t.hBase} />
        {/* ハイライト（炎色） */}
        <Path d="M38 12 Q70 2 102 12 Q86 5 70 4 Q54 5 38 12 Z" fill="#FFFACD" fillOpacity="0.52" />
        {/* オーラ光線 */}
        {[0,40,80,120,160,200,240,280,320].map((deg, i) => {
          const r = deg * Math.PI / 180;
          const x1 = 70+60*Math.cos(r), y1=52+60*Math.sin(r);
          const x2 = 70+72*Math.cos(r), y2=52+72*Math.sin(r);
          return <Path key={i} d={`M${x1} ${y1} L${x2} ${y2}`}
            stroke="#FF4500" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.42" />;
        })}
      </G>
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  メインコンポーネント
// ══════════════════════════════════════════════════════════════
export default function CGHero({ level, size = 180, animate = true, equipped }: Props) {
  const floatAnim  = useRef(new Animated.Value(0)).current;
  const blinkAnim  = useRef(new Animated.Value(1)).current;
  const t = getTheme(level);

  // 装備カラーオーバーライド
  const bid = equipped?.body?.equipment?.id;
  const ao: Partial<Theme> = bid ? ({
    body_leather:    { aTop:'#A78BFA', aMid:'#7C3AED', aDark:'#4C1D95' },
    body_iron_armor: { aTop:'#E2E8F0', aMid:'#94A3B8', aDark:'#334155' },
    body_gold_armor: { aTop:'#FEF08A', aMid:'#EAB308', aDark:'#713F12' },
    body_hero_robe:  { aTop:'#FCA5A5', aMid:'#EF4444', aDark:'#7F1D1D' },
  } as Record<string, Partial<Theme>>)[bid] ?? {} : {};
  const aTop = ao.aTop ?? t.aTop;
  const aMid = ao.aMid ?? t.aMid;
  const aDark = ao.aDark ?? t.aDark;

  useEffect(() => {
    if (!animate) return;
    const float = Animated.loop(Animated.sequence([
      Animated.timing(floatAnim, { toValue: -8, duration: 1100, useNativeDriver: true }),
      Animated.timing(floatAnim, { toValue:  0, duration: 1100, useNativeDriver: true }),
    ]));
    const blink = Animated.loop(Animated.sequence([
      Animated.delay(4500),
      Animated.timing(blinkAnim, { toValue: 0.04, duration: 75,  useNativeDriver: true }),
      Animated.timing(blinkAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]));
    float.start(); blink.start();
    return () => { float.stop(); blink.stop(); };
  }, [animate]);

  const VW = 140, VH = 240;

  return (
    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
      <Svg width={size} height={size*(VH/VW)} viewBox={`0 0 ${VW} ${VH}`}>
        <Defs>
          <RadialGradient id="skin" cx="33%" cy="26%" r="70%">
            <Stop offset="0%"   stopColor="#FFEEDD" />
            <Stop offset="46%"  stopColor="#FFCBA4" />
            <Stop offset="100%" stopColor="#C87E5A" />
          </RadialGradient>
          <RadialGradient id="skinS" cx="42%" cy="42%" r="62%">
            <Stop offset="0%"   stopColor="#FFCBA4" />
            <Stop offset="100%" stopColor="#A86840" />
          </RadialGradient>
          <Grads id="ar" top={aTop} mid={aMid} dark={aDark} />
          <Grads id="lg" top={t.aTop} mid={t.aMid} dark={t.aDark} />
          {t.aura && (
            <RadialGradient id="aura" cx="50%" cy="72%" r="54%">
              <Stop offset="0%"   stopColor={t.aura} stopOpacity="0" />
              <Stop offset="62%"  stopColor={t.aura} stopOpacity="0.24" />
              <Stop offset="100%" stopColor={t.aura} stopOpacity="0" />
            </RadialGradient>
          )}
        </Defs>

        {/* オーラ */}
        {t.aura && <Ellipse cx="70" cy="178" rx="66" ry="38" fill="url(#aura)" />}

        {/* 地面影（レベルで輝く） */}
        <Ellipse cx="70" cy="234" rx="30" ry="6"
          fill={t.aura ?? '#000000'} fillOpacity={t.aura ? 0.22 : 0.14} />

        {/* ════ マント（Lv10+） ════ */}
        {t.capeColor && (
          <G>
            <Path d="M38 132 Q24 160 28 200 Q34 216 42 212 Q36 186 38 162 Z"
              fill={t.capeColor} fillOpacity="0.85" />
            <Path d="M102 132 Q116 160 112 200 Q106 216 98 212 Q104 186 102 162 Z"
              fill={t.capeColor} fillOpacity="0.85" />
            {/* マント縁取り */}
            <Path d="M38 132 Q26 162 30 200" stroke={t.aAccent} strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
            <Path d="M102 132 Q114 162 110 200" stroke={t.aAccent} strokeWidth="1.5" fill="none" strokeOpacity="0.6" />
          </G>
        )}

        {/* ════ 脚部 ════ */}
        {/* 左脚 */}
        <Path d="M40 178 Q34 190 33 206 Q33 220 38 228 Q44 232 50 228 Q56 220 56 206 Q55 190 50 178 Z"
          fill={`url(#lg_s)`} />
        <Path d="M40 178 Q34 190 33 206 Q33 220 38 228 Q44 232 50 228 Q56 220 56 206 Q55 190 50 178 Z"
          fill={`url(#lg_ao)`} />
        {/* 右脚 */}
        <Path d="M100 178 Q106 190 107 206 Q107 220 102 228 Q96 232 90 228 Q84 220 84 206 Q85 190 90 178 Z"
          fill={`url(#lg_s)`} />
        <Path d="M100 178 Q106 190 107 206 Q107 220 102 228 Q96 232 90 228 Q84 220 84 206 Q85 190 90 178 Z"
          fill={`url(#lg_ao)`} />
        {/* ブーツ */}
        <Path d="M30 222 Q29 230 33 235 Q40 238 54 235 Q59 229 56 222 Q52 228 45 228 Q37 226 30 222 Z" fill={aDark} />
        <Path d="M110 222 Q111 230 107 235 Q100 238 86 235 Q81 229 84 222 Q88 228 95 228 Q103 226 110 222 Z" fill={aDark} />
        <Path d="M32 224 Q35 228 41 229" stroke="#FFFFFF" strokeWidth="1.4" fill="none" strokeOpacity="0.42" strokeLinecap="round" />
        <Path d="M108 224 Q105 228 99 229" stroke="#FFFFFF" strokeWidth="1.4" fill="none" strokeOpacity="0.42" strokeLinecap="round" />

        {/* ════ 胴体 ════ */}
        <Path d="M34 124 Q26 134 26 154 Q26 172 34 180 Q52 188 70 188 Q88 188 106 180 Q114 172 114 154 Q114 134 106 124 Q88 114 70 114 Q52 114 34 124 Z"
          fill={`url(#ar_s)`} />
        <Path d="M34 124 Q26 134 26 154 Q26 172 34 180 Q52 188 70 188 Q88 188 106 180 Q114 172 114 154 Q114 134 106 124 Q88 114 70 114 Q52 114 34 124 Z"
          fill={`url(#ar_ao)`} />
        <Path d="M34 124 Q26 134 26 154 Q26 172 34 180 Q52 188 70 188 Q88 188 106 180 Q114 172 114 154 Q114 134 106 124 Q88 114 70 114 Q52 114 34 124 Z"
          fill={`url(#ar_hl)`} />
        {/* 胸紋章（菱形ダイヤ） */}
        <Polygon points={`70,144 80,154 70,164 60,154`} fill={aDark} />
        <Polygon points={`70,147 77,154 70,161 63,154`} fill={aTop} />
        <Polygon points={`70,150 74,154 70,158 66,154`} fill="#FFFFFF" fillOpacity="0.60" />
        {/* ベルト */}
        <Path d="M26 174 Q70 182 114 174 Q114 180 70 184 Q26 180 26 174 Z" fill={aDark} />
        {/* 六角バックル */}
        <Polygon points="70,173 76,177 76,183 70,186 64,183 64,177" fill="#C8A830" />
        <Polygon points="70,175 74,178 74,182 70,184 66,182 66,178" fill="#FFE066" />

        {/* ════ 肩パッド（シルエット突出点+2） ════ */}
        {t.shoulderSpike && (
          <G>
            {/* 左肩パッド */}
            <Path d="M26 124 Q14 118 10 128 Q8 138 14 144 Q22 148 30 142 Q26 134 26 124 Z"
              fill={`url(#ar_s)`} />
            <Path d="M16 128 Q14 132 15 138" stroke="#FFFFFF" strokeWidth="1.2" fill="none" strokeOpacity="0.38" strokeLinecap="round" />
            {/* 右肩パッド */}
            <Path d="M114 124 Q126 118 130 128 Q132 138 126 144 Q118 148 110 142 Q114 134 114 124 Z"
              fill={`url(#ar_s)`} />
            <Path d="M124 128 Q126 132 125 138" stroke="#FFFFFF" strokeWidth="1.2" fill="none" strokeOpacity="0.38" strokeLinecap="round" />
          </G>
        )}

        {/* ════ 腕 ════ */}
        {/* 左腕（剣） */}
        <Path d="M30 126 Q16 136 12 156 Q11 170 16 178 Q22 182 28 178 Q34 170 34 156 Q34 140 32 126 Z"
          fill="url(#skinS)" />
        <Ellipse cx="16" cy="180" rx="8" ry="9" fill="url(#skin)" />

        {/* 剣 */}
        <G>
          <Path d={`M2 176 L7 176 L10 ${level>=20?100:level>=10?104:108} L7 ${level>=20?98:102} Z`}
            fill={level>=20?'#FEF08A':level>=10?'#E2E8F0':'#CBD5E1'}
            stroke={level>=20?'#EAB308':'#94A3B8'} strokeWidth="0.7" />
          <Path d={`M3.5 176 L5.5 176 L7.5 ${level>=20?102:106} L4.5 ${level>=20?104:108} Z`}
            fill="#FFFFFF" fillOpacity="0.55" />
          <Rect x="-3" y={level>=20?174:176} width="19" height="6" rx="3"
            fill={level>=20?'#EAB308':'#94A3B8'} />
          <Rect x="-2" y={level>=20?175:177} width="17" height="2.5" rx="1.2"
            fill="#FFFFFF" fillOpacity="0.40" />
          <Rect x="4" y={level>=20?180:182} width="9" height="16" rx="4" fill="#6B3A1F" />
          <Rect x="6" y={level>=20?181:183} width="5" height="6" rx="2" fill={t.aAccent} fillOpacity="0.72" />
          {level>=30 && (
            <G opacity="0.75">
              <Path d="M2 130 Q-2 120 3 110 Q5 122 7 114 Q10 104 12 114 Q10 124 14 132"
                fill="#FF4500" />
              <Path d="M4 128 Q3 120 7 112 Q9 120 10 128" fill="#FFD700" fillOpacity="0.9" />
            </G>
          )}
        </G>

        {/* 右腕 */}
        <Path d="M110 126 Q124 136 128 156 Q129 170 124 178 Q118 182 112 178 Q106 170 106 156 Q106 140 108 126 Z"
          fill="url(#skinS)" />
        <Ellipse cx="124" cy="180" rx="8" ry="9" fill="url(#skin)" />

        {/* 右手オーブ（Lv5+） */}
        {t.orbColor && (
          <G>
            <Circle cx="124" cy="162" r="14" fill={t.orbColor} fillOpacity="0.22" />
            <Circle cx="124" cy="162" r="10" fill={t.orbColor} fillOpacity="0.55" />
            <Circle cx="124" cy="162" r="7"  fill={t.orbColor} />
            <Circle cx="121" cy="158" r="3"  fill="#FFFFFF" fillOpacity="0.72" />
            <Circle cx="127" cy="166" r="1.5" fill="#FFFFFF" fillOpacity="0.44" />
          </G>
        )}

        {/* 盾（Lv10+） */}
        {level>=10 && (
          <G>
            <Path d="M128 134 Q142 144 144 160 Q144 178 130 188 Q126 178 128 168 Q136 160 136 152 Q136 142 128 134 Z"
              fill={`url(#ar_s)`} stroke={aTop} strokeWidth="1.2" />
            <Circle cx="136" cy="160" r="7"  fill={t.aAccent} fillOpacity="0.80" />
            <Circle cx="136" cy="160" r="4.5" fill="#FFFFFF" fillOpacity="0.52" />
          </G>
        )}

        {/* ════ 首 ════ */}
        <Path d="M56 108 Q62 120 70 122 Q78 120 84 108 Q78 116 70 118 Q62 116 56 108 Z"
          fill="url(#skin)" />

        {/* ════ 頭部 ════ */}
        {/* 耳 */}
        <Path d="M22 78 Q14 84 13 96 Q13 108 18 113 Q24 116 27 110 Q24 104 23 96 Q23 86 27 80 Z"
          fill="url(#skin)" />
        <Path d="M118 78 Q126 84 127 96 Q127 108 122 113 Q116 116 113 110 Q116 104 117 96 Q117 86 113 80 Z"
          fill="url(#skin)" />
        <Path d="M23 83 Q18 90 18 100 Q19 108 22 110" stroke="#C87E5A" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <Path d="M117 83 Q122 90 122 100 Q121 108 118 110" stroke="#C87E5A" strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* 顔（横長楕円・SD黄金比） */}
        <Path d="M22 76 C22 42 42 8 70 8 C98 8 118 42 118 76 C118 102 102 118 70 118 C38 118 22 102 22 76 Z"
          fill="url(#skin)" />
        {/* 顔の環境遮蔽 */}
        <Path d="M22 76 C22 42 42 8 70 8 C98 8 118 42 118 76 C118 102 102 118 70 118 C38 118 22 102 22 76 Z"
          fill="url(#ar_ao)" fillOpacity="0.14" />

        {/* 頬の赤み（目の外側斜め下） */}
        <Ellipse cx="30" cy="85" rx="12" ry="8" fill="#FF8888" fillOpacity="0.28" />
        <Ellipse cx="110" cy="85" rx="12" ry="8" fill="#FF8888" fillOpacity="0.28" />

        {/* ── 目（まばたき） ── */}
        <Animated.View style={{ transform: [{ scaleY: blinkAnim }] }} />
        <Eye cx={50}  cy={78} t={t} id="L" />
        <Eye cx={90} cy={78} t={t} id="R" />

        {/* 鼻 */}
        <Path d="M65 94 Q70 98 75 94"
          stroke="#B87050" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeOpacity="0.52" />

        {/* 口 */}
        <Path d="M52 108 Q62 118 70 119 Q78 118 88 108"
          stroke="#B05040" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <Path d="M57 111 Q70 119 83 111 Q70 116 57 111 Z"
          fill="#FFFFFF" fillOpacity="0.42" />

        {/* ── 髪 ── */}
        <Hair style={t.hairStyle} t={t} />
      </Svg>
    </Animated.View>
  );
}
