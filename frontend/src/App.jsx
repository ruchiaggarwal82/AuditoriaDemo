import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Discover from './pages/Discover'
import SetupFlow from './pages/Setup/SetupFlow'
import Monitor from './pages/Monitor'
import Dashboard from './pages/Dashboard'
import AuditTrail from './pages/AuditTrail'

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/setup/*" element={<SetupFlow />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/audit" element={<AuditTrail />} />
        </Routes>
      </main>
    </div>
  )
}
