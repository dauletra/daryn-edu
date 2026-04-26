import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

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

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // After a deploy, old clients reference hashed chunk names that no
    // longer exist on the CDN. Auto-reload once to pick up the new index.html.
    if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, '1')
      window.location.reload()
      return
    }
    console.error('ErrorBoundary caught:', error, info)
  }

  handleReload = () => {
    sessionStorage.removeItem(RELOAD_FLAG)
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-xl shadow p-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Қате орын алды</h1>
          <p className="text-sm text-gray-600 mb-4">
            Парақты қайта жүктеп көріңіз. Қате қайталанса, әкімшіге хабарласыңыз.
          </p>
          <button
            onClick={this.handleReload}
            className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
          >
            Қайта жүктеу
          </button>
        </div>
      </div>
    )
  }
}
