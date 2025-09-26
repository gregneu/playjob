import { useMemo } from 'react'
import { 
  generateZoneHexFilling, 
  getHexFillType,
  isHexFilled,
  generateZoneFillingJSON,
  // Импортируем все необходимые типы и интерфейсы
  type ZoneWithFilledHexes,
  type HexFillType,
  type SimpleZone,
  type SimpleZoneCell
} from '../utils/zoneHexFiller'

// Определяем типы для пропсов локально, чтобы они были совместимы с любыми Zone/ZoneCell
interface UseZoneHexFillingProps {
  zones: any[]  // Принимаем любые зоны с нужными полями
  zoneCells: any[]  // Принимаем любые ячейки с нужными полями
  seed?: number
}

interface UseZoneHexFillingReturn {
  zoneFillings: ZoneWithFilledHexes[]
  getHexFillType: (zoneId: string, q: number, r: number) => HexFillType | null
  isHexFilled: (zoneId: string, q: number, r: number) => boolean
  generateJSON: () => string
}

export const useZoneHexFilling = ({
  zones,
  zoneCells,
  seed = 42
}: UseZoneHexFillingProps): UseZoneHexFillingReturn => {
  // Преобразуем входные данные к нужному формату
  const simpleZones: SimpleZone[] = useMemo(() => {
    return zones.map(z => ({
      id: z.id || z.zone_id || '',
      name: z.name || ''
    }))
  }, [zones])

  const simpleZoneCells: SimpleZoneCell[] = useMemo(() => {
    return zoneCells.map(c => ({
      zone_id: c.zone_id || c.zoneId || '',
      q: c.q || 0,
      r: c.r || 0
    }))
  }, [zoneCells])

  // Генерируем заполнение зон
  const zoneFillings = useMemo(() => {
    return generateZoneHexFilling(simpleZones, simpleZoneCells, seed)
  }, [simpleZones, simpleZoneCells, seed])

  // Функция для получения типа заполнения гекса
  const getHexFillTypeForZone = useMemo(() => {
    return (zoneId: string, q: number, r: number) => {
      return getHexFillType(zoneId, q, r, zoneFillings)
    }
  }, [zoneFillings])

  // Функция для проверки заполненности гекса
  const isHexFilledForZone = useMemo(() => {
    return (zoneId: string, q: number, r: number) => {
      return isHexFilled(zoneId, q, r, zoneFillings)
    }
  }, [zoneFillings])

  // Функция для генерации JSON
  const generateJSON = useMemo(() => {
    return () => generateZoneFillingJSON(zoneFillings)
  }, [zoneFillings])

  return {
    zoneFillings,
    getHexFillType: getHexFillTypeForZone,
    isHexFilled: isHexFilledForZone,
    generateJSON
  }
}
