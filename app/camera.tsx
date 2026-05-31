import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, SafeAreaView, Image, ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { analyzeFoodImage, type FoodAnalysisResult } from '@/src/api/claude';
import { saveMeal, type MealType } from '@/src/db/meals';

const TODAY = new Date().toISOString().split('T')[0];
const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: '朝食' },
  { key: 'lunch', label: '昼食' },
  { key: 'dinner', label: '夕食' },
  { key: 'snack', label: '間食' },
];

type Stage = 'camera' | 'analyzing' | 'result';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [stage, setStage] = useState<Stage>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [expGained, setExpGained] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) return <View style={styles.safe} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionText}>カメラへのアクセスが必要です</Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>許可する</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7, base64: false });
    if (photo?.uri) await handlePhoto(photo.uri);
  };

  const pickFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) await handlePhoto(res.assets[0].uri);
  };

  const handlePhoto = async (uri: string) => {
    setPhotoUri(uri);
    setStage('analyzing');
    try {
      const analysis = await analyzeFoodImage(uri);
      setResult(analysis);
      setStage('result');
    } catch (e) {
      Alert.alert('解析エラー', '写真の解析に失敗しました。もう一度お試しください。');
      setStage('camera');
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const { expGained: exp } = await saveMeal(TODAY, mealType, result, photoUri);
      setExpGained(exp);
      Alert.alert(
        '記録しました！',
        `+${exp} EXP 獲得！`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e) {
      Alert.alert('エラー', '記録の保存に失敗しました。');
    }
  };

  // カメラ画面
  if (stage === 'camera') {
    return (
      <View style={styles.safe}>
        <CameraView style={styles.camera} ref={cameraRef} facing="back" />
        {/* 上部：食事タイプ選択 */}
        <SafeAreaView style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.mealTypeRow}>
            {MEAL_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.mealTypeBtn, mealType === t.key && styles.mealTypeActive]}
                onPress={() => setMealType(t.key)}
              >
                <Text style={[styles.mealTypeText, mealType === t.key && styles.mealTypeTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>

        {/* シャッターエリア */}
        <View style={styles.shutterArea}>
          <TouchableOpacity style={styles.libraryBtn} onPress={pickFromLibrary}>
            <Text style={styles.libraryText}>ライブラリ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shutterBtn} onPress={takePicture}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <View style={{ width: 70 }} />
        </View>
      </View>
    );
  }

  // 解析中
  if (stage === 'analyzing') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.analyzingBox}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.analyzingText}>AIが解析中...</Text>
          <Text style={styles.analyzingSub}>2〜3秒お待ちください</Text>
          {photoUri && <Image source={{ uri: photoUri }} style={styles.previewThumb} />}
        </View>
      </SafeAreaView>
    );
  }

  // 結果画面
  if (stage === 'result' && result) {
    const confidenceColor = result.confidence === 'high' ? '#34d399' : result.confidence === 'medium' ? '#fbbf24' : '#f87171';
    const confidenceLabel = result.confidence === 'high' ? '高' : result.confidence === 'medium' ? '中' : '低';

    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          {/* 写真プレビュー */}
          {photoUri && <Image source={{ uri: photoUri }} style={styles.resultPhoto} />}

          {/* 料理名 */}
          <View style={styles.resultCard}>
            <Text style={styles.dishName}>{result.dish_name}</Text>
            <View style={styles.confidenceBadge}>
              <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                精度: {confidenceLabel}
              </Text>
            </View>
          </View>

          {/* ±20%免責表示 */}
          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>
              ⚠️ 推定値です。±20%程度の誤差があります
              {result.is_complex_dish && '\n複合料理は材料を個別に撮影すると精度が上がります'}
            </Text>
          </View>

          {/* カロリー */}
          <View style={styles.calorieResult}>
            <Text style={styles.calorieResultNum}>{result.calories}</Text>
            <Text style={styles.calorieResultUnit}>kcal</Text>
          </View>

          {/* PFC */}
          <View style={styles.pfcResultRow}>
            <PFCResult label="タンパク質" value={result.protein_g} color="#60a5fa" />
            <PFCResult label="脂質" value={result.fat_g} color="#fbbf24" />
            <PFCResult label="炭水化物" value={result.carbs_g} color="#34d399" />
          </View>

          {/* 食事タイプ選択 */}
          <Text style={styles.mealTypeSelectLabel}>食事タイプ</Text>
          <View style={styles.mealTypeResultRow}>
            {MEAL_TYPES.map(t => (
              <TouchableOpacity
                key={t.key}
                style={[styles.mealTypeResultBtn, mealType === t.key && styles.mealTypeResultActive]}
                onPress={() => setMealType(t.key)}
              >
                <Text style={[styles.mealTypeResultText, mealType === t.key && styles.mealTypeResultTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ボタン */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>記録する (+{10} EXP)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.retakeBtn} onPress={() => setStage('camera')}>
            <Text style={styles.retakeBtnText}>撮り直す</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

function PFCResult({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.pfcResultItem}>
      <Text style={[styles.pfcResultLabel, { color }]}>{label}</Text>
      <Text style={styles.pfcResultValue}>{value.toFixed(1)}g</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f0f' },
  camera: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { padding: 8 },
  backText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  mealTypeRow: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'center' },
  mealTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)' },
  mealTypeActive: { backgroundColor: '#7c3aed' },
  mealTypeText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  mealTypeTextActive: { color: '#fff', fontWeight: '700' },
  shutterArea: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', zIndex: 10 },
  libraryBtn: { width: 70, alignItems: 'center' },
  libraryText: { color: '#fff', fontSize: 12 },
  shutterBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },
  permissionBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  permissionBtn: { backgroundColor: '#7c3aed', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  permissionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  analyzingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  analyzingText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  analyzingSub: { color: '#888', fontSize: 13 },
  previewThumb: { width: 120, height: 120, borderRadius: 12, marginTop: 8 },
  resultScroll: { padding: 16 },
  resultPhoto: { width: '100%', height: 220, borderRadius: 16, marginBottom: 16 },
  resultCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dishName: { fontSize: 20, fontWeight: '800', color: '#fff', flex: 1 },
  confidenceBadge: { backgroundColor: '#1a1a1a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  confidenceText: { fontSize: 12, fontWeight: '700' },
  disclaimerBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 16 },
  disclaimerText: { color: '#888', fontSize: 12, lineHeight: 18 },
  calorieResult: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginBottom: 16 },
  calorieResultNum: { fontSize: 56, fontWeight: '900', color: '#7c3aed' },
  calorieResultUnit: { fontSize: 20, color: '#888', marginLeft: 6 },
  pfcResultRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  pfcResultItem: { alignItems: 'center' },
  pfcResultLabel: { fontSize: 13, fontWeight: '600' },
  pfcResultValue: { fontSize: 18, fontWeight: '700', color: '#fff', marginTop: 4 },
  mealTypeSelectLabel: { fontSize: 14, color: '#888', marginBottom: 10 },
  mealTypeResultRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  mealTypeResultBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#1a1a1a', alignItems: 'center' },
  mealTypeResultActive: { backgroundColor: '#7c3aed' },
  mealTypeResultText: { color: '#666', fontSize: 13 },
  mealTypeResultTextActive: { color: '#fff', fontWeight: '700' },
  saveBtn: { backgroundColor: '#7c3aed', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  retakeBtn: { backgroundColor: '#1a1a1a', borderRadius: 14, padding: 16, alignItems: 'center' },
  retakeBtnText: { color: '#888', fontSize: 15 },
});
