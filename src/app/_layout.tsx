import '@/global.css';

import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AccountGate } from '@/components/app/account-gate';
import { BootScreen } from '@/components/app/boot-screen';
import { ToastViewport } from '@/components/app/toast';
import { DemoStoreProvider, useStore } from '@/data/store';
import { useColors, useRestoreTheme } from '@/hooks/use-theme';
import { useAppFonts } from '@/lib/fonts';
import { NAV_THEME } from '@/lib/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <DemoStoreProvider>
            <ThemedRoot />
          </DemoStoreProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedRoot() {
  useRestoreTheme();
  const { scheme } = useColors();
  const { ready: storeReady, me, offline, missingProfile } = useStore();
  const fontsReady = useAppFonts();
  const ready = storeReady && fontsReady;

  return (
    <ThemeProvider value={NAV_THEME[scheme]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {ready && (offline || missingProfile) ? (
        <AccountGate reason={offline ? 'offline' : 'missing-profile'} />
      ) : ready ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: NAV_THEME[scheme].colors.background } }}>
          <Stack.Protected guard={!!me}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={!me}>
            <Stack.Screen name="login" />
          </Stack.Protected>
        </Stack>
      ) : (
        <BootScreen />
      )}
      <ToastViewport />
      <PortalHost />
    </ThemeProvider>
  );
}
