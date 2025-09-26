#!/usr/bin/env node

/**
 * Скрипт для сохранения логов браузера в файл
 * Использование: node scripts/save-browser-logs.js
 */

const fs = require('fs');
const path = require('path');

// Создаем папку для логов если её нет
const logsDir = path.join(__dirname, '..', 'project-logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Создаем файл с текущими логами
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `browser-logs-${timestamp}.log`);

// Создаем пустой файл логов
fs.writeFileSync(logFile, `# Browser Logs - ${new Date().toISOString()}\n\n`);

console.log(`📝 Log file created: ${logFile}`);
console.log(`📋 Instructions:`);
console.log(`1. Open browser console (F12)`);
console.log(`2. Copy logs from console`);
console.log(`3. Paste them into: ${logFile}`);
console.log(`4. Save the file`);
console.log(`\n🔗 Or use the browser extension to auto-save logs`);

// Создаем README для папки логов
const readmeContent = `# Project Logs

This directory contains logs from the PlayJoob project.

## Structure

- \`browser-logs-*.log\` - Browser console logs with timestamps
- \`latest\` - Symlink to the most recent log file (if configured)

## How to Use

### Manual Log Saving
1. Open browser console (F12)
2. Copy logs from console
3. Paste them into a new \`browser-logs-*.log\` file
4. Save the file

### Automatic Log Saving (Recommended)
Use a browser extension like "Console Export" or "LogRocket" to automatically save console logs.

### For Cursor AI
Cursor can read these log files to understand project behavior and debug issues.

## Log Format

Each log file should contain:
- Timestamp
- Log level (INFO, WARN, ERROR, DEBUG)
- Component/function name
- Log message
- Additional context (if available)

Example:
\`\`\`
[2024-01-15T10:30:00.000Z] INFO HexGridSystem: Component mounted
[2024-01-15T10:30:01.000Z] DEBUG HexGridSystem: handleDrop called
[2024-01-15T10:30:02.000Z] ERROR HexGridSystem: Drop event failed
\`\`\`
`;

fs.writeFileSync(path.join(logsDir, 'README.md'), readmeContent);

console.log(`\n✅ README created in project-logs/`);
