import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 通知ハンドラ設定（アプリ起動中でも通知を表示）
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 朝の通知メッセージ（ランダム選択でマンネリ防止）
const MORNING_MESSAGES = [
  { title: '⚔️ 勇者よ、今日の冒険を始めよう！', body: '朝食を記録して最初のEXPを獲得しよう' },
  { title: '🌅 新しい1日が始まった！', body: 'デイリークエストが更新されました。今日も記録しよう！' },
  { title: '💪 今日も強くなる日だ！', body: '3食記録すれば +220 EXP！' },
  { title: '🔥 ストリークを続けろ！', body: '連続記録でボスにダメージを与え続けよう' },
];

// 夜の通知メッセージ
const EVENING_MESSAGES = [
  { title: '📜 夕食の記録を忘れずに', body: '記録しないとボスが回復するぞ！' },
  { title: '🌙 今日の締めくくりに', body: '夕食を記録して今日のクエストを完了させよう' },
  { title: '⚡ あと少しでクエスト完了！', body: '今日の食事記録を締めくくろう +EXP 待ってます' },
  { title: '🎯 目標まであと一歩！', body: '夕食を記録してカロリー目標を達成しよう' },
];

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleAllNotifications(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  // 既に通知がスケジュール済みなら再設定しない（ユーザーが個別にOFFにした場合を保護）
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const hasMorning = scheduled.some(n => n.identifier === 'morning-reminder');
  const hasEvening = scheduled.some(n => n.identifier === 'evening-reminder');
  if (hasMorning && hasEvening) return;

  // 未設定の通知のみキャンセル後に再設定
  if (!hasMorning) await Notifications.cancelScheduledNotificationAsync('morning-reminder').catch(() => {});
  if (!hasEvening) await Notifications.cancelScheduledNotificationAsync('evening-reminder').catch(() => {});

  // 朝8時の通知（毎日）
  const morning = MORNING_MESSAGES[Math.floor(Math.random() * MORNING_MESSAGES.length)];
  await Notifications.scheduleNotificationAsync({
    identifier: 'morning-reminder',
    content: {
      title: morning.title,
      body:  morning.body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });

  // 夜20時の通知（毎日）
  const evening = EVENING_MESSAGES[Math.floor(Math.random() * EVENING_MESSAGES.length)];
  await Notifications.scheduleNotificationAsync({
    identifier: 'evening-reminder',
    content: {
      title: evening.title,
      body:  evening.body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

// 記録忘れ通知（3日無記録でトリガー）
export async function scheduleInactivityNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: 'inactivity-reminder',
    content: {
      title: '🗡️ 勇者が行方不明です…',
      body: 'カロクエが待っています。記録を再開してボスを倒そう！',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 24 * 3, // 3日後
      repeats: false,
    },
  });
}

export async function cancelInactivityNotification(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync('inactivity-reminder');
}
