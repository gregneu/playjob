/**
 * ПРАВИЛЬНО вычисляет центральную гексагональную ячейку для набора ячеек,
 * используя преобразование в кубические координаты и округление.
 * @param cells - Массив ячеек в формате [q, r] или { q: number, r: number }.
 * @returns Координаты центральной ячейки [q, r] или null, если массив пуст.
 */
export const calculateHexZoneCenter = (
  cells: ([number, number] | { q: number; r: number })[]
): [number, number] | null => {
  if (!cells || cells.length === 0) {
    return null;
  }

  // 1. Вычисляем средние дробные axial-координаты
  let totalQ = 0;
  let totalR = 0;
  for (const cell of cells) {
    const q = Array.isArray(cell) ? cell[0] : cell.q;
    const r = Array.isArray(cell) ? cell[1] : cell.r;
    totalQ += q;
    totalR += r;
  }
  const avgQ = totalQ / cells.length;
  const avgR = totalR / cells.length;

  // 2. Преобразуем в дробные cube-координаты (x, y, z)
  const avgX = avgQ;
  const avgZ = avgR;
  const avgY = -avgX - avgZ;

  // 3. Округляем cube-координаты до ближайших целых
  let rx = Math.round(avgX);
  let ry = Math.round(avgY);
  let rz = Math.round(avgZ);

  // 4. Корректируем округленные значения, чтобы их сумма всегда была равна 0
  const xDiff = Math.abs(rx - avgX);
  const yDiff = Math.abs(ry - avgY);
  const zDiff = Math.abs(rz - avgZ);

  if (xDiff > yDiff && xDiff > zDiff) {
    rx = -ry - rz;
  } else if (yDiff > zDiff) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  // 5. Преобразуем валидные целочисленные cube-координаты обратно в axial (q, r)
  return [rx, rz];
};

/**
 * Конвертация hex-координат в мировые для сетки с ПЛОСКИМ верхом
 */
export const hexToWorldPosition = (q: number, r: number, hexSize: number = 1.0): [number, number, number] => {
  const x = hexSize * (3.0 / 2.0 * q);
  const z = hexSize * (Math.sqrt(3) / 2.0 * q + Math.sqrt(3) * r);
  return [x, 0, z];
};

/**
 * Конвертация мировых координат в hex-координаты
 */
export const worldToHexPosition = (x: number, z: number, hexSize: number = 1.0): [number, number] => {
  const q = (2.0 / 3.0 * x) / hexSize;
  const r = (-1.0 / 3.0 * x + Math.sqrt(3) / 3.0 * z) / hexSize;
  return [q, r];
};

/**
 * Получение соседних ячеек для гексагональной сетки
 */
export const getNeighbors = (q: number, r: number): [number, number][] => {
  const directions = [
    [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
  ];
  
  return directions.map(([dq, dr]) => [q + dq, r + dr]);
};

/**
 * Возвращает footprint зоны (центр + шесть соседей)
 */
export const getZoneFootprintCells = (q: number, r: number): Array<[number, number]> => {
  return [[q, r], ...getNeighbors(q, r)];
};

/**
 * Вычисление расстояния между двумя гексагональными ячейками
 */
export const hexDistance = (q1: number, r1: number, q2: number, r2: number): number => {
  const x1 = q1;
  const z1 = r1;
  const y1 = -x1 - z1;
  
  const x2 = q2;
  const z2 = r2;
  const y2 = -x2 - z2;
  
  return (Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2)) / 2;
};
