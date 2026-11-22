import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="izin/baru" options={{ presentation: 'modal' }} />
      <Stack.Screen name="scan" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      {/* Locked quiz: no swipe-back; the screen asks to submit instead. */}
      <Stack.Screen name="kuis/[id]/kerjakan" options={{ gestureEnabled: false, animation: 'fade' }} />
    </Stack>
  );
}
