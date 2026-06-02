import { useState, useEffect, useRef } from 'react';

export interface DraftData {
  lastModified: number;
  data: any;
}

export const useFormDraft = (taskId: string | number | null) => {
  const [hasDraft, setHasDraft] = useState(false);
  const [hasExistingDraft, setHasExistingDraft] = useState(false);
  const draftKey = `draft_task_${taskId || 'new'}`;
  
  // Use a ref to track if we're currently loading a draft to prevent auto-saving it immediately
  const isRestoringRef = useRef(false);
  const initialCheckDone = useRef(false);

  useEffect(() => {
    const checkDraft = () => {
      try {
        const item = localStorage.getItem(draftKey);
        if (item) {
          setHasDraft(true);
          if (!initialCheckDone.current) {
            setHasExistingDraft(true);
          }
        } else {
          setHasDraft(false);
        }
        initialCheckDone.current = true;
      } catch (e) {
        console.error("Error reading draft", e);
      }
    };

    checkDraft();

    // Listen for storage events in case another tab modifies this draft
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === draftKey) {
        checkDraft();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [draftKey]);

  const saveDraft = (data: any) => {
    if (isRestoringRef.current) return; // Prevent saving while restoring
    
    try {
      // Exclude attachments as File objects cannot be serialized properly
      const { attachments, ...safeData } = data;
      
      const draftData: DraftData = {
        lastModified: Date.now(),
        data: safeData
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
      
      if (!hasDraft) {
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Failed to save draft', error);
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setHasExistingDraft(false);
    } catch (error) {
      console.error('Failed to clear draft', error);
    }
  };

  const getDraft = (): any | null => {
    try {
      const item = localStorage.getItem(draftKey);
      if (item) {
        const parsed: DraftData = JSON.parse(item);
        return parsed.data;
      }
    } catch (error) {
      console.error('Failed to get draft', error);
    }
    return null;
  };

  return {
    hasDraft,
    hasExistingDraft,
    saveDraft,
    clearDraft,
    getDraft,
    isRestoringRef
  };
};
