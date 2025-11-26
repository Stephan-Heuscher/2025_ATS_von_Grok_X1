import { useEffect, useState } from 'react'

const HealthPage = () => {
  const [health, setHealth] = useState<{ status?: string; time?: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(err => setError(String(err)))
  }, [])

  const buildSha = import.meta.env.VITE_BUILD_SHA ?? 'local'
  const buildTime = import.meta.env.VITE_BUILD_TIME ?? null
  const version = (import.meta as any).env?.VITE_APP_VERSION ?? null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Health & Build Info</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Status of the API and build metadata</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold mb-2">API Health</h2>
        {error ? (
          <div className="text-red-600 dark:text-red-400">Error fetching health: {error}</div>
        ) : health ? (
          <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
            <div>Status: <strong className="ml-2">{health.status}</strong></div>
            <div>Time: <strong className="ml-2">{health.time ?? '—'}</strong></div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Loading…</div>
        )}

        <div className="mt-4 border-t pt-4 text-sm text-slate-500 dark:text-slate-400">
          <div>
            <strong>Frontend build SHA:</strong> <span className="ml-2 font-mono text-xs">{String(buildSha).slice(0,8)}</span>
          </div>
          {buildTime && <div><strong>Build time:</strong> <span className="ml-2">{buildTime}</span></div>}
          {version && <div><strong>App version:</strong> <span className="ml-2">{version}</span></div>}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
        <p>This page is useful for CI smoke checks and for quickly validating a preview deployment. The API health endpoint is at <code>/api/health</code>.</p>
      </div>
    </div>
  )
}

export default HealthPage
