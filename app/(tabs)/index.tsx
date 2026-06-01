import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, SafeAreaView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { initializeDatabase } from '@/src/db/schema';
import { getProfile, type ProfileWithRpg } from '@/src/db/profile';
import { getDailySummary, type DailySummary } from '@/src/db/meals';
import { getLatestWeight } from '@/src/db/weights';
import { getDailyQuests, checkAndUpdateQuests, type Quest } from '@/src/db/quests';
import CGHero from '@/src/components/CGHero';
import { getEquippedStats, type EquippedStats } from '@/src/db/equipment';

const TODAY = new Date().toISOString().split('T')[0];

export default function HomeScreen() {
  const [profile, setProfile] = useState<ProfileWithRpg | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [equippedStats, setEquippedStats] = useState<EquippedStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  const load = useCallback(async () => {
    if (!dbReady) return;
    const [p, s, w, q, eq] = await Promise.all([
      getProfile(),
      getDailySummary(TODAY),
      getLatestWeight(),
      getDailyQuests(TODAY),
      getEquippedStats(),
    ]);
    setProfile(p);
    setSummary(s);
    setLatestWeight(w?.weight_kg ?? null);
    setQuests(q);
    setEquippedStats(eq);

    if (s && p) {
      await checkAndUpdateQuests(TODAY, {
        meals: [],
        totalCalories: s.total_calories,
        calorieTarget: p.daily_calorie_target,
        totalProtein: s.total_protein_g,
        hasWeight: w != null,
      });
      const updatedQ = await getDailyQuests(TODAY);
      setQuests(updatedQ);
    }
  }, [dbReady]);

  useEffect(() => {
    initializeDatabase().then(() => setDbReady(true));
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const totalCalories = summary?.total_calories ?? 0;
  const calorieTarget = profile?.daily_calorie_target ?? 1800;
  const calorieRatio = Math.min(totalCalories / calorieTarget, 1);
  const calorieRemain = Math.max(calorieTarget - totalCalories, 0);
  const completedQuests = quests.filter(q => q.completed).length;
  const totalQuests = quests.filter(q => q.quest_type !== 'all_complete').length;
  const level = profile?.level ?? 1;

  const hpColor = calorieRatio > 0.95 ? '#E74C3C' : calorieRatio > 0.7 ? '#F39C12' : '#2ECC71';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* ドット絵風ヘッダー */}
        <View style={styles.header}>
          <View style={styles.pixelBorder}>
            <Text style={styles.appName}>KAROQUEST</Text>
            <Text style={styles.dateText}>{TODAY.replace(/-/g, '.')}</Text>
          </View>
        </View>

        {/* キャラクターステータスパネル */}
        <View style={styles.statusPanel}>
          {/* ドット絵キャラクター */}
          <View style={styles.characterArea}>
            <CGHero level={level} size={96} animate equipped={equippedStats ?? undefined} />
            <View style={styles.levelTag}>
              <Text style={styles.levelTagText}>LV{level}</Text>
            </View>
          </View>

          {/* ステータス */}
          <View style={styles.statsArea}>
            <Text style={styles.heroName}>{profile?.title ?? '見習い冒険者'}</Text>

            {/* EXPバー */}
            <View style={styles.barRow}>
              <Text style={styles.barLabel}>EXP</Text>
              <View style={styles.pixelBarBg}>
                <View style={[styles.pixelBarFill, styles.expFill, {
                  width: `${profile?.exp_progress_pct ?? 0}%` as any
                }]} />
              </View>
              <Text style={styles.barValue}>{profile?.exp_in_level ?? 0}</Text>
            </View>

            {/* HPバー（カロリー残量） */}
            <View style={styles.barRow}>
              <Text style={[styles.barLabel, { color: hpColor }]}>HP</Text>
              <View style={styles.pixelBarBg}>
                <View style={[styles.pixelBarFill, {
                  width: `${(1 - calorieRatio) * 100}%` as any,
                  backgroundColor: hpColor,
                }]} />
              </View>
              <Text style={styles.barValue}>{calorieRemain}</Text>
            </View>

            {/* クエスト進捗 */}
            <View style={styles.questMini}>
              <Text style={styles.questMiniText}>
                📜 クエスト {completedQuests}/{totalQuests}
              </Text>
              <View style={styles.questDots}>
                {Array.from({ length: totalQuests }).map((_, i) => (
                  <View key={i} style={[styles.questDot, i < completedQuests && styles.questDotDone]} />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* カロリーパネル（ドット絵ウィンドウ風） */}
        <View style={styles.pixelWindow}>
          <View style={styles.pixelWindowTitle}>
            <Text style={styles.pixelWindowTitleText}>▶ 今日のカロリー</Text>
          </View>
          <View style={styles.calorieRow}>
            <View>
              <Text style={styles.calorieBig}>{totalCalories}</Text>
              <Text style={styles.calorieUnit}>kcal 消費</Text>
            </View>
            <View style={styles.calorieDiv} />
            <View style={styles.calorieRight}>
              <Text style={[styles.remainNum, calorieRemain === 0 && { color: '#E74C3C' }]}>
                {calorieRemain === 0 ? 'OVER!' : calorieRemain}
              </Text>
              <Text style={styles.calorieUnit}>kcal 残り</Text>
            </View>
          </View>
          <View style={styles.pfcRow}>
            <PixelPFC label="P" value={summary?.total_protein_g ?? 0} color="#60A5FA" />
            <PixelPFC label="F" value={summary?.total_fat_g ?? 0} color="#FBBF24" />
            <PixelPFC label="C" value={summary?.total_carbs_g ?? 0} color="#34D399" />
          </View>
        </View>

        {/* クエストパネル */}
        <View style={styles.pixelWindow}>
          <View style={styles.pixelWindowTitle}>
            <Text style={styles.pixelWindowTitleText}>▶ デイリークエスト</Text>
            <Text style={styles.questCount}>{completedQuests}/{totalQuests}</Text>
          </View>
          {quests.filter(q => q.quest_type !== 'all_complete').map(quest => (
            <View key={quest.id} style={[styles.questRow, quest.completed && styles.questRowDone]}>
              <Text style={styles.questIcon}>{quest.icon}</Text>
              <Text style={[styles.questLabel, quest.completed && styles.questLabelDone]}>
                {quest.label}
              </Text>
              {quest.completed
                ? <Text style={styles.questCheck}>✓</Text>
                : <Text style={styles.questExp}>+{quest.exp_reward}</Text>
              }
            </View>
          ))}
          {quests.find(q => q.quest_type === 'all_complete') && (
            <View style={[
              styles.allComplete,
              quests.find(q => q.quest_type === 'all_complete')?.completed && styles.allCompleteDone,
            ]}>
              <Text style={styles.allCompleteText}>
                {quests.find(q => q.quest_type === 'all_complete')?.completed
                  ? '★ ALL CLEAR! +200 EXP ★'
                  : '全クリボーナス +200 EXP'}
              </Text>
            </View>
          )}
        </View>

        {/* 撮影ボタン（ドット絵ボタン風） */}
        <TouchableOpacity style={styles.pixelButton} onPress={() => router.push('/camera' as any)}>
          <View style={styles.pixelButtonInner}>
            <Text style={styles.pixelButtonIcon}>📸</Text>
            <View>
              <Text style={styles.pixelButtonText}>FOOD SCAN</Text>
              <Text style={styles.pixelButtonSub}>写真でカロリー自動計算 → EXP +10</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 体重・バトル・インベントリ */}
        <View style={styles.bottomRow}>
          <TouchableOpacity style={styles.pixelCard} onPress={() => router.push('/weight' as any)}>
            <Text style={styles.pixelCardIcon}>⚖️</Text>
            <Text style={styles.pixelCardLabel}>体重</Text>
            <Text style={styles.pixelCardValue}>
              {latestWeight != null ? `${latestWeight}kg` : '未記録'}
            </Text>
            {latestWeight == null && <Text style={styles.pixelCardExp}>+30</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.pixelCard} onPress={() => router.push('/battle' as any)}>
            <Text style={styles.pixelCardIcon}>⚔️</Text>
            <Text style={styles.pixelCardLabel}>バトル</Text>
            <Text style={styles.pixelCardValue}>第1章</Text>
            <Text style={styles.pixelCardSub}>ボス出現中</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.pixelCard} onPress={() => router.push('/inventory' as any)}>
            <Text style={styles.pixelCardIcon}>🎒</Text>
            <Text style={styles.pixelCardLabel}>装備</Text>
            <Text style={styles.pixelCardValue}>インベントリ</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function PixelPFC({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.pfcItem}>
      <Text style={[styles.pfcLabel, { color }]}>{label}</Text>
      <Text style={styles.pfcValue}>{Math.round(value)}g</Text>
    </View>
  );
}

const PIXEL_BORDER = {
  borderWidth: 2,
  borderColor: '#2D2D5E',
  borderStyle: 'solid' as const,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0A18' },
  scroll: { flex: 1 },

  // ヘッダー
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  pixelBorder: { borderBottomWidth: 2, borderBottomColor: '#7c3aed', paddingBottom: 8 },
  appName: { fontSize: 20, fontWeight: '900', color: '#A78BFA', letterSpacing: 4, fontFamily: 'monospace' },
  dateText: { fontSize: 11, color: '#444', fontFamily: 'monospace', marginTop: 2 },

  // キャラクターパネル
  statusPanel: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#0E0E24',
    borderWidth: 2,
    borderColor: '#2D2D5E',
    padding: 12,
    gap: 12,
  },
  characterArea: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  levelTag: {
    position: 'absolute', bottom: -4, backgroundColor: '#7c3aed',
    paddingHorizontal: 8, paddingVertical: 2,
  },
  levelTagText: { fontSize: 10, fontWeight: '900', color: '#fff', fontFamily: 'monospace' },
  statsArea: { flex: 1, justifyContent: 'center', gap: 8 },
  heroName: { fontSize: 12, fontWeight: '800', color: '#A78BFA', fontFamily: 'monospace', marginBottom: 4 },

  // ピクセルバー
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barLabel: { fontSize: 10, fontWeight: '900', color: '#2ECC71', fontFamily: 'monospace', width: 28 },
  pixelBarBg: { flex: 1, height: 10, backgroundColor: '#1a1a3a', borderWidth: 1, borderColor: '#2D2D5E' },
  pixelBarFill: { height: '100%' },
  expFill: { backgroundColor: '#7c3aed' },
  barValue: { fontSize: 9, color: '#555', fontFamily: 'monospace', width: 24, textAlign: 'right' },

  // クエストミニ
  questMini: { marginTop: 4 },
  questMiniText: { fontSize: 10, color: '#888', fontFamily: 'monospace', marginBottom: 4 },
  questDots: { flexDirection: 'row', gap: 4 },
  questDot: { width: 8, height: 8, backgroundColor: '#1a1a3a', borderWidth: 1, borderColor: '#2D2D5E' },
  questDotDone: { backgroundColor: '#7c3aed', borderColor: '#A78BFA' },

  // ピクセルウィンドウ
  pixelWindow: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#0E0E24',
    borderWidth: 2,
    borderColor: '#2D2D5E',
  },
  pixelWindowTitle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pixelWindowTitleText: { fontSize: 11, fontWeight: '900', color: '#fff', fontFamily: 'monospace' },
  questCount: { fontSize: 11, fontWeight: '900', color: '#FDE68A', fontFamily: 'monospace' },

  // カロリー
  calorieRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  calorieBig: { fontSize: 38, fontWeight: '900', color: '#fff', fontFamily: 'monospace' },
  calorieUnit: { fontSize: 10, color: '#555', fontFamily: 'monospace' },
  calorieDiv: { width: 1, height: 40, backgroundColor: '#2D2D5E', marginHorizontal: 16 },
  calorieRight: { alignItems: 'flex-start' },
  remainNum: { fontSize: 26, fontWeight: '900', color: '#2ECC71', fontFamily: 'monospace' },
  pfcRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#2D2D5E',
    padding: 10,
  },
  pfcItem: { alignItems: 'center' },
  pfcLabel: { fontSize: 12, fontWeight: '900', fontFamily: 'monospace' },
  pfcValue: { fontSize: 14, color: '#fff', fontWeight: '700', fontFamily: 'monospace' },

  // クエスト行
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a3a',
    gap: 8,
  },
  questRowDone: { opacity: 0.45 },
  questIcon: { fontSize: 16, width: 24 },
  questLabel: { flex: 1, fontSize: 12, color: '#ccc', fontFamily: 'monospace' },
  questLabelDone: { textDecorationLine: 'line-through', color: '#555' },
  questCheck: { fontSize: 14, color: '#2ECC71', fontWeight: '900' },
  questExp: { fontSize: 11, color: '#F59E0B', fontWeight: '800', fontFamily: 'monospace' },
  allComplete: {
    margin: 8,
    padding: 10,
    backgroundColor: '#1a1a3a',
    borderWidth: 1,
    borderColor: '#2D2D5E',
    alignItems: 'center',
  },
  allCompleteDone: { backgroundColor: '#1a3a1a', borderColor: '#2ECC71' },
  allCompleteText: { fontSize: 12, fontWeight: '900', color: '#F59E0B', fontFamily: 'monospace' },

  // ピクセルボタン
  pixelButton: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#7c3aed',
    borderWidth: 2,
    borderColor: '#A78BFA',
    borderBottomWidth: 4,
    borderBottomColor: '#4C1D95',
    borderRightWidth: 4,
    borderRightColor: '#4C1D95',
  },
  pixelButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  pixelButtonIcon: { fontSize: 32 },
  pixelButtonText: { fontSize: 16, fontWeight: '900', color: '#fff', fontFamily: 'monospace' },
  pixelButtonSub: { fontSize: 10, color: 'rgba(255,255,255,0.65)', marginTop: 3, fontFamily: 'monospace' },

  // 下部カード
  bottomRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 32, gap: 8 },
  pixelCard: {
    flex: 1,
    backgroundColor: '#0E0E24',
    borderWidth: 2,
    borderColor: '#2D2D5E',
    borderBottomWidth: 3,
    borderBottomColor: '#7c3aed',
    padding: 14,
    alignItems: 'center',
  },
  pixelCardIcon: { fontSize: 22, marginBottom: 4 },
  pixelCardLabel: { fontSize: 10, color: '#555', fontFamily: 'monospace' },
  pixelCardValue: { fontSize: 15, fontWeight: '900', color: '#fff', fontFamily: 'monospace', marginTop: 4 },
  pixelCardSub: { fontSize: 9, color: '#E74C3C', fontFamily: 'monospace', marginTop: 2 },
  pixelCardExp: { fontSize: 10, color: '#2ECC71', fontFamily: 'monospace', marginTop: 2 },
});
