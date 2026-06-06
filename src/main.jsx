import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@fontsource/outfit/300.css'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/600.css'
import '@fontsource/outfit/700.css'
import './index.css'
import { DialogProvider } from './context/DialogContext'
import { CacheProvider } from './context/CacheContext'

// Global error & warning logging redirection
if (window.api && window.api.logRendererEvent) {
  window.onerror = function (message, source, lineno, colno, error) {
    window.api.logRendererEvent('error', `Uncaught Exception: ${message} at ${source}:${lineno}:${colno}\nStack: ${error ? error.stack : 'N/A'}`);
  };

  window.addEventListener('unhandledrejection', function (event) {
    window.api.logRendererEvent('error', `Unhandled Promise Rejection: ${event.reason}`);
  });

  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError.apply(console, args);
    const msg = args.map(arg => {
      if (arg instanceof Error) return arg.stack || arg.message;
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg); } catch(e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');
    window.api.logRendererEvent('error', `console.error: ${msg}`);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    originalConsoleWarn.apply(console, args);
    const msg = args.map(arg => String(arg)).join(' ');
    window.api.logRendererEvent('warn', `console.warn: ${msg}`);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DialogProvider>
      <CacheProvider>
        <App />
      </CacheProvider>
    </DialogProvider>
  </React.StrictMode>
)