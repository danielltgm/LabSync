import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SessionForm } from '@/components/manage/SessionForm';
import {
  LabSyncColors as colors,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { createSession } from '@/services/sessionService';

export default function CreateSessionScreen() {
  const { classId, className } = useLocalSearchParams<{ classId: string; className?: string }>();
  const { activeUser } = useLabSync();

  const activeClassId = Array.isArray(classId) ? classId[0] : classId;
  const activeClassName = Array.isArray(className) ? className[0] : (className ?? '');

  if (!activeClassId) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.errorContainer}>
          <Text style={styles.title}>ID Kelas Tidak Ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <SessionForm
        classId={activeClassId}
        defaultClassName={activeClassName}
        defaultAssistantName={activeUser?.name ?? ''}
        onSubmit={async (input) => {
          const result = await createSession(input);
          if (result.success) {
            router.back();
          }
          return result;
        }}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.xl },
  title: { ...type.title, color: colors.danger.text },
});
