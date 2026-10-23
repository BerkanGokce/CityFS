import type { ArchitecturalBuilding, CityArtifact } from '../types/city';

export function getCityBounds(city: CityArtifact): {
  widthUnits: number;
  depthUnits: number;
  centerXUnits: number;
  centerZUnits: number;
} {
  const maxX = Math.max(0, ...city.buildings.map((building) => building.position.xUnits));
  const maxZ = Math.max(0, ...city.buildings.map((building) => building.position.zUnits));
  return {
    widthUnits: maxX + city.grid.spacingUnits,
    depthUnits: maxZ + city.grid.spacingUnits,
    centerXUnits: maxX / 2,
    centerZUnits: maxZ / 2,
  };
}

export function sortBuildings(buildings: ArchitecturalBuilding[]): ArchitecturalBuilding[] {
  return [...buildings].sort(
    (left, right) =>
      left.position.zUnits - right.position.zUnits || left.position.xUnits - right.position.xUnits,
  );
}
