import { Canvas } from '@react-three/fiber';
import { ContactShadows, Grid, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Suspense, useEffect, useRef } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CityMeshes } from '../city/CityMeshes';
import { getCityBounds } from '../city/layout';
import type { CityArtifact } from '../types/city';

interface CityViewportProps {
  city: CityArtifact;
  dataView: boolean;
  selectedIndex: number | null;
  cameraMode: 'perspective' | 'top';
  cameraResetKey: number;
  onSelect: (index: number | null) => void;
  onHover: (index: number | null) => void;
}

function CameraRig({
  city,
  mode,
  resetKey,
}: {
  city: CityArtifact;
  mode: 'perspective' | 'top';
  resetKey: number;
}) {
  const controls = useRef<OrbitControlsImpl>(null);
  const bounds = getCityBounds(city);
  const radius = Math.max(bounds.widthUnits, bounds.depthUnits) * city.unitScale;
  useEffect(() => {
    const controller = controls.current;
    if (!controller) return;
    const camera = controller.object;
    if (mode === 'top') camera.position.set(0, Math.max(18, radius * 1.35), 0.01);
    else camera.position.set(radius * 0.74, Math.max(10, radius * 0.55), radius * 0.78);
    controller.target.set(0, 0, 0);
    controller.update();
  }, [mode, radius, resetKey]);
  return (
    <>
      <PerspectiveCamera makeDefault fov={44} near={0.1} far={1000} />
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.075}
        minDistance={5}
        maxDistance={Math.max(60, radius * 3)}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

export function CityViewport(props: CityViewportProps) {
  const bounds = getCityBounds(props.city);
  const groundSize = Math.max(bounds.widthUnits, bounds.depthUnits) * props.city.unitScale + 8;
  return (
    <div className="viewport" data-testid="city-viewport">
      <Canvas
        shadows
        dpr={[1, 1.65]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <color attach="background" args={['#c7c2b6']} />
        <fog attach="fog" args={['#c7c2b6', 38, Math.max(90, groundSize * 2.2)]} />
        <ambientLight intensity={1.25} />
        <directionalLight
          castShadow
          position={[18, 34, 16]}
          intensity={2.4}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-far={130}
          shadow-camera-left={-45}
          shadow-camera-right={45}
          shadow-camera-top={45}
          shadow-camera-bottom={-45}
        />
        <Suspense fallback={null}>
          <CityMeshes
            city={props.city}
            dataView={props.dataView}
            selectedIndex={props.selectedIndex}
            onSelect={props.onSelect}
            onHover={props.onHover}
          />
          <Grid
            args={[groundSize, groundSize]}
            position={[0, -0.02, 0]}
            cellSize={3}
            sectionSize={6}
            cellColor="#8c8c7f"
            sectionColor="#686a60"
            fadeDistance={90}
            infiniteGrid
          />
          <mesh receiveShadow position={[0, -0.12, 0]}>
            <boxGeometry args={[groundSize, 0.2, groundSize]} />
            <meshStandardMaterial color="#9c9d8f" roughness={1} />
          </mesh>
          <ContactShadows
            position={[0, 0.01, 0]}
            opacity={0.34}
            scale={groundSize}
            blur={2.4}
            far={16}
          />
        </Suspense>
        <CameraRig city={props.city} mode={props.cameraMode} resetKey={props.cameraResetKey} />
      </Canvas>
      <div className="viewport-hint">Drag to orbit · Right-drag to pan · Scroll to zoom</div>
    </div>
  );
}
