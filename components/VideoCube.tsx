"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Face } from "./faces";

type Props = {
  faces: (Face | null)[];
  size: number;
  spinX: number;
  spinY: number;
  emptyColor: string;
};

export default function VideoCube({ faces, size, spinX, spinY, emptyColor }: Props) {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((_, dt) => {
    if (!mesh.current) return;
    mesh.current.rotation.x += dt * spinX;
    mesh.current.rotation.y += dt * spinY;
  });

  return (
    <mesh ref={mesh}>
      <boxGeometry args={[size, size, size]} />
      {faces.map((face, i) => (
        <meshBasicMaterial
          key={`${i}-${face?.id ?? "empty"}`}
          attach={`material-${i}`}
          map={face?.texture ?? null}
          color={face ? "#ffffff" : emptyColor}
          toneMapped={false}
        />
      ))}
    </mesh>
  );
}
