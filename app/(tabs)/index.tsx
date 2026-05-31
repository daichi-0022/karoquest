import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, SafeAreaView, Animated,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { initializeDatabase } from '@/src/db/schema';
import { getProfile, type ProfileWithRpg } from '@/src/db/profile';
import { getDailySummary, type DailySummary } from '@/src/db/meals';
import { getLatestWeight } from '@/src/db/weights';
import { getDailyQuests, checkAndUpdateQuests, type Quest } from '@/src/db/quests';

const TODAY = new Date().toISOString().split('T')[0];

export default function HomeScreen() {
  const [profile, setProfile] = useState<ProfileWithRpg | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const load = useCallback(async () => {
    if (!dbReady) return;
    const [p, s, w, q] = await Promise.all([
      getProfile(),
      getDailySummary(TODAY),
      getLatestWeight(),
      getDailyQuests(TODAY),
    ]);
    setProfile(p);
    setSummary(s);
    setLatestWeight(w?.weight_kg ?? null);
    setQuests(q);

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

  const hpColor = calorieRatio > 0.95 ? '#ef4444' : calorieRatio > 0.7 ? '#f59e0b' : '#10b981';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>カロクエ</Text>
            <Text style={styles.dateText}>{TODAY.replace(/-/g, '/')}</Text>
          </View>
          <View style={styles.expBadge}>
            <Text style={styles.expBadgeText}>EXP {profile?.exp_in_level ?? 0}/{profile?.exp_for_next ?? 200}</Text>
          </View>
        </View>

        {/* キャラクター＆ステータス */}
        <View style={styles.heroSection}>
          <Animated.View style={[styles.characterWrap, { transform: [{ translateY: floatAnim }] }]}>
            <Text style={styles.characterEmoji}>⚔️</Text>
          </Animated.View>
          <View style={styles.statusWrap}>
            <View style={styles.levelRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lv.{profile?.level ?? 1}</Text>
              </View>
              <Text style={styles.titleText}>{profile?.title ?? '見習い冒険者'}</Text>
            </View>
            <View style={styles.expBarBg}>
              <View style={[styles.expBarFill, { width: `${profile?.exp_progress_pct ?? 0}%` as any }]} />
            </View>

            {/* HP（カロリー残量） */}
            <View style={styles.hpRow}>
              <Text style={styles.hpLabel}>HP</Text>
              <View style={styles.hpBarBg}>
                <View style={[styles.hpBarFill, { width: `${calorieRatio * 100}%` as any, backgroundColor: hpColor }]} />
              </View>
              <Text style={styles.hpText}>{totalCalories}/{calorieTarget}</Text>
            </View>
          </View>
        </View>

        {/* カロリー詳細カード */}
        <View style={styles.calorieCard}>
          <View style={styles.calorieRow}>
            <View style={styles.calorieMain}>
              <Text style={styles.calorieLabel}>今日のカロリー</Text>
              <View style={styles.calorieValueRow}>
                <Text style={styles.calorieNum}>{totalCalories}</Text>
                <Text style={styles.calorieUnit}> kcal</Text>
              </View>
            </View>
            <View style={styles.calorieRemain}>
              <Text style={styles.remainLabel}>残り</Text>
              <Text style={[styles.remainNum, calorieRemain === 0 && styles.remainOver]}>
                {calorieRemain === 0 ? 'OVER' : calorieRemain}
              </Text>
              {calorieRemain > 0 && <Text style={styles.remainUnit}>kcal</Text>}
            </View>
          </View>
          <View style={styles.pfcRow}>
            <PFCItem label="P" value={summary?.total_protein_g ?? 0} color="#60a5fa" />
            <PFCItem label="F" value={summary?.total_fat_g ?? 0} color="#fbbf24" />
            <PFCItem label="C" value={summary?.total_carbs_g ?? 0} color="#34d399" />
          </View>
        </View>

        {/* デイリークエスト */}
        <View style={styles.questCard}>
          <View style={styles.questHeader}>
            <Text style={styles.questTitle}>📜 今日のクエスト</Text>
            <Text style={styles.questProgress}>{completedQuests}/{totalQuests}</Text>
          </View>
          {quests.filter(q => q.quest_type !== 'all_complete').map(quest => (
            <View key={quest.id} style={[styles.questItem, quest.completed && styles.questItemDone]}>
              <Text style={styles.questIcon}>{quest.icon}</Text>
              <View style={styles.questInfo}>
                <Text style={[styles.questLabel, quest.completed && styles.questLabelDone]}>{quest.label}</Text>
                <Text style={styles.questDesc}>{quest.description}</Text>
              </View>
              <View style={styles.questExpWrap}>
                {quest.completed
                  ? <Text style={styles.questDoneCheck}>✓</Text>
                  : <Text style={styles.questExp}>+{quest.exp_reward}</Text>
                }
              </View>
            </View>
          ))}
          {/* 全完了ボーナス */}
          {quests.find(q => q.quest_type === 'all_complete') && (
            <View style={[
              styles.questAllComplete,
              quests.find(q => q.quest_type === 'all_complete')?.completed && styles.questAllCompleteDone,
            ]}>
              <Text style={styles.questAllText}>
                {quests.find(q => q.quest_type === 'all_complete')?.completed
                  ? '👑 今日の冒険完了！'
                  : '👑 全クエスト達成で +200 EXP ボーナス'}
              </Text>
            </View>
          )}
        </View>

        {/* 撮影ボタン */}
        <TouchableOpacity style={styles.shootButton} onPress={() => router.push('/camera' as any)}>
          <Text style={styles.shootIcon}>📸</Text>
          <View>
            <Text style={styles.shootText}>食事を記録する</Text>
            <Text style={styles.shootSub}>写真1枚でカロリー自動計算 → EXP獲得</Text>
          </View>
        </TouchableOpacity>

        {/* 体重カード */}
        <TouchableOpacity style={styles.weightCard} onPress={() => router.push('/weight' as any)}>
          <View style={styles.weightLeft}>
            <Text style={styles.weightEmoji}>⚖️</Text>
            <View>
              <Text style={styles.weightLabel}>今日の体重</Text>
              <Text style={styles.weightValue}>
                {latestWeight != null ? `${latestWeight} kg` : '未記録 → タップして入力'}
              </Text>
            </View>
          </View>
          {latestWeight == null && (
            <View style={styles.weightExpBadge}>
              <Text style={styles.weightExpText}>+30 EXP</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* バトル */}
        <TouchableOpacity style={styles.battleCard} onPress={() => router.push('/battle' as any)}>
          <View style={styles.battleLeft}>
            <Text style={styles.battleEmoji}>⚔️</Text>
            <View>
              <Text style={styles.battleTitle}>今週のバトル</Text>
              <Text style={styles.battleSub}>ボスを倒して大量EXP獲得</Text>
            </View>
          </View>
          <Text style={styles.battleArrow}>›</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function PFCItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.pfcItem}>
      <Text style={[styles.pfcLabel, { color }]}>{label}</Text>
      <Text style={styles.pfcValue}>{Math.round(value)}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0D1A' },
  scroll: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  appName: { fontSize: 22, fontWeight: '800', color: '#7c3aed', letterSpacing: -0.5 },
  dateText: { fontSize: 12, color: '#555', marginTop: 2 },
  expBadge: { backgroundColor: '#1a1a3e', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2d2d5e' },
  expBadgeText: { fontSize: 11, color: '#a78bfa', fontWeight: '700' },

  heroSection: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, backgroundColor: '#12122A', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#1e1e4e' },
  characterWrap: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  characterEmoji: { fontSize: 52 },
  statusWrap: { flex: 1, marginLeft: 16 },
  levelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  levelBadge: { backgroundColor: '#7c3aed', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  levelBadgeText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  titleText: { fontSize: 13, color: '#a78bfa', fontWeight: '600' },
  expBarBg: { height: 6, backgroundColor: '#1e1e4e', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  expBarFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 3 },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hpLabel: { fontSize: 11, fontWeight: '800', color: '#10b981', width: 22 },
  hpBarBg: { flex: 1, height: 8, backgroundColor: '#1e1e4e', borderRadius: 4, overflow: 'hidden' },
  hpBarFill: { height: '100%', borderRadius: 4 },
  hpText: { fontSize: 10, color: '#666', width: 70, textAlign: 'right' },

  calorieCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#12122A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e1e4e' },
  calorieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  calorieMain: {},
  calorieLabel: { fontSize: 12, color: '#555', marginBottom: 4 },
  calorieValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  calorieNum: { fontSize: 36, fontWeight: '900', color: '#fff' },
  calorieUnit: { fontSize: 14, color: '#555' },
  calorieRemain: { alignItems: 'center' },
  remainLabel: { fontSize: 11, color: '#555', marginBottom: 2 },
  remainNum: { fontSize: 24, fontWeight: '800', color: '#10b981' },
  remainOver: { color: '#ef4444', fontSize: 18 },
  remainUnit: { fontSize: 11, color: '#555' },
  pfcRow: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderTopColor: '#1e1e4e', paddingTop: 12 },
  pfcItem: { alignItems: 'center' },
  pfcLabel: { fontSize: 12, fontWeight: '800' },
  pfcValue: { fontSize: 16, color: '#fff', fontWeight: '700', marginTop: 2 },

  questCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#12122A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e1e4e' },
  questHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  questTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
  questProgress: { fontSize: 13, fontWeight: '700', color: '#7c3aed' },
  questItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a3a', gap: 10 },
  questItemDone: { opacity: 0.5 },
  questIcon: { fontSize: 20, width: 28 },
  questInfo: { flex: 1 },
  questLabel: { fontSize: 13, fontWeight: '700', color: '#fff' },
  questLabelDone: { textDecorationLine: 'line-through', color: '#555' },
  questDesc: { fontSize: 11, color: '#555', marginTop: 2 },
  questExpWrap: { width: 48, alignItems: 'flex-end' },
  questExp: { fontSize: 12, fontWeight: '700', color: '#f59e0b' },
  questDoneCheck: { fontSize: 16, color: '#10b981', fontWeight: '800' },
  questAllComplete: { marginTop: 12, backgroundColor: '#1a1a3a', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2d2d5e' },
  questAllCompleteDone: { backgroundColor: '#1a3a1a', borderColor: '#10b981' },
  questAllText: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },

  shootButton: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#7c3aed', borderRadius: 18, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  shootIcon: { fontSize: 36 },
  shootText: { fontSize: 17, fontWeight: '800', color: '#fff' },
  shootSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 3 },

  weightCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#12122A', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#1e1e4e' },
  weightLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weightEmoji: { fontSize: 24 },
  weightLabel: { fontSize: 12, color: '#555' },
  weightValue: { fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 2 },
  weightExpBadge: { backgroundColor: '#1a2a1a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#10b981' },
  weightExpText: { fontSize: 12, fontWeight: '700', color: '#10b981' },

  battleCard: { marginHorizontal: 16, marginBottom: 32, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#2d2d4e' },
  battleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  battleEmoji: { fontSize: 24 },
  battleTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  battleSub: { fontSize: 11, color: '#666', marginTop: 2 },
  battleArrow: { fontSize: 24, color: '#7c3aed', fontWeight: '300' },
});
