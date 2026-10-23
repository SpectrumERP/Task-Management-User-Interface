/**
 * Prints a complete HTML document through a hidden iframe, so the page prints with its own styles
 * (paper colours, page margins, page numbers) instead of the app's screen layout and theme.
 * Resolves once the print dialog has been handed the document.
 */
export async function printHtml(html: string): Promise<void> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  // Off-screen but laid out: a display:none frame prints blank in some browsers.
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(frame);

  const win = frame.contentWindow;
  const doc = frame.contentDocument;
  if (!win || !doc) {
    frame.remove();
    throw new Error('Printing is not available in this browser.');
  }

  doc.open();
  doc.write(html);
  doc.close();

  // Wait for web fonts so the first page doesn't print in a fallback font.
  await (doc.fonts?.ready ?? Promise.resolve()).catch(() => undefined);

  const cleanup = () => window.setTimeout(() => frame.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  // Safari and some mobile browsers never fire afterprint: remove the frame after a while anyway.
  window.setTimeout(() => frame.isConnected && frame.remove(), 60_000);

  win.focus();
  win.print();
}

/** Escapes text for use inside HTML built by hand (titles, attributes). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
