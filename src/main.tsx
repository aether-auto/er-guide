import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts (bundled by Vite — no runtime requests leave the site).
// Cinzel (engraved caps) for display; Spectral (literary serif) for body.
import '@fontsource-variable/cinzel'
import '@fontsource/spectral/400.css'
import '@fontsource/spectral/400-italic.css'
import '@fontsource/spectral/500.css'
import '@fontsource/spectral/600.css'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
