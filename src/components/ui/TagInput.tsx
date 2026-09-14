import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ tags, onChange, placeholder = "Add tag...", className }: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue('');
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className={cn(
      "flex flex-wrap gap-2 p-2 min-h-[40px] w-full rounded-md border border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-brand transition-all",
      className
    )}>
      {tags.map((tag, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="gap-1.5 px-2 py-1 bg-[var(--tm-muted)] text-slate-200 hover:bg-slate-200 border-none rounded-lg font-medium text-xs group"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="text-slate-400 hover:text-slate-300 transition-colors rounded-full p-0.5"
          >
            <X size={12} strokeWidth={3} />
          </button>
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 bg-transparent outline-none text-sm text-slate-50 font-medium placeholder:text-slate-400 min-w-[120px]"
      />
    </div>
  );
}
