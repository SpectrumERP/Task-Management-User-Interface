const prerendered = new Set<string>();

/**
 * Warm the other same-origin app (the Spectrum CRM) before the user clicks into it: Chromium
 * prerenders it in the background (Speculation Rules), other browsers just prefetch the document.
 * The switch then opens already painted — no blank page or loader jump.
 */
export function prerenderApp(url: string) {
  if (prerendered.has(url) || typeof document === 'undefined') return;
  prerendered.add(url);
  if (HTMLScriptElement.supports?.('speculationrules')) {
    const rules = document.createElement('script');
    rules.type = 'speculationrules';
    rules.textContent = JSON.stringify({ prerender: [{ urls: [url], eagerness: 'immediate' }] });
    document.head.appendChild(rules);
    return;
  }
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}
