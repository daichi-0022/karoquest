import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, Linking,
} from 'react-native';
import { router } from 'expo-router';

// RevenueCat実装時にここを差し替える
// import Purchases from 'react-native-purchases';

const FEATURES = [
  { icon: '🎲', free: '1日3回',     premium: '無制限',       label: '装備ドロップ' },
  { icon: '📸', free: '1日5回',     premium: '無制限',       label: 'AI食事解析' },
  { icon: '📊', free: '7日間のみ',  premium: '無制限',       label: '体重グラフ' },
  { icon: '⚡', free: '通常確率',   premium: 'SSR確率2倍',   label: 'ガチャ確率' },
  { icon: '❤️', free: '近日実装',   premium: '優先対応',     label: 'Apple Health連携' },
];

export default function PaywallScreen() {
  const [selected, setSelected] = useState<'monthly'|'annual'>('annual');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // TODO: RevenueCat実装後に差し替え
      // const offerings = await Purchases.getOfferings();
      // const pkg = selected === 'annual'
      //   ? offerings.current?.annual
      //   : offerings.current?.monthly;
      // if (pkg) await Purchases.purchasePackage(pkg);

      Alert.alert(
        '準備中',
        'サブスクリプション機能は近日実装予定です。\nご期待ください！',
        [{ text: 'OK' }]
      );
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert('エラー', '購入に失敗しました。もう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    // TODO: Purchases.restorePurchases()
    Alert.alert('復元', '購入の復元機能は近日実装予定です。');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* ヘッダー */}
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>

        <Text style={styles.badge}>🏆 PREMIUM</Text>
        <Text style={styles.title}>もっと強くなろう</Text>
        <Text style={styles.sub}>全機能解放で最速ダイエット達成</Text>

        {/* 機能比較表 */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderEmpty} />
            <Text style={styles.tableHeaderFree}>無料</Text>
            <Text style={styles.tableHeaderPremium}>⭐ プレミアム</Text>
          </View>
          {FEATURES.map((f, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
              <View style={styles.tableFeature}>
                <Text style={styles.tableFeatureIcon}>{f.icon}</Text>
                <Text style={styles.tableFeatureLabel}>{f.label}</Text>
              </View>
              <Text style={styles.tableFree}>{f.free}</Text>
              <Text style={styles.tablePremium}>{f.premium}</Text>
            </View>
          ))}
        </View>

        {/* 価格選択 */}
        <View style={styles.plans}>
          <TouchableOpacity
            style={[styles.plan, selected === 'annual' && styles.planSelected]}
            onPress={() => setSelected('annual')}
          >
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>おすすめ 37%OFF</Text>
            </View>
            <Text style={styles.planName}>年額プラン</Text>
            <Text style={styles.planPrice}>¥3,600 / 年</Text>
            <Text style={styles.planSub}>月あたり ¥300</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.plan, selected === 'monthly' && styles.planSelected]}
            onPress={() => setSelected('monthly')}
          >
            <Text style={styles.planName}>月額プラン</Text>
            <Text style={styles.planPrice}>¥480 / 月</Text>
            <Text style={styles.planSub}>いつでも解約可能</Text>
          </TouchableOpacity>
        </View>

        {/* 購入ボタン */}
        <TouchableOpacity
          style={[styles.purchaseBtn, loading && styles.purchaseBtnDisabled]}
          onPress={handlePurchase}
          disabled={loading}
        >
          <Text style={styles.purchaseBtnText}>
            {loading ? '処理中...' : `${selected === 'annual' ? '¥3,600/年' : '¥480/月'} で始める`}
          </Text>
          <Text style={styles.purchaseBtnSub}>
            {selected === 'annual' ? '7日間無料トライアル付き' : '3日間無料トライアル付き'}
          </Text>
        </TouchableOpacity>

        {/* リストア・利用規約 */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={styles.footerLink}>購入を復元する</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://daichi-0022.github.io/karoquest/terms.html')}>
            <Text style={styles.footerLink}>利用規約</Text>
          </TouchableOpacity>
          <Text style={styles.footerDivider}>|</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://daichi-0022.github.io/karoquest/privacy.html')}>
            <Text style={styles.footerLink}>プライバシー</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          サブスクリプションはApp Store経由で管理されます。{'\n'}
          トライアル期間終了後、自動更新されます。
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0A0A18' },
  scroll:  { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  closeBtn: { alignSelf: 'flex-end', padding: 8 },
  closeBtnText: { fontSize: 18, color: '#555' },

  badge: { textAlign: 'center', fontSize: 13, fontWeight: '800', color: '#F59E0B', marginBottom: 8 },
  title: { textAlign: 'center', fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 },
  sub:   { textAlign: 'center', fontSize: 14, color: '#888', marginBottom: 24 },

  table: { backgroundColor: '#12122A', borderRadius: 16, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: '#1e1e4e' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#1a1a3e', paddingVertical: 10, paddingHorizontal: 12 },
  tableHeaderEmpty: { flex: 2 },
  tableHeaderFree: { flex: 1, textAlign: 'center', fontSize: 12, color: '#666', fontWeight: '700' },
  tableHeaderPremium: { flex: 1, textAlign: 'center', fontSize: 12, color: '#F59E0B', fontWeight: '800' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, alignItems: 'center' },
  tableRowAlt: { backgroundColor: '#0E0E24' },
  tableFeature: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tableFeatureIcon: { fontSize: 16 },
  tableFeatureLabel: { fontSize: 13, color: '#ccc' },
  tableFree: { flex: 1, textAlign: 'center', fontSize: 12, color: '#555' },
  tablePremium: { flex: 1, textAlign: 'center', fontSize: 12, color: '#10B981', fontWeight: '700' },

  plans: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  plan: { flex: 1, backgroundColor: '#12122A', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: '#1e1e4e', position: 'relative' },
  planSelected: { borderColor: '#7C3AED', backgroundColor: '#1a1a3e' },
  planBadge: { position: 'absolute', top: -10, backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  planBadgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  planName: { fontSize: 13, fontWeight: '700', color: '#888', marginTop: 8, marginBottom: 4 },
  planPrice: { fontSize: 20, fontWeight: '900', color: '#fff' },
  planSub: { fontSize: 11, color: '#555', marginTop: 2 },

  purchaseBtn: { backgroundColor: '#7C3AED', borderRadius: 16, padding: 18, alignItems: 'center', marginBottom: 16 },
  purchaseBtnDisabled: { opacity: 0.5 },
  purchaseBtnText: { fontSize: 18, fontWeight: '900', color: '#fff' },
  purchaseBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },

  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 12 },
  footerLink: { fontSize: 12, color: '#555' },
  footerDivider: { fontSize: 12, color: '#333' },
  disclaimer: { fontSize: 11, color: '#444', textAlign: 'center', lineHeight: 18 },
});
