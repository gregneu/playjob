// Утилиты для случайного заполнения гексов внутри зон объектами

// Константы для типов заполнения
export const HEX_FILL_TYPES = {
  TREES: 'trees',
  ROCKS: 'rocks', 
  MIXED: 'mixed'
} as const

// Типы
export type HexFillType = typeof HEX_FILL_TYPES[keyof typeof HEX_FILL_TYPES]

export interface FilledHex {
  hexId: string
  fill: HexFillType
}

export interface ZoneWithFilledHexes {
  zoneId: string
  filledHexes: FilledHex[]
}

// Простые типы для совместимости
export interface SimpleZone {
  id: string
  name: string
}

export interface SimpleZoneCell {
  zone_id: string
  q: number
  r: number
}

/**
 * Детерминированная функция для псевдо-случайных чисел
 * Использует seed для получения одинаковых результатов
 */
function deterministicRandom(seed: number, value: number = 1): number {
  const x = Math.sin(value * 12.9898 + seed * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Генерирует случайное заполнение гексов для всех зон
 * @param zones - массив зон
 * @param zoneCells - массив ячеек зон (q, r координаты)
 * @param seed - базовый seed для детерминированной генерации
 * @returns массив зон с заполненными гексами
 */
export function generateZoneHexFilling(
  zones: Array<{ id: string; name: string }>,
  zoneCells: Array<{ zone_id: string; q: number; r: number }>,
  seed: number = 42
): ZoneWithFilledHexes[] {
  const result: ZoneWithFilledHexes[] = []

  zones.forEach(zone => {
    // Получаем все ячейки этой зоны
    const zoneHexCells = zoneCells.filter(cell => cell.zone_id === zone.id)
    
    if (zoneHexCells.length === 0) {
      result.push({ zoneId: zone.id, filledHexes: [] })
      return
    }

    // Создаем детерминированный seed для этой зоны
    const zoneSeed = seed + zone.id.length + zone.name.length

    // Случайно выбираем количество гексов для заполнения (1-3)
    const numHexesToFill = Math.floor(deterministicRandom(zoneSeed) * 3) + 1

    // Ограничиваем количество доступными гексами
    const actualNumHexes = Math.min(numHexesToFill, zoneHexCells.length)

    // Случайно выбираем гексы для заполнения
    const shuffledHexes = [...zoneHexCells].sort(() => deterministicRandom(zoneSeed + 1) - 0.5)
    const selectedHexes = shuffledHexes.slice(0, actualNumHexes)

    // Генерируем заполнение для каждого выбранного гекса
    const filledHexes: FilledHex[] = selectedHexes.map((hex, index) => {
      const hexSeed = zoneSeed + index * 100 + hex.q + hex.r
      
      // Равновероятный выбор типа заполнения
      const fillTypeValue = deterministicRandom(hexSeed)
      let fill: HexFillType
      
      if (fillTypeValue < 0.333) {
        fill = 'trees'
      } else if (fillTypeValue < 0.666) {
        fill = 'rocks'
      } else {
        fill = 'mixed'
      }

      return {
        hexId: `${hex.q}-${hex.r}`, // Уникальный ID на основе координат
        fill
      }
    })

    result.push({
      zoneId: zone.id,
      filledHexes
    })
  })

  return result
}

/**
 * Получает тип заполнения для конкретного гекса
 * @param zoneId - ID зоны
 * @param q - координата q
 * @param r - координата r
 * @param zoneFillings - результат generateZoneHexFilling
 * @returns тип заполнения или null если гекс не заполнен
 */
export function getHexFillType(
  zoneId: string,
  q: number,
  r: number,
  zoneFillings: ZoneWithFilledHexes[]
): HexFillType | null {
  const zone = zoneFillings.find(z => z.zoneId === zoneId)
  if (!zone) return null

  const hexId = `${q}-${r}`
  const filledHex = zone.filledHexes.find(h => h.hexId === hexId)
  
  return filledHex ? filledHex.fill : null
}

/**
 * Проверяет, заполнен ли гекс
 * @param zoneId - ID зоны
 * @param q - координата q
 * @param r - координата r
 * @param zoneFillings - результат generateZoneHexFilling
 * @returns true если гекс заполнен
 */
export function isHexFilled(
  zoneId: string,
  q: number,
  r: number,
  zoneFillings: ZoneWithFilledHexes[]
): boolean {
  return getHexFillType(zoneId, q, r, zoneFillings) !== null
}

/**
 * Генерирует JSON результат в формате, указанном в задаче
 * @param zoneFillings - результат generateZoneHexFilling
 * @returns JSON строка
 */
export function generateZoneFillingJSON(zoneFillings: ZoneWithFilledHexes[]): string {
  return JSON.stringify(zoneFillings, null, 2)
}
