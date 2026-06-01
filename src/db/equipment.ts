import { getDb } from './schema';

export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'UR' | 'LR';
export type Slot = 'weapon' | 'head' | 'body' | 'legs';

export interface Equipment {
  id: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  atk_bonus: number;
  def_bonus: number;
  hp_bonus: number;
  exp_bonus_pct: number;
  description: string;
  icon_key: string;
}

export interface InventoryItem {
  inventory_id: string;
  equipment_id: string;
  obtained_at: string;
  is_new: number;
  equipment: Equipment;
}

export interface EquippedStats {
  weapon?: InventoryItem;
  head?: InventoryItem;
  body?: InventoryItem;
  legs?: InventoryItem;
  total_atk: number;
  total_def: number;
  total_hp: number;
  total_exp_pct: number;
}

// レアリティカラー定義
export const RARITY_COLORS: Record<Rarity, { border: string; bg: string; text: string; glow: string }> = {
  N:   { border: '#9E9E9E', bg: '#424242', text: '#EEEEEE', glow: '#9E9E9E' },
  R:   { border: '#4CAF50', bg: '#1B5E20', text: '#A5D6A7', glow: '#4CAF50' },
  SR:  { border: '#2196F3', bg: '#0D47A1', text: '#90CAF9', glow: '#2196F3' },
  SSR: { border: '#9C27B0', bg: '#4A148C', text: '#CE93D8', glow: '#9C27B0' },
  UR:  { border: '#FF6F00', bg: '#BF360C', text: '#FFCC02', glow: '#FF9800' },
  LR:  { border: '#F44336', bg: '#7F0000', text: '#FF8A80', glow: '#FF5252' },
};

// ドロップ確率テーブル
const DROP_TABLE: Array<{ rarity: Rarity; weight: number }> = [
  { rarity: 'N',   weight: 55 },
  { rarity: 'R',   weight: 27 },
  { rarity: 'SR',  weight: 13 },
  { rarity: 'SSR', weight:  4 },
  { rarity: 'UR',  weight:  0.8 },
  { rarity: 'LR',  weight:  0.2 },
];

export function rollRarity(pityCount = 0): Rarity {
  // ソフトピティ：40回以降SSR率上昇
  let ssrBonus = 0;
  if (pityCount >= 40) ssrBonus = (pityCount - 40) * 0.5;

  const table = DROP_TABLE.map(d => ({
    ...d,
    weight: d.rarity === 'SSR' ? d.weight + ssrBonus : d.weight,
  }));

  const total = table.reduce((s, d) => s + d.weight, 0);
  let rand = Math.random() * total;
  for (const { rarity, weight } of table) {
    rand -= weight;
    if (rand <= 0) return rarity;
  }
  return 'N';
}

export async function getEquipmentByRarity(rarity: Rarity, slot?: Slot): Promise<Equipment[]> {
  const db = getDb();
  if (slot) {
    return db.getAllAsync<Equipment>(
      `SELECT * FROM equipment WHERE rarity = ? AND slot = ?`, [rarity, slot]
    );
  }
  return db.getAllAsync<Equipment>(
    `SELECT * FROM equipment WHERE rarity = ?`, [rarity]
  );
}

export async function getInventory(): Promise<InventoryItem[]> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(`
    SELECT i.id as inventory_id, i.equipment_id, i.obtained_at, i.is_new,
           e.id, e.name, e.slot, e.rarity, e.atk_bonus, e.def_bonus,
           e.hp_bonus, e.exp_bonus_pct, e.description, e.icon_key
    FROM inventory i
    JOIN equipment e ON i.equipment_id = e.id
    ORDER BY i.obtained_at DESC
  `);
  return rows.map(r => ({
    inventory_id: r.inventory_id,
    equipment_id: r.equipment_id,
    obtained_at: r.obtained_at,
    is_new: r.is_new,
    equipment: {
      id: r.id, name: r.name, slot: r.slot, rarity: r.rarity,
      atk_bonus: r.atk_bonus, def_bonus: r.def_bonus,
      hp_bonus: r.hp_bonus, exp_bonus_pct: r.exp_bonus_pct,
      description: r.description, icon_key: r.icon_key,
    },
  }));
}

