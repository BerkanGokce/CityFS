import { GRID_SPACING_UNITS } from './constants';
import { createEnvelope, type EnvelopeInput } from './envelope';
import { byteToBuilding } from './symbols';
import { CITY_FORMAT_VERSION, CITY_SCHEMA, type CityArtifact } from '../types/city';

export async function encodeFileToCity(input: EnvelopeInput): Promise<CityArtifact> {
  const envelope = await createEnvelope(input);
  const columns = Math.max(1, Math.ceil(Math.sqrt(envelope.length)));
  return {
    schema: CITY_SCHEMA,
    formatVersion: CITY_FORMAT_VERSION,
    unitScale: 0.25,
    grid: {
      spacingUnits: GRID_SPACING_UNITS,
      traversal: 'row-major-x-then-z',
      columns,
    },
    buildings: Array.from(envelope, (byteValue, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return byteToBuilding(byteValue, column * GRID_SPACING_UNITS, row * GRID_SPACING_UNITS);
    }),
    decoration: {
      palette: 'limestone',
      parks: [],
      label: 'Decorative fields are optional and never decoded.',
    },
  };
}
