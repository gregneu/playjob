# Drag & Drop System Documentation

## Overview

Этот документ предоставляет полную документацию по функциональности drag & drop, реализованной в проекте PlayJoob. Система позволяет пользователям перетаскивать тикеты из sidebar и размещать их на зданиях зон на гексагональной карте.

## Архитектура системы

### Высокоуровневый обзор

Система drag & drop состоит из нескольких взаимосвязанных компонентов:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   TicketCard    │    │  HexGridSystem   │    │   Supabase DB   │
│   (Draggable)   │───▶│   (Drop Target)  │───▶│  (Persistence)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  ZoneObjectDetails│   │   useProjectData │    │   RLS Policies  │
│     Panel        │    │     (State)      │    │   (Security)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Структура компонентов

### 1. TicketCard Component

**Расположение:** `src/components/TicketCard.tsx`

**Назначение:** Рендерит отдельные тикеты с функциональностью перетаскивания

**Ключевые особенности:**
- Draggable интерфейс
- Визуальная обратная связь во время перетаскивания
- Настройка передачи данных

**Drag Implementation:**
```typescript
// Drag start handler
onDragStart={(e) => {
  // Устанавливаем данные для перетаскивания
  e.dataTransfer.setData('text/plain', type)
  e.dataTransfer.setData('application/x-existing-ticket', JSON.stringify({
    ticketId: id,
    fromZoneObjectId: currentZoneObjectId,
    title: title
  }))
  
  // Отправляем кастомное событие
  window.dispatchEvent(new CustomEvent('ticket-dragstart', {
    detail: { ticketId: id, fromZoneObjectId: currentZoneObjectId }
  }))
}}
```

### 2. HexGridSystem Component

**Расположение:** `src/components/HexGridSystem.tsx`

**Назначение:** Основная 3D система сетки, которая обрабатывает события drop

**Ключевые особенности:**
- Рендеринг 3D гексагональной сетки
- Обнаружение зон drop
- Raycasting для точного определения целей drop
- Валидация центров зон

**Drop Handler Implementation:**
```typescript
const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
  
  // Парсим данные перетаскивания
  const existingTicketData = e.dataTransfer?.getData('application/x-existing-ticket')
  let existingTicketInfo = null
  
  if (existingTicketData) {
    existingTicketInfo = JSON.parse(existingTicketData)
  }
  
  // Находим цель drop
  const cell = findCellUnderCursor(e)
  const zone = getZoneForCell(cell.q, cell.r)
  const isCenter = isZoneCenter(cell.q, cell.r)
  
  if (isCenter && zone && existingTicketInfo) {
    // Получаем правильный ID объекта зоны
    const targetZoneObject = getZoneObjectForCell(cell.q, cell.r)
    
    if (targetZoneObject) {
      // Перемещаем тикет
      moveTicket(
        existingTicketInfo.ticketId,
        existingTicketInfo.fromZoneObjectId,
        targetZoneObject.id
      )
    }
  }
}
```

## Поток данных

### 1. Инициация перетаскивания

```
Пользователь начинает перетаскивать тикет
         ↓
TicketCard.onDragStart срабатывает
         ↓
Данные сохраняются в dataTransfer
         ↓
Отправляется кастомное событие 'ticket-dragstart'
         ↓
HexGridSystem получает событие
         ↓
Состояние перетаскивания обновляется (isDraggingTicket = true)
```

### 2. Перетаскивание над сеткой

```
Мышь движется над сеткой
         ↓
HexGridSystem.handleDragOver срабатывает
         ↓
Raycasting находит ячейку под курсором
         ↓
Валидация зоны (isCenter, isInZone)
         ↓
Применяется визуальная обратная связь
```

### 3. Выполнение drop

