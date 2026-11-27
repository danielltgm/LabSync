import { FileSpreadsheet, History } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AuditList, LOG_KIND, LogIntegrity } from '@/components/app/audit-list';
import { Chip, EmptyState, SearchField } from '@/components/app/primitives';
import { Screen, TabTitle } from '@/components/app/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { userByNim } from '@/data/selectors';
import { useMe, useMyClasses, useStore } from '@/data/store';
import type { LogKind } from '@/data/types';
import { exportAuditLog, exportErrorMessage } from '@/lib/export';

/**
 * Change log. Koordinator: everything. Asisten: changes in their own classes (by anyone).
 * Praktikan has no access.
 */
export default function LogScreen() {
  const { state, toast } = useStore();
  const me = useMe();
  const classes = useMyClasses();
  const isAdmin = me.role === 'ASLAB';
  const [kind, setKind] = useState<LogKind | 'all'>('all');
  const [classId, setClassId] = useState<string>('all');
  const [query, setQuery] = useState('');

  const scope = useMemo(() => {
    if (isAdmin) return state.log;
    const mine = new Set(classes.map((c) => c.id));
    return state.log.filter((e) => e.classId && mine.has(e.classId));
  }, [isAdmin, state.log, classes]);

  const entries = scope.filter((e) => {
    if (kind !== 'all' && e.kind !== kind) return false;
    if (classId !== 'all' && e.classId !== classId) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const who = userByNim(state, e.actor)?.name ?? '';
    return [e.summary, e.target, e.reason ?? '', who, ...(e.changes ?? []).map((c) => `${c.label} ${c.from ?? ''} ${c.to}`)].join(' ').toLowerCase().includes(q);
  });
  const kinds = (Object.keys(LOG_KIND) as LogKind[]).filter((k) => scope.some((e) => e.kind === k));

  if (me.role === 'PRAKTIKAN') {
    return (
      <Screen tabs>
        <EmptyState icon={History} title="Khusus asisten dan koordinator" body="Log perubahan hanya bisa dilihat staf lab." />
      </Screen>
    );
  }

  return (
    <Screen tabs>
      <TabTitle
        eyebrow={isAdmin ? 'Semua kelas dan pengaturan' : `${classes.length} kelas yang kamu pegang`}
        title="Log perubahan"
        right={
          <Button
            variant="outline"
            className="h-10 rounded-full px-4"
            onPress={() =>
              exportAuditLog(state, entries)
                .then(() => toast({ title: 'File log siap', body: `${entries.length} catatan.`, tone: 'success' }))
                .catch((e) => toast({ title: exportErrorMessage(e), tone: 'danger' }))
            }
          >
            <Icon as={FileSpreadsheet} className="size-4" />
            <Text>Export</Text>
          </Button>
        }
      />
      <LogIntegrity />
      <SearchField placeholder="Cari nama, nilai, alasan…" value={query} onChangeText={setQuery} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 grow-0" contentContainerClassName="gap-2 px-4">
        <Chip label="Semua" active={kind === 'all'} onPress={() => setKind('all')} />
        {kinds.map((k) => (
          <Chip key={k} label={LOG_KIND[k].label} icon={LOG_KIND[k].icon} active={kind === k} onPress={() => setKind(k)} />
        ))}
      </ScrollView>
      {classes.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 grow-0" contentContainerClassName="gap-2 px-4">
          <Chip label="Semua kelas" active={classId === 'all'} onPress={() => setClassId('all')} />
          {classes.map((c) => {
            const course = state.courses.find((x) => x.id === c.courseId);
            return <Chip key={c.id} label={`${course?.name.split(' ').map((w) => w[0]).join('') ?? ''} · ${c.label}`} active={classId === c.id} onPress={() => setClassId(c.id)} />;
          })}
        </ScrollView>
      )}
      <View>
        <Text className="text-muted-foreground mb-3 text-xs">
          {entries.length} catatan{entries.length !== scope.length ? ` dari ${scope.length}` : ''}
        </Text>
        <AuditList entries={entries} showClass empty="Tidak ada catatan yang cocok." />
      </View>
    </Screen>
  );
}
