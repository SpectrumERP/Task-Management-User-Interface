import { useEffect, useState, useSyncExternalStore } from 'react';
import { attachmentService } from '@/services/attachmentService';

export interface AttachmentImageEntry {
  status: 'idle' | 'loading' | 'loaded' | 'error';
  dataUrl?: string;
}

const BATCH_DELAY_MS = 150;
const VISIBILITY_THRESHOLD = 0.5;
const IDLE_ENTRY: AttachmentImageEntry = { status: 'idle' };

/** The API may return either a bare base64 string or an already-prefixed data URI — handle both. */
function toDataUrl(found: { contentType: string; imageBase64: string }): string {
  const raw = found.imageBase64 || '';
  if (raw.startsWith('data:')) return raw;
  return `data:${found.contentType || 'image/png'};base64,${raw}`;
}

/**
 * Lazy-loads attachment preview images: watches cards via a shared IntersectionObserver,
 * and once a card crosses >50% visible, batches its docNo into a single
 * POST /api/document-attachments/images call (debounced so multiple cards scrolling
 * into view together share one request). Already-resolved docNos are never re-requested.
 */
export class AttachmentImageBatchStore {
  private cache = new Map<number, AttachmentImageEntry>();
  private listeners = new Map<number, Set<() => void>>();
  private pendingIds = new Set<number>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private activeController: AbortController | null = null;
  private elementToDocNo = new WeakMap<Element, number>();
  private docNoToElement = new Map<number, Element>();
  private observer: IntersectionObserver;

  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio <= VISIBILITY_THRESHOLD) return;
          const docNo = this.elementToDocNo.get(entry.target);
          if (docNo === undefined) return;
          this.observer.unobserve(entry.target);
          this.docNoToElement.delete(docNo);
          this.requestImage(docNo);
        });
      },
      { threshold: [0, VISIBILITY_THRESHOLD, 1] }
    );
  }

  registerElement = (el: Element | null, docNo: number): void => {
    const prevEl = this.docNoToElement.get(docNo);
    if (prevEl && prevEl !== el) {
      this.observer.unobserve(prevEl);
      this.docNoToElement.delete(docNo);
    }
    if (!el) return;

    const existing = this.cache.get(docNo);
    if (existing && existing.status !== 'idle') return;

    this.docNoToElement.set(docNo, el);
    this.elementToDocNo.set(el, docNo);
    this.observer.observe(el);
  };

  getSnapshot = (docNo: number): AttachmentImageEntry => this.cache.get(docNo) ?? IDLE_ENTRY;

  subscribe = (docNo: number, callback: () => void): (() => void) => {
    let set = this.listeners.get(docNo);
    if (!set) {
      set = new Set();
      this.listeners.set(docNo, set);
    }
    set.add(callback);
    return () => {
      set?.delete(callback);
      if (set && set.size === 0) this.listeners.delete(docNo);
    };
  };

  private notify(docNo: number) {
    this.listeners.get(docNo)?.forEach((cb) => cb());
  }

  private requestImage(docNo: number) {
    const existing = this.cache.get(docNo);
    if (existing && existing.status !== 'idle') return;

    this.cache.set(docNo, { status: 'loading' });
    this.notify(docNo);
    this.pendingIds.add(docNo);

    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => void this.flush(), BATCH_DELAY_MS);
  }

  private async flush() {
    this.flushTimer = null;
    if (this.pendingIds.size === 0) return;

    const ids = Array.from(this.pendingIds);
    this.pendingIds.clear();

    const controller = new AbortController();
    this.activeController = controller;

    try {
      const results = await attachmentService.getAttachmentImages(ids, controller.signal);
      ids.forEach((id) => {
        const found = results.get(id);
        this.cache.set(id, found?.imageBase64 ? { status: 'loaded', dataUrl: toDataUrl(found) } : { status: 'error' });
        this.notify(id);
      });
    } catch {
      if (controller.signal.aborted) {
        // Aborted (form navigated away) — reset so a future visit can retry.
        ids.forEach((id) => {
          this.cache.delete(id);
          this.notify(id);
        });
        return;
      }
      ids.forEach((id) => {
        this.cache.set(id, { status: 'error' });
        this.notify(id);
      });
    } finally {
      if (this.activeController === controller) this.activeController = null;
    }
  }

  destroy(): void {
    this.observer.disconnect();
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.pendingIds.clear();
    this.activeController?.abort();
    this.activeController = null;
  }
}

/** One store per mounted form; aborts any in-flight batch and disconnects the observer on unmount. */
export function useAttachmentImageBatchStore(): AttachmentImageBatchStore {
  const [store] = useState(() => new AttachmentImageBatchStore());

  useEffect(() => () => store.destroy(), [store]);

  return store;
}

export function useAttachmentImageEntry(store: AttachmentImageBatchStore, docNo: number): AttachmentImageEntry {
  return useSyncExternalStore(
    (callback) => store.subscribe(docNo, callback),
    () => store.getSnapshot(docNo)
  );
}
