// Система категорий ячеек с цветовой маркировкой
export const CELL_CATEGORIES = {
  development: {
    color: '#4A90E2',      // Синий
    name: 'Разработка',
    buildings: ['code', 'laptop', 'server']
  },
  design: {
    color: '#7ED321',      // Зеленый  
    name: 'Дизайн',
    buildings: ['palette', 'monitor', 'tablet']
  },
  testing: {
    color: '#F5A623',      // Оранжевый
    name: 'Тестирование', 
    buildings: ['bug', 'checklist', 'test-tube']
  },
  documentation: {
    color: '#9013FE',      // Фиолетовый
    name: 'Документация',
    buildings: ['book', 'wiki', 'manual']
  },
  deployment: {
    color: '#50E3C2',      // Бирюзовый
    name: 'Деплой',
    buildings: ['rocket', 'cloud', 'server-rack']
  }
} as const

export type CellCategory = keyof typeof CELL_CATEGORIES

// Шаблоны названий задач по категориям
const TASK_TEMPLATES = {
  development: [
    'Frontend компонент',
    'API endpoint', 
    'Database схема',
    'Auth система',
    'Backend сервис',
    'Middleware',
    'ORM модель',
    'WebSocket',
    'GraphQL схема',
    'Microservice'
  ],
  design: [
    'UI mockup',
    'Icon set',
    'Brand guide', 
    'Wireframe',
    'Prototype',
    'Style guide',
    'Animation',
    'Illustration',
    'Logo design',
    'Color palette'
  ],
  testing: [
    'Unit тесты',
    'E2E тесты',
    'Performance audit',
    'Security check',
    'Integration тесты',
    'Load testing',
    'Accessibility audit',
    'Cross-browser тесты',
    'Mobile тесты',
    'API тесты'
  ],
  documentation: [
    'API docs',
    'User guide',
    'Technical spec',
    'Architecture doc',
    'README',
    'Code comments',
    'Deployment guide',
    'Troubleshooting',
    'FAQ',
    'Video tutorial'
  ],
  deployment: [
    'CI/CD pipeline',
    'Docker контейнер',
    'Kubernetes',
    'Cloud deployment',
    'Database migration',
    'SSL сертификат',
    'CDN настройка',
    'Monitoring',
    'Backup система',
    'Load balancer'
  ]
} as const

// Функция для генерации названия задачи
export const generateTaskName = (category: string, q: number, r: number): string => {
  const templates = TASK_TEMPLATES[category as keyof typeof TASK_TEMPLATES]
  if (!templates) return 'Неизвестная задача'
  const index = Math.abs(q + r) % templates.length
  return templates[index]
}

// Функция для получения категории по типу здания
export const getBuildingCategory = (buildingType: string): string => {
  const buildingToCategory: Record<string, string> = {
    house: 'development',
    tree: 'design', 
    factory: 'testing',
    bug: 'testing'
  }
  
  return buildingToCategory[buildingType] || 'development'
}

// Функция для получения цвета ячейки по категории
export const getCellColorByCategory = (category: string): string => {
  return CELL_CATEGORIES[category as keyof typeof CELL_CATEGORIES]?.color || '#FFFFFF'
}

// Функция для получения названия категории
export const getCategoryName = (category: string): string => {
  return CELL_CATEGORIES[category as keyof typeof CELL_CATEGORIES]?.name || 'Неизвестно'
} 