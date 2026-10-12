import { env } from 'cloudflare:test';
import { beforeAll, describe, expect, it } from 'vitest';
import worker from '../src';

const vaultId = 'a'.repeat(64);
const origin = 'http://localhost:5173';

beforeAll(async () => {
  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS items (vault_id TEXT NOT NULL, item_id TEXT NOT NULL, iv TEXT NOT NULL, data TEXT NOT NULL, updated_at INTEGER NOT NULL, synced_at INTEGER NOT NULL, PRIMARY KEY (vault_id, item_id))'
  ).run();
});

describe('vault sync worker', () => {
  it('stores and returns encrypted records', async () => {
    const itemId = `test_${Date.now()}`;
    const record = { id: itemId, updatedAt: Date.now(), iv: 'aXY=', data: 'ZGF0YQ==' };
    const pushed = await worker.fetch(
      new Request(`http://example.com/v/${vaultId}/push`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify([record]),
      }),
      env
    );
    expect(pushed.status).toBe(200);
    expect(pushed.headers.get('Access-Control-Allow-Origin')).toBe(origin);

    const pulled = await worker.fetch(
      new Request(`http://example.com/v/${vaultId}?since=0`, { headers: { Origin: origin } }),
      env
    );
    expect(pulled.status).toBe(200);
    const result = await pulled.json();
    expect(result.records).toContainEqual(record);
    expect(result.now).toEqual(expect.any(Number));
  });

  it('stores encrypted image blobs separately', async () => {
    const itemId = `image_${Date.now()}`;
    const encryptedBlob = new Uint8Array(13).fill(7);
    const put = await worker.fetch(
      new Request(`http://example.com/v/${vaultId}/blob/${itemId}`, {
        method: 'PUT',
        headers: { Origin: origin, 'Content-Type': 'application/octet-stream' },
        body: encryptedBlob,
      }),
      env
    );
    expect(put.status).toBe(200);

    const get = await worker.fetch(
      new Request(`http://example.com/v/${vaultId}/blob/${itemId}`, { headers: { Origin: origin } }),
      env
    );
    expect(get.status).toBe(200);
    expect(new Uint8Array(await get.arrayBuffer())).toEqual(encryptedBlob);
  });

  it('rejects origins outside the allowlist', async () => {
    const response = await worker.fetch(
      new Request(`http://example.com/v/${vaultId}?since=0`, {
        headers: { Origin: 'https://attacker.example' },
      }),
      env
    );
    expect(response.status).toBe(403);
  });

  it('rejects oversized encrypted records without storing them', async () => {
    const response = await worker.fetch(
      new Request(`http://example.com/v/${vaultId}/push`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { id: 'oversized', updatedAt: Date.now(), iv: 'aXY=', data: 'A'.repeat(900 * 1024) },
        ]),
      }),
      env
    );
    expect(response.status).toBe(413);
  });
});
