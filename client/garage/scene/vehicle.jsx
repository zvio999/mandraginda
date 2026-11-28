import { Center, Html, RoundedBox, useGLTF } from "@react-three/drei";
import { Component, Suspense, useLayoutEffect, useMemo } from "react";
import { Box3, Vector3 } from "three";

const BODY = "#46505b";
const TRIM = "#0f1114";
const BRAND = "#ec6c1b";
const DRACO = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

if (typeof useGLTF.setDecoderPath === "function") useGLTF.setDecoderPath(DRACO);

function BodyMaterial() {
  return <meshStandardMaterial color={BODY} metalness={0.55} roughness={0.32} />;
}

function TrimMaterial() {
  return <meshStandardMaterial color={TRIM} metalness={0.2} roughness={0.75} />;
}

function GlassMaterial() {
  return <meshPhysicalMaterial color="#0a0e13" metalness={0.1} roughness={0.05} clearcoat={1} transparent opacity={0.88} />;
}

export function Wheel({ position, mirrored, style }) {
  const face = mirrored ? -1 : 1;
  const steel = style === "w2" || style === "steel";
  const beadlock = style === "w1" || style === "beadlock";
  const ring = steel ? "#8b939c" : BRAND;
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.56, 0.56, 0.42, 40]} />
        <meshStandardMaterial color="#0c0d0f" roughness={0.95} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[face * 0.012, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.43, 24]} />
        <meshStandardMaterial color={steel ? "#6d747c" : "#1c1f24"} metalness={0.8} roughness={steel ? 0.45 : 0.35} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[face * 0.225, 0, 0]}>
        <torusGeometry args={[beadlock ? 0.4 : 0.36, beadlock ? 0.045 : 0.028, 10, 40]} />
        <meshStandardMaterial color={ring} metalness={0.6} roughness={0.3} />
      </mesh>
      {beadlock && [0, 1, 2, 3, 4, 5].map((n) => {
        const a = (n / 6) * Math.PI * 2;
        return (
          <mesh key={n} position={[face * 0.24, Math.sin(a) * 0.4, Math.cos(a) * 0.4]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.04, 8]} />
            <meshStandardMaterial color="#d7dde4" metalness={0.9} roughness={0.25} />
          </mesh>
        );
      })}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[face * 0.23, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.04, 16]} />
        <meshStandardMaterial color="#3a4048" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

function anchorsFor(object) {
  const mounts = [];
  const wheels = [];
  object.traverse((obj) => {
    if (/^Mount_(FL|FR|RL|RR)$/.test(obj.name)) mounts.push(obj);
    else if (/^Wheel_(FL|FR|RL|RR)$/i.test(obj.name)) wheels.push(obj);
  });
  const nodes = mounts.length ? mounts : wheels;
  object.updateWorldMatrix(true, true);
  if (nodes.length) {
    return nodes.map((node) => {
      const point = new Vector3();
      node.getWorldPosition(point);
      object.worldToLocal(point);
      return { key: node.name, position: [point.x, point.y, point.z], mirrored: point.x < 0 };
    });
  }
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  if (!isFinite(size.x) || size.x < 0.01) return [];
  const y = box.min.y + Math.min(size.y * 0.22, size.y * 0.35);
  const x = size.x * 0.38;
  const z = size.z * 0.32;
  return [
    { key: "fl", position: [center.x + x, y, center.z + z], mirrored: false },
    { key: "fr", position: [center.x - x, y, center.z + z], mirrored: true },
    { key: "rl", position: [center.x + x, y, center.z - z], mirrored: false },
    { key: "rr", position: [center.x - x, y, center.z - z], mirrored: true },
  ];
}

