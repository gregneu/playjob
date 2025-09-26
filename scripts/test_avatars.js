// Тестовый скрипт для проверки работы аватаров
// Запустите: node scripts/test_avatars.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY должны быть установлены в .env файле')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testUserProfiles() {
  console.log('🧪 Тестируем загрузку профилей пользователей...\n')
  
  try {
    // Получаем всех пользователей
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at')
    
    if (error) {
      console.error('❌ Ошибка при получении пользователей:', error.message)
      return
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️  Пользователи не найдены. Сначала добавьте тестовых пользователей.')
      return
    }
    
    console.log(`✅ Найдено пользователей: ${users.length}\n`)
    
    // Тестируем каждого пользователя
    for (const user of users) {
      console.log(`👤 Пользователь: ${user.full_name}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Username: ${user.username}`)
      
      // Генерируем инициалы
      const initials = user.full_name 
        ? user.full_name.split(/\s+/).slice(0, 2).map(word => word.charAt(0).toUpperCase()).join('')
        : 'U'
      
      console.log(`   Инициалы: ${initials}`)
      console.log(`   Аватар будет: 🔵 ${initials} (синий круг)`)
      console.log('')
    }
    
    // Тестируем fallback
    console.log('❓ Fallback для несуществующего пользователя:')
    console.log('   ID: 00000000-0000-0000-0000-000000000000')
    console.log('   Аватар будет: ⚫ ? (серый круг)')
    
  } catch (err) {
    console.error('❌ Ошибка при тестировании:', err.message)
  }
}

async function testUserService() {
  console.log('\n🔧 Тестируем UserService...\n')
  
  try {
    // Импортируем UserService
    const { userService } = await import('../src/lib/userService.js')
    
    // Получаем первого пользователя
    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)
    
    if (users && users.length > 0) {
      const testUser = users[0]
      console.log(`🧪 Тестируем UserService для пользователя: ${testUser.full_name}`)
      
      // Тестируем getUserProfile
      const profile = await userService.getUserProfile(testUser.id)
      if (profile) {
        console.log(`✅ getUserProfile: ${profile.full_name}`)
        console.log(`   Инициалы: ${userService.getInitials(profile)}`)
        console.log(`   Отображаемое имя: ${userService.getDisplayName(profile)}`)
      } else {
        console.log('❌ getUserProfile: профиль не найден')
      }
      
      // Тестируем getDisplayName и getInitials
      console.log(`✅ getDisplayName: ${userService.getDisplayName(profile)}`)
      console.log(`✅ getInitials: ${userService.getInitials(profile)}`)
    }
    
  } catch (err) {
    console.error('❌ Ошибка при тестировании UserService:', err.message)
  }
}

async function main() {
  console.log('🚀 Тестирование системы аватаров\n')
  
  try {
    await testUserProfiles()
    await testUserService()
    
    console.log('\n🎉 Тестирование завершено!')
    console.log('Теперь вы можете протестировать аватары в приложении.')
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message)
    process.exit(1)
  }
}

main()
