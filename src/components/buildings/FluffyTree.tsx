// src/components/buildings/FluffyTree.tsx

import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { FoliageMaterial } from './FoliageMaterial';
import { useFrame } from '@react-three/fiber';

interface FluffyTreeProps {
  position?: [number, number, number];
  color: string;
}

export const FluffyTree: React.FC<FluffyTreeProps> = ({ position = [0, 0, 0], color }) => {
  const materialRef = useRef<any>();

  // Создаем геометрию для листвы (плоскости)
  const foliageGeometry = useMemo(() => {
    // Создаем несколько плоскостей для имитации листвы
    const planes = [];
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    
    // Создаем 6 плоскостей в разных направлениях
    for (let i = 0; i < 6; i++) {
      const plane = planeGeometry.clone();
      planes.push(plane);
    }
    
    return planes;
  }, []);

  // Анимация времени для шейдера ветра
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <group position={position} dispose={null}>
      {/* 1. Рендерим ствол с обычным материалом */}
      <mesh castShadow receiveShadow position={[0, 1, 0]}>
        <cylinderGeometry args={[0.1, 0.2, 2.5, 8]} />
        <meshStandardMaterial color="#5c4033" />
      </mesh>
      
      {/* 2. Рендерим листву с кастомным шейдерным материалом */}
      <group position={[0, 2.5, 0]}>
        {/* Создаем несколько плоскостей для листвы */}
        {foliageGeometry.map((geometry, index) => (
          <mesh
            key={index}
            castShadow
            geometry={geometry}
            rotation={[
              (index * Math.PI) / 3,
              (index * Math.PI) / 3,
              (index * Math.PI) / 3
            ]}
          >
            <FoliageMaterial ref={materialRef} color={color} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
