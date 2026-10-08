import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const generateVersionFile = (): Plugin => {
  let outDir = path.resolve(import.meta.dirname, 'dist');
  return {
    name: 'generate-version-file',
    configResolved(config) {
      // Honour --outDir (e.g. when the CRM builds this app into its own dist/task).
      outDir = path.resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      const version = new Date().getTime();
      const dir = outDir;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(path.resolve(dir, 'version.json'), JSON.stringify({ version }));
    }
  }
}

/** Stub Node built-ins that @techstark/opencv-js references but never uses in the browser. */
const opencvNodeStubs = (): Plugin => {
  const stubIds = new Set(['fs', 'path', 'crypto']);
  return {
    name: 'opencv-node-stubs',
    enforce: 'pre',
    resolveId(source, importer) {
      if (stubIds.has(source) && importer?.includes('@techstark/opencv-js')) {
        return `\0opencv-stub:${source}`;
      }
    },
    load(id) {
      if (id.startsWith('\0opencv-stub:')) {
        return 'export default {};';
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      generateVersionFile(),
      opencvNodeStubs(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL,
          changeOrigin: true,
        },
      },
    },
    build: {
      // OpenCV alone is ~10MB and is lazy-loaded via CameraComp
      chunkSizeWarningLimit: 11000,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'opencv',
                test: /node_modules[\\/]@techstark[\\/]opencv-js/,
              },
              {
                name: 'tesseract',
                test: /node_modules[\\/]tesseract\.js/,
              },
              {
                name: 'xlsx',
                test: /node_modules[\\/]xlsx/,
              },
            ],
          },
        },
      },
    },
  }
})
