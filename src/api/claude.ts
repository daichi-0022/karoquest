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

// APIキーなし時のフォールバック結果
const FALLBACK_RESULT: FoodAnalysisResult = {
  calories: 0, protein_g: 0, fat_g: 0, carbs_g: 0,
  confidence: 'low', dish_name: '解析失敗', is_complex_dish: false,
  notes: 'AIキーが設定されていません。手動で入力してください。',
};

export async function analyzeFoodImage(photoUri: string): Promise<FoodAnalysisResult> {
  // APIキーチェック
  if (!ANTHROPIC_API_KEY) {
    throw new Error('APIキーが設定されていません。.envファイルを確認してください。');
  }

  let base64: string;
  try {
    base64 = await FileSystem.readAsStringAsync(photoUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    throw new Error('画像の読み込みに失敗しました。もう一度撮影してください。');
  }

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
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
                source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
              },
              {
                type: 'text',
                text: `この食事の写真を分析して、以下をJSON形式のみで返してください（説明文不要）。
推定が難しい場合も必ず数値を返してください。
複合料理（カレー・シチュー・炒め物など）はis_complex_dish: trueとしてください。

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
  } catch {
    throw new Error('ネットワークエラーです。接続を確認してください。');
  }

  if (!response.ok) {
    if (response.status === 401) throw new Error('APIキーが無効です。設定を確認してください。');
    if (response.status === 429) throw new Error('利用制限に達しました。しばらく待ってから再試行してください。');
    throw new Error(`AI解析エラー (${response.status})。もう一度試してください。`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error('AIからの応答が不正です。もう一度試してください。');
  }

  const text: string = data.content?.[0]?.text ?? '';

  // 最も外側のJSONオブジェクトを安全に抽出（ネストも対応）
  let parsed: Partial<FoodAnalysisResult> | null = null;
  const matches = text.match(/\{[\s\S]*?\}/g) ?? [];
  for (const match of matches) {
    try {
      const candidate = JSON.parse(match);
      if (typeof candidate.calories === 'number') {
        parsed = candidate;
        break;
      }
    } catch { /* 次を試す */ }
  }

  // グリーディマッチでも試みる
  if (!parsed) {
    const greedyMatch = text.match(/\{[\s\S]*\}/);
    if (greedyMatch) {
      try {
        const candidate = JSON.parse(greedyMatch[0]);
        if (typeof candidate.calories === 'number') parsed = candidate;
      } catch { /* ignore */ }
    }
  }

  if (!parsed) {
    throw new Error('AIの応答を解析できませんでした。もう一度撮影してください。');
  }

  return {
    calories:        Math.max(0, Math.round(parsed.calories      ?? 0)),
    protein_g:       Math.max(0, parsed.protein_g  ?? 0),
    fat_g:           Math.max(0, parsed.fat_g       ?? 0),
    carbs_g:         Math.max(0, parsed.carbs_g     ?? 0),
    confidence:      (['high','medium','low'].includes(parsed.confidence ?? '') ? parsed.confidence : 'low') as FoodAnalysisResult['confidence'],
    dish_name:       parsed.dish_name       ?? '不明な料理',
    is_complex_dish: parsed.is_complex_dish ?? false,
    notes:           parsed.notes           ?? '',
  };
}
