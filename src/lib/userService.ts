import { supabase } from './supabase'

export interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  avatar_config?: any | null
  username?: string | null
}

class UserService {
  private userCache: Map<string, UserProfile> = new Map()
  private loadingUsers: Set<string> = new Set()

  // Инвалидация кэша конкретного пользователя
  invalidateUserProfile(userId: string) {
    this.userCache.delete(userId)
  }

  // Получить профиль пользователя по ID
  async getUserProfile(userId: string, force: boolean = false): Promise<UserProfile | null> {
    if (force) this.invalidateUserProfile(userId)
    // Проверяем кэш
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId)!
    }

    // Проверяем, не загружается ли уже
    if (this.loadingUsers.has(userId)) {
      // Ждем завершения загрузки
      return new Promise((resolve) => {
        const checkCache = () => {
          if (this.userCache.has(userId)) {
            resolve(this.userCache.get(userId)!)
          } else {
            setTimeout(checkCache, 100)
          }
        }
        checkCache()
      })
    }

    this.loadingUsers.add(userId)

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, avatar_config')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      if (profile) {
        const userProfile: UserProfile = {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          avatar_config: (profile as any).avatar_config ?? null,
          username: null
        }
        
        this.userCache.set(userId, userProfile)
        return userProfile
      }

      return null
    } catch (err) {
      console.error('Error in getUserProfile:', err)
      return null
    } finally {
      this.loadingUsers.delete(userId)
    }
  }

  // Получить несколько профилей пользователей
  async getUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    const uniqueIds = [...new Set(userIds.filter(id => id && !this.userCache.has(id)))]
    
    if (uniqueIds.length === 0) {
      return userIds.map(id => this.userCache.get(id)).filter(Boolean) as UserProfile[]
    }

    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, avatar_config')
        .in('id', uniqueIds)

      if (error) {
        console.error('Error fetching user profiles:', error)
        return []
      }

      const userProfiles: UserProfile[] = profiles?.map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        avatar_config: (profile as any).avatar_config ?? null,
        username: null
      })) || []

      // Кэшируем полученные профили
      userProfiles.forEach(profile => {
        this.userCache.set(profile.id, profile)
      })

      // Возвращаем все профили (из кэша + новые)
      return userIds.map(id => this.userCache.get(id)).filter(Boolean) as UserProfile[]
    } catch (err) {
      console.error('Error in getUserProfiles:', err)
      return []
    }
  }

  // Получить отображаемое имя пользователя
  getDisplayName(userProfile: UserProfile | null): string {
    if (!userProfile) return 'Unassigned'
    return userProfile.full_name || userProfile.email || 'Unknown User'
  }

  // Получить инициалы пользователя
  getInitials(userProfile: UserProfile | null): string {
    if (!userProfile) return 'U'
    
    const name = userProfile.full_name || userProfile.email || ''
    if (!name) return 'U'
    
    // Берем первые буквы каждого слова
    const words = name.trim().split(/\s+/)
    if (words.length === 1) {
      return words[0].charAt(0).toUpperCase()
    }
    
    return words.slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('')
  }

  // Очистить кэш
  clearCache(): void {
    this.userCache.clear()
  }

  // Очистить конкретного пользователя из кэша
  clearUserCache(userId: string): void {
    this.userCache.delete(userId)
  }
}

export const userService = new UserService()
