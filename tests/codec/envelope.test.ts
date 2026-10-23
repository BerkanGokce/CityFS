import { describe, expect, it } from 'vitest';
import { createEnvelope, decodeEnvelope, sanitizeFilename } from '../../src/codec/envelope';

describe('CityFS binary envelope', () => {
  it('preserves a Unicode filename and sanitizes it for download', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const envelope = await createEnvelope({
      filename: 'résumé 東京.bin',
      bytes,
      compression: 'none',
    });
    const decoded = await decodeEnvelope(envelope);
    expect(decoded.filename).toBe('résumé 東京.bin');
    expect(decoded.safeFilename).toBe('résumé 東京.bin');
  });

  it.each([
    ['../../secrets.txt', '_.._secrets.txt'],
    ['CON:<bad>|.txt', 'CON__bad__.txt'],
    ['...', 'recovered-file'],
    ['', 'recovered-file'],
  ])('sanitizes %j to %j', (unsafe, safe) => {
    expect(sanitizeFilename(unsafe)).toBe(safe);
  });

  it('rejects a corrupt magic identifier', async () => {
    const envelope = await createEnvelope({
      filename: 'x.bin',
      bytes: new Uint8Array([1]),
      compression: 'none',
    });
    envelope[0] ^= 0xff;
    await expect(decodeEnvelope(envelope)).rejects.toThrow(/magic/i);
  });

  it('rejects unsupported envelope versions', async () => {
    const envelope = await createEnvelope({
      filename: 'x.bin',
      bytes: new Uint8Array([1]),
      compression: 'none',
    });
    envelope[4] = 2;
    await expect(decodeEnvelope(envelope)).rejects.toThrow(/not supported/i);
  });

  it('rejects oversized source data', async () => {
    await expect(
      createEnvelope({ filename: 'huge.bin', bytes: new Uint8Array(8193), compression: 'none' }),
    ).rejects.toThrow(/limit/i);
  });
});
