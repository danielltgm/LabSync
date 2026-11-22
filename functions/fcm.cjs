function sendFcm(messaging, token, event, ttl) {
  return messaging.send({
    token,
    data: { eventId: event.id, type: event.type, sessionId: event.sessionId },
    notification: { title: 'LabSync', body: 'Ada pembaruan praktikum. Buka LabSync untuk melihat detail.' },
    android: { ttl: Math.max(0, event.createdAt + ttl - Date.now()), notification: { channelId: 'labsync-updates', tag: event.id } },
  });
}

module.exports = { sendFcm };
