import { View, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Ellipse, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { type Rarity, RARITY_COLORS } from '@/src/db/equipment';

interface Props {
  iconKey: string;
  rarity: Rarity;
  size?: number;
}

export default function EquipmentIcon({ iconKey, rarity, size = 56 }: Props) {
  const colors = RARITY_COLORS[rarity];
  return (
    <View style={[styles.wrap, {
      width: size, height: size,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      shadowColor: colors.glow,
    }]}>
      <Svg width={size - 8} height={size - 8} viewBox="0 0 40 40">
        <Defs>
          <LinearGradient id={`metal_${iconKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#E8EFF5" />
            <Stop offset="50%" stopColor="#A0B0C0" />
            <Stop offset="100%" stopColor="#505870" />
          </LinearGradient>
          <LinearGradient id={`gold_${iconKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FFF0A0" />
            <Stop offset="50%" stopColor="#DAA520" />
            <Stop offset="100%" stopColor="#8B6914" />
          </LinearGradient>
          <LinearGradient id={`purple_${iconKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#D8B4FE" />
            <Stop offset="50%" stopColor="#7C3AED" />
            <Stop offset="100%" stopColor="#3B0764" />
          </LinearGradient>
          <LinearGradient id={`brown_${iconKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#C4A068" />
            <Stop offset="50%" stopColor="#8B6248" />
            <Stop offset="100%" stopColor="#4A3020" />
          </LinearGradient>
          <LinearGradient id={`red_${iconKey}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#FCA5A5" />
            <Stop offset="50%" stopColor="#EF4444" />
            <Stop offset="100%" stopColor="#991B1B" />
          </LinearGradient>
        </Defs>
        {renderIcon(iconKey)}
      </Svg>
    </View>
  );
}

function renderIcon(key: string) {
  switch (key) {
    // ── 武器 ─────────────────────────────────────────
    case 'sword_wood':
      return <G>
        {/* 木の柄 */}
        <Rect x="17" y="26" width="6" height="12" rx="2" fill="url(#brown_sword_wood)" />
        {/* ガード */}
        <Rect x="12" y="23" width="16" height="4" rx="2" fill="#8B6914" />
        {/* 木の刃 */}
        <Path d="M18 22 L20 6 L22 22 Z" fill="url(#brown_sword_wood)" stroke="#5C3A18" strokeWidth="0.5" />
        <Path d="M19.2 22 L20 8 L20.8 22 Z" fill="#D4A070" fillOpacity="0.5" />
      </G>;

    case 'sword_iron':
      return <G>
        <Rect x="17" y="26" width="6" height="11" rx="2" fill="url(#brown_sword_iron)" />
        <Rect x="11" y="23" width="18" height="4" rx="2" fill="url(#metal_sword_iron)" />
        <Path d="M18 22 L20 4 L22 22 Z" fill="url(#metal_sword_iron)" stroke="#708090" strokeWidth="0.5" />
        <Path d="M19.3 22 L20 6 L20.7 22 Z" fill="#FFFFFF" fillOpacity="0.4" />
        <Circle cx="20" cy="29" r="2.5" fill="#C8A830" />
      </G>;

    case 'staff_magic':
      return <G>
        {/* 杖の棒 */}
        <Rect x="18.5" y="12" width="3" height="26" rx="1.5" fill="url(#gold_staff_magic)" />
        {/* 宝珠 */}
        <Circle cx="20" cy="9" r="7" fill="url(#purple_staff_magic)" />
        <Circle cx="17.5" cy="6.5" r="2.5" fill="#FFFFFF" fillOpacity="0.5" />
        <Circle cx="20" cy="9" r="3" fill="#A78BFA" fillOpacity="0.3" />
        {/* 輝き */}
        <Path d="M20 2 L21 6 L20 5 L19 6 Z" fill="#FFFFFF" fillOpacity="0.8" />
        <Path d="M14 9 L18 10 L16.5 9 L18 8 Z" fill="#FFFFFF" fillOpacity="0.8" />
      </G>;

    case 'sword_gold':
      return <G>
        <Rect x="17" y="26" width="6" height="11" rx="2" fill="url(#gold_sword_gold)" />
        <Rect x="10" y="22" width="20" height="5" rx="2.5" fill="url(#gold_sword_gold)" />
        <Path d="M17.5 21 L20 2 L22.5 21 Z" fill="url(#gold_sword_gold)" stroke="#DAA520" strokeWidth="0.5" />
        <Path d="M19.2 21 L20 4 L20.8 21 Z" fill="#FFFACD" fillOpacity="0.6" />
        <Circle cx="20" cy="28" r="3" fill="#4169E1" />
        <Circle cx="20" cy="28" r="1.5" fill="#FFFFFF" fillOpacity="0.7" />
        {/* 装飾ライン */}
        <Path d="M18.5 8 L19.5 8 M18.5 14 L19.5 14" stroke="#FFE66D" strokeWidth="0.8" />
      </G>;

    case 'blade_legend':
      return <G>
        <Rect x="17" y="25" width="6" height="12" rx="2" fill="url(#red_blade_legend)" />
        <Rect x="9" y="21" width="22" height="5" rx="2.5" fill="url(#gold_blade_legend)" />
        <Path d="M17 20 L20 1 L23 20 Z" fill="url(#red_blade_legend)" />
        <Path d="M19 20 L20 3 L21 20 Z" fill="#FFFFFF" fillOpacity="0.5" />
        {/* 刃の紋様 */}
        <Path d="M19 6 L20 4 L21 6 L20 8 Z" fill="#FFD700" />
        <Path d="M19 12 L20 10 L21 12 L20 14 Z" fill="#FFD700" />
        <Circle cx="20" cy="27.5" r="3.5" fill="#FF6347" />
        <Circle cx="20" cy="27.5" r="2" fill="#FFD700" />
      </G>;

    // ── 頭装備 ─────────────────────────────────────────
    case 'helm_iron':
      return <G>
        <Path d="M8 24 Q8 10 20 8 Q32 10 32 24 L30 26 Q25 28 20 28 Q15 28 10 26 Z"
          fill="url(#metal_helm_iron)" />
        <Path d="M10 22 Q10 12 20 10 Q30 12 30 22"
          fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.3" />
        <Rect x="8" y="22" width="24" height="6" rx="3" fill="url(#metal_helm_iron)" />
        <Rect x="9" y="23" width="22" height="3" rx="1.5"
          fill="none" stroke="#CBD5E0" strokeWidth="0.5" />
      </G>;

    case 'hat_magic':
      return <G>
        <Path d="M20 4 L30 26 L10 26 Z" fill="url(#purple_hat_magic)" />
        <Ellipse cx="20" cy="26" rx="13" ry="4" fill="#5B21B6" />
        <Circle cx="20" cy="12" r="3" fill="#FFD700" />
        <Path d="M19 4 L19.5 18 L20 4 L20.5 18 L21 4"
          stroke="#FFD700" strokeWidth="0.5" fill="none" strokeOpacity="0.5" />
      </G>;

    case 'crown_silver':
      return <G>
        <Path d="M8 22 L8 16 L13 20 L20 10 L27 20 L32 16 L32 22 Z"
          fill="url(#metal_crown_silver)" />
        <Rect x="7" y="22" width="26" height="6" rx="3" fill="url(#metal_crown_silver)" />
        <Circle cx="20" cy="13" r="3" fill="#90CAF9" />
        <Circle cx="20" cy="13" r="1.5" fill="#FFFFFF" fillOpacity="0.7" />
      </G>;

    case 'crown_gold':
      return <G>
        <Path d="M7 22 L7 15 L13 20 L20 8 L27 20 L33 15 L33 22 Z"
          fill="url(#gold_crown_gold)" />
        <Rect x="6" y="22" width="28" height="7" rx="3.5" fill="url(#gold_crown_gold)" />
        <Circle cx="20" cy="11" r="4" fill="#4169E1" />
        <Circle cx="11" cy="19" r="2.5" fill="#DC143C" />
        <Circle cx="29" cy="19" r="2.5" fill="#DC143C" />
        <Circle cx="20" cy="11" r="2" fill="#FFFFFF" fillOpacity="0.6" />
      </G>;

    case 'halo':
      return <G>
        <Ellipse cx="20" cy="12" rx="14" ry="5"
          fill="none" stroke="url(#gold_halo)" strokeWidth="3" />
        <Ellipse cx="20" cy="12" rx="14" ry="5"
          fill="none" stroke="#FFFACD" strokeWidth="1" strokeOpacity="0.5" />
        <Path d="M20 17 L20 34" stroke="url(#gold_halo)" strokeWidth="2.5" strokeLinecap="round" />
        {[0,60,120,180,240,300].map((deg, i) => {
          const r = 0.017453 * deg;
          const x = 20 + 14 * Math.cos(r);
          const y = 12 + 5 * Math.sin(r);
          return <Circle key={i} cx={x} cy={y} r="1.5" fill="#FFD700" />;
        })}
      </G>;

    // ── 上着 ─────────────────────────────────────────
    case 'cloth_body':
      return <G>
        <Path d="M8 14 L14 8 L20 12 L26 8 L32 14 L30 32 L10 32 Z"
          fill="url(#brown_cloth_body)" />
        <Path d="M14 8 L20 12 L26 8" fill="none" stroke="#8B6248" strokeWidth="1" />
        <Path d="M10 14 L12 12 Q13 16 13 20" fill="none" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.3" />
      </G>;

    case 'armor_leather':
      return <G>
        <Path d="M7 14 L13 7 L20 11 L27 7 L33 14 L31 32 L9 32 Z"
          fill="url(#purple_armor_leather)" />
        <Path d="M13 7 L20 11 L27 7" fill="none" stroke="#A78BFA" strokeWidth="1.5" />
        <Rect x="16" y="15" width="8" height="10" rx="2" fill="#4C1D95" fillOpacity="0.5" />
        <Path d="M9 16 L10 14 Q11 20 11 24" fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.4" />
        <Path d="M31 16 L30 14 Q29 20 29 24" fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.4" />
      </G>;

    case 'armor_iron':
      return <G>
        <Path d="M6 15 L12 7 L20 10 L28 7 L34 15 L32 32 L8 32 Z"
          fill="url(#metal_armor_iron)" />
        <Path d="M12 7 L20 10 L28 7" fill="none" stroke="#CBD5E0" strokeWidth="1.5" />
        <Rect x="15" y="14" width="10" height="12" rx="3" fill="#2D3748" fillOpacity="0.6" />
        <Circle cx="20" cy="20" r="3" fill="#7C3AED" fillOpacity="0.7" />
        <Path d="M8 17 Q10 15 10 19 Q10 23 9 25" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.5" />
        <Path d="M32 17 Q30 15 30 19 Q30 23 31 25" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.5" />
      </G>;

    case 'armor_gold':
      return <G>
        <Path d="M5 15 L11 6 L20 10 L29 6 L35 15 L33 32 L7 32 Z"
          fill="url(#gold_armor_gold)" />
        <Path d="M11 6 L20 10 L29 6" fill="none" stroke="#FFD700" strokeWidth="2" />
        <Rect x="14" y="13" width="12" height="14" rx="4" fill="#8B6914" fillOpacity="0.5" />
        <Circle cx="20" cy="20" r="4" fill="#4169E1" />
        <Circle cx="20" cy="20" r="2.5" fill="#FFFFFF" fillOpacity="0.6" />
        <Path d="M7 18 Q9 16 9 20 Q9 24 8 26" fill="none" stroke="#FFD700" strokeWidth="1.2" strokeOpacity="0.6" />
        <Path d="M33 18 Q31 16 31 20 Q31 24 32 26" fill="none" stroke="#FFD700" strokeWidth="1.2" strokeOpacity="0.6" />
      </G>;

    case 'robe_hero':
      return <G>
        <Path d="M4 14 L10 5 L20 9 L30 5 L36 14 L34 36 L6 36 Z"
          fill="url(#red_robe_hero)" />
        <Path d="M10 5 L20 9 L30 5" fill="none" stroke="#FF8A80" strokeWidth="2" />
        <Path d="M6 36 L4 28 L6 14" fill="url(#gold_robe_hero)" fillOpacity="0.5" />
        <Path d="M34 36 L36 28 L34 14" fill="url(#gold_robe_hero)" fillOpacity="0.5" />
        <Circle cx="20" cy="18" r="5" fill="#FFD700" fillOpacity="0.8" />
        <Circle cx="20" cy="18" r="3" fill="#FFFFFF" fillOpacity="0.7" />
        <Path d="M8 18 Q10 16 10 22 Q10 28 9 30" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeOpacity="0.7" />
        <Path d="M32 18 Q30 16 30 22 Q30 28 31 30" fill="none" stroke="#FFD700" strokeWidth="1.5" strokeOpacity="0.7" />
      </G>;

    // ── 脚装備 ─────────────────────────────────────────
    case 'pants_cloth':
      return <G>
        <Path d="M10 8 L30 8 L28 32 L22 32 L20 20 L18 32 L12 32 Z"
          fill="url(#brown_pants_cloth)" />
        <Path d="M10 8 L30 8" stroke="#8B6248" strokeWidth="1.5" />
        <Path d="M11 10 Q11 16 12 20" fill="none" stroke="#FFFFFF" strokeWidth="0.5" strokeOpacity="0.3" />
      </G>;

    case 'pants_leather':
      return <G>
        <Path d="M9 8 L31 8 L29 32 L22 32 L20 18 L18 32 L11 32 Z"
          fill="url(#purple_pants_leather)" />
        <Path d="M9 8 L31 8" stroke="#A78BFA" strokeWidth="2" />
        <Rect x="15" y="8" width="10" height="4" rx="2" fill="#4C1D95" />
        <Path d="M10 12 Q10 18 11 22" fill="none" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.4" />
      </G>;

    case 'leggings_iron':
      return <G>
        <Path d="M8 7 L32 7 L30 32 L22 32 L20 17 L18 32 L10 32 Z"
          fill="url(#metal_leggings_iron)" />
        <Path d="M8 7 L32 7" stroke="#CBD5E0" strokeWidth="2" />
        <Path d="M8 12 L32 12" stroke="#CBD5E0" strokeWidth="1" strokeOpacity="0.3" />
        <Rect x="14" y="7" width="12" height="6" rx="2" fill="#2D3748" fillOpacity="0.5" />
        <Path d="M9 9 Q9 15 10 19" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.5" />
        <Path d="M31 9 Q31 15 30 19" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.5" />
      </G>;

    case 'leggings_gold':
      return <G>
        <Path d="M7 7 L33 7 L31 32 L22 32 L20 16 L18 32 L9 32 Z"
          fill="url(#gold_leggings_gold)" />
        <Path d="M7 7 L33 7" stroke="#FFD700" strokeWidth="2.5" />
        <Path d="M8 13 L32 13" stroke="#DAA520" strokeWidth="1" strokeOpacity="0.4" />
        <Rect x="13" y="7" width="14" height="7" rx="3" fill="#8B6914" fillOpacity="0.4" />
        <Circle cx="20" cy="10.5" r="3" fill="#4169E1" />
        <Path d="M8 9 Q8 15 9 19" fill="none" stroke="#FFD700" strokeWidth="1.2" strokeOpacity="0.6" />
        <Path d="M32 9 Q32 15 31 19" fill="none" stroke="#FFD700" strokeWidth="1.2" strokeOpacity="0.6" />
      </G>;

    case 'boots_hero':
      return <G>
        <Path d="M8 8 L32 8 L30 28 L22 28 L20 16 L18 28 L10 28 Z"
          fill="url(#red_boots_hero)" />
        <Path d="M8 8 L32 8" stroke="#FF8A80" strokeWidth="2.5" />
        {/* ブーツ部分 */}
        <Rect x="9" y="27" width="10" height="8" rx="4" fill="url(#red_boots_hero)" />
        <Rect x="21" y="27" width="10" height="8" rx="4" fill="url(#red_boots_hero)" />
        {/* 光る紋章 */}
        <Circle cx="20" cy="14" r="4" fill="#FFD700" fillOpacity="0.8" />
        <Circle cx="20" cy="14" r="2.5" fill="#FFFFFF" fillOpacity="0.7" />
        <Path d="M9 10 Q9 16 10 20" fill="none" stroke="#FF8A80" strokeWidth="1.5" strokeOpacity="0.6" />
        <Path d="M31 10 Q31 16 30 20" fill="none" stroke="#FF8A80" strokeWidth="1.5" strokeOpacity="0.6" />
      </G>;

    default:
      return <G>
        <Circle cx="20" cy="20" r="14" fill="#333" />
        <Path d="M15 20 L25 20 M20 15 L20 25" stroke="#777" strokeWidth="2" />
      </G>;
  }
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
    padding: 4,
  },
});
