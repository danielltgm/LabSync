import { Bold, Eye, Heading, List, PencilLine, Pilcrow, Type } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { Pressable, View, type TextInputSelectionChangeEvent } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/*
 * Light formatting for "keterangan", stored as plain text so it survives anywhere (push body, export):
 *   # Judul       heading
 *   - item        list item
 *   ~ catatan     small, light note
 *   **tebal**     bold (inline)
 * Anything else is normal text.
 */

const PREFIXES = ['# ', '- ', '~ '] as const;

function Inline({ text, className }: { text: string; className: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text className={className}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
          <Text key={i} className={cn(className, 'font-bold')}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </Text>
  );
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, '').split('\n');
  return (
    <View className={cn('gap-1.5', className)}>
      {lines.map((line, i) => {
        if (!line.trim()) return <View key={i} className="h-1" />;
        if (line.startsWith('# ')) return <Inline key={i} text={line.slice(2)} className="pt-1 text-[17px] font-bold leading-6" />;
        if (line.startsWith('~ ')) return <Inline key={i} text={line.slice(2)} className="text-muted-foreground text-[13px] font-light leading-5" />;
        if (line.startsWith('- '))
          return (
            <View key={i} className="flex-row gap-2 pl-1">
              <Text className="text-[15px] leading-6">•</Text>
              <Inline text={line.slice(2)} className="min-w-0 flex-1 text-[15px] leading-6" />
            </View>
          );
        return <Inline key={i} text={line} className="text-[15px] leading-6" />;
      })}
    </View>
  );
}

/** Text without markers, for one-line previews and notifications. */
export function plainText(text: string) {
  return text
    .split('\n')
    .map((l) => (PREFIXES.some((p) => l.startsWith(p)) ? l.slice(2) : l))
    .join(' ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

type LineStyle = 'normal' | '# ' | '- ' | '~ ';

/** Textarea with a small toolbar (Normal, Judul, Daftar, Kecil, Tebal) and a preview toggle. */
export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [sel, setSel] = useState({ start: value.length, end: value.length });
  const [preview, setPreview] = useState(false);

  const lineBounds = () => {
    const start = value.lastIndexOf('\n', Math.max(0, sel.start - 1)) + 1;
    const nl = value.indexOf('\n', sel.start);
    return { start, end: nl === -1 ? value.length : nl };
  };
  const currentStyle = (): LineStyle => {
    const { start } = lineBounds();
    return PREFIXES.find((p) => value.startsWith(p, start)) ?? 'normal';
  };
  const setLineStyle = (style: LineStyle) => {
    const { start, end } = lineBounds();
    let line = value.slice(start, end);
    const had = PREFIXES.find((p) => line.startsWith(p));
    if (had) line = line.slice(2);
    if (style !== 'normal') line = style + line;
    onChange(value.slice(0, start) + line + value.slice(end));
  };
  const bold = () => {
    const { start, end } = sel;
    const picked = value.slice(start, end);
    const inner = picked || 'teks tebal';
    onChange(value.slice(0, start) + `**${inner}**` + value.slice(end));
  };
  const active = currentStyle();

  const tools: { key: string; icon: typeof Bold; label: string; on?: boolean; press: () => void }[] = [
    { key: 'normal', icon: Pilcrow, label: 'Normal', on: active === 'normal', press: () => setLineStyle('normal') },
    { key: 'h', icon: Heading, label: 'Judul', on: active === '# ', press: () => setLineStyle('# ') },
    { key: 'list', icon: List, label: 'Daftar', on: active === '- ', press: () => setLineStyle('- ') },
    { key: 'small', icon: Type, label: 'Kecil', on: active === '~ ', press: () => setLineStyle('~ ') },
    { key: 'bold', icon: Bold, label: 'Tebal', press: bold },
  ];

  return (
    <View className="border-input overflow-hidden rounded-2xl border">
      <View className="bg-muted border-input flex-row flex-wrap items-center gap-1 border-b p-1.5">
        {tools.map((t) => (
          <Pressable
            key={t.key}
            accessibilityRole="button"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: !!t.on }}
            disabled={preview}
            onPress={t.press}
            className={cn('h-9 flex-row items-center gap-1 rounded-xl px-2.5 disabled:opacity-40', t.on ? 'bg-foreground' : 'active:bg-accent')}
          >
            <Icon as={t.icon} className={cn('size-4', t.on && 'text-background')} />
            <Text className={cn('text-xs font-semibold', t.on && 'text-background')}>{t.label}</Text>
          </Pressable>
        ))}
        <View className="flex-1" />
        <Pressable
          accessibilityRole="button"
          onPress={() => setPreview((p) => !p)}
          className={cn('h-9 flex-row items-center gap-1 rounded-xl px-2.5', preview ? 'bg-primary' : 'active:bg-accent')}
        >
          <Icon as={preview ? PencilLine : Eye} className={cn('size-4', preview && 'text-primary-foreground')} />
          <Text className={cn('text-xs font-semibold', preview && 'text-primary-foreground')}>{preview ? 'Edit' : 'Pratinjau'}</Text>
        </Pressable>
      </View>
      {preview ? (
        <View className="bg-card min-h-32 p-3">{value.trim() ? <RichText text={value} /> : <Text className="text-muted-foreground text-sm">Belum ada keterangan.</Text>}</View>
      ) : (
        <Textarea
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          onSelectionChange={(e: TextInputSelectionChangeEvent) => setSel(e.nativeEvent.selection)}
          className="min-h-32 rounded-none border-0"
        />
      )}
    </View>
  );
}
