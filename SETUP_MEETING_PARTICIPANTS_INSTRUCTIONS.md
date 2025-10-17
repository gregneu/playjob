# Настройка таблицы meeting_participants для realtime синхронизации

## Шаг 1: Выполнение SQL скрипта

1. Откройте Supabase Dashboard
2. Перейдите в раздел "SQL Editor"
3. Скопируйте содержимое файла `CREATE_MEETING_PARTICIPANTS_TABLE.sql`
4. Вставьте в SQL Editor и выполните

## Шаг 2: Проверка создания таблицы

После выполнения скрипта проверьте:

1. **Таблица создана**: В разделе "Table Editor" должна появиться таблица `meeting_participants`
2. **RLS включен**: В настройках таблицы должно быть включено "Row Level Security"
3. **Realtime включен**: В разделе "Replication" таблица должна быть добавлена в публикацию

## Шаг 3: Проверка политик RLS

Убедитесь, что созданы следующие политики:
- `Users can view meeting participants in accessible projects`
- `Users can join meetings`
- `Users can update their own participation`
- `Users can leave meetings`

## Шаг 4: Проверка индексов

Проверьте, что созданы индексы:
- `idx_meeting_participants_project_room`
- `idx_meeting_participants_user`
- `idx_meeting_participants_active`

## Шаг 5: Тестирование

После настройки базы данных:
1. Запустите приложение
2. Откройте Meet панель
3. Проверьте, что бейджи отображаются
4. Проверьте, что нет ошибок 404/400 в консоли

## Возможные проблемы

### Ошибка 404 (Not Found)
- Таблица не создана или не найдена
- Проверьте правильность выполнения SQL скрипта

### Ошибка 400 (Bad Request)
- Проблема с RLS политиками
- Проверьте, что пользователь имеет доступ к проекту

### Ошибка связи с profiles
- Убедитесь, что таблица `profiles` существует
- Проверьте, что связь между таблицами настроена правильно
