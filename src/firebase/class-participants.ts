import { firebase } from '@/firebase/client';
import type { ParticipantPage } from '@/types/class-participants';

export async function fetchClassParticipants(
  classId: string,
  options: { cursor?: string; identifier?: string; signal?: AbortSignal } = {},
): Promise<ParticipantPage> {
  const user = firebase?.auth.currentUser;
  if (!user) throw new Error('Masuk lagi untuk memuat peserta.');

  const params = new URLSearchParams();
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.identifier) params.set('nim', options.identifier);
  const token = await user.getIdToken();
  const query = params.toString();
  const result = await fetch(`/api/classes/${encodeURIComponent(classId)}/participants${query ? '?' + query : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: options.signal,
  });
  if (!result.ok) throw new Error('Daftar peserta gagal dimuat.');
  return result.json() as Promise<ParticipantPage>;
}
