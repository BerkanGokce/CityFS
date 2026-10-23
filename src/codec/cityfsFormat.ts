import { MAX_BUILDINGS } from './constants';
import { CityFSError } from './errors';
import { orderedBuildings } from './decode';
import { buildingToSymbols } from './symbols';
import { CITY_FORMAT_VERSION, CITY_SCHEMA, type CityArtifact } from '../types/city';

const MAX_JSON_BYTES = 6 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const unexpected = Object.keys(record).find((key) => !allowed.includes(key));
  if (unexpected) {
    throw new CityFSError(`${label} contains unsupported field “${unexpected}”.`, 'INVALID_CITY');
  }
}

function validateDecoration(value: unknown): void {
  if (value === undefined) return;
  if (!isRecord(value)) throw new CityFSError('City decoration is invalid.', 'INVALID_CITY');
  assertKeys(value, ['palette', 'parks', 'label'], 'City decoration');
  if (
    value.palette !== undefined &&
    !['limestone', 'slate', 'terracotta'].includes(String(value.palette))
  ) {
    throw new CityFSError('City decoration palette is invalid.', 'INVALID_CITY');
  }
  if (value.label !== undefined && (typeof value.label !== 'string' || value.label.length > 256)) {
    throw new CityFSError('City decoration label is invalid.', 'INVALID_CITY');
  }
  if (value.parks !== undefined) {
    if (!Array.isArray(value.parks) || value.parks.length > MAX_BUILDINGS) {
      throw new CityFSError('City decoration parks are invalid.', 'INVALID_CITY');
    }
    for (const park of value.parks) {
      if (!isRecord(park)) throw new CityFSError('A park descriptor is invalid.', 'INVALID_CITY');
      assertKeys(park, ['xUnits', 'zUnits', 'sizeUnits'], 'Park descriptor');
      if (![park.xUnits, park.zUnits, park.sizeUnits].every(Number.isSafeInteger)) {
        throw new CityFSError('A park descriptor must use integer units.', 'INVALID_CITY');
      }
    }
  }
}

export function validateCityArtifact(value: unknown): CityArtifact {
  if (!isRecord(value) || value.schema !== CITY_SCHEMA) {
    throw new CityFSError('This is not a CityFS city artifact.', 'INVALID_CITY');
  }
  assertKeys(
    value,
    ['schema', 'formatVersion', 'unitScale', 'grid', 'buildings', 'decoration'],
    'City artifact',
  );
  if (value.formatVersion !== CITY_FORMAT_VERSION) {
    throw new CityFSError(
      `City format version ${String(value.formatVersion)} is unsupported.`,
      'UNSUPPORTED_VERSION',
    );
  }
  if (value.unitScale !== 0.25 || !isRecord(value.grid)) {
    throw new CityFSError('The city unit scale or grid descriptor is invalid.', 'INVALID_CITY');
  }
  if (
    value.grid.spacingUnits !== 12 ||
    value.grid.traversal !== 'row-major-x-then-z' ||
    !Array.isArray(value.buildings) ||
    value.buildings.length > MAX_BUILDINGS
  ) {
    throw new CityFSError('The city grid or building collection is invalid.', 'INVALID_CITY');
  }
  assertKeys(value.grid, ['spacingUnits', 'traversal', 'columns'], 'City grid');
  for (const candidate of value.buildings) {
    if (!isRecord(candidate))
      throw new CityFSError('A building descriptor is invalid.', 'INVALID_CITY');
    assertKeys(
      candidate,
      ['position', 'footprint', 'heightUnits', 'roof', 'windowPanels'],
      'Building',
    );
    if (
      !isRecord(candidate.position) ||
      !isRecord(candidate.footprint) ||
      !isRecord(candidate.roof)
    ) {
      throw new CityFSError('A building geometry descriptor is invalid.', 'INVALID_CITY');
    }
    assertKeys(candidate.position, ['xUnits', 'zUnits'], 'Building position');
    assertKeys(candidate.footprint, ['widthUnits', 'depthUnits'], 'Building footprint');
    const roofKeys: Record<string, readonly string[]> = {
      flat: ['kind', 'capHeightUnits'],
      gable: ['kind', 'ridgeHeightUnits', 'axis'],
      pyramid: ['kind', 'apexHeightUnits'],
      stepped: ['kind', 'levelCount', 'levelHeightUnits', 'insetUnits'],
    };
    const allowedRoofKeys = roofKeys[String(candidate.roof.kind)];
    if (!allowedRoofKeys) throw new CityFSError('A roof shape is unsupported.', 'INVALID_CITY');
    assertKeys(candidate.roof, allowedRoofKeys, 'Roof geometry');
    if (!Array.isArray(candidate.windowPanels)) {
      throw new CityFSError('Window geometry must be a panel list.', 'INVALID_CITY');
    }
    for (const panel of candidate.windowPanels) {
      if (!isRecord(panel)) throw new CityFSError('A window panel is invalid.', 'INVALID_CITY');
      assertKeys(
        panel,
        ['offsetXUnits', 'offsetYUnits', 'widthUnits', 'heightUnits', 'depthUnits'],
        'Window panel',
      );
    }
  }
  validateDecoration(value.decoration);
  const city = value as unknown as CityArtifact;
  for (const building of orderedBuildings(city)) buildingToSymbols(building);
  return city;
}

export function serializeCity(city: CityArtifact): string {
  validateCityArtifact(city);
  return JSON.stringify(city);
}

export function parseCity(serialized: string): CityArtifact {
  if (new TextEncoder().encode(serialized).length > MAX_JSON_BYTES) {
    throw new CityFSError('The CityFS artifact exceeds the import size limit.', 'LIMIT_EXCEEDED');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new CityFSError('The CityFS artifact is not valid JSON.', 'INVALID_CITY');
  }
  return validateCityArtifact(parsed);
}
