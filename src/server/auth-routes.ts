import { randomBytes } from 'node:crypto';

import { getAdminApp, getAuth, getFirestore } from '@/server/firebase-admin';

const headers = { 'Cache-Control': 'private, no-store' };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers });
const NIM = /^\d{8,20}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/login { nim, password } → { token } (a Firebase custom token).
 * Lets people sign in with their NIM/NIP without exposing which email belongs to a NIM: the server
 * looks up the account's email, checks the password with Identity Toolkit, then mints a token for
 * uid = NIM. Email sign-in doesn't need this route (the app signs in with Firebase directly).
 */
export async function handleLogin(request: Request) {
  const app = getAdminApp();
  // Trimmed: dashboard-pasted env values sometimes carry a trailing newline.
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!app || !apiKey) return json({ error: 'server_not_configured' }, 503);
  let nim = '';
  let password = '';
  try {
    ({ nim, password } = await request.json());
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!NIM.test(String(nim)) || typeof password !== 'string' || password.length < 6) return json({ error: 'invalid_credentials' }, 401);

  const auth = getAuth(app);
  const user = await auth.getUser(nim).catch((e: { code?: string }) => {
    if (e.code !== 'auth/user-not-found') console.warn('login: getUser failed', e.code);
    return null;
  });
  if (!user?.email || user.disabled) return json({ error: 'invalid_credentials' }, 401);

  const check = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password, returnSecureToken: false }),
  });
  if (!check.ok) {
    const err = (await check.json().catch(() => ({}))) as { error?: { message?: string } };
    if (err.error?.message?.startsWith('TOO_MANY_ATTEMPTS')) return json({ error: 'too_many_attempts' }, 429);
    // Wrong passwords are expected; anything else (bad API key, quota) is a server problem worth seeing in logs.
    if (!/INVALID_LOGIN_CREDENTIALS|INVALID_PASSWORD|EMAIL_NOT_FOUND/.test(err.error?.message ?? '')) console.warn('login: password check failed', check.status, err.error?.message);
    return json({ error: 'invalid_credentials' }, 401);
  }
  return json({ token: await auth.createCustomToken(nim) });
}

/**
 * POST /api/auth/register { nim, name, email, password } → { ok }
 * Praktikan self-registration. The Auth uid is the NIM. If the koordinator already added this NIM
 * to a class (a profile without a login), the account is linked to that profile.
 * Asisten and koordinator accounts are created by the koordinator, not here.
 */
export async function handleRegister(request: Request) {
  const app = getAdminApp();
  if (!app) return json({ error: 'server_not_configured' }, 503);
  let input: { nim?: string; name?: string; email?: string; password?: string };
  try {
    input = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const nim = String(input.nim ?? '').trim();
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  if (!NIM.test(nim)) return json({ error: 'invalid_nim' }, 400);
  if (name.length < 3 || name.length > 120) return json({ error: 'invalid_name' }, 400);
  if (!EMAIL.test(email)) return json({ error: 'invalid_email' }, 400);
  if (password.length < 8) return json({ error: 'weak_password' }, 400);

  const auth = getAuth(app);
  const db = getFirestore(app);
  const profile = await db.doc(`users/${nim}`).get();
  if (profile.exists && profile.get('role') !== 'PRAKTIKAN') return json({ error: 'nim_taken' }, 409);
  if (await auth.getUser(nim).then(() => true, () => false)) return json({ error: 'nim_taken' }, 409);

  try {
    await auth.createUser({ uid: nim, email, password, displayName: name });
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'auth/email-already-exists') return json({ error: 'email_taken' }, 409);
    if (code === 'auth/invalid-password') return json({ error: 'weak_password' }, 400);
    throw e;
  }
  // NIM 2406012412xxxx → angkatan 2024 (digits 7-8), when the format matches.
  const year = nim.length === 14 ? Number(`20${nim.slice(6, 8)}`) : undefined;
  await db.doc(`users/${nim}`).set(
    { nim, name, email, role: 'PRAKTIKAN', ...(year && year > 2000 && year < 2100 ? { angkatan: year } : {}), createdAt: Date.now() },
    { merge: true },
  );
  return json({ ok: true });
}

export const randomPassword = () => randomBytes(18).toString('base64url');
