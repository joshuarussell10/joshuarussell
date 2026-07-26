"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import type { MousePosition } from "@/lib/hero-webgl/config";
import {
  getMouseForce,
  lanyardConfig,
  type LanyardPalette,
} from "@/lib/hero-webgl/lanyard-config";

type LanyardBadgeSceneProps = {
  mouse: MousePosition;
  interactive: boolean;
  pointerActive: boolean;
  palette: LanyardPalette;
  name: string;
  initials: string;
  title: string;
};

type PhysicsState = {
  angleX: number;
  angleZ: number;
  velocityX: number;
  velocityZ: number;
};

export function LanyardBadgeScene({
  mouse,
  interactive,
  pointerActive,
  palette,
  name,
  initials,
  title,
}: LanyardBadgeSceneProps) {
  const badgeRef = useRef<THREE.Group>(null);
  const strapRef = useRef<THREE.Mesh>(null);
  const strapHighlightRef = useRef<THREE.Mesh>(null);
  const strapDirection = useRef(new THREE.Vector3(0, -1, 0));
  const strapMidpoint = useRef(new THREE.Vector3());
  const up = useRef(new THREE.Vector3(0, 1, 0));

  const physics = useRef<PhysicsState>({
    angleX: 0,
    angleZ: 0,
    velocityX: 0,
    velocityZ: 0,
  });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.032);
    const { restore, settleRestore, damping, maxAngle } = lanyardConfig.physics;
    const isActive = interactive && pointerActive;
    const force = getMouseForce(mouse, interactive, pointerActive);
    const body = physics.current;
    const spring = isActive ? restore : settleRestore;

    body.velocityX +=
      (-spring * body.angleX + force.x - body.velocityX * (1 - damping) * 10) * dt;
    body.velocityZ +=
      (-spring * body.angleZ + force.z - body.velocityZ * (1 - damping) * 10) * dt;

    body.angleX = THREE.MathUtils.clamp(
      body.angleX + body.velocityX * dt,
      -maxAngle,
      maxAngle
    );
    body.angleZ = THREE.MathUtils.clamp(
      body.angleZ + body.velocityZ * dt,
      -maxAngle,
      maxAngle
    );

    if (!isActive) {
      if (Math.abs(body.angleX) < 0.002) body.angleX = 0;
      if (Math.abs(body.angleZ) < 0.002) body.angleZ = 0;
      if (Math.abs(body.velocityX) < 0.002) body.velocityX = 0;
      if (Math.abs(body.velocityZ) < 0.002) body.velocityZ = 0;
    }

    const length = lanyardConfig.strapLength;
    const anchorY = lanyardConfig.anchorY;
    const offsetX = Math.sin(body.angleZ) * length * 0.92;
    const offsetY = -Math.cos(body.angleX) * Math.cos(body.angleZ) * length;
    const offsetZ = Math.sin(body.angleX) * length * 0.28;

    const badgeX = offsetX;
    const badgeY = anchorY + offsetY;
    const badgeZ = offsetZ;
    const clipY = badgeY + lanyardConfig.badge.height * 0.46;

    if (badgeRef.current) {
      badgeRef.current.position.set(badgeX, badgeY, badgeZ);
      badgeRef.current.rotation.set(
        body.angleX * 0.7,
        0,
        body.angleZ * 0.75
      );
    }

    const anchor = new THREE.Vector3(0, anchorY, 0);
    const clip = new THREE.Vector3(badgeX * 0.35, clipY, badgeZ * 0.35);

    for (const meshRef of [strapRef, strapHighlightRef]) {
      const mesh = meshRef.current;
      if (!mesh) continue;

      strapDirection.current.copy(clip).sub(anchor);
      const strapLength = strapDirection.current.length();
      strapMidpoint.current.copy(anchor).add(clip).multiplyScalar(0.5);
      mesh.position.copy(strapMidpoint.current);
      mesh.scale.y = strapLength;
      mesh.quaternion.setFromUnitVectors(
        up.current,
        strapDirection.current.normalize()
      );
    }
  });

  const { badge } = lanyardConfig;

  return (
    <>
      <ambientLight intensity={0.85} />
      <directionalLight position={[2.5, 4, 3]} intensity={1.1} />
      <directionalLight position={[-2, 1.5, -2]} intensity={0.35} />

      <mesh ref={strapRef}>
        <boxGeometry args={[0.045, 1, 0.018]} />
        <meshStandardMaterial
          color={palette.strap}
          metalness={0.15}
          roughness={0.55}
        />
      </mesh>
      <mesh ref={strapHighlightRef}>
        <boxGeometry args={[0.018, 1, 0.01]} />
        <meshBasicMaterial
          color={palette.strapHighlight}
          transparent
          opacity={0.55}
        />
      </mesh>

      <mesh position={[0, lanyardConfig.anchorY + 0.08, 0]}>
        <boxGeometry args={[0.55, 0.1, 0.08]} />
        <meshStandardMaterial
          color={palette.clip}
          metalness={0.65}
          roughness={0.35}
        />
      </mesh>

      <group ref={badgeRef}>
        <RoundedBox
          args={[badge.width, badge.height, badge.depth]}
          radius={badge.radius}
          smoothness={4}
        >
          <meshStandardMaterial
            color={palette.card}
            metalness={0.08}
            roughness={0.55}
          />
        </RoundedBox>

        <mesh position={[0, 0, badge.depth * 0.6]}>
          <planeGeometry args={[badge.width + 0.02, badge.height + 0.02]} />
          <meshBasicMaterial
            color={palette.cardBorder}
            transparent
            opacity={0.35}
          />
        </mesh>

        <mesh position={[0, badge.height * 0.46, badge.depth * 0.55]}>
          <boxGeometry args={[0.22, 0.12, 0.06]} />
          <meshStandardMaterial
            color={palette.clip}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>

        <mesh position={[0, badge.height * 0.28, badge.depth * 0.55]}>
          <circleGeometry args={[badge.photoRadius, 48]} />
          <meshStandardMaterial
            color={palette.photo}
            metalness={0.15}
            roughness={0.45}
          />
        </mesh>

        <mesh position={[0, badge.height * 0.28, badge.depth * 0.62]}>
          <ringGeometry
            args={[badge.photoRadius * 0.92, badge.photoRadius * 1.05, 48]}
          />
          <meshBasicMaterial
            color={palette.photoRing}
            transparent
            opacity={0.9}
          />
        </mesh>

        <Text
          position={[0, badge.height * 0.28, badge.depth * 0.7]}
          fontSize={0.28}
          color={palette.name}
          anchorX="center"
          anchorY="middle"
        >
          {initials}
        </Text>

        <Text
          position={[0, badge.height * 0.02, badge.depth * 0.65]}
          fontSize={0.17}
          color={palette.name}
          anchorX="center"
          anchorY="middle"
          maxWidth={badge.width * 0.88}
          textAlign="center"
        >
          {name}
        </Text>

        <Text
          position={[0, -badge.height * 0.14, badge.depth * 0.65]}
          fontSize={0.1}
          color={palette.subtitle}
          anchorX="center"
          anchorY="middle"
          maxWidth={badge.width * 0.9}
          textAlign="center"
        >
          {title}
        </Text>

        <mesh position={[0, -badge.height * 0.36, badge.depth * 0.55]}>
          <planeGeometry args={[badge.width * 0.78, 0.22]} />
          <meshStandardMaterial color={palette.stripe} roughness={0.7} />
        </mesh>

        {Array.from({ length: 14 }).map((_, index) => (
          <mesh
            key={index}
            position={[
              -badge.width * 0.34 + index * (badge.width * 0.052),
              -badge.height * 0.36,
              badge.depth * 0.62,
            ]}
          >
            <planeGeometry args={[0.018, 0.16]} />
            <meshBasicMaterial
              color={index % 3 === 0 ? palette.stripeAccent : palette.name}
              transparent
              opacity={index % 3 === 0 ? 0.9 : 0.35}
            />
          </mesh>
        ))}

        <mesh
          position={[0, -badge.height * 0.52, -0.02]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[badge.width * 0.55, 32]} />
          <meshBasicMaterial
            color={palette.lanyardShadow}
            transparent
            opacity={0.12}
          />
        </mesh>
      </group>
    </>
  );
}
