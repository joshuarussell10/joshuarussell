"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

const NODE_COUNT = 72;
const CONNECT_DISTANCE = 1.05;
const MOUSE_RADIUS = 2.2;
const MOUSE_FORCE = 0.55;
const MAX_CONNECTIONS = 280;

type MousePosition = { x: number; y: number };

type NetworkPalette = {
  nodeColor: string;
  edgeColor: string;
  glowColor: string;
};

type NodeNetworkProps = {
  mouse: MousePosition;
  interactive: boolean;
  palette: NetworkPalette;
};

type NodeData = {
  base: THREE.Vector3;
  offset: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number;
};

function buildNodes(): NodeData[] {
  const nodes: NodeData[] = [];

  for (let i = 0; i < NODE_COUNT; i++) {
    const angle = (i / NODE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
    const radius = 1.2 + Math.random() * 2.4;
    const layer = i % 3;

    nodes.push({
      base: new THREE.Vector3(
        Math.cos(angle) * radius * 1.35,
        Math.sin(angle) * radius * 0.55 + (layer - 1) * 0.35,
        (Math.random() - 0.5) * 1.1
      ),
      offset: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      phase: Math.random() * Math.PI * 2,
    });
  }

  return nodes;
}

function NodeNetwork({ mouse, interactive, palette }: NodeNetworkProps) {
  const groupRef = useRef<THREE.Group>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const glowRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const mouseTarget = useRef(new THREE.Vector3());
  const mouseSmooth = useRef(new THREE.Vector3());
  const tempPosition = useRef(new THREE.Vector3());

  const nodes = useMemo(() => buildNodes(), []);

  const pointPositions = useMemo(
    () => new Float32Array(nodes.length * 3),
    [nodes.length]
  );

  const glowPositions = useMemo(
    () => new Float32Array(nodes.length * 3),
    [nodes.length]
  );

  const linePositions = useMemo(
    () => new Float32Array(MAX_CONNECTIONS * 2 * 3),
    []
  );

  useFrame((state) => {
    if (document.hidden) return;

    mouseTarget.current.set(mouse.x * 2.4, mouse.y * 1.5, 0);
    mouseSmooth.current.lerp(
      mouseTarget.current,
      interactive ? 0.08 : 1
    );

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (interactive) {
        const driftX =
          Math.sin(state.clock.elapsedTime * 0.45 + node.phase) * 0.008;
        const driftY =
          Math.cos(state.clock.elapsedTime * 0.38 + node.phase * 1.2) * 0.007;

        tempPosition.current.copy(node.base).add(node.offset);
        tempPosition.current.x += driftX;
        tempPosition.current.y += driftY;

        const dx = tempPosition.current.x - mouseSmooth.current.x;
        const dy = tempPosition.current.y - mouseSmooth.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MOUSE_RADIUS && dist > 0.001) {
          const influence = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
          node.velocity.x += (dx / dist) * influence * 0.018;
          node.velocity.y += (dy / dist) * influence * 0.018;
        }

        node.velocity.multiplyScalar(0.9);
        node.offset.add(node.velocity);
        node.offset.multiplyScalar(0.94);

        if (node.offset.length() > 0.55) {
          node.offset.setLength(0.55);
        }
      }

      tempPosition.current.copy(node.base).add(node.offset);
      pointPositions[i * 3] = tempPosition.current.x;
      pointPositions[i * 3 + 1] = tempPosition.current.y;
      pointPositions[i * 3 + 2] = tempPosition.current.z;

      glowPositions[i * 3] = tempPosition.current.x;
      glowPositions[i * 3 + 1] = tempPosition.current.y;
      glowPositions[i * 3 + 2] = tempPosition.current.z;
    }

    let connectionCount = 0;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (connectionCount >= MAX_CONNECTIONS) break;

        const ax = pointPositions[i * 3];
        const ay = pointPositions[i * 3 + 1];
        const az = pointPositions[i * 3 + 2];
        const bx = pointPositions[j * 3];
        const by = pointPositions[j * 3 + 1];
        const bz = pointPositions[j * 3 + 2];

        const dx = ax - bx;
        const dy = ay - by;
        const dz = az - bz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist > CONNECT_DISTANCE) continue;

        const lineIndex = connectionCount * 6;
        linePositions[lineIndex] = ax;
        linePositions[lineIndex + 1] = ay;
        linePositions[lineIndex + 2] = az;
        linePositions[lineIndex + 3] = bx;
        linePositions[lineIndex + 4] = by;
        linePositions[lineIndex + 5] = bz;
        connectionCount++;
      }
    }

    const pointsGeometry = pointsRef.current?.geometry as
      | THREE.BufferGeometry
      | undefined;
    if (pointsGeometry?.attributes.position) {
      const attr = pointsGeometry.attributes.position as THREE.BufferAttribute;
      attr.array.set(pointPositions);
      attr.needsUpdate = true;
    }

    const glowGeometry = glowRef.current?.geometry as
      | THREE.BufferGeometry
      | undefined;
    if (glowGeometry?.attributes.position) {
      const attr = glowGeometry.attributes.position as THREE.BufferAttribute;
      attr.array.set(glowPositions);
      attr.needsUpdate = true;
    }

    const linesGeometry = linesRef.current?.geometry as
      | THREE.BufferGeometry
      | undefined;
    if (linesGeometry?.attributes.position) {
      const attr = linesGeometry.attributes.position as THREE.BufferAttribute;
      attr.array.fill(0);
      attr.array.set(linePositions.subarray(0, connectionCount * 6));
      attr.needsUpdate = true;
      linesGeometry.setDrawRange(0, connectionCount * 2);
    }

    if (groupRef.current) {
      if (interactive) {
        groupRef.current.rotation.y = state.clock.elapsedTime * 0.025;
        groupRef.current.rotation.x =
          Math.sin(state.clock.elapsedTime * 0.06) * 0.04;
        groupRef.current.position.x = mouseSmooth.current.x * 0.08;
        groupRef.current.position.y = mouseSmooth.current.y * 0.05;
      } else {
        groupRef.current.rotation.y = 0;
        groupRef.current.rotation.x = 0;
        groupRef.current.position.set(0, 0, 0);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={palette.edgeColor}
          transparent
          opacity={0.48}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      <Points ref={glowRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[glowPositions, 3]} />
        </bufferGeometry>
        <PointMaterial
          transparent
          color={palette.glowColor}
          size={0.18}
          sizeAttenuation
          depthWrite={false}
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </Points>

      <Points ref={pointsRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[pointPositions, 3]} />
        </bufferGeometry>
        <PointMaterial
          transparent
          color={palette.nodeColor}
          size={0.055}
          sizeAttenuation
          depthWrite={false}
          opacity={0.9}
        />
      </Points>
    </group>
  );
}

