import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { requestPersistentStorage } from './data/localBuildRepository'
import './ui/theme/global.css'
import App from './ui/App.tsx'

// Évite que le navigateur efface les builds du joueur en cas de manque de place.
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
