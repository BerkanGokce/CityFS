import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { buildingToSymbols } from '../codec/symbols';
import { sortBuildings } from './layout';
import type { CityArtifact } from '../types/city';

interface CityMeshesProps {
  city: CityArtifact;
  dataView: boolean;
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  onHover: (index: number | null) => void;
}

const SCALE = 0.25;
const matrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const scale = new THREE.Vector3();

function createGableGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [-1, 0, -1, 1, 0, -1, -1, 0, 1, 1, 0, 1, -1, 1, 0, 1, 1, 0],
      3,
    ),
  );
  geometry.setIndex([0, 1, 5, 0, 5, 4, 2, 4, 5, 2, 5, 3, 0, 4, 2, 1, 3, 5, 0, 2, 3, 0, 3, 1]);
  geometry.computeVertexNormals();
  return geometry;
}

function setInstance(
  mesh: THREE.InstancedMesh,
  instance: number,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  rotationY = 0,
): void {
  position.set(x, y, z);
  quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
  scale.set(sx, sy, sz);
  matrix.compose(position, quaternion, scale);
  mesh.setMatrixAt(instance, matrix);
}

export function CityMeshes({ city, dataView, selectedIndex, onSelect, onHover }: CityMeshesProps) {
  const bodies = useRef<THREE.InstancedMesh>(null);
  const flatRoofs = useRef<THREE.InstancedMesh>(null);
  const gableRoofs = useRef<THREE.InstancedMesh>(null);
  const pyramidRoofs = useRef<THREE.InstancedMesh>(null);
  const stepOne = useRef<THREE.InstancedMesh>(null);
  const stepTwo = useRef<THREE.InstancedMesh>(null);
  const windows = useRef<THREE.InstancedMesh>(null);
  const buildings = useMemo(() => sortBuildings(city.buildings), [city]);
  const gableGeometry = useMemo(() => createGableGeometry(), []);
  const roofCounts = useMemo(
    () => ({
      flat: buildings.filter((building) => building.roof.kind === 'flat').length,
      gable: buildings.filter((building) => building.roof.kind === 'gable').length,
      pyramid: buildings.filter((building) => building.roof.kind === 'pyramid').length,
      stepped: buildings.filter((building) => building.roof.kind === 'stepped').length,
      windows: buildings.reduce((total, building) => total + building.windowPanels.length * 4, 0),
    }),
    [buildings],
  );

  useLayoutEffect(() => {
    const centerX = Math.max(...buildings.map((building) => building.position.xUnits)) / 2;
    const centerZ = Math.max(...buildings.map((building) => building.position.zUnits)) / 2;
    const roofInstances = { flat: 0, gable: 0, pyramid: 0, stepped: 0 };
    let windowInstance = 0;
    const warm = new THREE.Color('#d1b98b');
    const selected = new THREE.Color('#f29a62');

    buildings.forEach((building, index) => {
      const x = (building.position.xUnits - centerX) * SCALE;
      const z = (building.position.zUnits - centerZ) * SCALE;
      const height = building.heightUnits * SCALE;
      const width = building.footprint.widthUnits * SCALE;
      const depth = building.footprint.depthUnits * SCALE;
      setInstance(bodies.current!, index, x, height / 2, z, width, height, depth);
      const symbols = buildingToSymbols(building);
      const hue = 0.08 + symbols.byteValue / 2550;
      const color = dataView ? new THREE.Color().setHSL(hue, 0.66, 0.58) : warm;
      bodies.current!.setColorAt(index, selectedIndex === index ? selected : color);

      if (building.roof.kind === 'flat') {
        setInstance(
          flatRoofs.current!,
          roofInstances.flat++,
          x,
          height + 0.125,
          z,
          width * 1.06,
          0.25,
          depth * 1.06,
        );
      } else if (building.roof.kind === 'gable') {
        setInstance(
          gableRoofs.current!,
          roofInstances.gable++,
          x,
          height,
          z,
          width / 2,
          building.roof.ridgeHeightUnits * SCALE,
          depth / 2,
        );
      } else if (building.roof.kind === 'pyramid') {
        setInstance(
          pyramidRoofs.current!,
          roofInstances.pyramid++,
          x,
          height + (building.roof.apexHeightUnits * SCALE) / 2,
          z,
          width,
          building.roof.apexHeightUnits * SCALE,
          depth,
          Math.PI / 4,
        );
      } else {
        const h = building.roof.levelHeightUnits * SCALE;
        const inset = building.roof.insetUnits * SCALE;
        setInstance(
          stepOne.current!,
          roofInstances.stepped,
          x,
          height + h / 2,
          z,
          width - inset,
          h,
          depth - inset,
        );
        setInstance(
          stepTwo.current!,
          roofInstances.stepped++,
          x,
          height + h * 1.5,
          z,
          width - inset * 2,
          h,
          depth - inset * 2,
        );
      }

      for (const panel of building.windowPanels) {
        const panelX = panel.offsetXUnits * SCALE;
        const panelY = Math.max(1, height * 0.58 + panel.offsetYUnits * SCALE);
        const panelWidth = panel.widthUnits * SCALE;
        const panelHeight = panel.heightUnits * SCALE;
        const panelDepth = panel.depthUnits * SCALE * 0.24;
        setInstance(
          windows.current!,
          windowInstance++,
          x + panelX,
          panelY,
          z + depth / 2 + panelDepth / 2,
          panelWidth,
          panelHeight,
          panelDepth,
        );
        setInstance(
          windows.current!,
          windowInstance++,
          x - panelX,
          panelY,
          z - depth / 2 - panelDepth / 2,
          panelWidth,
          panelHeight,
          panelDepth,
        );
        setInstance(
          windows.current!,
          windowInstance++,
          x + width / 2 + panelDepth / 2,
          panelY,
          z + panelX,
          panelDepth,
          panelHeight,
          panelWidth,
        );
        setInstance(
          windows.current!,
          windowInstance++,
          x - width / 2 - panelDepth / 2,
          panelY,
          z - panelX,
          panelDepth,
          panelHeight,
          panelWidth,
        );
      }
    });

    for (const mesh of [
      bodies.current,
      flatRoofs.current,
      gableRoofs.current,
      pyramidRoofs.current,
      stepOne.current,
      stepTwo.current,
      windows.current,
    ]) {
      if (mesh) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
    }
  }, [buildings, dataView, selectedIndex]);

  function instanceIndex(event: ThreeEvent<MouseEvent | PointerEvent>): number | null {
    event.stopPropagation();
    return event.instanceId ?? null;
  }

  return (
    <group>
      <instancedMesh
        ref={bodies}
        args={[undefined, undefined, buildings.length]}
        castShadow
        receiveShadow
        onClick={(event) => onSelect(instanceIndex(event))}
        onPointerMove={(event) => onHover(instanceIndex(event))}
        onPointerOut={() => onHover(null)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.82} metalness={0.02} />
      </instancedMesh>
      <instancedMesh ref={flatRoofs} args={[undefined, undefined, roofCounts.flat]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3b3935" roughness={0.8} />
      </instancedMesh>
      <instancedMesh
        ref={gableRoofs}
        args={[gableGeometry, undefined, roofCounts.gable]}
        castShadow
      >
        <meshStandardMaterial color="#695c4d" roughness={0.86} />
      </instancedMesh>
      <instancedMesh
        ref={pyramidRoofs}
        args={[undefined, undefined, roofCounts.pyramid]}
        castShadow
      >
        <coneGeometry args={[1 / Math.sqrt(2), 1, 4]} />
        <meshStandardMaterial color="#53615a" roughness={0.78} />
      </instancedMesh>
      <instancedMesh ref={stepOne} args={[undefined, undefined, roofCounts.stepped]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5c534a" roughness={0.82} />
      </instancedMesh>
      <instancedMesh ref={stepTwo} args={[undefined, undefined, roofCounts.stepped]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#453e38" roughness={0.82} />
      </instancedMesh>
      <instancedMesh ref={windows} args={[undefined, undefined, roofCounts.windows]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color={dataView ? '#221f19' : '#7fc7c1'}
          emissive={dataView ? '#000000' : '#224a49'}
          emissiveIntensity={0.45}
          roughness={0.28}
        />
      </instancedMesh>
    </group>
  );
}
