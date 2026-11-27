import type { LucideIcon } from 'lucide-react-native';
import {
  ArrowLeftRight,
  Bell,
  Building,
  CalendarDays,
  FilePlus2,
  FileText,
  History,
  LayoutDashboard,
  MapPin,
  QrCode,
  Receipt,
  ScanLine,
  ShieldCheck,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react-native';
import type { Href } from 'expo-router';

import { useMe, useStore } from './store';
import type { NavSlot, Role } from './types';

/**
 * Bottom bar = Beranda · 3 slots the user picks · Profil. The middle slot gets the big button.
 * Everything not in the bar shows up under "Pintasan" on Beranda, so no feature is hidden.
 */
export const SLOT_META: Record<NavSlot, { label: string; icon: LucideIcon; href: Href; roles: Role[]; hint: string }> = {
  jadwal: { label: 'Jadwal', icon: CalendarDays, href: '/jadwal', roles: ['PRAKTIKAN', 'ASPRAK', 'ASLAB'], hint: 'Pertemuan per hari dan bulan' },
  presensi: { label: 'Presensi', icon: ScanLine, href: '/presensi', roles: ['PRAKTIKAN', 'ASPRAK', 'ASLAB'], hint: 'Presensi lokasi dan QR sesi' },
  kelas: { label: 'Kelas', icon: Users, href: '/kelas', roles: ['PRAKTIKAN', 'ASPRAK', 'ASLAB'], hint: 'Kelas, anggota, nilai' },
  izin: { label: 'Izin', icon: FileText, href: '/izin', roles: ['PRAKTIKAN', 'ASPRAK', 'ASLAB'], hint: 'Ajukan atau tinjau izin' },
  admin: { label: 'Pengguna', icon: ShieldCheck, href: '/admin', roles: ['ASLAB'], hint: 'Peran dan akun' },
  peta: { label: 'Peta', icon: MapPin, href: '/peta', roles: ['PRAKTIKAN', 'ASLAB'], hint: 'Lokasi dan foto ruangan' },
  log: { label: 'Log', icon: History, href: '/log', roles: ['ASLAB'], hint: 'Siapa mengubah apa' },
};

export const DEFAULT_SLOTS: Record<Role, NavSlot[]> = {
  PRAKTIKAN: ['jadwal', 'presensi', 'kelas'],
  ASPRAK: ['jadwal', 'presensi', 'izin'],
  ASLAB: ['kelas', 'admin', 'log'],
};

export const SLOT_NAMES = ['Kiri', 'Tengah', 'Kanan'] as const;

export function slotsAllowed(role: Role) {
  return (Object.keys(SLOT_META) as NavSlot[]).filter((s) => SLOT_META[s].roles.includes(role));
}

/** The signed-in user's 3 slots (their choice when valid, otherwise the role default). */
export function useNavSlots(): NavSlot[] {
  const { state } = useStore();
  const me = useMe();
  const pref = state.navPrefs[me.nim];
  const allowed = slotsAllowed(me.role);
  if (pref && pref.length === 3 && new Set(pref).size === 3 && pref.every((s) => allowed.includes(s))) return pref;
  return DEFAULT_SLOTS[me.role];
}

/** Icon for the big centre button: presensi keeps the role-specific scan / QR glyph. */
export function centerIcon(slot: NavSlot, role: Role): LucideIcon {
  if (slot === 'presensi') return role === 'PRAKTIKAN' ? ScanLine : QrCode;
  return SLOT_META[slot].icon;
}

export interface Shortcut {
  key: string;
  label: string;
  hint: string;
  icon: LucideIcon;
  href: Href;
}

/** Actions that are never tabs, per role. */
const EXTRA: Record<Role, Shortcut[]> = {
  PRAKTIKAN: [
    { key: 'denda', label: 'Tagihan denda', hint: 'Bayar denda keterlambatan', icon: Wallet, href: '/denda' as Href },
    { key: 'denda-riwayat', label: 'Riwayat bayar', hint: 'Transaksi Midtrans', icon: Receipt, href: '/denda/riwayat' as Href },
    { key: 'izin-baru', label: 'Ajukan izin', hint: 'Sakit, keluarga, akademik', icon: FilePlus2, href: '/izin/baru' },
    { key: 'riwayat', label: 'Riwayat presensi', hint: 'Semua pertemuanmu', icon: History, href: '/riwayat' },
    { key: 'lab', label: 'Ruangan lab', hint: 'Foto dan petunjuk arah', icon: Building, href: '/lab' },
    { key: 'notifikasi', label: 'Notifikasi', hint: 'Sesi, jadwal, izin, denda', icon: Bell, href: '/notifikasi' },
  ],
  ASPRAK: [
    { key: 'notifikasi', label: 'Notifikasi', hint: 'Izin dan sesi', icon: Bell, href: '/notifikasi' },
  ],
  ASLAB: [
    { key: 'dashboard-lab', label: 'Dashboard lab', hint: 'Keberlangsungan & keuangan', icon: LayoutDashboard, href: '/dashboard-lab' as Href },
    { key: 'lab-transfer', label: 'Pindah praktikan', hint: 'Distribusi antar lab', icon: ArrowLeftRight, href: '/lab/transfer' as Href },
    { key: 'kelas-baru', label: 'Kelas baru', hint: 'Jadwal, asprak, praktikan', icon: UserPlus, href: '/kelas/baru' },
    { key: 'lab', label: 'Ruangan lab', hint: 'Lokasi, radius, bulk CSV', icon: Building, href: '/lab' },
    { key: 'notifikasi', label: 'Notifikasi', hint: 'Permintaan dan info', icon: Bell, href: '/notifikasi' },
  ],
};

/** Everything the role can open that is not already in its bar. */
export function useShortcuts(): Shortcut[] {
  const me = useMe();
  const slots = useNavSlots();
  const tabs = slotsAllowed(me.role)
    .filter((s) => !slots.includes(s))
    .map((s) => ({ key: s, label: SLOT_META[s].label, hint: SLOT_META[s].hint, icon: SLOT_META[s].icon, href: SLOT_META[s].href }));
  return [...tabs, ...EXTRA[me.role]];
}
