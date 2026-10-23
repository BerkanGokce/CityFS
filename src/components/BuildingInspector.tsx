import { buildingToSymbols } from '../codec/symbols';
import type { ArchitecturalBuilding } from '../types/city';

interface BuildingInspectorProps {
  building: ArchitecturalBuilding | null;
  index: number | null;
}

export function BuildingInspector({ building, index }: BuildingInspectorProps) {
  if (!building || index === null) {
    return (
      <section className="panel inspector">
        <p className="eyebrow">Building inspector</p>
        <p className="muted">Hover or select a building to read its architectural byte.</p>
      </section>
    );
  }
  const symbols = buildingToSymbols(building);
  return (
    <section className="panel inspector" aria-live="polite">
      <div className="panel__heading">
        <div>
          <p className="eyebrow">Building inspector</p>
          <h2>Byte {index.toLocaleString()}</h2>
        </div>
        <span className="byte-chip">
          0x{symbols.byteValue.toString(16).padStart(2, '0').toUpperCase()}
        </span>
      </div>
      <div className="binary">{symbols.byteValue.toString(2).padStart(8, '0')}</div>
      <dl className="inspector-grid">
        <div>
          <dt>Grid</dt>
          <dd>
            {building.position.xUnits / 12}, {building.position.zUnits / 12}
          </dd>
        </div>
        <div>
          <dt>Height tier</dt>
          <dd>
            {symbols.heightTier} · {building.heightUnits}u
          </dd>
        </div>
        <div>
          <dt>Roof</dt>
          <dd>
            {building.roof.kind} · {symbols.roofCode}
          </dd>
        </div>
        <div>
          <dt>Windows</dt>
          <dd>
            {building.windowPanels.length} panels · {symbols.windowCode}
          </dd>
        </div>
      </dl>
    </section>
  );
}
