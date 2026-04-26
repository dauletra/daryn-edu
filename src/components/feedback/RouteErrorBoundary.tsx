import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'

const RELOAD_FLAG = 'chunk-reload-attempted'

function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message || ''
  const name = error.name || ''
  return (
    name === 'ChunkLoadError' ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module')
  )
}

export function RouteErrorBoundary() {
  const error = useRouteError()

  useEffect(() => {
    // After a deploy, old clients reference hashed chunk names that no
    // longer exist on the CDN. Auto-reload once to pick up the new index.html.
    if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1')
      window.location.reload()
    }
  }, [error])

  if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
    return null
  }

  console.error('Route error:', error)

  const handleReload = () => {
    sessionStorage.removeItem(RELOAD_FLAG)
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Қате орын алды</h1>
        <p className="text-sm text-gray-600 mb-4">
          Парақты қайта жүктеп көріңіз. Қате қайталанса, әкімшіге хабарласыңыз.
        </p>
        <button
          onClick={handleReload}
          className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
        >
          Қайта жүктеу
        </button>
      </div>
    </div>
  )
}
