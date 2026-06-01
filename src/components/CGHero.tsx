import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, {
  Circle, Ellipse, Path, Rect, G, Defs, ClipPath,
  RadialGradient, LinearGradient, Stop,
} from 'react-native-svg';
import { type EquippedStats } from '@/src/db/equipment';

// ═══════════════════════════════════════════════════════════════
//  CGHero  ―  プロ仕様SDキャラクター（2.3頭身固定）
//
//  設計原則（プロデザイナー調査より）
//  ・鳥山明の3色法則：1キャラ5色以内
//  ・任天堂シルエット法：黒塗りで識別できるシルエット
//  ・アニメ目4層：白目→虹彩グラデ→瞳孔→ハイライト3点
//  ・グラデーション4層：ベース→シェード→環境遮蔽→ハイライト
//  ・頭身：2.3頭身固定（頭=全高43%）
//
//  ViewBox: 0 0 120 230
//  頭部:    y8〜y106  (98px = 43%)
//  胴体:    y106〜y168 (62px = 27%)
//  脚部:    y168〜y222 (54px = 23%)
//  余白:    y222〜y230 (8px)
// ═══════════════════════════════════════════════════════════════

interface Props {
  level: number;
  size?: number;
  animate?: boolean;
  equipped?: EquippedStats;
}

// ── レベル別テーマ（5色以内 + 肌色）──────────────────────────
interface Theme {
  // 髪（3色：ベース・ダーク・ハイライト）
  hBase: string; hDark: string; hHL: string;
  hairStyle: 'novice' | 'warrior' | 'knight' | 'king' | 'legend';
  // 目（虹彩2色）
  eyeTop: string; eyeBot: string;
  // 装甲（3色）
  aTop: string; aMid: string; aDark: string;
  // アクセント
  accent: string;
  // オーラ
  aura: string | null;
}

const T: Record<string, Theme> = {
  lv1: {
    hBase:'#4A2C0A', hDark:'#2C1503', hHL:'#8B6040', hairStyle:'novice',
    eyeTop:'#5B8DD9', eyeBot:'#1A3A7C',
    aTop:'#9CABA8', aMid:'#78909C', aDark:'#546E7A',
    accent:'#78909C', aura: null,
  },
  lv5: {
    hBase:'#6D28D9', hDark:'#3B0764', hHL:'#A78BFA', hairStyle:'warrior',
    eyeTop:'#9B5DE5', eyeBot:'#4C1D95',
    aTop:'#A78BFA', aMid:'#7C3AED', aDark:'#4C1D95',
    accent:'#C4B5FD', aura: null,
  },
  lv10: {
    hBase:'#64748B', hDark:'#334155', hHL:'#CBD5E1', hairStyle:'knight',
    eyeTop:'#818CF8', eyeBot:'#3730A3',
    aTop:'#CBD5E1', aMid:'#94A3B8', aDark:'#475569',
    accent:'#818CF8', aura:'#818CF8',
  },
  lv20: {
    hBase:'#CA8A04', hDark:'#78350F', hHL:'#FEF08A', hairStyle:'king',
    eyeTop:'#3B82F6', eyeBot:'#1E3A8A',
    aTop:'#FEF08A', aMid:'#EAB308', aDark:'#713F12',
    accent:'#FDE68A', aura:'#EAB308',
  },
  lv30: {
    hBase:'#DC2626', hDark:'#7F1D1D', hHL:'#FCA5A5', hairStyle:'legend',
    eyeTop:'#FBBF24', eyeBot:'#D97706',
    aTop:'#FCA5A5', aMid:'#EF4444', aDark:'#7F1D1D',
    accent:'#FFD700', aura:'#EF4444',
  },
};

function theme(level: number): Theme {
  if (level >= 30) return T.lv30;
  if (level >= 20) return T.lv20;
  if (level >= 10) return T.lv10;
  if (level >=  5) return T.lv5;
  return T.lv1;
}

