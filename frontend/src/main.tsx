import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import './styles/global.css'

// Ensure the root element has proper styles
const rootElement = document.getElementById('root')
if (rootElement) {
  rootElement.style.backgroundColor = '#0f172a'
  rootElement.style.color = 'white'
  rootElement.style.minHeight = '100vh'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
