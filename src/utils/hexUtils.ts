import { HEX_SIZE } from '../types/building'

// Правильная формула для плотной упаковки гексагональной сетки
export const hexToWorldPosition = (q: number, r: number, size: number = HEX_SIZE): [number, number, number] => {
  // Правильная формула для плотной упаковки
  const x = size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r)
  const z = size * (3/2 * r)
  return [x, 0, z]
}

// Конвертация world координат обратно в hex
export const worldToHexPosition = (x: number, z: number, size: number = HEX_SIZE): [number, number] => {
  const q = (Math.sqrt(3)/3 * x - 1/3 * z) / size
  const r = (2/3 * z) / size
  return [Math.round(q), Math.round(r)]
}

// Вычисление расстояния между гексагонами
export const hexDistance = (q1: number, r1: number, q2: number, r2: number): number => {
  const s1 = -q1 - r1
  const s2 = -q2 - r2
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2
}

// Получение соседей гексагона
export const getNeighbors = (q: number, r: number): [number, number][] => {
  const directions = [
    [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
  ]
  return directions.map(([dq, dr]) => [q + dq, r + dr])
}

// Проверка валидности гексагональных координат
export const isValidHex = (q: number, r: number): boolean => {
  const s = -q - r
  return Math.abs(q) <= 18 && Math.abs(r) <= 18 && Math.abs(s) <= 18
}

// Получение цвета ячейки
export const getCellColor = (state: string, type?: string): string => {
  if (type === 'project-center') return '#90EE90' // светло-зеленый
  if (type === 'hidden-slot') return '#D3D3D3' // светло-серый для скрытых
  if (state === 'occupied') return '#87CEEB' // светло-голубой
  if (state === 'highlighted') return '#FFD700' // золотой
  return '#FFFFFF' // белый для пустых
}

// Функция для вычисления ячеек между двумя точками в гексагональной сетке
export const getCellsBetween = (start: [number, number], end: [number, number]): Array<[number, number]> => {
  const [startQ, startR] = start
  const [endQ, endR] = end
  
  // Алгоритм линии для гексагональной сетки
  const cells: Array<[number, number]> = []
  
  // Вычисляем разность координат
  const deltaQ = endQ - startQ
  const deltaR = endR - startR
  
  // Определяем направление
  const stepQ = deltaQ === 0 ? 0 : deltaQ > 0 ? 1 : -1
  const stepR = deltaR === 0 ? 0 : deltaR > 0 ? 1 : -1
  
  // Вычисляем количество шагов
  const steps = Math.max(Math.abs(deltaQ), Math.abs(deltaR))
  
  if (steps === 0) {
    // Если начальная и конечная точки совпадают
    return [[startQ, startR]]
  }
  
  // Вычисляем промежуточные точки
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps
    const q = Math.round(startQ + deltaQ * t)
    const r = Math.round(startR + deltaR * t)
    cells.push([q, r])
  }
  
  return cells
} 