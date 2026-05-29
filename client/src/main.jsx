import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/base.css'
import { applyAccessibilityMode, applyTheme, getStoredAccessibilityMode, getStoredTheme } from './utils/theme'

applyTheme(getStoredTheme())
applyAccessibilityMode(getStoredAccessibilityMode())

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
