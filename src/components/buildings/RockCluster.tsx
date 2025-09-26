import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface RockClusterProps {
  position?: [number, number, number];
  seed?: number;
  density?: number; // 1-5, количество камней
}

export const RockCluster: React.FC<RockClusterProps> = ({
  position = [0, 0, 0],
  seed = 1,
  density = 3
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Функция для псевдо-случайных значений
  const pseudoRandom = (value: number) => {
    const x = Math.sin(value * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  // Загружаем GLB модели камней
  const stone1 = useGLTF('/models/stones/stone_01.glb');
  const stone2 = useGLTF('/models/stones/stone_02.glb');
  const stone3 = useGLTF('/models/stones/stone_03.glb');
  const stone4 = useGLTF('/models/stones/stone_04.glb');
  const stone5 = useGLTF('/models/stones/stone_05.glb');
  const stone6 = useGLTF('/models/stones/stone_06.glb');
  const stone7 = useGLTF('/models/stones/stone_07.glb');
  const stone8 = useGLTF('/models/stones/stone_08.glb');

  const stoneModels = useMemo(() => {
    return [
      stone1.scene,
      stone2.scene,
      stone3.scene,
      stone4.scene,
      stone5.scene,
      stone6.scene,
      stone7.scene,
      stone8.scene
    ];
  }, [stone1, stone2, stone3, stone4, stone5, stone6, stone7, stone8]);

  // Генерируем камни из GLB моделей
  const rocks = useMemo(() => {
    const numRocks = Math.floor(pseudoRandom(1) * density) + 1;
    const rockElements = [];

    for (let i = 0; i < numRocks; i++) {
      const rockSeed = seed + i * 100;
      const rockPseudoRandom = (value: number) => {
        const x = Math.sin(value * 12.9898 + rockSeed * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };

      // Позиция камня
      const x = (rockPseudoRandom(1) - 0.5) * 0.8;
      const z = (rockPseudoRandom(2) - 0.5) * 0.8;
      const y = 0.05;

      // Выбираем случайную модель камня
      const stoneIndex = Math.floor(rockPseudoRandom(3) * stoneModels.length);
      const selectedStone = stoneModels[stoneIndex];

      // Размер камня
      const scale = 0.3 + rockPseudoRandom(4) * 0.4; // 0.3-0.7
      
      // Поворот камня
      const rotationY = rockPseudoRandom(5) * Math.PI * 2;
      const rotationX = (rockPseudoRandom(6) - 0.5) * 0.2;
      const rotationZ = (rockPseudoRandom(7) - 0.5) * 0.2;

      if (selectedStone) {
        rockElements.push(
          <group
            key={i}
            position={[x, y, z]}
            scale={[scale, scale, scale]}
            rotation={[rotationX, rotationY, rotationZ]}
          >
            <primitive 
              object={selectedStone.clone()} 
              castShadow 
              receiveShadow 
            />
          </group>
        );
      }
    }

    return rockElements;
  }, [seed, density, stoneModels]);

  // Легкая анимация (камни не качаются, но могут иметь небольшие вариации)
  useFrame((state) => {
    if (groupRef.current) {
      // Очень медленное покачивание для естественности
      const time = state.clock.elapsedTime * 0.1;
      const sway = Math.sin(time + seed * 0.5) * 0.005;
      groupRef.current.position.y = sway;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {rocks}
    </group>
  );
};

// Предзагружаем все модели камней
for (let i = 1; i <= 8; i++) {
  const stoneNumber = i.toString().padStart(2, '0');
  useGLTF.preload(`/models/stones/stone_${stoneNumber}.glb`);
}
