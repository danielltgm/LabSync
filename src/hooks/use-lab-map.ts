
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import type { LabId } from '@/types/sprint3';
import { mapCoordinates } from '@/utils/lab-activity';
import { REQUIRED_LABS } from '@/utils/sprint3-config';

export function useLabs(active: boolean) {
  const [rows, setRows] = useState<Record<string, { name: string; coordinates: ReturnType<typeof mapCoordinates> }>>();
  useEffect(() => {
    if (!firebase || !active) return;
    return onSnapshot(collection(firebase.db, 'labs'), (snapshot) => {
      setRows(Object.fromEntries(snapshot.docs.map((doc) => {
        const data = doc.data();
        return [doc.id, { name: typeof data.name === 'string' ? data.name : '', coordinates: data.enabled === true ? mapCoordinates(data.coordinates) : null }];
      })));
    }, () => setRows({}));
  }, [active]);

  const labs = (Object.keys(REQUIRED_LABS) as LabId[]).map((id) => ({
    id, name: rows?.[id]?.name || REQUIRED_LABS[id], coordinates: rows?.[id]?.coordinates ?? null,
  }));
  return { labs, loading: !rows };
}
