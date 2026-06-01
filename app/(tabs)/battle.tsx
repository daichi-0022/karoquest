import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Animated, Modal, StatusBar, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getProfile, type ProfileWithRpg } from '@/src/db/profile';
import { getDailySummary } from '@/src/db/meals';
import { getDb } from '@/src/db/schema';
import { shareBossDefeat } from '@/src/share';
import * as StoreReview from 'expo-store-review';

const TODAY = new Date().toISOString().split('T')[0];

const BOSSES = [
  {
    id: 1,
    name: 'ジャンクロード',
    title: '第1章ボス',
    emoji: '🍟',
    desc: 'コンビニスイーツを操る甘味の魔物。\n「今日くらいいいじゃん」が口癖。',
    weakness: '3食の記録を毎日続けること',
    chapter: '覚醒の章',
    borderColor: '#f59e0b',
    reward: '称号「ジャンクに勝ちし者」+500 EXP',
    active: true,
  },
  {
    id: 2,
    name: '夜食魔スナッカー',
    title: '第2章ボス',
    emoji: '🌙',
    desc: '深夜のコンビニに潜む闇の魔物。\n「誰も見てないよ？」と囁いてくる。',
    weakness: '21時以降の記録なし7日間',
    chapter: '仲間の章',
    borderColor: '#818cf8',
    reward: '称号「深夜の剛の者」+800 EXP',
    active: false,
  },
  {
    id: 3,
    name: '停滞の魔将ホメオ',
    title: '第3章ボス（最重要）',
    emoji: '🌫️',
    desc: '体重が動かなくなる停滞期の守護者。\n「お前は何も悪くない。身体が正常な証拠だ」',
    weakness: '停滞を受け入れ、記録を続けること',
    chapter: '試練の章',
    borderColor: '#6b7280',
    reward: '称号「停滞を越えし者」★最レア +1500 EXP',
    active: false,
  },
];

const STORY_MESSAGES = [
  { speaker: 'ヘルシア', emoji: '💫', text: '目覚めよ、勇者よ。わたしはヘルシア。\nあなたに栄養の力が宿っています。' },
  { speaker: 'ヘルシア', emoji: '💫', text: '大食いの魔王グルトンが世界に\n「食べ放題の呪い」をかけました。' },
  { speaker: 'ヘルシア', emoji: '💫', text: '食事を記録する力で呪いを解いてください。\n今日の記録が、世界を救う一歩になります。' },
  { speaker: 'タンパロウ', emoji: '💪', text: 'よお勇者！俺はタンパロウ。\n昔は100kg超えてた男だ。一緒に行こうぜ。' },
  { speaker: 'タンパロウ', emoji: '💪', text: 'まずはジャンクロードをぶっ倒そう。\n記録を続けることが、奴への一番の攻撃だ！' },
];

