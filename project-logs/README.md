# Project Logs

This directory contains logs from the PlayJoob project.

## Structure

- `browser-logs-*.log` - Browser console logs with timestamps
- `latest` - Symlink to the most recent log file (if configured)

## How to Use

### Manual Log Saving
1. Open browser console (F12)
2. Copy logs from console
3. Paste them into a new `browser-logs-*.log` file
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
```
[2024-01-15T10:30:00.000Z] INFO HexGridSystem: Component mounted
[2024-01-15T10:30:01.000Z] DEBUG HexGridSystem: handleDrop called
[2024-01-15T10:30:02.000Z] ERROR HexGridSystem: Drop event failed
```
