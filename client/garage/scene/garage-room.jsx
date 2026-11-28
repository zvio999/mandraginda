import { MeshReflectorMaterial } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace } from "three";

export const WALL_Z = -8.5;
const ROOM_HALF_WIDTH = 13;
const CEILING_Y = 7;

function useConcreteTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#23272d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 26000; i += 1) {
      const shade = 28 + Math.random() * 26;
      ctx.fillStyle = "rgba(" + shade + "," + (shade + 3) + "," + (shade + 7) + "," + (0.18 + Math.random() * 0.3) + ")";
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1 + Math.random() * 2.4, 1 + Math.random() * 2.4);
    }
    for (let i = 0; i < 40; i += 1) {
      ctx.fillStyle = "rgba(10,12,15," + (0.05 + Math.random() * 0.08) + ")";
      ctx.beginPath();
      ctx.ellipse(Math.random() * 1024, Math.random() * 512, 30 + Math.random() * 120, 10 + Math.random() * 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(6,7,9,0.9)";
    ctx.lineWidth = 3;
    for (let x = 0; x <= 1024; x += 256) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, 256);
    ctx.lineTo(1024, 256);
    ctx.stroke();
    ctx.fillStyle = "rgba(8,9,11,0.85)";
    for (let x = 0; x <= 1024; x += 256) {
      [40, 216, 296, 472].forEach((y) => {
        ctx.beginPath();
        ctx.arc(x + 28, y, 4, 0, Math.PI * 2);
        ctx.arc(x + 228, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(3.2, 1.1);
    texture.anisotropy = 8;
    return texture;
  }, []);
}

function LedStrip({ position, length, color, power, axis = "z" }) {
  const args = axis === "z" ? [0.14, 0.05, length] : [length, 0.05, 0.14];
  const housing = axis === "z" ? [0.26, 0.08, length + 0.1] : [length + 0.1, 0.08, 0.26];
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={housing} />
        <meshStandardMaterial color="#0d0f12" metalness={0.6} roughness={0.5} />
      </mesh>
      <mesh>
        <boxGeometry args={args} />
        <meshBasicMaterial color={color.clone().multiplyScalar(power)} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function GarageRoom({ lightColor, intensity }) {
  const concrete = useConcreteTexture();
  const k = intensity / 100;
  const color = useMemo(() => new Color(lightColor), [lightColor]);
  const power = 0.6 + k * 3.4;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <MeshReflectorMaterial
          blur={[400, 120]}
          resolution={1024}
          mixBlur={1}
          mixStrength={22}
          roughness={0.9}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          color="#121519"
          metalness={0.55}
          mirror={0.4}
        />
      </mesh>

      <mesh position={[0, CEILING_Y / 2, WALL_Z]} receiveShadow>
        <planeGeometry args={[ROOM_HALF_WIDTH * 2, CEILING_Y]} />
        <meshStandardMaterial map={concrete} roughness={0.92} metalness={0.05} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * ROOM_HALF_WIDTH, CEILING_Y / 2, 0]} rotation={[0, -side * (Math.PI / 2), 0]} receiveShadow>
          <planeGeometry args={[24, CEILING_Y]} />
          <meshStandardMaterial map={concrete} color="#9aa3ad" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, CEILING_Y, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_HALF_WIDTH * 2, 24]} />
        <meshStandardMaterial color="#0c0e11" roughness={1} />
      </mesh>

      {[-4.5, 0, 4.5].map((x) => (
        <LedStrip key={x} position={[x, CEILING_Y - 0.06, -1.5]} length={13} color={color} power={power} />
      ))}
      <LedStrip position={[0, 0.12, WALL_Z + 0.08]} length={ROOM_HALF_WIDTH * 2 - 0.4} color={new Color("#0f7ce1")} power={1.2 + k * 1.6} axis="x" />
      <LedStrip position={[0, 5.05, WALL_Z + 0.1]} length={ROOM_HALF_WIDTH * 2 - 0.4} color={color} power={power * 0.7} axis="x" />

      <ambientLight intensity={0.12 + k * 0.18} />
      <hemisphereLight args={["#2a3340", "#07080a", 0.25 + k * 0.2]} />
      <spotLight
        position={[0, CEILING_Y - 0.3, 0.5]}
        angle={0.62}
        penumbra={0.75}
        decay={0}
        intensity={0.6 + k * 2.2}
        color={color.clone().lerp(new Color("#ffffff"), 0.55)}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
      />
      <spotLight position={[6, 4, 6]} angle={0.5} penumbra={1} decay={0} intensity={0.35 + k * 0.6} color="#cfe2ff" />
      <spotLight position={[-6, 4, 5]} angle={0.5} penumbra={1} decay={0} intensity={0.25 + k * 0.5} color={lightColor} />
      <pointLight position={[0, 4.6, WALL_Z + 2.2]} decay={0} intensity={0.25 + k * 0.6} color={lightColor} distance={14} />
    </group>
  );
}

