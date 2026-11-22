
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import type { LabId } from '@/types/sprint3';
import { mapCoordinates } from '@/utils/lab-activity';
import { REQUIRED_LABS } from '@/utils/sprint3-config';

export function useLabs(active: boolean, retry: number) {
  const [rows, setRows] = useState<Record<string, { name: string; coordinates: ReturnType<typeof mapCoordinates> }>>();
  const [error, setError] = useState('');
  useEffect(() => {
    if (!firebase || !active) return;
    return onSnapshot(collection(firebase.db, 'labs'), { includeMetadataChanges: true }, (snapshot) => {
      setRows(Object.fromEntries(snapshot.docs.map((doc) => {
        const data = doc.data();
        return [doc.id, { name: typeof data.name === 'string' ? data.name : '', coordinates: data.enabled === true ? mapCoordinates(data.coordinates) : null }];
      })));
      setError(snapshot.metadata.fromCache ? 'Koneksi Firestore belum aktif. Data lab bisa belum terbaru.' : '');
    }, () => {
      setRows({});
      setError('Daftar lab gagal dimuat. Cek koneksi atau coba lagi.');
    });
  }, [active, retry]);

  const labs = (Object.keys(REQUIRED_LABS) as LabId[]).map((id) => ({
    id, name: rows?.[id]?.name || REQUIRED_LABS[id], coordinates: rows?.[id]?.coordinates ?? null,
  }));
  return { labs, loading: !rows && !error, error };
}