export function PartAttachmentSystem({ object, style, wheelScale }) {
  const active = style === "w1" || style === "w2" || style === "beadlock" || style === "steel";
  const anchors = useMemo(() => (object && active ? anchorsFor(object) : []), [object, active]);

  useLayoutEffect(() => {
    if (!object) return undefined;
    const hidden = [];
    if (active) {
      object.traverse((obj) => {
        if (obj.isMesh && /^Wheel_/i.test(obj.name)) {
          obj.visible = false;
          hidden.push(obj);
        }
      });
    }
    return () => {
      hidden.forEach((obj) => {
        obj.visible = true;
      });
    };
  }, [object, active]);

  if (!active) return null;
  return (
    <group>
      {anchors.map((anchor) => (
        <group key={anchor.key} position={anchor.position} scale={wheelScale}>
          <Wheel position={[0, 0, 0]} mirrored={anchor.mirrored} style={style} />
        </group>
      ))}
    </group>
  );
}

export function ProceduralRig({ style }) {
  const wheelSpots = [
    [0.98, 0.56, 1.32, false],
    [-0.98, 0.56, 1.32, true],
    [0.98, 0.56, -1.36, false],
    [-0.98, 0.56, -1.36, true],
  ];
  const grilleSlots = [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42];

  return (
    <group>
      <Html position={[0, 3.25, 0]} center distanceFactor={8} zIndexRange={[12, 0]}>
        <div className="model-chip">3D მოდელი მუშავდება</div>
      </Html>
      {wheelSpots.map(([x, y, z, mirrored]) => (
        <Wheel key={x + "-" + z} position={[x, y, z]} mirrored={mirrored} style={style} />
      ))}

      <mesh position={[0, 0.78, 0]} castShadow>
        <boxGeometry args={[1.45, 0.22, 3.9]} />
        <TrimMaterial />
      </mesh>
      <RoundedBox args={[1.86, 0.74, 3.62]} radius={0.06} smoothness={3} position={[0, 1.3, -0.05]} castShadow>
        <BodyMaterial />
      </RoundedBox>
      <mesh position={[0, 1.7, 1.02]} rotation={[0.03, 0, 0]} castShadow>
        <boxGeometry args={[1.74, 0.1, 1.42]} />
        <BodyMaterial />
      </mesh>
      <RoundedBox args={[1.8, 0.9, 2.05]} radius={0.05} smoothness={3} position={[0, 2.12, -0.78]} castShadow>
        <BodyMaterial />
      </RoundedBox>
      <mesh position={[0, 2.12, 0.27]} rotation={[-0.16, 0, 0]}>
        <boxGeometry args={[1.62, 0.74, 0.04]} />
        <GlassMaterial />
      </mesh>
      {[-0.3, -1.25].map((z) => (
        <mesh key={z} position={[0, 2.2, z]}>
          <boxGeometry args={[1.82, 0.5, 0.78]} />
          <GlassMaterial />
        </mesh>
      ))}
      <mesh position={[0, 2.2, -1.81]}>
        <boxGeometry args={[1.4, 0.48, 0.02]} />
        <GlassMaterial />
      </mesh>
      {grilleSlots.map((x) => (
        <mesh key={x} position={[x, 1.38, 1.77]}>
          <boxGeometry args={[0.08, 0.4, 0.04]} />
          <meshStandardMaterial color="#07080a" roughness={0.6} />
        </mesh>
      ))}
      {[0.68, -0.68].map((x) => (
        <group key={x} position={[x, 1.42, 1.77]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.05, 28]} />
            <meshStandardMaterial color="#14171b" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <circleGeometry args={[0.13, 28]} />
            <meshBasicMaterial color={[3.2, 3.1, 2.8]} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {[1, -1].map((side) =>
        [1.32, -1.36].map((z) => (
          <mesh key={side + "-" + z} position={[side * 0.98, 1.08, z]} castShadow>
            <boxGeometry args={[0.3, 0.12, 1.28]} />
            <TrimMaterial />
          </mesh>
        )),
      )}
      {[1, -1].map((side) => (
        <mesh key={side} position={[side * 0.98, 0.86, -0.02]} castShadow>
          <boxGeometry args={[0.12, 0.1, 1.5]} />
          <TrimMaterial />
        </mesh>
      ))}
      <mesh position={[0, 0.94, 1.96]} castShadow>
        <boxGeometry args={[2.06, 0.28, 0.3]} />
        <TrimMaterial />
      </mesh>
      <mesh position={[0, 0.94, 2.1]}>
        <boxGeometry args={[0.5, 0.18, 0.06]} />
        <meshStandardMaterial color="#20242a" metalness={0.8} roughness={0.4} />
      </mesh>
      {[0.62, -0.62].map((x) => (
        <mesh key={x} position={[x, 0.94, 2.14]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.07, 0.02, 8, 20]} />
          <meshStandardMaterial color={BRAND} metalness={0.5} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0, 0.94, -1.98]} castShadow>
        <boxGeometry args={[1.96, 0.24, 0.26]} />
        <TrimMaterial />
      </mesh>
      {[0.86, -0.86].map((x) => (
        <mesh key={x} position={[x, 1.45, -1.87]}>
          <boxGeometry args={[0.12, 0.3, 0.03]} />
          <meshBasicMaterial color={[2.4, 0.15, 0.1]} toneMapped={false} />
        </mesh>
      ))}
      <group position={[0, 1.5, -2.1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.5, 0.32, 36]} />
          <meshStandardMaterial color="#0c0d0f" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0, -0.165]}>
          <circleGeometry args={[0.3, 28]} />
          <meshStandardMaterial color="#1c1f24" metalness={0.8} roughness={0.35} />
        </mesh>
      </group>
      <mesh position={[0.97, 1.95, 0.72]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.05, 12]} />
        <TrimMaterial />
      </mesh>
      <mesh position={[0.97, 2.5, 0.78]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.2, 12]} />
        <TrimMaterial />
      </mesh>
      <group position={[0, 2.62, -0.78]}>
        <mesh castShadow>
          <boxGeometry args={[1.76, 0.05, 1.96]} />
          <meshStandardMaterial color="#121418" metalness={0.6} roughness={0.5} />
        </mesh>
        {[0.6, 0.2, -0.2, -0.6].map((z) => (
          <mesh key={z} position={[0, 0.04, z]}>
            <boxGeometry args={[1.76, 0.03, 0.06]} />
            <meshStandardMaterial color="#1d2127" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
        {[0.5, -0.5].map((x) => (
          <mesh key={x} position={[x, 0.08, -0.15]} castShadow>
            <boxGeometry args={[0.32, 0.05, 1.45]} />
            <meshStandardMaterial color={BRAND} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.06, 1.02]}>
          <boxGeometry args={[1.42, 0.1, 0.08]} />
          <meshStandardMaterial color="#14171b" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.06, 1.065]}>
          <planeGeometry args={[1.34, 0.06]} />
          <meshBasicMaterial color={[3, 2.9, 2.6]} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

function PublishedModel({ url, style }) {
  const { scene } = useGLTF(url, DRACO);
  const clone = useMemo(() => scene.clone(true), [scene]);
  const fitted = useMemo(() => {
    const size = new Box3().setFromObject(clone).getSize(new Vector3());
    const longest = Math.max(size.x, size.z) || 1;
    return { scale: 4.4 / longest };
  }, [clone]);

  useLayoutEffect(() => {
    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }, [clone]);

  return (
    <Center top>
      <group scale={fitted.scale}>
        <primitive object={clone} />
        <PartAttachmentSystem object={clone} style={style} wheelScale={1 / fitted.scale} />
      </group>
    </Center>
  );
}

class ModelBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Vehicle({ modelUrl, wheel }) {
  if (!modelUrl) return <ProceduralRig style={wheel} />;
  return (
    <ModelBoundary fallback={<ProceduralRig style={wheel} />} resetKey={modelUrl}>
      <Suspense fallback={<ProceduralRig style={wheel} />}>
        <PublishedModel url={modelUrl} style={wheel} />
      </Suspense>
    </ModelBoundary>
  );
}
