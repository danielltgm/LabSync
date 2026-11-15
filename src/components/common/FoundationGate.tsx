import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ActionRow, Button, LoadingLine, Notice, Rule, TextField } from '@/components/common/ui';
import { Wordmark } from '@/components/common/Wordmark';
import {
  LabSyncColors as colors,
  LabSyncLayout as layout,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { firebase } from '@/firebase/client';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { registerAccount } from '@/services/registration';

export function FoundationGate({ login, loading, message, onRetry, onLogout }: {
  login?: boolean;
  loading?: boolean;
  message?: string;
  onRetry?: () => void;
  onLogout?: () => void;
}) {
  const { split, compact } = useResponsiveLayout();
  const [isRegistering, setIsRegistering] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regIdentifier, setRegIdentifier] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submitLogin() {
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

  async function submitRegister() {
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const result = await registerAccount({
        name: regName,
        identifier: regIdentifier,
        email: regEmail,
        password: regPassword,
        role: 'PRAKTISAN',
      });

      if (!result.success) {
        setError(Object.values(result.fieldErrors ?? {})[0] ?? result.error ?? 'Pendaftaran akun gagal.');
      }
    } catch {
      setError('Terjadi kesalahan saat pendaftaran.');
    } finally {
      setBusy(false);
    }
  }

  const switchMode = (registering: boolean) => {
    setError('');
    setIsRegistering(registering);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, compact && styles.scrollCompact]}
        >
          <View style={[styles.shell, split && styles.shellSplit]}>
            <View style={[styles.brand, split && styles.brandSplit]}>
              <Wordmark size={split ? 'lg' : 'md'} />
              {split && <Rule strong style={styles.brandRule} />}
            </View>

            <View style={[styles.content, split && styles.contentSplit]}>
              {!split && <Rule strong />}

              {loading && <LoadingLine label={message ?? ''} />}
              {!loading && !!message && (
                <Notice tone={onRetry ? 'danger' : 'neutral'} message={message} live />
              )}

              {login && !isRegistering && (
                <View style={styles.form}>
                  <Text accessibilityRole="header" style={styles.formTitle}>Masuk dengan akun LabSync.</Text>
                  <TextField
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                  <TextField
                    label="Kata sandi"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoComplete="current-password"
                    textContentType="password"
                    onSubmitEditing={() => { void submitLogin(); }}
                  />
                  {!!error && <Notice tone="danger" message={error} alert />}
                  <Button
                    variant="primary"
                    label={busy ? 'Masuk…' : 'Masuk'}
                    onPress={() => { void submitLogin(); }}
                    disabled={busy || !email.trim() || !password}
                  />
                  <Rule />
                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>Belum memiliki akun?</Text>
                    <Button variant="quiet" compact label="Daftar Akun Baru" onPress={() => switchMode(true)} />
                  </View>
                </View>
              )}

              {login && isRegistering && (
                <View style={styles.form}>
                  <View style={styles.formIntro}>
                    <Text accessibilityRole="header" style={styles.formTitle}>Buat akun praktikan.</Text>
                    <Text style={styles.formNote}>Untuk akses asisten, hubungi PM.</Text>
                  </View>
                  <TextField label="Nama lengkap" value={regName} onChangeText={setRegName} autoComplete="name" />
                  <TextField
                    label="NIM"
                    accessibilityLabel="NIM"
                    placeholder="NIM Praktikan"
                    mono
                    value={regIdentifier}
                    onChangeText={setRegIdentifier}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <TextField
                    label="Email"
                    accessibilityLabel="Email pendaftaran"
                    value={regEmail}
                    onChangeText={setRegEmail}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                  />
                  <TextField
                    label="Kata sandi"
                    accessibilityLabel="Kata sandi pendaftaran"
                    hint="Minimal 6 karakter."
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry
                    autoComplete="new-password"
                  />
                  {!!error && <Notice tone="danger" message={error} alert />}
                  <Button
                    variant="primary"
                    label={busy ? 'Mendaftarkan…' : 'Daftar Sekarang'}
                    onPress={() => { void submitRegister(); }}
                    disabled={busy || !regName.trim() || !regIdentifier.trim() || !regEmail.trim() || !regPassword}
                  />
                  <Rule />
                  <View style={styles.switchRow}>
                    <Text style={styles.switchText}>Sudah memiliki akun?</Text>
                    <Button variant="quiet" compact label="Masuk di sini" onPress={() => switchMode(false)} />
                  </View>
                </View>
              )}

              {!login && !!error && <Notice tone="danger" message={error} alert />}
              {(onRetry || onLogout) && (
                <ActionRow>
                  {onRetry && <Button variant="primary" grow label="Coba lagi" onPress={onRetry} />}
                  {onLogout && <Button grow label="Keluar" onPress={onLogout} />}
                </ActionRow>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.xxl },
  scrollCompact: { padding: space.lg },
  shell: { width: '100%', maxWidth: layout.form, alignSelf: 'center', gap: space.xl },
  shellSplit: { maxWidth: 920, flexDirection: 'row', alignItems: 'flex-start', gap: space.huge },
  brand: { gap: space.lg },
  brandSplit: { flex: 1, paddingTop: space.xxl },
  brandRule: { width: 72 },
  content: { gap: space.xl },
  contentSplit: {
    width: layout.form,
    padding: space.xxxl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 16,
  },
  form: { gap: space.lg },
  formIntro: { gap: space.xs },
  formTitle: { ...type.heading, color: colors.text },
  formNote: { ...type.body, color: colors.textSecondary },
  switchRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', columnGap: space.xs },
  switchText: { ...type.body, color: colors.textSecondary },
});
