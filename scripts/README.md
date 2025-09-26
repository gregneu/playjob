# 📝 Скрипты для создания тестовых пользователей

Этот набор скриптов поможет создать тестовых пользователей в таблице `profiles` для тестирования аватаров в приложении.

## 🚀 Быстрый способ (рекомендуется)

### 1. Через Supabase Dashboard (самый простой)

1. **Откройте [Supabase Dashboard](https://supabase.com/dashboard)**
2. **Выберите ваш проект**
3. **Перейдите в SQL Editor**
4. **Скопируйте и выполните содержимое `quick_add_users.sql`**

### 2. Через JavaScript скрипт

```bash
# Установите зависимости (если нужно)
npm install dotenv

# Запустите скрипт
node scripts/add_test_users.js
```

## 📋 Создаваемые пользователи

| Имя | Username | Email | Роль |
|-----|----------|-------|------|
| John Doe | johndoe | john@example.com | Frontend Developer |
| Jane Smith | janesmith | jane@example.com | Backend Developer |
| Mike Johnson | mikejohnson | mike@example.com | UI/UX Designer |
| Sarah Wilson | sarahwilson | sarah@example.com | Product Manager |
| Alex Brown | alexbrown | alex@example.com | DevOps Engineer |

## 🗄️ Структура таблицы profiles

```sql
profiles {
  id: UUID PRIMARY KEY,           -- Уникальный идентификатор
  full_name: TEXT,                -- Полное имя пользователя
  email: TEXT,                    -- Email пользователя
  avatar_url: TEXT,               -- URL аватара (опционально)
  username: TEXT,                 -- Имя пользователя
  bio: TEXT,                      -- Биография (опционально)
  created_at: TIMESTAMP,          -- Дата создания
  updated_at: TIMESTAMP           -- Дата обновления
}
```

## 🔧 Настройка

### Переменные окружения

Убедитесь, что в `.env` файле установлены:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Права доступа

Таблица `profiles` должна иметь следующие политики RLS:

- **SELECT**: Все пользователи могут читать профили
- **INSERT**: Пользователи могут создавать только свой профиль
- **UPDATE**: Пользователи могут обновлять только свой профиль

## 🧪 Тестирование

После добавления пользователей:

1. **Перезапустите приложение**
2. **Откройте sidebar с тикетами**
3. **Проверьте, что аватары показывают правильные инициалы**
4. **Убедитесь, что fallback работает для неназначенных тикетов**

## 🐛 Возможные проблемы

### Ошибка "relation profiles does not exist"
- Выполните SQL скрипт создания таблицы
- Проверьте права доступа к базе данных

### Аватары не загружаются
- Проверьте подключение к Supabase
- Убедитесь, что таблица `profiles` содержит данные
- Проверьте консоль браузера на ошибки

### Fallback не работает
- Проверьте логику в `UserAvatar` компоненте
- Убедитесь, что `userId` передается корректно

## 📚 Дополнительные ресурсы

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
