# 🗄️ ИНСТРУКЦИЯ ПО НАСТРОЙКЕ SUPABASE

## ✅ ПРОБЛЕМА

Данные не сохраняются в бэкенде, потому что таблицы в Supabase еще не созданы. Нужно выполнить SQL скрипты для создания необходимых таблиц.

## 🚀 **ПОШАГОВАЯ ИНСТРУКЦИЯ**

### ✅ **Шаг 1: Откройте Supabase Dashboard**

1. **Перейдите** на https://supabase.com/
2. **Войдите** в свой аккаунт
3. **Выберите** ваш проект PlayJob
4. **Откройте** раздел "SQL Editor" в левом меню

### ✅ **Шаг 2: Выполните SQL скрипты**

**Скопируйте и выполните весь скрипт из файла `database_schema.sql`:**

```sql
-- Таблица зон
CREATE TABLE IF NOT EXISTS zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) NOT NULL, -- HEX цвет
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица ячеек зон
CREATE TABLE IF NOT EXISTS zone_cells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  q INTEGER NOT NULL, -- гексагональная координата q
  r INTEGER NOT NULL, -- гексагональная координата r
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zone_id, q, r)
);

-- Таблица гексагональных ячеек
CREATE TABLE IF NOT EXISTS hex_cells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  q INTEGER NOT NULL, -- гексагональная координата q
  r INTEGER NOT NULL, -- гексагональная координата r
  type VARCHAR(20) NOT NULL DEFAULT 'hidden-slot', -- 'project-center', 'building-slot', 'hidden-slot'
  state VARCHAR(20) NOT NULL DEFAULT 'empty', -- 'empty', 'occupied', 'highlighted', 'hidden'
  building_type VARCHAR(50), -- тип здания
  category VARCHAR(50), -- категория
  task_name VARCHAR(255), -- название задачи
  progress INTEGER DEFAULT 0, -- прогресс 0-100
  priority INTEGER DEFAULT 1, -- приоритет 1-5
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, q, r)
);

-- Таблица зданий
CREATE TABLE IF NOT EXISTS buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  q INTEGER NOT NULL, -- гексагональная координата q
  r INTEGER NOT NULL, -- гексагональная координата r
  building_type VARCHAR(20) NOT NULL, -- 'house', 'tree', 'factory'
  category VARCHAR(50) NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  progress INTEGER DEFAULT 0, -- прогресс 0-100
  priority INTEGER DEFAULT 1, -- приоритет 1-5
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, q, r)
);

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_zones_project_id ON zones(project_id);
CREATE INDEX IF NOT EXISTS idx_zone_cells_zone_id ON zone_cells(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_cells_coordinates ON zone_cells(q, r);
CREATE INDEX IF NOT EXISTS idx_hex_cells_project_id ON hex_cells(project_id);
CREATE INDEX IF NOT EXISTS idx_hex_cells_coordinates ON hex_cells(q, r);
CREATE INDEX IF NOT EXISTS idx_hex_cells_state ON hex_cells(state);
CREATE INDEX IF NOT EXISTS idx_buildings_project_id ON buildings(project_id);
CREATE INDEX IF NOT EXISTS idx_buildings_coordinates ON buildings(q, r);

-- RLS (Row Level Security) политики
-- Включение RLS для всех таблиц
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE hex_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Политики для zones
CREATE POLICY "Users can view zones in their projects" ON zones
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create zones in their projects" ON zones
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update zones in their projects" ON zones
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete zones in their projects" ON zones
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Политики для zone_cells
CREATE POLICY "Users can view zone cells in their projects" ON zone_cells
  FOR SELECT USING (
    zone_id IN (
      SELECT z.id FROM zones z 
      JOIN projects p ON z.project_id = p.id 
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create zone cells in their projects" ON zone_cells
  FOR INSERT WITH CHECK (
    zone_id IN (
      SELECT z.id FROM zones z 
      JOIN projects p ON z.project_id = p.id 
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete zone cells in their projects" ON zone_cells
  FOR DELETE USING (
    zone_id IN (
      SELECT z.id FROM zones z 
      JOIN projects p ON z.project_id = p.id 
      WHERE p.created_by = auth.uid()
    )
  );

-- Политики для hex_cells
CREATE POLICY "Users can view hex cells in their projects" ON hex_cells
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create hex cells in their projects" ON hex_cells
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update hex cells in their projects" ON hex_cells
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Политики для buildings
CREATE POLICY "Users can view buildings in their projects" ON buildings
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create buildings in their projects" ON buildings
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update buildings in their projects" ON buildings
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete buildings in their projects" ON buildings
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hex_cells_updated_at BEFORE UPDATE ON hex_cells
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### ✅ **Шаг 3: Проверьте настройки аутентификации

1. Откройте вкладку `Authentication → URL Configuration`.
2. В поле **Site URL** укажите ваш production URL (например, `https://playjoob.com`).
3. В разделе **Redirect URLs** добавьте (каждую строку отдельно):
   - `https://playjoob.com/auth/callback` (production)
   - `http://localhost:5173/auth/callback` (development)
   - `https://localhost:5173/auth/callback` (development with HTTPS)
