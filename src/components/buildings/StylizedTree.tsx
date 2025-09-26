// src/components/buildings/StylizedTree.tsx

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber'; // 1. Импортируем useFrame

interface StylizedTreeProps {
  position?: [number, number, number];
  color: string;
  seed?: number;
}

const pseudoRandom = (seed: number) => {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const StylizedTree: React.FC<StylizedTreeProps> = ({
  position = [0, 0, 0],
  color,
  seed = 1,
}) => {
  // 2. Создаем ref, чтобы "схватиться" за группу объектов кроны
  const canopyRef = useRef<THREE.Group>(null);

  // 3. Анимация с вариациями на основе seed!
  useFrame(({ clock }) => {
    if (canopyRef.current) {
      // Получаем общее время, прошедшее с момента запуска
      const time = clock.getElapsedTime();
      
      // Создаем вариации скорости и амплитуды на основе seed
      const windSpeed1 = 0.4 + pseudoRandom(seed * 1.4) * 0.3; // 0.4-0.7
      const windSpeed2 = 0.2 + pseudoRandom(seed * 1.5) * 0.2; // 0.2-0.4
      const amplitude1 = 0.03 + pseudoRandom(seed * 1.6) * 0.04; // 0.03-0.07
      const amplitude2 = 0.02 + pseudoRandom(seed * 1.7) * 0.03; // 0.02-0.05
      
      // Используем синусоиду для плавного покачивания с вариациями
      canopyRef.current.rotation.z = Math.sin(time * windSpeed1 + seed) * amplitude1;
      
      // Добавляем второе, более медленное покачивание по другой оси для сложности
      canopyRef.current.rotation.x = Math.sin(time * windSpeed2 + seed * 2) * amplitude2;
    }
  });

  // Создаем вариации базового цвета на основе seed
  const baseColor = useMemo(() => {
    const treeColor = new THREE.Color(color);
    
    // Добавляем небольшие вариации цвета на основе seed
    const hueVariation = (pseudoRandom(seed * 1.1) - 0.5) * 0.1; // ±0.05 оттенка
    const saturationVariation = (pseudoRandom(seed * 1.2) - 0.5) * 0.2; // ±0.1 насыщенности
    const lightnessVariation = (pseudoRandom(seed * 1.3) - 0.5) * 0.15; // ±0.075 яркости
    
    treeColor.offsetHSL(hueVariation, saturationVariation, lightnessVariation);
    return treeColor;
  }, [color, seed]);

  const canopyGeometry = useMemo(() => {
    const geometry = new THREE.IcosahedronGeometry(1, 1);
    const vertices = geometry.attributes.position.array;

    for (let i = 0; i < vertices.length; i += 3) {
      const pseudoSeed = seed + i;
      const randomFactorHorizontal = 0.15;
      const randomFactorVertical = 0.25;

      vertices[i] += (pseudoRandom(pseudoSeed * 1.1) - 0.5) * randomFactorHorizontal;
      vertices[i + 1] += (pseudoRandom(pseudoSeed * 1.2) - 0.5) * randomFactorVertical;
      vertices[i + 2] += (pseudoRandom(pseudoSeed * 1.3) - 0.5) * randomFactorHorizontal;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, [seed]);
  
  const material1 = useMemo(() => new THREE.MeshStandardMaterial({ color: baseColor.clone().offsetHSL(0, 0.05, 0.05), flatShading: true, roughness: 0.8 }), [baseColor]);
  const material2 = useMemo(() => new THREE.MeshStandardMaterial({ color: baseColor, flatShading: true, roughness: 0.8 }), [baseColor]);
  const material3 = useMemo(() => new THREE.MeshStandardMaterial({ color: baseColor.clone().offsetHSL(0, 0.0, -0.05), flatShading: true, roughness: 0.8 }), [baseColor]);
  const trunkMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5c4033', flatShading: true }), []);

  // Создаем вариации размера на основе seed
  const treeScale = useMemo(() => {
    const baseScale = 1.2;
    const scaleVariation = 0.8 + pseudoRandom(seed * 1.8) * 0.4; // 0.8-1.2
    return [baseScale * scaleVariation, baseScale * scaleVariation, baseScale * scaleVariation] as [number, number, number];
  }, [seed]);

  return (
    <group position={position} scale={treeScale}>
      <mesh position={[0, 0.75, 0]} material={trunkMaterial} castShadow>
        <cylinderGeometry args={[0.08, 0.15, 1.5, 5]} />
      </mesh>
      
      {/* 4. Привязываем ref к группе, которую хотим анимировать */}
      <group position={[0, 1.8, 0]} ref={canopyRef}>
        <mesh geometry={canopyGeometry} material={material1} scale={1.2} position={[0, 0, 0]} castShadow />
        <mesh geometry={canopyGeometry} material={material2} scale={0.8} position={[0.5, -0.3, 0.3]} rotation-y={pseudoRandom(seed * 2) * Math.PI} castShadow />
        <mesh geometry={canopyGeometry} material={material3} scale={0.9} position={[-0.4, -0.2, -0.4]} rotation-y={pseudoRandom(seed * 3) * Math.PI} castShadow />
        <mesh geometry={canopyGeometry} material={material2} scale={0.7} position={[0.1, -0.5, -0.6]} rotation-y={pseudoRandom(seed * 4) * Math.PI} castShadow />
      </group>
    </group>
  );
};
