import { useCallback } from 'react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { isInlineViewableUpload } from '@/lib/allowedUploadFiles';
import { AttachmentImageBatchStore, useAttachmentImageEntry } from '@/hooks/useAttachmentImageBatch';

interface AttachmentThumbProps {
  store: AttachmentImageBatchStore;
  docNo: number;
  fileName?: string;
  className?: string;
  /** Overlay the (truncated) file name in the bottom-right corner of the preview. */
  showNameOverlay?: boolean;
}

/**
 * Lazy preview tile for an attachment card. Only image files are fetched via the batched
 * image API — PDFs, DOC/XLSX and other non-image types always render their type icon
 * and never trigger a network call.
 */
export function AttachmentThumb({ store, docNo, fileName, className, showNameOverlay }: AttachmentThumbProps) {
  const isImage = isInlineViewableUpload(fileName || '');
  const entry = useAttachmentImageEntry(store, docNo);
  const refCallback = useCallback(
    (el: HTMLDivElement | null) => {
      if (!isImage) return;
      store.registerElement(el, docNo);
    },
    [store, docNo, isImage]
  );

  const lowerName = (fileName || '').toLowerCase();
  const isPdf = lowerName.endsWith('.pdf');
  const isDoc = /\.(docx|doc)$/.test(lowerName);
  const isSheet = /\.(xlsx|xls|csv)$/.test(lowerName);
  const hasImage = isImage && entry.status === 'loaded' && !!entry.dataUrl;

  const iconTile = (
    <div
      className={cn(
        'flex h-full w-full items-center justify-center',
        isPdf
          ? 'bg-red-500/10 text-red-500'
          : isSheet
            ? 'bg-emerald-500/15 text-emerald-500'
            : isDoc
              ? 'bg-blue-500/15 text-blue-500'
              : 'bg-[var(--tm-muted)] text-slate-500'
      )}
    >
      <FileText size={18} />
    </div>
  );

  return (
    <div
      ref={refCallback}
      className={cn(
        'relative shrink-0 overflow-hidden flex items-center justify-center',
        className
      )}
    >
      {!isImage ? (
        iconTile
      ) : hasImage ? (
        <img
          src={entry.dataUrl}
          alt={fileName || 'Attachment preview'}
          className="h-full w-full object-contain"
        />
      ) : entry.status === 'error' ? (
        iconTile
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[var(--tm-muted)]/40">
          <BrandLogo
            compact
            maxHeight={24}
            maxWidth={24}
            imgClassName={cn('opacity-80', entry.status === 'loading' && 'animate-pulse')}
          />
        </div>
      )}

      {showNameOverlay && fileName ? (
        <span
          title={fileName}
          className="absolute bottom-1.5 right-1.5 max-w-[calc(100%-12px)] truncate rounded-[4px] bg-black/65 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur-sm"
        >
          {fileName}
        </span>
      ) : null}
    </div>
  );
}