4. Сохраните изменения и перезапустите любое запущенное приложение, чтобы подтянуть новые настройки.

**Примечание:** Для локальной разработки убедитесь, что в вашем `.env` файле установлены правильные значения:
```
VITE_BASE_URL=http://localhost:5173
VITE_REDIRECT_URL=http://localhost:5173/auth/callback
```

### ✅ **Шаг 4: Проверьте создание таблиц**

1. **Перейдите** в раздел "Table Editor"
2. **Проверьте** наличие таблиц:
   - ✅ `zones` - для зон
   - ✅ `zone_cells` - для ячеек зон
   - ✅ `hex_cells` - для гексагональных ячеек
   - ✅ `buildings` - для зданий

### ✅ **Шаг 4: Проверьте RLS политики**

1. **Откройте** любую таблицу
2. **Перейдите** на вкладку "Auth policies"
3. **Проверьте** наличие политик безопасности

## 🎯 **ЧТО СОЗДАЕТСЯ**

### ✅ **Таблицы:**
- ✅ **`zones`** - зоны проекта
- ✅ **`zone_cells`** - ячейки, принадлежащие зонам
- ✅ **`hex_cells`** - гексагональные ячейки сетки
- ✅ **`buildings`** - здания на ячейках

### ✅ **Индексы:**
- ✅ **Производительность** - быстрый поиск по координатам
- ✅ **Связи** - между проектами, зонами и зданиями

### ✅ **RLS политики:**
- ✅ **Безопасность** - пользователи видят только свои данные
- ✅ **Авторизация** - проверка прав доступа

### ✅ **Триггеры:**
- ✅ **Автообновление** - `updated_at` поля
- ✅ **Целостность** - автоматическое обновление времени

## 🚀 **ПОСЛЕ НАСТРОЙКИ**

### ✅ **Что изменится:**
- ✅ **Зоны сохраняются** - в таблице `zones`
- ✅ **Здания сохраняются** - в таблице `buildings`
- ✅ **Данные синхронизируются** - между пользователями
- ✅ **Ошибки 404 исчезнут** - таблицы будут созданы

### ✅ **Как проверить:**
1. **Создайте зону** в приложении
2. **Создайте здание** в зоне
3. **Проверьте** таблицы в Supabase
4. **Обновите страницу** - данные должны сохраниться

## 🎉 **РЕЗУЛЬТАТ**

**После выполнения этих шагов:**
- ✅ **Данные сохраняются** в Supabase
- ✅ **Синхронизация** между пользователями
- ✅ **Безопасность** через RLS политики
- ✅ **Производительность** через индексы

**Приложение будет полностью функциональным с бэкендом!** 🚀✨

---

*Инструкция создана: $(date)*  
*Действие: Настройка Supabase таблиц*  
*Результат: Полная функциональность с бэкендом*  
*Статус: ГОТОВО К ВЫПОЛНЕНИЮ ✅* 