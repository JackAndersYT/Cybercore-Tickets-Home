import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss' // Importa el plugin

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: { // Añade esta sección
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  server: {
    host: true, 
  },
})