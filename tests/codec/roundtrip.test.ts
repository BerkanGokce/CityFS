import { describe, expect, it } from 'vitest';
import { encodeFileToCity } from '../../src/codec/encode';
import { decodeCityToFile } from '../../src/codec/decode';
import { parseCity, serializeCity } from '../../src/codec/cityfsFormat';
import type { CityArtifact } from '../../src/types/city';

function expectBytes(actual: Uint8Array, expected: Uint8Array): void {
  expect(Array.from(actual)).toEqual(Array.from(expected));
}

async function roundTrip(name: string, bytes: Uint8Array, compression: 'none' | 'auto' = 'none') {
  const city = await encodeFileToCity({
    filename: name,
    mimeType: 'application/octet-stream',
    bytes,
    compression,
  });
  const imported = parseCity(serializeCity(city));
  const decoded = await decodeCityToFile(imported);
  expect(decoded.filename).toBe(name);
  expectBytes(decoded.bytes, bytes);
  return city;
}

function seededBytes(length: number): Uint8Array {
  let state = 0x6d2b79f5;
  return Uint8Array.from({ length }, () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return (value ^ (value >>> 14)) & 0xff;
  });
}

describe('file ⇄ architectural city', () => {
  it.each([
    ['empty.bin', new Uint8Array()],
    ['ascii.txt', new TextEncoder().encode('CityFS is architecture as data.')],
    ['unicode-東京-🏙️.txt', new TextEncoder().encode('Καλημέρα · مرحبا · शहर · 🏙️')],
    ['nulls.dat', new Uint8Array([0, 0, 1, 0, 255, 0, 2, 0])],
    ['pixel.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])],
    ['document.pdf', new TextEncoder().encode('%PDF-1.7\n%CityFS fixture\n%%EOF')],
    ['archive.zip', new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 8, 0, 0, 0])],
  ])('round-trips %s exactly', async (name, bytes) => {
    await roundTrip(name, bytes);
  });

  it('round-trips deterministic pseudo-random binary (fixed seed)', async () => {
    await roundTrip('random.bin', seededBytes(4096));
  });

  it('supports optional lossless gzip when it reduces building count', async () => {
    const bytes = new Uint8Array(2048).fill(65);
    const plain = await encodeFileToCity({ filename: 'compress.txt', bytes, compression: 'none' });
    const compressed = await encodeFileToCity({
      filename: 'compress.txt',
      bytes,
      compression: 'auto',
    });
    expect(compressed.buildings.length).toBeLessThan(plain.buildings.length);
    expectBytes((await decodeCityToFile(compressed)).bytes, bytes);
  });

  it('is deterministic for the same input and settings', async () => {
    const input = { filename: 'same.bin', bytes: seededBytes(256), compression: 'none' as const };
    const first = await encodeFileToCity(input);
    const second = await encodeFileToCity(input);
    expect(serializeCity(first)).toBe(serializeCity(second));
  });

  it('decodes by coordinates rather than array order', async () => {
    const city = await encodeFileToCity({
      filename: 'shuffle.bin',
      bytes: seededBytes(128),
      compression: 'none',
    });
    city.buildings.reverse();
    expectBytes((await decodeCityToFile(city)).bytes, seededBytes(128));
  });

  it('recovers after all optional decoration is deleted', async () => {
    const bytes = seededBytes(128);
    const city = await encodeFileToCity({ filename: 'bare.bin', bytes, compression: 'none' });
    delete city.decoration;
    expectBytes((await decodeCityToFile(city)).bytes, bytes);
  });

  it('fails integrity when a payload building is geometrically changed', async () => {
    const city = await encodeFileToCity({
      filename: 'mutate.bin',
      bytes: seededBytes(128),
      compression: 'none',
    });
    const last = city.buildings.at(-1)!;
    last.heightUnits = last.heightUnits === 57 ? 54 : last.heightUnits + 3;
    await expect(decodeCityToFile(city)).rejects.toThrow(/checksum mismatch/i);
  });

  it('rejects a missing building rather than silently returning data', async () => {
    const city = await encodeFileToCity({
      filename: 'truncate.bin',
      bytes: seededBytes(64),
      compression: 'none',
    });
    city.buildings.pop();
    await expect(decodeCityToFile(city)).rejects.toThrow(/length|truncated/i);
  });

  it('rejects duplicate coordinates', async () => {
    const city = await encodeFileToCity({
      filename: 'duplicate.bin',
      bytes: seededBytes(16),
      compression: 'none',
    });
    city.buildings[1].position = { ...city.buildings[0].position };
    await expect(decodeCityToFile(city)).rejects.toThrow(/duplicate/i);
  });

  it('rejects unsupported artifact versions and malformed JSON', async () => {
    const city = await encodeFileToCity({
      filename: 'version.bin',
      bytes: seededBytes(8),
      compression: 'none',
    });
    const unsupported = { ...city, formatVersion: 99 } as unknown as CityArtifact;
    expect(() => parseCity(JSON.stringify(unsupported))).toThrow(/unsupported/i);
    expect(() => parseCity('{')).toThrow(/valid JSON/i);
  });

  it('rejects hidden payload-like or duplicated symbol fields', async () => {
    const city = await encodeFileToCity({
      filename: 'strict.bin',
      bytes: seededBytes(8),
      compression: 'none',
    });
    const withPayload = { ...city, payload: 'AQID' };
    expect(() => parseCity(JSON.stringify(withPayload))).toThrow(/unsupported field/i);
    const withByteValue = structuredClone(city) as CityArtifact & {
      buildings: Array<Record<string, unknown>>;
    };
    withByteValue.buildings[0].byteValue = 67;
    expect(() => parseCity(JSON.stringify(withByteValue))).toThrow(/unsupported field/i);
  });
});
