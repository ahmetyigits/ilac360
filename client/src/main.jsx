import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initTelemetry } from './data/telemetry.js'

initTelemetry()

// PWA otomatik-reload: yeni service worker (skipWaiting + clientsClaim) devralınca
// 'controllerchange' tetiklenir. registerSW.js sayfayı kendiliğinden tazelemediği
// için, güncelleme geldiğinde eski/önbelleklenmiş içerikte takılı kalmasın diye
// sayfayı BİR KEZ yeniliyoruz. İlk kurulumda (sayfa daha önce kontrolsüzken)
// reload ETMEYİZ — yalnız halihazırda bir SW kontrol ediyorken (=güncelleme).
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading || !hadController) return
    reloading = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
