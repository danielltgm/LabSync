import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  LabSyncColors as colors,
  LabSyncRadii as radii,
  LabSyncSpacing as space,
  LabSyncTypography as type,
} from '@/constants/labsync-theme';
import type { UserProfile, UserRole } from '@/types/user';

export interface RoleSwitcherProps {
  activeRole: UserRole;
  students: readonly UserProfile[];
  activeStudentId: string | null;
  onRoleChange: (role: UserRole) => void;
  onStudentChange: (studentId: string) => void;
}

const roles = [
  { value: 'ASISTEN', label: 'Asisten' },
  { value: 'PRAKTISAN', label: 'Praktikan' },
] as const;

export function RoleSwitcher({
  activeRole,
  students,
  activeStudentId,
  onRoleChange,
  onStudentChange,
}: RoleSwitcherProps) {
  const studentOptions = students.filter((student) => student.role === 'PRAKTISAN');

  return (
    <View style={styles.container}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Peran pengguna" style={styles.roles}>
        {roles.map(({ value, label }) => (
          <Pressable
            key={value}
            accessibilityRole="radio"
            accessibilityState={{ checked: activeRole === value }}
            aria-checked={activeRole === value}
            onPress={() => onRoleChange(value)}
            style={({ pressed }) => [
              styles.role,
              activeRole === value && styles.selectedRole,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.roleLabel, activeRole === value && styles.selectedRoleLabel]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeRole === 'PRAKTISAN' && (
        <View style={styles.identities}>
          <Text style={styles.label}>Identitas praktikan</Text>
          {studentOptions.length === 0 ? (
            <Text style={styles.hint}>Belum ada identitas praktikan yang tersedia.</Text>
          ) : (
            <View accessibilityRole="radiogroup" accessibilityLabel="Pilih praktikan" style={styles.options}>
              {studentOptions.map((student) => (
                <Pressable
                  key={student.id}
                  accessibilityRole="radio"
                  accessibilityLabel={`${student.name}, NIM ${student.identifier}`}
                  accessibilityState={{ checked: activeStudentId === student.id }}
                  aria-checked={activeStudentId === student.id}
                  onPress={() => onStudentChange(student.id)}
                  style={({ pressed }) => [
                    styles.identity,
                    activeStudentId === student.id && styles.selectedIdentity,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.name}>{student.name}</Text>
                  <Text style={styles.hint}>{student.identifier}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.lg },
  roles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: space.xs,
    gap: space.xs,
    backgroundColor: colors.neutral.background,
    borderRadius: radii.xl,
  },
  role: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 48,
    padding: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  selectedRole: { backgroundColor: colors.primary },
  roleLabel: { ...type.button, color: colors.textSecondary, textAlign: 'center' },
  selectedRoleLabel: { color: colors.surface },
  identities: { gap: space.sm },
  label: { ...type.button, color: colors.text },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  identity: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 48,
    padding: space.md,
    gap: space.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  selectedIdentity: { backgroundColor: colors.primarySurface, borderColor: colors.primary },
  name: { ...type.button, color: colors.text },
  hint: { ...type.caption, color: colors.textSecondary },
  pressed: { opacity: 0.8 },
});

export default RoleSwitcher;
