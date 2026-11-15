import { useEffect, useState } from 'react';

import { firebase } from '@/firebase/client';
import { watchClassesForAssistant, type ManagedClass } from '@/firebase/queries';
import {
  createClass,
  deleteClass,
  updateClass,
} from '@/services/classService';

const emptyClasses: ManagedClass[] = [];

export function useClasses(assistantUid?: string) {
  const [snapshot, setSnapshot] = useState<{ uid: string; classes: ManagedClass[]; error?: string }>();

  useEffect(() => {
    if (!firebase || !assistantUid) return;

    return watchClassesForAssistant(
      firebase.db,
      assistantUid,
      (classes) => setSnapshot({ uid: assistantUid, classes }),
      (err) =>
        setSnapshot({
          uid: assistantUid,
          classes: emptyClasses,
          error: err.message || 'Gagal memuat data kelas.',
        })
    );
  }, [assistantUid]);

  const isCurrent = snapshot && snapshot.uid === assistantUid;
  const classes = isCurrent ? snapshot.classes : emptyClasses;
  const loading = !snapshot && !!assistantUid;
  const error = isCurrent ? snapshot.error : undefined;

  async function handleCreate(name: string) {
    if (!assistantUid) return { success: false, error: 'Asisten tidak valid.' };
    return createClass(name, assistantUid);
  }

  async function handleUpdate(classId: string, name: string) {
    return updateClass(classId, name);
  }

  async function handleDelete(classId: string) {
    return deleteClass(classId);
  }

  return {
    classes,
    loading,
    error,
    createClass: handleCreate,
    updateClass: handleUpdate,
    deleteClass: handleDelete,
  };
}
