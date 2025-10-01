import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AuthScreen } from './components/AuthScreen'
import PlayjobBuilder from './components/playjob_Builder'
import LoginPage from './pages/auth/LoginPage'
import InviteRoute from './pages/invite/InviteRoute'
import AuthDebugPage from './pages/auth/AuthDebugPage'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#87CEEB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '20px'
      }}>
        🎮 Загрузка PlayJob...
      </div>
    )
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/debug" element={<AuthDebugPage />} />
          <Route path="/invite/:token" element={<InviteRoute />} />
          <Route path="*" element={<AuthScreen />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
        <Routes>
          <Route path="/auth/debug" element={<AuthDebugPage />} />
          <Route path="/auth/login" element={<Navigate to="/" replace />} />
          <Route path="/invite/:token" element={<InviteRoute />} />
          <Route path="/*" element={<PlayjobBuilder />} />
        </Routes>
    </BrowserRouter>
  )
}

export default App