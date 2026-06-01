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
      gender TEXT CHECK(gender IN ('male','female')) DEFAULT 'male',
      age INTEGER DEFAULT 25,
      height_cm REAL DEFAULT 170,
      current_weight_kg REAL DEFAULT 70,
      target_weight_kg REAL,
      target_body_fat_pct REAL,
      target_date TEXT,
      weekly_loss_kg REAL DEFAULT 0.5,
      activity_level TEXT DEFAULT 'light' CHECK(activity_level IN ('sedentary','light','moderate','active','very_active')),
      daily_calorie_target INTEGER DEFAULT 1800,
      protein_target_g REAL DEFAULT 100,
      fat_target_g REAL DEFAULT 60,
      carbs_target_g REAL DEFAULT 200,
      onboarding_done INTEGER DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slot TEXT NOT NULL CHECK(slot IN ('weapon','head','body','legs')),
      rarity TEXT NOT NULL CHECK(rarity IN ('N','R','SR','SSR','UR','LR')),
      atk_bonus INTEGER DEFAULT 0,
      def_bonus INTEGER DEFAULT 0,
      hp_bonus INTEGER DEFAULT 0,
      exp_bonus_pct INTEGER DEFAULT 0,
      description TEXT,
      icon_key TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL REFERENCES equipment(id),
      obtained_at TEXT DEFAULT (datetime('now')),
      is_new INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS equipped (
      slot TEXT PRIMARY KEY CHECK(slot IN ('weapon','head','body','legs')),
      inventory_id TEXT REFERENCES inventory(id)
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
  await database.runAsync(`INSERT OR IGNORE INTO story_progress (id) VALUES ('me')`);

  // 装備マスターデータ初期挿入
  const equipmentData = [
    // 武器
    ['weapon_wood_sword',    '木の剣',       'weapon','N',  5,  0,  0,  0, '初めての冒険に持つ武器','sword_wood'],
    ['weapon_iron_sword',    '鉄の剣',       'weapon','R', 15,  0,  0,  0, '鍛えられた鉄の剣','sword_iron'],
    ['weapon_magic_staff',   '魔法の杖',     'weapon','SR', 0,  0,  0, 10, 'EXP獲得量が上昇する魔法の杖','staff_magic'],
    ['weapon_gold_sword',    '黄金の剣',     'weapon','SSR',35,  5,  0,  15, '黄金に輝く伝説の剣','sword_gold'],
    ['weapon_legend_blade',  '伝説の聖剣',   'weapon','UR', 60, 10,  0,  25, '勇者のみが握れる聖剣','blade_legend'],
    // 頭
    ['head_iron_helm',       '鉄の兜',       'head',  'N',  0, 10,  50,  0, 'HPを高める鉄兜','helm_iron'],
    ['head_magic_hat',       '魔法使いの帽子','head',  'R',  5,  5, 100,  5, '魔力が込められた帽子','hat_magic'],
    ['head_crown_silver',    '銀の王冠',     'head',  'SR', 10, 10, 200, 10, 'EXPを増加させる銀冠','crown_silver'],
    ['head_crown_gold',      '黄金の王冠',   'head',  'SSR',20, 20, 400, 20, '輝く黄金の王冠','crown_gold'],
    ['head_halo',            '勇者の光輪',   'head',  'UR', 30, 30, 800, 30, '伝説の勇者だけが持てる光輪','halo'],
    // 上着
    ['body_cloth',           '布の服',       'body',  'N',  0, 10, 100,  0, 'シンプルな布の服','cloth_body'],
    ['body_leather',         '革の鎧',       'body',  'R', 10, 20, 200,  0, '丈夫な革の鎧','armor_leather'],
    ['body_iron_armor',      '鉄の鎧',       'body',  'SR',15, 35, 400,  5, '堅固な鉄の鎧','armor_iron'],
    ['body_gold_armor',      '黄金の鎧',     'body',  'SSR',25,55, 700, 15, '黄金を纏う鎧','armor_gold'],
    ['body_hero_robe',       '勇者のローブ', 'body',  'UR', 40, 80,1200, 25, '全ステータスを大幅強化','robe_hero'],
    // 脚
    ['legs_cloth_pants',     '布のズボン',   'legs',  'N',  0,  8,  80,  0, 'シンプルな布のズボン','pants_cloth'],
    ['legs_leather_pants',   '革のズボン',   'legs',  'R',  8, 15, 150,  0, '機動性の高い革ズボン','pants_leather'],
    ['legs_iron_leggings',   '鉄のレギンス', 'legs',  'SR',12, 28, 300,  5, '重装の鉄レギンス','leggings_iron'],
    ['legs_gold_leggings',   '黄金のレギンス','legs', 'SSR',20,45, 600, 12, '黄金に輝くレギンス','leggings_gold'],
    ['legs_hero_boots',      '勇者のブーツ', 'legs',  'UR', 35,70,1000, 22, '伝説の勇者のブーツ','boots_hero'],
  ];
  for (const [id,name,slot,rarity,atk,def,hp,exp_pct,desc,icon] of equipmentData) {
    await database.runAsync(
      `INSERT OR IGNORE INTO equipment (id,name,slot,rarity,atk_bonus,def_bonus,hp_bonus,exp_bonus_pct,description,icon_key) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id,name,slot,rarity,atk,def,hp,exp_pct,desc,icon]
    );
  }
  // 初期装備（木の剣・布の服）をインベントリに追加
  await database.runAsync(`INSERT OR IGNORE INTO inventory (id,equipment_id,is_new) VALUES ('init_weapon','weapon_wood_sword',0)`);
  await database.runAsync(`INSERT OR IGNORE INTO inventory (id,equipment_id,is_new) VALUES ('init_body','body_cloth',0)`);
  await database.runAsync(`INSERT OR IGNORE INTO inventory (id,equipment_id,is_new) VALUES ('init_legs','legs_cloth_pants',0)`);
  await database.runAsync(`INSERT OR IGNORE INTO equipped (slot,inventory_id) VALUES ('weapon','init_weapon') ON CONFLICT(slot) DO NOTHING`);
  await database.runAsync(`INSERT OR IGNORE INTO equipped (slot,inventory_id) VALUES ('body','init_body') ON CONFLICT(slot) DO NOTHING`);
  await database.runAsync(`INSERT OR IGNORE INTO equipped (slot,inventory_id) VALUES ('legs','legs_cloth_pants') ON CONFLICT(slot) DO NOTHING`);
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

// レベルアップに必要なEXP
// 設計: Lv1→2=300, Lv5→6=600, Lv10→11=1200, Lv20→21=2800, Lv30→31=5100
// 毎日全クエスト480EXP達成時: Lv1→5は約4日、Lv10→15は約10日、Lv20→25は約20日
export function expForNextLevel(level: number): number {
  return Math.floor(100 + level * 50 + level * level * 8);
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
