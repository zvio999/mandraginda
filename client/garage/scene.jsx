import { Component, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, MeshReflectorMaterial, OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

const DRACO = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";
const MOUNTS = ["Mount_FL", "Mount_FR", "Mount_RL", "Mount_RR"];
const WHEELS = ["Wheel_FL", "Wheel_FR", "Wheel_RL", "Wheel_RR"];

const PRESETS = {
  front: { position: [0, 1.45, 5.5], target: [0, 0.75, 0] },
  side: { position: [5.6, 1.45, 0.35], target: [0, 0.75, 0] },
  rear: { position: [0, 1.55, -5.5], target: [0, 0.75, 0] },
  posters: { position: [0.2, 1.8, -0.4], target: [0, 1.55, -4.35] },
};

function CameraRig({ preset, focus, controls }) {
  const goal = useRef(new THREE.Vector3(0, 1.45, 5.5));
  const look = useRef(new THREE.Vector3(0, 0.75, 0));
  const animating = useRef(true);

  useEffect(function () {
    const chosen = focus || PRESETS[preset] || PRESETS.front;
    goal.current.set(chosen.position[0], chosen.position[1], chosen.position[2]);
    look.current.set(chosen.target[0], chosen.target[1], chosen.target[2]);
    animating.current = true;
  }, [preset, focus]);

  useFrame(function (state, delta) {
    if (!animating.current) return;
    const step = 1 - Math.pow(0.002, delta);
    state.camera.position.lerp(goal.current, step);
    if (controls.current) {
      controls.current.target.lerp(look.current, step);
      controls.current.update();
    }
    if (state.camera.position.distanceTo(goal.current) < 0.04) animating.current = false;
  });

  return (
    <OrbitControls
      ref={controls}
      enablePan={false}
      minDistance={2.2}
      maxDistance={8.5}
      maxPolarAngle={Math.PI / 2.05}
      onStart={function () { animating.current = false; }}
    />
  );
}

function Room({ light }) {
  const led = 0.4 + light * 2.4;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[7.2, 64]} />
        <MeshReflectorMaterial
          color="#24282c"
          roughness={0.82}
          metalness={0.35}
          blur={[280, 80]}
          mixBlur={1}
          mixStrength={0.55}
          resolution={512}
          mirror={0.35}
        />
      </mesh>
      <mesh position={[0, 1.8, -4.55]} receiveShadow>
        <boxGeometry args={[9.2, 3.6, 0.12]} />
        <meshStandardMaterial color="#12161b" roughness={0.9} />
      </mesh>
      <mesh position={[-4.55, 1.8, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[9.1, 3.6, 0.12]} />
        <meshStandardMaterial color="#101418" roughness={0.92} />
      </mesh>
      <mesh position={[4.55, 1.8, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <boxGeometry args={[9.1, 3.6, 0.12]} />
        <meshStandardMaterial color="#101418" roughness={0.92} />
      </mesh>
      <mesh position={[0, 3.58, 0]}>
        <boxGeometry args={[9.2, 0.08, 9.1]} />
        <meshStandardMaterial color="#0c1014" />
      </mesh>
      <mesh position={[-1.5, 3.42, 0]}>
        <boxGeometry args={[2.4, 0.06, 0.16]} />
        <meshStandardMaterial color="#d5e7ff" emissive="#d5e7ff" emissiveIntensity={led} />
      </mesh>
      <mesh position={[1.5, 3.42, -0.6]}>
        <boxGeometry args={[2.4, 0.06, 0.16]} />
        <meshStandardMaterial color="#d5e7ff" emissive="#d5e7ff" emissiveIntensity={led} />
      </mesh>
      <spotLight position={[-1.5, 3.3, 0]} angle={0.7} penumbra={0.6} intensity={8 * light} color="#e7f1ff" castShadow />
      <spotLight position={[1.5, 3.3, -0.6]} angle={0.7} penumbra={0.6} intensity={8 * light} color="#e7f1ff" castShadow />
      <ambientLight intensity={0.18 + light * 0.22} />
      <group position={[0, 0.04, 0]}>
        <mesh receiveShadow castShadow>
          <cylinderGeometry args={[1.85, 1.85, 0.08, 64]} />
          <meshStandardMaterial color="#1b2128" metalness={0.72} roughness={0.35} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <torusGeometry args={[1.78, 0.015, 12, 80]} />
          <meshStandardMaterial color="#ecb365" emissive="#ecb365" emissiveIntensity={0.35} />
        </mesh>
      </group>
    </group>
  );
}

function makeWheel(style, radius) {
  const group = new THREE.Group();
  group.name = "DemoWheel";
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(radius, radius * (style === "beadlock" ? 0.38 : 0.28), 16, 28),
    new THREE.MeshStandardMaterial({ color: "#161616", roughness: 0.85 })
  );
  const rimColor = style === "steel" ? "#b8bcc2" : "#c9a36a";
  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, radius * 0.34, style === "steel" ? 16 : 8),
    new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.85, roughness: 0.28 })
  );
  rim.rotation.z = Math.PI / 2;
  tire.rotation.y = Math.PI / 2;
  group.add(tire);
  group.add(rim);
  if (style === "beadlock") {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.72, radius * 0.05, 8, 24),
      new THREE.MeshStandardMaterial({ color: "#ecb365", metalness: 0.6, roughness: 0.35 })
    );
    ring.rotation.y = Math.PI / 2;
    group.add(ring);
  }
  group.traverse(function (obj) { obj.castShadow = true; });
  return group;
}

