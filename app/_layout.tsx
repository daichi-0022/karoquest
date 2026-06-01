import { useFonts } from 'expo-font';
import { Stack, router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { initializeDatabase, getDb } from '@/src/db/schema';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => { if (error) throw error; }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      initializeDatabase().then(async () => {
        setDbReady(true);
        const db = getDb();
        const row = await db.getFirstAsync<{ onboarding_done: number }>(
          `SELECT onboarding_done FROM user_profile WHERE id = 'me'`
        );
        if (!row?.onboarding_done) {
          router.replace('/onboarding');
        }
      });
    }
  }, [loaded]);

  if (!loaded || !dbReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A18' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="camera"    options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="weight"    options={{ presentation: 'modal' }} />
      <Stack.Screen name="inventory" options={{ presentation: 'modal' }} />
      <Stack.Screen name="modal"     options={{ presentation: 'modal', headerShown: true, title: '' }} />
    </Stack>
  );
}
