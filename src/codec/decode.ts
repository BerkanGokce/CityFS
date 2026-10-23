import { GRID_SPACING_UNITS, MAX_BUILDINGS } from './constants';
import { decodeEnvelope } from './envelope';
import { CityFSError } from './errors';
import { buildingToSymbols } from './symbols';
import type { ArchitecturalBuilding, CityArtifact, DecodedFile } from '../types/city';

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function orderedBuildings(city: CityArtifact): ArchitecturalBuilding[] {
  if (!Array.isArray(city.buildings) || city.buildings.length === 0) {
    throw new CityFSError('The city has no data-bearing buildings.', 'INVALID_CITY');
  }
  if (city.buildings.length > MAX_BUILDINGS) {
    throw new CityFSError(
      `The city exceeds the ${MAX_BUILDINGS}-building limit.`,
      'LIMIT_EXCEEDED',
    );
  }
  const positions = new Set<string>();
  for (const building of city.buildings) {
    const x = building?.position?.xUnits;
    const z = building?.position?.zUnits;
    if (
      !isInteger(x) ||
      !isInteger(z) ||
      x < 0 ||
      z < 0 ||
      x % GRID_SPACING_UNITS !== 0 ||
      z % GRID_SPACING_UNITS !== 0
    ) {
      throw new CityFSError('A building has an invalid canonical grid position.', 'INVALID_CITY');
    }
    const key = `${x},${z}`;
    if (positions.has(key)) {
      throw new CityFSError('The city contains duplicate building coordinates.', 'INVALID_CITY');
    }
    positions.add(key);
  }
  const sorted = [...city.buildings].sort(
    (left, right) =>
      left.position.zUnits - right.position.zUnits || left.position.xUnits - right.position.xUnits,
  );
  const columns = city.grid.columns;
  if (!isInteger(columns) || columns < 1 || columns > city.buildings.length) {
    throw new CityFSError('The city grid column count is invalid.', 'INVALID_CITY');
  }
  sorted.forEach((building, index) => {
    const expectedX = (index % columns) * GRID_SPACING_UNITS;
    const expectedZ = Math.floor(index / columns) * GRID_SPACING_UNITS;
    if (building.position.xUnits !== expectedX || building.position.zUnits !== expectedZ) {
      throw new CityFSError(
        'The building grid has a gap or violates row-major traversal.',
        'INVALID_CITY',
      );
    }
  });
  return sorted;
}

export function architectureToEnvelope(city: CityArtifact): Uint8Array {
  return Uint8Array.from(
    orderedBuildings(city),
    (building) => buildingToSymbols(building).byteValue,
  );
}

export async function decodeCityToFile(city: CityArtifact): Promise<DecodedFile> {
  return decodeEnvelope(architectureToEnvelope(city));
}
