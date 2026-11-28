import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef } from "react";
import { Color, MathUtils, SRGBColorSpace } from "three";
import { WALL_Z } from "./garage-room.jsx";

const POSTER_H = 2.0;
const SLOT_W = 3.1;
const GAP = 0.55;
const POSTER_Y = 2.75;

function Poster({ src, x, glow, power, onOpen }) {
  const texture = useTexture(src, (map) => {
    map.colorSpace = SRGBColorSpace;
  });
  const group = useRef(null);
  const image = texture.image;
  const aspect = image && image.width && image.height ? image.width / image.height : 1.5;
  const h = Math.min(POSTER_H, SLOT_W / aspect);
  const w = h * aspect;

  useFrame((_, dt) => {
    if (!group.current) return;
    const s = MathUtils.damp(group.current.scale.x, 1, 5, dt);
    group.current.scale.setScalar(s);
    group.current.position.x = MathUtils.damp(group.current.position.x, x, 5, dt);
  });

  return (
    <group
      ref={group}
      position={[x, POSTER_Y, WALL_Z + 0.06]}
      scale={0.001}
      onClick={(event) => {
        event.stopPropagation();
        if (onOpen) onOpen(src);
      }}
    >
      <mesh position={[0, 0, -0.03]}>
        <planeGeometry args={[w + 0.34, h + 0.34]} />
        <meshBasicMaterial color={glow.clone().multiplyScalar(power)} toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <mesh>
        <boxGeometry args={[w + 0.16, h + 0.16, 0.06]} />
        <meshStandardMaterial color="#0e1013" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.032]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, h / 2 + 0.24, 0.04]}>
        <boxGeometry args={[0.7, 0.05, 0.12]} />
        <meshStandardMaterial color="#14171b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, h / 2 + 0.21, 0.1]}>
        <planeGeometry args={[0.6, 0.02]} />
        <meshBasicMaterial color={[3, 2.9, 2.7]} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function WallPosters({ photos, lightColor, intensity, onOpen }) {
  const visible = (photos || []).filter((photo) => photo.onWall && photo.src);
  const glow = useMemo(() => new Color(lightColor), [lightColor]);
  const power = 0.25 + (intensity / 100) * 0.9;
  const total = visible.length * SLOT_W + Math.max(0, visible.length - 1) * GAP;
  const start = -total / 2 + SLOT_W / 2;

  return (
    <group>
      {visible.map((photo, i) => (
        <Suspense key={photo.id} fallback={null}>
          <Poster src={photo.src} x={start + i * (SLOT_W + GAP)} glow={glow} power={power} onOpen={onOpen} />
        </Suspense>
      ))}
    </group>
  );
}
