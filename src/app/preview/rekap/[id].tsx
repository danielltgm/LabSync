import { useLocalSearchParams } from 'expo-router';

import { IntegrationPreviewScreen } from '@/components/preview/IntegrationPreviewScreen';

export default function RecapPreview() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  return <IntegrationPreviewScreen kind="rekap" sessionId={typeof id === 'string' ? id : undefined} />;
}
