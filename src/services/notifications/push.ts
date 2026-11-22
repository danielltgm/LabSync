
export function usePushNotifications(_uid: string) {
  return { available: false, message: '', enable: () => {} };
}

export async function revokeNotificationDevice() {}
