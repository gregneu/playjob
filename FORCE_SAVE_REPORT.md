# Отчет о добавлении принудительного сохранения при закрытии sidebar

## Проблема
Пользователь сообщил, что данные не сохраняются при изменении статуса или приоритета объектов. Нужно добавить принудительное сохранение при закрытии sidebar.

## Решение
Добавлена функция принудительного сохранения при нажатии на кнопку "X" в правом верхнем углу sidebar.

## Выполненные изменения

### 1. Добавлено состояние для отслеживания изменений
```typescript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
```

### 2. Добавлена функция принудительного сохранения
```typescript
const handleCloseWithSave = () => {
  if (hasUnsavedChanges && task && onSave) {
    console.log('Saving changes before closing...')
    const updatedTask = {
      ...task,
      title: editedTitle,
      description: editedDescription,
      status: editedStatus,
      priority: editedPriority,
      storyPoints: editedStoryPoints
    }
    onSave(updatedTask)
  }
  onClose()
}
```

### 3. Обновлены функции изменения полей
```typescript
const handleStatusChange = (newStatus: 'open' | 'in_progress' | 'done') => {
  setEditedStatus(newStatus)
  setHasUnsavedChanges(true) // ← Добавлено
  console.log('Status changed to:', newStatus)
  if (onSave && task) {
    onSave({
      ...task,
      status: newStatus
    })
  }
}

const handlePriorityChange = (newPriority: 'low' | 'medium' | 'high' | 'critical') => {
  setEditedPriority(newPriority)
  setHasUnsavedChanges(true) // ← Добавлено
  console.log('Priority changed to:', newPriority)
  if (onSave && task) {
    onSave({
      ...task,
      priority: newPriority
    })
  }
}
```

### 4. Обновлена кнопка закрытия
```typescript
// ДО:
<button onClick={onClose}>

// ПОСЛЕ:
<button onClick={handleCloseWithSave}>
```

### 5. Добавлена визуальная индикация несохраненных изменений
```typescript
<h2 style={{...}}>
  Task Details
  {hasUnsavedChanges && (
    <span style={{
      fontSize: '12px',
      color: '#FF6B6B',
      fontWeight: '500'
    }}>
      (unsaved)
    </span>
  )}
</h2>
```

### 6. Обновлены функции сохранения
```typescript
const handleSaveTitle = () => {
  console.log('Saving title:', editedTitle)
  setEditingTitle(false)
  setHasUnsavedChanges(false) // ← Добавлено
  if (onSave && task) {
    onSave({
      ...task,
      title: editedTitle
    })
  }
}

const handleSaveDescription = () => {
  console.log('Saving description:', editedDescription)
  setEditingDescription(false)
  setHasUnsavedChanges(false) // ← Добавлено
  if (onSave && task) {
    onSave({
      ...task,
      description: editedDescription
    })
  }
}
```

## Результат

### ✅ **Новая функциональность:**
1. **Принудительное сохранение** при закрытии sidebar
2. **Визуальная индикация** несохраненных изменений "(unsaved)"
3. **Отслеживание изменений** всех полей (status, priority, title, description)
4. **Автоматический сброс** флага после сохранения

### ✅ **Логика работы:**
1. **При изменении любого поля** → устанавливается `hasUnsavedChanges = true`
2. **При сохранении поля** → сбрасывается `hasUnsavedChanges = false`
3. **При закрытии sidebar** → если есть несохраненные изменения, выполняется принудительное сохранение
4. **Визуальная индикация** → показывает "(unsaved)" в заголовке при наличии изменений

### ✅ **Поля, которые отслеживаются:**
- `title` - название задачи
- `description` - описание задачи
- `status` - статус (open/in_progress/done)
- `priority` - приоритет (low/medium/high/critical)
- `storyPoints` - story points

## Файлы изменены:
- `src/components/ObjectDetailsPanel.tsx` - добавлена логика принудительного сохранения

## Технические детали:
- Используется состояние `hasUnsavedChanges` для отслеживания изменений
- Функция `handleCloseWithSave` проверяет наличие изменений перед закрытием
- Визуальная индикация помогает пользователю понять, что есть несохраненные изменения
- Логирование всех операций для отладки 