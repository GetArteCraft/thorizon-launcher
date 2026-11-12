import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

type Kind = "grass" | "dirt" | "stone" | "sand" | "ore" | "trunk" | "leaf" | "flower";

interface Block {
  x: number;
  y: number;
  z: number;
  kind: Kind;
}

const PALETTE: Record<Kind, string[]> = {
  grass: ["#63b356", "#58a74d", "#6fbe60", "#4f9c46"],
  dirt: ["#7b5539", "#6f4b31", "#865c3e"],
  stone: ["#6d7683", "#626b78", "#78818e"],
  sand: ["#d8c58b", "#cbb67c"],
  ore: ["#5ee6a8"],
  trunk: ["#5a3a24", "#65422a"],
  leaf: ["#3f8f4a", "#4a9c55", "#357f40"],
  flower: ["#ff8fb3", "#ffd166", "#f4f1de", "#b49bff"],
};

function mulberry32(seed: number): () => number {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildIsland(): { blocks: Block[]; pond: { x: number; z: number; y: number; r: number } } {
  const rand = mulberry32(20261112);
  const blocks: Block[] = [];
  const pond = { x: 2.1, z: 1.3, y: 1.05, r: 2.3 };

  for (let x = -7; x <= 7; x += 1) {
    for (let z = -7; z <= 7; z += 1) {
      const distance = Math.hypot(x, z);
      const wobble = Math.sin(x * 0.85) * 0.35 + Math.cos(z * 1.05) * 0.3;
      if (distance > 6.35 + wobble) continue;
      if (rand() < 0.035) continue;

      const inPond = Math.hypot(x - pond.x, z - pond.z) < pond.r;
      const hill = Math.max(0, 2.6 - Math.hypot(x + 3.2, z - 3.4) * 1.05);
      const height = inPond
        ? 0
        : Math.max(0, 1 + Math.round((1 - distance / 7.2) * 2.2 + rand() * 0.7 + hill));
      for (let y = -2; y <= height; y += 1) {
        const kind: Kind =
          y === height ? (inPond ? "sand" : "grass") : y >= height - 1 ? "dirt" : "stone";
        blocks.push({ x, y, z, kind });
      }
      if (distance > 4.3 && rand() < 0.55) blocks.push({ x, y: -3, z, kind: "stone" });
      if (distance > 5.9 && rand() < 0.35) blocks.push({ x, y: -4, z, kind: "stone" });
      if (!inPond && distance < 4.6 && rand() < 0.06) {
        const oreY = Math.max(-2, height - 2);
        const ore = blocks.find((block) => block.x === x && block.z === z && block.y === oreY);
        if (ore) ore.kind = "ore";
      }
      if (!inPond && rand() < 0.06) {
        blocks.push({
          x,
          y: height + 0.62,
          z,
          kind: "flower",
        });
      }
    }
  }

  const tree = (x: number, z: number, height: number) => {
    const ground = blocks
      .filter((block) => block.x === x && block.z === z)
      .reduce((top, block) => Math.max(top, block.y), 0);
    for (let y = 1; y <= height; y += 1) blocks.push({ x, y: ground + y, z, kind: "trunk" });
    const crown = ground + height + 1;
    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dz = -2; dz <= 2; dz += 1) {
        for (let dy = 0; dy <= 2; dy += 1) {
          const spread = Math.abs(dx) + Math.abs(dz) + dy;
          if (spread > 4 || (dx === 0 && dz === 0 && dy < 2)) continue;
          if (rand() < 0.12) continue;
          blocks.push({ x: x + dx, y: crown + dy, z: z + dz, kind: "leaf" });
        }
      }
    }
  };

  tree(3, -3, 2);
  tree(-3, 2, 3);
  tree(-1, -4, 2);

  return { blocks, pond };
}

function miniIsland(cx: number, cy: number, cz: number, radius: number, seed: number): Block[] {
  const rand = mulberry32(seed);
  const blocks: Block[] = [];
  for (let x = -Math.ceil(radius); x <= Math.ceil(radius); x += 1) {
    for (let z = -Math.ceil(radius); z <= Math.ceil(radius); z += 1) {
      const distance = Math.hypot(x, z);
      if (distance > radius + rand() * 0.4) continue;
      const height = Math.max(0, Math.round((1 - distance / radius) * 1.6));
      for (let y = 0; y <= height; y += 1) {
        blocks.push({
          x: cx + x,
          y: cy + y,
          z: cz + z,
          kind: y === height ? "grass" : "dirt",
        });
      }
      if (distance < radius * 0.8) blocks.push({ x: cx + x, y: cy - 1, z: cz + z, kind: "stone" });
    }
  }
  return blocks;
}

function Instances({ blocks, kind }: { blocks: Block[]; kind: Kind }) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    const palette = PALETTE[kind];
    blocks.forEach((block, index) => {
      dummy.position.set(block.x, block.y, block.z);
      const scale = kind === "leaf" ? 0.94 : kind === "flower" ? 0.22 : 0.985;
      dummy.scale.setScalar(scale);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      color.set(palette[index % palette.length]!);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [blocks, kind]);

  if (blocks.length === 0) return null;

  const emissive = kind === "ore";

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, blocks.length]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        roughness={emissive ? 0.45 : kind === "flower" ? 0.6 : 0.92}
        metalness={emissive ? 0.25 : 0.02}
        flatShading
        emissive={emissive ? new THREE.Color("#2f8a63") : new THREE.Color("#000000")}
        emissiveIntensity={emissive ? 0.85 : 0}
      />
    </instancedMesh>
  );
}

