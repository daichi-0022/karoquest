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

const TODAY = new Date().toISOString().split('T')[0];

export default function HomeScreen() {
  const [profile, setProfile] = useState<ProfileWithRpg | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  const load = useCallback(async () => {
    if (!dbReady) return;
    const [p, s, w] = await Promise.all([
      getProfile(),
      getDailySummary(TODAY),
      getLatestWeight(),
    ]);
    setProfile(p);
    setSummary(s);
    setLatestWeight(w?.weight_kg ?? null);
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
  const calorieProgress = Math.min(totalCalories / calorieTarget, 1);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.appName}>カロクエ</Text>
          <Text style={styles.dateText}>{TODAY.replace(/-/g, '/')}</Text>
        </View>

        {/* キャラクター & RPGステータス */}
        <View style={styles.rpgCard}>
          <View style={styles.characterArea}>
            <Text style={styles.characterEmoji}>⚔️</Text>
            <View style={styles.characterInfo}>
              <Text style={styles.levelText}>Lv.{profile?.level ?? 1}</Text>
              <Text style={styles.titleText}>{profile?.title ?? '見習い冒険者'}</Text>
            </View>
          </View>
          <View style={styles.expBar}>
            <View style={[styles.expFill, { width: `${profile?.exp_progress_pct ?? 0}%` as any }]} />
          </View>
          <Text style={styles.expText}>
            EXP {profile?.exp_in_level ?? 0} / {profile?.exp_for_next ?? 200}
          </Text>
        </View>

        {/* カロリー進捗 */}
        <View style={styles.calorieCard}>
          <View style={styles.calorieHeader}>
            <Text style={styles.calorieTitle}>今日のカロリー</Text>
            <Text style={styles.calorieValue}>
              <Text style={styles.calorieNum}>{totalCalories}</Text>
              <Text style={styles.calorieTarget}> / {calorieTarget} kcal</Text>
            </Text>
          </View>
          <View style={styles.calorieBarBg}>
            <View style={[
              styles.calorieBarFill,
              { width: `${calorieProgress * 100}%` as any },
              calorieProgress >= 1 && styles.calorieBarOver,
            ]} />
          </View>
          <View style={styles.pfcRow}>
            <PFCItem label="P" value={summary?.total_protein_g ?? 0} color="#60a5fa" />
            <PFCItem label="F" value={summary?.total_fat_g ?? 0} color="#fbbf24" />
            <PFCItem label="C" value={summary?.total_carbs_g ?? 0} color="#34d399" />
          </View>
        </View>

        {/* 撮影ボタン */}
        <TouchableOpacity style={styles.shootButton} onPress={() => router.push('/camera' as any)}>
          <Text style={styles.shootIcon}>📸</Text>
          <Text style={styles.shootText}>食事を撮影する</Text>
          <Text style={styles.shootSub}>写真1枚でカロリー自動計算</Text>
        </TouchableOpacity>

        {/* 体重 */}
        <TouchableOpacity style={styles.weightCard} onPress={() => router.push('/weight' as any)}>
          <Text style={styles.weightLabel}>今日の体重</Text>
          <Text style={styles.weightValue}>
            {latestWeight != null ? `${latestWeight} kg` : '未記録 → タップして入力'}
          </Text>
        </TouchableOpacity>

        {/* バトル */}
        <View style={styles.battleCard}>
          <Text style={styles.battleTitle}>⚔️ 今週のバトル</Text>
          <Text style={styles.battleSub}>友達を招待してバトルを始めよう</Text>
          <TouchableOpacity style={styles.battleBtn} onPress={() => router.push('/battle' as any)}>
            <Text style={styles.battleBtnText}>バトルを始める</Text>
          </TouchableOpacity>
        </View>

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
  safe: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  appName: { fontSize: 22, fontWeight: '800', color: '#7c3aed', letterSpacing: -0.5 },
  dateText: { fontSize: 13, color: '#666' },
  rpgCard: { margin: 16, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2d2d4e' },
  characterArea: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  characterEmoji: { fontSize: 44 },
  characterInfo: { marginLeft: 12 },
  levelText: { fontSize: 20, fontWeight: '800', color: '#7c3aed' },
  titleText: { fontSize: 13, color: '#aaa', marginTop: 2 },
  expBar: { height: 8, backgroundColor: '#2a2a3e', borderRadius: 4, overflow: 'hidden' },
  expFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 4 },
  expText: { fontSize: 11, color: '#666', marginTop: 6, textAlign: 'right' },
  calorieCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16 },
  calorieHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calorieTitle: { fontSize: 14, color: '#888' },
  calorieValue: {},
  calorieNum: { fontSize: 22, fontWeight: '800', color: '#fff' },
  calorieTarget: { fontSize: 13, color: '#666' },
  calorieBarBg: { height: 10, backgroundColor: '#2a2a2a', borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
  calorieBarFill: { height: '100%', backgroundColor: '#7c3aed', borderRadius: 5 },
  calorieBarOver: { backgroundColor: '#ef4444' },
  pfcRow: { flexDirection: 'row', justifyContent: 'space-around' },
  pfcItem: { alignItems: 'center' },
  pfcLabel: { fontSize: 12, fontWeight: '700' },
  pfcValue: { fontSize: 15, color: '#fff', fontWeight: '600', marginTop: 2 },
  shootButton: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#7c3aed', borderRadius: 20, padding: 24, alignItems: 'center' },
  shootIcon: { fontSize: 40 },
  shootText: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 8 },
  shootSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  weightCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weightLabel: { fontSize: 14, color: '#888' },
  weightValue: { fontSize: 14, fontWeight: '600', color: '#fff' },
  battleCard: { marginHorizontal: 16, marginBottom: 32, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2d2d4e' },
  battleTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  battleSub: { fontSize: 13, color: '#666', marginBottom: 12 },
  battleBtn: { backgroundColor: '#2d2d4e', borderRadius: 10, padding: 12, alignItems: 'center' },
  battleBtnText: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },
});
