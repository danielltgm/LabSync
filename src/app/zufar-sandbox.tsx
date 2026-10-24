import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoleSwitcher } from '@/components/common/RoleSwitcher';
import { LabSyncColors as colors, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';
import { useLabSync } from '@/context/LabSyncContext';

// Isolated entry point until Yudha switches the home links to Zufar's final routes.
export default function ZufarSandbox() {
  const { sessions, users, activeRole, activeStudentId, setRole, selectStudent } = useLabSync();
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>Sandbox Zufar</Text>
        <Text style={styles.body}>Demo mandiri Z1-Z4. Presensi memakai data contoh ERD, bukan hasil kirim formulir. Pilihan peran dan sesi memakai fondasi demo Yudha.</Text>
        <RoleSwitcher activeRole={activeRole} students={users} activeStudentId={activeStudentId}
          onRoleChange={setRole} onStudentChange={selectStudent} />
        <View style={styles.links}>
          {sessions.map((session) => (
            <Link key={session.id} href={{ pathname: '/rekap/[id]', params: { id: session.id } }} style={styles.link}>
              Rekap {session.courseName}
            </Link>
          ))}
          <Link href={{ pathname: '/rekap/[id]', params: { id: 'tidak-ada' } }} style={styles.link}>Uji sesi tidak ditemukan</Link>
          <Link href="/" style={styles.link}>Beranda tim</Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: space.lg, gap: space.lg },
  title: { ...type.title, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  links: { gap: space.sm },
  link: { ...type.button, color: colors.primary, minHeight: 48, paddingVertical: space.md },
});
