import { getDb, levelFromTotalExp, expInCurrentLevel, expForNextLevel, getTitle } from './schema';

export interface UserProfile {
  id: string;
  display_name: string;
  target_weight_kg: number | null;
  target_date: string | null;
  daily_calorie_target: number;
  current_level: number;
  total_exp: number;
}

export interface ProfileWithRpg extends UserProfile {
  level: number;
  title: string;
  exp_in_level: number;
  exp_for_next: number;
  exp_progress_pct: number;
}

export async function getProfile(): Promise<ProfileWithRpg | null> {
  const db = getDb();
  const row = await db.getFirstAsync<UserProfile>(
    `SELECT * FROM user_profile WHERE id = 'me'`
  );
  if (!row) return null;

  const level = levelFromTotalExp(row.total_exp);
  const expInLevel = expInCurrentLevel(row.total_exp);
  const expForNext = expForNextLevel(level);

  return {
    ...row,
    level,
    title: getTitle(level),
    exp_in_level: expInLevel,
    exp_for_next: expForNext,
    exp_progress_pct: Math.round((expInLevel / expForNext) * 100),
  };
}

export async function updateProfile(updates: Partial<Omit<UserProfile, 'id' | 'total_exp' | 'current_level'>>): Promise<void> {
  const db = getDb();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  await db.runAsync(
    `UPDATE user_profile SET ${fields} WHERE id = 'me'`,
    values
  );
}

export async function addExp(amount: number): Promise<{ newLevel: number; leveledUp: boolean }> {
  const db = getDb();
  const before = await getProfile();
  await db.runAsync(
    `UPDATE user_profile SET total_exp = total_exp + ? WHERE id = 'me'`,
    [amount]
  );
  const after = await getProfile();
  return {
    newLevel: after?.level ?? 1,
    leveledUp: (after?.level ?? 1) > (before?.level ?? 1),
  };
}
