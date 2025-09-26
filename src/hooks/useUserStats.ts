import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface ProjectStatsData {
  diamonds: number
  nps: number
  vacationUsers: number
  totalTickets: number
  doneTickets: number
  storyDiamonds: number
  taskDiamonds: number
  bugDiamonds: number
  testDiamonds: number
}

interface UseProjectStatsProps {
  projectId: string
}

export const useProjectStats = ({ projectId }: UseProjectStatsProps) => {
  const [stats, setStats] = useState<ProjectStatsData>({
    diamonds: 0,
    nps: 12, // Placeholder
    vacationUsers: 4, // Placeholder
    totalTickets: 0,
    doneTickets: 0,
    storyDiamonds: 0,
    taskDiamonds: 0,
    bugDiamonds: 0,
    testDiamonds: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) {
      setLoading(false)
      return
    }

    const fetchProjectStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Получаем статистику тикетов проекта
        const { data: ticketStats, error: ticketError } = await supabase
          .rpc('get_project_ticket_stats', { project_uuid: projectId })

        if (ticketError) {
          console.error('Error fetching project ticket stats:', ticketError)
          setError('Failed to load project statistics')
          return
        }

        if (ticketStats && ticketStats.length > 0) {
          const statsData = ticketStats[0]
          setStats(prevStats => ({
            ...prevStats,
            diamonds: statsData.total_diamonds || 0,
            totalTickets: statsData.total_tickets || 0,
            doneTickets: statsData.done_tickets || 0,
            storyDiamonds: statsData.story_diamonds || 0,
            taskDiamonds: statsData.task_diamonds || 0,
            bugDiamonds: statsData.bug_diamonds || 0,
            testDiamonds: statsData.test_diamonds || 0
          }))
        }

        // TODO: Добавить реальные данные для NPS и vacation users
        // Пока используем placeholder значения

      } catch (err) {
        console.error('Error fetching project stats:', err)
        setError('Failed to load project statistics')
      } finally {
        setLoading(false)
      }
    }

    fetchProjectStats()
  }, [projectId])

  const refreshStats = async () => {
    if (projectId) {
      await fetchProjectStats()
    }
  }

  return {
    stats,
    loading,
    error,
    refreshStats
  }
}
