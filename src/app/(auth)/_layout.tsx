import { Stack } from 'expo-router';

import { LabSyncColors } from '@/constants/labsync-theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: LabSyncColors.background },
      }}
    />
  );
}
