import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LowPolyTree } from './LowPolyTree';

interface MixedEnvironmentProps {
  position?: [number, number, number];
  seed?: number;
  density?: number; // 1-5, количество объектов
}

export const MixedEnvironment: React.FC<MixedEnvironmentProps> = ({
  position = [0, 0, 0],
  seed = 1,
  density = 4
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Функция для псевдо-случайных значений
  const pseudoRandom = (value: number) => {
    const x = Math.sin(value * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  // Создаем геометрию для травы/кустов
  const grassGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(0.15, 0.3, 6);
    return geometry;
  }, []);

  // Материал для травы
  const grassMaterial = useMemo(() => {
    return new THREE.MeshLambertMaterial({
      color: new THREE.Color().setHSL(0.25, 0.6, 0.4 + pseudoRandom(10) * 0.3),
    });
  }, [seed]);

  // Загружаем GLB модели камней для смешанной среды
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

  // Генерируем смешанные объекты
  const mixedObjects = useMemo(() => {
    const numObjects = Math.floor(pseudoRandom(1) * density) + 2;
    const objects = [];

    for (let i = 0; i < numObjects; i++) {
      const objSeed = seed + i * 100;
      const objPseudoRandom = (value: number) => {
        const x = Math.sin(value * 12.9898 + objSeed * 78.233) * 43758.5453;
        return x - Math.floor(x);
      };

      // Позиция объекта
      const x = (objPseudoRandom(1) - 0.5) * 1.2;
      const z = (objPseudoRandom(2) - 0.5) * 1.2;

      // Тип объекта (дерево, трава, камень)
      const objectType = objPseudoRandom(3);

      if (objectType < 0.4) {
        // Дерево (40% вероятность)
        objects.push(
          <group key={`tree-${i}`} position={[x, 0, z]}>
            <LowPolyTree seed={objSeed} />
          </group>
        );
      } else if (objectType < 0.7) {
        // Трава/кусты (30% вероятность)
        const grassScale = 0.5 + objPseudoRandom(4) * 0.8;
        const grassRotation = objPseudoRandom(5) * Math.PI * 2;
        const grassY = 0.15;
        
        objects.push(
          <mesh
            key={`grass-${i}`}
            position={[x, grassY, z]}
            scale={[grassScale, grassScale, grassScale]}
            rotation={[0, grassRotation, 0]}
            geometry={grassGeometry}
            material={grassMaterial}
            castShadow
            receiveShadow
          />
        );
      } else {
        // Маленький камень (30% вероятность)
        const rockScale = 0.2 + objPseudoRandom(4) * 0.3; // 0.2-0.5 для маленьких камней
        const rockRotationY = objPseudoRandom(5) * Math.PI * 2;
        const rockRotationX = (objPseudoRandom(6) - 0.5) * 0.3;
        const rockRotationZ = (objPseudoRandom(7) - 0.5) * 0.3;
        const rockY = 0.03;

        // Выбираем случайную модель камня
        const stoneIndex = Math.floor(objPseudoRandom(8) * stoneModels.length);
        const selectedStone = stoneModels[stoneIndex];
        
        if (selectedStone) {
          objects.push(
            <group
              key={`rock-${i}`}
              position={[x, rockY, z]}
              scale={[rockScale, rockScale, rockScale]}
              rotation={[rockRotationX, rockRotationY, rockRotationZ]}
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
    }

    return objects;
  }, [seed, density, grassGeometry, grassMaterial, stoneModels]);

  // Легкая анимация для травы
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime * 0.5;
      const sway = Math.sin(time + seed * 0.3) * 0.005;
      groupRef.current.rotation.y = sway;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {mixedObjects}
    </group>
  );
};

// Предзагружаем все модели камней
for (let i = 1; i <= 8; i++) {
  const stoneNumber = i.toString().padStart(2, '0');
  useGLTF.preload(`/models/stones/stone_${stoneNumber}.glb`);
}
