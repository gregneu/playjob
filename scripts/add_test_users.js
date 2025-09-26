// Скрипт для добавления тестовых пользователей через Supabase API
// Запустите: node scripts/add_test_users.js

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Загружаем переменные окружения
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Ошибка: VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY должны быть установлены в .env файле')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Тестовые пользователи
const testUsers = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    full_name: 'John Doe',
    email: 'john@example.com',
    username: 'johndoe',
    bio: 'Frontend Developer, любит React и TypeScript'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    username: 'janesmith',
    bio: 'Backend Developer, эксперт по Node.js и PostgreSQL'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    full_name: 'Mike Johnson',
    email: 'mike@example.com',
    username: 'mikejohnson',
    bio: 'UI/UX Designer, создает красивые интерфейсы'
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    full_name: 'Sarah Wilson',
    email: 'sarah@example.com',
    username: 'sarahwilson',
    bio: 'Product Manager, управляет разработкой продукта'
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    full_name: 'Alex Brown',
    email: 'alex@example.com',
    username: 'alexbrown',
    bio: 'DevOps Engineer, настраивает CI/CD и инфраструктуру'
  }
]

async function createProfilesTable() {
  console.log('🔧 Создаем таблицу profiles...')
  
  try {
    // Создаем таблицу profiles
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS profiles (
          id UUID PRIMARY KEY,
          full_name TEXT,
          email TEXT,
          avatar_url TEXT,
          username TEXT,
          bio TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (error) {
      console.log('ℹ️  Таблица profiles уже существует или не может быть создана')
    } else {
      console.log('✅ Таблица profiles создана')
    }
  } catch (err) {
    console.log('ℹ️  Таблица profiles уже существует')
  }
}

async function addTestUsers() {
  console.log('👥 Добавляем тестовых пользователей...')
  
  for (const user of testUsers) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(user, { onConflict: 'id' })
        .select()
      
      if (error) {
        console.error(`❌ Ошибка при добавлении ${user.full_name}:`, error.message)
      } else {
        console.log(`✅ Добавлен пользователь: ${user.full_name} (${user.username})`)
      }
    } catch (err) {
      console.error(`❌ Ошибка при добавлении ${user.full_name}:`, err.message)
    }
  }
}

async function verifyUsers() {
  console.log('🔍 Проверяем добавленных пользователей...')
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at')
    
    if (error) {
      console.error('❌ Ошибка при получении пользователей:', error.message)
      return
    }
    
    console.log(`✅ Всего пользователей в таблице: ${data.length}`)
    data.forEach(user => {
      console.log(`  - ${user.full_name} (${user.username}) - ${user.email}`)
    })
  } catch (err) {
    console.error('❌ Ошибка при проверке пользователей:', err.message)
  }
}

async function main() {
  console.log('🚀 Начинаем создание тестовых пользователей...\n')
  
  try {
    await createProfilesTable()
    await addTestUsers()
    await verifyUsers()
    
    console.log('\n🎉 Готово! Тестовые пользователи добавлены.')
    console.log('Теперь вы можете тестировать аватары в приложении.')
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message)
    process.exit(1)
  }
}

// Запускаем скрипт
main()
