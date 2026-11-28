import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Vector3 } from "three";
import { useGarage } from "../context.jsx";
import { GarageRoom, Turntable, WALL_Z } from "./garage-room.jsx";
import { Vehicle } from "./vehicle.jsx";
import { WallPosters } from "./wall-posters.jsx";

const PRESETS = {
  front: { pos: [0.6, 1.7, 7.4], target: [0, 1.2, 0] },
  side: { pos: [8, 1.6, 0.4], target: [0, 1.2, 0] },
  rear: { pos: [-0.8, 2.1, -6.6], target: [0, 1.2, 0] },
  wall: { pos: [0, 2.9, 2.4], target: [0, 2.8, WALL_Z] },
};

function CameraRig({ controls }) {
  const { camera } = useGarage();
  const { camera: cam } = useThree();
  const animating = useRef(false);
  const goalPos = useMemo(() => new Vector3(), []);
  const goalTarget = useMemo(() => new Vector3(), []);

  useEffect(() => {
    if (!camera) return;
    const preset = PRESETS[camera.preset];
    if (!preset) return;
    goalPos.set(preset.pos[0], preset.pos[1], preset.pos[2]);
    goalTarget.set(preset.target[0], preset.target[1], preset.target[2]);
    animating.current = true;
  }, [camera, goalPos, goalTarget]);

  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return undefined;
    const stop = () => {
      animating.current = false;
    };
    orbit.addEventListener("start", stop);
    return () => orbit.removeEventListener("start", stop);
  }, [controls]);

  const invalidate = useThree((state) => state.invalidate);
  useFrame((_, dt) => {
    const orbit = controls.current;
    if (!animating.current || !orbit || !orbit.target || !orbit.target.lerp) return;
    const alpha = 1 - Math.exp(-Math.min(dt, 0.05) * 3.2);
    cam.position.lerp(goalPos, alpha);
    orbit.target.lerp(goalTarget, alpha);
    orbit.update();
    invalidate();
    if (cam.position.distanceTo(goalPos) < 0.01 && orbit.target.distanceTo(goalTarget) < 0.01) animating.current = false;
  });

  return null;
}

function SceneContents() {
  const { photos, lightColor, lightIntensity, spin, status, modelUrl, wheel, openPhoto } = useGarage();
  const controls = useRef(null);

  return (
    <>
      <color attach="background" args={["#0b0d10"]} />
      <fog attach="fog" args={["#0b0d10", 14, 30]} />

      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 1, 1]} />
        <Lightformer form="rect" intensity={1.4} color={lightColor} position={[-5, 3, 2]} rotation-y={Math.PI / 2} scale={[8, 0.6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#0f7ce1" position={[5, 2, -2]} rotation-y={-Math.PI / 2} scale={[8, 0.4, 1]} />
        <Lightformer form="ring" intensity={1.5} color="#ec6c1b" position={[0, 3, 8]} scale={3} />
      </Environment>

      <GarageRoom lightColor={lightColor} intensity={lightIntensity} />
      <Suspense fallback={null}>
        <WallPosters photos={photos} lightColor={lightColor} intensity={lightIntensity} onOpen={openPhoto} />
      </Suspense>

      <Turntable spin={spin} scanning={status !== "ready"}>
        <Vehicle modelUrl={modelUrl} wheel={wheel} />
      </Turntable>

      <OrbitControls
        ref={controls}
        makeDefault
        target={[0, 1.2, 0]}
        enableDamping
        dampingFactor={0.08}
        enablePan={false}
        enableRotate={false}
        minDistance={3.5}
        maxDistance={13}
        maxPolarAngle={Math.PI / 2 - 0.04}
      />
      <CameraRig controls={controls} />

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={1} luminanceSmoothing={0.2} intensity={0.85} radius={0.7} />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
      </EffectComposer>
    </>
  );
}

export default function GarageScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [7.2, 3.1, 8.4], fov: 38, near: 0.1, far: 80 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      aria-label="3D გარაჟი ავტომობილით და კედლის პოსტერებით"
    >
      <SceneContents />
    </Canvas>
  );
}
