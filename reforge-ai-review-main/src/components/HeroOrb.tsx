import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Environment } from "@react-three/drei";
import { useRef, Suspense } from "react";
import type { Mesh } from "three";

function Orb() {
  const ref = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) {
      ref.current.rotation.y += dt * 0.2;
      ref.current.rotation.x += dt * 0.05;
    }
  });
  return (
    <Float speed={1.4} rotationIntensity={0.6} floatIntensity={1.2}>
      <Sphere ref={ref} args={[1.3, 96, 96]}>
        <MeshDistortMaterial
          color="#7c6cff"
          distort={0.42}
          speed={1.6}
          roughness={0.15}
          metalness={0.6}
          emissive="#5b7cff"
          emissiveIntensity={0.35}
        />
      </Sphere>
      <Sphere args={[1.55, 64, 64]}>
        <meshBasicMaterial color="#8ea6ff" transparent opacity={0.08} />
      </Sphere>
    </Float>
  );
}

export default function HeroOrb() {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 45 }} dpr={[1, 2]}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 3]} intensity={1.2} color="#a5b4ff" />
        <directionalLight position={[-3, -2, 2]} intensity={0.8} color="#c9b3ff" />
        <Orb />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
