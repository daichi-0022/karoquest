import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Alert, Linking,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { getProfile, updateProfile, type ProfileWithRpg } from '@/src/db/profile';
import { getDb } from '@/src/db/schema';
import Constants from 'expo-constants';
import * as StoreReview from 'expo-store-review';

export default function SettingsScreen() {
  const [profile, setProfile] = useState<ProfileWithRpg | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [calorieTarget, setCalorieTarget] = useState('');
  const [targetWeight, setTargetWeight] = useState('');

  const load = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
    if (p) {
      setDisplayName(p.display_name);
      setCalorieTarget(String(p.daily_calorie_target));
      setTargetWeight(p.target_weight_kg != null ? String(p.target_weight_kg) : '');
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSave = async () => {
    const cal = parseInt(calorieTarget, 10);
    if (isNaN(cal) || cal < 500 || cal > 5000) {
      Alert.alert('エラー', 'カロリー目標は500〜5000で入力してください');
      return;
    }
    const tw = targetWeight ? parseFloat(targetWeight) : null;
    if (tw !== null && (isNaN(tw) || tw < 30 || tw > 200)) {
      Alert.alert('エラー', '目標体重は30〜200kgで入力してください');
      return;
    }
    await updateProfile({
      display_name: displayName.trim() || '冒険者',
      daily_calorie_target: cal,
      target_weight_kg: tw,
    });
    setEditing(false);
    await load();
    Alert.alert('保存しました', 'プロフィールを更新しました');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>設定</Text>
        </View>

        {/* RPGプロフィール */}
        {profile && (
          <View style={styles.rpgCard}>
            <Text style={styles.charEmoji}>⚔️</Text>
            <View>
              <Text style={styles.levelText}>Lv.{profile.level} — {profile.title}</Text>
              <Text style={styles.expText}>総EXP: {profile.total_exp}</Text>
            </View>
          </View>
        )}

        {/* プロフィール編集 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>プロフィール</Text>
            {!editing && (
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={styles.editBtn}>編集</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>ユーザー名</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="冒険者"
                placeholderTextColor="#555"
                maxLength={20}
              />
            ) : (
              <Text style={styles.fieldValue}>{profile?.display_name ?? '---'}</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>1日カロリー目標</Text>
            {editing ? (
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputNum]}
                  value={calorieTarget}
                  onChangeText={setCalorieTarget}
                  keyboardType="numeric"
                  placeholder="1800"
                  placeholderTextColor="#555"
                />
                <Text style={styles.inputUnit}>kcal</Text>
              </View>
            ) : (
              <Text style={styles.fieldValue}>{profile?.daily_calorie_target ?? 1800} kcal</Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>目標体重</Text>
            {editing ? (
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.inputNum]}
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="decimal-pad"
                  placeholder="未設定"
                  placeholderTextColor="#555"
                />
                <Text style={styles.inputUnit}>kg</Text>
              </View>
            ) : (
              <Text style={styles.fieldValue}>
                {profile?.target_weight_kg != null ? `${profile.target_weight_kg} kg` : '未設定'}
              </Text>
            )}
          </View>

          {editing && (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); load(); }}>
                <Text style={styles.cancelBtnText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>保存する</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* データ連携 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>データ連携</Text>
          <View style={styles.integrationItem}>
            <View>
              <Text style={styles.integrationName}>Apple HealthKit</Text>
              <Text style={styles.integrationDesc}>体重データを自動取得</Text>
            </View>
            <View style={[styles.badge, styles.badgeSoon]}>
              <Text style={styles.badgeSoonText}>Week 2</Text>
            </View>
          </View>
          <View style={styles.integrationItem}>
            <View>
              <Text style={styles.integrationName}>Evolt 360 スキャン</Text>
              <Text style={styles.integrationDesc}>体組成データを手動入力</Text>
            </View>
            <View style={[styles.badge, styles.badgeActive]}>
              <Text style={styles.badgeActiveText}>利用可能</Text>
            </View>
          </View>
        </View>

        {/* サブスクリプション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>サブスクリプション</Text>
          <View style={styles.subCard}>
            <Text style={styles.subTitle}>カロクエ プレミアム</Text>
            <Text style={styles.subPrice}>¥680 / 月</Text>
            <Text style={styles.subDesc}>• AI食事解析 無制限{'\n'}• バトル機能{'\n'}• 詳細グラフ分析</Text>
            <TouchableOpacity style={styles.subBtn} onPress={() => router.push('/paywall' as any)}>
              <Text style={styles.subBtnText}>プレミアムを見る →</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.restoreBtn} onPress={() => router.push('/paywall' as any)}>
            <Text style={styles.restoreBtnText}>購入を復元する</Text>
          </TouchableOpacity>
        </View>

        {/* アプリ情報 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アプリ情報</Text>
          <InfoRow label="バージョン" value={`${Constants.expoConfig?.version ?? '1.0.0'}`} />
          <TouchableOpacity onPress={() => Linking.openURL('https://daichi-0022.github.io/karoquest/privacy.html')}>
            <InfoRow label="プライバシーポリシー" value="›" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://daichi-0022.github.io/karoquest/terms.html')}>
            <InfoRow label="利用規約" value="›" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:karoquest.app@gmail.com')}>
            <InfoRow label="お問い合わせ" value="karoquest.app@gmail.com" small />
          </TouchableOpacity>
        </View>

        {/* データ管理 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>データ管理</Text>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => Alert.alert(
              '⚠️ 全データを削除',
              'すべての記録・装備・進捗が削除されます。この操作は取り消せません。',
              [
                { text: 'キャンセル', style: 'cancel' },
                {
                  text: '削除する', style: 'destructive',
                  onPress: async () => {
                    const db = getDb();
                    await db.execAsync(`
                      DELETE FROM meals;
                      DELETE FROM weights;
                      DELETE FROM evolt_scans;
                      DELETE FROM daily_quests;
                      DELETE FROM inventory;
                      DELETE FROM equipped;
                      DELETE FROM gacha_state;
                      DELETE FROM story_progress;
                      UPDATE user_profile SET
                        total_exp=0, current_level=1, onboarding_done=0,
                        target_weight_kg=NULL, target_date=NULL
                      WHERE id='me';
                    `);
                    Alert.alert('削除完了', 'データを削除しました。', [
                      { text: 'OK', onPress: () => router.replace('/onboarding') }
                    ]);
                  }
                },
              ]
            )}
          >
            <Text style={styles.dangerBtnText}>🗑️ 全データを削除してリセット</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>カロクエ v{Constants.expoConfig?.version ?? '1.0.0'} — Made with ❤️ in Japan</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, small && styles.infoValueSmall]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  rpgCard: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2d2d4e', gap: 14 },
  charEmoji: { fontSize: 40 },
  levelText: { fontSize: 16, fontWeight: '700', color: '#7c3aed' },
  expText: { fontSize: 12, color: '#666', marginTop: 2 },
  section: { marginHorizontal: 16, marginBottom: 20, backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#888', marginBottom: 12 },
  editBtn: { fontSize: 14, color: '#7c3aed', fontWeight: '600' },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 12, color: '#666', marginBottom: 6 },
  fieldValue: { fontSize: 15, color: '#fff', fontWeight: '600' },
  input: { backgroundColor: '#2a2a2a', borderRadius: 10, padding: 12, color: '#fff', fontSize: 15, flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputNum: { flex: undefined, width: 120 },
  inputUnit: { color: '#888', fontSize: 14 },
  editActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#7c3aed', borderRadius: 12, padding: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  integrationItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  integrationName: { fontSize: 14, color: '#fff', fontWeight: '600' },
  integrationDesc: { fontSize: 12, color: '#666', marginTop: 2 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeSoon: { backgroundColor: '#2a2a2a' },
  badgeSoonText: { color: '#555', fontSize: 12, fontWeight: '600' },
  badgeActive: { backgroundColor: '#1a3a2a' },
  badgeActiveText: { color: '#34d399', fontSize: 12, fontWeight: '600' },
  subCard: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2d2d4e' },
  subTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subPrice: { fontSize: 22, fontWeight: '900', color: '#7c3aed', marginBottom: 10 },
  subDesc: { fontSize: 13, color: '#888', lineHeight: 22, marginBottom: 14 },
  subBtn: { backgroundColor: '#2d2d4e', borderRadius: 10, padding: 12, alignItems: 'center' },
  subBtnText: { color: '#555', fontSize: 14, fontWeight: '600' },
  restoreBtn: { alignItems: 'center', paddingVertical: 8 },
  restoreBtnText: { color: '#666', fontSize: 13 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2a2a2a' },
  infoLabel: { fontSize: 14, color: '#aaa' },
  infoValue: { fontSize: 14, color: '#666' },
  infoValueSmall: { fontSize: 11 },
  footer: { textAlign: 'center', color: '#333', fontSize: 11, paddingBottom: 40, paddingTop: 8 },
  dangerBtn: { backgroundColor: '#1a0a0a', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#7F1D1D', alignItems: 'center' },
  dangerBtnText: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
});
