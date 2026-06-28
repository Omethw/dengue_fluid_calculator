// POST /api/subscribe  — stores a browser's push subscription
const { saveSubscription } = require('./_store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    // Vercel parses JSON body automatically; fall back to manual parse if needed
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const sub = body && body.subscription ? body.subscription : body;
    if (!sub || !sub.endpoint) {
      res.status(400).json({ error: 'Invalid subscription' });
      return;
    }
    const field = await saveSubscription(sub);
    console.log('[subscribe] stored', field);
    res.status(200).json({ ok: true, id: field });
  } catch (err) {
    console.error('[subscribe] error', err);
    res.status(500).json({ error: err.message });
  }
};
