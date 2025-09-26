-- СОЗДАНИЕ ТЕСТОВЫХ ЗОН С ТИКЕТАМИ В ГЕКСАГОНАЛЬНОЙ СЕТКЕ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Создаем тестовый проект для зон
INSERT INTO projects (
  name,
  description,
  color,
  icon,
  user_id,
  status,
  created_at,
  updated_at
) VALUES (
  'Test Hexagonal Zones Project',
  'Проект с зонами и тикетами в гексагональной сетке для тестирования',
  '#4ECDC4',
  '🔷',
  '520a6177-9457-4657-86f9-e7fa3737ce5d',
  'active',
  NOW(),
  NOW()
) RETURNING id;

-- 2. Создаем зоны в гексагональной сетке
INSERT INTO zones (
  project_id,
  q,
  r,
  color,
  title,
  description,
  created_at,
  updated_at
) VALUES 
-- Центральная зона
('520a6177-9457-4657-86f9-e7fa3737ce5d', 0, 0, '#FF6B6B', 'Центральная зона', 'Основная зона проекта с ключевыми функциями', NOW(), NOW()),
-- Зоны вокруг центра
('520a6177-9457-4657-86f9-e7fa3737ce5d', 1, 0, '#4ECDC4', 'Зона разработки', 'Зона для задач разработки и программирования', NOW(), NOW()),
('520a6177-9457-4657-86f9-e7fa3737ce5d', -1, 0, '#45B7D1', 'Зона тестирования', 'Зона для тестирования и QA задач', NOW(), NOW()),
('520a6177-9457-4657-86f9-e7fa3737ce5d', 0, 1, '#96CEB4', 'Зона дизайна', 'Зона для UI/UX дизайна и прототипирования', NOW(), NOW()),
('520a6177-9457-4657-86f9-e7fa3737ce5d', 0, -1, '#FFEAA7', 'Зона документации', 'Зона для создания и поддержки документации', NOW(), NOW()),
('520a6177-9457-4657-86f9-e7fa3737ce5d', 1, -1, '#DDA0DD', 'Зона интеграций', 'Зона для работы с внешними API и сервисами', NOW(), NOW()),
('520a6177-9457-4657-86f9-e7fa3737ce5d', -1, 1, '#98D8C8', 'Зона инфраструктуры', 'Зона для DevOps и настройки инфраструктуры', NOW(), NOW());

-- 3. Создаем объекты зон (здания)
INSERT INTO zone_objects (
  zone_id,
  type,
  title,
  description,
  status,
  priority,
  q,
  r,
  created_at,
  updated_at
) VALUES 
-- Объекты для центральной зоны
((SELECT id FROM zones WHERE q = 0 AND r = 0 LIMIT 1), 'castle', 'Главный замок', 'Центральное здание проекта', 'done', 'veryhigh', 0, 0, NOW(), NOW()),
((SELECT id FROM zones WHERE q = 0 AND r = 0 LIMIT 1), 'mountain', 'Спринт гора', 'Гора для планирования спринтов', 'in_progress', 'high', 0, 0, NOW(), NOW()),

-- Объекты для зоны разработки
((SELECT id FROM zones WHERE q = 1 AND r = 0 LIMIT 1), 'house', 'Дом разработчика', 'Здание для задач разработки', 'open', 'high', 1, 0, NOW(), NOW()),
((SELECT id FROM zones WHERE q = 1 AND r = 0 LIMIT 1), 'tower', 'Башня кода', 'Башня для сложных алгоритмов', 'in_progress', 'medium', 1, 0, NOW(), NOW()),

-- Объекты для зоны тестирования
((SELECT id FROM zones WHERE q = -1 AND r = 0 LIMIT 1), 'house', 'Дом тестировщика', 'Здание для QA задач', 'open', 'high', -1, 0, NOW(), NOW()),
((SELECT id FROM zones WHERE q = -1 AND r = 0 LIMIT 1), 'tower', 'Башня тестов', 'Башня для автоматических тестов', 'done', 'medium', -1, 0, NOW(), NOW()),

-- Объекты для зоны дизайна
((SELECT id FROM zones WHERE q = 0 AND r = 1 LIMIT 1), 'house', 'Дом дизайнера', 'Здание для UI/UX задач', 'open', 'medium', 0, 1, NOW(), NOW()),
((SELECT id FROM zones WHERE q = 0 AND r = 1 LIMIT 1), 'tower', 'Башня прототипов', 'Башня для создания прототипов', 'in_progress', 'low', 0, 1, NOW(), NOW()),

