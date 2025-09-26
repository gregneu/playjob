# Отчет о добавлении отладочной информации для диагностики сохранения

## Проблема
Пользователь сообщил, что:
- ✅ **Сохраняются**: Title, Description
- ❌ **Не сохраняются или не отображаются**: Status, Priority, Story Points

## Решение
Добавлена подробная отладочная информация для диагностики проблемы с сохранением и загрузкой данных.

## Выполненные изменения

### 1. Добавлено логирование в `handleTaskSave`
```typescript
console.log('=== SAVING TASK CHANGES ===')
console.log('Updated task object:', updatedTask)
console.log('Task ID:', updatedTask?.id)
console.log('Title:', updatedTask?.title)
console.log('Description:', updatedTask?.description)
console.log('Status:', updatedTask?.status)
console.log('Priority:', updatedTask?.priority)
console.log('Story Points:', updatedTask?.storyPoints)

console.log('=== SENDING TO DATABASE ===')
console.log('Update data:', updateData)

console.log('=== DATABASE RESULT ===')
console.log('Result from database:', result)
```

### 2. Добавлено логирование в `getZoneObjectForCellLocal`
```typescript
console.log(`=== LOADING OBJECT FOR CELL [${q}, ${r}] ===`)
console.log('Available zoneObjects:', zoneObjects)

console.log(`=== PROCESSING FOUND OBJECT ===`)
console.log('Raw object from database:', foundObject)
console.log('Object ID:', foundObject.id)
console.log('Object title:', foundObject.title)
console.log('Object description:', foundObject.description)
console.log('Object status:', foundObject.status)
console.log('Object priority:', foundObject.priority)
console.log('Object story_points:', foundObject.story_points)

console.log(`=== PROCESSED OBJECT ===`)
console.log('Processed object for UI:', processedObject)
```

### 3. Добавлено логирование в `updateZoneObject`
```typescript
console.log('=== UPDATEZONEOBJECT CALLED ===')
console.log('Object ID:', objectId)
console.log('Updates:', updates)

console.log('=== ZONEOBJECTSERVICE RESULT ===')
console.log('Result from zoneObjectService:', result)

console.log('Updated zoneObjects:', updated)
```

## Что покажет отладка

### 🔍 **При сохранении:**
1. **Входные данные** - что отправляется в базу данных
2. **Результат базы** - что возвращает `zoneObjectService.updateZoneObject`
3. **Обновление состояния** - как обновляется локальное состояние

### 🔍 **При загрузке:**
1. **Данные из базы** - что загружается из `zoneObjects`
2. **Обработка данных** - как преобразуются поля из базы в UI
3. **Итоговый объект** - что получает компонент

## Возможные причины проблемы

### 1. **Проблема с сохранением в базу**
- Поля `status`, `priority`, `story_points` не сохраняются в базу данных
- Ошибка в SQL запросе или структуре таблицы

### 2. **Проблема с загрузкой из базы**
- Поля загружаются, но имеют неправильные имена
- Поля загружаются как `null` или `undefined`

### 3. **Проблема с преобразованием данных**
- Неправильное сопоставление полей между базой и UI
- Проблема с fallback значениями

### 4. **Проблема с обновлением состояния**
- Локальное состояние не обновляется после сохранения
- Проблема с ключами объектов

## Следующие шаги

1. **Открыть консоль браузера** при работе с объектами
2. **Изменить статус/приоритет** объекта
3. **Просмотреть логи** для диагностики:
   - Что отправляется в базу
   - Что возвращает база
   - Что загружается при повторном открытии
4. **Определить точную причину** проблемы на основе логов

## Файлы изменены:
- `src/components/HexGridSystem.tsx` - добавлено логирование в `handleTaskSave` и `getZoneObjectForCellLocal`
- `src/hooks/useProjectData.ts` - добавлено логирование в `updateZoneObject`

## Ожидаемый результат:
После анализа логов мы сможем точно определить, на каком этапе теряются данные:
- При сохранении в базу данных
- При загрузке из базы данных  
- При преобразовании данных для UI
- При обновлении локального состояния 