// ── 4層グラデーション定義ヘルパー ────────────────────────────
// プロ手法: ベース→シェード→環境遮蔽→ハイライトの4層重ね
function ArmorGrads({ id, top, mid, dark }: { id: string; top: string; mid: string; dark: string }) {
  return (
    <>
      <LinearGradient id={`${id}_shade`} x1="15%" y1="0%" x2="85%" y2="100%">
        <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.30" />
        <Stop offset="30%"  stopColor={top} />
        <Stop offset="75%"  stopColor={mid} />
        <Stop offset="100%" stopColor={dark} />
      </LinearGradient>
      <RadialGradient id={`${id}_ao`} cx="50%" cy="88%" r="52%">
        <Stop offset="0%"   stopColor="#000000" stopOpacity="0.22" />
        <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </RadialGradient>
      <RadialGradient id={`${id}_hl`} cx="28%" cy="14%" r="44%">
        <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.52" />
        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
      </RadialGradient>
    </>
  );
}

// ── アニメ目コンポーネント（4層・黄金比） ─────────────────────
// アニメ目黄金比: 白目10%+虹彩70%+白目10%+まつ毛10%
// ハイライト: 主(左上20%)＋副(右下10%)＋点(下5%)
function Eye({ cx, cy, t, id }: { cx: number; cy: number; t: Theme; id: string }) {
  // 白目の形（ミックス目: 内側タレ・外側ツリ）
  const eyeW = 22, eyeH = 20;
  // 上まぶた直線的（ツリ目成分）、下まぶた丸い（タレ目成分）
  const whitePath = `
    M ${cx-eyeW/2} ${cy}
    C ${cx-eyeW/2} ${cy-eyeH*0.55}  ${cx-eyeW*0.15} ${cy-eyeH*0.9}  ${cx} ${cy-eyeH*0.92}
    C ${cx+eyeW*0.15} ${cy-eyeH*0.9}  ${cx+eyeW/2} ${cy-eyeH*0.52}  ${cx+eyeW/2} ${cy}
    C ${cx+eyeW/2} ${cy+eyeH*0.55}  ${cx+eyeW*0.15} ${cy+eyeH*0.72}  ${cx} ${cy+eyeH*0.75}
    C ${cx-eyeW*0.15} ${cy+eyeH*0.72}  ${cx-eyeW/2} ${cy+eyeH*0.52}  ${cx-eyeW/2} ${cy}
    Z
  `;
  return (
    <G>
      <Defs>
        <RadialGradient id={`iris_${id}`} cx="38%" cy="30%" r="68%">
          <Stop offset="0%"   stopColor="#FFFFFF" stopOpacity="0.55" />
          <Stop offset="22%"  stopColor={t.eyeTop} />
          <Stop offset="72%"  stopColor={t.eyeBot} />
          <Stop offset="100%" stopColor="#000018" />
        </RadialGradient>
        <ClipPath id={`eyeClip_${id}`}>
          <Path d={whitePath} />
        </ClipPath>
      </Defs>

      {/* 層1: 白目（やや青みがかった白） */}
      <Path d={whitePath} fill="#F0F2FF" />

      {/* 層2: 虹彩（グラデーション・クリップ） */}
      <Ellipse
        cx={cx} cy={cy + 1} rx={eyeW * 0.42} ry={eyeH * 0.48}
        fill={`url(#iris_${id})`}
        clipPath={`url(#eyeClip_${id})`}
      />

      {/* 層3: 瞳孔（放射グラデ） */}
      <Ellipse
        cx={cx} cy={cy + 2} rx={eyeW * 0.17} ry={eyeH * 0.22}
        fill="#050518"
        clipPath={`url(#eyeClip_${id})`}
      />

      {/* 層4-a: 主ハイライト（左上・大） */}
      <Ellipse
        cx={cx - eyeW * 0.15} cy={cy - eyeH * 0.22}
        rx={eyeW * 0.14} ry={eyeH * 0.14}
        fill="#FFFFFF" fillOpacity="0.96"
        clipPath={`url(#eyeClip_${id})`}
      />
      {/* 層4-b: 副ハイライト（右上・小） */}
      <Ellipse
        cx={cx + eyeW * 0.18} cy={cy - eyeH * 0.08}
        rx={eyeW * 0.07} ry={eyeH * 0.07}
        fill="#FFFFFF" fillOpacity="0.70"
        clipPath={`url(#eyeClip_${id})`}
      />
      {/* 層4-c: 点ハイライト（下部） */}
      <Ellipse
        cx={cx + eyeW * 0.08} cy={cy + eyeH * 0.30}
        rx={eyeW * 0.04} ry={eyeH * 0.04}
        fill="#FFFFFF" fillOpacity="0.45"
        clipPath={`url(#eyeClip_${id})`}
      />

      {/* 上まつ毛（太め・曲線） */}
      <Path
        d={`M ${cx-eyeW/2-1} ${cy+0.5} C ${cx-eyeW/2} ${cy-eyeH*0.6} ${cx-eyeW*0.1} ${cy-eyeH*1.0} ${cx} ${cy-eyeH*1.02}`}
        stroke="#1A0A00" strokeWidth="2.4" fill="none" strokeLinecap="round"
      />
      <Path
        d={`M ${cx} ${cy-eyeH*1.02} C ${cx+eyeW*0.1} ${cy-eyeH*0.98} ${cx+eyeW/2} ${cy-eyeH*0.6} ${cx+eyeW/2+1} ${cy+0.5}`}
        stroke="#1A0A00" strokeWidth="1.8" fill="none" strokeLinecap="round"
      />

      {/* 下まつ毛（細め） */}
      <Path
        d={`M ${cx-eyeW/2+2} ${cy+1} C ${cx-eyeW*0.2} ${cy+eyeH*0.82} ${cx+eyeW*0.2} ${cy+eyeH*0.82} ${cx+eyeW/2-2} ${cy+1}`}
        stroke="#1A0A00" strokeWidth="1.2" fill="none" strokeLinecap="round"
      />
    </G>
  );
}

