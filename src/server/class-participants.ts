import { FieldPath, getAdminApp, getAuth, getFirestore } from '@/server/firebase-admin';
import type { ParticipantPage } from '@/types/class-participants';

const pageSize = 30;
const validId = /^[\w-]{1,128}$/;
const headers = { 'Cache-Control': 'private, no-store' };

function denied(status: number) {
  return Response.json({ error: 'participants_unavailable' }, { status, headers });
}

export async function readClassParticipants(request: Request, classId?: string) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return denied(401);
  if (!classId || !validId.test(classId)) return denied(404);

  const app = getAdminApp();
  if (!app) return denied(503);

  let uid: string;
  try {
    ({ uid } = await getAuth(app).verifyIdToken(token));
  } catch {
    return denied(401);
  }

  const args = new URL(request.url).searchParams;
  const cursor = args.get('cursor');
  const identifier = args.get('nim')?.trim();
  if ((cursor && !validId.test(cursor)) || (identifier && identifier.length > 40)) return denied(400);

  try {
    const db = getFirestore(app);
    const [classDoc, profile] = await db.getAll(db.doc(`classes/${classId}`), db.doc(`users/${uid}`));
    if (classDoc.get('assistantUid') !== uid || profile.get('role') !== 'ASISTEN') return denied(404);

    const users = db.collection('users').where('role', '==', 'PRAKTISAN').select('name', 'identifier');
    const directory = users.orderBy(FieldPath.documentId());
    const query = identifier
      ? users.where('identifier', '==', identifier).limit(pageSize)
      : (cursor ? directory.startAfter(cursor) : directory).limit(pageSize + 1);
    const results = (await query.get()).docs;
    const page = results.slice(0, pageSize);
    const registrations = page.length > 0
      ? await db.getAll(...page.map((student) => db.doc(`enrollments/${student.id}/classes/${classId}`)))
      : [];
    const enrolled = new Set(registrations.filter((record) => record.exists).map((record) => record.ref.parent.parent?.id));

    return Response.json({
      students: page.map((student) => ({
        uid: student.id,
        name: String(student.get('name') ?? 'Nama belum tersedia'),
        identifier: String(student.get('identifier') ?? ''),
        enrolled: enrolled.has(student.id),
      })),
      nextCursor: !identifier && results.length > pageSize ? page.at(-1)?.id : undefined,
    } satisfies ParticipantPage, { headers });
  } catch {
    return denied(503);
  }
}