export function Turntable({ spin, scanning, children }) {
  const deck = useRef(null);
  const ring = useRef(null);
  const scan = useRef(null);
  const ticks = useMemo(() => Array.from({ length: 72 }, (_, i) => i), []);
  const { gl } = useThree();
  const drag = useRef({ active: false, lastX: 0, velocity: 0 });

  useEffect(() => {
    const el = gl.domElement;
    el.style.cursor = "grab";
    el.style.touchAction = "none";
    const onDown = (event) => {
      if (event.button !== 0) return;
      drag.current.active = true;
      drag.current.lastX = event.clientX;
      drag.current.velocity = 0;
      el.setPointerCapture(event.pointerId);
      el.style.cursor = "grabbing";
    };
    const onMove = (event) => {
      const state = drag.current;
      if (!state.active || !deck.current) return;
      const delta = (event.clientX - state.lastX) * 0.008;
      state.lastX = event.clientX;
      deck.current.rotation.y += delta;
      state.velocity = delta;
    };
    const onUp = (event) => {
      drag.current.active = false;
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
      el.style.cursor = "grab";
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [gl]);

  useFrame((state, dt) => {
    const stateDrag = drag.current;
    if (deck.current && !stateDrag.active) {
      if (Math.abs(stateDrag.velocity) > 0.0001) {
        deck.current.rotation.y += stateDrag.velocity;
        stateDrag.velocity *= Math.exp(-dt * 4);
      } else if (spin) {
        deck.current.rotation.y += dt * 0.22;
      }
    }
    if (ring.current && ring.current.material && ring.current.material.color) {
      const pulse = 2.2 + Math.sin(state.clock.elapsedTime * 2) * 0.6;
      ring.current.material.color.setRGB(0.925 * pulse, 0.424 * pulse, 0.106 * pulse);
    }
    if (scan.current) {
      const t = (Math.sin(state.clock.elapsedTime * 1.4) + 1) / 2;
      scan.current.position.y = 0.3 + t * 2.6;
      scan.current.visible = scanning;
    }
  });

  return (
    <group>
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[3.05, 3.15, 0.12, 96]} />
        <meshStandardMaterial color="#15181d" metalness={0.75} roughness={0.35} />
      </mesh>
      <mesh ref={ring} position={[0, 0.125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.92, 3.0, 128]} />
        <meshBasicMaterial color={[2.2, 1, 0.25]} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.45, 3.48, 128]} />
        <meshBasicMaterial color={[0.12, 0.9, 2.6]} toneMapped={false} />
      </mesh>
      {ticks.map((i) => {
        const a = (i / ticks.length) * Math.PI * 2;
        const long = i % 6 === 0;
        const r = long ? 3.75 : 3.68;
        return (
          <mesh key={i} position={[Math.sin(a) * r, 0.004, Math.cos(a) * r]} rotation={[-Math.PI / 2, 0, -a]}>
            <planeGeometry args={[0.02, long ? 0.28 : 0.12]} />
            <meshBasicMaterial color={long ? "#8b94a1" : "#3b424c"} />
          </mesh>
        );
      })}

      <group ref={deck} position={[0, 0.12, 0]}>
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <cylinderGeometry args={[2.88, 2.88, 0.04, 96]} />
          <meshStandardMaterial color="#1b1f25" metalness={0.6} roughness={0.55} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, (i / 12) * Math.PI * 2]}>
            <planeGeometry args={[0.015, 5.6]} />
            <meshBasicMaterial color="#2a3038" />
          </mesh>
        ))}
        <group position={[0, 0.04, 0]}>{children}</group>
      </group>

      <mesh ref={scan} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.55, 2.62, 128]} />
        <meshBasicMaterial color={[0.1, 0.8, 2.4]} toneMapped={false} transparent opacity={0.85} depthWrite={false} />
      </mesh>
    </group>
  );
}
