import { BASE_HEIGHT_UNITS, FOOTPRINT_UNITS, HEIGHT_STEP_UNITS } from './constants';
import { CityFSError } from './errors';
import type {
  ArchitecturalBuilding,
  BuildingSymbols,
  RoofGeometry,
  WindowPanel,
} from '../types/city';

const ROOFS: readonly RoofGeometry[] = [
  { kind: 'flat', capHeightUnits: 1 },
  { kind: 'gable', ridgeHeightUnits: 4, axis: 'x' },
  { kind: 'pyramid', apexHeightUnits: 5 },
  { kind: 'stepped', levelCount: 2, levelHeightUnits: 2, insetUnits: 2 },
];

const WINDOW_PATTERNS: readonly (readonly WindowPanel[])[] = [
  [{ offsetXUnits: 0, offsetYUnits: 0, widthUnits: 3, heightUnits: 4, depthUnits: 1 }],
  [
    { offsetXUnits: -2, offsetYUnits: 0, widthUnits: 2, heightUnits: 4, depthUnits: 1 },
    { offsetXUnits: 2, offsetYUnits: 0, widthUnits: 2, heightUnits: 4, depthUnits: 1 },
  ],
  [
    { offsetXUnits: -2, offsetYUnits: 0, widthUnits: 1, heightUnits: 5, depthUnits: 1 },
    { offsetXUnits: 0, offsetYUnits: 0, widthUnits: 1, heightUnits: 5, depthUnits: 1 },
    { offsetXUnits: 2, offsetYUnits: 0, widthUnits: 1, heightUnits: 5, depthUnits: 1 },
  ],
  [
    { offsetXUnits: -2, offsetYUnits: -2, widthUnits: 2, heightUnits: 2, depthUnits: 1 },
    { offsetXUnits: 2, offsetYUnits: -2, widthUnits: 2, heightUnits: 2, depthUnits: 1 },
    { offsetXUnits: -2, offsetYUnits: 2, widthUnits: 2, heightUnits: 2, depthUnits: 1 },
    { offsetXUnits: 2, offsetYUnits: 2, widthUnits: 2, heightUnits: 2, depthUnits: 1 },
  ],
];

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function sameGeometry(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function byteToSymbols(byteValue: number): BuildingSymbols {
  if (!Number.isInteger(byteValue) || byteValue < 0 || byteValue > 255) {
    throw new RangeError('A building can encode exactly one byte (0–255).');
  }
  return {
    heightTier: (byteValue >> 4) & 0x0f,
    roofCode: (byteValue >> 2) & 0x03,
    windowCode: byteValue & 0x03,
    byteValue,
  };
}

export function symbolsToByte(heightTier: number, roofCode: number, windowCode: number): number {
  if (
    !Number.isInteger(heightTier) ||
    heightTier < 0 ||
    heightTier > 15 ||
    !Number.isInteger(roofCode) ||
    roofCode < 0 ||
    roofCode > 3 ||
    !Number.isInteger(windowCode) ||
    windowCode < 0 ||
    windowCode > 3
  ) {
    throw new CityFSError('Building geometry contains an out-of-range symbol.', 'INVALID_CITY');
  }
  return (heightTier << 4) | (roofCode << 2) | windowCode;
}

export function byteToBuilding(
  byteValue: number,
  xUnits: number,
  zUnits: number,
): ArchitecturalBuilding {
  const symbols = byteToSymbols(byteValue);
  return {
    position: { xUnits, zUnits },
    footprint: { widthUnits: FOOTPRINT_UNITS, depthUnits: FOOTPRINT_UNITS },
    heightUnits: BASE_HEIGHT_UNITS + symbols.heightTier * HEIGHT_STEP_UNITS,
    roof: deepClone(ROOFS[symbols.roofCode]),
    windowPanels: deepClone(WINDOW_PATTERNS[symbols.windowCode]) as WindowPanel[],
  };
}

export function buildingToSymbols(building: ArchitecturalBuilding): BuildingSymbols {
  if (typeof building !== 'object' || building === null) {
    throw new CityFSError('A building is not a valid architectural object.', 'INVALID_CITY');
  }
  const rawTier = (building.heightUnits - BASE_HEIGHT_UNITS) / HEIGHT_STEP_UNITS;
  const roofCode = ROOFS.findIndex((roof) => sameGeometry(roof, building.roof));
  const windowCode = WINDOW_PATTERNS.findIndex((pattern) =>
    sameGeometry(pattern, building.windowPanels),
  );
  if (
    building.footprint?.widthUnits !== FOOTPRINT_UNITS ||
    building.footprint?.depthUnits !== FOOTPRINT_UNITS ||
    !Number.isInteger(rawTier) ||
    rawTier < 0 ||
    rawTier > 15 ||
    roofCode < 0 ||
    windowCode < 0
  ) {
    throw new CityFSError('A building does not match canonical CityFS geometry.', 'INVALID_CITY');
  }
  return {
    heightTier: rawTier,
    roofCode,
    windowCode,
    byteValue: symbolsToByte(rawTier, roofCode, windowCode),
  };
}
