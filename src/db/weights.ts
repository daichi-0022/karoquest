import { getDb, EXP_REWARDS } from './schema';
import { calcPFC, calcTargetDate } from '../utils/nutrition';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export interface WeightEntry {
  id: string;
  date: string;
  weight_kg: number;
  source: 'manual' | 'healthkit' | 'evolt';
  created_at: string;
}

export interface EvoltScan {
  id: string;
  date: string;
  weight_kg: number;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  created_at: string;
}

export async function saveWeight(
  date: string,
  weight_kg: number,
  source: WeightEntry['source'] = 'manual'
): Promise<{ expGained: number }> {
  const db = getDb();

  // UNIQUE制約対応: 同日に既存レコードがあればUPDATE、なければINSERT
  const existing = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM weights WHERE date = ?`, [date]
  );
  if (existing) {
    await db.runAsync(
      `UPDATE weights SET weight_kg = ?, source = ? WHERE date = ?`,
      [weight_kg, source, date]
    );
  } else {
    await db.runAsync(
      `INSERT INTO weights (id, date, weight_kg, source) VALUES (?, ?, ?, ?)`,
      [uuidv4(), date, weight_kg, source]
    );
  }

  // 先週比（直近7日以内の記録と比較）でEXP付与
  const sevenDaysAgo = new Date(date);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const prev = await db.getFirstAsync<{ weight_kg: number }>(
    `SELECT weight_kg FROM weights
     WHERE date >= ? AND date < ?
     ORDER BY date DESC LIMIT 1`,
    [sevenDaysAgoStr, date]
  );

  let expGained = 0;
  if (prev && weight_kg < prev.weight_kg) {
    await db.runAsync(
      `UPDATE user_profile SET total_exp = total_exp + ? WHERE id = 'me'`,
      [EXP_REWARDS.WEIGHT_DECREASED]
    );
    expGained = EXP_REWARDS.WEIGHT_DECREASED;
  }

  // 体重変化に応じてPFC目標・目標達成日を自動更新
  const profile = await db.getFirstAsync<{
    daily_calorie_target: number;
    target_weight_kg: number | null;
    weekly_loss_kg: number;
    onboarding_done: number;
  }>(`SELECT daily_calorie_target, target_weight_kg, weekly_loss_kg, onboarding_done FROM user_profile WHERE id = 'me'`);

  if (profile && profile.onboarding_done) {
    // タンパク質のみ体重連動で更新（脂質・炭水化物はユーザー設定を尊重）
    const newProtein = Math.round(weight_kg * 1.8);
    const newTargetDate = calcTargetDate(
      weight_kg,
      profile.target_weight_kg ?? 0,
      profile.weekly_loss_kg
    );

    await db.runAsync(
      `UPDATE user_profile SET
        current_weight_kg = ?,
        protein_target_g = ?,
        target_date = COALESCE(?, target_date)
       WHERE id = 'me'`,
      [weight_kg, newProtein, newTargetDate]
    );
  }

  return { expGained };
}

export async function getLatestWeight(): Promise<WeightEntry | null> {
  const db = getDb();
  return db.getFirstAsync<WeightEntry>(
    `SELECT * FROM weights ORDER BY date DESC LIMIT 1`
  );
}

export async function getWeightHistory(days = 30): Promise<WeightEntry[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return db.getAllAsync<WeightEntry>(
    `SELECT * FROM weights WHERE date >= ? ORDER BY date ASC`,
    [since.toISOString().split('T')[0]]
  );
}

export async function saveEvoltScan(
  date: string,
  weight_kg: number,
  body_fat_pct: number | null,
  muscle_mass_kg: number | null
): Promise<void> {
  const db = getDb();
  const id = uuidv4();

  // Evoltスキャンを保存
  await db.runAsync(
    `INSERT INTO evolt_scans (id, date, weight_kg, body_fat_pct, muscle_mass_kg) VALUES (?, ?, ?, ?, ?)`,
    [id, date, weight_kg, body_fat_pct, muscle_mass_kg]
  );

  // 体重もweightsテーブルに記録（UNIQUE制約対応済み）
  await saveWeight(date, weight_kg, 'evolt');
}

export async function getEvoltScans(): Promise<EvoltScan[]> {
  const db = getDb();
  return db.getAllAsync<EvoltScan>(
    `SELECT * FROM evolt_scans ORDER BY date DESC`
  );
}
