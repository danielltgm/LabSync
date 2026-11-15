import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import { registerAccount } from '@/services/registration';
import type { UserRole } from '@/types/user';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('PRAKTISAN');

  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
    if (busy) return;
    setError('');
    setBusy(true);

    try {
      const result = await registerAccount({
        name,
        identifier,
        email,
        password,
        role,
      });

      if (!result.success) {
        setError(result.error ?? 'Pendaftaran akun gagal.');
      } else {
        // Pendaftaran berhasil, user sudah login di Auth & watcher akan diarahkan
        router.replace('/');
      }
    } catch {
      setError('Terjadi kesalahan saat pendaftaran.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>
            Daftar Akun LabSync
          </Text>
          <Text style={styles.subtitle}>
            Buat akun baru untuk mulai mengakses jadwal dan praktikum.
          </Text>

          {busy && <ActivityIndicator color={colors.primary} />}

          <TextInput
            accessibilityLabel="Nama lengkap"
            placeholder="Nama Lengkap"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            accessibilityLabel={role === 'ASISTEN' ? 'Kode asisten' : 'NIM'}
            placeholder={role === 'ASISTEN' ? 'Kode Asisten (misal: AST-01)' : 'NIM Praktikan (misal: 123210001)'}
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize={role === 'ASISTEN' ? 'characters' : 'none'}
          />

          <TextInput
            accessibilityLabel="Email"
            placeholder="Email"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <TextInput
            accessibilityLabel="Kata sandi"
            placeholder="Kata Sandi (minimal 6 karakter)"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <Text style={styles.roleLabel}>Pilih Peran:</Text>
          <View style={styles.roleRow}>
            <Pressable
              accessibilityRole="button"
              style={[styles.roleOption, role === 'PRAKTISAN' && styles.roleOptionActive]}
              onPress={() => setRole('PRAKTISAN')}
            >
              <Text style={[styles.roleText, role === 'PRAKTISAN' && styles.roleTextActive]}>
                Praktikan
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.roleOption, role === 'ASISTEN' && styles.roleOptionActive]}
              onPress={() => setRole('ASISTEN')}
            >
              <Text style={[styles.roleText, role === 'ASISTEN' && styles.roleTextActive]}>
                Asisten Lab
              </Text>
            </Pressable>
          </View>

          {!!error && (
            <Text accessibilityRole="alert" style={styles.errorText}>
              {error}
            </Text>
          )}

          <Button
            title={busy ? 'Mendaftarkan…' : 'Daftar Sekarang'}
            onPress={() => { void handleRegister(); }}
            disabled={busy || !name.trim() || !identifier.trim() || !email.trim() || !password}
          />

          <View style={styles.switchContainer}>
            <Text style={styles.textSecondary}>Sudah memiliki akun?</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.switchButton}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.switchLink}>Masuk di sini</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.lg },
  content: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: space.lg },
  title: { ...type.title, color: colors.primary },
  subtitle: { ...type.body, color: colors.textSecondary },
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
