// src/components/buildings/FoliageMaterial.tsx

import React, { forwardRef } from 'react';
import { useTexture } from '@react-three/drei';
import CustomShaderMaterial from 'three-custom-shader-material';
import { MeshStandardMaterial, Color } from 'three';
import { foliageVertexShader } from './foliage.vertex.glsl';

interface FoliageMaterialProps {
  color: string;
}

export const FoliageMaterial = forwardRef<any, FoliageMaterialProps>(({ color }, ref) => {
  const uniforms = {
    uTime: { value: 0 },
    uWindSpeed: { value: 1.0 },
    uWindAmplitude: { value: 0.1 },
  };

  return (
    <CustomShaderMaterial
      ref={ref}
      baseMaterial={MeshStandardMaterial}
      vertexShader={foliageVertexShader}
      uniforms={uniforms}
      // Стандартные пропсы для MeshStandardMaterial
      color={new Color(color).convertLinearToSRGB()}
      metalness={0.1}
      roughness={0.9}
      transparent={true} // Включаем прозрачность
      alphaTest={0.5}    // Уровень отсечения прозрачных пикселей
    />
  );
});
