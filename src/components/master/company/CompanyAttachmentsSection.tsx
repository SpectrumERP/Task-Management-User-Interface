import { Button } from '@/components/ui/button';
import { attachmentService } from '@/services/attachmentService';
import { UploadCloud, Camera as CameraIcon, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { CompanyFormSection } from './CompanyFormSection';
import { BusinessEntityShareMenu } from './BusinessEntityShareMenu';

interface CompanyAttachmentsSectionProps {
  attachments: any[];
  companyName?: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenCamera: () => void;
  onAnalyze: (att: any) => void;
  onRemove: (index: number) => void;
  analyzedAttachmentIds: number[];
  error?: string;
}

function isShareableAttachment(att: any): boolean {
  const id = att.id || att.docNo;
  return Boolean(id);
}

export function CompanyAttachmentsSection({
  attachments,
  companyName,
  onFileUpload,
  onOpenCamera,
  onAnalyze,
  onRemove,
  analyzedAttachmentIds,
  error,
}: CompanyAttachmentsSectionProps) {
  return (
    <CompanyFormSection
      icon={FileText}
      title={
        <>
          Document Attachments <span className="text-red-500">*</span>
        </>
      }
      description="At least one attachment is required to save"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="flex flex-col gap-2">
          <div
            className={cn(
              'border border-dashed border-[var(--tm-border)] bg-[var(--tm-elevated)] hover:bg-[#eef5f9] rounded-[8px] p-5 text-center cursor-pointer transition-colors relative flex flex-col items-center justify-center min-h-[110px]',
              error && 'border-red-300 bg-red-500/10 hover:bg-red-500/10'
            )}
          >
            <input
              type="file"
              onChange={onFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Choose file to attach"
            />
            <UploadCloud size={24} className={cn('text-slate-400 mb-1.5', error && 'text-red-400')} strokeWidth={1.75} />
            <p className="text-xs font-semibold text-slate-200">Upload Attachment</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">PDF, DOCX or XLSX up to 10MB</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onOpenCamera}
            className={cn(
              'h-10 w-full rounded-[8px] border-[var(--tm-border)] bg-[var(--tm-surface)] text-[#0EA5E9] hover:bg-[var(--tm-tint)] hover:text-[#0284C7] gap-1.5 text-xs font-semibold shadow-none',
              error && 'border-red-300 text-red-500 hover:bg-red-500/10'
            )}
            title="Capture attachment with camera"
          >
            <CameraIcon size={15} />
            Capture
          </Button>
        </div>

        <div className="md:col-span-2 space-y-2 min-w-0">
          {attachments.length === 0 ? (
            <div
              className={cn(
                'flex h-[158px] items-center justify-center border border-[var(--tm-border)]/80 rounded-[8px] bg-[var(--tm-elevated)] text-slate-400 text-xs font-medium px-4 text-center',
                error && 'border-red-500/30 bg-red-500/10 text-red-400'
              )}
            >
              At least one attachment is mandatory to save.
            </div>
          ) : (
            <div className="max-h-[158px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--tm-surface)] border border-[var(--tm-border)]/70 rounded-[8px] p-3 flex items-center justify-between gap-3 hover:border-[#0EA5E9]/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-[var(--tm-elevated)] border border-[var(--tm-border)]/80 rounded-[8px] text-[#0EA5E9] shrink-0">
                      <FileText size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5 mb-0.5 min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate leading-snug">
                          {att.fileName}
                        </p>
                        <span className="text-[10px] text-slate-400 font-medium font-mono shrink-0">
                          ({att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Attached File'})
                        </span>
                      </div>
                      {(att.id || att.docNo) && (
                        <div className="flex items-center gap-3 mt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              attachmentService.downloadAttachment(
                                att.id || att.docNo,
                                att.fileName || 'document'
                              )
                            }
                            className="text-[9px] font-semibold text-[#0EA5E9] hover:underline"
                          >
                            View document
                          </button>
                          {['.jpg', '.jpeg', '.png'].some((ext) =>
                            (att.fileName || '').toLowerCase().endsWith(ext)
                          ) &&
                            (analyzedAttachmentIds.includes(att.id || att.docNo) ||
                            (att.fileName || '').toLowerCase().includes('capture') ||
                            (att.fileName || '').toLowerCase().startsWith('logo') ? (
                              <span className="text-[9px] font-semibold text-slate-400">Analyzed</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onAnalyze(att)}
                                className="text-[9px] font-semibold text-emerald-400 hover:underline"
                              >
                                Analyze Image
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {isShareableAttachment(att) ? (
                      <BusinessEntityShareMenu
                        mode="attachment"
                        attachmentId={att.id || att.docNo}
                        fileName={att.fileName || 'document'}
                        companyName={companyName}
                      />
                    ) : null}
                    <ActionTip label="Remove Attachment">
                      <button
                        type="button"
                        onClick={() => onRemove(idx)}
                        aria-label="Remove Attachment"
                        className="p-1.5 rounded-[6px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </ActionTip>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error ? <p className="text-[10px] text-red-500 font-medium">{error}</p> : null}
        </div>
      </div>
    </CompanyFormSection>
  );
}
