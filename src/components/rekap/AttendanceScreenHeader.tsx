import { Button, Notice, PageHeader } from '@/components/common/ui';

export function AttendanceScreenHeader({ title, onBack, notice, onRetry }: {
  title: string;
  onBack: () => void;
  notice?: string;
  onRetry?: () => void;
}) {
  return (
    <PageHeader title={title} onBack={onBack}>
      {!!notice && (
        <Notice tone="danger" message={notice} alert>
          {onRetry && <Button compact label="Coba lagi" onPress={onRetry} />}
        </Notice>
      )}
    </PageHeader>
  );
}
