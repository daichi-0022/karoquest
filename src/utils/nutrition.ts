// ── 栄養計算共通ユーティリティ ──────────────────────────────

// BMR計算（Mifflin-St Jeor式）
export function calcBMR(
  gender: 'male' | 'female',
  age: number,
  height: number,
  weight: number,
): number {
  return gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
}

// TDEE計算
export function calcTDEE(
  gender: 'male' | 'female',
  age: number,
  height: number,
  weight: number,
  activity: string,
): number {
  const bmr = calcBMR(gender, age, height, weight);
  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activity] ?? 1.375));
}

// 1日のカロリー目標計算（安全下限付き）
export function calcCalorieTarget(
  tdee: number,
  weeklyLossKg: number,
  gender: 'male' | 'female',
): number {
  const deficit = Math.round(weeklyLossKg * 1000);
  const minCalorie = gender === 'male' ? 1500 : 1200;
  return Math.max(tdee - deficit, minCalorie);
}

// PFC目標計算（カロリー目標・体重から算出）
export function calcPFC(
  weight: number,
  calorieTarget: number,
): { protein: number; fat: number; carbs: number } {
  const protein = Math.round(weight * 1.8);                      // 体重×1.8g
  const fat     = Math.round(calorieTarget * 0.25 / 9);          // 25%を脂質
  const carbs   = Math.max(
    Math.round((calorieTarget - protein * 4 - fat * 9) / 4),
    50,
  );
  return { protein, fat, carbs };
}

// 目標達成日計算
export function calcTargetDate(
  currentWeight: number,
  targetWeight: number,
  weeklyLossKg: number,
): string | null {
  if (!targetWeight || currentWeight <= targetWeight || weeklyLossKg <= 0) return null;
  const diff = currentWeight - targetWeight;
  const weeks = Math.ceil(diff / weeklyLossKg);
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
}
