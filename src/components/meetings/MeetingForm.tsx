import React, { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Info, Users, Plus, Trash2, Edit2, Paperclip, MessageSquare, FileText, Check, X, Loader2 } from 'lucide-react';
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


function FormSection({ title, icon: Icon, children, headerAction }: { title?: string, icon?: any, children?: React.ReactNode, headerAction?: React.ReactNode }) {
  return (
    <div className="space-y-0 pt-2 first:pt-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 border-l-4 border-[#006699] -ml-4 sm:-ml-8 pl-3 sm:pl-7">
        <div className="flex items-center gap-0.5">
          {Icon && <Icon size={16} className="text-[#006699]" />}
          {title && <h3 className="text-sm font-medium text-slate-800">{title}</h3>}
        </div>
        {headerAction}
      </div>
      <div className="pl-0 mt-3">
        {children}
      </div>
    </div>
  );
}

function TextareaWithPopover({
  value,
  onChange,
  placeholder,
  maxLength = 1000
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  useEffect(() => {
    if (isOpen) {
      setTempValue(value || '');
    }
  }, [isOpen, value]);

  const handleSave = () => {
    onChange(tempValue);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsOpen(false);
  };

  return (
    <div className="relative flex items-center">
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 rounded-lg text-xs bg-white pr-7"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="absolute right-1.5 p-1 text-slate-400 hover:text-[#006699] transition-colors rounded">
            <Edit2 size={12} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[340px] p-3 shadow-xl shadow-slate-200/50 rounded-xl border border-slate-200" align="end" side="bottom">
          <div className="space-y-2">
            <Textarea
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              placeholder={placeholder}
              className="min-h-[120px] text-sm resize-none focus-visible:ring-1 focus-visible:ring-[#006699] p-3"
              maxLength={maxLength}
            />
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400 font-medium">
                {tempValue.length}/{maxLength}
              </span>
              <div className="flex gap-1.5">
                <button type="button" onClick={handleSave} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Save">
                  <Check size={14} />
                </button>
                <button type="button" onClick={handleCancel} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-md transition-colors" title="Cancel">
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function MeetingForm({ initialData, onComplete, meetingNotesNo }: { initialData?: any, onComplete?: () => void, meetingNotesNo?: number }) {
  const { company: authCompanies } = useAuthStore();
  const companyNoStr = authCompanies?.[0]?.CompanyNo?.toString() || authCompanies?.[0]?.companyNo?.toString() || '1';
  const navigate = useNavigate();

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
    <div className="flex flex-col h-full overflow-hidden bg-slate-50/50 absolute inset-0">
      {/* Header & Breadcrumb */}
      <div className="shrink-0 sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-2 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all duration-200">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Button variant="ghost" size="icon" onClick={() => navigate('/meetings')} className="shrink-0 h-8 w-8 mr-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 hidden sm:flex">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m15 18-6-6 6-6" /></svg>
          </Button>
          <div className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap">
            <span className="text-slate-500 hover:text-[#006699] cursor-pointer transition-colors" onClick={() => navigate('/meetings')}>Meeting Notes</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-800">{meetingNotesNo || initialData?.meetingNotesNo ? 'Edit Meeting Note' : 'Create Meeting Note'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg font-semibold shadow-sm text-xs" onClick={() => navigate('/meetings')}>Cancel</Button>
          <Button disabled={form.formState.isSubmitting} type="submit" size="sm" className="h-8 rounded-lg bg-[#006699] hover:bg-[#005580] text-white font-bold shadow-md shadow-[#006699]/20 text-xs px-4" onClick={form.handleSubmit(onSubmit, (errors) => console.log('Validation Errors:', errors))}>
            {form.formState.isSubmitting ? (meetingNotesNo || initialData?.meetingNotesNo ? 'Updating...' : 'Saving...') : (meetingNotesNo || initialData?.meetingNotesNo ? 'Update' : 'Save')}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50">
        <div className="w-full mx-auto p-2 sm:p-4 lg:p-5">
          <Card className="p-3 sm:p-5 bg-white shadow-lg shadow-slate-200/40 rounded-2xl border border-slate-100">
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => console.log('Validation Errors:', errors))} className="space-y-6">

              {/* SECTION 1: Basic Information */}
              <FormSection
                title="Meeting Detail"
                icon={Info}
                headerAction={
                  <Controller
                    control={form.control}
                    name="documentStatusNo"
                    render={({ field }) => (
                      <Select
                        value={field.value?.toString()}
                        onValueChange={(val) => field.onChange(parseInt(val))}
                      >
                        <SelectTrigger className="h-8 rounded-full bg-slate-50 border-slate-200 text-xs w-[140px] shadow-sm font-medium">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2">
                  <div className="space-y-1.5 md:col-span-2 lg:col-span-3 xl:col-span-4">
                    <label className="text-xs font-semibold text-slate-700">Meeting Title <span className="text-red-500">*</span></label>
                    <Input {...form.register('meetingTitle')} placeholder="e.g. Weekly Sync with Client" className="h-9 rounded-lg" />
                    {form.formState.errors.meetingTitle && <span className="text-xs text-red-500">{form.formState.errors.meetingTitle.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Meeting Category <span className="text-red-500">*</span></label>
                    <Controller
                      control={form.control}
                      name="meetingCategoryNo"
                      render={({ field }) => (
                        <Combobox className="rounded-lg h-9 w-full"
                          options={meetingCategories.map(c => ({ value: (c.id || c.meetingCategoryNo).toString(), label: c.name || c.meetingCategoryName }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select Category"
                          onAddNew={() => setCategoryModalOpen(true)}
                          addNewLabel="Add Category"
                        />
                      )}
                    />
                    {form.formState.errors.meetingCategoryNo && <span className="text-xs text-red-500">{form.formState.errors.meetingCategoryNo.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Meeting Type <span className="text-red-500">*</span></label>
                    <Controller
                      control={form.control}
                      name="meetingTypeNo"
                      render={({ field }) => (
                        <Combobox className="rounded-lg h-9 w-full"
                          options={meetingTypes.map(t => ({ value: (t.id || t.meetingTypeNo).toString(), label: t.name || t.meetingTypeName }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select Type"
                          onAddNew={() => setTypeModalOpen(true)}
                          addNewLabel="Add Type"
                        />
                      )}
                    />
                    {form.formState.errors.meetingTypeNo && <span className="text-xs text-red-500">{form.formState.errors.meetingTypeNo.message}</span>}
                  </div>


                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Company <span className="text-red-500">*</span></label>
                    <Controller
                      control={form.control}
                      name="companyNo"
                      render={({ field }) => (
                        <Combobox className="rounded-lg"
                          options={taskFillValues?.taskCompany?.map(c => ({ value: c.CompanyNo?.toString() || c.companyNo?.toString() || c.OperTaskCompanyNo?.toString() || '', label: c.AliasName || c.companyName || c.name || c.AliasName || c.Code || 'Unknown Company' })) || []}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select Company"
                        />
                      )}
                    />
                    {form.formState.errors.companyNo && <span className="text-xs text-red-500">{form.formState.errors.companyNo.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Location <span className="text-red-500">*</span></label>
                    <Controller
                      control={form.control}
                      name="operLocationNo"
                      render={({ field }) => (
                        <Combobox className="rounded-lg"
                          options={taskFillValues?.location?.filter(l => l.Location.toLowerCase() !== 'all' && l.Location.toLowerCase() !== '[all]').map(l => ({ value: l.OperLocationNo.toString(), label: l.Location })) || []}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select Location"
                        />
                      )}
                    />
                    {form.formState.errors.operLocationNo && <span className="text-xs text-red-500">{form.formState.errors.operLocationNo.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Meeting Mode <span className="text-red-500">*</span></label>
                    <Controller
                      control={form.control}
                      name="meetingModeNo"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="h-9 rounded-lg"><SelectValue placeholder="Select Mode" /></SelectTrigger>
                          <SelectContent>
                            {meetingModes.map(m => (
                              <SelectItem key={m.meetingModeNo} value={m.meetingModeNo.toString()}>{m.meetingModeName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Start Date & Time <span className="text-red-500">*</span></label>
                    <Controller
                      control={form.control}
                      name="meetingStartDateTime"
                      render={({ field }) => (
                        <DateTimePicker className="rounded-lg" date={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? d.toISOString() : '')} />
                      )}
                    />
                    {form.formState.errors.meetingStartDateTime && <span className="text-xs text-red-500">{form.formState.errors.meetingStartDateTime.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">End Date & Time <span className="text-red-500">*</span></label>
                    <Controller
                      control={form.control}
                      name="meetingEndDateTime"
                      render={({ field }) => (
                        <DateTimePicker className="rounded-lg" date={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? d.toISOString() : '')} />
                      )}
                    />
                    {form.formState.errors.meetingEndDateTime && <span className="text-xs text-red-500">{form.formState.errors.meetingEndDateTime.message}</span>}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Meeting Duration (In Minutes)</label>
                    <Input value={form.watch('durationMinutes') || 0} readOnly placeholder="0" className="h-9 rounded-lg bg-slate-50/50 text-xs text-slate-500 text-right" />
                  </div>

                  <div className="space-y-1.5 md:col-span-2 lg:col-span-3 xl:col-span-4">
                    <label className="text-xs font-semibold text-slate-700">Meeting Link (URL)</label>
                    <Input {...form.register('meetingMinutesUrl')} placeholder="https://..." className="h-9 rounded-lg" />
                    {form.formState.errors.meetingMinutesUrl && <span className="text-xs text-red-500">{form.formState.errors.meetingMinutesUrl.message}</span>}
                  </div>
                </div>
              </FormSection>

              {/* SECTION 2: Participants */}
              <FormSection
                title="Participants"
                icon={Users}
                headerAction={
                  <Button type="button" onClick={() => appendParticipant({ participantType: 1 })} variant="outline" size="sm" className="h-8 rounded-lg text-xs">
                    <Plus size={14} className="mr-1" /> Add Participant
                  </Button>
                }
              >
                {participantFields.length === 0 ? (
                  <div className="text-center p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50/50 flex flex-col items-center justify-center">
                    <p className="text-xs text-slate-500 font-medium">No participants added yet.</p>
                    {(form.formState.errors.participants?.message || form.formState.errors.participants?.root?.message) && (
                      <p className="text-xs text-red-500 font-medium mt-1">{(form.formState.errors.participants?.message || form.formState.errors.participants?.root?.message) as string}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {participantFields.map((field, index) => {
                      const participantType = form.watch(`participants.${index}.participantType`);
                      return (
                        <div key={field.id} className="relative px-3 py-1 rounded-lg border border-slate-100 bg-slate-50/50 flex gap-3 items-start group">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">

                            {/* Participant Type Selection */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
                              <Controller
                                control={form.control}
                                name={`participants.${index}.participantType`}
                                render={({ field }) => (
                                  <Select value={field.value.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                                    <SelectTrigger className="h-8 rounded-lg bg-white text-xs min-w-[150px]"><SelectValue /></SelectTrigger>
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
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select User</label>
                                  <Controller
                                    control={form.control}
                                    name={`participants.${index}.userNo`}
                                    render={({ field }) => (
                                      <UserCombobox className="rounded-lg h-8 text-xs"
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
                                    )}
                                  />
                                  {form.formState.errors.participants?.[index]?.userNo && (
                                    <span className="text-[10px] text-red-500">{form.formState.errors.participants[index]?.userNo?.message}</span>
                                  )}
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username</label>
                                  <Input value={form.watch(`participants.${index}.participantName`) || ''} disabled placeholder="Username" className="h-8 rounded-lg bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                                {/* <div className="space-y-1 md:col-span-1 lg:col-span-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                  <Input value={form.watch(`participants.${index}.email`) || ''} disabled placeholder="Email" className="h-8 rounded-lg bg-slate-50/50 text-xs text-slate-500" />
                                </div> */}
                              </>
                            )}

                            {/* Internal (Employee) Fields */}
                            {participantType === 2 && (
                              <>
                                <div className="space-y-1 md:col-span-1 lg:col-span-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee</label>
                                  <Controller
                                    control={form.control}
                                    name={`participants.${index}.empNo`}
                                    render={({ field }) => (
                                      <EmployeeCombobox className="rounded-lg h-8 text-xs"
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
                                    )}
                                  />
                                  {form.formState.errors.participants?.[index]?.empNo && (
                                    <span className="text-[10px] text-red-500">{form.formState.errors.participants[index]?.empNo?.message}</span>
                                  )}
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee Code</label>
                                  <Input value={form.watch(`participants.${index}.participantName`) || ''} disabled placeholder="Employee Code" className="h-8 rounded-lg bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                  <Input value={form.watch(`participants.${index}.email`) || ''} disabled placeholder="Email" className="h-8 rounded-lg bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                              </>
                            )}

                            {/* External Fields */}
                            {participantType === 3 && (
                              <>
                                <div className="space-y-1 md:col-span-1 lg:col-span-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Name</label>
                                  <Input {...form.register(`participants.${index}.participantName`)} placeholder="Name" className="h-8 rounded-lg bg-white text-xs" maxLength={100} />
                                  {form.formState.errors.participants?.[index]?.participantName && (
                                    <span className="text-[10px] text-red-500">{form.formState.errors.participants[index]?.participantName?.message}</span>
                                  )}
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Company</label>
                                  <Input {...form.register(`participants.${index}.companyName`)} placeholder="Company" className="h-8 rounded-lg bg-white text-xs" maxLength={100} />
                                  {form.formState.errors.participants?.[index]?.companyName && (
                                    <span className="text-[10px] text-red-500">{form.formState.errors.participants[index]?.companyName?.message}</span>
                                  )}
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                  <Input {...form.register(`participants.${index}.email`)} placeholder="Email" className="h-8 rounded-lg bg-white text-xs" maxLength={100} />
                                  {form.formState.errors.participants?.[index]?.email && (
                                    <span className="text-[10px] text-red-500">{form.formState.errors.participants[index]?.email?.message}</span>
                                  )}
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Designation</label>
                                  <Input {...form.register(`participants.${index}.designation`)} placeholder="Designation" className="h-8 rounded-lg bg-white text-xs" maxLength={100} />
                                  {form.formState.errors.participants?.[index]?.designation && (
                                    <span className="text-[10px] text-red-500">{form.formState.errors.participants[index]?.designation?.message}</span>
                                  )}
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact No</label>
                                  <Input {...form.register(`participants.${index}.contactNo`)} placeholder="Contact No" className="h-8 rounded-lg bg-white text-xs" maxLength={20} />
                                  {form.formState.errors.participants?.[index]?.contactNo && (
                                    <span className="text-[10px] text-red-500">{form.formState.errors.participants[index]?.contactNo?.message}</span>
                                  )}
                                </div>
                              </>
                            )}

                            {/* BusinessEntity Fields */}
                            {participantType === 4 && (
                              <>
                                <div className="space-y-1 md:col-span-1 lg:col-span-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Business Entity Contact</label>
                                  <Controller
                                    control={form.control}
                                    name={`participants.${index}.participantName`}
                                    render={({ field }) => (
                                      <BusinessEntityCombobox className="rounded-lg h-8 text-xs"
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
                                    )}
                                  />
                                  {form.formState.errors.participants?.[index]?.participantName && (
                                    <span className="text-[10px] text-red-500">{form.formState.errors.participants[index]?.participantName?.message}</span>
                                  )}
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Business Entity</label>
                                  <Input value={form.watch(`participants.${index}.companyName`) || ''} disabled placeholder="Business Entity" className="h-8 rounded-lg bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Designation</label>
                                  <Input value={form.watch(`participants.${index}.designation`) || ''} disabled placeholder="Designation" className="h-8 rounded-lg bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</label>
                                  <Input value={(form.watch(`participants.${index}` as any)?.department) || ''} disabled placeholder="Department" className="h-8 rounded-lg bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                                <div className="space-y-1 md:col-span-1 lg:col-span-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email</label>
                                  <Input value={form.watch(`participants.${index}.email`) || ''} disabled placeholder="Email" className="h-8 rounded-lg bg-slate-50/50 text-xs text-slate-500" />
                                </div>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeParticipant(index)}
                            className="mt-5 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
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
                  <Button type="button" onClick={() => appendDiscussion({ topic: '', isActionRequired: false })} variant="outline" size="sm" className="h-8 rounded-lg text-xs border-[#006699]/30 text-[#006699] hover:bg-[#006699]/10">
                    <Plus size={14} className="mr-1" /> Add Discussion Point
                  </Button>
                }
              >
                {discussionFields.length === 0 ? (
                  null
                ) : (
                  <div className="w-full overflow-x-auto pb-4">
                    <table className="w-full text-xs text-left whitespace-nowrap">
                      <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-2 py-2 min-w-[200px]">Topic / Agenda <span className="text-red-500">*</span></th>
                          <th className="px-2 py-2 min-w-[150px]">Discussion Summary</th>
                          <th className="px-2 py-2 min-w-[150px]">Decision Remarks</th>
                          <th className="px-2 py-2 min-w-[120px]">Action Required</th>
                          <th className="px-2 py-2 min-w-[150px]">Task Category</th>
                          <th className="px-2 py-2 min-w-[150px]">Task Type</th>
                          <th className="px-2 py-2 min-w-[120px]">Priority</th>
                          <th className="px-2 py-2 min-w-[120px]">Folder</th>
                          <th className="px-2 py-2 min-w-[180px]">Task Originator</th>
                          <th className="px-2 py-2 min-w-[180px]">Assign Task To</th>
                          <th className="px-2 py-2 min-w-[180px]">Due Date</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {discussionFields.map((field, index) => {
                          const isActionRequired = form.watch(`discussions.${index}.isActionRequired`);
                          return (
                            <tr key={field.id} className="group hover:bg-slate-50/50">
                              <td className="px-2 py-2 align-top">
                                <Input {...form.register(`discussions.${index}.topic`)} placeholder="What was discussed?" className="h-8 rounded-lg text-xs font-medium bg-white" />
                                {form.formState.errors.discussions?.[index]?.topic && (
                                  <span className="text-[10px] text-red-500 mt-1 block">{form.formState.errors.discussions[index]?.topic?.message}</span>
                                )}
                              </td>
                              <td className="px-2 py-2 align-top">
                                <Controller
                                  control={form.control}
                                  name={`discussions.${index}.discussionSummary`}
                                  render={({ field }) => (
                                    <TextareaWithPopover
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder="Details..."
                                      maxLength={700}
                                    />
                                  )}
                                />
                              </td>
                              <td className="px-2 py-2 align-top">
                                <Controller
                                  control={form.control}
                                  name={`discussions.${index}.decisionRemarks`}
                                  render={({ field }) => (
                                    <TextareaWithPopover
                                      value={field.value || ''}
                                      onChange={field.onChange}
                                      placeholder="Final decision..."
                                      maxLength={300}
                                    />
                                  )}
                                />
                              </td>
                              <td className="px-2 py-2 align-top">
                                <Controller
                                  control={form.control}
                                  name={`discussions.${index}.isActionRequired`}
                                  render={({ field }) => (
                                    <div className="flex items-center h-8 gap-2">
                                      <Checkbox checked={field.value} onCheckedChange={field.onChange} id={`action-${index}`} className="data-[state=checked]:bg-[#006699] data-[state=checked]:border-[#006699]" />
                                    </div>
                                  )}
                                />
                              </td>
                              <td className="px-2 py-2 align-top bg-[#f8fbff]/50 border-l border-[#e1ecf7]/50">
                                {isActionRequired && (
                                  <>
                                    <Controller
                                      control={form.control}
                                      name={`discussions.${index}.operTaskCategoryNo`}
                                      render={({ field }) => (
                                        <Combobox className="rounded-lg"
                                          options={taskFillValues?.category?.map(c => ({ value: c.OperTaskCategoryNo.toString(), label: c.Category })) || []}
                                          value={field.value?.toString() || ''}
                                          onChange={(val) => field.onChange(parseInt(val))}
                                        />
                                      )}
                                    />
                                    {form.formState.errors.discussions?.[index]?.operTaskCategoryNo && (
                                      <span className="text-[10px] text-red-500 mt-1 block">{form.formState.errors.discussions[index]?.operTaskCategoryNo?.message}</span>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="px-2 py-2 align-top bg-[#f8fbff]/50">
                                {isActionRequired && (
                                  <>
                                    <Controller
                                      control={form.control}
                                      name={`discussions.${index}.operTaskTypeNo`}
                                      render={({ field }) => (
                                        <Combobox className="rounded-lg"
                                          options={taskFillValues?.type?.map(c => ({ value: c.OperTaskTypeNo.toString(), label: c["Task Type"] })) || []}
                                          value={field.value?.toString() || ''}
                                          onChange={(val) => field.onChange(parseInt(val))}
                                        />
                                      )}
                                    />
                                    {form.formState.errors.discussions?.[index]?.operTaskTypeNo && (
                                      <span className="text-[10px] text-red-500 mt-1 block">{form.formState.errors.discussions[index]?.operTaskTypeNo?.message}</span>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="px-2 py-2 align-top bg-[#f8fbff]/50">
                                {isActionRequired && (
                                  <>
                                    <Controller
                                      control={form.control}
                                      name={`discussions.${index}.operTaskPriorityNo`}
                                      render={({ field }) => (
                                        <Combobox className="rounded-lg"
                                          options={taskFillValues?.priority?.map(c => ({ value: c.OperTaskPriorityNo.toString(), label: c.Priority })) || []}
                                          value={field.value?.toString() || ''}
                                          onChange={(val) => field.onChange(parseInt(val))}
                                        />
                                      )}
                                    />
                                    {form.formState.errors.discussions?.[index]?.operTaskPriorityNo && (
                                      <span className="text-[10px] text-red-500 mt-1 block">{form.formState.errors.discussions[index]?.operTaskPriorityNo?.message}</span>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="px-2 py-2 align-top bg-[#f8fbff]/50">
                                {isActionRequired && (
                                  <Controller
                                    control={form.control}
                                    name={`discussions.${index}.taskFolderNo`}
                                    render={({ field }) => (
                                      <Combobox className="rounded-lg"
                                        options={taskFillValues?.folder?.map(c => ({ value: c.TaskFolderNo.toString(), label: c["Folder Name"] })) || []}
                                        value={field.value?.toString() || ''}
                                        onChange={(val) => field.onChange(parseInt(val))}
                                      />
                                    )}
                                  />
                                )}
                              </td>
                              <td className="px-2 py-2 align-top bg-[#f8fbff]/50">
                                {isActionRequired && (
                                  <>
                                    <Controller
                                      control={form.control}
                                      name={`discussions.${index}.actionTaskOriginatorNo`}
                                      render={({ field }) => (
                                        <UserCombobox className="rounded-lg"
                                          value={field.value?.toString() || ''}
                                          onChange={(user: any) => field.onChange(user?.loginNo ? Number(user.loginNo) : undefined)}
                                        />
                                      )}
                                    />
                                    {form.formState.errors.discussions?.[index]?.actionTaskOriginatorNo && (
                                      <span className="text-[10px] text-red-500 mt-1 block">{form.formState.errors.discussions[index]?.actionTaskOriginatorNo?.message}</span>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="px-2 py-2 align-top bg-[#f8fbff]/50">
                                {isActionRequired && (
                                  <>
                                    <Controller
                                      control={form.control}
                                      name={`discussions.${index}.actionTaskOwnerNo`}
                                      render={({ field }) => (
                                        <UserCombobox className="rounded-lg"
                                          value={field.value?.toString() || ''}
                                          onChange={(user: any) => field.onChange(user?.loginNo ? Number(user.loginNo) : undefined)}
                                        />
                                      )}
                                    />
                                    {form.formState.errors.discussions?.[index]?.actionTaskOwnerNo && (
                                      <span className="text-[10px] text-red-500 mt-1 block">{form.formState.errors.discussions[index]?.actionTaskOwnerNo?.message}</span>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="px-2 py-2 align-top bg-[#f8fbff]/50 border-r border-[#e1ecf7]/50">
                                {isActionRequired && (
                                  <>
                                    <Controller
                                      control={form.control}
                                      name={`discussions.${index}.actionDueDate`}
                                      render={({ field }) => (
                                        <DateTimePicker className="rounded-lg" date={field.value ? new Date(field.value) : undefined} onChange={(d) => field.onChange(d ? d.toISOString() : '')} />
                                      )}
                                    />
                                    {form.formState.errors.discussions?.[index]?.actionDueDate && (
                                      <span className="text-[10px] text-red-500 mt-1 block">{form.formState.errors.discussions[index]?.actionDueDate?.message}</span>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="px-2 py-2 align-top">
                                <button
                                  type="button"
                                  onClick={() => removeDiscussion(index)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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
                    className="h-8 rounded-full border-[#006699]/30 text-[#006699] hover:bg-[#006699]/5 font-semibold text-xs px-3"
                    onClick={() => appendDocument({ documentType: 0, documentNo: 0 })}
                  >
                    <Plus size={14} className="mr-1.5" />
                    Add Document
                  </Button>
                }
              >
                {documentFields.length === 0 ? (
                  null
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="min-w-full inline-block align-middle">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200/60">
                          <thead>
                            <tr className="bg-slate-50/80">
                              <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider w-16">Sr No</th>
                              <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider min-w-[200px]">Document Name</th>
                              <th scope="col" className="px-4 py-2.5 text-left text-[10px] font-black text-slate-500 uppercase tracking-wider min-w-[200px]">Document No</th>
                              <th scope="col" className="px-4 py-2.5 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {documentFields.map((field, index) => {
                              const docType = form.watch(`documents.${index}.documentType`);
                              const selectedDocTypeObj = meetingDocumentTypes.find(d => d.documentTypeNo === docType);
                              return (
                                <tr key={field.id} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="px-4 py-2 whitespace-nowrap text-xs font-semibold text-slate-500">
                                    {index + 1}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap align-top">
                                    <Controller
                                      control={form.control}
                                      name={`documents.${index}.documentType`}
                                      render={({ field }) => (
                                        <Select
                                          value={field.value?.toString() || ''}
                                          onValueChange={(val) => {
                                            field.onChange(parseInt(val));
                                            form.setValue(`documents.${index}.documentNo`, 0);
                                          }}
                                        >
                                          <SelectTrigger className="h-8 rounded-full bg-white text-xs"><SelectValue placeholder="Select Document Type" /></SelectTrigger>
                                          <SelectContent>
                                            {meetingDocumentTypes.map(d => (
                                              <SelectItem key={d.documentTypeNo} value={d.documentTypeNo.toString()}>{d.documentName}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                    />
                                    {form.formState.errors.documents?.[index]?.documentType && (
                                      <span className="text-[10px] text-red-500 mt-1 block">{form.formState.errors.documents[index]?.documentType?.message}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 align-top">
                                    <Controller
                                      control={form.control}
                                      name={`documents.${index}.documentNo`}
                                      render={({ field }) => (
                                        <DocumentCombobox
                                          formNo={selectedDocTypeObj?.formNo}
                                          contextStr={selectedDocTypeObj?.context}
                                          displayColumnsStr={selectedDocTypeObj?.displayColumns}
                                          value={field.value?.toString() || ''}
                                          initialLabel={form.watch(`documents.${index}.documentNoYearly`) || undefined}
                                          onChange={(doc: any) => {
                                            if (!doc) {
                                              field.onChange(0);
                                            } else {
                                              const no = doc.id || doc.documentNo || doc.DocumentNo || doc.Value || 0;
                                              field.onChange(parseInt(no.toString()) || 0);
                                            }
                                          }}
                                          placeholder={docType ? "Search document..." : "Select Document Name first"}
                                          disabled={!docType}
                                        />
                                      )}
                                    />
                                    {form.formState.errors.documents?.[index]?.documentNo && (
                                      <span className="text-[10px] text-red-500 mt-1 block">{form.formState.errors.documents[index]?.documentNo?.message}</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap align-top text-right">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeDocument(index)}
                                      className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </FormSection>

              {/* SECTION 5: Attachments */}
              <FormSection title="Attachments" icon={Paperclip}>
                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-[#006699] rounded-2xl p-8 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer group"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="application/pdf,image/*"
                      onChange={handleFileSelection}
                      className="hidden"
                    />
                    <div className="h-12 w-12 bg-white rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#006699] group-hover:scale-110 transition-all">
                      <UploadCloud size={22} />
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-700">Drag & drop files or click to upload</p>
                    <p className="mt-1 text-[10px] font-medium text-slate-500">Only PDF and Images are supported (Max size: 10MB)</p>
                  </div>

                  {uploadingFiles.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-medium text-slate-500 ml-1">Uploading Queue</h4>
                      <div className="space-y-0">
                        {uploadingFiles.map(file => (
                          <motion.div
                            key={file.tempId}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={cn(
                              "flex items-center justify-between p-3.5 rounded-xl border transition-all shadow-sm",
                              file.status === 'failed' ? "bg-red-50/50 border-red-200" : "bg-slate-50/50 border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
                                file.status === 'failed' ? "bg-red-100 border-red-200 text-red-600" : "bg-white border-slate-200 text-[#006699]"
                              )}>
                                {file.name.toLowerCase().endsWith('.pdf') ? <FileText size={16} /> : <ImageIcon size={16} />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-900 truncate leading-none mb-1">{file.name}</p>
                                <span className="text-[9px] font-medium flex items-center gap-0.5">
                                  {file.status === 'failed' && <span className="text-red-600 font-medium">Failed</span>}
                                  {file.status !== 'failed' && <span className="text-slate-500">{file.status}</span>}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {file.status === 'failed' && (
                                <Button type="button" size="icon" variant="ghost" onClick={() => handleRetryUpload(file.tempId)} className="h-8 w-8 rounded-lg border border-red-200/50 bg-white text-red-600">
                                  <RefreshCw size={13} />
                                </Button>
                              )}
                              <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveUploading(file.tempId)} className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500">
                                <X size={13} />
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
                      <div className="space-y-3 pt-2">
                        <h4 className="text-[10px] font-medium text-slate-500 ml-1">Attached Documents ({attachments.length})</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {attachments.map((file: any) => (
                            <motion.div key={file.id} className="flex items-center justify-between p-3 bg-slate-50/30 rounded-xl border border-slate-200 hover:border-slate-300 shadow-sm transition-all">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="h-8 w-8 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                                  {file.name.toLowerCase().endsWith('.pdf') ? <FileText size={16} /> : <ImageIcon size={16} />}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-baseline gap-0.5 mb-0.5">
                                    <p className="text-xs font-medium text-slate-900 truncate max-w-[180px] leading-tight">{file.name}</p>
                                    {file.size && <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">({formatFileSize(file.size)})</span>}
                                  </div>
                                  <button type="button" onClick={() => attachmentService.downloadAttachment(file.id, file.name)} className="text-[9px] font-medium text-[#006699] hover:underline block text-left">View document</button>
                                </div>
                              </div>
                              <Button type="button" size="icon" variant="ghost" onClick={() => handleRemoveAttachment(file.id, file.name)} className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all shadow-sm">
                                <Trash size={13} />
                              </Button>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </FormSection>

            </form>
          </Card>
        </div>
      </div>

      <Dialog open={!!attachmentToDelete} onOpenChange={(open) => !open && !isDeletingAttachment && setAttachmentToDelete(null)}>
        <DialogContent className="rounded-3xl max-w-sm p-0 border-none shadow-xl bg-white/95 backdrop-blur-xl [&>button]:hidden">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">Remove Attachment</DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">Do you want to delete?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button type="button" variant="outline" disabled={isDeletingAttachment} onClick={() => setAttachmentToDelete(null)} className="h-10 px-4 rounded-xl text-xs font-medium text-slate-600 border-transparent shadow-none">No</Button>
            <Button disabled={isDeletingAttachment} onClick={confirmRemoveAttachment} className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-md gap-0.5 transition-transform hover:scale-[1.02]">Yes</Button>
          </DialogFooter>
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
                <li key={i} className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-700 truncate">{f.name} <span className="text-slate-400 font-medium">{f.size}</span></span>
                  <span className="text-[10px] text-amber-600 font-medium">{f.reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="p-4 pt-2 mt-4 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button type="button" onClick={() => setShowWarningDialog(false)} className="h-10 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium">Got it</Button>
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
              <label className="text-xs font-semibold text-slate-700">Category Name <span className="text-red-500">*</span></label>
              <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Enter category name" className="h-9 rounded-lg" />
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
              <label className="text-xs font-semibold text-slate-700">Type Name <span className="text-red-500">*</span></label>
              <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Enter type name" className="h-9 rounded-lg" />
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
