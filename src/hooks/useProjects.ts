import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { Project } from '../types/enhanced'

// No mock data in production/dev – only real DB data

export const useProjects = (userId: string | null) => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  const loadProjects = useCallback(async () => {
    if (!userId) {
      setProjects([])
      setLoading(false)
      return
    }

    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        setProjects([])
        setLoading(false)
        return
      }

      console.log('Loading projects for user:', userId)
      
      // Упрощенная загрузка проектов (только владельцы)
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })

      if (ownedError) {
        console.error('Error loading owned projects:', ownedError)
        // Не выбрасываем ошибку, просто используем пустой массив
        console.warn('Using empty array for projects due to error')
        setProjects([])
        setLoading(false)
        return
      }

      // Пропускаем загрузку project_members из-за проблем с RLS
      const memberProjects: any[] = []
      console.log('Skipping project_members loading due to RLS issues')

      // Загружаем проекты, куда пользователя пригласили по email (включая pending)
      let invitedProjects: any[] = []
      try {
        const { data: userRes } = await supabase.auth.getUser()
        const userEmail = userRes?.user?.email || null
        if (userEmail) {
          // Temporarily disabled due to 403 error
          // const { data: invites, error: invitesError } = await supabase
          //   .from('project_invitations')
          //   .select(`
          //     project_id,
          //     status,
          //     projects (*)
          //   `)
          //   .eq('email', userEmail)
          // if (invitesError) {
          //   console.warn('Error loading invited projects:', invitesError)
          // } else {
          //   invitedProjects = (invites || []).map((ip: any) => ip.projects).filter(Boolean)
          // }
          console.log('Invited projects loading temporarily disabled')
        }
      } catch (e) {
        console.warn('Failed to fetch invited projects:', e)
      }

      // Объединяем проекты (только ownedProjects пока)
      const allProjects = [
        ...(ownedProjects || []),
        ...invitedProjects
      ]

      // Убираем дубликаты (если пользователь и владелец, и участник)
      const uniqueProjects = allProjects.filter((project, index, self) => 
        index === self.findIndex(p => p.id === project.id)
      )

      // Сортируем по дате обновления
      const sortedProjects = uniqueProjects.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )

      console.log('All projects loaded:', sortedProjects)
      setProjects(sortedProjects)
    } catch (error) {
      console.warn('Failed to load projects from database:', error)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const createProject = async (projectData: Partial<Project>) => {
    console.log('Creating project with data:', projectData, 'for user:', userId)
    
    // Get current user from Supabase auth if userId is not available
    let currentUserId = userId
    if (!currentUserId) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        currentUserId = user?.id
        console.log('Got userId from Supabase auth:', currentUserId)
      } catch (error) {
        console.error('Failed to get user from Supabase auth:', error)
      }
    }
    
    if (!currentUserId) {
      console.warn('No userId available, cannot create project')
      return null
    }

    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured; cannot create project')
        return null
      }

      console.log('Supabase configured, creating project in database')

      // Temporarily disable RPC due to database issues - use direct insert
      let data: any = null
      let error: any = null
      
      // Skip RPC for now and go directly to project creation
      console.log('Skipping RPC, using direct project creation')
      
      // Try to create project directly
      const insertData = {
        ...projectData,
        user_id: currentUserId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      console.log('Inserting project data:', insertData)
      
      const res = await supabase
        .from('projects')
        .insert(insertData)
        .select()
      
      console.log('Supabase response:', res)
      
      if (res.error) {
        console.error('Direct project creation failed:', res.error)
        console.error('Error details:', {
          code: res.error.code,
          message: res.error.message,
          details: res.error.details,
          hint: res.error.hint
        })
        throw res.error
      }
      
      if (!res.data || res.data.length === 0) {
        console.error('No data returned from insert')
        throw new Error('No data returned from insert')
      }
      
      data = res.data[0]
      
      // Skip project_members creation for now due to auth.uid() issues
      console.log('Skipping project_members creation due to auth.uid() issues')
      console.log('Project created successfully without project_members:', data)
      
      console.log('Project created successfully:', data)
      setProjects(prev => [data, ...prev])
      return data
    } catch (error) {
      console.warn('Failed to create project in database:', error)
      throw error
    }
  }

  const updateProject = async (id: string, updates: Partial<Project>) => {
    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        // Update mock project
        setProjects(prev => prev.map(project => 
          project.id === id 
            ? { ...project, ...updates, updated_at: new Date().toISOString() }
            : project
        ))
        return
      }

      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      setProjects(prev => prev.map(project => project.id === id ? data : project))
      return data
    } catch (error) {
      console.warn('Failed to update project in database:', error)
      throw error
    }
  }

  const deleteProject = async (id: string) => {
    try {
      // Check if Supabase is configured
      if (!isSupabaseConfigured()) {
        // Delete mock project
        setProjects(prev => prev.filter(project => project.id !== id))
        return
      }

      // Soft delete - меняем статус на 'deleted'
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: 'deleted',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      setProjects(prev => prev.filter(project => project.id !== id))
    } catch (error) {
      console.warn('Failed to delete project from database:', error)
      throw error
    }
  }

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    reloadProjects: loadProjects
  }
} 