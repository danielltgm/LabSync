import { Redirect, useLocalSearchParams } from 'expo-router';

export default function RecapPreview() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  return <Redirect href={typeof id === 'string' ? { pathname: '/rekap/[id]', params: { id } } : '/'} />;
}
