import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: el build funciona en cualquier subcarpeta o hosting estático
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', assetsInlineLimit: 0, cssCodeSplit: false },
})
