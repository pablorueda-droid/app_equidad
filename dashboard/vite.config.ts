import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: el build funciona servido desde cualquier subruta (p. ej. /equidad/ en la web)
export default defineConfig({
  base: './',
  plugins: [react()],
})
