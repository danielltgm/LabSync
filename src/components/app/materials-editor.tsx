import { ExternalLink, Link2, Plus, Trash } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Chip } from '@/components/app/primitives';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import type { Material } from '@/data/types';

const SUGGESTED = ['Modul (PDF)', 'Slide', 'Starter project', 'Video', 'Form pengumpulan'];

/** Adds https:// when missing and checks it looks like a web address. */
export function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return /^https?:\/\/[^\s/$.?#]+\.[^\s]+$/i.test(withScheme) ? withScheme : null;
}

export function MaterialsEditor({ value, onChange, suggestions = SUGGESTED }: { value: Material[]; onChange: (v: Material[]) => void; suggestions?: string[] }) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const add = () => {
    const u = normalizeUrl(url);
    if (!u) return setError('Tautan tidak valid. Contoh: drive.google.com/…');
    const name = label.trim() || u.replace(/^https?:\/\//, '').split('/')[0];
    onChange([...value, { label: name, url: u }]);
    setLabel('');
    setUrl('');
    setError('');
  };

  return (
    <View className="gap-3">
      {value.length > 0 && (
        <View className="gap-2">
          {value.map((m, i) => (
            <View key={`${m.url}-${i}`} className="bg-card border-border flex-row items-center gap-3 rounded-2xl border p-2.5 pl-3">
              <Icon as={Link2} className="text-muted-foreground size-4" />
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold" numberOfLines={1}>
                  {m.label}
                </Text>
                <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                  {m.url}
                </Text>
              </View>
              <Pressable accessibilityRole="link" accessibilityLabel={`Buka ${m.label}`} onPress={() => void Linking.openURL(m.url)} className="bg-muted size-9 items-center justify-center rounded-full">
                <Icon as={ExternalLink} className="size-4" />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Hapus ${m.label}`}
                onPress={() => onChange(value.filter((_, k) => k !== i))}
                className="bg-danger-soft size-9 items-center justify-center rounded-full"
              >
                <Icon as={Trash} className="text-danger-ink size-4" />
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View className="border-border gap-2 rounded-2xl border border-dashed p-3">
        <View className="flex-row flex-wrap gap-2">
          {suggestions.map((s) => (
            <Chip key={s} label={s} active={label === s} onPress={() => setLabel(label === s ? '' : s)} />
          ))}
        </View>
        <Input value={label} onChangeText={setLabel} placeholder="Nama (opsional)" />
        <View className="flex-row gap-2">
          <Input
            className="flex-1"
            value={url}
            onChangeText={(v) => {
              setUrl(v);
              if (error) setError('');
            }}
            placeholder="Tautan, mis. drive.google.com/…"
            autoCapitalize="none"
            keyboardType="url"
            submitBehavior="submit"
            onSubmitEditing={add}
          />
          <Button className="size-12 rounded-2xl p-0" onPress={add} accessibilityLabel="Tambah materi" disabled={!url.trim()}>
            <Icon as={Plus} className="text-primary-foreground size-5" />
          </Button>
        </View>
        {!!error && <Text className="text-destructive text-xs">{error}</Text>}
      </View>
    </View>
  );
}
