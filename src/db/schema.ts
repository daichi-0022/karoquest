import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('karoquest.db');
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = getDb();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS user_profile (
      id TEXT PRIMARY KEY DEFAULT 'me',
      display_name TEXT NOT NULL DEFAULT '冒険者',
      target_weight_kg REAL,
      target_date TEXT,
      daily_calorie_target INTEGER DEFAULT 1800,
      current_level INTEGER DEFAULT 1,
      total_exp INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
      photo_uri TEXT,
      calories INTEGER NOT NULL DEFAULT 0,
      protein_g REAL NOT NULL DEFAULT 0,
      fat_g REAL NOT NULL DEFAULT 0,
      carbs_g REAL NOT NULL DEFAULT 0,
      confidence TEXT CHECK(confidence IN ('high','medium','low')),
      dish_name TEXT,
      is_complex_dish INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weights (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      weight_kg REAL NOT NULL,
      source TEXT DEFAULT 'manual' CHECK(source IN ('manual','healthkit','evolt')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS evolt_scans (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      body_fat_pct REAL,
      muscle_mass_kg REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_quests (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      quest_type TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      exp_reward INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS story_progress (
      id TEXT PRIMARY KEY DEFAULT 'me',
      current_chapter INTEGER DEFAULT 0,
      completed_chapters TEXT DEFAULT '[]',
      last_story_shown TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
    CREATE INDEX IF NOT EXISTS idx_weights_date ON weights(date);
    CREATE INDEX IF NOT EXISTS idx_quests_date ON daily_quests(date);
  `);

  // デフォルトプロフィール挿入
  await database.runAsync(`INSERT OR IGNORE INTO user_profile (id) VALUES ('me')`);
  await database.runAsync(`INSERT OR IGNORE INTO story_progress (id) VALUES ('me')`)
}

// EXP計算
export const EXP_REWARDS = {
  MEAL_LOGGED: 10,
  DAILY_GOAL_MET: 50,
  STREAK_7_DAYS: 100,
  WEIGHT_DECREASED: 80,
  QUEST_BREAKFAST: 20,
  QUEST_THREE_MEALS: 50,
  QUEST_CALORIE_GOAL: 80,
  QUEST_PROTEIN: 40,
  QUEST_WEIGHT: 30,
  QUEST_ALL_COMPLETE: 200,
} as const;

// レベルアップに必要なEXP（レベル×200）
export function expForNextLevel(level: number): number {
  return level * 200;
}

export function levelFromTotalExp(totalExp: number): number {
  let level = 1;
  let exp = totalExp;
  while (exp >= expForNextLevel(level)) {
    exp -= expForNextLevel(level);
    level++;
  }
  return level;
}

export function expInCurrentLevel(totalExp: number): number {
  let level = 1;
  let exp = totalExp;
  while (exp >= expForNextLevel(level)) {
    exp -= expForNextLevel(level);
    level++;
  }
  return exp;
}

// 称号（15段階）
const TITLES: Record<number, string> = {
  1:  '見習い冒険者',
  3:  'カロリーの使い手',
  5:  '食事管理の戦士',
  8:  'タンパク質の騎士',
  10: 'カロリースレイヤー',
  13: '節制の魔法使い',
  15: '体重減少の賢者',
  18: '代謝の錬金術師',
  20: 'ダイエット勇者',
  25: '健康の守護者',
  30: '伝説の勇者',
  35: '栄養の覇者',
  40: '不滅の勇者',
  45: 'カロリーの神域',
  50: 'カロリーの神',
};

export function getTitle(level: number): string {
  const keys = Object.keys(TITLES).map(Number).sort((a, b) => b - a);
  for (const key of keys) {
    if (level >= key) return TITLES[key];
  }
  return '見習い冒険者';
}
