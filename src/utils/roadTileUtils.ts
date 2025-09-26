import * as THREE from 'three'

// Типы дорожных плиток
export type RoadTileType = 'straight' | 'turn60_left' | 'turn60_right' | 'turn120_left' | 'turn120_right'

// Направления в гексагональной сетке (0 = право, 1 = право-вверх, 2 = лево-вверх, 3 = лево, 4 = лево-вниз, 5 = право-вниз)
export const HEX_DIRECTIONS = [
  { q: 1, r: 0 },   // 0: право
  { q: 0, r: -1 },  // 1: право-вверх  
  { q: -1, r: -1 }, // 2: лево-вверх
  { q: -1, r: 0 },  // 3: лево
  { q: 0, r: 1 },   // 4: лево-вниз
  { q: 1, r: 1 }    // 5: право-вниз
]

// Получить направление от одной клетки к другой
export function getDirection(fromQ: number, fromR: number, toQ: number, toR: number): number {
  const deltaQ = toQ - fromQ
  const deltaR = toR - fromR
  
  for (let i = 0; i < HEX_DIRECTIONS.length; i++) {
    if (HEX_DIRECTIONS[i].q === deltaQ && HEX_DIRECTIONS[i].r === deltaR) {
      return i
    }
  }
  
  return -1 // Не соседняя клетка
}

// Получить все направления соединений для дорожной клетки
export function getCellConnections(
  cellQ: number, 
  cellR: number, 
  roadCellsSet: Set<string>
): number[] {
  const connections: number[] = []
  
  // Проверяем все 6 соседних клеток
  for (let direction = 0; direction < HEX_DIRECTIONS.length; direction++) {
    const neighborQ = cellQ + HEX_DIRECTIONS[direction].q
    const neighborR = cellR + HEX_DIRECTIONS[direction].r
    const neighborKey = `${neighborQ},${neighborR}`
    
    // Если соседняя клетка тоже является дорожной клеткой
    if (roadCellsSet.has(neighborKey)) {
      connections.push(direction)
    }
  }
  
  return connections.sort((a, b) => a - b)
}

// Определить тип дорожной плитки на основе соединений
export function getRoadTileType(connections: number[]): { type: RoadTileType; rotation: number } {
  if (connections.length === 0) {
    return { type: 'straight', rotation: 0 }
  }
  
  if (connections.length === 1) {
    // Одно соединение - тупик, используем прямую дорогу
    return { type: 'straight', rotation: 0 }
  }
  
  if (connections.length === 2) {
    const [dir1, dir2] = connections
    const angleDiff = Math.abs(dir2 - dir1)
    
    // Нормализуем разность углов (учитываем цикличность)
    const normalizedDiff = Math.min(angleDiff, 6 - angleDiff)
    
    if (normalizedDiff === 3) {
      // Противоположные направления - прямая дорога
      return { type: 'straight', rotation: 0 }
    } else if (normalizedDiff === 1) {
      // Поворот на 60 градусов
      const isLeftTurn = (dir2 - dir1 + 6) % 6 === 1
      return {
        type: isLeftTurn ? 'turn60_left' : 'turn60_right',
        rotation: 0  // Без поворота - модель уже правильно ориентирована
      }
    } else if (normalizedDiff === 2) {
      // Поворот на 120 градусов  
      const isLeftTurn = (dir2 - dir1 + 6) % 6 === 2
      return {
        type: isLeftTurn ? 'turn120_left' : 'turn120_right',
        rotation: 0  // Без поворота - модель уже правильно ориентирована
      }
    }
  }
  
  // Для случаев с 3+ соединениями используем прямую дорогу
  // В будущем можно добавить специальные модели для перекрестков
  return { type: 'straight', rotation: 0 }
}

// Получить путь к GLB файлу для типа плитки
export function getRoadTileModelPath(type: RoadTileType): string {
  return `/tiles/${type}.glb`
}

// --- Entry/Exit utilities for per-tile GLB selection ---
export const SIDE_LETTERS: ReadonlyArray<'a' | 'b' | 'c' | 'd' | 'e' | 'f'> = ['a', 'b', 'c', 'd', 'e', 'f']

