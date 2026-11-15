
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

/* =========================================================
   APP SPLASH SCREEN
========================================================= */

document.body.insertAdjacentHTML(
  'afterbegin',
  `
    <div id="app-splash">
      <div class="app-splash-glow"></div>

      <div class="app-splash-content">
        <div class="app-splash-logo-wrapper">
          <img
            src="/logo.png"
            alt="Bot WhatsApp SaaS"
            class="app-splash-logo"
          />
        </div>

        <div class="app-splash-brand">
          <h1>Bot WhatsApp SaaS</h1>
          <p>Automação inteligente para o seu negócio</p>
        </div>

        <div class="app-splash-loader">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  `,
)

/* =========================================================
   REACT APP
========================================================= */

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/* =========================================================
   REMOVE SPLASH
========================================================= */

const splash = document.getElementById('app-splash')

setTimeout(() => {
  splash?.classList.add('app-splash-hidden')

  setTimeout(() => {
    splash?.remove()
  }, 500)
}, 1200)
