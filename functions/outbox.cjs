async function enqueue(db, event, createdAt) {
  if (!event) return;
  try {
    await db.doc('notificationEvents/' + event.id).create({ ...event, createdAt, nextAttemptAt: Date.now() });
  } catch (error) {
    if (error.code !== 6 && error.code !== 'already-exists') throw error;
  }
}

module.exports = { enqueue };
