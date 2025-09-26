import React from 'react';
// Импортируем константы из TypeScript файла, а не из JS
import { HEX_FILL_TYPES } from '../../utils/zoneHexFiller';
import type { HexFillType } from '../../utils/zoneHexFiller';

interface HexFillComponentProps {
  fillType: HexFillType;
  position?: [number, number, number];
  seed?: number;
}

/**
 * Компонент для рендеринга заполнения гекса на основе типа
 * Поддерживает три типа: trees, rocks, mixed
 */
export const HexFillComponent: React.FC<HexFillComponentProps> = ({
  fillType,
  position = [0, 0, 0],
  seed = 1
}) => {
  // Простая функция для псевдо-случайных значений
  const pseudoRandom = (value: number) => {
    const x = Math.sin(value * 12.9898 + seed * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };

  switch (fillType) {
    case HEX_FILL_TYPES.TREES:
      // Простые деревья из геометрии
      return (
        <group position={position}>
          {/* Основное дерево */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.6]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <coneGeometry args={[0.3, 0.4]} />
            <meshLambertMaterial color="#228B22" />
          </mesh>
          
          {/* Дополнительные деревья */}
          {seed % 3 === 0 && (
            <group position={[0.4, 0, 0.2]}>
              <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.4]} />
                <meshLambertMaterial color="#8B4513" />
              </mesh>
              <mesh position={[0, 0.4, 0]}>
                <coneGeometry args={[0.2, 0.3]} />
                <meshLambertMaterial color="#32CD32" />
              </mesh>
            </group>
          )}
        </group>
      );

    case HEX_FILL_TYPES.ROCKS:
      // Простые камни
      return (
        <group position={position}>
          {Array.from({ length: 3 + (seed % 3) }, (_, i) => {
            const x = (pseudoRandom(i + 1) - 0.5) * 0.6;
            const z = (pseudoRandom(i + 2) - 0.5) * 0.6;
            const scale = 0.2 + pseudoRandom(i + 3) * 0.3;
            return (
              <mesh key={i} position={[x, 0.1, z]} scale={[scale, scale, scale]}>
                <dodecahedronGeometry args={[1]} />
                <meshLambertMaterial color="#696969" />
              </mesh>
            );
          })}
        </group>
      );

    case HEX_FILL_TYPES.MIXED:
      // Смешанное заполнение
      return (
        <group position={position}>
          {/* Маленькое дерево */}
          <mesh position={[0.2, 0.2, 0.1]}>
            <cylinderGeometry args={[0.02, 0.02, 0.3]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0.2, 0.35, 0.1]}>
            <coneGeometry args={[0.15, 0.25]} />
            <meshLambertMaterial color="#228B22" />
          </mesh>
          
          {/* Камни */}
          <mesh position={[-0.2, 0.05, -0.1]}>
            <dodecahedronGeometry args={[0.15]} />
            <meshLambertMaterial color="#696969" />
          </mesh>
          
          {/* Трава */}
          <mesh position={[0, 0.05, -0.2]}>
            <coneGeometry args={[0.1, 0.2]} />
            <meshLambertMaterial color="#9ACD32" />
          </mesh>
        </group>
      );

    default:
      return null;
  }
};
