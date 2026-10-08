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
    // One CRM-style field (`.crm-tag-field`): chips and the typing box sit inside a single bordered box.
    <div className={cn(
      "crm-tag-field flex flex-wrap items-center gap-1.5 min-h-9 w-full px-2.5 py-1 cursor-text",
      className
    )}
      onClick={(e) => (e.currentTarget.querySelector('input') as HTMLInputElement | null)?.focus()}
    >
      {tags.map((tag, index) => (
        <Badge
          key={index}
          variant="secondary"
          className="gap-1 rounded-full border border-[#c2d3f5] bg-[#eef3fc] px-2 py-0.5 text-[11px] font-bold text-[#1E56A0] shadow-none hover:bg-[#eef3fc] dark:border-[#1E56A0]/40 dark:bg-[#1E56A0]/20 dark:text-[#4f86d1]"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            aria-label={`Remove ${tag}`}
            className="rounded-full p-0.5 text-[#1E56A0]/70 transition-colors hover:bg-[#1E56A0]/10 hover:text-[#1E56A0] dark:text-[#4f86d1]/80"
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
        className="crm-tag-input h-7 min-w-[120px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
      />
    </div>
  );
}
