/* App entry: mounts React root, wraps with AuthProvider, and imports global CSS (Tailwind + base styles) */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import App from './App.tsx'
import { AuthProvider } from '../features/auth/AuthContext'
import { UserTimeZoneProvider } from '../features/settings/UserTimeZoneProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <UserTimeZoneProvider>
        <App />
      </UserTimeZoneProvider>
    </AuthProvider>
  </StrictMode>,
)
