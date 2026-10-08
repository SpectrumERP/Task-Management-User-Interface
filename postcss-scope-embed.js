/**
 * Inside the Spectrum ERP shell (vite --mode spectrum sets TASK_EMBED) this app's CSS stays on the page
 * after it is first opened, next to the CRM and the shell. Its global rules (`html:not(.dark) aside`,
 * `header`, `input`, …) would restyle them, so every selector is scoped to `body.task-app`, the class
 * src/SpectrumApp.tsx puts on <body> while this app is shown.
 *
 * `html…` / `:root` / `.dark` stay first (theme switches live on <html>); keyframes are left alone.
 */
const SCOPE = 'body.task-app';
const scoped = Symbol('task-app-scoped');

/** Leading <html>-level part: `html`, `:root` or `.dark`, with its own classes / attributes / :not(). */
const HTML_LEVEL = /^((?::root|html|\.dark)(?:\.[\w-]+|\[[^\]]*\]|:not\([^)]*\))*)(.*)$/s;

function scopeSelector(selector) {
  const sel = selector.trim();
  if (sel.includes('.task-app')) return sel;
  const html = sel.match(HTML_LEVEL);
  if (html) {
    const rest = html[2].trim();
    // `:root { --vars }`, `html.dark { … }`: the <html> element itself.
    if (!rest) return sel;
    if (/^body(?![\w-])/.test(rest)) return `${html[1]} ${rest.replace(/^body/, SCOPE)}`;
    return `${html[1]} ${SCOPE} ${rest}`;
  }
  if (/^body(?![\w-])/.test(sel)) return sel.replace(/^body/, SCOPE);
  return `${SCOPE} ${sel}`;
}

export default function scopeToTaskApp() {
  return {
    postcssPlugin: 'scope-to-task-app',
    Rule(rule) {
      if (rule[scoped]) return;
      rule[scoped] = true;
      for (let parent = rule.parent; parent; parent = parent.parent) {
        if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return;
      }
      rule.selectors = rule.selectors.map(scopeSelector);
    },
  };
}
scopeToTaskApp.postcss = true;
