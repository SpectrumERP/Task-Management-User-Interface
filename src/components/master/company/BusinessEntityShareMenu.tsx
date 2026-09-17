import { useState } from 'react';
import { Mail, MessageCircle, Share2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  canNativeShare,
  shareAttachmentViaEmail,
  shareAttachmentViaWhatsApp,
  shareContactNative,
  shareContactViaEmail,
  shareContactViaWhatsApp,
  type ShareContactInfo,
} from '@/lib/businessEntityShare';

type ContactShareProps = {
  mode: 'contact';
  contact: ShareContactInfo;
};

type AttachmentShareProps = {
  mode: 'attachment';
  attachmentId: number;
  fileName: string;
  companyName?: string;
};

type BusinessEntityShareMenuProps = (ContactShareProps | AttachmentShareProps) & {
  className?: string;
  triggerClassName?: string;
  /** Compact icon-only trigger (default true for dense tables/cards) */
  iconOnly?: boolean;
  align?: 'start' | 'center' | 'end';
};

export function BusinessEntityShareMenu(props: BusinessEntityShareMenuProps) {
  const {
    className,
    triggerClassName,
    iconOnly = true,
    align = 'end',
  } = props;
  const [busy, setBusy] = useState(false);
  const showNative = canNativeShare();

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size={iconOnly ? 'icon' : 'sm'}
          disabled={busy}
          aria-label="Share"
          title="Share"
          className={cn(
            iconOnly
              ? 'h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]'
              : 'h-7 rounded-[6px] px-2 text-[10px] font-semibold text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)] gap-1',
            triggerClassName,
            className
          )}
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Share2 size={13} />}
          {!iconOnly ? <span>Share</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="min-w-[168px] rounded-xl border border-[var(--tm-border)] bg-[var(--tm-surface)] p-1.5 shadow-lg z-[120]"
      >
        <DropdownMenuItem
          disabled={busy}
          className="rounded-lg text-xs font-medium cursor-pointer gap-2"
          onSelect={() => {
            void run(async () => {
              if (props.mode === 'contact') await shareContactViaWhatsApp(props.contact);
              else
                await shareAttachmentViaWhatsApp({
                  id: props.attachmentId,
                  fileName: props.fileName,
                  companyName: props.companyName,
                });
            });
          }}
        >
          <MessageCircle size={14} className="text-emerald-400" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={busy}
          className="rounded-lg text-xs font-medium cursor-pointer gap-2"
          onSelect={() => {
            void run(async () => {
              if (props.mode === 'contact') await shareContactViaEmail(props.contact);
              else
                await shareAttachmentViaEmail({
                  id: props.attachmentId,
                  fileName: props.fileName,
                  companyName: props.companyName,
                });
            });
          }}
        >
          <Mail size={14} className="text-[#0EA5E9]" />
          Email
        </DropdownMenuItem>
        {showNative && props.mode === 'contact' ? (
          <DropdownMenuItem
            disabled={busy}
            className="rounded-lg text-xs font-medium cursor-pointer gap-2"
            onSelect={() => {
              void run(async () => shareContactNative(props.contact));
            }}
          >
            <Share2 size={14} className="text-slate-400" />
            More…
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
