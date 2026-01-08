import { useEffect } from 'react'

export function useAppScripts() {
  useEffect(() => {
    // Cargar scripts de la aplicación original después del login
    const loadScript = (src: string, type: string = 'text/javascript') => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.type = type
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })
    }

    const loadScripts = async () => {
      try {
        // Cargar D3.js
        await loadScript('https://d3js.org/d3.v7.min.js')
        
        // Cargar Chart.js y dependencias
        await loadScript('https://cdn.jsdelivr.net/npm/chart.js')
        await loadScript('https://cdn.jsdelivr.net/npm/luxon@2.0.2/build/global/luxon.min.js')
        await loadScript('https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon@1.1.0/dist/chartjs-adapter-luxon.min.js')
        await loadScript('https://cdn.jsdelivr.net/npm/chartjs-chart-financial@0.1.1/dist/chartjs-chart-financial.min.js')
        
        // Cargar scripts de la aplicación
        await loadScript('/src/spaceman-app.js', 'module')
        await loadScript('/src/mini-chart.js', 'module')
        await loadScript('/src/script.js', 'module')
        
        console.log('Todos los scripts cargados correctamente')
      } catch (error) {
        console.error('Error cargando scripts:', error)
      }
    }

    loadScripts()

    // Cleanup function para remover scripts si es necesario
    return () => {
      // Opcional: remover scripts al desmontar el componente
    }
  }, [])
}