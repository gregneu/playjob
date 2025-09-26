// src/components/buildings/LowPolyMountain.tsx

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface LowPolyMountainProps {
  position?: [number, number, number];
  color: string;
  seed?: number;
}

const pseudoRandom = (seed: number) => {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export const LowPolyMountain: React.FC<LowPolyMountainProps> = ({
  position = [0, 0, 0],
  color,
  seed = 1,
}) => {
  // Создаем low-poly геометрию горы
  const mountainGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(1, 2, 8, 1, true); // 8 граней для low-poly вида
    
    // Деформируем вершины для более естественного вида
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const pseudoSeed = seed + i;
      const randomFactor = 0.3;
      
      // Добавляем случайные смещения к вершинам
      vertices[i] += (pseudoRandom(pseudoSeed * 1.1) - 0.5) * randomFactor;
      vertices[i + 1] += (pseudoRandom(pseudoSeed * 1.2) - 0.5) * randomFactor * 0.5;
      vertices[i + 2] += (pseudoRandom(pseudoSeed * 1.3) - 0.5) * randomFactor;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, [seed]);

  // Создаем материал для скал
  const rockMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: color,
    flatShading: true, // Важно для low-poly вида
    roughness: 0.9
  }), [color]);

  // Создаем материал для снега
  const snowMaterial = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#FFFFFF',
    flatShading: true,
    roughness: 0.1,
    metalness: 0.0
  }), []);

  // Создаем геометрию для снежных шапок
  const snowGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(0.6, 0.8, 6, 1, true);
    
    // Деформируем снежные шапки
    const vertices = geometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      const pseudoSeed = seed + i + 1000;
      const randomFactor = 0.2;
      
      vertices[i] += (pseudoRandom(pseudoSeed * 1.1) - 0.5) * randomFactor;
      vertices[i + 1] += (pseudoRandom(pseudoSeed * 1.2) - 0.5) * randomFactor * 0.3;
      vertices[i + 2] += (pseudoRandom(pseudoSeed * 1.3) - 0.5) * randomFactor;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, [seed]);

  return (
    <group position={position} scale={[1.2, 1.2, 1.2]}>
      {/* Основная гора */}
      <mesh 
        geometry={mountainGeometry} 
        material={rockMaterial} 
        position={[0, 1, 0]}
        castShadow 
        receiveShadow 
      />
      
      {/* Снежная шапка на вершине */}
      <mesh 
        geometry={snowGeometry} 
        material={snowMaterial} 
        position={[0, 2.2, 0]}
        castShadow 
        receiveShadow 
      />
      
      {/* Дополнительные снежные участки на склонах */}
      <mesh 
        geometry={snowGeometry} 
        material={snowMaterial} 
        position={[0.3, 1.8, 0.2]}
        scale={[0.7, 0.6, 0.7]}
        rotation={[0, pseudoRandom(seed * 2) * Math.PI * 0.5, 0]}
        castShadow 
        receiveShadow 
      />
      
      <mesh 
        geometry={snowGeometry} 
        material={snowMaterial} 
        position={[-0.2, 1.6, -0.3]}
        scale={[0.5, 0.4, 0.5]}
        rotation={[0, pseudoRandom(seed * 3) * Math.PI * 0.5, 0]}
        castShadow 
        receiveShadow 
      />
    </group>
  );
};
