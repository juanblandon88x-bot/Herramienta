import { useAuth } from '../hooks/useAuth'
import { useAppScripts } from '../hooks/useAppScripts'

export function Dashboard() {
  const { user, signOut } = useAuth()
  
  // Cargar scripts de la aplicación original
  useAppScripts()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <>
      {/* Barra de navegación con logout */}
      <nav style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000, 
        background: 'rgba(0, 0, 0, 0.9)', 
        padding: '10px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <span style={{ color: 'white', fontSize: '14px' }}>
          Usuario: {user?.email}
        </span>
        <button
          onClick={handleSignOut}
          style={{
            background: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Cerrar sesión
        </button>
      </nav>

      {/* Contenido de la aplicación original */}
      <div style={{ paddingTop: '50px' }}>
        {/* Welcome Screen */}
        <div id="welcome-screen" className="app-screen">
          <div className="card welcome-card">
            <h2 className="welcome-title">Herramienta En Prueba</h2>
            <p className="selection-subtitle" style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center', color: 'var(--text-color-secondary)' }}>
              Selecciona el juego
            </p>
            <div className="game-selector-grid">
              <button className="game-button" data-game="aviator">
                <span className="game-icon">✈️</span>
                <span className="game-name">Aviator</span>
              </button>
              <button className="game-button" data-game="spaceman">
                <span className="game-icon">🚀</span>
                <span className="game-name">Spaceman</span>
              </button>
            </div>
            <div className="welcome-buttons">
              <button id="welcome-continue" className="action-button" disabled>
                Continuar
              </button>
              <button id="welcome-manual" className="action-button secondary">
                📖 Manual de Uso
              </button>
            </div>
          </div>
        </div>

        {/* Resto del contenido de la aplicación se cargará dinámicamente */}
        <div id="app-content" className="hidden">
          {/* El contenido principal de la aplicación se renderizará aquí */}
        </div>

        <div id="spaceman-app-content" className="hidden">
          {/* El contenido de Spaceman se renderizará aquí */}
        </div>
      </div>
    </>
  )
}