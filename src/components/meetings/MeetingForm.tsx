import React, { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Users, Plus, Trash2, Paperclip, MessageSquare, FileText, Loader2, Clock, UserRound, IdCard, Building2, UserPlus, X } from 'lucide-react';
import { Combobox } from '@/components/ui/Combobox';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { EmployeeCombobox } from '@/components/meetings/EmployeeCombobox';
import { BusinessEntityCombobox } from '@/components/meetings/BusinessEntityCombobox';
import { DocumentCombobox } from '@/components/meetings/DocumentCombobox';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { getMeetingSchema, MeetingNotesFormData } from '@/types/meeting';
import { attachmentService } from '@/services/attachmentService';
import { UploadCloud, Image as ImageIcon, Trash, RefreshCw, AlertCircle, } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const formatFileSize = (bytes?: number | null) => {
  if (bytes === undefined || bytes === null || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const cleanMasterLabel = (label?: string | null) =>
  (label || '').replace(/^\[(.+)\]$/, '$1').trim() || label || '';

const toOptionalInt = (val: string) => {
  if (val === '' || val == null) return null;
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? null : n;
};

function FieldErrorTip({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      role="alert"
      className="pointer-events-none absolute right-1.5 top-0 z-40 -translate-y-1/2 max-w-[min(100%,200px)] rounded-[6px] bg-red-600 px-2 py-1 text-[10px] font-medium leading-tight text-white shadow-[0_6px_16px_-4px_rgba(220,38,38,0.45)] whitespace-normal text-right"
    >
      {message}
    </span>
  );
}

function FieldControl({
  children,
  error,
  className,
}: {
  children: React.ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-0', className)}>
      {children}
      <FieldErrorTip message={error} />
    </div>
  );
}

function FieldLabel({
  children,
  required,
  className,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn('inline-flex items-start gap-0.5 text-[11px] font-medium text-slate-600', className)}
    >
      <span>{children}</span>
      {required ? (
        <span className="text-red-500 leading-none text-[12px] relative -top-px" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

function FormSection({ title, icon: Icon, children, headerAction }: { title?: string, icon?: any, children?: React.ReactNode, headerAction?: React.ReactNode }) {
  return (
    <section className="rounded-[8px] border border-slate-200/70 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-[#f8fbfd] border-b border-slate-100 rounded-t-[8px]">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699]">
              <Icon size={15} strokeWidth={1.75} />
            </span>
          )}
          {title && <h3 className="text-sm font-semibold text-slate-800 tracking-tight truncate">{title}</h3>}
        </div>
        {headerAction}
      </div>
      <div className="p-4 sm:p-5">
        {children}
      </div>
    </section>
  );
}

export function MeetingForm({ initialData, onComplete, meetingNotesNo }: { initialData?: any, onComplete?: () => void, meetingNotesNo?: number }) {
  const navigate = useNavigate();
  const { isSave, isUpdate } = useFormRights(1559);
  const { company: authCompanies } = useAuthStore();
  const companyNoStr = authCompanies?.[0]?.CompanyNo?.toString() || authCompanies?.[0]?.companyNo?.toString() || '1';

  // Task Masters for Action Items
  const { fillValues: taskFillValues, fetchFillValues: fetchTaskFillValues } = useTaskStore();

  // Meeting Masters
  const [meetingTypes, setMeetingTypes] = useState<any[]>([]);
  const [meetingCategories, setMeetingCategories] = useState<any[]>([]);
  const [meetingModes, setMeetingModes] = useState<any[]>([]);
  const [participantTypes, setParticipantTypes] = useState<any[]>([]);
  const [meetingDocumentTypes, setMeetingDocumentTypes] = useState<any[]>([]);
  const [documentStatuses, setDocumentStatuses] = useState<any[]>([]);

  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    tempId: string;
    name: string;
    status: 'pending' | 'uploading' | 'verifying' | 'failed';
    fileObject: File;
    errorMessage?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'participant' | 'discussion' | 'document';
    index: number;
    label: string;
  } | null>(null);
  const [invalidFiles, setInvalidFiles] = useState<Array<{ name: string; size: number; reason: string }>>([]);
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingType, setIsSavingType] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);

  const form = useForm<MeetingNotesFormData>({
    resolver: zodResolver(getMeetingSchema() as any),
    mode: 'onChange',
    defaultValues: {
      meetingTitle: initialData?.meetingTitle || '',
      meetingTypeNo: initialData?.meetingTypeNo?.toString() || '',
      meetingCategoryNo: initialData?.meetingCategoryNo?.toString() || '',
      companyNo: initialData?.companyNo?.toString() || companyNoStr,
      meetingStartDateTime: initialData?.meetingStartDateTime || '',
      meetingEndDateTime: initialData?.meetingEndDateTime || '',
      durationMinutes: initialData?.durationMinutes || 0,
      meetingModeNo: initialData?.meetingModeNo?.toString() || initialData?.meetingMode?.id?.toString() || initialData?.meetingMode?.toString() || '1',
      operTaskCompanyNo: initialData?.operTaskCompanyNo?.toString() || companyNoStr,
      operLocationNo: initialData?.location?.id?.toString() || initialData?.operLocationNo?.toString() || '',
      meetingMinutesUrl: initialData?.meetingMinutesUrl || '',
      remarks: initialData?.remarks || '',
      documentStatusNo: initialData?.documentStatusNo || 10,
      participants: initialData?.participants || [],
      discussions: initialData?.discussions || [],
      documents: initialData?.documents || []
    }
  });

  useEffect(() => {
    if (meetingNotesNo && !initialData) {
      const fetchMeeting = async () => {
        setIsFetchingData(true);
        try {
          const res = await apiService.get<any>(`/api/crm/meeting-notes/load-data/${meetingNotesNo}`);
          if (res && res.data) {
            try {
              const attachmentList = await attachmentService.getAttachments(meetingNotesNo, 1559);
              if (attachmentList && attachmentList.length > 0) {
                res.data.attachments = attachmentList;
              }
            } catch (attError) {
              console.error('Failed to load attachments in form load-data:', attError);
            }

            form.reset({
              ...res.data,
              meetingTypeNo: res.data.meetingTypeNo?.toString(),
              companyNo: res.data.operTaskCompanyNo?.toString(),
              meetingCategoryNo: res.data.meetingCategoryNo?.toString(),
              meetingModeNo: res.data.meetingModeNo?.toString(),
              operTaskCompanyNo: res.data.companyNo?.toString(),
              operLocationNo: res.data.operLocationNo?.toString(),
            });
          }
        } catch (error) {
          console.error("Failed to fetch meeting", error);
          toast.error("Failed to load meeting details");
        } finally {
          setIsFetchingData(false);
        }
      };
      fetchMeeting();
    }
  }, [meetingNotesNo, initialData, form]);

  const { fields: participantFields, append: appendParticipant, remove: removeParticipant } = useFieldArray({
    control: form.control,
    name: 'participants'
  });

  const { fields: discussionFields, append: appendDiscussion, remove: removeDiscussion } = useFieldArray({
    control: form.control,
    name: 'discussions'
  });

  const { fields: documentFields, append: appendDocument, remove: removeDocument } = useFieldArray({
    control: form.control,
    name: 'documents'
  });

  useEffect(() => {
    const init = async () => {
      setIsLoadingOptions(true);
      try {
        await fetchTaskFillValues(companyNoStr);
        const fillRes = await apiService.get<any>(`/api/crm/meeting-notes/fill-values?companyNo=${companyNoStr}`);
        const data = fillRes?.data || fillRes || {};

        if (data.meetingTypes) setMeetingTypes(data.meetingTypes);
        if (data.meetingCategories) setMeetingCategories(data.meetingCategories);
        if (data.meetingModes) setMeetingModes(data.meetingModes);
        if (data.participantTypes) setParticipantTypes(data.participantTypes);

        if (data.meetingDocumentTypes) setMeetingDocumentTypes(data.meetingDocumentTypes);
        if (data.documentStatuses) setDocumentStatuses(data.documentStatuses);

      } catch (err) {
        console.error("Failed to load meeting fill-values data", err);
      } finally {
        setIsLoadingOptions(false);
      }
    };
    init();
  }, [companyNoStr, fetchTaskFillValues]);

  const startDateTime = form.watch('meetingStartDateTime');
  const endDateTime = form.watch('meetingEndDateTime');

  useEffect(() => {
    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime).getTime();
      const end = new Date(endDateTime).getTime();
      if (end > start) {
        form.setValue('durationMinutes', Math.floor((end - start) / 60000), { shouldValidate: true });
        if (form.formState.errors.meetingEndDateTime?.type === 'manual' || form.formState.errors.meetingEndDateTime?.message === 'End Time must be after Start Time') {
          form.clearErrors('meetingEndDateTime');
        }
      } else {
        form.setValue('durationMinutes', 0);
        form.setError('meetingEndDateTime', { type: 'manual', message: 'End Time must be after Start Time' });
      }
    } else {
      form.setValue('durationMinutes', 0);
    }
  }, [startDateTime, endDateTime, form]);



  const startUpload = async (tempId: string, file: File) => {
    try {
      setUploadingFiles(prev =>
        prev.map(f => f.tempId === tempId ? { ...f, status: 'uploading' } : f)
      );
      const dbEntry = await attachmentService.createEntry(file.name, parseInt(companyNoStr), 1559); // Assuming 1559 is Meeting Notes form No, or just use 1547 for now
      setUploadingFiles(prev =>
        prev.map(f => f.tempId === tempId ? { ...f, status: 'verifying' } : f)
      );
      await attachmentService.uploadFile(dbEntry.id, file);
      const isVerified = await attachmentService.checkStatus(dbEntry.id);
      if (!isVerified) throw new Error("Upload status could not be verified by the backend.");

      const currentAttachments = form.getValues('attachments') || [];
      const de = dbEntry as any;
      form.setValue('attachments', [...currentAttachments, {
        id: de.id,
        name: de.docName || de.name || file.name,
        size: de.docSize || de.size || file.size,
        storedFileName: de.storedFileName,
        storedFilePath: de.storedFilePath,
        relativePath: de.relativePath
      }]);
      setUploadingFiles(prev => prev.filter(f => f.tempId !== tempId));
      toast.success(`"${file.name}" uploaded successfully!`);
    } catch (error: any) {
      console.error(`Upload failed for file: ${file.name}`, error);
      const errorMsg = error?.message || "File upload failed. Please try again.";
      setUploadingFiles(prev =>
        prev.map(f => f.tempId === tempId ? { ...f, status: 'failed', errorMessage: errorMsg } : f)
      );
      toast.error(`"${file.name}" failed: ${errorMsg}`);
    }
  };

  const processFiles = (files: File[]) => {
    const validFiles: File[] = [];
    const failed: Array<{ name: string; size: number; reason: string }> = [];
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        failed.push({ name: file.name, size: file.size, reason: "File size exceeds the 10MB limit." });
        return;
      }
      validFiles.push(file);
    });
    if (failed.length > 0) {
      setInvalidFiles(failed);
      setShowWarningDialog(true);
    }
    validFiles.forEach(file => {
      const tempId = Math.random().toString(36).substring(2, 9);
      setUploadingFiles(prev => [...prev, { tempId, name: file.name, status: 'pending', fileObject: file }]);
      startUpload(tempId, file);
    });
  };

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(Array.from(files));
    e.target.value = '';
  };

  const handleRetryUpload = (tempId: string) => {
    const queueItem = uploadingFiles.find(f => f.tempId === tempId);
    if (!queueItem) return;
    setUploadingFiles(prev => prev.map(f => f.tempId === tempId ? { ...f, status: 'pending', errorMessage: undefined } : f));
    startUpload(tempId, queueItem.fileObject);
  };

  const handleRemoveUploading = (tempId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.tempId !== tempId));
  };

  const handleRemoveAttachment = (id: number, name: string) => {
    setAttachmentToDelete({ id, name });
  };

  const requestRemoveItem = (
    type: 'participant' | 'discussion' | 'document',
    index: number,
    label: string
  ) => {
    setItemToDelete({ type, index, label });
  };

  const confirmRemoveItem = () => {
    if (!itemToDelete) return;
    const { type, index } = itemToDelete;
    if (type === 'participant') removeParticipant(index);
    else if (type === 'discussion') removeDiscussion(index);
    else removeDocument(index);
    setItemToDelete(null);
  };

  const confirmRemoveAttachment = async () => {
    if (!attachmentToDelete) return;
    const { id } = attachmentToDelete;
    setIsDeletingAttachment(true);
    try {
      if (id) await attachmentService.deleteAttachment(id);
      const currentAttachments = form.getValues('attachments') || [];
      form.setValue('attachments', currentAttachments.filter((a: any) => a.id !== id), { shouldDirty: true });
      toast.success("Attachment removed successfully.");
      setAttachmentToDelete(null);
    } catch (error) {
      console.error('Failed to delete attachment from server:', error);
    } finally {
      setIsDeletingAttachment(false);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      if (uploadingFiles.some(f => f.status === 'pending' || f.status === 'uploading' || f.status === 'verifying')) {
        toast.error("Please wait for all attachments to finish uploading before saving.");
        return;
      }

      // Data format matching API spec
      const cleanEmptyStrings = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string' && obj.trim() === '') return null;
        if (Array.isArray(obj)) return obj.map(cleanEmptyStrings);
        if (typeof obj === 'object') {
          const newObj: any = {};
          for (const key in obj) {
            newObj[key] = cleanEmptyStrings(obj[key]);
          }
          return newObj;
        }
        return obj;
      };

      let payload = {
        ...data,
        companyNo: parseInt(data.operTaskCompanyNo),
        meetingTypeNo: parseInt(data.meetingTypeNo),
        operTaskCompanyNo: parseInt(data.companyNo),
        meetingCategoryNo: parseInt(data.meetingCategoryNo),
        meetingModeNo: parseInt(data.meetingModeNo),
        operLocationNo: parseInt(data.operLocationNo),

        attachments: data.attachments.map((a: any) => ({
          docNo: a.id
        })),
        documents: data.documents.map((d: any) => ({
          mnDocumentDetailNo: d.mnDocumentDetailNo || null,
          documentType: parseInt(d.documentType?.toString() || null) || null,
          documentNo: parseInt(d.documentNo?.toString() || null) || null
        })),
        participants: data.participants.map((p: any) => {
          const type = parseInt(p.participantType.toString());

          if (type === 1) {
            return {
              participantType: 1,
              userNo: p.userNo
            };
          } else if (type === 2) {
            return {
              participantType: 1,
              empNo: p.empNo
            };
          } else if (type === 4) {
            return {
              participantType: 4,
              businessEntityNo: p.businessEntityNo,
              businessEntityContactPersonDetailNo: p.businessEntityContactPersonDetailNo
            };
          }

          return { ...p, participantType: type };
        })
      };

      const isUpdate = !!(meetingNotesNo || initialData?.meetingNotesNo);
      const url = '/api/crm/meeting-notes/save';

      if (isUpdate) {
        (payload as any).meetingNotesNo = meetingNotesNo || initialData?.meetingNotesNo;
      }

      await apiService.post(url, cleanEmptyStrings(payload));
      toast.success(isUpdate ? "Meeting Notes Updated Successfully" : "Meeting Notes Saved Successfully");
      if (onComplete) onComplete();
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoadingOptions || isFetchingData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full gap-4 text-slate-500">
        <div className="w-8 h-8 border-4 border-[#006699] border-t-transparent rounded-lg animate-spin"></div>
        <div className="font-semibold">{isFetchingData ? 'Loading meeting details...' : 'Loading options...'}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#eef4f8] absolute inset-0">
      {/* Header & Breadcrumb */}
      <div className="shrink-0 sticky top-0 z-50 bg-white border-b border-slate-200/70 px-4 py-2.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <nav className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/meetings')}
            className="shrink-0 text-sm font-medium text-[#006699] underline decoration-[#006699]/40 underline-offset-[3px] hover:decoration-[#006699] hover:text-[#005580] cursor-pointer transition-colors bg-transparent p-0 border-0"
          >
            Meeting Notes
          </button>
          <span className="text-slate-300 text-sm font-light leading-none select-none" aria-hidden>
            /
          </span>
          <span className="text-sm font-semibold text-slate-800 truncate">
            {meetingNotesNo || initialData?.meetingNotesNo ? 'Edit Meeting Note' : 'Create Meeting Note'}
          </span>
        </nav>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button type="button" variant="outline" size="sm" className="h-9 rounded-[8px] font-medium border-slate-200/80 text-xs px-4" onClick={() => navigate('/meetings')}>Cancel</Button>
          {((meetingNotesNo || initialData?.meetingNotesNo) ? isUpdate : isSave) && (
            <Button disabled={form.formState.isSubmitting} type="submit" size="sm" className="h-9 rounded-[8px] bg-[#006699] hover:bg-[#005580] text-white font-semibold shadow-[0_8px_20px_-6px_rgba(0,102,153,0.45)] text-xs px-5" onClick={form.handleSubmit(onSubmit, (errors) => console.log('Validation Errors:', errors))}>
              {form.formState.isSubmitting ? (meetingNotesNo || initialData?.meetingNotesNo ? 'Updating...' : 'Saving...') : (meetingNotesNo || initialData?.meetingNotesNo ? 'Update' : 'Save')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#eef4f8]">
        <div className="w-full mx-auto p-4">
          <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.log('Validation Errors:', errors))} className="space-y-3">

              {/* SECTION 1: Basic Information */}
              <FormSection
                title="Meeting Detail"
                icon={Clock}
                headerAction={
                  <Controller
                    control={form.control}
                    name="documentStatusNo"
                    render={({ field }) => (
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(val) => field.onChange(parseInt(val))}
                      >
                        <SelectTrigger className="h-9 rounded-[8px] bg-white border-slate-200/80 text-xs w-[140px] font-medium">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          {documentStatuses?.map(status => (
                            <SelectItem key={status.documentStatusNo} value={status.documentStatusNo.toString()}>
                              {status.documentStatusName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-4">
                  <div className="space-y-1.5 md:col-span-2 lg:col-span-3 xl:col-span-4">
                    <FieldLabel required>Meeting Title</FieldLabel>
                    <FieldControl error={form.formState.errors.meetingTitle?.message}>
                      <Input {...form.register('meetingTitle')} placeholder="e.g. Weekly Sync with Client" className={cn("h-10 rounded-[8px]", form.formState.errors.meetingTitle && "border-red-400")} />
                    </FieldControl>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required>Meeting Category</FieldLabel>
                    <Controller
                      control={form.control}
                      name="meetingCategoryNo"
                      render={({ field }) => (
                        <FieldControl error={form.formState.errors.meetingCategoryNo?.message}>
                          <Combobox className={cn("rounded-[8px] h-10 w-full", form.formState.errors.meetingCategoryNo && "border-red-400")}
                            options={meetingCategories.map(c => ({ value: (c.id || c.meetingCategoryNo).toString(), label: c.name || c.meetingCategoryName }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select Category"
                            onAddNew={() => setCategoryModalOpen(true)}
                            addNewLabel="Add Category"
                          />
                        </FieldControl>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required>Meeting Type</FieldLabel>
                    <Controller
                      control={form.control}
                      name="meetingTypeNo"
                      render={({ field }) => (
                        <FieldControl error={form.formState.errors.meetingTypeNo?.message}>
                          <Combobox className={cn("rounded-[8px] h-10 w-full", form.formState.errors.meetingTypeNo && "border-red-400")}
                            options={meetingTypes.map(t => ({ value: (t.id || t.meetingTypeNo).toString(), label: t.name || t.meetingTypeName }))}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select Type"
                            onAddNew={() => setTypeModalOpen(true)}
                            addNewLabel="Add Type"
                          />
                        </FieldControl>
                      )}
                    />
                  </div>


                  <div className="space-y-1.5">
                    <FieldLabel required>Company</FieldLabel>
                    <Controller
                      control={form.control}
                      name="companyNo"
                      render={({ field }) => (
                        <FieldControl error={form.formState.errors.companyNo?.message}>
                          <Combobox className={cn("rounded-[8px] h-10", form.formState.errors.companyNo && "border-red-400")}
                            options={taskFillValues?.taskCompany?.map(c => ({ value: c.CompanyNo?.toString() || c.companyNo?.toString() || c.OperTaskCompanyNo?.toString() || '', label: c.AliasName || c.companyName || c.name || c.AliasName || c.Code || 'Unknown Company' })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select Company"
                          />
                        </FieldControl>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required>Location</FieldLabel>
                    <Controller
                      control={form.control}
                      name="operLocationNo"
                      render={({ field }) => (
                        <FieldControl error={form.formState.errors.operLocationNo?.message}>
                          <Combobox className={cn("rounded-[8px] h-10", form.formState.errors.operLocationNo && "border-red-400")}
                            options={taskFillValues?.location?.filter(l => l.Location.toLowerCase() !== 'all' && l.Location.toLowerCase() !== '[all]').map(l => ({ value: l.OperLocationNo.toString(), label: l.Location })) || []}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select Location"
                          />
                        </FieldControl>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required>Meeting Mode</FieldLabel>
                    <Controller
                      control={form.control}
                      name="meetingModeNo"
                      render={({ field }) => (
                        <FieldControl error={form.formState.errors.meetingModeNo?.message}>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className={cn("h-10 rounded-[8px]", form.formState.errors.meetingModeNo && "border-red-400")}><SelectValue placeholder="Select Mode" /></SelectTrigger>
                            <SelectContent>
                              {meetingModes.map(m => (
                                <SelectItem key={m.meetingModeNo} value={m.meetingModeNo.toString()}>{m.meetingModeName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FieldControl>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required>Start Date & Time</FieldLabel>
                    <Controller
                      control={form.control}
                      name="meetingStartDateTime"
                      render={({ field }) => (
                        <FieldControl error={form.formState.errors.meetingStartDateTime?.message}>
                          <DateTimePicker className={cn("rounded-[8px]", form.formState.errors.meetingStartDateTime && "border-red-400")} date={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? d.toISOString() : '')} />
                        </FieldControl>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required>End Date & Time</FieldLabel>
                    <Controller
                      control={form.control}
                      name="meetingEndDateTime"
                      render={({ field }) => (
                        <FieldControl error={form.formState.errors.meetingEndDateTime?.message}>
                          <DateTimePicker className={cn("rounded-[8px]", form.formState.errors.meetingEndDateTime && "border-red-400")} date={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? d.toISOString() : '')} />
                        </FieldControl>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-slate-600">Meeting Duration (In Minutes)</label>
                    <Input value={form.watch('durationMinutes') || 0} readOnly placeholder="0" className="h-10 rounded-[8px] bg-slate-50/50 text-xs text-slate-500 text-right" />
                  </div>

                  <div className="space-y-1.5 md:col-span-2 lg:col-span-3 xl:col-span-4">
                    <label className="text-[11px] font-medium text-slate-600">Meeting Link (URL)</label>
                    <FieldControl error={form.formState.errors.meetingMinutesUrl?.message}>
                      <Input {...form.register('meetingMinutesUrl')} placeholder="https://..." className={cn("h-10 rounded-[8px]", form.formState.errors.meetingMinutesUrl && "border-red-400")} />
                    </FieldControl>
                  </div>
                </div>
              </FormSection>

              {/* SECTION 2: Participants */}
              <FormSection
                title="Participants"
                icon={Users}
                headerAction={
                  <Button type="button" onClick={() => appendParticipant({ participantType: 1 })} variant="outline" size="sm" className="h-9 rounded-[8px] text-xs font-medium border-[#006699]/25 text-[#006699] hover:bg-[#e8f3f8]">
                    <Plus size={14} className="mr-1" /> Add Participant
                  </Button>
                }
              >
                {participantFields.length === 0 ? (
                  <FieldControl
                    className="text-center p-8 border border-dashed border-slate-200 rounded-[8px] bg-[#f8fbfd] flex flex-col items-center justify-center"
                    error={
                      (form.formState.errors.participants?.message ||
                        form.formState.errors.participants?.root?.message) as
                        | string
                        | undefined
                    }
                  >
                    <p className="text-xs text-slate-500 font-medium">
                      No participants added yet.
                    </p>
                  </FieldControl>
                ) : (
                  <div className="space-y-3">
                    {participantFields.map((field, index) => {
                      const participantType = form.watch(`participants.${index}.participantType`);
                      const participantName = form.watch(`participants.${index}.participantName`);
                      const participantEmail = form.watch(`participants.${index}.email`);
                      const summaryName = (participantName || '').trim();
                      const summaryEmail = (participantEmail || '').trim();
                      const TypeIcon =
                        participantType === 2 ? IdCard :
                        participantType === 3 ? UserPlus :
                        participantType === 4 ? Building2 :
                        UserRound;
                      return (
                        <div
                          key={field.id}
                          className="relative rounded-[8px] border border-slate-200/80 bg-white overflow-hidden group shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#006699]/30 hover:shadow-[0_8px_24px_-12px_rgba(0,102,153,0.18)] transition-all"
                        >
                          <div className="relative flex items-center gap-3 pl-4 pr-11 py-2.5 bg-gradient-to-r from-[#f4f9fc] to-white border-b border-slate-100">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[12px] font-semibold text-[#006699] ring-1 ring-[#006699]/12">
                              {index + 1}
                            </span>
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699] ring-1 ring-[#006699]/10">
                              <TypeIcon size={14} strokeWidth={1.75} />
                            </span>
                            <div className="min-w-0 flex-1">
                              {summaryName ? (
                                <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">{summaryName}</p>
                              ) : null}
                              {summaryEmail ? (
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">{summaryEmail}</p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                requestRemoveItem(
                                  'participant',
                                  index,
                                  summaryName || `Participant ${index + 1}`
                                )
                              }
                              className="absolute top-0 right-0 h-8 w-8 inline-flex items-center justify-center text-red-500 bg-red-50 hover:text-red-600 hover:bg-red-100 rounded-bl-[8px] rounded-tr-[7px] border-l border-b border-red-100/80 transition-colors"
                              title="Remove participant"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">

                            {/* Participant Type — first field in the form row */}
                            <div className="space-y-1">
                              <FieldLabel required>Type</FieldLabel>
                              <Controller
                                control={form.control}
                                name={`participants.${index}.participantType`}
                                render={({ field }) => (
                                  <Select value={field.value.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                                    <SelectTrigger className="h-10 rounded-[8px] bg-white text-xs min-w-[150px]">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {participantTypes.map(pt => (
                                        <SelectItem key={pt.id} value={pt.id.toString()}>{pt.participantType}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>

                            {/* Internal (User) Fields */}
                            {participantType === 1 && (
                              <>
                                <div className="space-y-1 md:col-span-1 lg:col-span-2">
                                  <FieldLabel required>Select User</FieldLabel>
                                  <Controller
                                    control={form.control}
                                    name={`participants.${index}.userNo`}
                                    render={({ field }) => (
                                      <FieldControl error={form.formState.errors.participants?.[index]?.userNo?.message}>
                                        <UserCombobox className={cn("rounded-[8px] h-10 text-xs", form.formState.errors.participants?.[index]?.userNo && "border-red-400")}
                                          value={field.value?.toString() || ''}
                                          onChange={(user: any) => {
                                            field.onChange(user?.loginNo ? Number(user.loginNo) : undefined);
                                            form.setValue(`participants.${index}.participantName`, user?.userName || user?.printingName || user?.loginId || '');
                                            form.setValue(`participants.${index}.email`, user?.email || '');
                                          }}
                                          onResolve={(user: any) => {
                                            if (!form.getValues(`participants.${index}.email`)) {
                                              form.setValue(`participants.${index}.participantName`, user?.userName || user?.printingName || user?.loginId || '');
                                              form.setValue(`participants.${index}.email`, user?.email || '');
                                            }
                                          }}
                                          placeholder="Search internal user..."
                                        />
                                      </FieldControl>
                                    )}
                                  />
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-2">
                                  <label className="text-[11px] font-medium text-slate-600">Display Name</label>
                                  <Input value={form.watch(`participants.${index}.participantName`) || ''} disabled placeholder="Display Name" className="h-10 rounded-[8px] bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                              </>
                            )}

                            {/* Internal (Employee) Fields */}
                            {participantType === 2 && (
                              <>
                                <div className="space-y-1 sm:col-span-1 lg:col-span-2">
                                  <FieldLabel required>Employee</FieldLabel>
                                  <Controller
                                    control={form.control}
                                    name={`participants.${index}.empNo`}
                                    render={({ field }) => (
                                      <FieldControl error={form.formState.errors.participants?.[index]?.empNo?.message}>
                                        <EmployeeCombobox className={cn("rounded-[8px] h-10 text-xs", form.formState.errors.participants?.[index]?.empNo && "border-red-400")}
                                          value={field.value?.toString() || ''}
                                          onChange={(emp: any) => {
                                            field.onChange(emp?.empNo ? Number(emp.empNo) : undefined);
                                            form.setValue(`participants.${index}.participantName`, emp?.empCode || '');
                                            form.setValue(`participants.${index}.email`, emp?.email || '');
                                          }}
                                          onResolve={(emp: any) => {
                                            if (!form.getValues(`participants.${index}.email`)) {
                                              form.setValue(`participants.${index}.participantName`, emp?.empCode || '');
                                              form.setValue(`participants.${index}.email`, emp?.email || '');
                                            }
                                          }}
                                          placeholder="Search employee..."
                                        />
                                      </FieldControl>
                                    )}
                                  />
                                </div>
                                <div className="space-y-1 sm:col-span-1 lg:col-span-1">
                                  <label className="text-[11px] font-medium text-slate-600">Employee Code</label>
                                  <Input value={form.watch(`participants.${index}.participantName`) || ''} disabled placeholder="Employee Code" className="h-10 rounded-[8px] bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                                <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                                  <label className="text-[11px] font-medium text-slate-600">Email</label>
                                  <Input value={form.watch(`participants.${index}.email`) || ''} disabled placeholder="Email" className="h-10 w-full rounded-[8px] bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                              </>
                            )}

                            {/* External Fields */}
                            {participantType === 3 && (
                              <>
                                <div className="space-y-1">
                                  <FieldLabel required>Name</FieldLabel>
                                  <FieldControl error={form.formState.errors.participants?.[index]?.participantName?.message}>
                                    <Input {...form.register(`participants.${index}.participantName`)} placeholder="Name" className={cn("h-10 rounded-[8px] bg-white text-xs", form.formState.errors.participants?.[index]?.participantName && "border-red-400")} maxLength={100} />
                                  </FieldControl>
                                </div>
                                <div className="space-y-1">
                                  <FieldLabel required>Company</FieldLabel>
                                  <FieldControl error={form.formState.errors.participants?.[index]?.companyName?.message}>
                                    <Input {...form.register(`participants.${index}.companyName`)} placeholder="Company" className={cn("h-10 rounded-[8px] bg-white text-xs", form.formState.errors.participants?.[index]?.companyName && "border-red-400")} maxLength={100} />
                                  </FieldControl>
                                </div>
                                <div className="space-y-1 col-start-1 sm:col-span-2 lg:col-span-2">
                                  <FieldLabel required>Email</FieldLabel>
                                  <FieldControl error={form.formState.errors.participants?.[index]?.email?.message}>
                                    <Input {...form.register(`participants.${index}.email`)} placeholder="Email" className={cn("h-10 rounded-[8px] bg-white text-xs", form.formState.errors.participants?.[index]?.email && "border-red-400")} maxLength={100} />
                                  </FieldControl>
                                </div>
                                <div className="space-y-1">
                                  <FieldLabel required>Designation</FieldLabel>
                                  <FieldControl error={form.formState.errors.participants?.[index]?.designation?.message}>
                                    <Input {...form.register(`participants.${index}.designation`)} placeholder="Designation" className={cn("h-10 rounded-[8px] bg-white text-xs", form.formState.errors.participants?.[index]?.designation && "border-red-400")} maxLength={100} />
                                  </FieldControl>
                                </div>
                                <div className="space-y-1">
                                  <FieldLabel required>Contact No</FieldLabel>
                                  <FieldControl error={form.formState.errors.participants?.[index]?.contactNo?.message}>
                                    <Input {...form.register(`participants.${index}.contactNo`)} placeholder="Contact No" className={cn("h-10 rounded-[8px] bg-white text-xs", form.formState.errors.participants?.[index]?.contactNo && "border-red-400")} maxLength={20} />
                                  </FieldControl>
                                </div>
                              </>
                            )}

                            {/* BusinessEntity Fields */}
                            {participantType === 4 && (
                              <>
                                <div className="space-y-1 md:col-span-1 lg:col-span-2 xl:col-span-2">
                                  <FieldLabel required>Business Entity Contact</FieldLabel>
                                  <Controller
                                    control={form.control}
                                    name={`participants.${index}.participantName`}
                                    render={({ field }) => (
                                      <FieldControl error={form.formState.errors.participants?.[index]?.participantName?.message}>
                                        <BusinessEntityCombobox className={cn("rounded-[8px] h-10 text-xs", form.formState.errors.participants?.[index]?.participantName && "border-red-400")}
                                          detailNo={form.watch(`participants.${index}.businessEntityContactPersonDetailNo`)}
                                          value={field.value || ''}
                                          onChange={(contact: any) => {
                                            field.onChange(contact?.contactPersonName || '');
                                            form.setValue(`participants.${index}.email`, contact?.email || '');
                                            form.setValue(`participants.${index}.companyName`, contact?.businessEntityName || '');
                                            form.setValue(`participants.${index}.designation`, contact?.designation || '');
                                            form.setValue(`participants.${index}.department` as any, contact?.department || '');
                                            form.setValue(`participants.${index}.businessEntityNo`, contact?.businessEntityNo || null);
                                            form.setValue(`participants.${index}.businessEntityContactPersonDetailNo`, contact?.businessEntityContactPersonDetailNo || null);
                                          }}
                                          onResolve={(contact: any) => {
                                            if (!form.getValues(`participants.${index}.email`)) {
                                              form.setValue(`participants.${index}.email`, contact?.email || '');
                                              form.setValue(`participants.${index}.companyName`, contact?.businessEntityName || '');
                                              form.setValue(`participants.${index}.designation`, contact?.designation || '');
                                              form.setValue(`participants.${index}.department` as any, contact?.department || '');
                                            }
                                          }}
                                          placeholder="Search contact..."
                                        />
                                      </FieldControl>
                                    )}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-slate-600">Business Entity</label>
                                  <Input value={form.watch(`participants.${index}.companyName`) || ''} disabled placeholder="Business Entity" className="h-10 rounded-[8px] bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-slate-600">Designation</label>
                                  <Input value={form.watch(`participants.${index}.designation`) || ''} disabled placeholder="Designation" className="h-10 rounded-[8px] bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-slate-600">Department</label>
                                  <Input value={(form.watch(`participants.${index}` as any)?.department) || ''} disabled placeholder="Department" className="h-10 rounded-[8px] bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                                <div className="space-y-1 col-start-1 sm:col-span-2 lg:col-span-3 xl:col-span-3">
                                  <label className="text-[11px] font-medium text-slate-600">Email</label>
                                  <Input value={form.watch(`participants.${index}.email`) || ''} disabled placeholder="Email" className="h-10 w-full rounded-[8px] bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                              </>
                            )}
                          </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </FormSection>

              {/* SECTION 4: Discussions & Action Items */}
              <FormSection
                title="Discussions & Outcomes"
                icon={MessageSquare}
                headerAction={
                  <Button type="button" onClick={() => appendDiscussion({ topic: '', isActionRequired: false })} variant="outline" size="sm" className="h-9 rounded-[8px] text-xs font-medium border-[#006699]/25 text-[#006699] hover:bg-[#e8f3f8]">
                    <Plus size={14} className="mr-1" /> Add Discussion Point
                  </Button>
                }
              >
                {discussionFields.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-slate-200 rounded-[8px] bg-[#f8fbfd]">
                    <p className="text-xs text-slate-500 font-medium">No discussion points added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {discussionFields.map((field, index) => {
                      const isActionRequired = form.watch(`discussions.${index}.isActionRequired`);
                      const topicValue = (form.watch(`discussions.${index}.topic`) || '').trim();
                      return (
                        <div
                          key={field.id}
                          className="relative rounded-[8px] border border-slate-200/80 bg-white overflow-visible group shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#006699]/30 hover:shadow-[0_8px_24px_-12px_rgba(0,102,153,0.18)] transition-all"
                        >
                          <div className="relative flex items-center gap-3 pl-4 pr-11 py-2.5 bg-gradient-to-r from-[#f4f9fc] to-white border-b border-slate-100">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[12px] font-semibold text-[#006699] ring-1 ring-[#006699]/12">
                              {index + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                                {topicValue || 'Discussion point'}
                              </p>
                              {isActionRequired ? (
                                <p className="text-[11px] text-[#006699] font-medium mt-0.5">Action required</p>
                              ) : (
                                <p className="text-[11px] text-slate-400 mt-0.5">Discussion only</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                requestRemoveItem(
                                  'discussion',
                                  index,
                                  topicValue || `Discussion ${index + 1}`
                                )
                              }
                              className="absolute top-0 right-0 h-8 w-8 inline-flex items-center justify-center text-red-500 bg-red-50 hover:text-red-600 hover:bg-red-100 rounded-bl-[8px] rounded-tr-[7px] border-l border-b border-red-100/80 transition-colors"
                              title="Remove discussion"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="p-4 space-y-4">
                            <div className="space-y-1">
                              <FieldLabel required>Topic / Agenda</FieldLabel>
                              <FieldControl error={form.formState.errors.discussions?.[index]?.topic?.message}>
                                <Input {...form.register(`discussions.${index}.topic`)} placeholder="What was discussed?" className={cn("h-10 rounded-[8px] text-xs font-medium bg-white", form.formState.errors.discussions?.[index]?.topic && "border-red-400")} />
                              </FieldControl>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-[11px] font-medium text-slate-600">Discussion Summary</label>
                                  <span className="text-[10px] text-slate-400 tabular-nums">
                                    {(form.watch(`discussions.${index}.discussionSummary`) || '').length}/700
                                  </span>
                                </div>
                                <Controller
                                  control={form.control}
                                  name={`discussions.${index}.discussionSummary`}
                                  render={({ field }) => (
                                    <Textarea
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder="Details..."
                                      maxLength={700}
                                      className="min-h-[120px] rounded-[8px] text-xs bg-white border-slate-200/80 resize-none focus-visible:ring-[#006699]/30"
                                    />
                                  )}
                                />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <label className="text-[11px] font-medium text-slate-600">Decision Remarks</label>
                                  <span className="text-[10px] text-slate-400 tabular-nums">
                                    {(form.watch(`discussions.${index}.decisionRemarks`) || '').length}/300
                                  </span>
                                </div>
                                <Controller
                                  control={form.control}
                                  name={`discussions.${index}.decisionRemarks`}
                                  render={({ field }) => (
                                    <Textarea
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder="Final decision..."
                                      maxLength={300}
                                      className="min-h-[120px] rounded-[8px] text-xs bg-white border-slate-200/80 resize-none focus-visible:ring-[#006699]/30"
                                    />
                                  )}
                                />
                              </div>
                            </div>

                            <Controller
                              control={form.control}
                              name={`discussions.${index}.isActionRequired`}
                              render={({ field }) => (
                                <div
                                  className={cn(
                                    'w-full flex items-center gap-3 rounded-[10px] border px-3.5 py-3 transition-all duration-200',
                                    field.value
                                      ? 'border-[#006699]/30 bg-gradient-to-r from-[#e8f3f8] via-[#f3f9fc] to-white shadow-[0_8px_20px_-12px_rgba(0,102,153,0.35)]'
                                      : 'border-slate-200/80 bg-[#f8fbfd]'
                                  )}
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className={cn(
                                      'text-[12px] font-semibold leading-tight transition-colors',
                                      field.value ? 'text-[#005580]' : 'text-slate-700'
                                    )}>
                                      Action required
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                      Create a follow-up task from this discussion
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    id={`action-${index}`}
                                    role="switch"
                                    aria-checked={!!field.value}
                                    aria-label="Action required"
                                    onClick={() => field.onChange(!field.value)}
                                    className="inline-flex items-center gap-2 shrink-0 cursor-pointer select-none rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006699]/30"
                                  >
                                    <span
                                      className={cn(
                                        'text-[10px] font-semibold tracking-wide transition-colors',
                                        field.value ? 'text-[#006699]' : 'text-slate-400'
                                      )}
                                    >
                                      {field.value ? 'ON' : 'OFF'}
                                    </span>
                                    <span
                                      aria-hidden
                                      className={cn(
                                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
                                        field.value
                                          ? 'bg-[#006699] shadow-[inset_0_0_0_1px_rgba(0,102,153,0.2)]'
                                          : 'bg-slate-200'
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          'absolute h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(15,23,42,0.25)] transition-transform duration-200',
                                          field.value ? 'translate-x-[22px]' : 'translate-x-[2px]'
                                        )}
                                      />
                                    </span>
                                  </button>
                                </div>
                              )}
                            />

                            {isActionRequired && (
                              <div className="rounded-[8px] border border-[#d7e8f2] bg-[#f8fbff] p-3 space-y-3">
                                <p className="text-[11px] font-semibold text-[#006699] uppercase tracking-wide">Task details</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                  <div className="space-y-1">
                                    <FieldLabel required>Task Category</FieldLabel>
                                    <FieldControl error={form.formState.errors.discussions?.[index]?.operTaskCategoryNo?.message}>
                                      <Controller
                                        control={form.control}
                                        name={`discussions.${index}.operTaskCategoryNo`}
                                        render={({ field }) => (
                                          <Combobox className={cn("rounded-[8px] h-10", form.formState.errors.discussions?.[index]?.operTaskCategoryNo && "border-red-400")}
                                            options={taskFillValues?.category?.map(c => ({ value: c.OperTaskCategoryNo.toString(), label: cleanMasterLabel(c.Category) })) || []}
                                            value={field.value != null && !Number.isNaN(Number(field.value)) ? String(field.value) : ''}
                                            onChange={(val) => field.onChange(toOptionalInt(val))}
                                          />
                                        )}
                                      />
                                    </FieldControl>
                                  </div>
                                  <div className="space-y-1">
                                    <FieldLabel required>Task Type</FieldLabel>
                                    <FieldControl error={form.formState.errors.discussions?.[index]?.operTaskTypeNo?.message}>
                                      <Controller
                                        control={form.control}
                                        name={`discussions.${index}.operTaskTypeNo`}
                                        render={({ field }) => (
                                          <Combobox className={cn("rounded-[8px] h-10", form.formState.errors.discussions?.[index]?.operTaskTypeNo && "border-red-400")}
                                            options={taskFillValues?.type?.map(c => ({ value: c.OperTaskTypeNo.toString(), label: cleanMasterLabel(c["Task Type"]) })) || []}
                                            value={field.value != null && !Number.isNaN(Number(field.value)) ? String(field.value) : ''}
                                            onChange={(val) => field.onChange(toOptionalInt(val))}
                                          />
                                        )}
                                      />
                                    </FieldControl>
                                  </div>
                                  <div className="space-y-1">
                                    <FieldLabel required>Priority</FieldLabel>
                                    <FieldControl error={form.formState.errors.discussions?.[index]?.operTaskPriorityNo?.message}>
                                      <Controller
                                        control={form.control}
                                        name={`discussions.${index}.operTaskPriorityNo`}
                                        render={({ field }) => (
                                          <Combobox className={cn("rounded-[8px] h-10", form.formState.errors.discussions?.[index]?.operTaskPriorityNo && "border-red-400")}
                                            options={taskFillValues?.priority?.map(c => ({ value: c.OperTaskPriorityNo.toString(), label: cleanMasterLabel(c.Priority) })) || []}
                                            value={field.value != null && !Number.isNaN(Number(field.value)) ? String(field.value) : ''}
                                            onChange={(val) => field.onChange(toOptionalInt(val))}
                                          />
                                        )}
                                      />
                                    </FieldControl>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-slate-600">Folder</label>
                                    <Controller
                                      control={form.control}
                                      name={`discussions.${index}.taskFolderNo`}
                                      render={({ field }) => (
                                        <Combobox className="rounded-[8px] h-10"
                                          options={taskFillValues?.folder?.map(c => ({ value: c.TaskFolderNo.toString(), label: cleanMasterLabel(c["Folder Name"]) })) || []}
                                          value={field.value != null && !Number.isNaN(Number(field.value)) ? String(field.value) : ''}
                                          onChange={(val) => field.onChange(toOptionalInt(val))}
                                        />
                                      )}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[11px] font-medium text-slate-600">Task Assign By</label>
                                    <FieldControl error={form.formState.errors.discussions?.[index]?.actionTaskOriginatorNo?.message}>
                                      <Controller
                                        control={form.control}
                                        name={`discussions.${index}.actionTaskOriginatorNo`}
                                        render={({ field }) => (
                                          <UserCombobox className={cn("rounded-[8px] h-10", form.formState.errors.discussions?.[index]?.actionTaskOriginatorNo && "border-red-400")}
                                            value={field.value?.toString() || ''}
                                            onChange={(user: any) => field.onChange(user?.loginNo ? Number(user.loginNo) : undefined)}
                                          />
                                        )}
                                      />
                                    </FieldControl>
                                  </div>
                                  <div className="space-y-1">
                                    <FieldLabel required>Assign Task To</FieldLabel>
                                    <FieldControl error={form.formState.errors.discussions?.[index]?.actionTaskOwnerNo?.message}>
                                      <Controller
                                        control={form.control}
                                        name={`discussions.${index}.actionTaskOwnerNo`}
                                        render={({ field }) => (
                                          <UserCombobox className={cn("rounded-[8px] h-10", form.formState.errors.discussions?.[index]?.actionTaskOwnerNo && "border-red-400")}
                                            value={field.value?.toString() || ''}
                                            onChange={(user: any) => field.onChange(user?.loginNo ? Number(user.loginNo) : undefined)}
                                          />
                                        )}
                                      />
                                    </FieldControl>
                                  </div>
                                  <div className="space-y-1 w-full min-w-0">
                                    <FieldLabel required>Due Date & Time</FieldLabel>
                                    <FieldControl
                                      className="w-full"
                                      error={form.formState.errors.discussions?.[index]?.actionDueDate?.message}
                                    >
                                      <Controller
                                        control={form.control}
                                        name={`discussions.${index}.actionDueDate`}
                                        render={({ field }) => (
                                          <DateTimePicker
                                            className={cn(
                                              "w-full rounded-[8px]",
                                              form.formState.errors.discussions?.[index]?.actionDueDate && "border-red-400"
                                            )}
                                            date={field.value ? new Date(field.value) : undefined}
                                            onChange={(d) => field.onChange(d ? d.toISOString() : '')}
                                            placeholder="Pick a date and time"
                                          />
                                        )}
                                      />
                                    </FieldControl>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </FormSection>

              {/* SECTION 3: Document Details */}
              <FormSection
                title="Document Details"
                icon={FileText}
                headerAction={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-[8px] border-[#006699]/25 text-[#006699] hover:bg-[#e8f3f8] font-medium text-xs px-3"
                    onClick={() => appendDocument({ documentType: 0, documentNo: 0 })}
                  >
                    <Plus size={14} className="mr-1.5" />
                    Add Document
                  </Button>
                }
              >
                {documentFields.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-slate-200 rounded-[8px] bg-[#f8fbfd]">
                    <p className="text-xs text-slate-500 font-medium">No documents added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentFields.map((field, index) => {
                      const docType = form.watch(`documents.${index}.documentType`);
                      const selectedDocTypeObj =
                        docType && Number(docType) > 0
                          ? meetingDocumentTypes.find((d) => d.documentTypeNo === docType)
                          : undefined;
                      const docNoYearly = form.watch(`documents.${index}.documentNoYearly`);
                      const typeName = selectedDocTypeObj?.documentName || '';
                      const summaryLabel = (docNoYearly || '').trim() || typeName;

                      return (
                        <div
                          key={field.id}
                          className="relative rounded-[8px] border border-slate-200/80 bg-white overflow-visible group shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#006699]/30 hover:shadow-[0_8px_24px_-12px_rgba(0,102,153,0.18)] transition-all"
                        >
                          <div className="relative flex items-center gap-3 pl-4 pr-11 py-2.5 bg-gradient-to-r from-[#f4f9fc] to-white border-b border-slate-100 rounded-t-[8px]">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[12px] font-semibold text-[#006699] ring-1 ring-[#006699]/12">
                              {index + 1}
                            </span>
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699] ring-1 ring-[#006699]/10">
                              <FileText size={14} strokeWidth={1.75} />
                            </span>
                            <div className="min-w-0 flex-1">
                              {summaryLabel ? (
                                <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                                  {summaryLabel}
                                </p>
                              ) : (
                                <p className="text-[13px] font-medium text-slate-400 truncate leading-tight">
                                  Document {index + 1}
                                </p>
                              )}
                              {typeName && docNoYearly ? (
                                <p className="text-[11px] text-slate-400 truncate mt-0.5">{typeName}</p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                requestRemoveItem(
                                  'document',
                                  index,
                                  summaryLabel || `Document ${index + 1}`
                                )
                              }
                              className="absolute top-0 right-0 h-8 w-8 inline-flex items-center justify-center text-red-500 bg-red-50 hover:text-red-600 hover:bg-red-100 rounded-bl-[8px] rounded-tr-[7px] border-l border-b border-red-100/80 transition-colors"
                              title="Remove document"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <FieldLabel required>Document Name</FieldLabel>
                                <FieldControl
                                  error={
                                    form.formState.errors.documents?.[index]?.documentType?.message
                                  }
                                >
                                  <Controller
                                    control={form.control}
                                    name={`documents.${index}.documentType`}
                                    render={({ field: typeField }) => {
                                      const selectedType =
                                        typeField.value && Number(typeField.value) > 0
                                          ? String(typeField.value)
                                          : '__none__';
                                      return (
                                        <Select
                                          value={selectedType}
                                          onValueChange={(val) => {
                                            if (val === '__none__') {
                                              typeField.onChange(0);
                                              form.setValue(`documents.${index}.documentNo`, 0);
                                              form.setValue(
                                                `documents.${index}.documentNoYearly`,
                                                ''
                                              );
                                              void form.trigger(
                                                `documents.${index}.documentType`
                                              );
                                              void form.trigger(
                                                `documents.${index}.documentNo`
                                              );
                                              return;
                                            }
                                            typeField.onChange(parseInt(val, 10));
                                            form.setValue(`documents.${index}.documentNo`, 0);
                                            form.setValue(
                                              `documents.${index}.documentNoYearly`,
                                              ''
                                            );
                                            void form.trigger(
                                              `documents.${index}.documentType`
                                            );
                                          }}
                                        >
                                          <SelectTrigger
                                            className={cn(
                                              'h-10 rounded-[8px] bg-white text-xs shadow-none border-slate-200/80',
                                              selectedType === '__none__' && 'text-slate-400',
                                              form.formState.errors.documents?.[index]
                                                ?.documentType && 'border-red-400'
                                            )}
                                          >
                                            <SelectValue placeholder="Select document name" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem
                                              value="__none__"
                                              className="text-slate-400"
                                            >
                                              Select document name
                                            </SelectItem>
                                            {meetingDocumentTypes.map((d) => (
                                              <SelectItem
                                                key={d.documentTypeNo}
                                                value={d.documentTypeNo.toString()}
                                              >
                                                {d.documentName}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      );
                                    }}
                                  />
                                </FieldControl>
                              </div>

                              <div className="space-y-1">
                                <FieldLabel required>Document No</FieldLabel>
                                <FieldControl
                                  error={
                                    form.formState.errors.documents?.[index]?.documentNo?.message
                                  }
                                >
                                  <Controller
                                    control={form.control}
                                    name={`documents.${index}.documentNo`}
                                    render={({ field: noField }) => (
                                      <DocumentCombobox
                                        formNo={selectedDocTypeObj?.formNo}
                                        contextStr={selectedDocTypeObj?.context}
                                        displayColumnsStr={selectedDocTypeObj?.displayColumns}
                                        value={
                                          Number(noField.value) > 0
                                            ? String(noField.value)
                                            : ''
                                        }
                                        initialLabel={
                                          form.watch(`documents.${index}.documentNoYearly`) ||
                                          undefined
                                        }
                                        onChange={(doc: any) => {
                                          if (!doc) {
                                            noField.onChange(0);
                                            form.setValue(
                                              `documents.${index}.documentNoYearly`,
                                              ''
                                            );
                                            void form.trigger(
                                              `documents.${index}.documentNo`
                                            );
                                          } else {
                                            const no =
                                              doc.id ||
                                              doc.documentNo ||
                                              doc.DocumentNo ||
                                              doc.Value ||
                                              0;
                                            noField.onChange(parseInt(no.toString()) || 0);
                                            form.setValue(
                                              `documents.${index}.documentNoYearly`,
                                              doc.documentNoYearly ||
                                                doc.DocumentNoYearly ||
                                                doc.Text ||
                                                doc.name ||
                                                ''
                                            );
                                            void form.trigger(
                                              `documents.${index}.documentNo`
                                            );
                                          }
                                        }}
                                        placeholder={
                                          Number(docType) > 0
                                            ? 'Search document...'
                                            : 'Select Document Name first'
                                        }
                                        disabled={!(Number(docType) > 0)}
                                        className={cn(
                                          'h-10 rounded-[8px] bg-white text-xs shadow-none border-slate-200/80',
                                          form.formState.errors.documents?.[index]?.documentNo &&
                                            'border-red-400',
                                          !(Number(docType) > 0) && 'bg-slate-50/80 text-slate-400'
                                        )}
                                      />
                                    )}
                                  />
                                </FieldControl>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </FormSection>

              {/* SECTION 5: Attachments */}
              <FormSection title="Attachments" icon={Paperclip}>
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = e.dataTransfer?.files;
                      if (files?.length) processFiles(Array.from(files));
                    }}
                    className="group relative flex items-center gap-3.5 rounded-[8px] border border-dashed border-[#006699]/25 bg-gradient-to-r from-[#f4f9fc] to-white px-3.5 py-3 cursor-pointer transition-all hover:border-[#006699]/45 hover:shadow-[0_8px_24px_-16px_rgba(0,102,153,0.35)]"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="application/pdf,image/*"
                      onChange={handleFileSelection}
                      className="hidden"
                    />
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-white text-[#006699] ring-1 ring-[#006699]/12 shadow-sm group-hover:bg-[#e8f3f8] transition-colors">
                      <UploadCloud size={18} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-slate-800 leading-tight">
                        Drop files here or{' '}
                        <span className="text-[#006699] underline decoration-[#006699]/30 underline-offset-2">
                          browse
                        </span>
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                        PDF &amp; Images · Max 10MB each
                      </p>
                    </div>
                    <span className="hidden sm:inline-flex h-8 items-center rounded-[7px] bg-[#006699] px-3 text-[11px] font-semibold text-white shadow-sm shadow-[#006699]/20 group-hover:bg-[#005580] transition-colors">
                      Upload
                    </span>
                  </div>

                  {uploadingFiles.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-0.5">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Uploading
                        </h4>
                        <span className="text-[10px] font-medium text-slate-400 tabular-nums">
                          {uploadingFiles.length}
                        </span>
                      </div>
                      <div className="rounded-[8px] border border-slate-200/80 overflow-hidden divide-y divide-slate-100 bg-white">
                        {uploadingFiles.map((file) => (
                          <motion.div
                            key={file.tempId}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className={cn(
                              'flex items-center gap-2.5 px-2.5 py-2',
                              file.status === 'failed' ? 'bg-red-50/60' : 'bg-white'
                            )}
                          >
                            <span
                              className={cn(
                                'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ring-1',
                                file.status === 'failed'
                                  ? 'bg-red-50 text-red-600 ring-red-200'
                                  : 'bg-[#e8f3f8] text-[#006699] ring-[#006699]/12'
                              )}
                            >
                              {file.status !== 'failed' ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : file.name.toLowerCase().endsWith('.pdf') ? (
                                <FileText size={14} />
                              ) : (
                                <ImageIcon size={14} />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">
                                {file.name}
                              </p>
                              <p
                                className={cn(
                                  'text-[10px] font-medium mt-0.5',
                                  file.status === 'failed' ? 'text-red-600' : 'text-slate-400'
                                )}
                              >
                                {file.status === 'failed' ? 'Upload failed' : file.status}
                              </p>
                            </div>
                            <div className="flex items-center gap-0.5 shrink-0">
                              {file.status === 'failed' && (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleRetryUpload(file.tempId)}
                                  className="h-7 w-7 rounded-[7px] text-red-600 hover:bg-red-50"
                                >
                                  <RefreshCw size={12} />
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveUploading(file.tempId)}
                                className="h-7 w-7 rounded-[7px] text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                              >
                                <X size={12} />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(() => {
                    const attachments = form.watch('attachments') || [];
                    if (attachments.length === 0) return null;
                    return (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-0.5">
                          <h4 className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Attached
                          </h4>
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e8f3f8] px-1.5 text-[10px] font-semibold text-[#006699] tabular-nums">
                            {attachments.length}
                          </span>
                        </div>
                        <div className="rounded-[8px] border border-slate-200/80 overflow-hidden divide-y divide-slate-100 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                          {attachments.map((file: any) => {
                            const isPdf = (file.name || '').toLowerCase().endsWith('.pdf');
                            return (
                              <motion.div
                                key={file.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group/file flex items-center gap-2.5 px-2.5 py-2 hover:bg-[#f8fbfd] transition-colors"
                              >
                                <span
                                  className={cn(
                                    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ring-1',
                                    isPdf
                                      ? 'bg-[#e8f3f8] text-[#006699] ring-[#006699]/12'
                                      : 'bg-violet-50 text-violet-600 ring-violet-200/70'
                                  )}
                                >
                                  {isPdf ? <FileText size={14} /> : <ImageIcon size={14} />}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">
                                      {file.name}
                                    </p>
                                    {file.size ? (
                                      <span className="shrink-0 text-[10px] font-medium text-slate-400 tabular-nums">
                                        {formatFileSize(file.size)}
                                      </span>
                                    ) : null}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      attachmentService.downloadAttachment(file.id, file.name)
                                    }
                                    className="mt-0.5 text-[10px] font-semibold text-[#006699] hover:underline underline-offset-2"
                                  >
                                    View
                                  </button>
                                </div>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleRemoveAttachment(file.id, file.name)}
                                  className="h-7 w-7 shrink-0 rounded-[7px] text-slate-400 opacity-70 group-hover/file:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all"
                                >
                                  <Trash size={12} />
                                </Button>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </FormSection>

            </form>
        </div>
      </div>

      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="rounded-[16px] max-w-sm p-0 border-none shadow-2xl bg-white overflow-hidden [&>button]:hidden data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-[2%]">
          {itemToDelete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              <DialogHeader className="p-6 pb-3 text-center sm:text-center items-center">
                <motion.div
                  initial={{ scale: 0.6, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.05 }}
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 ring-8 ring-red-50/60"
                >
                  <Trash2 size={22} strokeWidth={1.75} />
                </motion.div>
                <DialogTitle className="text-base font-semibold text-slate-800 tracking-tight">
                  {itemToDelete.type === 'participant'
                    ? 'Remove participant?'
                    : itemToDelete.type === 'discussion'
                      ? 'Remove discussion?'
                      : 'Remove document?'}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-2 leading-relaxed">
                  <span className="font-medium text-slate-700">“{itemToDelete.label}”</span>
                  {' '}will be removed from this meeting note. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="p-4 pt-2 bg-slate-50/80 flex flex-row justify-end gap-2 rounded-b-[16px]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setItemToDelete(null)}
                  className="h-10 px-4 rounded-[8px] text-xs font-medium text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-none"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={confirmRemoveItem}
                  className="h-10 px-5 rounded-[8px] bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-md shadow-red-600/20 transition-transform hover:scale-[1.02] active:scale-95"
                >
                  Delete
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!attachmentToDelete} onOpenChange={(open) => !open && !isDeletingAttachment && setAttachmentToDelete(null)}>
        <DialogContent className="rounded-[16px] max-w-sm p-0 border-none shadow-2xl bg-white overflow-hidden [&>button]:hidden data-[state=open]:zoom-in-95">
          {attachmentToDelete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            >
              <DialogHeader className="p-6 pb-3 text-center sm:text-center items-center">
                <motion.div
                  initial={{ scale: 0.6, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.05 }}
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 ring-8 ring-red-50/60"
                >
                  <Trash2 size={22} strokeWidth={1.75} />
                </motion.div>
                <DialogTitle className="text-base font-semibold text-slate-800 tracking-tight">Remove attachment?</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 mt-2 leading-relaxed">
                  <span className="font-medium text-slate-700">“{attachmentToDelete.name}”</span>
                  {' '}will be deleted. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="p-4 pt-2 bg-slate-50/80 flex flex-row justify-end gap-2 rounded-b-[16px]">
                <Button type="button" variant="outline" disabled={isDeletingAttachment} onClick={() => setAttachmentToDelete(null)} className="h-10 px-4 rounded-[8px] text-xs font-medium text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-none">Cancel</Button>
                <Button disabled={isDeletingAttachment} onClick={confirmRemoveAttachment} className="h-10 px-5 rounded-[8px] bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-md shadow-red-600/20 gap-0.5 transition-transform hover:scale-[1.02] active:scale-95">
                  {isDeletingAttachment ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                  Delete
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="rounded-3xl max-w-md p-0 border-none shadow-xl bg-white/95 backdrop-blur-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-base font-medium text-slate-800 flex items-center gap-2"><AlertCircle size={18} className="text-amber-500" /> Invalid Files Skipped</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">Some files were skipped due to validation errors.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2 max-h-[300px] overflow-y-auto">
            <ul className="space-y-3">
              {invalidFiles.map((f, i) => (
                <li key={i} className="bg-amber-50 rounded-[8px] p-3 border border-amber-100 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-700 truncate">{f.name} <span className="text-slate-400 font-medium">{f.size}</span></span>
                  <span className="text-[10px] text-amber-600 font-medium">{f.reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="p-4 pt-2 mt-4 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button type="button" onClick={() => setShowWarningDialog(false)} className="h-10 px-5 rounded-[8px] bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium">Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="rounded-3xl max-w-sm p-6 border-none shadow-2xl bg-white select-none">
          <DialogHeader className="pb-3 border-b border-slate-150">
            <DialogTitle className="text-base font-medium text-slate-800">Add Meeting Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <FieldLabel required className="text-xs font-semibold text-slate-700">Category Name</FieldLabel>
              <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Enter category name" className="h-10 rounded-[8px]" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
              <Button type="button" disabled={isSavingCategory || !newCategoryName.trim()} onClick={async () => {
                setIsSavingCategory(true);
                try {
                  const payload = {
                    meetingCategoryName: newCategoryName.trim(),
                    companyNo: parseInt(companyNoStr),
                    isActive: true
                  };
                  const res = await apiService.post<any>('/api/master/meeting-categories/save', payload);
                  const newId = res?.data?.id || res?.data?.meetingCategoryNo || res?.id || res?.meetingCategoryNo;
                  if (newId) {
                    setMeetingCategories(prev => [...prev, { meetingCategoryNo: newId, meetingCategoryName: newCategoryName.trim() }]);
                    form.setValue('meetingCategoryNo', newId.toString(), { shouldValidate: true });
                    setCategoryModalOpen(false);
                    setNewCategoryName('');
                    toast.success("Category saved");
                  }
                } catch (err) {
                  toast.error("Failed to save category");
                } finally {
                  setIsSavingCategory(false);
                }
              }}>
                {isSavingCategory ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Type Modal */}
      <Dialog open={typeModalOpen} onOpenChange={setTypeModalOpen}>
        <DialogContent className="rounded-3xl max-w-sm p-6 border-none shadow-2xl bg-white select-none">
          <DialogHeader className="pb-3 border-b border-slate-150">
            <DialogTitle className="text-base font-medium text-slate-800">Add Meeting Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <FieldLabel required className="text-xs font-semibold text-slate-700">Type Name</FieldLabel>
              <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Enter type name" className="h-10 rounded-[8px]" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setTypeModalOpen(false)}>Cancel</Button>
              <Button type="button" disabled={isSavingType || !newTypeName.trim()} onClick={async () => {
                setIsSavingType(true);
                try {
                  const payload = {
                    meetingTypeName: newTypeName.trim(),
                    companyNo: parseInt(companyNoStr),
                    isActive: true
                  };
                  const res = await apiService.post<any>('/api/master/meeting-types/save', payload);
                  const newId = res?.data?.id || res?.data?.meetingTypeNo || res?.id || res?.meetingTypeNo;
                  if (newId) {
                    setMeetingTypes(prev => [...prev, { meetingTypeNo: newId, meetingTypeName: newTypeName.trim() }]);
                    form.setValue('meetingTypeNo', newId.toString(), { shouldValidate: true });
                    setTypeModalOpen(false);
                    setNewTypeName('');
                    toast.success("Type saved");
                  }
                } catch (err) {
                  toast.error("Failed to save type");
                } finally {
                  setIsSavingType(false);
                }
              }}>
                {isSavingType ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
