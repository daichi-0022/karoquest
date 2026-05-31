import Anthropic from '@anthropic-ai/sdk';
import * as FileSystem from 'expo-file-system';

const client = new Anthropic({
  apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
});

export interface FoodAnalysisResult {
  calories: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  confidence: 'high' | 'medium' | 'low';
  dish_name: string;
  is_complex_dish: boolean;
  notes: string;
}

export async function analyzeFoodImage(photoUri: string): Promise<FoodAnalysisResult> {
  // 画像をbase64に変換
  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64,
            },
          },
          {
            type: 'text',
            text: `この食事の写真を分析して、以下をJSON形式のみで返してください（他の文字は不要）。
推定が難しい場合も必ず数値を返してください。
複合料理（カレー・シチュー・炒め物など複数食材が混在）はis_complex_dish: trueとしてください。

{
  "calories": 数値(kcal),
  "protein_g": 数値,
  "fat_g": 数値,
  "carbs_g": 数値,
  "confidence": "high|medium|low",
  "dish_name": "料理名(日本語)",
  "is_complex_dish": true/false,
  "notes": "推定の根拠（簡潔に）"
}`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  // JSON抽出（余分な文字があっても対応）
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AIからの応答をパースできませんでした');

  const parsed = JSON.parse(jsonMatch[0]) as FoodAnalysisResult;

  // 数値の安全チェック
  return {
    calories: Math.max(0, Math.round(parsed.calories ?? 0)),
    protein_g: Math.max(0, parsed.protein_g ?? 0),
    fat_g: Math.max(0, parsed.fat_g ?? 0),
    carbs_g: Math.max(0, parsed.carbs_g ?? 0),
    confidence: parsed.confidence ?? 'low',
    dish_name: parsed.dish_name ?? '不明な料理',
    is_complex_dish: parsed.is_complex_dish ?? false,
    notes: parsed.notes ?? '',
  };
}
