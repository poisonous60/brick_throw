import { useEffect } from 'react'
import { GameCanvas } from './game/GameCanvas'
import { getDebugSnapshot } from './lib/debugState'

declare global {
  interface Window {
    render_game_to_text?: () => string
  }
}

function App() {
  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify(getDebugSnapshot())

    return () => {
      delete window.render_game_to_text
    }
  }, [])

  return <GameCanvas />
}

export default App