type HeroNetworkCanvasProps = {
  mouse: MousePosition;
  interactive: boolean;
};

export function HeroNetworkCanvas({ mouse, interactive }: HeroNetworkCanvasProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const palette: NetworkPalette = isDark
    ? {
        nodeColor: "#a5b4ff",
        edgeColor: "#67e8f9",
        glowColor: "#818cf8",
      }
    : {
        nodeColor: "#4f46e5",
        edgeColor: "#0e7490",
        glowColor: "#6366f1",
      };

  return (
    <div className="pointer-events-none absolute inset-0 -z-10">
      <div className="hero-webgl-glow absolute inset-0" />
      <Canvas
        camera={{ position: [0, 0, 5], fov: 52 }}
        dpr={[1, 1.5]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <NodeNetwork mouse={mouse} interactive={interactive} palette={palette} />
        </Suspense>
      </Canvas>
      <div className="hero-fade absolute inset-0" />
    </div>
  );
}

export function useHeroInteraction() {
  const [mouse, setMouse] = useState<MousePosition>({ x: 0, y: 0 });
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    setInteractive(!reducedMotion && !coarsePointer);
  }, []);

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!interactive) return;

    const rect = event.currentTarget.getBoundingClientRect();
    setMouse({
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    });
  };

  const onPointerLeave = () => {
    setMouse({ x: 0, y: 0 });
  };

  return { mouse, interactive, onPointerMove, onPointerLeave };
}
