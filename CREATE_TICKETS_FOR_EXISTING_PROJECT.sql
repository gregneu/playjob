-- СОЗДАНИЕ 30 ТИКЕТОВ ДЛЯ СУЩЕСТВУЮЩЕГО ПРОЕКТА И ЗДАНИЯ
-- Запустите этот скрипт в Supabase SQL Editor

-- Параметры проекта и здания
DO $$
DECLARE
  project_id UUID := 'c5fb9648-e782-4799-bbf6-954ab96f5190';
  zone_object_id UUID := '253ab136-555c-4a6c-a485-4bbd6cc09f23';
  current_user_id UUID;
BEGIN
  -- Получаем ID текущего пользователя
  SELECT auth.uid() INTO current_user_id;
  IF current_user_id IS NULL THEN
    -- Fallback - используем ID из вашего проекта
    SELECT user_id FROM projects WHERE id = project_id INTO current_user_id;
    IF current_user_id IS NULL THEN
      -- Последний fallback - используем ваш известный ID
      current_user_id := '520a6177-9457-4657-86f9-e7fa3737ce5d';
    END IF;
  END IF;

  RAISE NOTICE 'Создаем тикеты для проекта: % и здания: %', project_id, zone_object_id;

  -- Создаем 30 тестовых тикетов
  INSERT INTO object_tickets (
    zone_object_id, project_id, type, title, description, status, priority, assignee_id, created_by, created_at, updated_at
  ) VALUES
  -- Story Tickets (10 штук)
  (zone_object_id, project_id, 'story', 'Реализовать систему уведомлений', 'Пользователи должны получать уведомления о важных событиях в проекте.', 'open', 'high', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'story', 'Добавить темную тему интерфейса', 'Создать переключатель между светлой и темной темой для улучшения UX.', 'in_progress', 'medium', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'story', 'Разработать мобильную версию', 'Обеспечить адаптивный дизайн для мобильных устройств и планшетов.', 'open', 'veryhigh', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'story', 'Интегрировать с внешними API', 'Подключить сторонние сервисы для расширения функционала приложения.', 'open', 'medium', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'story', 'Создать систему ролей и прав', 'Разграничить доступ пользователей на основе их ролей в проекте.', 'open', 'high', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'story', 'Добавить функцию экспорта данных', 'Пользователи должны иметь возможность экспортировать данные в разных форматах.', 'open', 'medium', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'story', 'Реализовать поиск по проекту', 'Добавить полнотекстовый поиск по всем элементам проекта.', 'open', 'low', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'story', 'Создать систему комментариев', 'Пользователи должны иметь возможность комментировать задачи и обновления.', 'open', 'medium', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'story', 'Добавить календарь событий', 'Интегрировать календарь для отслеживания дедлайнов и встреч.', 'open', 'low', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'story', 'Реализовать систему тегов', 'Добавить возможность тегирования задач для лучшей организации.', 'open', 'v-low', current_user_id, current_user_id, NOW(), NOW()),

  -- Task Tickets (10 штук)
  (zone_object_id, project_id, 'task', 'Настроить CI/CD пайплайн', 'Автоматизировать процесс сборки, тестирования и деплоя приложения.', 'in_progress', 'high', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'task', 'Оптимизировать производительность', 'Улучшить скорость загрузки и отзывчивость интерфейса.', 'open', 'medium', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'task', 'Написать юнит-тесты', 'Покрыть основные компоненты и функции тестами.', 'open', 'low', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'task', 'Обновить документацию', 'Актуализировать техническую документацию и руководства пользователя.', 'open', 'v-low', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'task', 'Настроить мониторинг', 'Внедрить инструменты для отслеживания состояния системы.', 'open', 'medium', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'task', 'Провести рефакторинг кода', 'Улучшить читаемость и поддерживаемость существующего кода.', 'open', 'low', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'task', 'Внедрить логирование', 'Собирать и анализировать логи со всех компонентов системы.', 'open', 'medium', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'task', 'Настроить кэширование', 'Уменьшить нагрузку на базу данных с помощью кэша.', 'open', 'high', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'task', 'Провести аудит безопасности', 'Проверить систему на наличие потенциальных уязвимостей.', 'open', 'veryhigh', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'task', 'Оптимизировать базу данных', 'Улучшить структуру таблиц и индексов для повышения производительности.', 'open', 'high', current_user_id, current_user_id, NOW(), NOW()),

  -- Bug Tickets (5 штук)
  (zone_object_id, project_id, 'bug', 'Кнопка сохранения неактивна', 'После редактирования данных кнопка сохранения остается неактивной.', 'open', 'veryhigh', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'bug', 'Ошибка валидации email', 'Система не принимает корректные email адреса при регистрации.', 'in_progress', 'high', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'bug', 'Медленная загрузка дашборда', 'Страница дашборда загружается более 10 секунд.', 'open', 'high', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'bug', 'Проблема с кодировкой', 'Специальные символы отображаются некорректно в отчетах.', 'open', 'medium', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'bug', 'Утечка памяти', 'Приложение потребляет все больше памяти при длительной работе.', 'open', 'veryhigh', current_user_id, current_user_id, NOW(), NOW()),

  -- Test Tickets (5 штук)
  (zone_object_id, project_id, 'test', 'Тестирование формы регистрации', 'Проверить корректность работы всех полей формы регистрации.', 'open', 'medium', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'test', 'Тестирование API эндпоинтов', 'Проверить работу всех API методов и их обработку ошибок.', 'in_progress', 'high', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'test', 'Нагрузочное тестирование', 'Оценить производительность системы под высокой нагрузкой.', 'open', 'high', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'test', 'Кроссбраузерное тестирование', 'Проверить работу приложения в разных браузерах и версиях.', 'open', 'low', current_user_id, current_user_id, NOW(), NOW()),
  (zone_object_id, project_id, 'test', 'Тестирование на мобильных устройствах', 'Проверить адаптивность и функционал на смартфонах и планшетах.', 'open', 'medium', current_user_id, current_user_id, NOW(), NOW());

  RAISE NOTICE 'Успешно создано 30 тикетов для проекта % в здании %', project_id, zone_object_id;
END $$;