export async function getEquippedStats(): Promise<EquippedStats> {
  const db = getDb();
  const rows = await db.getAllAsync<any>(`
    SELECT eq.slot, i.id as inventory_id, i.equipment_id, i.obtained_at, i.is_new,
           e.id, e.name, e.slot as eslot, e.rarity, e.atk_bonus, e.def_bonus,
           e.hp_bonus, e.exp_bonus_pct, e.description, e.icon_key
    FROM equipped eq
    LEFT JOIN inventory i ON eq.inventory_id = i.id
    LEFT JOIN equipment e ON i.equipment_id = e.id
  `);

  const result: EquippedStats = {
    total_atk: 0, total_def: 0, total_hp: 0, total_exp_pct: 0,
  };

  for (const r of rows) {
    if (!r.id) continue;
    const item: InventoryItem = {
      inventory_id: r.inventory_id,
      equipment_id: r.equipment_id,
      obtained_at: r.obtained_at,
      is_new: r.is_new,
      equipment: {
        id: r.id, name: r.name, slot: r.eslot, rarity: r.rarity,
        atk_bonus: r.atk_bonus, def_bonus: r.def_bonus,
        hp_bonus: r.hp_bonus, exp_bonus_pct: r.exp_bonus_pct,
        description: r.description, icon_key: r.icon_key,
      },
    };
    result[r.slot as Slot] = item;
    result.total_atk += r.atk_bonus;
    result.total_def += r.def_bonus;
    result.total_hp += r.hp_bonus;
    result.total_exp_pct += r.exp_bonus_pct;
  }
  return result;
}

export async function equipItem(inventoryId: string, slot: Slot): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO equipped (slot, inventory_id) VALUES (?, ?)
     ON CONFLICT(slot) DO UPDATE SET inventory_id = excluded.inventory_id`,
    [slot, inventoryId]
  );
}

// ガチャのpity状態を取得
export async function getGachaState(): Promise<{ pity_count: number; total_pulls: number }> {
  const db = getDb();
  return await db.getFirstAsync<{ pity_count: number; total_pulls: number }>(
    `SELECT pity_count, total_pulls FROM gacha_state WHERE id = 'me'`
  ) ?? { pity_count: 0, total_pulls: 0 };
}

// EXPを消費してガチャを引く（1回50EXP）
// 戻り値: null = EXP不足
export async function tryDrop(): Promise<{ item: InventoryItem | null; expCost: number; newPity: number } | null> {
  const db = getDb();
  const EXP_COST = 50;

  const profile = await db.getFirstAsync<{ total_exp: number }>(
    `SELECT total_exp FROM user_profile WHERE id = 'me'`
  );
  if (!profile || profile.total_exp < EXP_COST) return null;

  // EXP消費
  await db.runAsync(`UPDATE user_profile SET total_exp = total_exp - ? WHERE id = 'me'`, [EXP_COST]);

  // pity更新
  const state = await getGachaState();
  const newPity = state.pity_count + 1;
  await db.runAsync(`UPDATE gacha_state SET pity_count = ?, total_pulls = total_pulls + 1 WHERE id = 'me'`, [newPity]);

  const rarity = rollRarity(newPity);
  const item = await dropEquipment(rarity);

  // SSR以上が出たらpityリセット
  if (rarity === 'SSR' || rarity === 'UR' || rarity === 'LR') {
    await db.runAsync(`UPDATE gacha_state SET pity_count = 0 WHERE id = 'me'`);
  }

  return { item, expCost: EXP_COST, newPity };
}

export async function dropEquipment(rarity: Rarity): Promise<InventoryItem | null> {
  const db = getDb();
  const slots: Slot[] = ['weapon', 'head', 'body', 'legs'];
  const slot = slots[Math.floor(Math.random() * slots.length)];

  const candidates = await getEquipmentByRarity(rarity, slot);
  if (candidates.length === 0) {
    // フォールバック: raritがない場合Nを使う
    const fallback = await getEquipmentByRarity('N', slot);
    if (fallback.length === 0) return null;
    candidates.push(...fallback);
  }

  const equipment = candidates[Math.floor(Math.random() * candidates.length)];
  const inventoryId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  await db.runAsync(
    `INSERT INTO inventory (id, equipment_id, is_new) VALUES (?, ?, 1)`,
    [inventoryId, equipment.id]
  );

  return {
    inventory_id: inventoryId,
    equipment_id: equipment.id,
    obtained_at: new Date().toISOString(),
    is_new: 1,
    equipment,
  };
}

export async function markInventoryItemSeen(inventoryId: string): Promise<void> {
  const db = getDb();
  await db.runAsync(`UPDATE inventory SET is_new = 0 WHERE id = ?`, [inventoryId]);
}
