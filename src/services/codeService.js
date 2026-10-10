import { wordlist } from '@scure/bip39/wordlists/english';

const WORD_COUNT = 4; // raise to 5 for more security

export function generateCode() {
  const r = crypto.getRandomValues(new Uint16Array(WORD_COUNT));
  return Array.from(r, (n) => wordlist[n % 2048]).join('-');
}

export function normalizeCode(input) {
  return input.trim().toLowerCase().split(/[\s-]+/).join('-');
}

export function isValidCode(code) {
  const parts = code.split('-');
  return parts.length === WORD_COUNT && parts.every((w) => wordlist.includes(w));
}