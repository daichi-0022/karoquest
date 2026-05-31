import { getDb, EXP_REWARDS } from './schema';
import { addExp } from './profile';

export type QuestType =
  | 'breakfast'
  | 'three_meals'
  | 'calorie_goal'
  | 'protein'
  | 'weight'
  | 'all_complete';

export interface Quest {
  id: string;
  date: string;
  quest_type: QuestType;
  completed: boolean;
  exp_reward: number;
  label: string;
  description: string;
  icon: string;
}

const QUEST_DEFS: Record<QuestType, { label: string; description: string; icon: string; exp: number }> = {
  breakfast:    { label: '朝食を記録する',        description: '朝食をログしよう',               icon: '🌅', exp: EXP_REWARDS.QUEST_BREAKFAST },
  three_meals:  { label: '3食コンプリート',        description: '朝・昼・夜すべて記録しよう',      icon: '🍽️', exp: EXP_REWARDS.QUEST_THREE_MEALS },
  calorie_goal: { label: 'カロリー目標達成',       description: '目標の80〜105%に収めよう',       icon: '🎯', exp: EXP_REWARDS.QUEST_CALORIE_GOAL },
  protein:      { label: 'タンパク質50g以上',      description: 'タンパク質を50g以上摂ろう',      icon: '💪', exp: EXP_REWARDS.QUEST_PROTEIN },
  weight:       { label: '体重を記録する',         description: '今日の体重を記録しよう',          icon: '⚖️', exp: EXP_REWARDS.QUEST_WEIGHT },
  all_complete: { label: '今日の冒険完了',         description: '全クエストをクリアしよう',        icon: '👑', exp: EXP_REWARDS.QUEST_ALL_COMPLETE },
};

export async function getDailyQuests(date: string): Promise<Quest[]> {
  const db = getDb();
  const rows = await db.getAllAsync<{ id: string; date: string; quest_type: string; completed: number; exp_reward: number }>(
    `SELECT * FROM daily_quests WHERE date = ?`, [date]
  );

  if (rows.length === 0) {
    await initDailyQuests(date);
    return getDailyQuests(date);
  }

  return rows.map(row => {
    const def = QUEST_DEFS[row.quest_type as QuestType];
    return {
      id: row.id,
      date: row.date,
      quest_type: row.quest_type as QuestType,
      completed: row.completed === 1,
      exp_reward: row.exp_reward,
      label: def.label,
      description: def.description,
      icon: def.icon,
    };
  });
}

async function initDailyQuests(date: string): Promise<void> {
  const db = getDb();
  const types: QuestType[] = ['breakfast', 'three_meals', 'calorie_goal', 'protein', 'weight', 'all_complete'];
  for (const type of types) {
    const def = QUEST_DEFS[type];
    await db.runAsync(
      `INSERT OR IGNORE INTO daily_quests (id, date, quest_type, exp_reward) VALUES (?, ?, ?, ?)`,
      [`${date}_${type}`, date, type, def.exp]
    );
  }
}

export async function completeQuest(date: string, questType: QuestType): Promise<number> {
  const db = getDb();
  const existing = await db.getFirstAsync<{ completed: number }>(
    `SELECT completed FROM daily_quests WHERE date = ? AND quest_type = ?`,
    [date, questType]
  );
  if (!existing || existing.completed === 1) return 0;

  const def = QUEST_DEFS[questType];
  await db.runAsync(
    `UPDATE daily_quests SET completed = 1, completed_at = datetime('now') WHERE date = ? AND quest_type = ?`,
    [date, questType]
  );
  await addExp(def.exp);

  // 全クエスト完了チェック（all_complete以外）
  if (questType !== 'all_complete') {
    const incomplete = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM daily_quests WHERE date = ? AND quest_type != 'all_complete' AND completed = 0`,
      [date]
    );
    if (incomplete?.cnt === 0) {
      await completeQuest(date, 'all_complete');
    }
  }

  return def.exp;
}

export async function checkAndUpdateQuests(
  date: string,
  params: {
    meals: { meal_type: string }[];
    totalCalories: number;
    calorieTarget: number;
    totalProtein: number;
    hasWeight: boolean;
  }
): Promise<number> {
  let totalExp = 0;

  const hasBreakfast = params.meals.some(m => m.meal_type === 'breakfast');
  const mealTypes = new Set(params.meals.map(m => m.meal_type));
  const hasThreeMeals = mealTypes.has('breakfast') && mealTypes.has('lunch') && mealTypes.has('dinner');
  const calorieRatio = params.calorieTarget > 0 ? params.totalCalories / params.calorieTarget : 0;
  const calorieGoalMet = calorieRatio >= 0.8 && calorieRatio <= 1.05;

  if (hasBreakfast)   totalExp += await completeQuest(date, 'breakfast');
  if (hasThreeMeals)  totalExp += await completeQuest(date, 'three_meals');
  if (calorieGoalMet) totalExp += await completeQuest(date, 'calorie_goal');
  if (params.totalProtein >= 50) totalExp += await completeQuest(date, 'protein');
  if (params.hasWeight) totalExp += await completeQuest(date, 'weight');

  return totalExp;
}
