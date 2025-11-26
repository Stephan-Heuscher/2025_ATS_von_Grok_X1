import { useState } from 'react'
import { Settings, Moon, Sun, Bell, Globe } from 'lucide-react'
import { Button } from '../components/ui/button'

const SettingsPage = () => {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)
  const [language, setLanguage] = useState('en')

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg shadow-slate-500/25">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Settings
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Configure your preferences
            </p>
          </div>
        </div>
      </div>

      {/* Settings Cards */}
      <div className="space-y-4">
        {/* Appearance */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-700 dark:text-slate-300">Dark Mode</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Toggle dark theme</p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                darkMode ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  darkMode ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-700 dark:text-slate-300">Enable Notifications</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Receive updates about issues</p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                notifications ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  notifications ? 'translate-x-8' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language
          </h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 px-3 text-sm"
          >
            <option value="en">English</option>
            <option value="de">Deutsch</option>
            <option value="fr">Français</option>
          </select>
        </div>

        {/* About */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            About
          </h2>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <p><strong>Issue Tracker</strong> v1.0.0</p>
            <p>A modern issue tracking application built with React and Tailwind CSS.</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-4">
            Danger Zone
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-700 dark:text-red-400">Clear All Data</p>
              <p className="text-sm text-red-600/70 dark:text-red-400/70">This action cannot be undone</p>
            </div>
            <Button variant="destructive" size="sm">
              Clear Data
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
