import { getDb, EXP_REWARDS } from './schema';
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
  const id = uuidv4();

  await db.runAsync(
    `INSERT OR REPLACE INTO weights (id, date, weight_kg, source) VALUES (?, ?, ?, ?)`,
    [id, date, weight_kg, source]
  );

  // 先週比で体重減少していればEXP付与
  const lastWeek = new Date(date);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastWeekStr = lastWeek.toISOString().split('T')[0];

  const prev = await db.getFirstAsync<{ weight_kg: number }>(
    `SELECT weight_kg FROM weights WHERE date <= ? ORDER BY date DESC LIMIT 1`,
    [lastWeekStr]
  );

  let expGained = 0;
  if (prev && weight_kg < prev.weight_kg) {
    await db.runAsync(
      `UPDATE user_profile SET total_exp = total_exp + ? WHERE id = 'me'`,
      [EXP_REWARDS.WEIGHT_DECREASED]
    );
    expGained = EXP_REWARDS.WEIGHT_DECREASED;
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

  await db.runAsync(
    `INSERT INTO evolt_scans (id, date, weight_kg, body_fat_pct, muscle_mass_kg) VALUES (?, ?, ?, ?, ?)`,
    [id, date, weight_kg, body_fat_pct, muscle_mass_kg]
  );

  // 体重もweightsテーブルに記録
  await saveWeight(date, weight_kg, 'evolt');
}

export async function getEvoltScans(): Promise<EvoltScan[]> {
  const db = getDb();
  return db.getAllAsync<EvoltScan>(
    `SELECT * FROM evolt_scans ORDER BY date DESC`
  );
}