-- Объекты для зоны документации
((SELECT id FROM zones WHERE q = 0 AND r = -1 LIMIT 1), 'house', 'Дом документации', 'Здание для задач документации', 'open', 'low', 0, -1, NOW(), NOW()),
((SELECT id FROM zones WHERE q = 0 AND r = -1 LIMIT 1), 'tower', 'Башня знаний', 'Башня для хранения знаний', 'done', 'low', 0, -1, NOW(), NOW()),

-- Объекты для зоны интеграций
((SELECT id FROM zones WHERE q = 1 AND r = -1 LIMIT 1), 'house', 'Дом интеграций', 'Здание для работы с API', 'open', 'medium', 1, -1, NOW(), NOW()),
((SELECT id FROM zones WHERE q = 1 AND r = -1 LIMIT 1), 'tower', 'Башня данных', 'Башня для обработки данных', 'in_progress', 'high', 1, -1, NOW(), NOW()),

-- Объекты для зоны инфраструктуры
((SELECT id FROM zones WHERE q = -1 AND r = 1 LIMIT 1), 'house', 'Дом DevOps', 'Здание для инфраструктурных задач', 'open', 'high', -1, 1, NOW(), NOW()),
((SELECT id FROM zones WHERE q = -1 AND r = 1 LIMIT 1), 'tower', 'Башня серверов', 'Башня для управления серверами', 'done', 'medium', -1, 1, NOW(), NOW());

