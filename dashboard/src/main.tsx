import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Verify color contrast in development mode (Requirement 16.3)
if (import.meta.env.DEV) {
  import('./utils/colorContrast').then(({ logColorContrastResults }) => {
    logColorContrastResults();
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
