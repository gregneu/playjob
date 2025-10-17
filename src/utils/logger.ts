// Utility for conditional logging based on environment
const isDevelopment = import.meta.env.DEV
const isDebug = import.meta.env.DEV && import.meta.env.VITE_DEBUG === 'true'

export const logger = {
  // Always log errors and warnings
  error: (...args: any[]) => console.error(...args),
  warn: (...args: any[]) => console.warn(...args),
  
  // Log info only in development
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args)
    }
  },
  
  // Log debug only when explicitly enabled
  debug: (...args: any[]) => {
    if (isDebug) {
      console.log('[DEBUG]', ...args)
    }
  },
  
  // Log verbose only for critical debugging
  verbose: (...args: any[]) => {
    if (isDebug && import.meta.env.VITE_VERBOSE === 'true') {
      console.log('[VERBOSE]', ...args)
    }
  },
  
  // Group logs for better organization
  group: (label: string, fn: () => void) => {
    if (isDevelopment) {
      console.group(label)
      fn()
      console.groupEnd()
    } else {
      fn()
    }
  }
}

// Helper to check if logging is enabled
export const isLoggingEnabled = {
  info: isDevelopment,
  debug: isDebug,
  verbose: isDebug && import.meta.env.VITE_VERBOSE === 'true'
}
