import { getDb, EXP_REWARDS } from './schema';
import type { FoodAnalysisResult } from '../api/claude';
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

  // 今日の目標達成チェック
  const profile = await db.getFirstAsync<{ daily_calorie_target: number }>(
    `SELECT daily_calorie_target FROM user_profile WHERE id = 'me'`
  );
  const summary = await getDailySummary(date);
  let expGained = EXP_REWARDS.MEAL_LOGGED;

  if (profile && summary) {
    const target = profile.daily_calorie_target;
    const total = summary.total_calories;
    if (total >= target * 0.8 && total <= target * 1.05) {
      await db.runAsync(
        `UPDATE user_profile SET total_exp = total_exp + ? WHERE id = 'me'`,
        [EXP_REWARDS.DAILY_GOAL_MET]
      );
      expGained += EXP_REWARDS.DAILY_GOAL_MET;
    }
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
  await db.runAsync(`DELETE FROM meals WHERE id = ?`, [id]);
}
