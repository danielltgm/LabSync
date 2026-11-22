
import { collection, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import type { LabActivityDocument, LabId } from '@/types/sprint3';
import { activityAt, activityWindow, mapCoordinates, type MapActivity } from '@/utils/lab-activity';
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

export function useLabActivity(labId: LabId | null, active: boolean, retry: number) {
  const [now, setNow] = useState(Date.now);
  const { start, end, rollover } = activityWindow(now);
  const [snapshot, setSnapshot] = useState<{ key: string; items: MapActivity[]; error: string }>();
  const key = [labId, start, retry].join('/');
  const data = snapshot?.key === key ? snapshot : undefined;

  useEffect(() => {
    if (!active || !labId || !firebase) return;
    const activities = query(collection(firebase.db, 'labActivities'),
      where('labId', '==', labId), where('endsAt', '>', Timestamp.fromMillis(start)),
      where('startsAt', '<', Timestamp.fromMillis(end)));
    return onSnapshot(activities, { includeMetadataChanges: true }, (result) => {
      const items = result.docs.flatMap((doc) => {
        const row = doc.data() as Partial<LabActivityDocument>;
        if (!(row.startsAt instanceof Timestamp) || !(row.endsAt instanceof Timestamp)
          || typeof row.courseName !== 'string' || typeof row.className !== 'string'
          || (row.status !== 'TERJADWAL' && row.status !== 'DIBUKA')) return [];
        const start = row.startsAt.toMillis();
        const end = row.endsAt.toMillis();
        return end > start ? [{ sessionId: doc.id, start, end, courseName: row.courseName, className: row.className, status: row.status }] : [];
      });
      setSnapshot({ key, items, error: result.metadata.fromCache ? 'Aktivitas dari cache. Menunggu jaringan.' : '' });
    }, () => setSnapshot({ key, items: [], error: 'Aktivitas gagal dimuat. Cek jaringan atau coba lagi.' }));
  }, [active, labId, start, end, key]);

  useEffect(() => {
    if (!active) return;
    const currentTime = Date.now();
    const boundary = (data?.items ?? []).reduce((closest, item) => {
      return Math.min(closest, item.start > now ? item.start : Infinity, item.end > now ? item.end : Infinity);
    }, rollover);
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, Math.min(boundary - currentTime, 60_000)));
    return () => clearTimeout(timer);
  }, [active, data, now, rollover]);

  return { ...activityAt(data?.items ?? [], now), loading: !!labId && !data, error: data?.error, end };
}
