import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Enhanced3DTask, Epic } from '../types/enhanced'

export const useTasks = (projectId: string | null) => {
  const [tasks, setTasks] = useState<Enhanced3DTask[]>([])
  const [epics, setEpics] = useState<Epic[]>([])
  const [loading, setLoading] = useState(true)

  // Загружаем задачи из базы данных
  const loadTasks = useCallback(async () => {
    if (!projectId) return

    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)

      if (tasksError) throw tasksError

      const { data: epicsData, error: epicsError } = await supabase
        .from('epics')
        .select('*')
        .eq('project_id', projectId)

      if (epicsError) throw epicsError

      setTasks(tasksData || [])
      setEpics(epicsData || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Добавляем новую задачу
  const addTask = async (taskData: Partial<Enhanced3DTask>) => {
    if (!projectId) return

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          project_id: projectId,
          visual_state: taskData.visual_state || {},
          hover_effects: taskData.hover_effects || {},
          dependencies: taskData.dependencies || [],
          blocked_by: taskData.blocked_by || []
        })
        .select()
        .single()

      if (error) throw error

      setTasks((prev: Enhanced3DTask[]) => [...prev, data])
      return data
    } catch (error) {
      console.error('Error adding task:', error)
      throw error
    }
  }

  // Обновляем задачу
  const updateTask = async (id: string, updates: Partial<Enhanced3DTask>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setTasks((prev: Enhanced3DTask[]) => prev.map((task: Enhanced3DTask) => task.id === id ? data : task))
      return data
    } catch (error) {
      console.error('Error updating task:', error)
      throw error
    }
  }

  // Удаляем задачу
  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTasks((prev: Enhanced3DTask[]) => prev.filter((task: Enhanced3DTask) => task.id !== id))
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  return {
    tasks,
    epics,
    loading,
    addTask,
    updateTask,
    deleteTask,
    reloadTasks: loadTasks
  }
}