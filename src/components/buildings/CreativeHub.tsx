// src/components/buildings/CreativeHub.tsx

import React, { useMemo } from 'react';
import * as THREE from 'three';

interface CreativeHubProps {
  color: string;
  seed?: number;
}

export const CreativeHub: React.FC<CreativeHubProps> = ({ color, seed = 1 }) => {
  // Создаем вариации цветов на основе seed
  const colors = useMemo(() => {
    const baseColor = new THREE.Color(color);
    const hsl = baseColor.getHSL({ h: 0, s: 0, l: 0 });
    
    // Создаем псевдо-случайные вариации на основе seed
    const pseudoRandom = (value: number) => {
      const x = Math.sin(value * 12.9898 + seed * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    
    // Вариации для каждого цвета
    const pinkHue = hsl.h + (pseudoRandom(1) - 0.5) * 0.1; // ±5% от основного оттенка
    const pinkSat = Math.max(0.3, Math.min(0.8, hsl.s + (pseudoRandom(2) - 0.5) * 0.2));
    const pinkLight = Math.max(0.4, Math.min(0.9, hsl.l + (pseudoRandom(3) - 0.5) * 0.2));
    
    const mintHue = 0.33 + (pseudoRandom(4) - 0.5) * 0.1; // Зеленый оттенок с вариацией
    const mintSat = Math.max(0.3, Math.min(0.7, 0.5 + (pseudoRandom(5) - 0.5) * 0.2));
    const mintLight = Math.max(0.6, Math.min(0.9, 0.7 + (pseudoRandom(6) - 0.5) * 0.2));
    
    const creamHue = 0.1 + (pseudoRandom(7) - 0.5) * 0.05; // Желтоватый оттенок
    const creamSat = Math.max(0.1, Math.min(0.4, 0.2 + (pseudoRandom(8) - 0.5) * 0.2));
    const creamLight = Math.max(0.7, Math.min(0.95, 0.85 + (pseudoRandom(9) - 0.5) * 0.15));
    
    return {
      pink: new THREE.Color().setHSL(pinkHue, pinkSat, pinkLight).getHexString(),
      mint: new THREE.Color().setHSL(mintHue, mintSat, mintLight).getHexString(),
      cream: new THREE.Color().setHSL(creamHue, creamSat, creamLight).getHexString(),
      gray: '#D3D3D3',       // Светло-серый (оставляем постоянным)
      darkGray: '#A9A9A9',   // Темно-серый (оставляем постоянным)
      white: '#FFFFFF'       // Белый (оставляем постоянным)
    };
  }, [color, seed]);

  // Создаем гексагональную геометрию для платформы
  const hexGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const radius = 1.2; // Радиус гексагона
    const sides = 6;
    
    for (let i = 0; i < sides; i++) {
      const angle = (i * Math.PI * 2) / sides;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    
    const extrudeSettings = {
      depth: 0.1,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // Поворачиваем геометрию на 90 градусов вокруг оси X, чтобы она лежала горизонтально
    geometry.rotateX(-Math.PI / 2);
    
    return geometry;
  }, []);

  return (
    <group>
      {/* Многослойная гексагональная платформа */}
      {/* Нижний слой - светло-розовый */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <primitive object={hexGeometry} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>
      
      {/* Средний слой - мятно-зеленый (меньший гексагон) */}
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <primitive object={hexGeometry.clone().scale(0.9, 1, 0.9)} />
        <meshStandardMaterial color={colors.mint} />
      </mesh>
      
      {/* Верхний слой - мятно-зеленый (еще меньший гексагон) */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <primitive object={hexGeometry.clone().scale(0.8, 1, 0.8)} />
        <meshStandardMaterial color={colors.mint} />
      </mesh>

      {/* Декоративные деревья на платформе */}
      <mesh position={[-0.6, 0.25, 0.4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.15, 6]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>
      <mesh position={[-0.6, 0.35, 0.4]} castShadow receiveShadow>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>
      
      <mesh position={[-0.3, 0.25, 0.4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.15, 6]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>
      <mesh position={[-0.3, 0.35, 0.4]} castShadow receiveShadow>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>

      {/* Декоративные сферы */}
      <mesh position={[-0.45, 0.2, 0.2]} castShadow receiveShadow>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>
      <mesh position={[-0.15, 0.2, 0.2]} castShadow receiveShadow>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>

      {/* Основная структура здания */}
      {/* Центральный розовый блок */}
      <mesh position={[-0.3, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.6, 0.8]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>

      {/* Круглый элемент с символом включения */}
      <mesh position={[-0.3, 0.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
        <meshStandardMaterial color={colors.mint} />
      </mesh>
      
      {/* Символ включения (белый) */}
      <mesh position={[-0.3, 0.86, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial color={colors.white} />
      </mesh>
      <mesh position={[-0.3, 0.87, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.02, 0.08, 0.01]} />
        <meshStandardMaterial color={colors.white} />
      </mesh>

      {/* Голубой куб сверху */}
      <mesh position={[-0.1, 0.7, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={colors.gray} />
      </mesh>

      {/* Кремовая платформа с буквой A */}
      <mesh position={[0.4, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.2, 0.8]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>

      {/* Большая буква A */}
      <mesh position={[0.4, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.4, 0.1]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>
      <mesh position={[0.4, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.1, 0.2, 0.1]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>

      {/* Темно-серый куб позади буквы A */}
      <mesh position={[0.4, 0.5, -0.3]} castShadow receiveShadow>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color={colors.darkGray} />
      </mesh>

      {/* Декоративные сферы на верхнем уровне */}
      <mesh position={[0.1, 0.8, 0.1]} castShadow receiveShadow>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={colors.gray} />
      </mesh>
      <mesh position={[0.2, 0.8, -0.1]} castShadow receiveShadow>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={colors.gray} />
      </mesh>
      <mesh position={[-0.1, 0.8, 0.2]} castShadow receiveShadow>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={colors.gray} />
      </mesh>

      {/* Кольцеобразный элемент */}
      <mesh position={[-0.7, 0.5, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.1, 0.03, 8, 16]} />
        <meshStandardMaterial color={colors.mint} />
      </mesh>

      {/* Зона отдыха/работы */}
      {/* Стол/экран планшета */}
      <mesh position={[0.8, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.8, 0.05, 0.6]} />
        <meshStandardMaterial color={colors.gray} />
      </mesh>

      {/* Красный экран */}
      <mesh position={[0.8, 0.43, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.01, 0.5]} />
        <meshStandardMaterial color="#FF6B6B" />
      </mesh>

      {/* Маленькие квадратики на экране */}
      {/* Ряд 1 */}
      <mesh position={[0.65, 0.44, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>
      <mesh position={[0.75, 0.44, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.mint} />
      </mesh>
      <mesh position={[0.85, 0.44, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.gray} />
      </mesh>
      <mesh position={[0.95, 0.44, 0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>

      {/* Ряд 2 */}
      <mesh position={[0.65, 0.44, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.mint} />
      </mesh>
      <mesh position={[0.75, 0.44, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>
      <mesh position={[0.85, 0.44, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>
      <mesh position={[0.95, 0.44, 0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.gray} />
      </mesh>

      {/* Ряд 3 */}
      <mesh position={[0.65, 0.44, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.gray} />
      </mesh>
      <mesh position={[0.75, 0.44, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>
      <mesh position={[0.85, 0.44, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>
      <mesh position={[0.95, 0.44, -0.05]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.mint} />
      </mesh>

      {/* Ряд 4 */}
      <mesh position={[0.65, 0.44, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.cream} />
      </mesh>
      <mesh position={[0.75, 0.44, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.gray} />
      </mesh>
      <mesh position={[0.85, 0.44, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.mint} />
      </mesh>
      <mesh position={[0.95, 0.44, -0.15]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 0.01, 0.08]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>

      {/* Текст с кодом #13Kdf3 */}
      <mesh position={[0.8, 0.45, 0.25]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.01, 0.05]} />
        <meshStandardMaterial color={colors.white} />
      </mesh>
      <mesh position={[0.8, 0.46, 0.25]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.02, 0.01]} />
        <meshStandardMaterial color={colors.darkGray} />
      </mesh>

      {/* Подушка-сердце */}
      <mesh position={[0.5, 0.2, 0.3]} castShadow receiveShadow>
        <sphereGeometry args={[0.15, 8, 6]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>

      {/* Кресло-мешок */}
      <mesh position={[1.0, 0.2, 0.3]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 0.3, 0.2]} />
        <meshStandardMaterial color={colors.mint} />
      </mesh>

      {/* Дополнительные сферы на земле */}
      <mesh position={[0.6, 0.1, 0.1]} castShadow receiveShadow>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>
      <mesh position={[0.7, 0.1, 0.1]} castShadow receiveShadow>
        <sphereGeometry args={[0.04, 8, 6]} />
        <meshStandardMaterial color={colors.pink} />
      </mesh>
    </group>
  );
};
