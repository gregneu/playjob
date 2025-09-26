export interface ZoneMarking {
  id: string
  name: string
  color: string
  cells: Array<[number, number]> // hex coordinates
  createdAt: Date
}

export interface ZoneSelection {
  selectedCells: Set<string> // "q,r" format
  isSelecting: boolean
  startCell?: [number, number]
}

export interface ZoneMarkingUI {
  isZoneMode: boolean
  selectedZone?: ZoneMarking
  zones: ZoneMarking[]
  onZoneCreate: (name: string, color: string) => void
  onZoneDelete: (zoneId: string) => void
  onZoneSelect: (zoneId: string) => void
}

// Предустановленные цвета для зон
export const ZONE_COLORS = [
  '#FF6B6B', // Красный
  '#4ECDC4', // Бирюзовый
  '#45B7D1', // Голубой
  '#96CEB4', // Зеленый
  '#FFEAA7', // Желтый
  '#DDA0DD', // Фиолетовый
  '#98D8C8', // Мятный
  '#F7DC6F', // Золотой
  '#BB8FCE', // Лавандовый
  '#85C1E9', // Светло-голубой
  '#F8C471', // Оранжевый
  '#82E0AA', // Светло-зеленый
] as const

export type ZoneColor = typeof ZONE_COLORS[number] 