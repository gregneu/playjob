// src/components/buildings/foliage.vertex.glsl.ts

// Оборачиваем GLSL код в экспорт, чтобы его можно было импортировать
export const foliageVertexShader = `
  // Это uniform-переменные, которые мы будем передавать из React
  uniform float uTime;
  uniform float uWindSpeed;
  uniform float uWindAmplitude;

  // Функция для ремаппинга значений из одного диапазона в другой
  float remap(float value, float oldMin, float oldMax, float newMin, float newMax) {
    return newMin + (value - oldMin) * (newMax - newMin) / (oldMax - oldMin);
  }

  // --- Основная функция шейдера ---
  void main() {
    // --- 1. Эффект "пышности" и поворота к камере (Billboarding) ---
    vec2 vertexOffset = vec2(
      remap(uv.x, 0.0, 1.0, -1.0, 1.0),
      remap(uv.y, 0.0, 1.0, -1.0, 1.0)
    );
    
    // Переводим вершину в пространство вида (относительно камеры)
    vec4 worldViewPosition = modelViewMatrix * vec4(position, 1.0);
    
    // Смещаем вершину в пространстве вида, создавая эффект объема
    worldViewPosition.xy += vertexOffset * 0.5; // 0.5 - сила "пышности"

    // --- 2. Анимация ветра ---
    // Волна зависит от времени и глобальной позиции объекта в мире
    float wind = sin(uTime * uWindSpeed + (modelMatrix[3].x + modelMatrix[3].z) * 0.5);
    worldViewPosition.x += wind * uWindAmplitude;
    
    // csm_PositionRaw - специальная переменная из 'three-custom-shader-material'
    // Она передает измененную позицию в стандартный шейдер Three.js для дальнейших расчетов
    csm_PositionRaw = worldViewPosition;
  }
`;