// Центры сторон (углы нормалей к сторонам) для pointy-top гекса, по пользовательской схеме:
// a=top(90°), b=top-right(30°), c=bottom-right(-30°), d=bottom(-90°), e=bottom-left(-150°), f=top-left(150°)
export const SIDE_ANGLES: ReadonlyArray<number> = [
  Math.PI / 2,     // a
  Math.PI / 6,     // b
  -Math.PI / 6,    // c
  -Math.PI / 2,    // d
  -5 * Math.PI / 6,// e
  5 * Math.PI / 6  // f
]

export function normalizeAngle(angle: number): number {
  let a = angle
  while (a <= -Math.PI) a += Math.PI * 2
  while (a > Math.PI) a -= Math.PI * 2
  return a
}

// Преобразовать угол направления (из центра клетки к соседу) в индекс стороны 0..5 (соответствует SIDE_LETTERS)
// Глобальная поправка ориентации сетки относительно мировых осей
const SIDE_ANGLE_OFFSET = Math.PI / 6 // 30°

export function angleToSideIndex(angle: number): number {
  const a = normalizeAngle(angle + SIDE_ANGLE_OFFSET)
  // Специальный кейс для западного направления (угол около ±π):
  // предпочитаем 'e' (-150°) для отрицательного знака и 'f' (150°) для положительного
  const westThreshold = Math.PI - Math.PI / 12 // 15° окно вокруг π
  if (Math.abs(Math.abs(a) - Math.PI) < (Math.PI - westThreshold)) {
    return a < 0 ? 4 : 5
  }
  let best = 0
  let bestDiff = Math.PI * 2
  for (let i = 0; i < SIDE_ANGLES.length; i++) {
    const diff = Math.abs(normalizeAngle(a - SIDE_ANGLES[i]))
    if (diff < bestDiff) {
      best = i
      bestDiff = diff
    }
  }
  return best
}

// Определение стороны по аксиальному сдвигу к соседу (строгое соответствие сторонам)
export function neighborDeltaToSideIndex(dq: number, dr: number): number | null {
  if (dq === 0 && dr === -1) return 0   // a (top)
  if (dq === 1 && dr === -1) return 1   // b (top-right)
  if (dq === 1 && dr === 0) return 2    // c (bottom-right)
  if (dq === 0 && dr === 1) return 3    // d (bottom)
  if (dq === -1 && dr === 1) return 4   // e (bottom-left)
  if (dq === -1 && dr === 0) return 5   // f (top-left)
  return null
}

export function sideIndexToLetter(index: number): 'a' | 'b' | 'c' | 'd' | 'e' | 'f' {
  const i = ((index % 6) + 6) % 6
  return SIDE_LETTERS[i]
}

export function getEntryExitModelName(entrySideIndex: number, exitSideIndex: number): string {
  const entry = sideIndexToLetter(entrySideIndex)
  const exit = sideIndexToLetter(exitSideIndex)
  return `entry_${entry}_exit_${exit}`
}

export function getEntryExitModelPath(entrySideIndex: number, exitSideIndex: number): string {
  return `/tiles/${getEntryExitModelName(entrySideIndex, exitSideIndex)}.glb`
}

// Whitelist of available entry/exit models provided in /public/tiles
export const ENTRY_EXIT_AVAILABLE = new Set<string>([
  'entry_a_exit_c', 'entry_a_exit_d', 'entry_a_exit_e',
  'entry_b_exit_d', 'entry_b_exit_e', 'entry_b_exit_f',
  'entry_c_exit_a', 'entry_c_exit_e', 'entry_c_exit_f',
  'entry_d_exit_a', 'entry_d_exit_b', 'entry_d_exit_f',
  'entry_e_exit_a', 'entry_e_exit_b', 'entry_e_exit_c',
  'entry_f_exit_b', 'entry_f_exit_c', 'entry_f_exit_d'
])

// Known-bad models that should not be used until fixed
export const ENTRY_EXIT_BLOCKLIST = new Set<string>([
  'entry_c_exit_a' // suspected broken by user report
])

export function getEntryExitModelPathIfExists(entrySideIndex: number, exitSideIndex: number): string | undefined {
  const name = getEntryExitModelName(entrySideIndex, exitSideIndex)
  if (ENTRY_EXIT_AVAILABLE.has(name) && !ENTRY_EXIT_BLOCKLIST.has(name)) {
    return `/tiles/${name}.glb`
  }
  return undefined
}