function PartAttachmentSystem({ root, style }) {
  const added = useRef([]);

  useLayoutEffect(function () {
    added.current.forEach(function (obj) {
      if (obj.parent) obj.parent.remove(obj);
    });
    added.current = [];
    if (!root) return undefined;
    const mounts = [];
    const wheels = [];
    root.traverse(function (obj) {
      if (MOUNTS.indexOf(obj.name) >= 0) mounts.push(obj);
      if (WHEELS.indexOf(obj.name) >= 0) wheels.push(obj);
    });
    wheels.forEach(function (obj) { obj.visible = style === "stock"; });
    if (style === "stock") return undefined;

    let anchors = mounts.length ? mounts : wheels;
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(0.22, Math.min(size.y * 0.16, 0.42));
    if (!anchors.length) {
      const center = box.getCenter(new THREE.Vector3());
      const y = box.min.y + Math.max(radius, size.y * 0.12);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (pair) {
        const anchor = new THREE.Object3D();
        anchor.name = "Mount_demo";
        root.attach(anchor);
        const world = new THREE.Vector3(center.x + pair[0] * size.x * 0.38, y, center.z + pair[1] * size.z * 0.3);
        anchor.position.copy(root.worldToLocal(world));
        anchors.push(anchor);
        added.current.push(anchor);
      });
    }
    anchors.forEach(function (anchor) {
      const wheel = makeWheel(style, mounts.length || wheels.length ? radius : radius);
      anchor.add(wheel);
      added.current.push(wheel);
    });
    return function () {
      added.current.forEach(function (obj) {
        if (obj.parent) obj.parent.remove(obj);
      });
      added.current = [];
    };
  }, [root, style]);

  return null;
}

function fitObject(object) {
  object.scale.set(1, 1, 1);
  object.position.set(0, 0, 0);
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z) || 1;
  object.scale.setScalar(2.35 / max);
  object.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(object);
  const center = fitted.getCenter(new THREE.Vector3());
  object.position.x -= center.x;
  object.position.z -= center.z;
  object.position.y -= fitted.min.y;
  object.position.y += 0.08;
  object.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

class ModelBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) return <PlaceholderCar style={this.props.style} label={this.props.label} />;
    return this.props.children;
  }
}

function LoadedCar({ url, style }) {
  const gltf = useGLTF(url, DRACO);
  const ref = useRef();
  useLayoutEffect(function () {
    fitObject(gltf.scene);
  }, [gltf]);
  return (
    <group ref={ref}>
      <primitive object={gltf.scene} />
      <PartAttachmentSystem root={gltf.scene} style={style} />
    </group>
  );
}

