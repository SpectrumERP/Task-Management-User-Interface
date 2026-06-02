import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const generateVersionFile = () => {
  return {
    name: 'generate-version-file',
    writeBundle() {
      const version = new Date().getTime();
      const dir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.resolve(dir, 'version.json'), JSON.stringify({ version }));
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    generateVersionFile()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
