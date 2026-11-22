import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/app/mascot';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useStore } from '@/data/store';

/** Shown instead of the app when the build has no Firebase config, or an Auth account has no profile. */
export function AccountGate({ reason }: { reason: 'offline' | 'missing-profile' }) {
  const { logout } = useStore();
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-background flex-1 items-center justify-center gap-4 px-8" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Mascot mood="oops" size={140} />
      <Text className="font-display text-center text-[28px] font-extrabold uppercase leading-8">
        {reason === 'offline' ? 'Belum tersambung' : 'Profil belum ada'}
      </Text>
      <Text className="text-muted-foreground max-w-sm text-center text-[15px] leading-6">
        {reason === 'offline'
          ? 'Aplikasi ini dibangun tanpa konfigurasi Firebase. Hubungi pengembang LabSync.'
          : 'Akunmu bisa masuk, tapi profilnya belum dibuat. Minta koordinator lab menambahkan NIM/NIP-mu, lalu masuk lagi.'}
      </Text>
      {reason === 'missing-profile' && (
        <Button className="h-12 rounded-2xl px-8" onPress={() => void logout()}>
          <Text>Keluar</Text>
        </Button>
      )}
    </View>
  );
}
