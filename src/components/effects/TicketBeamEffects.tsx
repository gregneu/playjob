import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hexToWorldPosition } from '../../lib/hex-utils'
import { TicketFlight } from './TicketFlight'

type ZoneObjectLike = {
  id: string
  q: number
  r: number
  object_type?: string | null
  [key: string]: any
}

export interface BeamLifecyclePayload {
  fromId: string
  toId: string
  ticketId: string
  colorScheme: {
    start: string
    middle: string
    end: string
    pulse: string
    spark: string
  }
}

export interface TicketBeamEffectsProps {
  zoneObjects: ZoneObjectLike[]
  /** y-offset for beam start/end above the ground */
  heightOffset?: number
  /** optional callback fired when beam spawned (used for source highlight) */
  onBeamStart?: (payload: BeamLifecyclePayload) => void
  /** fired when the energy pulse reaches the destination */
  onBeamImpact?: (payload: BeamLifecyclePayload) => void
  /** fired after the beam fully fades */
  onBeamFinish?: (payload: BeamLifecyclePayload) => void
}

interface BeamState extends BeamLifecyclePayload {
  id: string
  start: [number, number, number]
  end: [number, number, number]
  createdAt: number
}

const generateId = () => {
  if (typeof globalThis !== 'undefined' && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return (crypto as Crypto).randomUUID()
  }
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1)
  return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
}

const colorPresets = {
  default: {
    start: '#38bdf8',
    middle: '#0ea5e9',
    end: '#22d3ee',
    pulse: '#f8fafc',
    spark: '#38bdf8'
  },
  sprint: {
    start: '#c084fc',
    middle: '#a855f7',
    end: '#fde68a',
    pulse: '#ede9fe',
    spark: '#c084fc'
  },
  backlog: {
    start: '#facc15',
    middle: '#f59e0b',
    end: '#ea580c',
    pulse: '#fef08a',
    spark: '#f97316'
  }
} satisfies Record<string, BeamLifecyclePayload['colorScheme']>

const resolveColorScheme = (fromType?: string | null, toType?: string | null) => {
  const normalizedFrom = (fromType ?? '').toLowerCase()
  const normalizedTo = (toType ?? '').toLowerCase()

  if (normalizedTo.includes('sprint') || normalizedTo === 'mountain') {
    return colorPresets.sprint
  }

  if (normalizedTo.includes('backlog') || normalizedTo === 'castle') {
    return colorPresets.backlog
  }

  if (normalizedFrom.includes('sprint') || normalizedFrom === 'mountain') {
    return colorPresets.sprint
  }

  return colorPresets.default
}

const BeamVisual: React.FC<{
  beam: BeamState
  onFinish: (beam: BeamState) => void
  onImpact?: (beam: BeamState) => void
}> = ({ beam, onFinish, onImpact }) => {
  useEffect(() => {
    return () => {
      // cleanup no-op; placeholder for future side-effects
    }
  }, [])

  return (
    <TicketFlight
      start={beam.start}
      end={beam.end}
      ticketColor={beam.colorScheme.middle}
      ticketBackColor={beam.colorScheme.start}
      duration={0.95}
      arcHeight={2.1}
      onArrive={() => onImpact?.(beam)}
      onComplete={() => onFinish(beam)}
    />
  )
}

export const TicketBeamEffects: React.FC<TicketBeamEffectsProps> = ({
  zoneObjects,
  heightOffset = 1.2,
  onBeamStart,
  onBeamImpact,
  onBeamFinish
}) => {
  const [beams, setBeams] = useState<BeamState[]>([])
  const recentEventsRef = useRef<Map<string, number>>(new Map())

  const zoneObjectMap = useMemo(() => {
    const map = new Map<string, ZoneObjectLike>()
    for (const obj of zoneObjects) {
      if (obj?.id) {
        map.set(obj.id, obj)
      }
    }
    return map
  }, [zoneObjects])

  const cleanupRecent = useCallback(() => {
    const now = performance.now()
    const map = recentEventsRef.current
    for (const [key, value] of map.entries()) {
      if (now - value > 4000) {
        map.delete(key)
      }
    }
  }, [])

  const createBeamState = useCallback((detail: any): BeamState | null => {
    const fromId = detail?.from
    const toId = detail?.to
    const ticketId = detail?.ticketId
    if (!fromId || !toId || !ticketId) return null

    const fromObj = zoneObjectMap.get(fromId)
    const toObj = zoneObjectMap.get(toId)
    if (!fromObj || !toObj) return null

    const [sx, , sz] = hexToWorldPosition(fromObj.q, fromObj.r)
    const [ex, , ez] = hexToWorldPosition(toObj.q, toObj.r)

    const start: [number, number, number] = [sx, heightOffset, sz]
    const end: [number, number, number] = [ex, heightOffset, ez]

    const baseScheme = resolveColorScheme(fromObj.object_type, toObj.object_type)
    const colorScheme: BeamLifecyclePayload['colorScheme'] = {
      start: baseScheme.start,
      middle: baseScheme.middle,
      end: baseScheme.end,
      pulse: baseScheme.pulse,
      spark: baseScheme.spark
    }

    return {
      id: generateId(),
      start,
      end,
      fromId,
      toId,
      ticketId,
      colorScheme,
      createdAt: performance.now()
    }
  }, [heightOffset, zoneObjectMap])

  useEffect(() => {
    const handler = (event: CustomEvent) => {
      const detail = event?.detail
      if (!detail) return

      const key = `${detail.ticketId ?? 'unknown'}-${detail.from ?? 'x'}-${detail.to ?? 'y'}`
      const now = performance.now()
      const last = recentEventsRef.current.get(key)
      if (last && now - last < 100) {
        return
      }
      recentEventsRef.current.set(key, now)
      cleanupRecent()

      const beam = createBeamState(detail)
      if (!beam) return

      setBeams((prev) => [...prev, beam])
      onBeamStart?.({
        fromId: beam.fromId,
        toId: beam.toId,
        ticketId: beam.ticketId,
        colorScheme: beam.colorScheme
      })
    }

    window.addEventListener('ticket-moved' as any, handler as any)
    return () => {
      window.removeEventListener('ticket-moved' as any, handler as any)
    }
  }, [cleanupRecent, createBeamState, onBeamStart])

  const handleFinish = useCallback((beam: BeamState) => {
    setBeams((prev) => prev.filter((item) => item.id !== beam.id))
    onBeamFinish?.({
      fromId: beam.fromId,
      toId: beam.toId,
      ticketId: beam.ticketId,
      colorScheme: beam.colorScheme
    })
  }, [onBeamFinish])

  const handleImpact = useCallback((beam: BeamState) => {
    onBeamImpact?.({
      fromId: beam.fromId,
      toId: beam.toId,
      ticketId: beam.ticketId,
      colorScheme: beam.colorScheme
    })
  }, [onBeamImpact])

  if (beams.length === 0) return null

  return (
    <group>
      {beams.map((beam) => (
        <BeamVisual
          key={beam.id}
          beam={beam}
          onFinish={handleFinish}
          onImpact={handleImpact}
        />
      ))}
    </group>
  )
}
