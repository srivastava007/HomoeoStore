const path = require('path')
const fs = require('fs')
const { app } = require('electron')

let logFilePath = null

function getLogFilePath() {
  if (!logFilePath) {
    try {
      logFilePath = path.join(app.getPath('userData'), 'app.log')
    } catch (e) {
      return null
    }
  }
  return logFilePath
}

function log(level, ...args) {
  const msg = args.map(arg => {
    if (arg instanceof Error) {
      return arg.stack || arg.message
    }
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2)
      } catch (e) {
        return String(arg)
      }
    }
    return String(arg)
  }).join(' ')

  const timestamp = new Date().toISOString()
  const logLine = `[${timestamp}] [${level}] ${msg}`

  // Write to log file
  const filePath = getLogFilePath() || path.join(process.cwd(), 'app.log')
  try {
    fs.appendFileSync(filePath, logLine + '\n', 'utf8')
  } catch (e) {
    // Prevent infinite recursion or crashes if write fails
  }
}

// Backup original console methods
const originalLog = console.log
const originalWarn = console.warn
const originalError = console.error

// Intercept console calls to pipe to the log file as well as the console
console.log = (...args) => {
  originalLog.apply(console, args)
  log('INFO', ...args)
}

console.warn = (...args) => {
  originalWarn.apply(console, args)
  log('WARN', ...args)
}

console.error = (...args) => {
  originalError.apply(console, args)
  log('ERROR', ...args)
}

// Uncaught Exceptions/Rejections inside Main Process
process.on('uncaughtException', (err) => {
  log('CRITICAL', 'Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  log('CRITICAL', 'Unhandled Rejection at:', promise, 'reason:', reason)
})

module.exports = {
  log,
  getLogFilePath: () => getLogFilePath() || path.join(process.cwd(), 'app.log')
}
