import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, RefreshControl, Image, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { getMealsForDate, deleteMeal, getDailySummary, type Meal, type DailySummary } from '@/src/db/meals';

const TODAY = new Date().toISOString().split('T')[0];
const MEAL_LABEL: Record<string, string> = {
  breakfast: '🌅 朝食',
  lunch: '☀️ 昼食',
  dinner: '🌙 夕食',
  snack: '🍎 間食',
};

export default function HistoryScreen() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [m, s] = await Promise.all([getMealsForDate(TODAY), getDailySummary(TODAY)]);
    setMeals(m);
    setSummary(s);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDelete = (id: string, name: string | null) => {
    Alert.alert(
      '削除しますか？',
      `${name ?? '食事記録'}を削除します`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除', style: 'destructive',
          onPress: async () => { await deleteMeal(id); await load(); },
        },
      ]
    );
  };

  const grouped = MEAL_ORDER.map(type => ({
    type,
    label: MEAL_LABEL[type],
    items: meals.filter(m => m.meal_type === type),
  })).filter(g => g.items.length > 0);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c3aed" />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>今日の記録</Text>
          <Text style={styles.dateText}>{TODAY.replace(/-/g, '/')}</Text>
        </View>

        {/* 合計カード */}
        {summary && summary.meal_count > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryCalNum}>{summary.total_calories}</Text>
              <Text style={styles.summaryCalUnit}> kcal</Text>
            </View>
            <View style={styles.pfcRow}>
              <PFCChip label="P" value={summary.total_protein_g} color="#60a5fa" />
              <PFCChip label="F" value={summary.total_fat_g} color="#fbbf24" />
              <PFCChip label="C" value={summary.total_carbs_g} color="#34d399" />
              <Text style={styles.mealCount}>{summary.meal_count}食</Text>
            </View>
          </View>
        )}

        {/* 食事グループ */}
        {grouped.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyText}>まだ記録がありません</Text>
            <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/camera' as any)}>
              <Text style={styles.addBtnText}>食事を記録する</Text>
            </TouchableOpacity>
          </View>
        ) : (
          grouped.map(group => (
            <View key={group.type} style={styles.group}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              {group.items.map(meal => (
                <MealCard key={meal.id} meal={meal} onDelete={() => handleDelete(meal.id, meal.dish_name)} />
              ))}
            </View>
          ))
        )}

        {/* 追加ボタン */}
        {meals.length > 0 && (
          <TouchableOpacity style={styles.floatingAdd} onPress={() => router.push('/camera' as any)}>
            <Text style={styles.floatingAddText}>+ 食事を追加</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'];

function MealCard({ meal, onDelete }: { meal: Meal; onDelete: () => void }) {
  const confidenceColor = meal.confidence === 'high' ? '#34d399' : meal.confidence === 'medium' ? '#fbbf24' : '#f87171';

  return (
    <View style={styles.mealCard}>
      {meal.photo_uri && (
        <Image source={{ uri: meal.photo_uri }} style={styles.mealThumb} />
      )}
      <View style={styles.mealInfo}>
        <Text style={styles.mealName} numberOfLines={1}>{meal.dish_name ?? '食事'}</Text>
        <Text style={styles.mealCal}>{meal.calories} kcal</Text>
        <View style={styles.mealPfc}>
          <Text style={styles.mealPfcText}>P {meal.protein_g.toFixed(1)}g</Text>
          <Text style={styles.mealPfcText}>F {meal.fat_g.toFixed(1)}g</Text>
          <Text style={styles.mealPfcText}>C {meal.carbs_g.toFixed(1)}g</Text>
        </View>
      </View>
      <View style={styles.mealRight}>
        {meal.confidence && (
          <View style={[styles.confDot, { backgroundColor: confidenceColor }]} />
        )}
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PFCChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.pfcChip}>
      <Text style={[styles.pfcChipLabel, { color }]}>{label}</Text>
      <Text style={styles.pfcChipVal}>{Math.round(value)}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  dateText: { fontSize: 13, color: '#666' },
  summaryCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2d2d4e' },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  summaryCalNum: { fontSize: 36, fontWeight: '900', color: '#7c3aed' },
  summaryCalUnit: { fontSize: 16, color: '#888' },
  pfcRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pfcChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pfcChipLabel: { fontSize: 12, fontWeight: '700' },
  pfcChipVal: { fontSize: 12, color: '#aaa' },
  mealCount: { fontSize: 12, color: '#666', marginLeft: 'auto' },
  emptyBox: { alignItems: 'center', paddingTop: 80, paddingBottom: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#666', marginBottom: 24 },
  addBtn: { backgroundColor: '#7c3aed', borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  group: { marginBottom: 16 },
  groupLabel: { fontSize: 13, color: '#888', fontWeight: '600', paddingHorizontal: 20, marginBottom: 8 },
  mealCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: '#1a1a1a', borderRadius: 14, padding: 12, marginBottom: 8 },
  mealThumb: { width: 56, height: 56, borderRadius: 10, marginRight: 12 },
  mealInfo: { flex: 1 },
  mealName: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  mealCal: { fontSize: 16, fontWeight: '800', color: '#7c3aed', marginBottom: 4 },
  mealPfc: { flexDirection: 'row', gap: 8 },
  mealPfcText: { fontSize: 11, color: '#666' },
  mealRight: { alignItems: 'center', gap: 8 },
  confDot: { width: 8, height: 8, borderRadius: 4 },
  deleteBtn: { padding: 4 },
  deleteText: { color: '#444', fontSize: 14 },
  floatingAdd: { margin: 16, backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 32 },
  floatingAddText: { color: '#7c3aed', fontSize: 15, fontWeight: '700' },
});
