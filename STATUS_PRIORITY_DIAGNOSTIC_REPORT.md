# Отчет о диагностике проблемы с сохранением Status и Priority

## Проблема
Есть предположение, что Status и Priority не записываются в базу данных при создании объектов зон.

## Диагностические шаги

### 1. **Добавлено расширенное логирование**
В `src/lib/supabase.ts` добавлено подробное логирование в функции:
- `createZoneObject` - для отслеживания создания объектов
- `updateZoneObject` - для отслеживания обновления объектов

```typescript
console.log('=== CREATING ZONE OBJECT ===')
console.log('Object data to insert:', object)
console.log('Status:', object.status)
console.log('Priority:', object.priority)
```

### 2. **Добавлено логирование в HexGridSystem**
В `src/components/HexGridSystem.tsx` добавлено логирование для отслеживания передачи данных:

```typescript
console.log('=== CREATING ZONE OBJECT IN HEXGRIDSYSTEM ===')
console.log('Status from form:', objectData.status)
console.log('Priority from form:', objectData.priority)
```

### 3. **Добавлено логирование в ZoneObjectCreator**
В `src/components/ZoneObjectCreator.tsx` добавлено логирование для отслеживания выбора пользователя:

```typescript
console.log('=== ZONEOBJECTCREATOR SAVE ===')
console.log('Status:', selectedStatus)
console.log('Priority:', selectedPriority)
```

### 4. **Созданы SQL скрипты для проверки**

#### `CHECK_ZONE_OBJECTS_TABLE.sql`
Проверяет:
- Существование таблицы `zone_objects`
- Структуру таблицы
- Ограничения и индексы
- Наличие данных в таблице

#### `TEST_ZONE_OBJECT_CREATION.sql`
Тестирует:
- Создание тестового объекта с Status и Priority
- Обновление Status и Priority
- Проверку результатов

## Возможные причины проблемы

### 1. **Таблица zone_objects не создана**
- Выполните `CREATE_ZONE_OBJECTS_TABLE.sql` в Supabase SQL Editor
- Проверьте результат с помощью `CHECK_ZONE_OBJECTS_TABLE.sql`

### 2. **Неправильная передача данных**
- Проверьте консоль браузера на наличие ошибок
- Убедитесь, что данные передаются через все слои приложения

### 3. **Проблемы с Supabase конфигурацией**
- Проверьте переменные окружения `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
- Убедитесь, что Supabase доступен

### 4. **Проблемы с RLS (Row Level Security)**
- Таблица может быть защищена политиками доступа
- Временно отключите RLS для тестирования

## Инструкции по диагностике

### Шаг 1: Проверьте таблицу в базе данных
1. Откройте Supabase Dashboard
2. Перейдите в SQL Editor
3. Выполните `CHECK_ZONE_OBJECTS_TABLE.sql`
4. Убедитесь, что таблица существует и имеет правильную структуру

### Шаг 2: Проверьте логи в браузере
1. Откройте Developer Tools (F12)
2. Перейдите на вкладку Console
3. Создайте объект в зоне
4. Проверьте логи на наличие ошибок

### Шаг 3: Протестируйте создание объекта
1. Выполните `TEST_ZONE_OBJECT_CREATION.sql` в SQL Editor
2. Замените `ZONE_ID_HERE` на реальный ID зоны
3. Проверьте, что объект создается с правильными Status и Priority

### Шаг 4: Проверьте обновление объекта
1. Откройте ObjectDetailsPanel для существующего объекта
2. Измените Status или Priority
3. Проверьте логи на наличие ошибок сохранения

## Ожидаемые результаты

### При успешной работе:
```
=== ZONEOBJECTCREATOR SAVE ===
Title: Test Object
Status: open
Priority: high

=== CREATING ZONE OBJECT IN HEXGRIDSYSTEM ===
Status from form: open
Priority from form: high

=== CREATING ZONE OBJECT ===
Status: open
Priority: high

=== ZONE OBJECT CREATED SUCCESSFULLY ===
Status in database: open
Priority in database: high
```

### При наличии проблем:
- Ошибки в консоли браузера
- Сообщения об ошибках от Supabase
- Отсутствие данных в таблице `zone_objects`

## Файлы для проверки:
- `CHECK_ZONE_OBJECTS_TABLE.sql` - проверка структуры базы данных
- `TEST_ZONE_OBJECT_CREATION.sql` - тестирование создания объектов
- `CREATE_ZONE_OBJECTS_TABLE.sql` - создание таблицы (если не существует)

## Следующие шаги:
1. Выполните диагностические скрипты
2. Проверьте логи в браузере
3. Сообщите о найденных ошибках для дальнейшего исправления 