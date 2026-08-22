import { Button } from '@/components/ui/button';
import { attachmentService } from '@/services/attachmentService';
import { UploadCloud, Camera as CameraIcon, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="space-y-4">
      <div className="flex items-center gap-0.5 pb-2 border-b border-slate-200/80">
        <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
          <FileText size={18} />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-800 tracking-tight">Document Attachments <span className="text-red-500">*</span></h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="flex flex-col gap-1">
          <div className={cn(
            "border-2 border-dashed border-slate-200 bg-slate-50/30 hover:bg-slate-50/75 rounded-2xl p-6 text-center cursor-pointer transition-colors relative flex flex-col items-center justify-center min-h-[100px]",
            error && "border-red-400 bg-red-50/10 hover:bg-red-50/20"
          )}>
            <input
              type="file"
              onChange={onFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="Choose file to attach"
            />
            <UploadCloud size={28} className={cn("text-slate-400 mb-1.5", error && "text-red-400")} />
            <p className="text-xs font-black text-slate-700">Upload Attachment</p>
            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">PDF, DOCX or XLSX up to 10MB</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onOpenCamera}
            className={cn(
              "h-fit py-4 w-full rounded-2xl border-slate-200 bg-white text-[#006699] hover:bg-[#006699]/5 hover:text-[#005580]",
              error && "border-red-300 text-red-500 hover:bg-red-50"
            )}
            title="Capture attachment with camera"
          >
            <CameraIcon size={20} />
          </Button>
        </div>

        <div className="md:col-span-2 space-y-0">
          {attachments.length === 0 ? (
            <div className="flex h-[140px] items-center justify-center border border-slate-200 rounded-2xl bg-slate-50/20 text-slate-400 italic text-xs font-semibold">
              At least one attachment is mandatory to save.
            </div>
          ) : (
            <div className="max-h-[160px] overflow-y-auto space-y-0.5 pr-2 scrollbar-thin">
              {attachments.map((att, idx) => (
                <div key={idx} className="bg-white border border-slate-150 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-[#006699]/30 transition-colors">
                  <div className="flex items-center gap-0.5.5 min-w-0">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-0.5 mb-0.5">
                        <p className="text-xs font-medium text-slate-700 truncate leading-snug">{att.fileName}</p>
                        <span className="text-[10px] text-slate-400 font-medium normal-case font-mono">
                          ({att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Attached File'})
                        </span>
                      </div>
                      {(att.id || att.docNo) && (
                        <div className="flex items-center gap-3 mt-0.5">
                          <button
                            type="button"
                            onClick={() => attachmentService.downloadAttachment(att.id || att.docNo, att.fileName || 'document')}
                            className="text-[9px] font-medium text-[#006699] hover:underline block text-left"
                          >
                            View document
                          </button>
                          {['.jpg', '.jpeg', '.png'].some(ext => (att.fileName || '').toLowerCase().endsWith(ext)) && (
                            analyzedAttachmentIds.includes(att.id || att.docNo) ||
                            (att.fileName || '').toLowerCase().includes('capture') ||
                            (att.fileName || '').toLowerCase().startsWith('logo') ? (
                              <span className="text-[9px] font-bold text-slate-400 block text-left">
                                Analyzed
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onAnalyze(att)}
                                className="text-[9px] font-bold text-emerald-600 hover:underline block text-left"
                              >
                                Analyze Image
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    title="Remove Attachment"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-[10px] text-red-500 font-semibold ml-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}