-- 4. Создаем тикеты для каждого объекта зоны
INSERT INTO object_tickets (
  zone_object_id,
  type,
  title,
  description,
  status,
  priority,
  assignee_id,
  created_by,
  created_at,
  updated_at
) VALUES 
-- Тикеты для главного замка
((SELECT id FROM zone_objects WHERE type = 'castle' LIMIT 1), 'story', 'Архитектура системы', 'Спроектировать общую архитектуру приложения', 'done', 'veryhigh', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'castle' LIMIT 1), 'task', 'Настройка проекта', 'Инициализировать проект и настроить базовую структуру', 'done', 'high', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'castle' LIMIT 1), 'bug', 'Критическая ошибка', 'Исправить критическую ошибку в основном функционале', 'open', 'veryhigh', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для спринт горы
((SELECT id FROM zone_objects WHERE type = 'mountain' LIMIT 1), 'story', 'Планирование спринта', 'Спланировать задачи на следующий спринт', 'in_progress', 'high', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'mountain' LIMIT 1), 'task', 'Ретроспектива', 'Провести ретроспективу завершенного спринта', 'open', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для домов разработки
((SELECT id FROM zone_objects WHERE type = 'house' AND q = 1 LIMIT 1), 'story', 'Новая функция', 'Реализовать новую функцию для пользователей', 'open', 'high', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'house' AND q = 1 LIMIT 1), 'task', 'Рефакторинг кода', 'Улучшить качество существующего кода', 'in_progress', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'house' AND q = 1 LIMIT 1), 'bug', 'Ошибка в коде', 'Исправить ошибку в алгоритме сортировки', 'open', 'high', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для башен кода
((SELECT id FROM zone_objects WHERE type = 'tower' AND q = 1 LIMIT 1), 'story', 'Сложный алгоритм', 'Реализовать сложный алгоритм машинного обучения', 'in_progress', 'veryhigh', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'tower' AND q = 1 LIMIT 1), 'task', 'Оптимизация', 'Оптимизировать производительность алгоритма', 'open', 'high', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для домов тестирования
((SELECT id FROM zone_objects WHERE type = 'house' AND q = -1 LIMIT 1), 'test', 'Unit тесты', 'Написать unit тесты для новых функций', 'open', 'high', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'house' AND q = -1 LIMIT 1), 'test', 'Интеграционные тесты', 'Создать интеграционные тесты для API', 'in_progress', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'house' AND q = -1 LIMIT 1), 'bug', 'Тестовая ошибка', 'Исправить ошибку, найденную в тестах', 'open', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для башен тестов
((SELECT id FROM zone_objects WHERE type = 'tower' AND q = -1 LIMIT 1), 'test', 'Автоматические тесты', 'Настроить автоматическое тестирование', 'done', 'high', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'tower' AND q = -1 LIMIT 1), 'task', 'Нагрузочное тестирование', 'Провести нагрузочное тестирование системы', 'open', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для домов дизайна
((SELECT id FROM zone_objects WHERE type = 'house' AND r = 1 LIMIT 1), 'story', 'Новый дизайн', 'Создать новый дизайн для главной страницы', 'open', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'house' AND r = 1 LIMIT 1), 'task', 'UI компоненты', 'Создать библиотеку переиспользуемых UI компонентов', 'in_progress', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для башен прототипов
((SELECT id FROM zone_objects WHERE type = 'tower' AND r = 1 LIMIT 1), 'story', 'Интерактивный прототип', 'Создать интерактивный прототип нового функционала', 'open', 'low', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'tower' AND r = 1 LIMIT 1), 'task', 'Анимации', 'Добавить плавные анимации в интерфейс', 'in_progress', 'low', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для домов документации
((SELECT id FROM zone_objects WHERE type = 'house' AND r = -1 LIMIT 1), 'story', 'Техническая документация', 'Написать техническую документацию для API', 'open', 'low', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'house' AND r = -1 LIMIT 1), 'task', 'Руководство пользователя', 'Создать руководство пользователя для приложения', 'in_progress', 'low', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для башен знаний
((SELECT id FROM zone_objects WHERE type = 'tower' AND r = -1 LIMIT 1), 'story', 'База знаний', 'Создать базу знаний для команды разработки', 'done', 'low', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE type = 'tower' AND r = -1 LIMIT 1), 'task', 'Вики проекта', 'Настроить вики для документации проекта', 'open', 'low', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для домов интеграций
((SELECT id FROM zone_objects WHERE q = 1 AND r = -1 AND type = 'house' LIMIT 1), 'story', 'Интеграция с платежами', 'Интегрировать систему платежей Stripe', 'open', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE q = 1 AND r = -1 AND type = 'house' LIMIT 1), 'task', 'API ключи', 'Настроить API ключи для внешних сервисов', 'in_progress', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для башен данных
((SELECT id FROM zone_objects WHERE q = 1 AND r = -1 AND type = 'tower' LIMIT 1), 'story', 'Обработка Big Data', 'Реализовать систему обработки больших данных', 'open', 'high', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE q = 1 AND r = -1 AND type = 'tower' LIMIT 1), 'task', 'Кэширование данных', 'Настроить Redis для кэширования', 'in_progress', 'high', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для домов DevOps
((SELECT id FROM zone_objects WHERE q = -1 AND r = 1 AND type = 'house' LIMIT 1), 'story', 'CI/CD пайплайн', 'Настроить автоматический пайплайн развертывания', 'open', 'high', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE q = -1 AND r = 1 AND type = 'house' LIMIT 1), 'task', 'Docker контейнеры', 'Создать Docker контейнеры для приложения', 'in_progress', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),

-- Тикеты для башен серверов
((SELECT id FROM zone_objects WHERE q = -1 AND r = 1 AND type = 'tower' LIMIT 1), 'story', 'Мониторинг серверов', 'Настроить мониторинг производительности серверов', 'done', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW()),
((SELECT id FROM zone_objects WHERE q = -1 AND r = 1 AND type = 'tower' LIMIT 1), 'task', 'Резервное копирование', 'Настроить автоматическое резервное копирование', 'open', 'medium', '520a6177-9457-4657-86f9-e7fa3737ce5d', '520a6177-9457-4657-86f9-e7fa3737ce5d', NOW(), NOW());

-- 5. Проверяем что все создалось
SELECT 'Test zones project created successfully!' as status;
SELECT COUNT(*) as total_zones FROM zones WHERE project_id = '520a6177-9457-4657-86f9-e7fa3737ce5d';
SELECT COUNT(*) as total_zone_objects FROM zone_objects WHERE zone_id IN (SELECT id FROM zones WHERE project_id = '520a6177-9457-4657-86f9-e7fa3737ce5d');
SELECT COUNT(*) as total_zone_tickets FROM object_tickets WHERE zone_object_id IN (SELECT id FROM zone_objects WHERE zone_id IN (SELECT id FROM zones WHERE project_id = '520a6177-9457-4657-86f9-e7fa3737ce5d'));
