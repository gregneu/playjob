#!/bin/bash

# Скрипт для обновления симлинка на последний лог файл
# Использование: ./scripts/update-latest-log.sh

LOGS_DIR="project-logs"
LATEST_LINK="$LOGS_DIR/latest"

# Проверяем, существует ли папка логов
if [ ! -d "$LOGS_DIR" ]; then
    echo "❌ Logs directory not found: $LOGS_DIR"
    exit 1
fi

# Находим последний лог файл
LATEST_LOG=$(ls -t "$LOGS_DIR"/browser-logs-*.log 2>/dev/null | head -n1)

if [ -z "$LATEST_LOG" ]; then
    echo "❌ No log files found in $LOGS_DIR"
    echo "💡 Run: node scripts/save-browser-logs.js to create a log file"
    exit 1
fi

# Удаляем старый симлинк если существует
if [ -L "$LATEST_LINK" ]; then
    rm "$LATEST_LINK"
    echo "🗑️  Removed old symlink"
fi

# Создаем новый симлинк
ln -s "$(basename "$LATEST_LOG")" "$LATEST_LINK"

echo "✅ Updated symlink: $LATEST_LINK -> $(basename "$LATEST_LOG")"
echo "📁 Latest log: $LATEST_LOG"
echo "🔗 Symlink: $LATEST_LINK"
