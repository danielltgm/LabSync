import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { LabSyncColors as colors, LabSyncSpacing as space, LabSyncTypography as type } from '@/constants/labsync-theme';
import { firebase } from '@/firebase/client';

export function FoundationGate({ login, loading, message, onRetry, onLogout }: {
  login?: boolean;
  loading?: boolean;
  message?: string;
  onRetry?: () => void;
  onLogout?: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!firebase || busy) return;
    setError('');
    setBusy(true);
    try {
      await signInWithEmailAndPassword(firebase.auth, email.trim(), password);
    } catch (failure) {
      const code = (failure as { code?: string }).code;
      setError(code === 'auth/network-request-failed'
        ? 'Koneksi gagal. Coba lagi.'
        : 'Login gagal. Periksa email dan kata sandi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
          <View style={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>LabSync</Text>
            {loading && <ActivityIndicator color={colors.primary} />}
            {!!message && <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text>}
            {login && (
              <>
                <Text style={styles.text}>Masuk dengan akun LabSync.</Text>
                <TextInput accessibilityLabel="Email" placeholder="Email" style={styles.input} value={email}
                  onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
                <TextInput accessibilityLabel="Kata sandi" placeholder="Kata sandi" style={styles.input}
                  value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password"
                  onSubmitEditing={() => { void submit(); }} />
                <Button title={busy ? 'Masuk…' : 'Masuk'} onPress={() => { void submit(); }} disabled={busy || !email.trim() || !password} />
              </>
            )}
            {!!error && <Text accessibilityRole="alert" style={styles.text}>{error}</Text>}
            {onRetry && <Button title="Coba lagi" onPress={onRetry} />}
            {onLogout && <Button title="Keluar" onPress={onLogout} />}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.lg },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: space.lg },
  title: { ...type.title, color: colors.primary },
  text: { ...type.body, color: colors.text },
  input: { ...type.body, color: colors.text, borderColor: colors.borderDark, borderWidth: 1, minHeight: 48, padding: space.md, backgroundColor: colors.surface },
});
