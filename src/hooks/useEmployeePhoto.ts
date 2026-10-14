import { useEffect, useState } from 'react';
import { API_BASE_URL } from '@/services/apiService';
import { dbService } from '@/services/dbService';

/** One request per photo path for the whole session (table, drawer and profile share it). */
const photoCache = new Map<string, Promise<string | null>>();

function loadServerPhoto(path: string): Promise<string | null> {
  let pending = photoCache.get(path);
  if (!pending) {
    pending = (async () => {
      try {
        const token = await dbService.getItem<string>('auth_token');
        const response = await fetch(`${API_BASE_URL}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) return null;
        const blob = await response.blob();
        // An HTML / JSON error body is not a photo.
        if (blob.type && !blob.type.startsWith('image/')) return null;
        return URL.createObjectURL(blob);
      } catch {
        return null;
      }
    })();
    photoCache.set(path, pending);
  }
  return pending;
}

/**
 * Displayable src for an employee photo, or null (show initials).
 * URLs and data URIs pass straight through; server paths ('/…') are fetched with the sign-in token,
 * since a protected file cannot be loaded by a plain <img src>.
 */
export function useEmployeePhoto(photoUrl: string): string | null {
  const isServerPath = photoUrl.startsWith('/');
  const [loaded, setLoaded] = useState<{ path: string; src: string | null } | null>(null);

  useEffect(() => {
    if (!isServerPath) return;
    let cancelled = false;
    void loadServerPhoto(photoUrl).then((src) => {
      if (!cancelled) setLoaded({ path: photoUrl, src });
    });
    return () => {
      cancelled = true;
    };
  }, [photoUrl, isServerPath]);

  if (!photoUrl) return null;
  if (!isServerPath) return photoUrl;
  return loaded?.path === photoUrl ? loaded.src : null;
}
