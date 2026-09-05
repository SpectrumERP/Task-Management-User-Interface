import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useClipboardStore, ClipboardEntry } from '@/store/useClipboardStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger, ContextMenuSub, ContextMenuSubTrigger, ContextMenuSubContent } from '@/components/ui/context-menu';
import { ClipboardCopy, ChevronDown, Bot, ClipboardPaste, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ClipboardInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onValueChange: (value: string) => void;
  source?: 'ocr' | 'clipboard';
  fieldLabel: string;
}

const ClipboardEntryView = ({ entry, fieldLabel, onHistorySelect }: { entry: ClipboardEntry, fieldLabel: string, onHistorySelect: (text: string | undefined, close: boolean) => void }) => {
  const [selectedLineIndices, setSelectedLineIndices] = useState<Set<number>>(new Set());
  const lines = entry.formattedText.split('\n').map(l => l.trim()).filter(l => l);

  const toggleLine = (index: number) => {
    const newSet = new Set(selectedLineIndices);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedLineIndices(newSet);
    
    if (newSet.size > 0) {
      const selectedText = Array.from(newSet).sort((a,b) => a-b).map(i => lines[i]).join(', ');
      onHistorySelect(selectedText, false);
    }
  };

  return (
    <div className="p-3 border-b last:border-b-0 hover:bg-[var(--tm-muted)] transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-medium text-slate-100 truncate max-w-[180px]">
          {entry.data.name || 'Unknown Name'}
        </span>
        <span className="text-[10px] text-slate-400 flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
        </span>
      </div>
      <div
        className="w-full text-[10px] rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] font-mono mb-2"
      >
        {lines.map((line, idx) => {
           const isSelected = selectedLineIndices.has(idx);
           return (
             <button
               key={idx} 
               type="button"
               onClick={() => toggleLine(idx)}
               className={cn(
                 "w-full text-left p-1.5 border-b last:border-b-0 cursor-pointer hover:bg-[var(--tm-muted)] transition-colors break-words whitespace-pre-wrap select-none focus:outline-none focus:bg-[var(--tm-muted)]",
                 isSelected && "bg-blue-500/15 border-blue-500/30 text-blue-400 font-medium hover:bg-blue-100 focus:bg-blue-100"
               )}
             >
               {line}
             </button>
           );
        })}
      </div>
      <div className="flex justify-end gap-2">
        {selectedLineIndices.size > 0 && (
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-blue-100 text-blue-900 hover:bg-blue-200 h-6 px-2 py-1"
            onClick={(e) => {
              e.stopPropagation();
              onHistorySelect(undefined, true); // just close
            }}
          >
            Done
          </button>
        )}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-[var(--tm-muted)] text-slate-50 hover:bg-slate-200 h-6 px-2 py-1"
          onClick={(e) => {
            e.stopPropagation();
            onHistorySelect(entry.data[fieldLabel.toLowerCase() as keyof typeof entry.data] || entry.formattedText, true);
          }}
        >
          <ClipboardPaste className="w-3 h-3 mr-1" />
          Paste {fieldLabel}
        </button>
      </div>
    </div>
  );
};

export const ClipboardInput = React.forwardRef<HTMLInputElement, ClipboardInputProps>(
  ({ className, value, onValueChange, source, fieldLabel, ...props }, ref) => {
    const entries = useClipboardStore((state) => state.entries);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const handleCopy = () => {
      if (value) {
        navigator.clipboard.writeText(value.toString());
      }
    };

    const handlePaste = async () => {
      try {
        const text = await navigator.clipboard.readText();
        onValueChange(text);
      } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
      }
    };

    const handleHistorySelect = (text?: string) => {
      if (text) {
        onValueChange(text);
      }
      setPopoverOpen(false);
    };

    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="relative group flex items-center w-full">
            <Input
              ref={ref}
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              className={cn("pr-2", className)}
              {...props}
            />
            
            <div className="absolute right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {source === 'ocr' && (
                <Badge variant="secondary" className="px-1 py-0 text-[9px] h-5 mr-1" title="Value from OCR">
                  <Bot className="w-3 h-3 mr-0.5" /> OCR
                </Badge>
              )}
              {source === 'clipboard' && (
                <Badge variant="secondary" className="px-1 py-0 text-[9px] h-5 mr-1" title="Value from Clipboard">
                  <ClipboardPaste className="w-3 h-3 mr-0.5" /> Clip
                </Badge>
              )}
              <button
                type="button"
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-slate-200 group-hover:bg-[var(--tm-surface)] rounded-sm"
                title="Copy value"
              >
                <ClipboardCopy className="w-3.5 h-3.5" />
              </button>
              
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen} modal={true}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="p-1 text-slate-400 hover:text-slate-200 group-hover:bg-[var(--tm-surface)] rounded-sm"
                    title="Clipboard history"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-0" align="end">
                  <div className="p-2 border-b bg-[var(--tm-muted)] flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">Clipboard History</span>
                    <span className="text-xs text-slate-400">{entries.length} entries</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {entries.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">No history available.</div>
                    ) : (
                      entries.map((entry) => (
                        <ClipboardEntryView
                          key={entry.id}
                          entry={entry}
                          fieldLabel={fieldLabel}
                          onHistorySelect={(text, close) => {
                            if (text) onValueChange(text);
                            if (close) setPopoverOpen(false);
                          }}
                        />
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-64">
          <ContextMenuItem onClick={handleCopy}>
            <ClipboardCopy className="mr-2 h-4 w-4" />
            <span>Copy</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handlePaste}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            <span>Paste</span>
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Clock className="mr-2 h-4 w-4" />
              <span>Clipboard History</span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-56 max-h-64 overflow-y-auto">
              {entries.length === 0 ? (
                <ContextMenuItem disabled>No entries</ContextMenuItem>
              ) : (
                entries.map(entry => (
                  <ContextMenuItem 
                    key={entry.id}
                    onClick={() => handleHistorySelect(entry.data[fieldLabel.toLowerCase() as keyof typeof entry.data] || entry.data.name || entry.formattedText.substring(0, 50))}
                  >
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium text-xs truncate">{entry.data.name || 'Entry'}</span>
                      <span className="text-[10px] text-slate-500 truncate">{entry.data.company || 'Unknown'}</span>
                    </div>
                  </ContextMenuItem>
                ))
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    );
  }
);

ClipboardInput.displayName = 'ClipboardInput';
