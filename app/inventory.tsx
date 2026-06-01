import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Modal, Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  getInventory, getEquippedStats, equipItem, markInventoryItemSeen,
  tryDrop, getGachaState,
  type InventoryItem, type EquippedStats, type Slot, RARITY_COLORS,
} from '@/src/db/equipment';
import EquipmentIcon from '@/src/components/EquipmentIcon';
import CGHero from '@/src/components/CGHero';
import { getProfile, type ProfileWithRpg } from '@/src/db/profile';

const SLOT_LABELS: Record<Slot, string> = {
  weapon: '⚔️ 武器',
  head:   '🪖 頭',
  body:   '🛡️ 上着',
  legs:   '👢 脚',
};

export default function InventoryScreen() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [equipped, setEquipped]   = useState<EquippedStats | null>(null);
  const [profile, setProfile]     = useState<ProfileWithRpg | null>(null);
  const [selected, setSelected]   = useState<InventoryItem | null>(null);
  const [dropping, setDropping]   = useState(false);
  const [dropResult, setDropResult] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<Slot | 'all'>('all');
  const [pityCount, setPityCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const [inv, eq, p, gs] = await Promise.all([
        getInventory().catch(() => []),
        getEquippedStats().catch(() => null),
        getProfile().catch(() => null),
        getGachaState().catch(() => ({ pity_count: 0, total_pulls: 0 })),
      ]);
      setInventory(inv);
      setEquipped(eq);
      setProfile(p);
      setPityCount(gs?.pity_count ?? 0);
    } catch { /* ignore */ }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleEquip = async (item: InventoryItem) => {
    await equipItem(item.inventory_id, item.equipment.slot as Slot);
    await markInventoryItemSeen(item.inventory_id);
    setSelected(null);
    await load();
  };

  const handleDrop = async () => {
    setDropping(true);
    const result = await tryDrop();
    if (result === null) {
      Alert.alert('EXP不足', '装備ドロップには50 EXPが必要です。\n食事を記録してEXPを貯めよう！');
      setDropping(false);
      return;
    }
    setDropResult(result.item);
    setDropping(false);
    await load();
  };

  const filteredItems = activeTab === 'all'
    ? inventory
    : inventory.filter(i => i.equipment.slot === activeTab);

  const newCount = inventory.filter(i => i.is_new).length;

  return (
    <SafeAreaView style={styles.safe}>

      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎒 インベントリ</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll}>

        {/* キャラクター & 装備ステータス */}
        <View style={styles.statusCard}>
          <View style={styles.heroWrap}>
            <CGHero level={profile?.level ?? 1} size={120} animate equipped={equipped ?? undefined} />
          </View>
          <View style={styles.statsWrap}>
            <Text style={styles.statsTitle}>装備ステータス</Text>
            <StatRow icon="⚔️" label="ATK" value={`+${equipped?.total_atk ?? 0}`} color="#F59E0B" />
            <StatRow icon="🛡️" label="DEF" value={`+${equipped?.total_def ?? 0}`} color="#60A5FA" />
            <StatRow icon="❤️" label="HP"  value={`+${equipped?.total_hp ?? 0}`}  color="#F87171" />
            <StatRow icon="✨" label="EXP" value={`+${equipped?.total_exp_pct ?? 0}%`} color="#A78BFA" />
          </View>
        </View>

        {/* 現在の装備 */}
        <View style={styles.equippedCard}>
          <Text style={styles.sectionTitle}>装備中</Text>
          <View style={styles.equippedRow}>
            {(['weapon','head','body','legs'] as Slot[]).map(slot => {
              const item = equipped?.[slot];
              return (
                <TouchableOpacity
                  key={slot}
                  style={styles.equippedSlot}
                  onPress={() => item && setSelected(item)}
                >
                  {item ? (
                    <>
                      <EquipmentIcon
                        iconKey={item.equipment.icon_key}
                        rarity={item.equipment.rarity}
                        size={52}
                      />
                      <Text style={styles.slotLabel}>{SLOT_LABELS[slot].split(' ')[1]}</Text>
                    </>
                  ) : (
                    <>
                      <View style={styles.emptySlot}>
                        <Text style={styles.emptySlotText}>{SLOT_LABELS[slot]}</Text>
                      </View>
                      <Text style={styles.slotLabel}>{SLOT_LABELS[slot].split(' ')[1]}</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ガチャボタン */}
        <TouchableOpacity
          style={[styles.gachaBtn, dropping && styles.gachaBtnDisabled]}
          onPress={handleDrop}
          disabled={dropping}
        >
          <Text style={styles.gachaIcon}>🎲</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.gachaBtnText}>{dropping ? '開封中...' : '装備をゲット  -50 EXP'}</Text>
            <Text style={styles.gachaBtnSub}>
              食事記録でEXPを稼いで装備をドロップ！　pity: {pityCount}/60　{pityCount >= 40 ? '⚡SSR確率UP中！' : ''}
            </Text>
          </View>
          <View style={styles.expCostBadge}>
            <Text style={styles.expCostText}>50{'\n'}EXP</Text>
          </View>
        </TouchableOpacity>

        {/* フィルタータブ */}
        <View style={styles.tabs}>
          {(['all','weapon','head','body','legs'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'all' ? '全部' : SLOT_LABELS[tab].split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* アイテム一覧 */}
        <View style={styles.itemGrid}>
          {filteredItems.length === 0 ? (
            <Text style={styles.emptyText}>アイテムがありません{'\n'}食事を記録してEXPを稼ぎ、装備をドロップしよう！</Text>
          ) : (
            filteredItems.map(item => {
              const colors = RARITY_COLORS[item.equipment.rarity];
              const isEquipped = (
                equipped?.weapon?.inventory_id === item.inventory_id ||
                equipped?.head?.inventory_id   === item.inventory_id ||
                equipped?.body?.inventory_id   === item.inventory_id ||
                equipped?.legs?.inventory_id   === item.inventory_id
              );
              return (
                <TouchableOpacity
                  key={item.inventory_id}
                  style={[
                    styles.itemCell,
                    isEquipped && { borderColor: colors.border, borderWidth: 2 },
                  ]}
                  onPress={() => setSelected(item)}
                >
                  {item.is_new === 1 && <View style={styles.newBadge}><Text style={styles.newText}>NEW</Text></View>}
                  {isEquipped && <View style={styles.equippedBadge}><Text style={styles.equippedBadgeText}>装備中</Text></View>}
                  <EquipmentIcon
                    iconKey={item.equipment.icon_key}
                    rarity={item.equipment.rarity}
                    size={56}
                  />
                  <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>
                    {item.equipment.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>

      </ScrollView>

      {/* アイテム詳細モーダル */}
      <Modal visible={!!selected} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            {selected && (() => {
              const colors = RARITY_COLORS[selected.equipment.rarity];
              const isEquipped = (
                equipped?.weapon?.inventory_id === selected.inventory_id ||
                equipped?.head?.inventory_id   === selected.inventory_id ||
                equipped?.body?.inventory_id   === selected.inventory_id ||
                equipped?.legs?.inventory_id   === selected.inventory_id
              );
              return (
                <>
                  <View style={styles.modalHeader}>
                    <EquipmentIcon
                      iconKey={selected.equipment.icon_key}
                      rarity={selected.equipment.rarity}
                      size={72}
                    />
                    <View style={styles.modalInfo}>
                      <Text style={[styles.modalRarity, { color: colors.border }]}>
                        {selected.equipment.rarity}
                      </Text>
                      <Text style={styles.modalName}>{selected.equipment.name}</Text>
                      <Text style={styles.modalSlot}>{SLOT_LABELS[selected.equipment.slot as Slot]}</Text>
                    </View>
                  </View>
                  <Text style={styles.modalDesc}>{selected.equipment.description}</Text>
                  <View style={styles.modalStats}>
                    {selected.equipment.atk_bonus > 0 && <StatRow icon="⚔️" label="ATK" value={`+${selected.equipment.atk_bonus}`} color="#F59E0B" />}
                    {selected.equipment.def_bonus > 0 && <StatRow icon="🛡️" label="DEF" value={`+${selected.equipment.def_bonus}`} color="#60A5FA" />}
                    {selected.equipment.hp_bonus > 0  && <StatRow icon="❤️" label="HP"  value={`+${selected.equipment.hp_bonus}`}  color="#F87171" />}
                    {selected.equipment.exp_bonus_pct > 0 && <StatRow icon="✨" label="EXP" value={`+${selected.equipment.exp_bonus_pct}%`} color="#A78BFA" />}
                  </View>
                  <View style={styles.modalBtns}>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setSelected(null)}>
                      <Text style={styles.modalCloseText}>閉じる</Text>
                    </TouchableOpacity>
                    {!isEquipped && (
                      <TouchableOpacity
                        style={[styles.modalEquip, { backgroundColor: colors.border }]}
                        onPress={() => handleEquip(selected)}
                      >
                        <Text style={styles.modalEquipText}>装備する</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ドロップ結果モーダル */}
      <Modal visible={!!dropResult} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.dropBox}>
            {dropResult && (() => {
              const colors = RARITY_COLORS[dropResult.equipment.rarity];
              return (
                <>
                  <Text style={[styles.dropRarity, { color: colors.border }]}>
                    ✨ {dropResult.equipment.rarity} ✨
                  </Text>
                  <Text style={styles.dropTitle}>装備ドロップ！</Text>
                  <EquipmentIcon
                    iconKey={dropResult.equipment.icon_key}
                    rarity={dropResult.equipment.rarity}
                    size={88}
                  />
                  <Text style={[styles.dropName, { color: colors.text }]}>
                    {dropResult.equipment.name}
                  </Text>
                  <Text style={styles.dropSlot}>{SLOT_LABELS[dropResult.equipment.slot as Slot]}</Text>
                  <View style={styles.modalBtns}>
                    <TouchableOpacity style={styles.modalClose} onPress={() => setDropResult(null)}>
                      <Text style={styles.modalCloseText}>閉じる</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalEquip, { backgroundColor: colors.border }]}
                      onPress={async () => {
                        await handleEquip(dropResult);
                        setDropResult(null);
                      }}
                    >
                      <Text style={styles.modalEquipText}>装備する</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

function StatRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0A0A18' },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backBtn: { width: 60 },
  backText: { color: '#7C3AED', fontSize: 14, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '800', color: '#fff' },

  statusCard: { flexDirection: 'row', margin: 16, backgroundColor: '#12122A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e1e4e', gap: 12 },
  heroWrap: { alignItems: 'center', justifyContent: 'center' },
  statsWrap: { flex: 1, justifyContent: 'center', gap: 6 },
  statsTitle: { fontSize: 12, color: '#555', fontWeight: '700', marginBottom: 4 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statIcon: { fontSize: 12 },
  statLabel: { fontSize: 12, color: '#888', width: 32 },
  statValue: { fontSize: 13, fontWeight: '800' },

  equippedCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#12122A', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#1e1e4e' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 12 },
  equippedRow: { flexDirection: 'row', justifyContent: 'space-around' },
  equippedSlot: { alignItems: 'center', gap: 4 },
  emptySlot: { width: 52, height: 52, backgroundColor: '#1a1a3a', borderRadius: 8, borderWidth: 1, borderColor: '#2d2d5e', alignItems: 'center', justifyContent: 'center' },
  emptySlotText: { fontSize: 18 },
  slotLabel: { fontSize: 10, color: '#555' },

  gachaBtn: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#7C3AED', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  gachaBtnDisabled: { opacity: 0.5 },
  gachaIcon: { fontSize: 32 },
  gachaBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  gachaBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  expCostBadge: { backgroundColor: '#4C1D95', borderRadius: 10, padding: 8, alignItems: 'center', minWidth: 44 },
  expCostText: { fontSize: 11, fontWeight: '900', color: '#C4B5FD', textAlign: 'center' },

  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#12122A', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#7C3AED' },
  tabText: { fontSize: 12, color: '#555', fontWeight: '600' },
  tabTextActive: { color: '#fff' },

  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 32 },
  itemCell: { width: '22%', alignItems: 'center', gap: 4, position: 'relative', backgroundColor: '#12122A', borderRadius: 10, padding: 8, borderWidth: 1, borderColor: '#1e1e4e' },
  newBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: '#EF4444', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1, zIndex: 1 },
  newText: { fontSize: 8, color: '#fff', fontWeight: '800' },
  equippedBadge: { position: 'absolute', bottom: 22, left: 0, right: 0, alignItems: 'center', zIndex: 1 },
  equippedBadgeText: { fontSize: 8, color: '#10B981', fontWeight: '800' },
  itemName: { fontSize: 9, textAlign: 'center', fontWeight: '600' },
  emptyText: { color: '#444', fontSize: 13, textAlign: 'center', paddingVertical: 40, width: '100%', lineHeight: 22 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#12122A', borderRadius: 20, padding: 24, width: '100%', borderWidth: 1, borderColor: '#2d2d5e' },
  modalHeader: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 12 },
  modalInfo: { flex: 1 },
  modalRarity: { fontSize: 13, fontWeight: '900', marginBottom: 4 },
  modalName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  modalSlot: { fontSize: 12, color: '#555' },
  modalDesc: { fontSize: 13, color: '#888', marginBottom: 14, lineHeight: 20 },
  modalStats: { gap: 6, marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 10 },
  modalClose: { flex: 1, backgroundColor: '#1a1a3a', borderRadius: 12, padding: 14, alignItems: 'center' },
  modalCloseText: { fontSize: 14, fontWeight: '700', color: '#888' },
  modalEquip: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  modalEquipText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  dropBox: { backgroundColor: '#12122A', borderRadius: 20, padding: 28, width: '100%', borderWidth: 1, borderColor: '#2d2d5e', alignItems: 'center', gap: 12 },
  dropRarity: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  dropTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
  dropName: { fontSize: 18, fontWeight: '800' },
  dropSlot: { fontSize: 13, color: '#555' },
});
