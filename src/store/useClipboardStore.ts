import { create } from 'zustand';


export interface ClipboardEntryData {
  name?: string;
  designation?: string;
  company?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}

export interface ClipboardEntry {
  id: string;
  timestamp: string; // ISO String
  source: "BusinessCard";
  cardImage?: string;
  data: ClipboardEntryData;
  formattedText: string;
}

interface ClipboardStoreState {
  entries: ClipboardEntry[];
  addEntry: (entry: Omit<ClipboardEntry, 'id' | 'timestamp'>) => void;
  removeEntry: (id: string) => void;
  clearEntries: () => void;
}

export const useClipboardStore = create<ClipboardStoreState>()(
  (set) => ({
      entries: [],
      addEntry: (entry) => set((state) => {
        const newEntry: ClipboardEntry = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        // Keep the last 50 entries to prevent local storage bloat
        const updatedEntries = [newEntry, ...state.entries].slice(0, 50);
        return { entries: updatedEntries };
      }),
      removeEntry: (id) => set((state) => ({
        entries: state.entries.filter((entry) => entry.id !== id),
      })),
      clearEntries: () => set({ entries: [] }),
  })
);