function getWeekDays(): string[] {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

const WEEK_DAYS = getWeekDays();
const DAY_LABELS = ['月', '火', '水', '木', '金', '土', '日'];

export default function BattleScreen() {
  const [profile, setProfile] = useState<ProfileWithRpg | null>(null);
  const [recordedDays, setRecordedDays] = useState<Set<string>>(new Set());
  const [selectedBoss, setSelectedBoss] = useState<typeof BOSSES[0] | null>(null);
  const [showStory, setShowStory] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [chapter, setChapter] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const load = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
    const recorded = new Set<string>();
    for (const day of WEEK_DAYS) {
      const s = await getDailySummary(day);
      if (s && s.total_calories > 0) recorded.add(day);
    }
    setRecordedDays(recorded);
    // ストーリー進捗を取得
    const db = getDb();
    const sp = await db.getFirstAsync<{ current_chapter: number }>(
      `SELECT current_chapter FROM story_progress WHERE id = 'me'`
    );
    setChapter(sp?.current_chapter ?? 0);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ストーリー進捗でボスを決定
  const currentBossIndex = Math.min(chapter, BOSSES.length - 1);
  const currentBoss = BOSSES[currentBossIndex];
  const streak = recordedDays.size;
  const bossHp = Math.max(0, 100 - streak * 14);

  // ボス撃破判定（HP0になったら次のchapterへ）
  const handleBossDefeat = useCallback(async () => {
    if (bossHp > 0) return;
    Alert.alert(
      `⚔️ ${currentBoss.name} 撃破！`,
      `${currentBoss.reward}\n\n次の章が解放されました！`,
      [{
        text: 'シェアする📣', onPress: () => shareBossDefeat(currentBoss.name, currentBossIndex + 1),
        },
        {
          text: '次の章へ', onPress: async () => {
          const db = getDb();
          await db.runAsync(
            `UPDATE story_progress SET current_chapter = current_chapter + 1 WHERE id = 'me'`
          );
          await load();
          // 第1章撃破時にレビュー依頼（最もポジティブな体験直後）
          if (currentBossIndex === 0) {
            const isAvailable = await StoreReview.isAvailableAsync();
            if (isAvailable) StoreReview.requestReview();
          }
        }
      }]
    );
  }, [bossHp, currentBoss, load]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={styles.scroll}>

        <View style={styles.header}>
          <Text style={styles.title}>⚔️ バトル</Text>
          <TouchableOpacity style={styles.storyBtn} onPress={() => { setStoryIndex(0); setShowStory(true); }}>
            <Text style={styles.storyBtnText}>📖 ストーリー</Text>
          </TouchableOpacity>
        </View>

        {/* 現在のボス */}
        <Animated.View style={[styles.bossCard, { transform: [{ translateX: shakeAnim }] }]}>
          <View style={styles.bossTopRow}>
            <View style={styles.bossChapterBadge}>
              <Text style={styles.bossChapterText}>{currentBoss.chapter}</Text>
            </View>
            <Text style={styles.bossTitleText}>{currentBoss.title}</Text>
          </View>

          <TouchableOpacity onPress={shake} activeOpacity={0.8}>
            <Animated.Text style={[styles.bossEmoji, { transform: [{ scale: pulseAnim }] }]}>
              {currentBoss.emoji}
            </Animated.Text>
          </TouchableOpacity>

          <Text style={styles.bossName}>{currentBoss.name}</Text>
          <Text style={styles.bossDesc}>{currentBoss.desc}</Text>

          <View style={styles.bossHpSection}>
            <View style={styles.bossHpRow}>
              <Text style={styles.bossHpLabel}>ボスHP</Text>
              <Text style={styles.bossHpNum}>{bossHp}/100</Text>
            </View>
            <View style={styles.bossHpBg}>
              <View style={[styles.bossHpFill, { width: `${bossHp}%` as any }]} />
            </View>
          </View>

          <View style={styles.weaknessBox}>
            <Text style={styles.weaknessLabel}>⚡ 弱点</Text>
            <Text style={styles.weaknessText}>{currentBoss.weakness}</Text>
          </View>

          {bossHp === 0 ? (
            <TouchableOpacity style={[styles.attackHint, { backgroundColor: '#10B981' }]} onPress={handleBossDefeat}>
              <Text style={[styles.attackHintText, { color: '#fff' }]}>🏆 ボスを撃破！タップして次の章へ！</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.attackHint}>
              <Text style={styles.attackHintText}>食事を記録するたびにボスにダメージ！</Text>
            </View>
          )}
        </Animated.View>

        {/* 今週の戦績 */}
        <View style={styles.weekCard}>
          <Text style={styles.weekTitle}>今週の戦績</Text>
          <View style={styles.weekRow}>
            {WEEK_DAYS.map((day, i) => {
              const recorded = recordedDays.has(day);
              const isToday = day === TODAY;
              return (
                <View key={day} style={[styles.dayCell, isToday && styles.dayCellToday]}>
                  <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{DAY_LABELS[i]}</Text>
                  <View style={[styles.dayDot, recorded ? styles.dayDotDone : styles.dayDotEmpty]}>
                    <Text style={styles.dayDotText}>{recorded ? '⚔' : '·'}</Text>
                  </View>
                  {recorded && <Text style={styles.dayDamage}>-14</Text>}
                </View>
              );
            })}
          </View>
          <Text style={styles.weekSummary}>
            {streak}日記録 → ボスに {streak * 14} ダメージ！
          </Text>
        </View>

        {/* 次のボス予告 */}
        <View style={styles.nextCard}>
          <Text style={styles.nextTitle}>⏳ 今後のボス</Text>
          {BOSSES.slice(1).map(boss => (
            <TouchableOpacity key={boss.id} style={styles.nextItem} onPress={() => setSelectedBoss(boss)}>
              <Text style={styles.nextEmoji}>{boss.emoji}</Text>
              <View style={styles.nextInfo}>
                <Text style={styles.nextName}>{boss.name}</Text>
                <Text style={styles.nextChapter}>{boss.chapter}</Text>
              </View>
              <Text style={styles.nextLock}>🔒</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 撃破報酬 */}
        <View style={styles.rewardCard}>
          <Text style={styles.rewardTitle}>🏆 撃破報酬</Text>
          <Text style={styles.rewardText}>{currentBoss.reward}</Text>
        </View>

      </ScrollView>

      {/* ストーリーモーダル */}
      <Modal visible={showStory} animationType="fade" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalSpeaker}>
              {STORY_MESSAGES[storyIndex].emoji}　{STORY_MESSAGES[storyIndex].speaker}
            </Text>
            <Text style={styles.modalText}>{STORY_MESSAGES[storyIndex].text}</Text>
            <View style={styles.modalBtns}>
              {storyIndex > 0 && (
                <TouchableOpacity style={styles.modalBtnSec} onPress={() => setStoryIndex(i => i - 1)}>
                  <Text style={styles.modalBtnSecText}>← 戻る</Text>
                </TouchableOpacity>
              )}
              {storyIndex < STORY_MESSAGES.length - 1 ? (
                <TouchableOpacity style={styles.modalBtnPri} onPress={() => setStoryIndex(i => i + 1)}>
                  <Text style={styles.modalBtnPriText}>次へ →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.modalBtnPri} onPress={() => setShowStory(false)}>
                  <Text style={styles.modalBtnPriText}>冒険を始める！</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.modalPager}>{storyIndex + 1} / {STORY_MESSAGES.length}</Text>
          </View>
        </View>
      </Modal>

      {/* ボス詳細モーダル */}
      <Modal visible={!!selectedBoss} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <Text style={styles.modalBossEmoji}>{selectedBoss?.emoji}</Text>
            <Text style={styles.modalBossName}>{selectedBoss?.name}</Text>
            <Text style={styles.modalBossChapter}>{selectedBoss?.chapter}</Text>
            <Text style={styles.modalText}>{selectedBoss?.desc}</Text>
            <View style={styles.weaknessBox}>
              <Text style={styles.weaknessLabel}>⚡ 弱点</Text>
              <Text style={styles.weaknessText}>{selectedBoss?.weakness}</Text>
            </View>
            <TouchableOpacity style={[styles.modalBtnPri, { marginTop: 20 }]} onPress={() => setSelectedBoss(null)}>
              <Text style={styles.modalBtnPriText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0D0D1A' },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#fff' },
  storyBtn: { backgroundColor: '#1a1a3e', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2d2d5e' },
  storyBtnText: { fontSize: 13, fontWeight: '700', color: '#a78bfa' },

  bossCard: { margin: 16, backgroundColor: '#12122A', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#f59e0b', alignItems: 'center' },
  bossTopRow: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'center' },
  bossChapterBadge: { backgroundColor: '#2a1a0a', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  bossChapterText: { fontSize: 11, color: '#f59e0b', fontWeight: '700' },
  bossTitleText: { fontSize: 11, color: '#555' },
  bossEmoji: { fontSize: 80, marginBottom: 8 },
  bossName: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8 },
  bossDesc: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  bossHpSection: { width: '100%', marginBottom: 14 },
  bossHpRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  bossHpLabel: { fontSize: 12, color: '#888', fontWeight: '700' },
  bossHpNum: { fontSize: 12, color: '#ef4444', fontWeight: '700' },
  bossHpBg: { height: 12, backgroundColor: '#1a1a3a', borderRadius: 6, overflow: 'hidden' },
  bossHpFill: { height: '100%', backgroundColor: '#ef4444', borderRadius: 6 },
  weaknessBox: { backgroundColor: '#1a1a0a', borderRadius: 10, padding: 12, width: '100%', marginBottom: 12 },
  weaknessLabel: { fontSize: 11, color: '#f59e0b', fontWeight: '800', marginBottom: 4 },
  weaknessText: { fontSize: 13, color: '#ccc' },
  attackHint: { backgroundColor: '#1a1a3a', borderRadius: 10, padding: 10, width: '100%', alignItems: 'center' },
  attackHintText: { fontSize: 12, color: '#7c3aed', fontWeight: '700' },

  weekCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#12122A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e1e4e' },
  weekTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 14 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { alignItems: 'center', flex: 1 },
  dayCellToday: {},
  dayLabel: { fontSize: 11, color: '#555', marginBottom: 6 },
  dayLabelToday: { color: '#7c3aed', fontWeight: '800' },
  dayDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  dayDotDone: { backgroundColor: '#7c3aed' },
  dayDotEmpty: { backgroundColor: '#1a1a3a' },
  dayDotText: { fontSize: 14 },
  dayDamage: { fontSize: 10, color: '#ef4444', fontWeight: '700' },
  weekSummary: { marginTop: 14, fontSize: 13, color: '#a78bfa', fontWeight: '700', textAlign: 'center' },

  nextCard: { marginHorizontal: 16, marginBottom: 14, backgroundColor: '#12122A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1e1e4e' },
  nextTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 12 },
  nextItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a1a3a', gap: 12 },
  nextEmoji: { fontSize: 28 },
  nextInfo: { flex: 1 },
  nextName: { fontSize: 14, fontWeight: '700', color: '#555' },
  nextChapter: { fontSize: 11, color: '#333', marginTop: 2 },
  nextLock: { fontSize: 18 },

  rewardCard: { marginHorizontal: 16, marginBottom: 32, backgroundColor: '#1a2a1a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#10b981' },
  rewardTitle: { fontSize: 14, fontWeight: '800', color: '#10b981', marginBottom: 8 },
  rewardText: { fontSize: 13, color: '#ccc' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#12122A', borderRadius: 20, padding: 24, width: '100%', borderWidth: 1, borderColor: '#2d2d5e' },
  modalSpeaker: { fontSize: 16, fontWeight: '800', color: '#a78bfa', marginBottom: 14 },
  modalText: { fontSize: 15, color: '#ccc', lineHeight: 26, marginBottom: 8 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  modalBtnPri: { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  modalBtnPriText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  modalBtnSec: { backgroundColor: '#1a1a3a', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  modalBtnSecText: { fontSize: 14, fontWeight: '700', color: '#666' },
  modalPager: { fontSize: 11, color: '#444', textAlign: 'center', marginTop: 12 },
  modalBossEmoji: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  modalBossName: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  modalBossChapter: { fontSize: 12, color: '#f59e0b', textAlign: 'center', marginBottom: 12 },
});
