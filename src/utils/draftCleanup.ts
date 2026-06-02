export const cleanupExpiredDrafts = (daysToKeep = 7) => {
  try {
    const keysToRemove: string[] = [];
    const now = Date.now();
    const expiryTime = daysToKeep * 24 * 60 * 60 * 1000;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('draft_task_')) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            if (parsed.lastModified && (now - parsed.lastModified > expiryTime)) {
              keysToRemove.push(key);
            }
          }
        } catch (e) {
          // If a draft is corrupted, just delete it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Cleaned up expired draft: ${key}`);
    });
  } catch (error) {
    console.error('Failed to run draft cleanup utility', error);
  }
};
