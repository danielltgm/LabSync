import { ArrowRight } from 'lucide-react-native';
import { useCallback, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

/** One line of "what will change", shown in the confirmation. */
export interface Change {
  label: string;
  from?: string;
  to: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  destructive,
  onConfirm,
  changes,
  reason,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (reason?: string) => void;
  changes?: Change[];
  reason?: ReasonOptions;
  children?: ReactNode;
}) {
  const [text, setText] = useState('');
  const missing = !!reason?.required && text.trim().length < 3;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[92vw] max-w-sm rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        {!!changes?.length && <ChangeList changes={changes} />}
        {reason && (
          <View className="gap-1.5">
            <Text className="text-sm font-semibold">
              {reason.label ?? 'Alasan'}
              {reason.required ? '' : ' (opsional)'}
            </Text>
            <Input value={text} onChangeText={setText} placeholder={reason.placeholder ?? 'Tulis alasan singkat'} />
            <Text className="text-muted-foreground text-xs">Tercatat di log perubahan dan tidak bisa dihapus.</Text>
          </View>
        )}
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl">
            <Text>Batal</Text>
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={missing}
            className={cn('rounded-xl', destructive && 'bg-destructive', missing && 'opacity-40')}
            onPress={() => {
              onConfirm(text.trim() || undefined);
              setText('');
            }}
          >
            <Text>{confirmLabel}</Text>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ChangeList({ changes }: { changes: Change[] }) {
  const shown = changes.slice(0, 6);
  return (
    <View className="bg-muted gap-2 rounded-2xl p-3">
      {shown.map((c, i) => (
        <View key={i} className="gap-0.5">
          <Text className="text-muted-foreground text-xs font-semibold" numberOfLines={1}>
            {c.label}
          </Text>
          <View className="flex-row flex-wrap items-center gap-1.5">
            {c.from !== undefined && (
              <>
                <Text className="text-muted-foreground text-sm line-through">{c.from}</Text>
                <Icon as={ArrowRight} className="text-muted-foreground size-3.5" />
              </>
            )}
            <Text className="text-sm font-bold">{c.to}</Text>
          </View>
        </View>
      ))}
      {changes.length > shown.length && (
        <Text className="text-muted-foreground text-xs">+{changes.length - shown.length} perubahan lain</Text>
      )}
    </View>
  );
}

export interface ReasonOptions {
  required?: boolean;
  label?: string;
  placeholder?: string;
}

export interface ConfirmOptions {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  changes?: Change[];
  reason?: ReasonOptions;
  onConfirm: (reason?: string) => void;
}

/**
 * Ask before a change is written. `confirm({...})` opens the dialog; render `dialog` once in the screen.
 * Used for edits that affect someone else's record: attendance overrides, leave decisions, roles, grades.
 */
export function useConfirm() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const confirm = useCallback((next: ConfirmOptions) => setOpts(next), []);
  const dialog = (
    <ConfirmDialog
      open={!!opts}
      onOpenChange={(o) => !o && setOpts(null)}
      title={opts?.title ?? ''}
      body={opts?.body ?? ''}
      confirmLabel={opts?.confirmLabel ?? 'Simpan'}
      destructive={opts?.destructive}
      changes={opts?.changes}
      reason={opts?.reason}
      onConfirm={(r) => opts?.onConfirm(r)}
    />
  );
  return { confirm, dialog };
}
