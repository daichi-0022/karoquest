import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { getDb } from '@/src/db/schema';

// ── TDEE計算（Mifflin-St Jeor式） ────────────────────────────
function calcTDEE(
  gender: 'male' | 'female',
  age: number,
  height: number,
  weight: number,
  activity: string,
): number {
  const bmr = gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;

  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activity] ?? 1.375));
}

// PFC目標計算（体重・目標カロリーから）
function calcPFC(weight: number, calorieTarget: number) {
  const protein = Math.round(weight * 1.8);       // 体重×1.8g
  const fat     = Math.round(calorieTarget * 0.25 / 9); // 25%を脂質
  const carbs   = Math.round((calorieTarget - protein * 4 - fat * 9) / 4);
  return { protein, fat, carbs: Math.max(carbs, 50) };
}

// 目標達成日数計算（0.5kg/週 = 週500kcal赤字）
function calcTargetDate(
  currentWeight: number,
  targetWeight: number,
  weeklyLoss: number,
): string | null {
  if (!targetWeight || currentWeight <= targetWeight) return null;
  const diff = currentWeight - targetWeight;
  const weeks = Math.ceil(diff / weeklyLoss);
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
}

const STEPS = ['性別・年齢', '身長・体重', '目標設定', '活動量', '確認'] as const;

const ACTIVITY_OPTIONS = [
  { key: 'sedentary',   label: 'ほぼ運動しない',     sub: 'デスクワーク中心', x: 1.2 },
  { key: 'light',       label: '軽い運動（週1〜2回）', sub: 'ウォーキング程度', x: 1.375 },
  { key: 'moderate',    label: '中程度（週3〜4回）',  sub: 'ジム・スポーツ',  x: 1.55 },
  { key: 'active',      label: 'よく運動する（週5〜6回）', sub: '本格的なトレーニング', x: 1.725 },
  { key: 'very_active', label: '毎日激しく運動',      sub: 'アスリートレベル', x: 1.9 },
];

