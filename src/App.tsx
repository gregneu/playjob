import { useAuth } from './hooks/useAuth'
import { AuthScreen } from './components/AuthScreen'
import PlayjobBuilder from './components/playjob_Builder'

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
    return <AuthScreen />
  }

  return <PlayjobBuilder />
}

export default App