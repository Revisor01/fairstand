import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { registerSyncTriggers } from './sync/triggers.js'

// Sync-Engine initialisieren — bevor React gerendert wird
// Registriert online + visibilitychange Event-Listener (iOS-kompatibel)
registerSyncTriggers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
