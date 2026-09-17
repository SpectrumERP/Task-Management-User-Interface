import { useState, useEffect } from 'react';
import { useClipboardStore } from '@/store/useClipboardStore';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Clipboard, Search, Trash2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { MasterDeleteDialog } from '@/components/master/shared/MasterDeleteDialog';
import { useConfirmDelete } from '@/components/master/shared/useConfirmDelete';

export function ClipboardDrawer() {
  const { entries, clearEntries, removeEntry } = useClipboardStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const deleteConfirm = useConfirmDelete('clipboard entry');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle on Cmd/Ctrl + Shift + B
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredEntries = entries.filter(entry => {
    const textToSearch = `${entry.data.name || ''} ${entry.data.company || ''} ${entry.formattedText}`.toLowerCase();
    return textToSearch.includes(searchTerm.toLowerCase());
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="inline-flex gap-2 h-9 px-2.5 sm:px-3" title="Clipboard (Cmd/Ctrl + Shift + B)">
          <Clipboard className="w-4 h-4" />
          <span className="hidden sm:inline text-xs font-medium">Clipboard</span>
          <kbd className="ml-1 hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>⇧B
          </kbd>
        </Button>
      </SheetTrigger> */}
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <Clipboard className="w-5 h-5 text-slate-200" />
            Business Card Clipboard
          </SheetTitle>
          <SheetDescription>
            History of all scanned business cards. You can select text directly from the entries.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search clipboard..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {entries.length > 0 && (
              <ActionTip label="Clear all history">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Clear all history"
                  onClick={() =>
                    deleteConfirm.requestConfirm({
                      entityLabel: 'clipboard history',
                      recordName: `${entries.length} entries`,
                      onConfirm: clearEntries,
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </ActionTip>
            )}
          </div>

          <div className="space-y-4">
            {filteredEntries.length === 0 ? (
              <EmptyState
                icon={Clipboard}
                title={searchTerm.trim() ? 'No results match your search' : 'No clipboard history found'}
                description={
                  searchTerm.trim()
                    ? 'Try a different search term, or clear the search to see all entries.'
                    : 'Scanned business cards will appear here.'
                }
                compact
              />
            ) : (
              filteredEntries.map(entry => (
                <div key={entry.id} className="border rounded-lg p-4 bg-[var(--tm-muted)] relative group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-100">{entry.data.name || 'Unknown Name'}</h4>
                      <p className="text-sm text-slate-500">{entry.data.company || entry.data.designation}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-xs text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </span>
                      <ActionTip label="Delete entry">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete entry"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          onClick={() =>
                            deleteConfirm.requestConfirm({
                              entityLabel: 'clipboard entry',
                              recordName: entry.data.name || entry.data.company || 'Entry',
                              onConfirm: () => removeEntry(entry.id),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                        </Button>
                      </ActionTip>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    className="w-full h-32 text-xs p-2 rounded border border-[var(--tm-border)] bg-[var(--tm-surface)] font-mono mt-2 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300"
                    value={entry.formattedText}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <MasterDeleteDialog
          open={deleteConfirm.open}
          onOpenChange={deleteConfirm.onOpenChange}
          onConfirm={deleteConfirm.handleConfirm}
          recordName={deleteConfirm.recordName}
          entityLabel={deleteConfirm.entityLabel}
          confirming={deleteConfirm.confirming}
        />
      </SheetContent>
    </Sheet>
  );
}
