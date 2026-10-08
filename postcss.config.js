import scopeToTaskApp from './postcss-scope-embed.js'

// Inside the Spectrum ERP shell (TASK_EMBED, set by vite --mode spectrum) every rule is scoped to
// body.task-app, so this app's styles never restyle the shell or the CRM.
const embedded = process.env.TASK_EMBED === '1'

export default {
  plugins: [
    (await import('tailwindcss')).default,
    (await import('autoprefixer')).default,
    ...(embedded ? [scopeToTaskApp()] : []),
  ],
}
