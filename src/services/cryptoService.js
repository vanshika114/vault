const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const toHex = (buf) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function deriveBits(code, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 600000, hash: 'SHA-256' },
    base,
    256
  );
}

// vaultId goes to the server; key never leaves the device
export async function deriveVault(code) {
  const [idBits, keyBits] = await Promise.all([
    deriveBits(code, 'vault-id-v1'),
    deriveBits(code, 'vault-key-v1'),
  ]);
  const key = await crypto.subtle.importKey('raw', keyBits, 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { vaultId: toHex(idBits), key };
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