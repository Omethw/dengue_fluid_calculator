// POST /api/push  — sends the hourly reminder to every stored subscription.
// Triggered by an external scheduler (cron-job.org) once per hour.
// Protected by a secret token so randoms can't spam pushes.
const webpush = require('web-push');
const { getAllSubscriptions, removeSubscription } = require('./_store');

const PUBLIC = process.env.VAPID_PUBLIC;
const PRIVATE = process.env.VAPID_PRIVATE;
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:notify@example.com';
const CRON_SECRET = process.env.CRON_SECRET || '';

if (PUBLIC && PRIVATE) {
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  // auth: ?secret=... or Authorization: Bearer ...
  const provided =
    (req.query && req.query.secret) ||
    (req.headers.authorization || '').replace('Bearer ', '');
  if (CRON_SECRET && provided !== CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!PUBLIC || !PRIVATE) {
    res.status(500).json({ error: 'VAPID keys not configured' });
    return;
  }

  const payload = JSON.stringify({
    title: '💧 Recovery Reminder — Dilara 🥰',
    body: 'Time to log fluid intake and urine output.'
  });

  let sent = 0, removed = 0, failed = 0;
  const subs = await getAllSubscriptions();
  for (const { field, sub } of subs) {
    try {
      await webpush.sendNotification(sub, payload, { TTL: 3600, urgency: 'high' });
      sent++;
    } catch (err) {
      // 404/410 mean the subscription is dead — clean it up
      if (err.statusCode === 404 || err.statusCode === 410) {
        await removeSubscription(field);
        removed++;
      } else {
        console.error('[push] send failed', err.statusCode, err.body);
        failed++;
      }
    }
  }
  console.log(`[push] sent=${sent} removed=${removed} failed=${failed} total=${subs.length}`);
  res.status(200).json({ sent, removed, failed, total: subs.length });
};
