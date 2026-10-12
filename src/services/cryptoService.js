const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
};
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

const deriveCache = new Map();

async function deriveBits(code) {
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode('vault-v1'), iterations: 600000, hash: 'SHA-256' },
    base,
    512
  );
}

// vaultId goes to the server; key never leaves the device
export async function deriveVault(code) {
  if (!deriveCache.has(code)) {
    const derivation = (async () => {
      const bits = await deriveBits(code);
      const bytes = new Uint8Array(bits);
      const idBits = bytes.slice(0, 32);
      const keyBits = bytes.slice(32);
      const key = await crypto.subtle.importKey('raw', keyBits, 'AES-GCM', false, [
        'encrypt',
        'decrypt',
      ]);
      return { vaultId: toHex(idBits), key };
    })().catch((error) => {
      deriveCache.delete(code);
      throw error;
    });
    deriveCache.set(code, derivation);
  }
  return deriveCache.get(code);
}

export async function encryptItem(key, item) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(item)));
  return { iv: toB64(iv), data: toB64(ct) };
}

export async function decryptItem(key, { iv, data }) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(data));
  return JSON.parse(dec.decode(pt));
}

export async function encryptBlob(key, dataUrl) {
  const [header, encoded] = dataUrl.split(',', 2);
  const mimeType = /^data:([^;]+);base64$/.exec(header)?.[1];
  if (!mimeType || !encoded) throw new Error('Image data is invalid');

  const bytes = fromB64(encoded);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)
  );
  const blob = new Uint8Array(iv.length + ciphertext.length);
  blob.set(iv);
  blob.set(ciphertext, iv.length);
  return { blob, mimeType };
}

export async function decryptBlob(key, blob, mimeType) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  if (bytes.length <= 12) throw new Error('Encrypted image is invalid');
  const iv = bytes.slice(0, 12);
  const ciphertext = bytes.slice(12);
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  );
  return `data:${mimeType};base64,${toB64(plaintext)}`;
}