```
Пользователь отпускает мышь
         ↓
HexGridSystem.handleDrop срабатывает
         ↓
Данные парсятся из dataTransfer
         ↓
Определяется целевой объект зоны
         ↓
Вызывается useProjectData.moveTicket
         ↓
Оптимистичное обновление UI
         ↓
Обновление базы данных через Supabase
         ↓
Обработка успеха/ошибки
```

## Схема базы данных

### Таблица object_tickets

```sql
CREATE TABLE object_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_object_id UUID NOT NULL REFERENCES zone_objects(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('story','task','bug','test')),
  title TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('v-low','low','medium','high','veryhigh')),
  assignee_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Реализация безопасности

### Row Level Security (RLS) Политики

Система реализует комплексные RLS политики для обеспечения безопасности данных:

```sql
-- Политика для обновления тикетов (позволяет перемещение между зонами пользователя)
CREATE POLICY "tickets_update" ON object_tickets
  FOR UPDATE USING (
    -- Проверяем, что старый zone_object_id принадлежит пользователю
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  ) WITH CHECK (
    -- Проверяем, что новый zone_object_id принадлежит пользователю
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  );
```

## Руководство по устранению неполадок

### Распространенные проблемы и решения

#### 1. События drag не срабатывают

**Симптомы:**
- Нет событий drag start в консоли
- Курсор не меняется на grab

**Решения:**
- Проверить, что prop `draggable` установлен в `true`
- Убедиться, что нет CSS `pointer-events: none`, блокирующего события
- Убедиться, что элемент не покрыт другими элементами

#### 2. Drop не работает

**Симптомы:**
- Drag работает, но drop не срабатывает
- Нет событий `onDrop` в консоли

**Решения:**
- Проверить, что `onDragOver` вызывает `e.preventDefault()`
- Убедиться, что `dropEffect` установлен в `'move'`
- Убедиться, что цель drop имеет правильные обработчики событий

#### 3. Нарушения RLS политик

**Симптомы:**
- Ошибка: `new row violates row-level security policy`
- Ответы 403 Forbidden

**Решения:**
- Убедиться, что пользователь владеет как исходной, так и целевой зонами
- Проверить, что zone_object_id существует в таблице zone_objects
- Убедиться, что RLS политики правильно настроены

#### 4. Нарушения ограничений внешнего ключа

**Симптомы:**
- Ошибка: `Key (zone_object_id) is not present in table "zone_objects"`
- Ответы 409 Conflict

**Решения:**
- Убедиться, что `getZoneObjectForCell()` возвращает валидный объект
- Проверить, что центр зоны имеет связанный zone_object
- Убедиться, что правильный ID передается в moveTicket

## Что мы исправили

### Проблема 1: События drag не запускались
**Решение:** Добавили расширенное логирование и диагностику в TicketCard

### Проблема 2: onDrop не срабатывал
**Решение:** Исправили `onDragOver` обработчики, добавили `dropEffect = 'move'`

### Проблема 3: RLS политики блокировали обновления
**Решение:** Временно отключили RLS для тестирования, затем восстановили с правильной логикой

### Проблема 4: Неправильный zone_object_id
**Решение:** Исправили логику в `handleDrop` - теперь используется `getZoneObjectForCell()` вместо `zone.id`

## Итоговые миграции базы данных

1. **20250921150219_fix_drag_drop_rls.sql** - Исправление RLS политики
2. **20250921152110_disable_rls_temporarily.sql** - Временное отключение RLS
3. **20250921163310_restore_rls_policies.sql** - Восстановление RLS с правильной логикой

## Заключение

Система drag & drop обеспечивает бесшовный пользовательский опыт для управления тикетами на гексагональной сетке. Реализация гарантирует целостность данных, безопасность и производительность при поддержании чистого и поддерживаемого кода.

**Ключевые достижения:**
- ✅ Полностью функциональный drag & drop
- ✅ Безопасность данных через RLS
- ✅ Оптимистичные обновления UI
- ✅ Комплексная диагностика и логирование
- ✅ Правильная обработка ошибок
