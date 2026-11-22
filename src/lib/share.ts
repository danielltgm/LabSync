import * as Clipboard from 'expo-clipboard';
import { Linking, Platform, Share } from 'react-native';

import type { DemoState } from '@/data/demo-seed';
import { viewSession } from '@/data/selectors';
import type { ClassGroup, Session } from '@/data/types';
import { DAY, formatDate, formatTimeRange, weekdayName } from '@/lib/format';

/*
 * Share texts for pertemuan and kelas. Only public class info goes out: course, topic, time, room,
 * keterangan and materi links. No attendance, grades or other students' data.
 */

export type ShareFlavor = 'wa' | 'plain' | 'short';

/** Link back into the app: the web build's origin on web, EXPO_PUBLIC_WEB_URL on native (if configured). */
export function appLink(path: string): string | undefined {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}${path}`;
  const base = process.env.EXPO_PUBLIC_WEB_URL;
  return base ? `${base.replace(/\/$/, '')}${path}` : undefined;
}

/** Our keterangan markup (# heading, - list, ~ small, **bold**) → WhatsApp markup or plain text. */
function keterangan(text: string, flavor: ShareFlavor) {
  const wa = flavor === 'wa';
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => {
      const bold = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, wa ? '*$1*' : '$1');
      if (l.startsWith('# ')) return wa ? `*${bold(l.slice(2)).replace(/\*/g, '')}*` : bold(l.slice(2));
      if (l.startsWith('- ')) return `• ${bold(l.slice(2))}`;
      if (l.startsWith('~ ')) return wa ? `_${bold(l.slice(2)).replace(/_/g, '')}_` : bold(l.slice(2));
      return bold(l);
    })
    .join('\n')
    .trim();
}

export function sessionShareText(state: DemoState, session: Session, flavor: ShareFlavor) {
  const s = viewSession(state, session);
  const b = (x: string) => (flavor === 'wa' ? `*${x}*` : x);
  const when = `${formatDate(s.startsAt, { weekday: true })} · ${formatTimeRange(s.startsAt, s.endsAt)}`;
  const where = `${s.lab.name}, ${s.lab.building} ${s.lab.floor.toLowerCase()}`;
  const link = appLink(`/sesi/${s.id}`);
  const cancelled = s.status === 'DIBATALKAN';

  if (flavor === 'short') {
    // X/Twitter: one compact line + link.
    const head = `${cancelled ? 'DIBATALKAN · ' : ''}${s.course.name} ${s.cls.label} · Pertemuan ${s.meetingNo}: ${s.topic}`;
    return [head, `${when} · ${s.lab.name}`, link].filter(Boolean).join('\n');
  }

  const lines = [
    b(`${s.course.name} · ${s.cls.label}`),
    `Pertemuan ${s.meetingNo}: ${s.topic}${cancelled ? ' (DIBATALKAN)' : ''}`,
    '',
    `📅 ${when}`,
    `📍 ${where}`,
  ];
  if (s.changeNote && s.status !== 'SELESAI') lines.push(`⚠️ ${s.changeNote}`);
  const desc = keterangan(s.description, flavor);
  if (desc && desc !== 'Belum ada keterangan.') lines.push('', desc);
  if (s.materials.length) {
    lines.push('', b('Materi'));
    for (const m of s.materials) lines.push(`• ${m.label}: ${m.url}`);
  }
  if (link) lines.push('', `Buka di LabSync: ${link}`);
  return lines.join('\n');
}

export function classShareText(state: DemoState, cls: ClassGroup, flavor: ShareFlavor, now = Date.now()) {
  const course = state.courses.find((c) => c.id === cls.courseId)!;
  const lab = state.labs.find((l) => l.id === cls.labId);
  const b = (x: string) => (flavor === 'wa' ? `*${x}*` : x);
  const link = appLink(`/kelas/${cls.id}`);
  const upcoming = state.sessions
    .filter((s) => s.classId === cls.id && s.endsAt >= now && s.status !== 'DIBATALKAN')
    .sort((a, b2) => a.startsAt - b2.startsAt)
    .slice(0, 3);
  const assistants = cls.assistantNims.map((n) => state.users.find((u) => u.nim === n)?.name).filter(Boolean);

  if (flavor === 'short') {
    const next = upcoming[0];
    return [
      `${course.name} ${cls.label} · tiap ${weekdayName(cls.weekday)} ${cls.startTime}–${cls.endTime} · ${lab?.name ?? ''}`,
      next ? `Berikutnya P${next.meetingNo}: ${next.topic}, ${formatDate(next.startsAt, { weekday: true, short: true })}` : '',
      link,
    ]
      .filter(Boolean)
      .join('\n');
  }

  const lines = [
    b(`${course.name} · ${cls.label}`),
    `${course.code} · ${course.semester}`,
    '',
    `🗓 Tiap ${weekdayName(cls.weekday)}, ${cls.startTime}–${cls.endTime}`,
    `📍 ${lab ? `${lab.name}, ${lab.building} ${lab.floor.toLowerCase()}` : '-'}`,
  ];
  if (assistants.length) lines.push(`👤 Asisten: ${assistants.join(', ')}`);
  if (upcoming.length) {
    lines.push('', b('Pertemuan berikutnya'));
    for (const s of upcoming) {
      const soon = s.startsAt - now < DAY ? ' (segera)' : '';
      lines.push(`• P${s.meetingNo} ${formatDate(s.startsAt, { weekday: true, short: true })} · ${s.topic}${soon}`);
    }
  }
  if (link) lines.push('', `Buka di LabSync: ${link}`);
  return lines.join('\n');
}

/* --------------------------------------------------------------- targets */

export type ShareTarget = 'whatsapp' | 'x' | 'telegram' | 'copy' | 'system';

export async function shareText(target: ShareTarget, text: string, link?: string): Promise<'opened' | 'copied' | 'shared' | 'dismissed'> {
  const enc = encodeURIComponent;
  switch (target) {
    case 'whatsapp':
      await Linking.openURL(`https://wa.me/?text=${enc(text)}`);
      return 'opened';
    case 'x':
      await Linking.openURL(`https://x.com/intent/post?text=${enc(text)}`);
      return 'opened';
    case 'telegram':
      // Telegram wants a url param; without one the text alone still goes through.
      await Linking.openURL(`https://t.me/share/url?url=${enc(link ?? '')}&text=${enc(link ? text.replace(link, '').trim() : text)}`);
      return 'opened';
    case 'copy':
      await Clipboard.setStringAsync(text);
      return 'copied';
    case 'system': {
      if (Platform.OS === 'web') {
        const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : undefined;
        if (nav?.share) {
          try {
            await nav.share({ text });
            return 'shared';
          } catch {
            return 'dismissed';
          }
        }
        await Clipboard.setStringAsync(text);
        return 'copied';
      }
      const r = await Share.share({ message: text });
      return r.action === Share.dismissedAction ? 'dismissed' : 'shared';
    }
  }
}

/**
 * Shares a captured card image. Native: PNG file through the share sheet (caption copied to the
 * clipboard, since most apps drop text that comes with an image). Web: Web Share with the file when
 * the browser supports it, otherwise downloads the PNG.
 */
export async function shareImage(uri: string, caption: string, fileName: string): Promise<'shared' | 'downloaded' | 'dismissed'> {
  await Clipboard.setStringAsync(caption);
  if (Platform.OS !== 'web') {
    const Sharing = await import('expo-sharing');
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Bagikan gambar', UTI: 'public.png' });
    return 'shared';
  }
  const blob = await (await fetch(uri)).blob();
  const file = new File([blob], `${fileName}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], text: caption });
      return 'shared';
    } catch {
      return 'dismissed';
    }
  }
  const a = document.createElement('a');
  a.href = uri;
  a.download = `${fileName}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return 'downloaded';
}
