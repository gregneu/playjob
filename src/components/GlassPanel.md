# GlassPanel Component

Переиспользуемый компонент для создания панелей с эффектом размытого стекла.

## Использование

### Базовое использование
```tsx
import { GlassPanel } from './GlassPanel'

<GlassPanel>
  <h3>Заголовок</h3>
  <p>Содержимое панели</p>
</GlassPanel>
```

### С вариантами размера
```tsx
// Компактная панель
<GlassPanel variant="compact">
  <button>Кнопка</button>
</GlassPanel>

// Большая панель
<GlassPanel variant="large">
  <div>Большое содержимое</div>
</GlassPanel>
```

### С дополнительными стилями
```tsx
<GlassPanel 
  style={{ width: '300px', margin: '20px' }}
  className="custom-class"
>
  <div>Кастомное содержимое</div>
</GlassPanel>
```

## Props

- `children: React.ReactNode` - содержимое панели
- `style?: React.CSSProperties` - дополнительные стили
- `className?: string` - дополнительные CSS классы
- `variant?: 'default' | 'compact' | 'large'` - вариант размера

## CSS Классы

- `.glass-panel` - базовый стиль
- `.glass-panel-compact` - компактный вариант
- `.glass-panel-large` - большой вариант
- `.glass-panel:hover` - эффект при наведении

## Стили по умолчанию

- `background: rgba(0, 0, 0, 0.1)` - полупрозрачный фон
- `backdrop-filter: blur(20px)` - размытие фона
- `border-radius: 20px` - скругленные углы
- `padding: 20px` - отступы
- `border: 1px solid rgba(255, 255, 255, 0.2)` - рамка
- `color: white` - белый текст 