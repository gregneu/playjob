# 🎯 ИНСТРУКЦИЯ ПО НАСТРОЙКЕ ПРОЕКТА В SUPABASE

## ✅ ПРОБЛЕМА

Таблица `projects` пустая, а все остальные таблицы ссылаются на неё через `project_id`. Нужно создать проект в базе данных.

## 🚀 **ПОШАГОВАЯ НАСТРОЙКА**

### ✅ **Шаг 1: Создайте проект в Supabase**

**Выполните в SQL Editor Supabase:**

```sql
-- Отключаем RLS для таблицы projects (временно)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Создаем тестовый проект
INSERT INTO projects (
  id,
  name,
  description,
  user_id,
  status,
  created_at,
  updated_at,
  color,
  icon
) VALUES (
  gen_random_uuid(),
  'PlayJob 3D Game',
  'Разработка 3D игры в стиле PlayJob с гексагональной картой',
  'test-user-id',
  'active',
  NOW(),
  NOW(),
  '#3B82F6',
  '🎮'
);

-- Проверяем, что проект создался
SELECT id, name, created_at FROM projects ORDER BY created_at DESC;

-- Включаем RLS обратно
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
```

### ✅ **Шаг 2: Получите ID проекта**

**Выполните в SQL Editor:**

```sql
-- Получаем ID созданного проекта
SELECT id, name FROM projects WHERE name = 'PlayJob 3D Game' LIMIT 1;
```

**Скопируйте ID проекта** - он понадобится для тестирования.

### ✅ **Шаг 3: Отключите RLS для всех таблиц**

**Выполните в SQL Editor:**

```sql
-- Отключаем RLS для всех таблиц
ALTER TABLE zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE zone_cells DISABLE ROW LEVEL SECURITY;
ALTER TABLE hex_cells DISABLE ROW LEVEL SECURITY;
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
```

### ✅ **Шаг 4: Проверьте переменные окружения**

**Убедитесь, что в `.env` файле есть:**

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### ✅ **Шаг 5: Протестируйте приложение**

1. **Откройте приложение** (http://localhost:5176/)
2. **Выберите проект** "PlayJob 3D Game"
3. **Создайте зону** - выберите ячейки, введите название, выберите цвет
4. **Создайте здание** - выберите тип здания и кликните на ячейку в зоне
5. **Проверьте консоль** - должны быть логи успешного создания

## 🎯 **ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ**

### ✅ **После создания проекта:**
- ✅ **В таблице `projects`:** новая запись с названием "PlayJob 3D Game"
- ✅ **В приложении:** проект отображается в списке

### ✅ **После создания зоны:**
- ✅ **В консоли:** "Zone created successfully"
- ✅ **В таблице `zones`:** новая запись с названием и цветом
- ✅ **В таблице `zone_cells`:** записи для каждой ячейки зоны
- ✅ **В приложении:** зона отображается с правильным цветом

### ✅ **После создания здания:**
- ✅ **В консоли:** "Building created successfully"
- ✅ **В таблице `buildings`:** новая запись с типом здания
- ✅ **В приложении:** здание отображается на ячейке

## 🔧 **ДИАГНОСТИКА ПРОБЛЕМ**

### ❌ **Проблема 1: "Project not found"**
**Решение:**
- Проверьте, что проект создан в таблице `projects`
- Проверьте, что `projectId` передается правильно

### ❌ **Проблема 2: "Foreign key constraint failed"**
**Решение:**
- Убедитесь, что `project_id` в других таблицах ссылается на существующий проект
- Проверьте, что ID проекта правильный

### ❌ **Проблема 3: "Permission denied"**
**Решение:**
- Убедитесь, что RLS отключен для всех таблиц
- Проверьте переменные окружения

## 🚀 **ПРОВЕРКА В БАЗЕ ДАННЫХ**

### ✅ **Проверьте таблицы:**

```sql
-- Проверьте проекты
SELECT * FROM projects ORDER BY created_at DESC;

-- Проверьте зоны
SELECT * FROM zones ORDER BY created_at DESC;

-- Проверьте здания
SELECT * FROM buildings ORDER BY created_at DESC;

-- Проверьте ячейки зон
SELECT * FROM zone_cells ORDER BY created_at DESC;
```

## 🎉 **ЕСЛИ ВСЕ РАБОТАЕТ**

### ✅ **Включите RLS обратно:**

```sql
-- Включаем RLS
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE hex_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Создаем политики (используйте скрипт из database_schema.sql)
```

### ✅ **Настройте аутентификацию:**

- Убедитесь, что пользователи авторизованы
- Проверьте, что политики RLS работают правильно

---

*Инструкция создана для настройки проекта в Supabase*  
*Статус: ГОТОВО К ВЫПОЛНЕНИЮ ✅* 