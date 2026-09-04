import { Button } from '@/components/ui/button';
import { attachmentService } from '@/services/attachmentService';
import { UploadCloud, Camera as CameraIcon, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyFormSection } from './CompanyFormSection';

interface CompanyAttachmentsSectionProps {
  attachments: any[];
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenCamera: () => void;
  onAnalyze: (att: any) => void;
  onRemove: (index: number) => void;
  analyzedAttachmentIds: number[];
  error?: string;
}

export function CompanyAttachmentsSection({
  attachments,
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
              'border border-dashed border-slate-200 bg-[#f8fbfd] hover:bg-[#eef5f9] rounded-[8px] p-5 text-center cursor-pointer transition-colors relative flex flex-col items-center justify-center min-h-[110px]',
              error && 'border-red-300 bg-red-50/30 hover:bg-red-50/40'
            )}
          >
            <input
              type="file"
              onChange={onFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Choose file to attach"
            />
            <UploadCloud size={24} className={cn('text-slate-400 mb-1.5', error && 'text-red-400')} strokeWidth={1.75} />
            <p className="text-xs font-semibold text-slate-700">Upload Attachment</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">PDF, DOCX or XLSX up to 10MB</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onOpenCamera}
            className={cn(
              'h-10 w-full rounded-[8px] border-[#a8afb7] bg-white text-[#006699] hover:bg-[#e8f3f8] hover:text-[#005580] gap-1.5 text-xs font-semibold shadow-none',
              error && 'border-red-300 text-red-500 hover:bg-red-50'
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
                'flex h-[158px] items-center justify-center border border-slate-200/80 rounded-[8px] bg-[#f8fbfd] text-slate-400 text-xs font-medium px-4 text-center',
                error && 'border-red-200 bg-red-50/20 text-red-400'
              )}
            >
              At least one attachment is mandatory to save.
            </div>
          ) : (
            <div className="max-h-[158px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200/70 rounded-[8px] p-3 flex items-center justify-between gap-3 hover:border-[#006699]/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-2 bg-[#f8fbfd] border border-slate-200/80 rounded-[8px] text-[#006699] shrink-0">
                      <FileText size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5 mb-0.5 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate leading-snug">
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
                            className="text-[9px] font-semibold text-[#006699] hover:underline"
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
                                className="text-[9px] font-semibold text-emerald-600 hover:underline"
                              >
                                Analyze Image
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    className="p-1.5 rounded-[6px] text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    title="Remove Attachment"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
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
