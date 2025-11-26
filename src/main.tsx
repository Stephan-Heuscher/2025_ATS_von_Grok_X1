import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

// Best-effort global handlers so runtime exceptions are visible to users
function installGlobalErrorOverlay() {
  if (typeof window === 'undefined') return
  const show = (title: string, message: string, stack?: string) => {
    try {
      // remove previous overlay
      const prev = document.getElementById('app-error-overlay')
      prev && prev.remove()
      const el = document.createElement('div')
      el.id = 'app-error-overlay'
      el.style.position = 'fixed'
      el.style.left = '0'
      el.style.top = '0'
      el.style.right = '0'
      el.style.bottom = '0'
      el.style.zIndex = '999999'
      el.style.background = 'rgba(255,255,255,0.95)'
      el.style.color = '#7f1d1d'
      el.style.fontFamily = 'monospace'
      el.style.padding = '20px'
      el.style.overflow = 'auto'
      el.innerHTML = `<h2 style="font-size:18px;margin:0 0 8px 0;">${title}</h2><div style="font-size:13px;">${message}</div><pre style="font-size:11px;margin-top:12px;white-space:pre-wrap;">${stack||''}</pre>`
      document.body.appendChild(el)
    } catch (e) {
      // ignore overlay errors
    }
  }

  window.addEventListener('error', (e) => {
    try {
      const err = e.error || { message: e.message }
      console.error('Global error', err)
      show('Unexpected error', String(err.message || err || 'unknown'), String(err.stack || ''))
    } catch {}
  })
  window.addEventListener('unhandledrejection', (e) => {
    try {
      const reason = (e && (e as any).reason) || e
      console.error('Unhandled promise rejection', reason)
      show('Unhandled promise rejection', String((reason && (reason.message || reason)) || reason))
    } catch {}
  })
}

installGlobalErrorOverlay()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)