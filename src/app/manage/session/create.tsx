import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/common/EmptyState';
import { Button, LoadingLine } from '@/components/common/ui';
import { SessionForm } from '@/components/manage/SessionForm';
import {
  LabSyncColors as colors,
  LabSyncLayout as layout,
  LabSyncSpacing as space,
} from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';
import { createSession, updateSessionDetails, validateSessionInput } from '@/services/sessionService';

export default function CreateSessionScreen() {
  const { classId, className, sessionId } = useLocalSearchParams<{ classId: string; className?: string; sessionId?: string }>();
  const { activeUser, sessions, loadingSessions } = useLabSync();

  const activeClassId = Array.isArray(classId) ? classId[0] : classId;
  const activeClassName = Array.isArray(className) ? className[0] : (className ?? '');

  const session = sessions.find((item) => item.id === sessionId && item.classId === activeClassId);
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/manage');

  if (sessionId && loadingSessions) return <SafeAreaView style={styles.screen}><LoadingLine label="Memuat jadwal…" /></SafeAreaView>;
  if (!activeClassId || activeUser.role !== 'ASISTEN' || (sessionId && session?.status !== 'TERJADWAL')) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.errorContainer}>
          <EmptyState title="Jadwal sesi tidak tersedia">
            <Button label="Kembali" onPress={goBack} style={styles.back} />
          </EmptyState>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <SessionForm
        key={session?.id ?? activeClassId}
        initialSession={session}
        classId={activeClassId}
        defaultClassName={activeClassName}
        defaultAssistantName={activeUser?.name ?? ''}
        onSubmit={async (input) => {
          const error = validateSessionInput(input);
          if (error) return { success: false, error };
          const { classId: _classId, ...details } = input;
          const result = session ? await updateSessionDetails(session.id, details) : await createSession(input);
          if (result.success) {
            goBack();
          }
          return result;
        }}
        onCancel={goBack}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  errorContainer: { flex: 1, justifyContent: 'center', padding: space.xl, width: '100%', maxWidth: layout.form, alignSelf: 'center' },
  back: { marginTop: space.md, alignSelf: 'stretch' },
});
