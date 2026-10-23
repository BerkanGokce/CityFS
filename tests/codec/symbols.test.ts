import { describe, expect, it } from 'vitest';
import {
  byteToBuilding,
  byteToSymbols,
  buildingToSymbols,
  symbolsToByte,
} from '../../src/codec/symbols';

describe('architectural symbol mapping', () => {
  it('exhaustively round-trips all 256 byte values', () => {
    for (let byte = 0; byte <= 255; byte += 1) {
      const symbols = byteToSymbols(byte);
      expect(symbolsToByte(symbols.heightTier, symbols.roofCode, symbols.windowCode)).toBe(byte);
      const building = byteToBuilding(byte, (byte % 16) * 12, Math.floor(byte / 16) * 12);
      expect(buildingToSymbols(building).byteValue).toBe(byte);
      expect(building).not.toHaveProperty('byteValue');
      expect(building).not.toHaveProperty('heightTier');
      expect(building).not.toHaveProperty('roofCode');
      expect(building).not.toHaveProperty('windowCode');
    }
  });

  it('rejects non-canonical geometry', () => {
    const building = byteToBuilding(42, 0, 0);
    building.heightUnits += 1;
    expect(() => buildingToSymbols(building)).toThrow(/canonical CityFS geometry/i);
  });
});
