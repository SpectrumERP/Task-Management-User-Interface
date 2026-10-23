import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { federation } from '@module-federation/vite'
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

/**
 * `vite --mode spectrum` (npm run dev:spectrum / build:spectrum): this app as a Module Federation remote
 * of the Spectrum ERP shell (SpectrumERP-Web), mounted at /task. The shell signs the user in and writes
 * the CRM auth cookie that src/lib/crmSso.ts reads.
 */
const SPECTRUM_MODE = 'spectrum';

/**
 * As a remote this server only feeds the shell. A page opened on it directly goes to the same page in the
 * shell, which has the one Spectrum ERP login. Module requests (Accept without text/html) pass through.
 */
function redirectPagesToShell(routeBase: string, shellUrl: string): Plugin {
  return {
    name: 'redirect-pages-to-spectrum-shell',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' || !req.headers.accept?.includes('text/html')) return next();
        res.writeHead(302, { Location: `${shellUrl}${routeBase}${req.url === '/' ? '/' : req.url}` });
        res.end();
      });
    },
  };
}

function spectrumFederation(): Plugin[] {
  return federation({
    name: 'task',
    filename: 'remoteEntry.js',
    exposes: { './App': './src/SpectrumApp.tsx' },
    // One React with the shell. React Router stays this app's own copy: it runs its own data router,
    // which cannot sit inside the shell's router.
    shared: {
      react: { singleton: true },
      'react-dom': { singleton: true },
      'react/jsx-runtime': { singleton: true },
      'react/jsx-dev-runtime': { singleton: true },
    },
    dts: false,
  }) as Plugin[];
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const spectrum = mode === SPECTRUM_MODE;
  const env = loadEnv(mode, process.cwd(), '');
  const taskPort = Number(env.TASK_PORT || 5175);
  const host = env.DEV_SERVER_HOST || true;
  const shellUrl = (env.SPECTRUM_SHELL_URL || `http://${env.REMOTE_DEV_HOST || 'localhost'}:${env.ERP_PORT || 5173}`).replace(/\/+$/, '');
  if (spectrum) {
    // Routes under the shell's /task, sign-in through the shell (src/lib/basePath.ts, crmSso.ts).
    process.env.VITE_TASK_ROUTE_BASE ??= '/task';
    process.env.VITE_CRM_SSO ??= 'true';
    // tailwind.config.js: scope utilities to the app so Tailwind 3 never restyles the shell.
    process.env.TASK_EMBED = '1';
  }
  // Assets must load from this server when the shell, on another origin, imports the remote.
  const spectrumUrl = env.TASK_PUBLIC_URL || `http://${env.REMOTE_DEV_HOST || 'localhost'}:${taskPort}/`;
  const spectrumOrigin = new URL(spectrumUrl).origin;

  return {
    ...(spectrum && { base: spectrumUrl }),
    plugins: [
      react(),
      generateVersionFile(),
      opencvNodeStubs(),
      ...(spectrum ? [redirectPagesToShell(process.env.VITE_TASK_ROUTE_BASE ?? '/task', shellUrl), ...spectrumFederation()] : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: spectrum
      ? { host, port: taskPort, strictPort: true, origin: spectrumOrigin }
      : {
        host,
        port: taskPort,
        strictPort: true,
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
    preview: { host, port: taskPort, strictPort: true },
  }
})
