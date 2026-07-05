import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Group } from "three";

function Card({ color, position }: { color: string; position: [number, number, number] }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.3;
  });
  return (
    <Float speed={2} rotationIntensity={0.4} floatIntensity={0.8}>
      <group ref={ref} position={position}>
        <RoundedBox args={[1, 1.2, 0.1]} radius={0.1} smoothness={4}>
          <meshStandardMaterial color={color} metalness={0.5} roughness={0.2} emissive={color} emissiveIntensity={0.2} />
        </RoundedBox>
      </group>
    </Float>
  );
}

export default function MiniCards() {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 50 }} dpr={[1, 2]}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 2]} intensity={1} />
        <Card color="#7c6cff" position={[-1.6, 0.2, 0]} />
        <Card color="#5b9bff" position={[0, -0.2, 0.5]} />
        <Card color="#b48cff" position={[1.6, 0.3, 0]} />
      </Suspense>
    </Canvas>
  );
}
