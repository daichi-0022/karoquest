import { getDb, EXP_REWARDS } from './schema';
import type { FoodAnalysisResult } from '../api/claude';
import { checkAndUpdateQuests } from './quests';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  date: string;
  meal_type: MealType;
  photo_uri: string | null;
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  confidence: 'high' | 'medium' | 'low' | null;
  dish_name: string | null;
  is_complex_dish: boolean;
  notes: string | null;
  created_at: string;
}

export interface DailySummary {
  date: string;
  total_calories: number;
  total_protein_g: number;
  total_fat_g: number;
  total_carbs_g: number;
  meal_count: number;
}

export async function saveMeal(
  date: string,
  meal_type: MealType,
  analysis: FoodAnalysisResult,
  photo_uri: string | null
): Promise<{ meal: Meal; expGained: number }> {
  const db = getDb();
  const id = uuidv4();

  await db.runAsync(
    `INSERT INTO meals (id, date, meal_type, photo_uri, calories, protein_g, fat_g, carbs_g, confidence, dish_name, is_complex_dish, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, date, meal_type, photo_uri, analysis.calories, analysis.protein_g,
     analysis.fat_g, analysis.carbs_g, analysis.confidence,
     analysis.dish_name, analysis.is_complex_dish ? 1 : 0, analysis.notes]
  );

  // EXP加算
  await db.runAsync(
    `UPDATE user_profile SET total_exp = total_exp + ? WHERE id = 'me'`,
    [EXP_REWARDS.MEAL_LOGGED]
  );

  // 食事記録直後にクエスト即時判定（達成感を即座に届ける）
  const profile = await db.getFirstAsync<{
    daily_calorie_target: number;
    protein_target_g: number;
  }>(`SELECT daily_calorie_target, protein_target_g FROM user_profile WHERE id = 'me'`);
  const summary = await getDailySummary(date);
  let expGained = EXP_REWARDS.MEAL_LOGGED;

  if (profile && summary) {
    // INSERT後に再取得して最新の食事リストを使う
    const allMeals = await getMealsForDate(date);
    const questExp = await checkAndUpdateQuests(date, {
      meals: allMeals.map(m => ({ meal_type: m.meal_type })),
      totalCalories: summary.total_calories,
      calorieTarget: profile.daily_calorie_target,
      totalProtein: summary.total_protein_g,
      proteinTarget: profile.protein_target_g ?? 50,
      hasWeight: false,
    });
    expGained += questExp;
  }

  const meal = await db.getFirstAsync<Meal>(`SELECT * FROM meals WHERE id = ?`, [id]);
  return { meal: meal!, expGained };
}

export async function getMealsForDate(date: string): Promise<Meal[]> {
  const db = getDb();
  return db.getAllAsync<Meal>(
    `SELECT * FROM meals WHERE date = ? ORDER BY created_at ASC`,
    [date]
  );
}

export async function getDailySummary(date: string): Promise<DailySummary | null> {
  const db = getDb();
  return db.getFirstAsync<DailySummary>(
    `SELECT
       date,
       COALESCE(SUM(calories), 0) as total_calories,
       COALESCE(SUM(protein_g), 0) as total_protein_g,
       COALESCE(SUM(fat_g), 0) as total_fat_g,
       COALESCE(SUM(carbs_g), 0) as total_carbs_g,
       COUNT(*) as meal_count
     FROM meals WHERE date = ? GROUP BY date`,
    [date]
  );
}

export async function deleteMeal(id: string): Promise<void> {
  const db = getDb();
  // 削除前に日付を取得
  const meal = await db.getFirstAsync<{ date: string }>(`SELECT date FROM meals WHERE id = ?`, [id]);
  await db.runAsync(`DELETE FROM meals WHERE id = ?`, [id]);

  // 削除後にクエストを再評価（条件を満たさなくなったものはリセット）
  if (meal?.date) {
    const profile = await db.getFirstAsync<{ daily_calorie_target: number; protein_target_g: number }>(
      `SELECT daily_calorie_target, protein_target_g FROM user_profile WHERE id = 'me'`
    );
    const summary = await getDailySummary(meal.date);
    const allMeals = await getMealsForDate(meal.date);
    const mealTypes = new Set(allMeals.map(m => m.meal_type));

    // 条件を満たさなくなったクエストをリセット（EXP返還なし）
    if (!mealTypes.has('breakfast')) {
      await db.runAsync(
        `UPDATE daily_quests SET completed = 0, completed_at = NULL WHERE date = ? AND quest_type = 'breakfast' AND completed = 1`,
        [meal.date]
      );
    }
    const hasThreeMeals = mealTypes.has('breakfast') && mealTypes.has('lunch') && mealTypes.has('dinner');
    if (!hasThreeMeals) {
      await db.runAsync(
        `UPDATE daily_quests SET completed = 0, completed_at = NULL WHERE date = ? AND quest_type = 'three_meals' AND completed = 1`,
        [meal.date]
      );
    }
    if (profile && summary) {
      const ratio = profile.daily_calorie_target > 0 ? summary.total_calories / profile.daily_calorie_target : 0;
      if (ratio < 0.8 || ratio > 1.05) {
        await db.runAsync(
          `UPDATE daily_quests SET completed = 0, completed_at = NULL WHERE date = ? AND quest_type = 'calorie_goal' AND completed = 1`,
          [meal.date]
        );
      }
      const proteinTarget = profile.protein_target_g ?? 50;
      if (summary.total_protein_g < proteinTarget) {
        await db.runAsync(
          `UPDATE daily_quests SET completed = 0, completed_at = NULL WHERE date = ? AND quest_type = 'protein' AND completed = 1`,
          [meal.date]
        );
      }
    }
    // all_completeもリセット
    await db.runAsync(
      `UPDATE daily_quests SET completed = 0, completed_at = NULL
       WHERE date = ? AND quest_type = 'all_complete'
         AND (SELECT COUNT(*) FROM daily_quests WHERE date = ? AND quest_type != 'all_complete' AND completed = 0) > 0`,
      [meal.date, meal.date]
    );
  }
}
