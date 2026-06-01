import { Share } from 'react-native';

// App Store申請後に正式URLへ更新: https://apps.apple.com/jp/app/karoquest/idXXXXXXXX
const APP_URL = 'https://daichi-0022.github.io/karoquest/';

export async function shareLevelUp(level: number, title: string): Promise<void> {
  try {
    await Share.share({
      message: `【カロクエ】レベル${level}「${title}」に到達！⚔️\n食事記録×RPGで楽しくダイエット中！\n#カロクエ #ダイエットRPG #食事記録\n${APP_URL}`,
      title: `Lv.${level} 到達！`,
    });
  } catch { /* シェアキャンセルは無視 */ }
}

export async function shareBossDefeat(bossName: string, chapter: number): Promise<void> {
  try {
    await Share.share({
      message: `【カロクエ】第${chapter}章ボス「${bossName}」を撃破！🏆\n7日間の食事記録でボスを倒しました！\n#カロクエ #ダイエットRPG #ボス撃破\n${APP_URL}`,
      title: `${bossName} 撃破！`,
    });
  } catch { /* ignore */ }
}

export async function shareWeightGoal(lostKg: number): Promise<void> {
  try {
    await Share.share({
      message: `【カロクエ】${lostKg}kg減量達成！⚖️✨\nカロクエで楽しくダイエット継続中！\n#カロクエ #ダイエット成功 #${lostKg}kg減\n${APP_URL}`,
      title: `${lostKg}kg 減量達成！`,
    });
  } catch { /* ignore */ }
}

export async function shareStreak(days: number): Promise<void> {
  try {
    await Share.share({
      message: `【カロクエ】${days}日連続記録達成！🔥\nRPGゲームで食事管理が楽しくなった！\n#カロクエ #${days}日連続 #ダイエット継続\n${APP_URL}`,
      title: `${days}日連続記録！`,
    });
  } catch { /* ignore */ }
}
