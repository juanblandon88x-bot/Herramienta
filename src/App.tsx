import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/LoginForm'
import { Dashboard } from './components/Dashboard'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return user ? <Dashboard /> : <LoginForm />
}

export default App
