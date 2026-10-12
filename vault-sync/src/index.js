const ALLOWED_ORIGINS = new Set([
  'https://vault-ecru-ten.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]);
const MAX_PUSH_BYTES = 5 * 1024 * 1024;
const MAX_RECORD_BYTES = 900 * 1024;
const MAX_BLOB_BYTES = 10 * 1024 * 1024 + 28;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function withCors(response, origin) {
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Access-Control-Max-Age', '86400');
  headers.append('Vary', 'Origin');
  return new Response(response.body, { status: response.status, headers });
}

async function readBody(request, limit) {
  const declaredSize = Number(request.headers.get('Content-Length') || 0);
  if (declaredSize > limit) throw new HttpError(413, 'Request body is too large');
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, 'Request body is too large');
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function validateVaultId(value) {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new HttpError(400, 'Invalid vault id');
}

function validateItemId(value) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value)) throw new HttpError(400, 'Invalid item id');
}

function validateRecord(record) {
  if (
    !record ||
    typeof record !== 'object' ||
    typeof record.id !== 'string' ||
    !Number.isSafeInteger(record.updatedAt) ||
    record.updatedAt < 0 ||
    typeof record.iv !== 'string' ||
    typeof record.data !== 'string' ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(record.iv) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(record.data)
  ) {
    throw new HttpError(400, 'Invalid encrypted item');
  }
  validateItemId(record.id);
  if (record.iv.length > 32 || record.data.length > MAX_RECORD_BYTES) {
    throw new HttpError(413, 'Encrypted item exceeds the 900 KB limit');
  }
  if (new TextEncoder().encode(JSON.stringify(record)).byteLength > MAX_RECORD_BYTES) {
    throw new HttpError(413, 'Encrypted item exceeds the 900 KB limit');
  }
}

async function checkRateLimit(request, env) {
  if (!env.API_LIMITER) throw new HttpError(503, 'Rate limiter is not configured');
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const { success } = await env.API_LIMITER.limit({ key: ip });
  if (!success) throw new HttpError(429, 'Too many requests; try again later');
}

async function handle(request, env) {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] !== 'v' || segments.length < 2) throw new HttpError(404, 'Not found');

  const vaultId = segments[1];
  validateVaultId(vaultId);
  await checkRateLimit(request, env);

  if (segments.length === 2 && request.method === 'GET') {
    const since = Number(url.searchParams.get('since') || 0);
    if (!Number.isSafeInteger(since) || since < 0) throw new HttpError(400, 'Invalid since value');
    const { results } = await env.DB.prepare(
      'SELECT item_id AS id, iv, data, updated_at AS updatedAt FROM items WHERE vault_id = ? AND updated_at >= ? ORDER BY updated_at'
    )
      .bind(vaultId, since)
      .all();
    return json({ records: results, now: Date.now() });
  }

  if (segments.length === 3 && segments[2] === 'push' && request.method === 'POST') {
    const bytes = await readBody(request, MAX_PUSH_BYTES);
    let records;
    try {
      records = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new HttpError(400, 'Invalid JSON body');
    }
    if (!Array.isArray(records) || records.length > 100) {
      throw new HttpError(400, 'Expected an array of up to 100 encrypted items');
    }
    records.forEach(validateRecord);
    if (records.length) {
      const timestamp = Date.now();
      await env.DB.batch(
        records.map((record) =>
          env.DB.prepare(
            'INSERT INTO items (vault_id, item_id, iv, data, updated_at, synced_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(vault_id, item_id) DO UPDATE SET iv = excluded.iv, data = excluded.data, updated_at = excluded.updated_at, synced_at = excluded.synced_at WHERE excluded.updated_at >= items.updated_at'
          ).bind(vaultId, record.id, record.iv, record.data, record.updatedAt, timestamp)
        )
      );
    }
    return json({ pushed: records.length });
  }

  if (segments.length === 4 && segments[2] === 'blob') {
    const itemId = decodeURIComponent(segments[3]);
    validateItemId(itemId);
    if (request.method === 'PUT') {
      const body = await readBody(request, MAX_BLOB_BYTES);
      if (body.byteLength < 13) throw new HttpError(400, 'Encrypted image is invalid');
      await env.BLOBS.put(`${vaultId}/${itemId}`, body, {
        httpMetadata: { contentType: 'application/octet-stream' },
      });
      return json({ stored: true });
    }
    if (request.method === 'GET') {
      const object = await env.BLOBS.get(`${vaultId}/${itemId}`);
      if (!object) throw new HttpError(404, 'Image blob not found');
      return new Response(object.body, {
        headers: { 'Content-Type': 'application/octet-stream' },
      });
    }
  }

  throw new HttpError(404, 'Not found');
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: 'Origin is not allowed' }, 403);
    }
    if (request.method === 'OPTIONS') {
      if (!origin) return new Response(null, { status: 204 });
      return withCors(new Response(null, { status: 204 }), origin);
    }

    try {
      return withCors(await handle(request, env), origin);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : 'Sync request failed';
      return withCors(json({ error: message }, status), origin);
    }
  },
};
