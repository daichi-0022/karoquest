import { getDb } from './schema';
import { addExp } from './profile';

// 週次ログインボーナス定義（研究: 週7日サイクルが最も効果的）
export const LOGIN_REWARDS = [
  { day: 1, label: '1日目',  icon: '✨', exp: 50,  special: null },
  { day: 2, label: '2日目',  icon: '💎', exp: 80,  special: null },
  { day: 3, label: '3日目',  icon: '⚡', exp: 100, special: null },
  { day: 4, label: '4日目',  icon: '🎯', exp: 120, special: null },
  { day: 5, label: '5日目',  icon: '🔥', exp: 150, special: null },
  { day: 6, label: '6日目',  icon: '💫', exp: 200, special: null },
  { day: 7, label: '7日目',  icon: '👑', exp: 300, special: 'drop' }, // ガチャ1回無料
];

export interface LoginBonusState {
  streak: number;
  totalDays: number;
  todayClaimed: boolean;
  weekDay: number;       // 1-7 (週サイクル内の位置)
  rewards: typeof LOGIN_REWARDS;
}

export async function checkLoginBonus(): Promise<{
  state: LoginBonusState;
  claimed: boolean;
  expGained: number;
  freeGacha: boolean;
}> {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const row = await db.getFirstAsync<{
    last_login_date: string | null;
    streak_count: number;
    total_login_days: number;
  }>(`SELECT * FROM login_bonus WHERE id = 'me'`);

  const last = row?.last_login_date;
  const streak = row?.streak_count ?? 0;
  const total = row?.total_login_days ?? 0;

  // 今日既にクレーム済み
  if (last === today) {
    const weekDay = ((streak - 1) % 7) + 1;
    return {
      state: { streak, totalDays: total, todayClaimed: true, weekDay, rewards: LOGIN_REWARDS },
      claimed: false, expGained: 0, freeGacha: false,
    };
  }

  // 昨日ログインしたかチェック（ストリーク継続 or リセット）
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const newStreak = (last === yesterdayStr) ? streak + 1 : 1;
  const newTotal = total + 1;
  const weekDay = ((newStreak - 1) % 7) + 1;
  const reward = LOGIN_REWARDS[weekDay - 1];
  const freeGacha = reward.special === 'drop';

  // EXP付与
  await addExp(reward.exp);

  // ガチャ無料チケット付与（gachaStateにpityをリセットはしない、別途使用）
  if (freeGacha) {
    await db.runAsync(
      `UPDATE gacha_state SET pity_count = pity_count - 1 WHERE id = 'me' AND pity_count > 0`
    );
  }

  // ログインボーナス状態を更新
  await db.runAsync(
    `UPDATE login_bonus SET last_login_date = ?, streak_count = ?, total_login_days = ? WHERE id = 'me'`,
    [today, newStreak, newTotal]
  );

  return {
    state: { streak: newStreak, totalDays: newTotal, todayClaimed: false, weekDay, rewards: LOGIN_REWARDS },
    claimed: true,
    expGained: reward.exp,
    freeGacha,
  };
}