function Water({ pond, animate }: { pond: { x: number; z: number; y: number; r: number }; animate: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!animate || !ref.current) return;
    ref.current.position.y = pond.y + Math.sin(state.clock.elapsedTime * 0.7) * 0.025;
    ref.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.12) * 0.02;
  });
  return (
    <mesh ref={ref} position={[pond.x, pond.y - 0.06, pond.z]} rotation-x={-Math.PI / 2}>
      <circleGeometry args={[pond.r * 0.94, 48]} />
      <meshPhysicalMaterial
        color="#2a7fb8"
        emissive="#0b2e42"
        emissiveIntensity={0.35}
        transparent
        opacity={0.92}
        roughness={0.75}
        metalness={0}
      />
    </mesh>
  );
}

function Crystals({ animate }: { animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!animate || !group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.18;
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.12;
  });

  const spots: Array<[number, number, number, string]> = [
    [-5.6, 3.4, 2.4, "#5ee6a8"],
    [5.2, 4.2, -2.2, "#7aa2ff"],
    [0.8, 5.4, 4.6, "#b49bff"],
  ];

  return (
    <group ref={group}>
      {spots.map(([x, y, z, color]) => (
        <mesh key={color} position={[x, y, z]} rotation={[0.4, x, 0.2]}>
          <octahedronGeometry args={[0.34, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1.4}
            roughness={0.2}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function RuneRing({ animate }: { animate: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!animate || !ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * 0.05;
  });
  return (
    <mesh ref={ref} position={[0, 0.4, 0]} rotation={[Math.PI / 2.35, 0, 0]}>
      <torusGeometry args={[7.6, 0.035, 8, 96]} />
      <meshBasicMaterial color="#5ee6a8" transparent opacity={0.32} />
    </mesh>
  );
}

function Sparks({ animate, count = 70 }: { animate: boolean; count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const rand = mulberry32(77);
    const array = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      array[index * 3] = (rand() - 0.5) * 26;
      array[index * 3 + 1] = rand() * 12 - 2;
      array[index * 3 + 2] = (rand() - 0.5) * 26;
    }
    return array;
  }, [count]);

  useFrame((state) => {
    if (!animate || !ref.current) return;
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.3;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#9ff5cf" size={0.055} transparent opacity={0.55} sizeAttenuation />
    </points>
  );
}

function CameraRig({ animate }: { animate: boolean }) {
  useFrame((state, delta) => {
    if (!animate) return;
    const camera = state.camera;
    const targetX = 18.5 + state.pointer.x * 1.7;
    const targetY = 13.2 + state.pointer.y * 0.9;
    camera.position.x += (targetX - camera.position.x) * Math.min(1, delta * 2.2);
    camera.position.y += (targetY - camera.position.y) * Math.min(1, delta * 2.2);
    camera.lookAt(0, 2, 0);
  });
  return null;
}

function Scene({ animate, quality }: { animate: boolean; quality: "high" | "low" }) {
  const { blocks, pond } = useMemo(buildIsland, []);
  const extras = useMemo(
    () => [...miniIsland(-10, 3.5, -4, 2.2, 31), ...miniIsland(9.5, 5.8, 2.5, 1.6, 57)],
    [],
  );
  const all = useMemo(() => [...blocks, ...extras], [blocks, extras]);
  const groups = useMemo(() => {
    const map: Record<Kind, Block[]> = {
      grass: [],
      dirt: [],
      stone: [],
      sand: [],
      ore: [],
      trunk: [],
      leaf: [],
      flower: [],
    };
    for (const block of all) map[block.kind].push(block);
    return map;
  }, [all]);

  return (
    <>
      <ambientLight intensity={0.62} color="#dfeaff" />
      <hemisphereLight args={["#dff3ff", "#243024", 0.55]} />
      <directionalLight position={[9, 16, 7]} intensity={2.1} color="#fff2d0" />
      <directionalLight position={[-8, 6, -9]} intensity={0.55} color="#7aa2ff" />
      <group>
        <Instances blocks={groups.grass} kind="grass" />
        <Instances blocks={groups.dirt} kind="dirt" />
        <Instances blocks={groups.stone} kind="stone" />
        <Instances blocks={groups.sand} kind="sand" />
        <Instances blocks={groups.ore} kind="ore" />
        <Instances blocks={groups.trunk} kind="trunk" />
        <Instances blocks={groups.leaf} kind="leaf" />
        <Instances blocks={groups.flower} kind="flower" />
        <Water pond={pond} animate={animate} />
        <Crystals animate={animate} />
        <RuneRing animate={animate} />
      </group>
      <Sparks animate={animate} count={quality === "high" ? 90 : 40} />
      <CameraRig animate={animate} />
    </>
  );
}

export interface WorldSceneProps {
  reduced?: boolean;
  quality?: "auto" | "high" | "low" | "off";
}

export function detectSceneQuality(): "high" | "low" | "off" {
  if (typeof document === "undefined") return "off";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return "off";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|software/i.test(renderer)) return "low";
    return (navigator.hardwareConcurrency ?? 4) <= 4 ? "low" : "high";
  } catch {
    return "off";
  }
}

export default function WorldScene({ reduced = false, quality = "auto" }: WorldSceneProps) {
  const resolved = quality === "auto" ? detectSceneQuality() : quality;
  const animate = !reduced && resolved !== "off";

  if (resolved === "off") {
    return (
      <div className="scene-fallback" aria-hidden="true">
        <div className="scene-fallback__sun" />
        <div className="scene-fallback__grid" />
        <div className="scene-fallback__cube">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <Canvas
      className="scene-canvas"
      camera={{ position: [18.5, 13.2, 21], fov: 38 }}
      dpr={resolved === "high" ? [1, 1.8] : [1, 1.15]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={animate ? "always" : "demand"}
    >
      <Scene animate={animate} quality={resolved} />
    </Canvas>
  );
}
