import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'

function App() {
  const { user } = useAuth()

  // Siempre mostrar login si no hay usuario autenticado
  if (!user) {
    return <LoginForm />
  }

  // Solo mostrar el dashboard si el usuario está autenticado
  return <Dashboard />
}

export default App
