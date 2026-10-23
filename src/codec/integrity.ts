import { CityFSError } from './errors';

export async function sha256Bytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (!globalThis.crypto?.subtle) {
    throw new CityFSError('SHA-256 is unavailable in this environment.', 'INVALID_ENVELOPE');
  }
  const copy = Uint8Array.from(bytes);
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', copy));
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}
