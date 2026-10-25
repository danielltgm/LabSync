import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { LabSyncColors } from '@/constants/labsync-theme';
import { LabSyncProvider } from '@/context/LabSyncContext';

export default function RootLayout() {
  return (
    <LabSyncProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: LabSyncColors.background },
      }} />
    </LabSyncProvider>
  );
}
