import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Base public path when served from GitHub Pages under a repo path
  base: '/BattleReadyShelf/',
  plugins: [react()],
})
