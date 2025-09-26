// Гексагональные координаты
export interface HexCoordinates {
  q: number
  r: number
  s: number
}

// Центральная ячейка проекта
export interface ProjectCenterCell {
  type: 'project-center'
  coordinates: [number, number]
  projectName: string
  sign3D: {
    text: string
    color: '#8B4513'
    height: 2
  }
}

// Строительные ячейки
export interface BuildingCell {
  type: 'building-slot' | 'hidden-slot'
  coordinates: [number, number]
  state: 'empty' | 'occupied' | 'highlighted' | 'hidden'
  buildingType?: BuildingType | null
  isVisible: boolean
  // Новые поля для системы категорий
  category?: string
  taskName?: string
  progress?: number
  priority?: number
}

// Типы зданий
export enum BuildingType {
  HOUSE = 'house',
  TREE = 'tree',
  FACTORY = 'factory',
  BUG = 'bug',
  MOUNTAIN = 'mountain',
  VOLCANO = 'volcano',
  LAKE = 'lake'
}

// Состояние ячейки - ВАЖНО: экспортируем как type
export type CellState = 'empty' | 'occupied' | 'highlighted'

// 3D модель здания
export interface Building3D {
  type: BuildingType
  geometry: any
  material: any
  scale: [number, number, number]
  color: string
}

// UI строительства
export interface BuildingUI {
  selectedBuildingType: BuildingType | null
  availableBuildings: BuildingType[]
  buildingMode: boolean
  onBuildingSelect: (type: BuildingType) => void
  onCellClick: (coordinates: [number, number]) => void
}

// Расширенная структура ячейки с категориями
export interface EnhancedHexCell {
  coordinates: [number, number]
  type: 'project-center' | 'building-slot' | 'hidden-slot'
  state: 'empty' | 'occupied' | 'highlighted' | 'hidden'
  buildingType?: BuildingType | null
  isVisible: boolean
  // Система категорий
  category?: string
  taskName?: string
  progress?: number
  priority?: number
}

// Цвета ячеек
export const CELL_COLORS = {
  'project-center': '#90EE90',
  'building-slot': '#FFFFFF',
  'hidden-slot': '#D3D3D3',
  'empty': '#FFFFFF',
  'occupied': '#87CEEB',
  'highlighted': '#FFD700'
}

// Размеры гексагона
export const HEX_SIZE = 2.0
export const HEX_HEIGHT = 0.1

// Координаты 6 соседей для центра [0,0]
export const NEIGHBOR_COORDS = [
  [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]
] 