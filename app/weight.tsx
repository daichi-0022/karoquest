import { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { saveWeight, saveEvoltScan, getWeightHistory, type WeightEntry } from '@/src/db/weights';

const TODAY = new Date().toISOString().split('T')[0];

export default function WeightScreen() {
  const [weightInput, setWeightInput] = useState('');
  const [history, setHistory] = useState<WeightEntry[]>([]);
  const [showEvolt, setShowEvolt] = useState(false);
  const [evoltWeight, setEvoltWeight] = useState('');
  const [evoltFat, setEvoltFat] = useState('');
  const [evoltMuscle, setEvoltMuscle] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const load = useCallback(async () => {
    const h = await getWeightHistory(14);
    setHistory(h.slice().reverse());
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [load]));

  const handleSaveWeight = async () => {
    const w = parseFloat(weightInput);
    if (isNaN(w) || w < 20 || w > 300) {
      Alert.alert('エラー', '20〜300の間で体重を入力してください');
      return;
    }
    setSaving(true);
    try {
      const { expGained } = await saveWeight(TODAY, w, 'manual');
      await load();
      setWeightInput('');
      if (expGained > 0) {
        Alert.alert('体重記録！', `先週より減量達成 🎉\n+${expGained} EXP 獲得！`);
      } else {
        Alert.alert('記録しました', `${w} kg を記録しました`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEvolt = async () => {
    const w = parseFloat(evoltWeight);
    const fat = evoltFat ? parseFloat(evoltFat) : null;
    const muscle = evoltMuscle ? parseFloat(evoltMuscle) : null;

    if (isNaN(w) || w < 20 || w > 300) {
      Alert.alert('エラー', '体重を正しく入力してください');
      return;
    }
    if (fat !== null && (isNaN(fat) || fat < 1 || fat > 60)) {
      Alert.alert('エラー', '体脂肪率は1〜60%の範囲で入力してください');
      return;
    }
    if (muscle !== null && (isNaN(muscle) || muscle < 10 || muscle > 100)) {
      Alert.alert('エラー', '骨格筋量は10〜100kgの範囲で入力してください');
      return;
    }

    setSaving(true);
    try {
      await saveEvoltScan(TODAY, w, fat, muscle);
      await load();
      setEvoltWeight('');
      setEvoltFat('');
      setEvoltMuscle('');
      setShowEvolt(false);
      Alert.alert('Evoltデータ記録！', 'スキャン結果を保存しました');
    } finally {
      setSaving(false);
    }
  };

  const todayEntry = history.find(h => h.date === TODAY);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* ヘッダー */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← 戻る</Text>
            </TouchableOpacity>
            <Text style={styles.title}>体重記録</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* 今日の体重 */}
          <View style={styles.todayCard}>
            <Text style={styles.todayLabel}>今日の体重</Text>
            {todayEntry ? (
              <View style={styles.todayRecorded}>
                <Text style={styles.todayWeight}>{todayEntry.weight_kg}</Text>
                <Text style={styles.todayUnit}>kg</Text>
              </View>
            ) : (
              <Text style={styles.todayEmpty}>未記録</Text>
            )}
          </View>

          {/* 手動入力 */}
          <View style={styles.inputCard}>
            <Text style={styles.inputCardTitle}>体重を入力</Text>
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.weightInput}
                value={weightInput}
                onChangeText={setWeightInput}
                keyboardType="decimal-pad"
                placeholder="65.0"
                placeholderTextColor="#444"
                maxLength={5}
                autoFocus
              />
              <Text style={styles.kgLabel}>kg</Text>
              <TouchableOpacity
                style={[styles.recordBtn, (!weightInput || saving) && styles.recordBtnDisabled]}
                onPress={handleSaveWeight}
                disabled={!weightInput || saving}
              >
                <Text style={styles.recordBtnText}>{saving ? '保存中...' : '記録'}</Text>
              </TouchableOpacity>
            </View>

            {/* HealthKit placeholder */}
            <TouchableOpacity
              style={styles.healthKitBtn}
              onPress={() => Alert.alert(
                'Apple HealthKit 連携',
                '次のアップデートでApple HealthKitから体重を自動取得できるようになります。\nしばらくお待ちください！'
              )}
            >
              <Text style={styles.healthKitIcon}>❤️</Text>
              <View>
                <Text style={styles.healthKitText}>Apple HealthKit から取得</Text>
                <Text style={styles.healthKitSub}>次のアップデートで実装予定</Text>
              </View>
              <View style={styles.soonBadge}>
                <Text style={styles.soonBadgeText}>Soon</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Evolt 入力 */}
          <View style={styles.evoltSection}>
            <TouchableOpacity
              style={styles.evoltHeader}
              onPress={() => setShowEvolt(!showEvolt)}
            >
              <Text style={styles.evoltTitle}>⚡ Evolt 360 スキャン結果を入力</Text>
              <Text style={styles.evoltChevron}>{showEvolt ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showEvolt && (
              <View style={styles.evoltForm}>
                <Text style={styles.evoltHint}>
                  Evolt Active アプリから数値をコピーして入力してください
                </Text>
                <EvoltField
                  label="体重"
                  unit="kg"
                  value={evoltWeight}
                  onChange={setEvoltWeight}
                  placeholder="65.0"
                  required
                />
                <EvoltField
                  label="体脂肪率"
                  unit="%"
                  value={evoltFat}
                  onChange={setEvoltFat}
                  placeholder="20.0 (任意)"
                />
                <EvoltField
                  label="骨格筋量"
                  unit="kg"
                  value={evoltMuscle}
                  onChange={setEvoltMuscle}
                  placeholder="30.0 (任意)"
                />
                <TouchableOpacity
                  style={[styles.evoltSaveBtn, (!evoltWeight || saving) && styles.evoltSaveBtnDisabled]}
                  onPress={handleSaveEvolt}
                  disabled={!evoltWeight || saving}
                >
                  <Text style={styles.evoltSaveBtnText}>{saving ? '保存中...' : 'Evoltデータを保存'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 履歴 */}
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>最近の記録</Text>
            {history.length === 0 ? (
              <Text style={styles.historyEmpty}>記録がありません</Text>
            ) : (
              history.slice(0, 10).map(entry => (
                <View key={entry.id} style={styles.historyItem}>
                  <Text style={styles.historyDate}>{entry.date.replace(/-/g, '/')}</Text>
                  <Text style={styles.historyWeight}>{entry.weight_kg} kg</Text>
                  <Text style={styles.historySource}>
                    {entry.source === 'evolt' ? '⚡' : entry.source === 'healthkit' ? '❤️' : '✏️'}
                  </Text>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function EvoltField({
  label, unit, value, onChange, placeholder, required,
}: {
  label: string; unit: string; value: string;
  onChange: (v: string) => void; placeholder: string; required?: boolean;
}) {
  return (
    <View style={styles.evoltField}>
      <Text style={styles.evoltFieldLabel}>
        {label} {required && <Text style={{ color: '#f87171' }}>*</Text>}
      </Text>
      <View style={styles.evoltFieldRow}>
        <TextInput
          style={styles.evoltInput}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder={placeholder}
          placeholderTextColor="#444"
          maxLength={6}
        />
        <Text style={styles.evoltUnit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 60 },
  backText: { color: '#7c3aed', fontSize: 14, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },
  todayCard: { margin: 16, backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2d2d4e' },
  todayLabel: { fontSize: 13, color: '#888', marginBottom: 8 },
  todayRecorded: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  todayWeight: { fontSize: 56, fontWeight: '900', color: '#7c3aed' },
  todayUnit: { fontSize: 20, color: '#888' },
  todayEmpty: { fontSize: 18, color: '#444', fontStyle: 'italic' },
  inputCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16 },
  inputCardTitle: { fontSize: 14, color: '#888', marginBottom: 14, fontWeight: '600' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  weightInput: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14, color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center' },
  kgLabel: { fontSize: 18, color: '#888' },
  recordBtn: { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
  recordBtnDisabled: { backgroundColor: '#3a2a5e' },
  recordBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  healthKitBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a2a1a', borderRadius: 12, padding: 14, gap: 12 },
  healthKitIcon: { fontSize: 24 },
  healthKitText: { fontSize: 13, color: '#aaa', fontWeight: '600' },
  healthKitSub: { fontSize: 11, color: '#555', marginTop: 2 },
  soonBadge: { marginLeft: 'auto', backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  soonBadgeText: { color: '#555', fontSize: 11 },
  evoltSection: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a', borderRadius: 16, overflow: 'hidden' },
  evoltHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  evoltTitle: { fontSize: 14, fontWeight: '700', color: '#fbbf24' },
  evoltChevron: { color: '#666', fontSize: 12 },
  evoltForm: { paddingHorizontal: 16, paddingBottom: 16 },
  evoltHint: { fontSize: 12, color: '#666', marginBottom: 14, lineHeight: 18 },
  evoltField: { marginBottom: 12 },
  evoltFieldLabel: { fontSize: 12, color: '#888', marginBottom: 6 },
  evoltFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  evoltInput: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 10, padding: 12, color: '#fff', fontSize: 16 },
  evoltUnit: { color: '#888', fontSize: 14, width: 24 },
  evoltSaveBtn: { backgroundColor: '#fbbf24', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  evoltSaveBtnDisabled: { backgroundColor: '#3a3a1a' },
  evoltSaveBtnText: { color: '#000', fontSize: 15, fontWeight: '800' },
  historySection: { marginHorizontal: 16, marginBottom: 32 },
  historyTitle: { fontSize: 14, color: '#888', fontWeight: '600', marginBottom: 10 },
  historyEmpty: { color: '#444', fontSize: 13, textAlign: 'center', paddingVertical: 20 },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  historyDate: { flex: 1, color: '#888', fontSize: 13 },
  historyWeight: { fontSize: 15, fontWeight: '700', color: '#fff', marginRight: 8 },
  historySource: { fontSize: 16 },
});
