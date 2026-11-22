
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { AndroidImportance } from 'expo-notifications';
import * as Notifications from 'expo-notifications';
import { getRandomBytesAsync } from 'expo-crypto';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { firebase } from '@/firebase/client';

const nativeAndroid = Platform.OS === 'android' && Constants.executionEnvironment !== 'storeClient';
const configured = nativeAndroid && Constants.expoConfig?.extra?.androidPushConfigured === true
  && process.env.EXPO_PUBLIC_FIREBASE_EMULATORS !== 'true';
const storageKey = 'labsync:push-installation';
const channelId = 'labsync-updates';
const timeout = 7_000;
let serial = Promise.resolve<unknown>(undefined);
let closingUid: string | undefined;
let owner: string | undefined;

function queue<T>(job: () => Promise<T>) {
  const work = serial.then(job);
  serial = work.catch(() => undefined);
  return work;
}

async function identity() {
  const cached = await AsyncStorage.getItem(storageKey);
  if (cached) {
    const saved = JSON.parse(cached) as { installationId?: string; secret?: string };
    if (/^[A-Za-z0-9]{20}$/.test(saved.installationId ?? '') && /^[A-Za-z0-9]{40}$/.test(saved.secret ?? '')) {
      return { installationId: saved.installationId!, secret: saved.secret! };
    }
  }
  const bytes = await getRandomBytesAsync(30);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const pair = { installationId: hex.slice(0, 20), secret: hex.slice(20) };
  await AsyncStorage.setItem(storageKey, JSON.stringify(pair));
  return pair;
}

function call<Output>(name: string, data: object) {
  if (!firebase) throw new Error('firebase-unavailable');
  return httpsCallable<object, Output>(getFunctions(firebase.auth.app, 'asia-southeast2'), name, { timeout })(data);
}

function live(uid: string) {
  return firebase?.auth.currentUser?.uid === uid && owner === uid && closingUid !== uid;
}

async function registerToken(uid: string, token: Notifications.DevicePushToken) {
  if (token.type !== 'android' || typeof token.data !== 'string') throw new Error('android-token-required');
  await queue(async () => {
    if (!live(uid)) return;
    const installation = await identity();
    if (!live(uid)) return;
    await call('registerLabNotificationDevice', { ...installation, token: token.data });
  });
}

export async function revokeNotificationDevice() {
  const uid = firebase?.auth.currentUser?.uid;
  if (!configured || !uid) return;
  closingUid = uid;
  try {
    await queue(async () => {
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) await call('revokeLabNotificationDevice', JSON.parse(saved));
    });
  } finally {
    await Promise.allSettled([
      Notifications.dismissAllNotificationsAsync(),
      Notifications.clearLastNotificationResponseAsync(),
    ]);
  }
}

export function usePushNotifications(uid: string) {
  const [message, setMessage] = useState(configured ? 'Menyiapkan notifikasi…' : '');
  const [retry, setRetry] = useState(0);
  const ask = useRef(false);

  useEffect(() => {
    if (!configured) return;
    owner = uid;
    closingUid = undefined;
    let stopped = false;
    let registering = false;
    let registered = false;
    const update = (value: string) => { if (!stopped && live(uid)) setMessage(value); };
    const setup = async () => {
      if (stopped || !live(uid) || registering) return;
      registering = true;
      try {
        await Notifications.setNotificationChannelAsync(channelId, {
          name: 'Pembaruan praktikum', importance: AndroidImportance.DEFAULT,
        });
        let permission = await Notifications.getPermissionsAsync();
        if (!permission.granted && ask.current && permission.canAskAgain && !stopped && live(uid)) {
          ask.current = false;
          permission = await Notifications.requestPermissionsAsync();
        }
        if (stopped || !live(uid)) return;
        if (!permission.granted) {
          await queue(async () => {
            const saved = await AsyncStorage.getItem(storageKey);
            if (saved && live(uid)) await call('revokeLabNotificationDevice', JSON.parse(saved));
          });
          registered = false;
          update(permission.canAskAgain ? 'Aktifkan notifikasi untuk mendapat pembaruan praktikum.'
            : 'Notifikasi dimatikan. Ubah izin di pengaturan Android untuk mengaktifkannya.');
          return;
        }
        const token = await Notifications.getDevicePushTokenAsync();
        if (stopped || !live(uid)) return;
        await registerToken(uid, token);
        registered = true;
        update('');
      } catch {
        update('Notifikasi gagal diaktifkan. Cek koneksi lalu coba lagi.');
      } finally {
        registering = false;
      }
    };
    void setup();
    const refresh = Notifications.addPushTokenListener((token) => {
      if (!registered || stopped || !live(uid)) return;
      void registerToken(uid, token).catch(() => update('Token notifikasi gagal diperbarui. Coba lagi.'));
    });
    const app = AppState.addEventListener('change', (state) => { if (state === 'active') void setup(); });
    return () => {
      stopped = true;
      if (owner === uid) owner = undefined;
      refresh.remove();
      app.remove();
    };
  }, [uid, retry]);

  return {
    available: nativeAndroid,
    message: nativeAndroid && !configured ? 'Notifikasi belum dikonfigurasi untuk build ini.' : message,
    enable: () => { ask.current = true; setRetry((value) => value + 1); },
  };
}
