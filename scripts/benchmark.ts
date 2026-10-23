import { performance } from 'node:perf_hooks';
import { decodeCityToFile } from '../src/codec/decode';
import { encodeFileToCity } from '../src/codec/encode';

function seededBytes(length: number): Uint8Array {
  let state = 0x1234abcd;
  return Uint8Array.from({ length }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state >>> 24;
  });
}

async function measure(size: number): Promise<void> {
  const bytes = seededBytes(size);
  const iterations = size >= 4096 ? 5 : 15;
  let encodeTotal = 0;
  let decodeTotal = 0;
  let buildings = 0;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const encodeStart = performance.now();
    const city = await encodeFileToCity({
      filename: `performance-${size}.bin`,
      mimeType: 'application/octet-stream',
      bytes,
      compression: 'none',
    });
    encodeTotal += performance.now() - encodeStart;
    buildings = city.buildings.length;
    const decodeStart = performance.now();
    await decodeCityToFile(city);
    decodeTotal += performance.now() - decodeStart;
  }
  console.log(
    `${String(size).padStart(5)} B | ${String(buildings).padStart(5)} buildings | encode ${(encodeTotal / iterations).toFixed(2).padStart(7)} ms | decode ${(decodeTotal / iterations).toFixed(2).padStart(7)} ms`,
  );
}

console.log(
  `CityFS codec benchmark — ${process.platform} ${process.arch}, Node ${process.version}`,
);
for (const size of [0, 128, 1024, 4096, 8192]) await measure(size);