const LOSS_OPTIONS = [
  { key: 0.25, label: 'ゆっくり（週0.25kg）', sub: '無理なく長期継続' },
  { key: 0.5,  label: '標準（週0.5kg）',     sub: '推奨。リバウンドしにくい' },
  { key: 0.75, label: '早め（週0.75kg）',    sub: 'やや頑張りが必要' },
  { key: 1.0,  label: '速攻（週1kg）',       sub: '厳しい食事制限が必要' },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [gender,   setGender]   = useState<'male'|'female'>('male');
  const [age,      setAge]      = useState('25');
  const [height,   setHeight]   = useState('170');
  const [weight,   setWeight]   = useState('70');
  const [targetW,  setTargetW]  = useState('65');
  const [targetBF, setTargetBF] = useState('');
  const [activity, setActivity] = useState('light');
  const [weeklyLoss, setWeeklyLoss] = useState(0.5);
  const [saving,   setSaving]   = useState(false);

  const ageN    = parseInt(age)    || 25;
  const heightN = parseFloat(height) || 170;
  const weightN = parseFloat(weight) || 70;
  const targetWN = parseFloat(targetW) || 65;

  const tdee = calcTDEE(gender, ageN, heightN, weightN, activity);
  const deficit = Math.round(weeklyLoss * 7000 / 7); // 週の赤字÷7日
  const calorieTarget = Math.max(tdee - deficit, gender === 'male' ? 1500 : 1200);
  const { protein, fat, carbs } = calcPFC(weightN, calorieTarget);
  const targetDate = calcTargetDate(weightN, targetWN, weeklyLoss);
  const daysToGoal = targetDate
    ? Math.ceil((new Date(targetDate).getTime() - Date.now()) / 86400000)
    : null;

  const save = async () => {
    setSaving(true);
    try {
      const db = getDb();
      await db.runAsync(`
        UPDATE user_profile SET
          gender = ?, age = ?, height_cm = ?, current_weight_kg = ?,
          target_weight_kg = ?, target_body_fat_pct = ?,
          activity_level = ?, weekly_loss_kg = ?,
          daily_calorie_target = ?,
          protein_target_g = ?, fat_target_g = ?, carbs_target_g = ?,
          target_date = ?, onboarding_done = 1
        WHERE id = 'me'
      `, [
        gender, ageN, heightN, weightN,
        targetWN || null, parseFloat(targetBF) || null,
        activity, weeklyLoss,
        calorieTarget,
        protein, fat, carbs,
        targetDate,
      ]);
      router.replace('/');
    } catch (e) {
      Alert.alert('エラー', '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === 0) {
      if (ageN < 10 || ageN > 100) return Alert.alert('エラー', '年齢を正しく入力してください');
    }
    if (step === 1) {
      if (heightN < 100 || heightN > 250) return Alert.alert('エラー', '身長を正しく入力してください');
      if (weightN < 30  || weightN > 300) return Alert.alert('エラー', '体重を正しく入力してください');
    }
    if (step === 2) {
      if (targetWN < 30 || targetWN > 300) return Alert.alert('エラー', '目標体重を正しく入力してください');
      if (targetWN >= weightN) return Alert.alert('注意', '目標体重は現在の体重より少なく設定してください');
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* プログレスバー */}
      <View style={styles.progressBar}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
        ))}
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.stepLabel}>STEP {step + 1} / {STEPS.length}</Text>
        <Text style={styles.title}>{STEPS[step]}</Text>

        {/* Step 0: 性別・年齢 */}
        {step === 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>性別</Text>
            <View style={styles.row}>
              {(['male','female'] as const).map(g => (
                <TouchableOpacity
                  key={g}
                  style={[styles.optionBtn, gender === g && styles.optionBtnActive]}
                  onPress={() => setGender(g)}
                >
                  <Text style={styles.optionEmoji}>{g === 'male' ? '👨' : '👩'}</Text>
                  <Text style={[styles.optionLabel, gender === g && styles.optionLabelActive]}>
                    {g === 'male' ? '男性' : '女性'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { marginTop: 24 }]}>年齢</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="25"
                placeholderTextColor="#444"
              />
              <Text style={styles.unit}>歳</Text>
            </View>
          </View>
        )}

        {/* Step 1: 身長・体重 */}
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.label}>身長</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                keyboardType="decimal-pad"
                placeholder="170"
                placeholderTextColor="#444"
                autoFocus
              />
              <Text style={styles.unit}>cm</Text>
            </View>

            <Text style={[styles.label, { marginTop: 24 }]}>現在の体重</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder="70.0"
                placeholderTextColor="#444"
              />
              <Text style={styles.unit}>kg</Text>
            </View>

            {/* BMI表示 */}
            {heightN > 0 && weightN > 0 && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>BMI</Text>
                <Text style={styles.infoValue}>
                  {(weightN / ((heightN / 100) ** 2)).toFixed(1)}
                </Text>
                <Text style={styles.infoSub}>
                  {(() => {
                    const bmi = weightN / ((heightN / 100) ** 2);
                    if (bmi < 18.5) return '低体重';
                    if (bmi < 25)   return '標準 ✅';
                    if (bmi < 30)   return '肥満度1';
                    return '肥満度2以上';
                  })()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Step 2: 目標設定 */}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.label}>目標体重</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={targetW}
                onChangeText={setTargetW}
                keyboardType="decimal-pad"
                placeholder="65.0"
                placeholderTextColor="#444"
                autoFocus
              />
              <Text style={styles.unit}>kg</Text>
            </View>

            <Text style={[styles.label, { marginTop: 24 }]}>目標体脂肪率（任意）</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={targetBF}
                onChangeText={setTargetBF}
                keyboardType="decimal-pad"
                placeholder="20.0"
                placeholderTextColor="#444"
              />
              <Text style={styles.unit}>%</Text>
            </View>

            <Text style={[styles.label, { marginTop: 24 }]}>減量ペース</Text>
            {LOSS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.listOption, weeklyLoss === opt.key && styles.listOptionActive]}
                onPress={() => setWeeklyLoss(opt.key)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listOptionLabel, weeklyLoss === opt.key && styles.listOptionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.listOptionSub}>{opt.sub}</Text>
                </View>
                {weeklyLoss === opt.key && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 3: 活動量 */}
        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionDesc}>普段の生活・運動レベルを選んでください</Text>
            {ACTIVITY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.listOption, activity === opt.key && styles.listOptionActive]}
                onPress={() => setActivity(opt.key)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listOptionLabel, activity === opt.key && styles.listOptionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.listOptionSub}>{opt.sub}</Text>
                </View>
                {activity === opt.key && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 4: 確認 */}
        {step === 4 && (
          <View style={styles.section}>
            <Text style={styles.sectionDesc}>あなたの目標プランが決まりました！</Text>

            <View style={styles.summaryCard}>
              <SummaryRow label="基礎代謝（BMR）" value={`${Math.round(calcTDEE(gender, ageN, heightN, weightN, 'sedentary') / 1.2)} kcal`} />
              <SummaryRow label="消費カロリー（TDEE）" value={`${tdee} kcal`} />
              <SummaryRow label="1日の目標カロリー" value={`${calorieTarget} kcal`} color="#7C3AED" big />
              <View style={styles.divider} />
              <SummaryRow label="タンパク質目標" value={`${protein}g`} color="#60A5FA" />
              <SummaryRow label="脂質目標"       value={`${fat}g`}     color="#FBBF24" />
              <SummaryRow label="炭水化物目標"   value={`${carbs}g`}   color="#34D399" />
              <View style={styles.divider} />
              <SummaryRow label="現在の体重" value={`${weightN}kg`} />
              <SummaryRow label="目標体重"   value={`${targetWN}kg`} />
              {daysToGoal && (
                <SummaryRow
                  label="目標達成まで"
                  value={`約${daysToGoal}日（${targetDate}）`}
                  color="#F59E0B"
                />
              )}
            </View>

            <View style={styles.noteCard}>
              <Text style={styles.noteText}>
                💡 毎日全クエストをこなすと約480EXP獲得できます。{'\n'}
                楽しみながら記録を続けましょう！
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ナビゲーションボタン */}
      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
            <Text style={styles.backBtnText}>← 戻る</Text>
          </TouchableOpacity>
        )}
        {step < STEPS.length - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={next}>
            <Text style={styles.nextBtnText}>次へ →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, styles.startBtn, saving && { opacity: 0.5 }]}
            onPress={save}
            disabled={saving}
          >
            <Text style={styles.nextBtnText}>
              {saving ? '設定中...' : '冒険を始める！⚔️'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value, color, big }: {
  label: string; value: string; color?: string; big?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, color && { color }, big && { fontSize: 20 }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0A0A18' },
  scroll: { flex: 1, paddingHorizontal: 20 },

  progressBar: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e1e4e' },
  progressDotActive: { backgroundColor: '#7C3AED', width: 24 },

  stepLabel: { fontSize: 12, color: '#555', marginBottom: 4, fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 24 },

  section: { gap: 4 },
  sectionDesc: { fontSize: 14, color: '#888', marginBottom: 16, lineHeight: 22 },

  label: { fontSize: 14, color: '#888', fontWeight: '600', marginBottom: 8 },

  row: { flexDirection: 'row', gap: 12 },
  optionBtn: {
    flex: 1, alignItems: 'center', padding: 20, backgroundColor: '#12122A',
    borderRadius: 16, borderWidth: 2, borderColor: '#1e1e4e',
  },
  optionBtnActive: { borderColor: '#7C3AED', backgroundColor: '#1a1a3e' },
  optionEmoji: { fontSize: 36, marginBottom: 8 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: '#555' },
  optionLabelActive: { color: '#fff' },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  input: {
    flex: 1, backgroundColor: '#12122A', borderRadius: 14, padding: 16,
    color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center',
    borderWidth: 1, borderColor: '#2d2d5e',
  },
  unit: { fontSize: 16, color: '#666', width: 30 },

  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#12122A', borderRadius: 14, padding: 16,
    marginTop: 16, borderWidth: 1, borderColor: '#2d2d5e',
  },
  infoLabel: { fontSize: 13, color: '#666' },
  infoValue: { fontSize: 28, fontWeight: '900', color: '#7C3AED' },
  infoSub:   { fontSize: 12, color: '#888' },

  listOption: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#12122A', borderRadius: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1e1e4e',
  },
  listOptionActive: { borderColor: '#7C3AED', backgroundColor: '#1a1a3e' },
  listOptionLabel: { fontSize: 14, fontWeight: '700', color: '#888', marginBottom: 2 },
  listOptionLabelActive: { color: '#fff' },
  listOptionSub: { fontSize: 12, color: '#555' },
  check: { fontSize: 18, color: '#7C3AED', fontWeight: '900' },

  summaryCard: {
    backgroundColor: '#12122A', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#2d2d5e', gap: 10, marginBottom: 16,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 13, color: '#666' },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
  divider: { height: 1, backgroundColor: '#1e1e4e', marginVertical: 4 },

  noteCard: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#2d2d5e',
  },
  noteText: { fontSize: 13, color: '#888', lineHeight: 20 },

  footer: { flexDirection: 'row', padding: 20, gap: 12 },
  backBtn: {
    flex: 1, backgroundColor: '#12122A', borderRadius: 16, padding: 18,
    alignItems: 'center', borderWidth: 1, borderColor: '#2d2d5e',
  },
  backBtnText: { fontSize: 15, fontWeight: '700', color: '#666' },
  nextBtn: {
    flex: 2, backgroundColor: '#7C3AED', borderRadius: 16, padding: 18, alignItems: 'center',
  },
  startBtn: { backgroundColor: '#059669' },
  nextBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});