function PlaceholderCar({ style, label }) {
  const ref = useRef();
  const [ready, setReady] = useState(false);
  useLayoutEffect(function () { setReady(true); }, []);
  return (
    <group ref={ref} position={[0, 0.08, 0]}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[1.7, 0.62, 3.7]} />
        <meshStandardMaterial color="#ecb365" wireframe />
      </mesh>
      <mesh position={[0, 1.15, -0.25]} castShadow>
        <boxGeometry args={[1.45, 0.48, 1.7]} />
        <meshStandardMaterial color="#d7e7f5" wireframe />
      </mesh>
      <object3D name="Mount_FL" position={[-0.86, 0.34, 1.2]} />
      <object3D name="Mount_FR" position={[0.86, 0.34, 1.2]} />
      <object3D name="Mount_RL" position={[-0.86, 0.34, -1.2]} />
      <object3D name="Mount_RR" position={[0.86, 0.34, -1.2]} />
      <object3D name="Mount_Bumper" position={[0, 0.5, 1.9]} />
      <object3D name="Mount_Roof" position={[0, 1.45, -0.2]} />
      {ready ? <PartAttachmentSystem root={ref.current} style={style} /> : null}
      <Html position={[0, 1.85, 0]} center>
        <div className="model-chip">{label}</div>
      </Html>
    </group>
  );
}

function WallPosters({ posters, onFocus }) {
  const urls = posters.map(function (poster) { return poster.url; });
  const maps = useTexture(urls);
  const list = Array.isArray(maps) ? maps : [maps];
  const columns = Math.max(1, Math.min(posters.length, 4));
  return (
    <group>
      {posters.map(function (poster, index) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = (column - (columns - 1) / 2) * 1.55;
        const y = 2.15 - row * 1.25;
        return (
          <mesh
            key={poster.id + "-" + index}
            position={[x, y, -4.42]}
            onClick={function (event) {
              event.stopPropagation();
              const point = event.object.getWorldPosition(new THREE.Vector3());
              onFocus({
                photo: poster,
                position: [point.x, point.y, point.z + 2.4],
                target: [point.x, point.y, point.z],
              });
            }}
          >
            <boxGeometry args={[1.28, 0.92, 0.05]} />
            <meshStandardMaterial map={list[index]} color="#ffffff" roughness={0.45} metalness={0.08} />
          </mesh>
        );
      })}
    </group>
  );
}

function SceneBody({ light, preset, focus, wheelStyle, modelUrl, posters, pendingLabel, onFocus, controls }) {
  return (
    <>
      <color attach="background" args={["#070d12"]} />
      <fog attach="fog" args={["#070d12", 8, 16]} />
      <Room light={light} />
      <CameraRig preset={preset} focus={focus} controls={controls} />
      <Suspense fallback={null}>
        {modelUrl ? (
          <ModelBoundary key={modelUrl} style={wheelStyle} label={pendingLabel}>
            <LoadedCar url={modelUrl} style={wheelStyle} />
          </ModelBoundary>
        ) : <PlaceholderCar style={wheelStyle} label={pendingLabel} />}
        {posters.length ? <WallPosters posters={posters} onFocus={onFocus} /> : null}
      </Suspense>
    </>
  );
}

export default function GarageScene(props) {
  const controls = useRef();
  const posters = props.posters || [];
  const dpr = useMemo(function () { return [1, 1.6]; }, []);
  return (
    <Canvas shadows camera={{ position: [4.2, 2.1, 6.2], fov: 42 }} dpr={dpr}>
      <SceneBody
        light={props.light}
        preset={props.preset}
        focus={props.focus}
        wheelStyle={props.wheelStyle || "stock"}
        modelUrl={props.modelUrl || ""}
        posters={posters}
        pendingLabel={props.pendingLabel}
        onFocus={props.onFocus}
        controls={controls}
      />
    </Canvas>
  );
}