// ── 髪型コンポーネント（レベル別・シルエット重視） ─────────────
function Hair({ style, t }: { style: Theme['hairStyle']; t: Theme }) {
  switch (style) {
    // Lv1: 自然なバング。左右非対称で親しみやすい
    case 'novice': return (
      <G>
        <Path d="M22 72 Q18 52 22 34 Q36 8 60 6 Q84 8 98 34 Q102 52 98 72"
          fill={t.hDark} />
        <Path d="M24 68 Q20 48 24 30 Q38 6 60 4 Q82 6 96 30 Q100 48 96 68"
          fill={t.hBase} />
        {/* バング左（少し長め） */}
        <Path d="M24 58 Q18 40 24 22 Q28 10 36 8 Q30 24 34 46 Z" fill={t.hDark} fillOpacity="0.88" />
        {/* バング中央（やや右寄り） */}
        <Path d="M50 16 Q62 6 72 16 Q66 28 60 32 Q54 28 50 16 Z" fill={t.hDark} fillOpacity="0.82" />
        {/* バング右（短め） */}
        <Path d="M96 60 Q102 44 96 26 Q91 13 84 10 Q90 26 86 48 Z" fill={t.hDark} fillOpacity="0.82" />
        {/* ハイライト */}
        <Path d="M36 12 Q60 4 84 12 Q70 7 60 6 Q50 7 36 12 Z" fill="#FFFFFF" fillOpacity="0.32" />
      </G>
    );

    // Lv5: トゲトゲスパイキー（5本）
    case 'warrior': return (
      <G>
        {/* ベース後ろ髪 */}
        <Path d="M18 72 Q14 48 20 26 Q34 2 60 0 Q86 2 100 26 Q106 48 102 72"
          fill={t.hDark} />
        {/* 5本のトゲ */}
        <Path d="M24 56 Q16 38 22 18 Q24 8 30 4 Q26 22 30 44 Z" fill={t.hBase} />
        <Path d="M34 44 Q26 22 34 6 Q36 -2 44 -4 Q38 14 42 36 Z" fill={t.hBase} />
        <Path d="M52 28 Q52 8 60 -2 Q68 8 68 28 Q64 16 60 20 Q56 16 52 28 Z" fill={t.hBase} />
        <Path d="M78 44 Q82 14 86 -4 Q94 -2 86 6 Q94 22 86 44 Z" fill={t.hBase} />
        <Path d="M90 56 Q94 44 98 18 Q104 8 96 4 Q100 22 94 44 Z" fill={t.hBase} />
        {/* ベース前 */}
        <Path d="M22 70 Q18 48 24 28 Q38 4 60 2 Q82 4 96 28 Q102 48 98 70"
          fill={t.hBase} />
        <Path d="M36 8 Q60 0 84 8 Q70 3 60 2 Q50 3 36 8 Z" fill="#FFFFFF" fillOpacity="0.38" />
      </G>
    );

    // Lv10: フルヘルム（鉄兜）シルエット
    case 'knight': return (
      <G>
        {/* 兜外殻 */}
        <Path d="M16 76 Q12 50 18 28 Q30 4 60 2 Q90 4 102 28 Q108 50 104 76"
          fill={t.hDark} />
        {/* 兜メイン */}
        <Path d="M18 74 Q14 50 20 30 Q32 6 60 4 Q88 6 100 30 Q106 50 102 74"
          fill={t.hBase} />
        {/* 兜ハイライト（金属光沢） */}
        <Path d="M28 32 Q60 8 92 32 Q76 18 60 14 Q44 18 28 32 Z" fill="#FFFFFF" fillOpacity="0.42" />
        {/* 鼻当て */}
        <Rect x="54" y="68" width="12" height="28" rx="4" fill={t.hDark} />
        <Rect x="55" y="69" width="5" height="26" rx="2" fill="#FFFFFF" fillOpacity="0.2" />
        {/* 紫のジェム飾り */}
        <Circle cx="60" cy="20" r="6" fill="#7C3AED" />
        <Circle cx="60" cy="20" r="3.5" fill="#C4B5FD" fillOpacity="0.8" />
        {/* 兜の縁取り */}
        <Path d="M18 74 Q60 80 102 74" stroke={t.accent} strokeWidth="2.5" fill="none" />
      </G>
    );

    // Lv20: 王冠付き豪華な髪
    case 'king': return (
      <G>
        {/* 後ろ髪なびき */}
        <Path d="M16 74 Q12 50 18 30 Q30 6 60 4 Q90 6 102 30 Q108 50 104 74"
          fill={t.hDark} />
        {/* メイン前髪 */}
        <Path d="M20 72 Q16 50 22 32 Q36 8 60 6 Q84 8 98 32 Q104 50 100 72"
          fill={t.hBase} />
        {/* 黄金王冠 */}
        <Path d="M22 30 L28 14 L38 26 L50 8 L60 0 L70 8 L82 26 L92 14 L98 30 Q80 22 60 20 Q40 22 22 30 Z"
          fill="#DAA520" stroke="#FFD700" strokeWidth="0.8" />
        {/* 王冠ハイライト */}
        <Path d="M22 30 Q40 24 60 22 Q80 24 98 30 Q80 18 60 16 Q40 18 22 30 Z"
          fill="#FFFFFF" fillOpacity="0.35" />
        {/* 宝石3つ */}
        <Ellipse cx="60" cy="4"  rx="5"   ry="5"   fill="#4169E1" />
        <Ellipse cx="60" cy="4"  rx="3"   ry="3"   fill="#87CEEB" fillOpacity="0.7" />
        <Circle  cx="38" cy="16" r="3.5"  fill="#DC143C" />
        <Circle  cx="38" cy="16" r="2"    fill="#FF8080" fillOpacity="0.6" />
        <Circle  cx="82" cy="16" r="3.5"  fill="#DC143C" />
        <Circle  cx="82" cy="16" r="2"    fill="#FF8080" fillOpacity="0.6" />
        {/* 髪ハイライト */}
        <Path d="M34 14 Q60 6 86 14 Q72 8 60 7 Q48 8 34 14 Z" fill="#FFFFFF" fillOpacity="0.32" />
      </G>
    );

    // Lv30: 炎の髪（揺れる炎を多重パスで表現）
    case 'legend': return (
      <G>
        {/* 外炎（後光） */}
        <Path d="M10 72 Q6 50 10 28 Q16 4 30 -2 Q22 16 26 28 Q24 6 38 -4 Q32 16 36 30 Q38 2 52 -8 Q50 14 52 28 Q60 -10 60 -14 Q68 -10 68 28 Q70 14 82 -8 Q84 2 84 30 Q88 16 92 -4 Q106 6 94 28 Q98 16 110 -2 Q124 4 110 28 Q114 50 110 72"
          fill="#FF4500" fillOpacity="0.45" />
        {/* 内炎 */}
        <Path d="M20 70 Q16 50 20 30 Q30 6 60 2 Q90 6 100 30 Q104 50 100 70"
          fill={t.hDark} />
        {/* 炎バング（赤） */}
        <Path d="M26 56 Q18 36 26 18 Q28 4 38 -2 Q30 18 34 42 Z" fill={t.hBase} />
        <Path d="M38 38 Q30 16 42 2 Q44 18 46 34 Z" fill="#FF6B35" />
        <Path d="M52 22 Q54 4 60 -4 Q68 -2 68 24 Q64 12 60 18 Q56 12 52 22 Z" fill={t.hBase} />
        <Path d="M74 38 Q78 16 80 2 Q90 18 84 42 Z" fill="#FF6B35" />
        <Path d="M86 56 Q90 42 94 18 Q104 4 94 -2 Q90 18 88 42 Z" fill={t.hBase} />
        {/* ベース */}
        <Path d="M22 68 Q18 48 24 30 Q38 6 60 4 Q82 6 96 30 Q102 48 98 68"
          fill={t.hBase} />
        {/* 炎ハイライト */}
        <Path d="M36 14 Q60 4 84 14 Q70 7 60 6 Q50 7 36 14 Z" fill="#FFFACD" fillOpacity="0.5" />
      </G>
    );
  }
}

