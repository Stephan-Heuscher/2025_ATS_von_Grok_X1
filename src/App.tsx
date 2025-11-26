import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { IssuesProvider } from './context/IssuesContext'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import IssuesListPage from './pages/IssuesListPage'
import CreateIssuePage from './pages/CreateIssuePage'
import SettingsPage from './pages/SettingsPage'
import HealthPage from './pages/HealthPage'

function App() {
  return (
    <BrowserRouter>
      <IssuesProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/issues" element={<IssuesListPage />} />
            <Route path="/create" element={<CreateIssuePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </Layout>
      </IssuesProvider>
    </BrowserRouter>
  )
}

export default App