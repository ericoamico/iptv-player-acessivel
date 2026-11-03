import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useAutoUpdateCheck } from '../hooks/useAutoUpdateCheck';
import { useOrientationFromSettings } from '../hooks/useOrientationLock';
import { useAuth } from '../store/authStore';
import { colors } from '../theme';

export default function RootLayout() {
  useOrientationFromSettings();
  useAutoUpdateCheck();

  useEffect(() => {
    useAuth.getState().load();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Entrar', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="categories" options={{ title: 'Categorias', headerBackVisible: false, gestureEnabled: false }} />
        <Stack.Screen name="category/[id]" options={{ title: 'Canais' }} />
        <Stack.Screen name="player/[id]" options={{ title: 'Player' }} />
        <Stack.Screen name="epg/[id]" options={{ title: 'Programação' }} />
        <Stack.Screen name="settings" options={{ title: 'Configurações' }} />
      </Stack>
    </>
  );
}
