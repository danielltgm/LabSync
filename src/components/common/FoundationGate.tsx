import { signInWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Button, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { firebase } from '@/firebase/client';
import { registerAccount } from '@/services/registration';
import type { UserRole } from '@/types/user';

export function FoundationGate({ login, loading, message, onRetry, onLogout }: {
  login?: boolean;
  loading?: boolean;
  message?: string;
  onRetry?: () => void;
  onLogout?: () => void;
}) {
  const [isRegistering, setIsRegistering] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regIdentifier, setRegIdentifier] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('PRAKTISAN');

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
        role: regRole,
      });

      if (!result.success) {
        setError(result.error ?? 'Pendaftaran akun gagal.');
      }
    } catch {
      setError('Terjadi kesalahan saat pendaftaran.');
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
            {login && !isRegistering && (
              <>
                <Text style={styles.text}>Masuk dengan akun LabSync.</Text>
                <TextInput accessibilityLabel="Email" placeholder="Email" style={styles.input} value={email}
                  onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
                <TextInput accessibilityLabel="Kata sandi" placeholder="Kata sandi" style={styles.input}
                  value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password"
                  onSubmitEditing={() => { void submitLogin(); }} />
                <Button title={busy ? 'Masuk…' : 'Masuk'} onPress={() => { void submitLogin(); }} disabled={busy || !email.trim() || !password} />

                <View style={styles.switchContainer}>
                  <Text style={styles.textSecondary}>Belum memiliki akun?</Text>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.switchButton}
                    onPress={() => {
                      setError('');
                      setIsRegistering(true);
                    }}
                  >
                    <Text style={styles.switchLink}>Daftar Akun Baru</Text>
                  </Pressable>
                </View>
              </>
            )}
            {login && isRegistering && (
              <>
                <Text style={styles.text}>Daftar Akun Baru LabSync.</Text>
                <TextInput
                  accessibilityLabel="Nama lengkap"
                  placeholder="Nama Lengkap"
                  style={styles.input}
                  value={regName}
                  onChangeText={setRegName}
                />
                <TextInput
                  accessibilityLabel={regRole === 'ASISTEN' ? 'Kode asisten' : 'NIM'}
                  placeholder={regRole === 'ASISTEN' ? 'Kode Asisten (misal: AST-01)' : 'NIM Praktikan (misal: 123210001)'}
                  style={styles.input}
                  value={regIdentifier}
                  onChangeText={setRegIdentifier}
                  autoCapitalize={regRole === 'ASISTEN' ? 'characters' : 'none'}
                />
                <TextInput
                  accessibilityLabel="Email pendaftaran"
                  placeholder="Email"
                  style={styles.input}
                  value={regEmail}
                  onChangeText={setRegEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
                <TextInput
                  accessibilityLabel="Kata sandi pendaftaran"
                  placeholder="Kata Sandi (minimal 6 karakter)"
                  style={styles.input}
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secureTextEntry
                  autoComplete="new-password"
                />

                <Text style={styles.roleLabel}>Pilih Peran:</Text>
                <View style={styles.roleRow}>
                  <Pressable
                    style={[styles.roleOption, regRole === 'PRAKTISAN' && styles.roleOptionActive]}
                    onPress={() => setRegRole('PRAKTISAN')}
                  >
                    <Text style={[styles.roleText, regRole === 'PRAKTISAN' && styles.roleTextActive]}>
                      Praktikan
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[styles.roleOption, regRole === 'ASISTEN' && styles.roleOptionActive]}
                    onPress={() => setRegRole('ASISTEN')}
                  >
                    <Text style={[styles.roleText, regRole === 'ASISTEN' && styles.roleTextActive]}>
                      Asisten Lab
                    </Text>
                  </Pressable>
                </View>

                <Button
                  title={busy ? 'Mendaftarkan…' : 'Daftar Sekarang'}
                  onPress={() => { void submitRegister(); }}
                  disabled={busy || !regName.trim() || !regIdentifier.trim() || !regEmail.trim() || !regPassword}
                />

                <View style={styles.switchContainer}>
                  <Text style={styles.textSecondary}>Sudah memiliki akun?</Text>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.switchButton}
                    onPress={() => {
                      setError('');
                      setIsRegistering(false);
                    }}
                  >
                    <Text style={styles.switchLink}>Masuk di sini</Text>
                  </Pressable>
                </View>
              </>
            )}
            {!!error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
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
  textSecondary: { ...type.caption, color: colors.textSecondary },
  input: {
    ...type.body,
    color: colors.text,
    borderColor: colors.borderDark,
    borderWidth: 1,
    borderRadius: radii.sm,
    minHeight: 48,
    padding: space.md,
    backgroundColor: colors.surface,
  },
  roleLabel: { ...type.caption, color: colors.textSecondary, marginBottom: -space.sm },
  roleRow: { flexDirection: 'row', gap: space.md },
  roleOption: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.sm,
  },
  roleOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  roleText: { ...type.button, color: colors.textSecondary },
  roleTextActive: { color: colors.primary, fontWeight: '700' },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    marginTop: space.xs,
  },
  switchButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
  switchLink: { ...type.button, color: colors.primary, textDecorationLine: 'underline' },
  errorText: { ...type.body, color: colors.danger.text },
});
