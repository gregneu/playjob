// src/components/buildings/LowPolyTree.tsx

import React, { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface LowPolyTreeProps {
  position?: [number, number, number];
  seed?: number;
}

export const LowPolyTree: React.FC<LowPolyTreeProps> = ({
  position = [0, 0, 0],
  seed = 1,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Функция для псевдо-случайных значений
  const pseudoRandom = (value: number) => {
    const x = Math.sin(value * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  
  // Выбираем случайное дерево из 15 доступных файлов
  const treeIndex = Math.floor(pseudoRandom(1) * 15) + 1; // 1-15
  const treePath = `/models/trees/tree_${treeIndex.toString().padStart(2, '0')}.glb`;
  
  const { scene } = useGLTF(treePath);
  
  // Обрабатываем выбранное дерево
  const processedTree = useMemo(() => {
    if (!scene) {
      console.warn(`GLB Tree: Failed to load ${treePath}`);
      return null;
    }
    
    console.log(`🌳 Selected tree ${treeIndex} from ${treePath} (seed: ${seed})`);
    
    // Клонируем сцену
    const clonedScene = scene.clone();
    
    // Просто включаем тени, оставляем оригинальные цвета из GLB
    clonedScene.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as any;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    
    return clonedScene;
  }, [scene, treeIndex, seed]);
  
  if (!processedTree) {
    return null;
  }
  
  // Применяем случайные вариации размера и позиции
  const scaleVariation = 0.5 + pseudoRandom(5) * 0.6; // 0.5 - 1.1 (больше вариаций)
  const rotationVariation = pseudoRandom(6) * Math.PI * 2; // 0 - 2π
  
  // Добавляем небольшие случайные наклоны для более естественного вида
  const tiltX = (pseudoRandom(7) - 0.5) * 0.1; // ±5 градусов
  const tiltZ = (pseudoRandom(8) - 0.5) * 0.1; // ±5 градусов
  
  // Анимация покачивания деревьев
  useFrame((state) => {
    if (groupRef.current) {
      // Создаем уникальную анимацию для каждого дерева на основе seed
      const time = state.clock.elapsedTime;
      const windSpeed = 0.4 + pseudoRandom(9) * 0.3; // 0.4-0.7 скорость ветра (медленнее)
      const windStrength = 0.01 + pseudoRandom(10) * 0.015; // 0.01-0.025 сила ветра (слабее)
      
      // Покачивание влево-вправо (ось Z)
      const swayX = Math.sin(time * windSpeed + seed * 0.5) * windStrength;
      // Легкое покачивание вперед-назад (ось X)
      const swayZ = Math.sin(time * windSpeed * 0.7 + seed * 0.3) * windStrength * 0.5;
      
      // Применяем анимацию к группе
      groupRef.current.rotation.x = tiltX + swayX;
      groupRef.current.rotation.z = tiltZ + swayZ;
    }
  });
  
  return (
    <group 
      ref={groupRef}
      position={position}
      scale={[scaleVariation, scaleVariation, scaleVariation]}
      rotation={[tiltX, rotationVariation, tiltZ]}
    >
      <primitive object={processedTree} />
    </group>
  );
};

// Предзагружаем все модели деревьев
for (let i = 1; i <= 15; i++) {
  const treePath = `/models/trees/tree_${i.toString().padStart(2, '0')}.glb`;
  useGLTF.preload(treePath);
}