import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';

export default function BattleScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>バトル</Text>
          <Text style={styles.sub}>友達とカロリー管理を競おう</Text>
        </View>

        {/* 今週のバトル (Coming Soon) */}
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>⚔️</Text>
          <Text style={styles.heroTitle}>バトル機能 準備中</Text>
          <Text style={styles.heroDesc}>
            友達を招待して、週間カロリー管理ポイントを競い合おう。{'\n'}
            より目標に近いカロリーを維持した人が勝利！
          </Text>
        </View>

        {/* 予定機能リスト */}
        <View style={styles.featureSection}>
          <Text style={styles.featureSectionTitle}>実装予定の機能</Text>
          {FEATURES.map(f => (
            <View key={f.title} style={styles.featureItem}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 今週の自分のスコア */}
        <View style={styles.myScoreCard}>
          <Text style={styles.myScoreLabel}>今週の自分のスコア</Text>
          <View style={styles.myScoreRow}>
            <ScoreItem label="記録日数" value="0" unit="日" />
            <ScoreItem label="獲得EXP" value="0" unit="EXP" />
            <ScoreItem label="達成率" value="--" unit="%" />
          </View>
          <TouchableOpacity style={styles.recordBtn} onPress={() => router.push('/camera' as any)}>
            <Text style={styles.recordBtnText}>📸 今日の食事を記録してポイントを貯めよう</Text>
          </TouchableOpacity>
        </View>

        {/* 招待 placeholder */}
        <View style={styles.inviteCard}>
          <Text style={styles.inviteTitle}>友達を招待する</Text>
          <Text style={styles.inviteDesc}>招待機能はアップデートで追加予定です</Text>
          <View style={styles.inviteBtn}>
            <Text style={styles.inviteBtnText}>Coming Soon</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const FEATURES = [
  { icon: '👥', title: '友達グループ', desc: '最大4人でバトルグループを作成' },
  { icon: '📊', title: 'リアルタイムランキング', desc: '週間ポイントで順位を競う' },
  { icon: '🏆', title: '週次表彰', desc: '1位には特別EXPボーナス' },
  { icon: '💬', title: '応援コメント', desc: 'グループメンバーに声かけ' },
];

function ScoreItem({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.scoreItem}>
      <Text style={styles.scoreValue}>{value}</Text>
      <Text style={styles.scoreUnit}>{unit}</Text>
      <Text style={styles.scoreLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 13, color: '#666', marginTop: 2 },
  heroCard: { margin: 16, backgroundColor: '#1a1a2e', borderRadius: 20, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#2d2d4e' },
  heroEmoji: { fontSize: 56, marginBottom: 16 },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 12 },
  heroDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
  featureSection: { marginHorizontal: 16, marginBottom: 16 },
  featureSectionTitle: { fontSize: 14, color: '#666', fontWeight: '600', marginBottom: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, marginBottom: 8 },
  featureIcon: { fontSize: 28, marginRight: 14 },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 2 },
  featureDesc: { fontSize: 12, color: '#666' },
  myScoreCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16 },
  myScoreLabel: { fontSize: 14, color: '#888', marginBottom: 12 },
  myScoreRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  scoreItem: { alignItems: 'center' },
  scoreValue: { fontSize: 28, fontWeight: '900', color: '#7c3aed' },
  scoreUnit: { fontSize: 12, color: '#666' },
  scoreLabel: { fontSize: 11, color: '#555', marginTop: 2 },
  recordBtn: { backgroundColor: '#2d2d4e', borderRadius: 12, padding: 14, alignItems: 'center' },
  recordBtnText: { color: '#7c3aed', fontSize: 13, fontWeight: '600' },
  inviteCard: { marginHorizontal: 16, marginBottom: 32, backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, alignItems: 'center' },
  inviteTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 6 },
  inviteDesc: { fontSize: 13, color: '#666', marginBottom: 16 },
  inviteBtn: { backgroundColor: '#2a2a2a', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12 },
  inviteBtnText: { color: '#555', fontSize: 14, fontWeight: '600' },
});
