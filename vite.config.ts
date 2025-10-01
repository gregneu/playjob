import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    fs: {
      // Restrict Vite from crawling demo folders that reference missing assets
      deny: ['FluffyGrass', 'FluffyGrass-main', 'three-grass-demo-main']
    }
  }
})