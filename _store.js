// Tiny Upstash Redis REST helper. No npm dependency needed.
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars.

const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(command) {
  if (!URL || !TOKEN) throw new Error('Upstash env vars not set');
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  if (!res.ok) throw new Error(`Upstash error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.result;
}

// Store all subscriptions in a Redis hash: field = endpoint hash, value = JSON
const KEY = 'subscriptions';

async function saveSubscription(sub) {
  const field = sub.endpoint.split('/').pop().slice(-40);
  await redis(['HSET', KEY, field, JSON.stringify(sub)]);
  return field;
}

async function removeSubscription(field) {
  await redis(['HDEL', KEY, field]);
}

async function getAllSubscriptions() {
  const flat = await redis(['HGETALL', KEY]); // [field, val, field, val, ...]
  const out = [];
  if (Array.isArray(flat)) {
    for (let i = 0; i < flat.length; i += 2) {
      try { out.push({ field: flat[i], sub: JSON.parse(flat[i + 1]) }); } catch (e) {}
    }
  }
  return out;
}

module.exports = { saveSubscription, removeSubscription, getAllSubscriptions };