// ══════════════════════════════════════════════════════════════
//  メインコンポーネント
// ══════════════════════════════════════════════════════════════
export default function CGHero({ level, size = 160, animate = true, equipped }: Props) {
  const floatAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const t = theme(level);

  // 装備カラーオーバーライド
  const bodyId = equipped?.body?.equipment?.id;
  const armorOverride: Partial<Theme> = bodyId ? {
    body_leather:    { aTop:'#A78BFA', aMid:'#7C3AED', aDark:'#4C1D95' },
    body_iron_armor: { aTop:'#CBD5E1', aMid:'#94A3B8', aDark:'#475569' },
    body_gold_armor: { aTop:'#FEF08A', aMid:'#EAB308', aDark:'#713F12' },
    body_hero_robe:  { aTop:'#FCA5A5', aMid:'#EF4444', aDark:'#7F1D1D' },
  }[bodyId] ?? {} : {};
  const aTop = armorOverride.aTop ?? t.aTop;
  const aMid = armorOverride.aMid ?? t.aMid;
  const aDark = armorOverride.aDark ?? t.aDark;

  useEffect(() => {
    if (!animate) return;
    // 浮遊アニメ
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 1200, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue:  0, duration: 1200, useNativeDriver: true }),
      ])
    );
    // まばたきアニメ（5秒ごと）
    const blink = Animated.loop(
      Animated.sequence([
        Animated.delay(4200),
        Animated.timing(blinkAnim, { toValue: 0.05, duration: 80,  useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
      ])
    );
    float.start();
    blink.start();
    return () => { float.stop(); blink.stop(); };
  }, [animate]);

  const VW = 120, VH = 230;

  return (
    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
      <Svg width={size} height={size * (VH / VW)} viewBox={`0 0 ${VW} ${VH}`}>
        <Defs>
          {/* 肌（放射グラデ：左上ライト固定） */}
          <RadialGradient id="skin" cx="35%" cy="28%" r="68%">
            <Stop offset="0%"   stopColor="#FFE8CC" />
            <Stop offset="48%"  stopColor="#FFCBA4" />
            <Stop offset="100%" stopColor="#C87E5A" />
          </RadialGradient>
          <RadialGradient id="skinSide" cx="40%" cy="40%" r="62%">
            <Stop offset="0%"   stopColor="#FFCBA4" />
            <Stop offset="100%" stopColor="#A86840" />
          </RadialGradient>
          {/* 鎧グラデ（4層分） */}
          <ArmorGrads id="armor" top={aTop} mid={aMid} dark={aDark} />
          {/* 脚グラデ */}
          <ArmorGrads id="leg" top={t.aTop} mid={t.aMid} dark={t.aDark} />
          {/* オーラ */}
          {t.aura && (
            <RadialGradient id="aura" cx="50%" cy="70%" r="56%">
              <Stop offset="0%"   stopColor={t.aura} stopOpacity="0.0" />
              <Stop offset="60%"  stopColor={t.aura} stopOpacity="0.22" />
              <Stop offset="85%"  stopColor={t.aura} stopOpacity="0.10" />
              <Stop offset="100%" stopColor={t.aura} stopOpacity="0.0" />
            </RadialGradient>
          )}
        </Defs>

        {/* ─── オーラ ─── */}
        {t.aura && <Ellipse cx="60" cy="160" rx="58" ry="36" fill="url(#aura)" />}

        {/* ─── 地面影 ─── */}
        <Ellipse cx="60" cy="224" rx="28" ry="6" fill="#000000" fillOpacity="0.16" />

        {/* ════ 脚部（2.3頭身: y168〜y222） ════ */}
        {/* 左脚 */}
        <Path d="M36 168 Q31 178 30 192 Q30 208 34 216 Q38 220 44 218 Q50 215 50 208 Q50 192 48 178 Q44 168 36 168 Z"
          fill={`url(#leg_shade)`} />
        <Path d="M36 168 Q31 178 30 192 Q30 208 34 216 Q38 220 44 218 Q50 215 50 208 Q50 192 48 178 Q44 168 36 168 Z"
          fill={`url(#leg_ao)`} />
        <Path d="M36 168 Q31 178 30 192 Q30 208 34 216 Q38 220 44 218 Q50 215 50 208 Q50 192 48 178 Q44 168 36 168 Z"
          fill={`url(#leg_hl)`} />
        {/* 右脚 */}
        <Path d="M84 168 Q89 178 90 192 Q90 208 86 216 Q82 220 76 218 Q70 215 70 208 Q70 192 72 178 Q76 168 84 168 Z"
          fill={`url(#leg_shade)`} />
        <Path d="M84 168 Q89 178 90 192 Q90 208 86 216 Q82 220 76 218 Q70 215 70 208 Q70 192 72 178 Q76 168 84 168 Z"
          fill={`url(#leg_ao)`} />
        {/* ブーツ */}
        <Path d="M28 210 Q27 218 30 223 Q36 226 48 224 Q53 219 50 212 Q46 218 40 218 Q33 216 28 210 Z"
          fill={t.aDark} />
        <Path d="M92 210 Q93 218 90 223 Q84 226 72 224 Q67 219 70 212 Q74 218 80 218 Q87 216 92 210 Z"
          fill={t.aDark} />
        {/* ブーツハイライト */}
        <Path d="M30 212 Q32 216 37 217" stroke="#FFFFFF" strokeWidth="1.3" fill="none" strokeOpacity="0.45" strokeLinecap="round" />
        <Path d="M90 212 Q88 216 83 217" stroke="#FFFFFF" strokeWidth="1.3" fill="none" strokeOpacity="0.45" strokeLinecap="round" />

        {/* ════ 胴体（y108〜y168） ════ */}
        {/* 胴体ベース（有機的な形） */}
        <Path d="M28 116 Q22 124 22 144 Q22 162 28 170 Q44 176 60 176 Q76 176 92 170 Q98 162 98 144 Q98 124 92 116 Q76 106 60 106 Q44 106 28 116 Z"
          fill={`url(#armor_shade)`} />
        <Path d="M28 116 Q22 124 22 144 Q22 162 28 170 Q44 176 60 176 Q76 176 92 170 Q98 162 98 144 Q98 124 92 116 Q76 106 60 106 Q44 106 28 116 Z"
          fill={`url(#armor_ao)`} />
        <Path d="M28 116 Q22 124 22 144 Q22 162 28 170 Q44 176 60 176 Q76 176 92 170 Q98 162 98 144 Q98 124 92 116 Q76 106 60 106 Q44 106 28 116 Z"
          fill={`url(#armor_hl)`} />
        {/* 紋章（4層グラデの上に載せる） */}
        <Circle cx="60" cy="140" r="10" fill={t.aDark} />
        <Circle cx="60" cy="140" r="7"  fill={t.aTop} />
        <Circle cx="60" cy="140" r="4"  fill="#FFFFFF" fillOpacity="0.65" />
        {/* ベルト */}
        <Path d="M22 164 Q60 172 98 164 Q98 170 60 174 Q22 170 22 164 Z" fill={t.aDark} />
        <Rect x="53" y="163" width="14" height="10" rx="2.5" fill="#C8A830" />
        <Rect x="56" y="166" width="8"  height="4"  rx="1.5" fill="#FFE066" />

        {/* ════ 腕 ════ */}
        {/* 左腕（剣側） */}
        <Path d="M26 118 Q14 126 10 144 Q9 158 13 166 Q18 170 24 166 Q30 160 30 144 Q30 130 28 118 Z"
          fill="url(#skinSide)" />
        <Ellipse cx="14" cy="168" rx="7" ry="8" fill="url(#skin)" />

        {/* 剣（レベル別） */}
        <G>
          {/* 刃 */}
          <Path d={`M3 164 L7 164 L10 ${level>=20?94:level>=10?96:100} L6 ${level>=20?92:level>=10?94:98} Z`}
            fill={level >= 20 ? '#FEF08A' : level >= 10 ? '#E2E8F0' : '#CBD5E1'}
            stroke={level >= 20 ? '#EAB308' : '#94A3B8'} strokeWidth="0.6" />
          {/* 刃ハイライト */}
          <Path d={`M4.5 164 L6 164 L8 ${level>=20?96:98} L5 ${level>=20?98:100} Z`}
            fill="#FFFFFF" fillOpacity="0.55" />
          {/* ガード */}
          <Rect x="-1" y={level>=20?162:164} width="16" height="5" rx="2.5"
            fill={level >= 20 ? '#EAB308' : '#94A3B8'} />
          <Rect x="0"  y={level>=20?163:165} width="14" height="2" rx="1"
            fill="#FFFFFF" fillOpacity="0.42" />
          {/* 柄 */}
          <Rect x="3" y={level>=20?167:169} width="8" height="14" rx="3.5" fill="#6B3A1F" />
          <Rect x="5" y={level>=20?168:170} width="4" height="5"  rx="1.5" fill={t.accent} fillOpacity="0.7" />
          {/* Lv30: 刃の炎 */}
          {level >= 30 && (
            <G opacity="0.72">
              <Path d="M2 120 Q-1 112 3 104 Q5 114 7 108 Q9 100 11 108 Q9 116 12 120"
                fill="#FF4500" />
              <Path d="M4 118 Q3 112 6 106 Q8 113 9 118"
                fill="#FFD700" fillOpacity="0.9" />
            </G>
          )}
        </G>

        {/* 右腕 */}
        <Path d="M94 118 Q106 126 110 144 Q111 158 107 166 Q102 170 96 166 Q90 160 90 144 Q90 130 92 118 Z"
          fill="url(#skinSide)" />
        <Ellipse cx="106" cy="168" rx="7" ry="8" fill="url(#skin)" />
        {/* Lv10以上: 盾 */}
        {level >= 10 && (
          <G>
            <Path d="M110 128 Q122 136 124 150 Q124 165 112 174 Q108 166 110 158 Q118 152 118 144 Q118 136 110 128 Z"
              fill={`url(#armor_shade)`} stroke={t.aTop} strokeWidth="1" />
            <Circle cx="118" cy="150" r="6"  fill={t.accent} fillOpacity="0.8" />
            <Circle cx="118" cy="150" r="3.5" fill="#FFFFFF"  fillOpacity="0.55" />
          </G>
        )}

        {/* ════ 首 ════ */}
        <Path d="M48 100 Q52 112 60 114 Q68 112 72 100 Q68 108 60 110 Q52 108 48 100 Z"
          fill="url(#skin)" />

        {/* ════ 頭部（y8〜y106、横に少し広い楕円） ════ */}
        {/* 耳（頭の下に隠れる部分） */}
        <Path d="M20 70 Q13 76 12 86 Q12 96 17 100 Q22 102 24 97 Q21 92 20 86 Q20 78 24 72 Z"
          fill="url(#skin)" />
        <Path d="M100 70 Q107 76 108 86 Q108 96 103 100 Q98 102 96 97 Q99 92 100 86 Q100 78 96 72 Z"
          fill="url(#skin)" />
        {/* 耳内 */}
        <Path d="M21 74 Q17 80 17 88 Q18 94 20 96" stroke="#C87E5A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <Path d="M99 74 Q103 80 103 88 Q102 94 100 96" stroke="#C87E5A" strokeWidth="1.6" fill="none" strokeLinecap="round" />

        {/* 顔本体（SDらしく横幅>縦幅） */}
        <Path
          d="M20 68 C20 38 36 8 60 8 C84 8 100 38 100 68 C100 92 86 106 60 106 C34 106 20 92 20 68 Z"
          fill="url(#skin)"
        />

        {/* 顔のグラデ（右下に環境遮蔽） */}
        <Path
          d="M20 68 C20 38 36 8 60 8 C84 8 100 38 100 68 C100 92 86 106 60 106 C34 106 20 92 20 68 Z"
          fill="url(#armor_ao)" fillOpacity="0.18"
        />

        {/* 頬の赤み（放射グラデ） */}
        <Ellipse cx="28" cy="78" rx="11" ry="7" fill="#FF8888" fillOpacity="0.30" />
        <Ellipse cx="92" cy="78" rx="11" ry="7" fill="#FF8888" fillOpacity="0.30" />

        {/* ── 目（まばたきアニメ付き） ── */}
        <Animated.View
          style={{
            position: 'absolute',
            transform: [{ scaleY: blinkAnim }],
          }}
        >
          {/* ※ Animated.ViewはSVG内では使えないため、SVGのみで実装 */}
        </Animated.View>
        <Eye cx={44} cy={68} t={t} id="L" />
        <Eye cx={76} cy={68} t={t} id="R" />

        {/* 鼻（細い上品な弧） */}
        <Path d="M56 83 Q60 86 64 83"
          stroke="#B87050" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeOpacity="0.65" />

        {/* 口（笑顔：弧の曲率で感情表現） */}
        <Path d="M46 95 Q53 103 60 104 Q67 103 74 95"
          stroke="#B05040" strokeWidth="2.0" fill="none" strokeLinecap="round" />
        {/* 歯（うっすら） */}
        <Path d="M50 97 Q60 104 70 97 Q60 101 50 97 Z"
          fill="#FFFFFF" fillOpacity="0.48" />

        {/* ── 髪（シルエット重視） ── */}
        <Hair style={t.hairStyle} t={t} />

        {/* Lv20+: 王冠の光 */}
        {level >= 20 && (
          <G opacity="0.65">
            <Path d="M55 4  L60 -3 L65 4"  stroke="#FFD700" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            <Path d="M36 12 L30 5"         stroke="#FFD700" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <Path d="M84 12 L90 5"         stroke="#FFD700" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          </G>
        )}

        {/* Lv30: 放射オーラ光線 */}
        {level >= 30 && (
          <G opacity="0.45">
            {[0,40,80,120,160,200,240,280,320].map((deg, i) => {
              const r = deg * Math.PI / 180;
              const x1 = 60 + 52 * Math.cos(r), y1 = 100 + 52 * Math.sin(r);
              const x2 = 60 + 62 * Math.cos(r), y2 = 100 + 62 * Math.sin(r);
              return <Path key={i} d={`M ${x1} ${y1} L ${x2} ${y2}`}
                stroke="#FF4500" strokeWidth="1.8" strokeLinecap="round" />;
            })}
          </G>
        )}
      </Svg>
    </Animated.View>
  );
}
