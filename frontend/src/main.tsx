import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initSentry } from './lib/sentry'
import './styles/index.css'
import './styles/global.css'

// Before anything renders, so errors during the first paint are captured too.
// No-ops when VITE_SENTRY_DSN is unset.
initSentry()

// Ensure the root element has proper styles
const rootElement = document.getElementById('root')
if (rootElement) {
  rootElement.style.backgroundColor = '#0a0a0b' // neutral-950 (DESIGN_SYSTEM.md surface.DEFAULT)
  rootElement.style.color = '#fafafa'
  rootElement.style.minHeight = '100vh'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
