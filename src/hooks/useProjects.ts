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

    setLoading(true)

    if (!isSupabaseConfigured()) {
      setProjects([])
      setLoading(false)
      return
    }

    try {
      console.log('Loading projects for user:', userId)

      const membershipProjects: Project[] = []

      const { data: membershipRows, error: membershipError } = await supabase
        .from('project_memberships')
        .select('project_id, role, projects(*)')
        .eq('user_id', userId)

      if (membershipError) {
        console.error('Error loading membership projects:', membershipError)
      } else if (membershipRows) {
        for (const row of membershipRows) {
          const project = (row as any)?.projects as Project | null
          if (!project) continue
          membershipProjects.push({
            ...project,
            membership_role: (row as any)?.role ?? project.membership_role
          })
        }
      }

      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })

      if (ownedError) {
        console.error('Error loading owned projects:', ownedError)
      }

      const ownedList = (ownedProjects ?? []).map((project: any) => ({
        ...project,
        membership_role: project.owner_id === userId ? 'owner' : project.membership_role
      }))

      const projectMap = new Map<string, Project>()

      for (const project of membershipProjects) {
        projectMap.set(project.id, project)
      }

      for (const project of ownedList) {
        if (projectMap.has(project.id)) {
          const existing = projectMap.get(project.id)!
          projectMap.set(project.id, {
            ...project,
            membership_role: existing.membership_role ?? project.membership_role
          })
        } else {
          projectMap.set(project.id, project)
        }
      }

      const uniqueProjects = Array.from(projectMap.values())

      uniqueProjects.sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )

      console.log('All projects loaded:', uniqueProjects)
      setProjects(uniqueProjects)
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
        owner_id: currentUserId,
        created_by: currentUserId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      console.log('Inserting project data:', insertData)

      const res = await supabase
        .from('projects')
        .insert(insertData)
        .select()
        .single()

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

      data = res.data

      console.log('Project created successfully:', data)

      await loadProjects()
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
