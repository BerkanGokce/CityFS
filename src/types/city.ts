export const CITY_SCHEMA = 'cityfs-city' as const;
export const CITY_FORMAT_VERSION = 1 as const;

export type RoofGeometry =
  | { kind: 'flat'; capHeightUnits: 1 }
  | { kind: 'gable'; ridgeHeightUnits: 4; axis: 'x' }
  | { kind: 'pyramid'; apexHeightUnits: 5 }
  | { kind: 'stepped'; levelCount: 2; levelHeightUnits: 2; insetUnits: 2 };

export interface WindowPanel {
  offsetXUnits: number;
  offsetYUnits: number;
  widthUnits: number;
  heightUnits: number;
  depthUnits: number;
}

export interface ArchitecturalBuilding {
  position: { xUnits: number; zUnits: number };
  footprint: { widthUnits: 8; depthUnits: 8 };
  heightUnits: number;
  roof: RoofGeometry;
  windowPanels: WindowPanel[];
}

export interface CityGrid {
  spacingUnits: 12;
  traversal: 'row-major-x-then-z';
  columns: number;
}

export interface CityDecoration {
  palette?: 'limestone' | 'slate' | 'terracotta';
  parks?: Array<{ xUnits: number; zUnits: number; sizeUnits: number }>;
  label?: string;
}

export interface CityArtifact {
  schema: typeof CITY_SCHEMA;
  formatVersion: typeof CITY_FORMAT_VERSION;
  unitScale: 0.25;
  grid: CityGrid;
  buildings: ArchitecturalBuilding[];
  decoration?: CityDecoration;
}

export interface DecodedFile {
  filename: string;
  safeFilename: string;
  mimeType: string;
  bytes: Uint8Array;
  sha256: string;
  compressed: boolean;
}

export interface BuildingSymbols {
  heightTier: number;
  roofCode: number;
  windowCode: number;
  byteValue: number;
}
