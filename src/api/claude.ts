import * as FileSystem from 'expo-file-system/legacy';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

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
  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
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
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AIからの応答をパースできませんでした');

  const parsed = JSON.parse(jsonMatch[0]) as FoodAnalysisResult;

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
