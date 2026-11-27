import { Check, ShieldCheck, UserPlus, Users, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useConfirm } from '@/components/app/confirm';
import { Avatar, Chip, EmptyState, RowDivider, RowGroup, Segmented, Surface, SearchField } from '@/components/app/primitives';
import { Screen, Section, TabTitle } from '@/components/app/screen';
import { Pill, type Tone } from '@/components/app/status';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { useMe, useStore } from '@/data/store';
import type { Role, User } from '@/data/types';
import { cn } from '@/lib/utils';

const ROLE: Record<Role, { label: string; tone: Tone }> = {
  PRAKTIKAN: { label: 'Praktikan', tone: 'neutral' },
  ASPRAK: { label: 'Asprak', tone: 'brand' },
  ASLAB: { label: 'Aslab', tone: 'warning' },
};

type Tab = 'users' | 'assign' | 'requests';

export default function AdminConsole() {
  const { state, setRole, addUser, setClassAssistant, toast, markRead, resetPassword } = useStore();
  const me = useMe();
  const [tab, setTab] = useState<Tab>('users');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [editing, setEditing] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);
  const { confirm, dialog } = useConfirm();

  const users = useMemo(
    () =>
      state.users
        .filter((u) => roleFilter === 'all' || u.role === roleFilter)
        .filter((u) => !query || u.name.toLowerCase().includes(query.toLowerCase()) || u.nim.includes(query))
        .sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'ASLAB' ? -1 : a.role === 'ASPRAK' && b.role === 'PRAKTIKAN' ? -1 : 1)),
    [state.users, roleFilter, query],
  );
  const assistants = state.users.filter((u) => u.role === 'ASPRAK');
  const requests = state.notifications.filter((n) => n.nim === me.nim && n.type === 'SYSTEM' && n.href === '/admin' && !n.readAt);

  if (me.role !== 'ASLAB') {
    return (
      <Screen tabs>
        <TabTitle title="Pengguna" />
        <EmptyState icon={ShieldCheck} title="Khusus Aslab" body="Halaman ini hanya untuk akun Aslab." />
      </Screen>
    );
  }

  return (
    <Screen tabs>
      <TabTitle eyebrow="Konsol koordinator" title="Pengguna" />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'users', label: 'Pengguna', count: state.users.length },
          { value: 'assign', label: 'Penugasan' },
          { value: 'requests', label: 'Akses', count: requests.length },
        ]}
      />

      {tab === 'users' && (
        <View className="gap-3">
          <View className="flex-row gap-2">
            <SearchField className="flex-1" placeholder="Cari nama atau NIM" value={query} onChangeText={setQuery} />
            <Button className="h-12 rounded-full px-5" onPress={() => setAdding(true)}>
              <Icon as={UserPlus} className="text-primary-foreground size-4" />
              <Text>Asisten</Text>
            </Button>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Chip label="Semua" active={roleFilter === 'all'} onPress={() => setRoleFilter('all')} />
            {(Object.keys(ROLE) as Role[]).map((r) => (
              <Chip key={r} label={`${ROLE[r].label} ${state.users.filter((u) => u.role === r).length}`} active={roleFilter === r} onPress={() => setRoleFilter(r)} />
            ))}
          </View>
          <RowGroup>
            {users.slice(0, 80).map((u, i) => (
              <View key={u.nim}>
                {i > 0 && <RowDivider />}
                <Pressable accessibilityRole="button" onPress={() => setEditing(u)} className="active:bg-accent flex-row items-center gap-3 px-4 py-3">
                  <Avatar name={u.name} size="sm" />
                  <View className="min-w-0 flex-1">
                    <Text className="text-[15px] font-medium" numberOfLines={1}>{u.name}</Text>
                    <Text className="text-muted-foreground font-mono text-xs">{u.nim}</Text>
                  </View>
                  <Pill tone={ROLE[u.role].tone} label={ROLE[u.role].label} />
                </Pressable>
              </View>
            ))}
          </RowGroup>
        </View>
      )}

      {tab === 'assign' && (
        <View className="gap-3">
          {state.classes.map((cls) => {
            const course = state.courses.find((c) => c.id === cls.courseId)!;
            return (
              <Surface key={cls.id} className="gap-3 p-4">
                <View>
                  <Text className="font-semibold">{course.name} · {cls.label}</Text>
                  <Text className="text-muted-foreground text-xs">{cls.studentNims.length} praktikan · {cls.assistantNims.length} asisten</Text>
                </View>
                {assistants.map((a) => {
                  const on = cls.assistantNims.includes(a.nim);
                  return (
                    <View key={a.nim} className="flex-row items-center gap-3">
                      <Avatar name={a.name} size="sm" />
                      <Text className={cn('min-w-0 flex-1 text-sm', on ? 'font-semibold' : 'text-muted-foreground')} numberOfLines={1}>{a.name}</Text>
                      <Switch
                        checked={on}
                        onCheckedChange={(v) =>
                          confirm({
                            title: v ? 'Tugaskan asisten?' : 'Lepas asisten?',
                            body: v ? `${a.name} bisa membuka sesi dan mengelola presensi kelas ini.` : `${a.name} tidak lagi bisa mengelola kelas ini.`,
                            confirmLabel: v ? 'Tugaskan' : 'Lepas',
                            destructive: !v,
                            changes: [{ label: `${course.name} · ${cls.label}`, from: v ? undefined : a.name, to: v ? `+ ${a.name}` : 'Dilepas' }],
                            onConfirm: () => setClassAssistant(cls.id, a.nim, v),
                          })
                        }
                      />
                    </View>
                  );
                })}
              </Surface>
            );
          })}
        </View>
      )}

      {tab === 'requests' && (
        <Section>
          {requests.length === 0 ? (
            <Surface><EmptyState icon={Users} title="Tidak ada permintaan" body="Permintaan akses asisten dari praktikan muncul di sini." /></Surface>
          ) : (
            requests.map((r) => {
              const candidate = state.users.find((u) => r.body.startsWith(u.name));
              return (
                <Surface key={r.id} className="gap-3 p-4">
                  <View className="flex-row items-center gap-3">
                    <Avatar name={candidate?.name ?? '?'} />
                    <View className="min-w-0 flex-1">
                      <Text className="font-semibold">{candidate?.name ?? 'Pengguna'}</Text>
                      <Text className="text-muted-foreground text-xs">{candidate?.nim}</Text>
                    </View>
                  </View>
                  <Text className="text-sm">{r.body}</Text>
                  <View className="flex-row gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl" onPress={() => { markRead(r.id); toast({ title: 'Permintaan ditolak', tone: 'default' }); }}>
                      <Icon as={X} className="size-4" />
                      <Text>Tolak</Text>
                    </Button>
                    <Button
                      className="flex-1 rounded-xl"
                      onPress={() => {
                        if (candidate) setRole(candidate.nim, 'ASPRAK');
                        markRead(r.id);
                        toast({ title: `${candidate?.name} sekarang asisten`, body: 'Tugaskan ke kelas di tab Penugasan.', tone: 'success' });
                      }}
                    >
                      <Icon as={Check} className="text-primary-foreground size-4" />
                      <Text>Jadikan asisten</Text>
                    </Button>
                  </View>
                </Surface>
              );
            })
          )}
        </Section>
      )}

      <RoleDialog
        user={editing}
        onClose={() => setEditing(null)}
        onSave={(role) => {
          if (!editing) return;
          const user = editing;
          setEditing(null);
          confirm({
            title: 'Ubah peran?',
            body: role === 'PRAKTIKAN' ? `${user.name} kehilangan akses asisten di semua kelas.` : `${user.name} dapat akses ${ROLE[role].label.toLowerCase()}.`,
            confirmLabel: 'Ubah peran',
            destructive: role === 'PRAKTIKAN',
            changes: [{ label: user.name, from: ROLE[user.role].label, to: ROLE[role].label }],
            onConfirm: () => {
              setRole(user.nim, role);
              toast({ title: 'Peran diperbarui', body: `${user.name} → ${ROLE[role].label}`, tone: 'success' });
            },
          });
        }}
        self={editing?.nim === me.nim}
      />
      <AddAssistantDialog
        open={adding}
        onClose={() => setAdding(false)}
        existing={(nim) => state.users.find((u) => u.nim === nim)}
        onSave={async (u, isNew) => {
          setAdding(false);
          await addUser(u);
          // New logins set their own password through Firebase's reset email; nobody else ever sees it.
          if (isNew && u.email) await resetPassword(u.email).catch(() => undefined);
          toast({
            title: isNew ? 'Akun asisten dibuat' : 'Peran diperbarui',
            body: isNew ? `Link atur kata sandi dikirim ke ${u.email}. ${u.name} lalu bisa masuk dengan NIM ${u.nim}.` : `${u.name} sekarang asisten.`,
            tone: 'success',
          });
        }}
      />
      {dialog}
    </Screen>
  );
}

