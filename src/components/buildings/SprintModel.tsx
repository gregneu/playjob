// src/components/buildings/SprintModel.tsx

import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface SprintModelProps {
  color: string;
  seed?: number;
}

export const SprintModel: React.FC<SprintModelProps> = ({
  color,
  seed = 1,
}) => {
  const { scene } = useGLTF('/models/sprint.glb');
  
  // Функция для псевдо-случайных значений
  const pseudoRandom = (value: number) => {
    const x = Math.sin(value * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  
  // Обрабатываем GLB модель
  const processedModel = useMemo(() => {
    if (!scene) {
      console.warn('GLB Sprint: Failed to load /models/sprint.glb');
      return null;
    }
    
    console.log(`🏔️ Loaded sprint model (seed: ${seed})`);
    
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
  }, [scene, seed]);
  
  if (!processedModel) {
    return null;
  }
  
  // Применяем случайные вариации размера и позиции
  const scaleVariation = (0.8 + pseudoRandom(5) * 0.4) / 3; // Уменьшаем в 3 раза: 0.27 - 0.4
  const rotationVariation = pseudoRandom(6) * Math.PI * 2; // 0 - 2π
  
  return (
    <group 
      position={[0, 0, 0]}
      scale={[scaleVariation, scaleVariation, scaleVariation]}
      rotation={[0, rotationVariation, 0]}
    >
      <primitive object={processedModel} />
    </group>
  );
};

// Предзагружаем модель
useGLTF.preload('/models/sprint.glb');
