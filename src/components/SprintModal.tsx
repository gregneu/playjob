import React from 'react'
import { createPortal } from 'react-dom'
import Sidebar from './Sidebar'
import { sprintService } from '../lib/supabase'
import TicketCard from './TicketCard'

interface SprintModalProps {
  isOpen: boolean
  onClose: () => void
  leftTickets: Array<{ id: string; title: string; priority?: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'; assignee_id?: string | null; assignee?: string | null; board_column?: 'planned'|'in_sprint'|'archived'; sprint_id?: string | null; zone_object_id?: string | null }>
  sprintZoneObjectId?: string | null
}

export const SprintModal: React.FC<SprintModalProps> = ({ isOpen, onClose, leftTickets, sprintZoneObjectId }) => {
  const [leftList, setLeftList] = React.useState<Array<{ id: string; title: string; priority?: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'; assignee_id?: string | null; assignee?: string | null }>>([])
  const [rightTickets, setRightTickets] = React.useState<Array<{ id: string; title: string; priority?: 'v-low' | 'low' | 'medium' | 'high' | 'veryhigh'; assignee_id?: string | null; assignee?: string | null }>>([])
  const [sprintName, setSprintName] = React.useState<string>('Sprint Nr. 7')
  const [isStarted, setIsStarted] = React.useState<boolean>(false)
  const [weeks, setWeeks] = React.useState<number>(2)
  const [startAt, setStartAt] = React.useState<Date | null>(null)
  const [totalPlannedAtStart, setTotalPlannedAtStart] = React.useState<number>(0)
  const [now, setNow] = React.useState<number>(Date.now())
  const [sprintId, setSprintId] = React.useState<string | null>(null)
  const [ghostIds, setGhostIds] = React.useState<Set<string>>(new Set())

  const startSprint = React.useCallback(async () => {
    if (isStarted) return
    setIsStarted(true)
    const started = new Date()
    setStartAt(started)
    setTotalPlannedAtStart(leftList.length)
    // Try creating sprint in DB; project_id is inferred later by caller through HexGridSystem if needed. For now pass null for zone.
    try {
      const projectId = (window as any).currentProject?.id as string | undefined
      const created = projectId ? await sprintService.createSprint(projectId, null, sprintName, weeks) : null
      if (created?.id) setSprintId(created.id)
    } catch {}
  }, [isStarted])

  const formatDate = (d: Date) => `${d.getDate()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`
  const dateRange = React.useMemo(() => {
    if (!startAt) return ''
    const end = new Date(startAt)
    end.setDate(end.getDate() + weeks * 7)
    return `${formatDate(startAt)} - ${formatDate(end)}`
  }, [startAt, weeks])

  // Таймер для обновления прогресса времени
  React.useEffect(() => {
    if (!isStarted || !startAt) return
    const id = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(id)
  }, [isStarted, startAt])

  const donePercent = React.useMemo(() => {
    const total = Math.max(0, leftList.length + rightTickets.length)
    if (total === 0) return 0
    const completed = Math.max(0, rightTickets.length - ghostIds.size)
    const p = (completed / total) * 100
    return Math.max(0, Math.min(100, p))
  }, [leftList.length, rightTickets.length, ghostIds.size])

  // Calendar bar days of sprint
  const calendarDays = React.useMemo(() => {
    const start = startAt || new Date()
    const arr: Array<{ day: number; dow: string; isToday: boolean }> = []
    const short = ['Su','Mo','Tu','We','Th','Fr','Sa']
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      arr.push({ day: d.getDate(), dow: short[d.getDay()], isToday: new Date().toDateString() === d.toDateString() })
    }
    return arr
  }, [startAt, weeks])

  React.useEffect(() => {
    if (!isOpen) return
    const planned = (leftTickets || []).filter(t => (t.board_column || 'planned') === 'planned')
    const inSprint = (leftTickets || []).filter(t => (t.board_column || 'planned') === 'in_sprint')
    setLeftList(planned)
    setRightTickets(inSprint)
    const inferredSprintId = inSprint[0]?.sprint_id || null
    setSprintId(inferredSprintId)
    setIsStarted(Boolean(inferredSprintId))
    // initialize ghosts from current locations
    if (sprintZoneObjectId) {
      const init = new Set<string>()
      inSprint.forEach(t => { if ((t as any).zone_object_id && (t as any).zone_object_id !== sprintZoneObjectId) init.add(t.id) })
      setGhostIds(init)
    } else {
      setGhostIds(new Set())
    }
  }, [isOpen])

  // listen for ticket moves to toggle ghosts
  React.useEffect(() => {
    if (!isOpen) return
    const handler = (e: any) => {
      try {
        const to = e?.detail?.to
        const ticketId = e?.detail?.ticketId
        if (!ticketId) return
        if (!sprintZoneObjectId) return
        setGhostIds(prev => {
          const next = new Set(prev)
          if (to && to !== sprintZoneObjectId) next.add(ticketId)
          if (to && to === sprintZoneObjectId) next.delete(ticketId)
          return next
        })
      } catch {}
    }
    window.addEventListener('ticket-moved' as any, handler as any)
    return () => window.removeEventListener('ticket-moved' as any, handler as any)
  }, [isOpen, sprintZoneObjectId])

  // no-op: modal controlled by parent

  if (!isOpen) return null

  return (
    <Sidebar
      isOpen={isOpen}
      onClose={onClose}
      side="left"
      header={
        <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 12 }}>
          <input value={sprintName} onChange={(e) => setSprintName(e.target.value)} placeholder="Sprint name" style={{ fontSize: 20, fontWeight: 800, border: 'none', outline: 'none', background: 'transparent', color: '#0F172A' }} />
          <button onClick={onClose} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', color: '#0F172A', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Close</button>
        </div>
      }
      footer={
        <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
          {!isStarted ? (
            <button onClick={startSprint} style={{ background: '#111827', color: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Start sprint</button>
          ) : (
            <button onClick={async () => { if (sprintId) { try { await sprintService.completeSprint(sprintId); try { window.dispatchEvent(new Event('sprint-completed')) } catch {}; setIsStarted(false); setSprintId(null); setRightTickets([]); setLeftList([]) } catch {} } }} style={{ background: '#111827', color: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Complete sprint</button>
          )}
          <select value={weeks} onChange={(e) => setWeeks(parseInt(e.target.value || '2', 10))} disabled={isStarted} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '6px 8px', background: '#FFFFFF', color: '#0F172A' }}>
            <option value={1}>1 week</option>
            <option value={2}>2 weeks</option>
            <option value={3}>3 weeks</option>
            <option value={4}>4 weeks</option>
          </select>
          <div style={{ color: '#64748B', fontSize: 12, fontWeight: 600 }}>{isStarted ? `${weeks} ${weeks === 1 ? 'week' : 'weeks'} • ${dateRange}` : `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`}</div>
        </div>
      }
    >
        {/* Calendar bar + done progress */}
        <div style={{ padding: '6px 16px 10px 16px', background: '#FFFFFF', borderBottom: '1px solid #EEF2F6' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${calendarDays.length}, 1fr)`, columnGap: 4, alignItems: 'center', marginBottom: 6 }}>
            {calendarDays.map((d, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: d.isToday ? 800 : 600, color: d.isToday ? '#0F172A' : '#94A3B8' }}>{d.dow}</div>
                <div style={{ fontSize: 12, fontWeight: d.isToday ? 800 : 600, color: d.isToday ? '#0F172A' : '#94A3B8' }}>{d.day}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 6, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' }}>
            <div style={{ width: `${donePercent}%`, height: '100%', background: '#3B82F6', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* List area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, padding: 12 }}>
          <div 
            style={{ padding: 12, background: '#FFFFFF', border: '1px solid #EEF2F6', borderRadius: 12, minHeight: 120 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 700 }}>Planned</div>
            </div>
            <div style={{ columnCount: 1, columnGap: 12 }}>
              {leftList.map(t => (
                <div key={t.id} style={{ breakInside: 'avoid' as any }}>
                  <TicketCard id={t.id} title={t.title} priority={t.priority} assigneeId={t.assignee_id || null} assigneeName={t.assignee || undefined} draggable onDragStart={(e) => {
                    try {
                      e.dataTransfer?.setData('application/x-existing-ticket', JSON.stringify({ ticketId: t.id, fromZoneObjectId: sprintZoneObjectId || null, type: (t as any).type || 'task' }))
                      e.dataTransfer?.setData('application/x-ticket-type', (t as any).type || 'task')
                      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
                    } catch {}
                  }} />
                </div>
              ))}
            </div>
          </div>
          <div 
            style={{ padding: 12, background: '#FFFFFF', border: '1px solid #EEF2F6', borderRadius: 12, minHeight: 180 }} 
          >
            <div style={{ fontWeight: 700, marginBottom: 12, color: isStarted ? '#0F172A' : '#94A3B8' }}>In Sprint</div>
            <div style={{ columnCount: 1, columnGap: 12 }}>
              {rightTickets.map(t => (
                <div key={t.id} style={{ breakInside: 'avoid' as any }}>
                  {ghostIds.has(t.id) ? (
                    <div style={{
                      height: 190,
                      border: '2px dashed #E5E7EB',
                      borderRadius: 16,
                      background: '#F9FAFB',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#64748B', fontWeight: 600
                    }}>
                      Ticket in progress outside Sprint
                    </div>
                  ) : (
                    <TicketCard id={t.id} title={t.title} priority={t.priority} assigneeId={t.assignee_id || null} assigneeName={t.assignee || undefined} draggable={isStarted} onDragStart={(e) => {
                      try {
                        if (!isStarted) return
                        e.dataTransfer?.setData('application/x-existing-ticket', JSON.stringify({ ticketId: t.id, fromZoneObjectId: sprintZoneObjectId || null, type: (t as any).type || 'task' }))
                        e.dataTransfer?.setData('application/x-ticket-type', (t as any).type || 'task')
                        if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
                        // показываем ghost сразу после старта переноса
                        setGhostIds(prev => new Set([...Array.from(prev), t.id]))
                      } catch {}
                    }} />
                  )}
                </div>
              ))}
            </div>
            {!isStarted && (
              <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, padding: 8 }}>Start sprint to move tickets here</div>
            )}
          </div>
        </div>
    </Sidebar>
  )
}

export default SprintModal