function RoleDialog({ user, onClose, onSave, self }: { user: User | null; onClose: () => void; onSave: (r: Role) => void; self: boolean }) {
  const [role, setRole] = useState<Role>('PRAKTIKAN');
  const [prev, setPrev] = useState<User | null>(null);
  if (user !== prev) {
    setPrev(user);
    if (user) setRole(user.role);
  }
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>{user?.name}</DialogTitle>
          <DialogDescription>NIM {user?.nim}. Perubahan peran berlaku saat pengguna membuka aplikasi lagi.</DialogDescription>
        </DialogHeader>
        <View className="gap-2">
          {(Object.keys(ROLE) as Role[]).map((r) => (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ checked: role === r }}
              disabled={self}
              onPress={() => setRole(r)}
              className={cn('flex-row items-center gap-3 rounded-2xl border p-3', role === r ? 'border-primary bg-brand-soft' : 'border-border')}
            >
              <View className={cn('size-5 items-center justify-center rounded-full border-2', role === r ? 'border-primary' : 'border-input')}>
                {role === r && <View className="bg-primary size-2.5 rounded-full" />}
              </View>
              <Text className="font-medium">{ROLE[r].label}</Text>
            </Pressable>
          ))}
        </View>
        {self && <Text className="text-muted-foreground text-xs">Kamu tidak bisa mengubah peranmu sendiri.</Text>}
        <DialogFooter>
          <Button className="h-11 rounded-xl" disabled={self || role === user?.role} onPress={() => onSave(role)}>
            <Text>Simpan peran</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddAssistantDialog({ open, onClose, onSave, existing }: { open: boolean; onClose: () => void; onSave: (u: User, isNew: boolean) => void; existing: (nim: string) => User | undefined }) {
  const [nim, setNim] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const found = existing(nim);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const valid = /^\d{8,20}$/.test(nim) && (found || (name.trim().length >= 3 && emailOk));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[92vw] max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle>Tambah asisten</DialogTitle>
          <DialogDescription>Akun asisten memakai NIM sebagai ID. Jika NIM sudah terdaftar, perannya dinaikkan. Akun baru menerima email untuk mengatur kata sandi.</DialogDescription>
        </DialogHeader>
        <View className="gap-2">
          <Label nativeID="anim">NIM</Label>
          <Input aria-labelledby="anim" keyboardType="number-pad" value={nim} onChangeText={(v) => setNim(v.replace(/\D/g, ''))} placeholder="24060122130045" />
          {found && <Text className="text-success-ink text-xs">Terdaftar: {found.name} ({ROLE[found.role].label})</Text>}
        </View>
        {!found && (
          <>
            <View className="gap-2">
              <Label nativeID="aname">Nama lengkap</Label>
              <Input aria-labelledby="aname" value={name} onChangeText={setName} />
            </View>
            <View className="gap-2">
              <Label nativeID="amail">Email</Label>
              <Input aria-labelledby="amail" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="nama@students.undip.ac.id" />
            </View>
          </>
        )}
        <DialogFooter>
          <Button
            className="h-11 rounded-xl"
            disabled={!valid}
            onPress={() => {
              onSave(found ? { ...found, role: 'ASPRAK' } : { nim, name: name.trim(), email: email.trim().toLowerCase(), role: 'ASPRAK' }, !found);
              setNim('');
              setName('');
              setEmail('');
            }}
          >
            <Text>{found ? 'Jadikan asisten' : 'Buat akun asisten'}</Text>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
