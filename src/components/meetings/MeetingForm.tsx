import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useNavigate, useBlocker, useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Users, Plus, Trash2, Paperclip, MessageSquare, FileText, Clock, X } from 'lucide-react';
import { BrandLoader, InlineLoader } from '@/components/ui/BrandLoader';
import { Combobox } from '@/components/ui/Combobox';
import { LocationCombobox } from '@/components/ui/LocationCombobox';
import { formatLocationDisplayLabel } from '@/services/locationService';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { EmployeeCombobox } from '@/components/meetings/EmployeeCombobox';
import { BusinessEntityCombobox } from '@/components/meetings/BusinessEntityCombobox';
import { DocumentCombobox } from '@/components/meetings/DocumentCombobox';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { AppBreadcrumbBar } from '@/components/layout/AppBreadcrumbBar';
import { cn } from '@/lib/utils';
import { sortByLabel } from '@/lib/sortOptions';
import { formatUtcDateTime, toUtcIso, toUtcIsoOrEmpty } from '@/lib/dateTime';
import { toast } from 'sonner';
import { getUserErrorMessage, shouldToastCaughtError } from '@/lib/errorFeedback';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useSettings } from '@/hooks/useSettings';
import { getMeetingSchema, MeetingNotesFormData } from '@/types/meeting';
import { attachmentService } from '@/services/attachmentService';
import { UploadCloud, Image as ImageIcon, Trash, RefreshCw, AlertCircle, FileEdit } from 'lucide-react';
import { motion } from 'framer-motion';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';
import { MasterDeleteDialog } from '@/components/master/shared/MasterDeleteDialog';
import { InlineAttachmentRename } from '@/components/master/shared/InlineAttachmentRename';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { SendMinutesDialog } from '@/components/meetings/SendMinutesDialog';
import {
  buildMinutesRecipients,
  isMinutesSendStatusAllowed,
  readLastMinutesSentAt,
} from '@/lib/meetingMinutesShare';
import {
  ALLOWED_UPLOAD_HELPER_TEXT,
  UPLOAD_ACCEPT_ATTR,
  validateUploadFile,
} from '@/lib/allowedUploadFiles';

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


function FormSection({ title, icon: Icon, children, headerAction, tourId }: { title?: string, icon?: any, children?: React.ReactNode, headerAction?: React.ReactNode, tourId?: string }) {
  return (
    <section data-page-tour={tourId} className="crm-form-section rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
      <div className="crm-form-section-head flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
        <div className="flex items-center gap-2.5 min-w-0">
          {Icon && (
            <span className="crm-form-section-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
              <Icon size={15} strokeWidth={1.75} />
            </span>
          )}
          {title && <h3 className="text-sm font-semibold text-slate-100 tracking-tight truncate">{title}</h3>}
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
  const location = useLocation();
  const { isSave, isUpdate } = useFormRights(1559);
  const { isHideType, isHideFolder } = useSettings();
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
  const [statuses, setStatuses] = useState<any[]>([]);

  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    tempId: string;
    name: string;
    status: 'pending' | 'uploading' | 'verifying' | 'failed';
    fileObject: File;
    errorMessage?: string;
  }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<{ id: number; name: string } | null>(null);
  const [attachmentToRename, setAttachmentToRename] = useState<{ id: number; name: string } | null>(null);
  const [isRenamingAttachment, setIsRenamingAttachment] = useState(false);
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
  const [sendMinutesOpen, setSendMinutesOpen] = useState(false);
  const [lastMinutesSentAt, setLastMinutesSentAt] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingType, setIsSavingType] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<any>(null);
  const [isSubmitSuccessful, setIsSubmitSuccessful] = useState(false);
  const [locationLabel, setLocationLabel] = useState(() =>
    formatLocationDisplayLabel({
      operLocationName:
        initialData?.location?.name ||
        initialData?.locationName ||
        initialData?.operLocationName ||
        '',
    })
  );

  const form = useForm<MeetingNotesFormData>({
    resolver: zodResolver(getMeetingSchema(isHideType) as any),
    mode: 'onChange',
    defaultValues: {
      meetingTitle: initialData?.meetingTitle || '',
      meetingTypeNo: initialData?.meetingTypeNo?.toString() || '',
      meetingCategoryNo: initialData?.meetingCategoryNo?.toString() || '',
      companyNo: initialData?.companyNo?.toString() || companyNoStr,
      // New meeting: default start to now (minute precision, matches the picker)
      meetingStartDateTime:
        initialData?.meetingStartDateTime ||
        (!initialData && !meetingNotesNo ? toUtcIsoOrEmpty(new Date(new Date().setSeconds(0, 0))) : ''),
      meetingEndDateTime: initialData?.meetingEndDateTime || '',
      durationMinutes: initialData?.durationMinutes || 0,
      meetingModeNo: initialData?.meetingModeNo?.toString() || initialData?.meetingMode?.id?.toString() || initialData?.meetingMode?.toString() || '1',
      operTaskCompanyNo: initialData?.operTaskCompanyNo?.toString() || companyNoStr,
      operLocationNo: initialData?.location?.id?.toString() || initialData?.operLocationNo?.toString() || '',
      meetingMinutesUrl: initialData?.meetingMinutesUrl || '',
      remarks: initialData?.remarks || '',
      statusNo: initialData?.statusNo || 17,
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
            setLocationLabel(
              formatLocationDisplayLabel({
                operLocationName:
                  res.data.locationName ||
                  res.data.operLocationName ||
                  res.data.location?.name ||
                  res.data.location?.operLocationName ||
                  '',
              })
            );
            const apiLastSent =
              res.data.minutesLastSentAt ||
              res.data.lastMinutesSentAt ||
              res.data.minutesSentDate ||
              null;
            setLastMinutesSentAt(
              apiLastSent || readLastMinutesSentAt(meetingNotesNo) || null
            );
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
        if (data.statuses) setStatuses(data.statuses);

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
  const watchedParticipants = form.watch('participants');
  const watchedStatusNo = form.watch('statusNo');
  const watchedTitle = form.watch('meetingTitle');

  const resolvedMeetingNo = meetingNotesNo || initialData?.meetingNotesNo || null;

  const currentStatusName = useMemo(() => {
    const match = statuses.find(
      (s) => String(s.statusNo) === String(watchedStatusNo)
    );
    return match?.statusName || match?.StatusName || '';
  }, [statuses, watchedStatusNo]);

  const minutesRecipients = useMemo(
    () => buildMinutesRecipients(watchedParticipants || []),
    [watchedParticipants]
  );

  const canSendMinutesStatus = isMinutesSendStatusAllowed(currentStatusName);
  const recipientEmailCount = minutesRecipients.filter((r) => r.hasEmail).length;

  useEffect(() => {
    if (resolvedMeetingNo && !lastMinutesSentAt) {
      setLastMinutesSentAt(readLastMinutesSentAt(Number(resolvedMeetingNo)));
    }
  }, [resolvedMeetingNo, lastMinutesSentAt]);

  // List "Send" action → open send dialog once meeting data is ready
  useEffect(() => {
    const state = location.state as { openSendMinutes?: boolean } | null;
    if (!state?.openSendMinutes) return;
    if (isLoadingOptions || isFetchingData) return;
    if (!resolvedMeetingNo) return;
    setSendMinutesOpen(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [
    location.state,
    location.pathname,
    isLoadingOptions,
    isFetchingData,
    resolvedMeetingNo,
    navigate,
  ]);

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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (form.formState.isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [form.formState.isDirty]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      form.formState.isDirty &&
      !isSubmitSuccessful &&
      currentLocation.pathname !== nextLocation.pathname
  );

  const requestLeave = () => {
    navigate('/meetings');
  };

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
      const result = validateUploadFile(file);
      if (!result.ok) {
        failed.push({ name: file.name, size: file.size, reason: result.reason });
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

  const confirmRenameAttachment = async (newName: string) => {
    if (!attachmentToRename) return;
    const { id } = attachmentToRename;
    setIsRenamingAttachment(true);
    try {
      if (id) {
        await attachmentService.renameAttachment(id, newName, 1559); // 1559 for Meetings
      }
      const currentAttachments = form.getValues('attachments') || [];
      const updatedAttachments = currentAttachments.map((a: any) =>
        a.id === id ? { ...a, name: newName } : a
      );
      form.setValue('attachments', updatedAttachments, { shouldDirty: true });
      toast.success("Attachment renamed successfully.");
      setAttachmentToRename(null);
    } catch (error) {
      console.error('Failed to rename attachment on server:', error);
      toast.error('Failed to rename attachment');
    } finally {
      setIsRenamingAttachment(false);
    }
  };

  const onSubmit = (data: any) => {
    setPendingData(data);
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    const data = pendingData;
    if (!data) return;

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
              participantType: 2,
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
      toast.success(isUpdate ? 'Meeting notes updated successfully.' : 'Meeting notes saved successfully.');
      setIsSubmitSuccessful(true);

      // Delay to allow state update for useBlocker
      setTimeout(() => {
        form.reset(form.getValues());
        if (onComplete) onComplete();
      }, 0);
    } catch (error) {
      console.error(error);
      if (shouldToastCaughtError(error)) {
        toast.error(getUserErrorMessage(error, 'Failed to save meeting notes. Please try again.'));
      }
    }
  };

  const onValidationError = (errors: any) => {
    console.error('Form Validation Errors:', errors);

    const getFirstErrorKey = (obj: any, prefix = ''): string | null => {
      // Order of top-level fields for predictable scrolling
      const topLevelOrder = [
        'meetingTitle',
        'meetingCategoryNo',
        'meetingTypeNo',
        'companyNo',
        'operLocationNo',
        'meetingModeNo',
        'meetingStartDateTime',
        'meetingEndDateTime',
        'participants',
        'discussions',
        'documents'
      ];

      const keys = Object.keys(obj).sort((a, b) => {
        if (!prefix) {
          const idxA = topLevelOrder.indexOf(a);
          const idxB = topLevelOrder.indexOf(b);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
        }
        return 0;
      });

      for (const key of keys) {
        if (obj[key] && typeof obj[key] === 'object' && !obj[key].message) {
          const nested = getFirstErrorKey(obj[key], prefix ? `${prefix}.${key}` : key);
          if (nested) return nested;
        } else if (obj[key]?.message) {
          return prefix ? `${prefix}.${key}` : key;
        }
      }
      return null;
    };

    const firstError = getFirstErrorKey(errors);
    if (firstError) {
      setTimeout(() => {
        let element = document.querySelector(`[name="${firstError}"]`);

        if (!element) {
          const baseName = firstError.split('.')[0];
          element = document.getElementById(`form-group-${firstError}`) || document.getElementById(`form-group-${baseName}`);
        }

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            const focusable = element?.querySelector('button, input:not([type="hidden"]), select, textarea') as HTMLElement;
            if (focusable) {
              focusable.focus();
            }
          }, 150);
        }
      }, 0);
    }
  };

  if (isLoadingOptions || isFetchingData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full">
        <BrandLoader
          size="sm"
          message={isFetchingData ? 'Loading meeting details' : 'Loading options'}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--tm-page)] absolute inset-0">
      <AppBreadcrumbBar
        className="sticky top-0 z-50"
        items={[
          { label: 'Meeting Notes', href: '/meetings' },
          {
            label:
              meetingNotesNo || initialData?.meetingNotesNo
                ? 'Edit Meeting Note'
                : 'Create Meeting Note',
            current: true,
          },
        ]}
        guideKey="meeting-form"
        actions={
          <div className="flex items-center gap-2" data-page-tour="meeting-form-actions">
            <Button type="button" variant="outline" size="sm" className="h-9 rounded-[8px] text-xs font-medium border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] text-slate-300 shadow-none px-3" onClick={requestLeave}>
              Cancel
            </Button>
            {((meetingNotesNo || initialData?.meetingNotesNo) ? isUpdate : isSave) && (
              <Button disabled={form.formState.isSubmitting} type="submit" size="sm" className="h-9 rounded-[8px] bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold shadow-sm shadow-[#0EA5E9]/20 text-xs px-4" onClick={form.handleSubmit(onSubmit, (errors) => console.log('Validation Errors:', errors))}>
                {form.formState.isSubmitting ? (meetingNotesNo || initialData?.meetingNotesNo ? 'Updating...' : 'Saving...') : (meetingNotesNo || initialData?.meetingNotesNo ? 'Update' : 'Save')}
              </Button>
            )}
          </div>
        }
      />

      {resolvedMeetingNo && lastMinutesSentAt ? (
        <div className="shrink-0 px-4 py-1.5 border-b border-[var(--tm-border)]/50 bg-[var(--tm-elevated)]/40 text-[10px] text-slate-500">
          Last minutes sent:{' '}
          <span className="font-semibold text-slate-300">
            {formatUtcDateTime(lastMinutesSentAt)}
          </span>
          {recipientEmailCount > 0 ? (
            <span className="text-slate-500"> · {recipientEmailCount} email-ready attendee{recipientEmailCount === 1 ? '' : 's'}</span>
          ) : null}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto bg-[var(--tm-page)]">
        <div className="w-full mx-auto px-5 py-4">
          <form onSubmit={form.handleSubmit(onSubmit, onValidationError)} className="space-y-3">

            {/* SECTION 1: Basic Information */}
            <FormSection
              title="Meeting Detail"
              icon={Clock}
              tourId="meeting-form-detail"
              headerAction={
                <Controller
                  control={form.control}
                  name="statusNo"
                  render={({ field }) => (
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(val) => field.onChange(parseInt(val))}
                    >
                      <SelectTrigger className="h-9 rounded-[8px] bg-[var(--tm-surface)] border-[var(--tm-border)]/80 text-xs w-[140px] font-medium">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statuses?.map(status => (
                          <SelectItem key={status.statusNo} value={status.statusNo.toString()}>
                            {status.statusName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-4">
                <div id="form-group-meetingTitle" className="space-y-1.5 md:col-span-2 lg:col-span-3 xl:col-span-4">
                  <FieldLabel required>Meeting Title</FieldLabel>
                  <FieldControl error={form.formState.errors.meetingTitle?.message}>
                    <Input {...form.register('meetingTitle')} placeholder="e.g. Weekly Sync with Client" className={cn("h-10 rounded-[8px]", form.formState.errors.meetingTitle && "border-red-400")} />
                  </FieldControl>
                </div>

                <div id="form-group-meetingCategoryNo" className="space-y-1.5">
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

                <div id="form-group-meetingTypeNo" className="space-y-1.5">
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


                <div id="form-group-companyNo" className="space-y-1.5">
                  <FieldLabel required>Company</FieldLabel>
                  <Controller
                    control={form.control}
                    name="companyNo"
                    render={({ field }) => (
                      <FieldControl error={form.formState.errors.companyNo?.message}>
                        <Combobox className={cn("rounded-[8px] h-10", form.formState.errors.companyNo && "border-red-400")}
                          options={taskFillValues?.taskCompany?.map(c => ({ value: c.CompanyNo?.toString() || c.companyNo?.toString() || c.OperTaskCompanyNo?.toString() || '', label: c.TaskCompanyName || c.CompanyName || c.companyName || c.name || c.AliasName || c.Code || 'Unknown Company' })) || []}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select Company"
                        />
                      </FieldControl>
                    )}
                  />
                </div>

                <div id="form-group-operLocationNo" className="space-y-1.5">
                  <FieldLabel required>Location</FieldLabel>
                  <Controller
                    control={form.control}
                    name="operLocationNo"
                    render={({ field }) => (
                      <FieldControl error={form.formState.errors.operLocationNo?.message}>
                        <LocationCombobox
                          className={cn(
                            'rounded-[8px] h-10',
                            form.formState.errors.operLocationNo && 'border-red-400'
                          )}
                          value={field.value}
                          onChange={(location) => {
                            field.onChange(
                              location.operLocationNo ? String(location.operLocationNo) : ''
                            );
                            setLocationLabel(
                              location.operLocationNo
                                ? formatLocationDisplayLabel(location)
                                : ''
                            );
                          }}
                          initialLabel={locationLabel || undefined}
                          placeholder="Select location"
                          error={!!form.formState.errors.operLocationNo}
                        />
                      </FieldControl>
                    )}
                  />
                </div>

                <div id="form-group-meetingModeNo" className="space-y-1.5">
                  <FieldLabel required>Meeting Mode</FieldLabel>
                  <Controller
                    control={form.control}
                    name="meetingModeNo"
                    render={({ field }) => (
                      <FieldControl error={form.formState.errors.meetingModeNo?.message}>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className={cn("h-10 rounded-[8px]", form.formState.errors.meetingModeNo && "border-red-400")}><SelectValue placeholder="Select Mode" /></SelectTrigger>
                          <SelectContent>
                            {sortByLabel(meetingModes, {
                              getLabel: (m) => m.meetingModeName || '',
                              getValue: (m) => String(m.meetingModeNo),
                            }).map(m => (
                              <SelectItem key={m.meetingModeNo} value={m.meetingModeNo.toString()}>{m.meetingModeName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FieldControl>
                    )}
                  />
                </div>

                <div id="form-group-meetingStartDateTime" className="space-y-1.5">
                  <FieldLabel required>Start Date & Time</FieldLabel>
                  <Controller
                    control={form.control}
                    name="meetingStartDateTime"
                    render={({ field }) => (
                      <FieldControl error={form.formState.errors.meetingStartDateTime?.message}>
                        <DateTimePicker
                          hour24
                          className={cn("rounded-[8px]", form.formState.errors.meetingStartDateTime && "border-red-400")}
                          date={field.value ? new Date(field.value) : undefined}
                          onChange={(d) => field.onChange(toUtcIsoOrEmpty(d))}
                        />
                      </FieldControl>
                    )}
                  />
                </div>

                <div id="form-group-meetingEndDateTime" className="space-y-1.5">
                  <FieldLabel required>End Date & Time</FieldLabel>
                  <Controller
                    control={form.control}
                    name="meetingEndDateTime"
                    render={({ field }) => (
                      <FieldControl error={form.formState.errors.meetingEndDateTime?.message}>
                        <DateTimePicker
                          hour24
                          className={cn("rounded-[8px]", form.formState.errors.meetingEndDateTime && "border-red-400")}
                          date={field.value ? new Date(field.value) : undefined}
                          onChange={(d) => field.onChange(toUtcIsoOrEmpty(d))}
                        />
                      </FieldControl>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-slate-300">Meeting Duration (In Minutes)</label>
                  <Input value={form.watch('durationMinutes') || 0} readOnly placeholder="0" className="h-10 rounded-[8px] bg-[var(--tm-muted)]/50 text-xs text-slate-500 text-right" />
                </div>

                <div id="form-group-meetingTitle" className="space-y-1.5 md:col-span-2 lg:col-span-3 xl:col-span-4">
                  <label className="text-[11px] font-medium text-slate-300">Meeting Note Link (URL)</label>
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
              tourId="meeting-form-participants"
              headerAction={
                <Button type="button" onClick={() => appendParticipant({ participantType: 1 })} variant="outline" size="sm" className="h-9 rounded-[8px] text-xs font-medium border-[#0EA5E9]/25 text-[#0EA5E9] hover:bg-[var(--tm-tint)]">
                  <Plus size={14} className="mr-1" /> Add Participant
                </Button>
              }
            >
              {participantFields.length === 0 ? (
                <FieldControl
                  className="text-center p-8 border border-dashed border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-elevated)] flex flex-col items-center justify-center"
                  error={
                    (form.formState.errors.participants?.message ||
                      form.formState.errors.participants?.root?.message) as string | undefined
                  }
                >
                  <p className="text-xs text-slate-500 font-medium">No participants added yet.</p>
                </FieldControl>
              ) : (
                <div className="overflow-x-auto border border-[var(--tm-border)]/60 rounded-[8px] bg-[var(--tm-surface)]/80">
                  <table className="tm-data-table w-full text-left border-collapse min-w-[800px]">
                    <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-[10px] text-slate-300 font-semibold uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2.5 w-10 border-r border-[var(--tm-border)] text-center">#</th>
                        <th className="px-3 py-2.5 w-[15%] border-r border-[var(--tm-border)]">Type</th>
                        <th className="px-3 py-2.5 w-[20%] border-r border-[var(--tm-border)]">Participant Name</th>
                        <th className="px-3 py-2.5 w-[15%] border-r border-[var(--tm-border)]">Company</th>
                        <th className="px-3 py-2.5 w-[20%] border-r border-[var(--tm-border)]">Email</th>
                        <th className="px-3 py-2.5 w-[15%] border-r border-[var(--tm-border)]">Designation / Contact</th>
                        <th className="px-1 py-2.5 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--tm-border)]">
                      {participantFields.map((field, index) => {
                        const participantType = form.watch(`participants.${index}.participantType`);
                        const participantName = form.watch(`participants.${index}.participantName`);

                        return (
                          <tr key={field.id} className="group hover:bg-[var(--tm-muted)]/30 transition-colors">
                            <td className="px-3 py-2 border-r border-[var(--tm-border)] text-center font-medium text-slate-400 align-top">
                              {index + 1}
                            </td>
                            <td className="px-3 py-2 border-r border-[var(--tm-border)] align-top">
                              <Controller
                                control={form.control}
                                name={`participants.${index}.participantType`}
                                render={({ field }) => (
                                  <Select value={field.value.toString()} onValueChange={(v) => { field.onChange(parseInt(v)); form.setValue(`participants.${index}.participantName`, ''); form.setValue(`participants.${index}.email`, ''); form.setValue(`participants.${index}.companyName`, ''); form.setValue(`participants.${index}.designation`, ''); form.setValue(`participants.${index}.contactNo`, ''); }}>
                                    <SelectTrigger className="h-9 rounded-[8px] bg-transparent border-transparent hover:border-[var(--tm-border)] text-xs w-full shadow-none px-2 focus:ring-0">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {sortByLabel(participantTypes, { getLabel: (pt) => pt.participantType || '', getValue: (pt) => String(pt.id) }).map(pt => (
                                        <SelectItem key={pt.id} value={pt.id.toString()}>{pt.participantType}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </td >
                            <td className="px-3 py-2 border-r border-[var(--tm-border)] align-top space-y-1">
                              {participantType === 1 && (
                                <Controller
                                  control={form.control}
                                  name={`participants.${index}.userNo`}
                                  render={({ field }) => (
                                    <FieldControl error={form.formState.errors.participants?.[index]?.userNo?.message}>
                                      <UserCombobox className={cn("rounded-[8px] h-9 text-xs", form.formState.errors.participants?.[index]?.userNo && "border-red-400")}
                                        value={field.value?.toString() || ''}
                                        onChange={(user: any) => { field.onChange(user?.loginNo ? Number(user.loginNo) : undefined); form.setValue(`participants.${index}.participantName`, user?.userName || user?.printingName || user?.loginId || ''); form.setValue(`participants.${index}.email`, user?.email || ''); }}
                                        onResolve={(user: any) => { if (!form.getValues(`participants.${index}.email`)) { form.setValue(`participants.${index}.participantName`, user?.userName || user?.printingName || user?.loginId || ''); form.setValue(`participants.${index}.email`, user?.email || ''); } }}
                                        placeholder="Search internal user..."
                                      />
                                    </FieldControl>
                                  )}
                                />
                              )}
                              {participantType === 2 && (
                                <Controller
                                  control={form.control}
                                  name={`participants.${index}.empNo`}
                                  render={({ field }) => (
                                    <FieldControl error={form.formState.errors.participants?.[index]?.empNo?.message}>
                                      <EmployeeCombobox className={cn("rounded-[8px] h-9 text-xs", form.formState.errors.participants?.[index]?.empNo && "border-red-400")}
                                        value={field.value?.toString() || ''}
                                        onChange={(emp: any) => { field.onChange(emp?.empNo ? Number(emp.empNo) : undefined); form.setValue(`participants.${index}.participantName`, emp?.empCode || ''); form.setValue(`participants.${index}.email`, emp?.email || ''); }}
                                        onResolve={(emp: any) => { if (!form.getValues(`participants.${index}.email`)) { form.setValue(`participants.${index}.participantName`, emp?.empCode || ''); form.setValue(`participants.${index}.email`, emp?.email || ''); } }}
                                        placeholder="Search employee..."
                                      />
                                    </FieldControl>
                                  )}
                                />
                              )}
                              {participantType === 3 && (
                                <FieldControl error={form.formState.errors.participants?.[index]?.participantName?.message}>
                                  <Input {...form.register(`participants.${index}.participantName`)} placeholder="Name" className={cn("h-9 rounded-[8px] bg-transparent text-xs", form.formState.errors.participants?.[index]?.participantName && "border-red-400")} maxLength={100} />
                                </FieldControl>
                              )}
                              {participantType === 4 && (
                                <Controller
                                  control={form.control}
                                  name={`participants.${index}.participantName`}
                                  render={({ field }) => (
                                    <FieldControl error={form.formState.errors.participants?.[index]?.participantName?.message}>
                                      <BusinessEntityCombobox className={cn("rounded-[8px] h-9 text-xs", form.formState.errors.participants?.[index]?.participantName && "border-red-400")}
                                        detailNo={form.watch(`participants.${index}.businessEntityContactPersonDetailNo`)}
                                        value={field.value || ''}
                                        onChange={(contact: any) => { field.onChange(contact?.contactPersonName || ''); form.setValue(`participants.${index}.email`, contact?.email || ''); form.setValue(`participants.${index}.companyName`, contact?.businessEntityName || ''); form.setValue(`participants.${index}.designation`, contact?.designation || ''); form.setValue(`participants.${index}.department` as any, contact?.department || ''); form.setValue(`participants.${index}.businessEntityNo`, contact?.businessEntityNo || null); form.setValue(`participants.${index}.businessEntityContactPersonDetailNo`, contact?.businessEntityContactPersonDetailNo || null); }}
                                        onResolve={(contact: any) => { if (!form.getValues(`participants.${index}.email`)) { form.setValue(`participants.${index}.email`, contact?.email || ''); form.setValue(`participants.${index}.companyName`, contact?.businessEntityName || ''); form.setValue(`participants.${index}.designation`, contact?.designation || ''); form.setValue(`participants.${index}.department` as any, contact?.department || ''); } }}
                                        placeholder="Search contact..."
                                      />
                                    </FieldControl>
                                  )}
                                />
                              )}
                            </td>
                            <td className="px-3 py-2 border-r border-[var(--tm-border)] align-top">
                              {participantType === 3 ? (
                                <FieldControl error={form.formState.errors.participants?.[index]?.companyName?.message}>
                                  <Input {...form.register(`participants.${index}.companyName`)} placeholder="Company" className={cn("h-9 rounded-[8px] bg-transparent text-xs", form.formState.errors.participants?.[index]?.companyName && "border-red-400")} maxLength={100} />
                                </FieldControl>
                              ) : participantType === 4 ? (
                                <Input value={form.watch(`participants.${index}.companyName`) || ''} disabled placeholder="Business Entity" className="h-9 rounded-[8px] bg-transparent border-transparent text-xs text-slate-500" />
                              ) : (
                                <span className="text-slate-500 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 border-r border-[var(--tm-border)] align-top">
                              {(participantType === 1 || participantType === 2 || participantType === 4) ? (
                                <Input value={form.watch(`participants.${index}.email`) || ''} disabled placeholder="Email" className="h-9 w-full rounded-[8px] bg-transparent border-transparent text-xs text-slate-500" />
                              ) : (
                                <FieldControl error={form.formState.errors.participants?.[index]?.email?.message}>
                                  <Input {...form.register(`participants.${index}.email`)} placeholder="Email" className={cn("h-9 rounded-[8px] bg-transparent text-xs", form.formState.errors.participants?.[index]?.email && "border-red-400")} maxLength={100} />
                                </FieldControl>
                              )}
                            </td>
                            <td className="px-3 py-2 border-r border-[var(--tm-border)] align-top space-y-1">
                              {participantType === 3 && (
                                <>
                                  <FieldControl error={form.formState.errors.participants?.[index]?.designation?.message}>
                                    <Input {...form.register(`participants.${index}.designation`)} placeholder="Designation" className={cn("h-9 rounded-[8px] bg-transparent text-xs", form.formState.errors.participants?.[index]?.designation && "border-red-400")} maxLength={100} />
                                  </FieldControl>
                                  <FieldControl error={form.formState.errors.participants?.[index]?.contactNo?.message}>
                                    <Input {...form.register(`participants.${index}.contactNo`)} placeholder="Contact No" className={cn("h-9 rounded-[8px] bg-transparent text-xs mt-1", form.formState.errors.participants?.[index]?.contactNo && "border-red-400")} maxLength={20} />
                                  </FieldControl>
                                </>
                              )}
                              {participantType === 4 && (
                                <>
                                  <Input value={form.watch(`participants.${index}.designation`) || ''} disabled placeholder="Designation" className="h-9 rounded-[8px] bg-transparent border-transparent text-xs text-slate-500" />
                                  <Input value={(form.watch(`participants.${index}` as any)?.department) || ''} disabled placeholder="Department" className="h-9 rounded-[8px] bg-transparent border-transparent text-xs text-slate-500 mt-1" />
                                </>
                              )}
                              {(participantType === 1 || participantType === 2) && (
                                <span className="text-slate-500 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center align-top">
                              <button
                                type="button"
                                onClick={() => requestRemoveItem('participant', index, participantName || `Participant ${index + 1}`)}
                                className="h-8 w-8 inline-flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-[8px] transition-colors mt-0.5"
                                title="Remove participant"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr >
                        );
                      })}
                    </tbody >
                  </table >
                </div >
              )}
            </FormSection >

            {/* SECTION 4: Discussions & Action Items */}
            < FormSection
              title="Discussions & Outcomes"
              icon={MessageSquare}
              tourId="meeting-form-discussions"
              headerAction={
                < Button type="button" onClick={() => appendDiscussion({ topic: '', isActionRequired: false })} variant="outline" size="sm" className="h-9 rounded-[8px] text-xs font-medium border-[#0EA5E9]/25 text-[#0EA5E9] hover:bg-[var(--tm-tint)]" >
                  <Plus size={14} className="mr-1" /> Add Discussion Point
                </Button >
              }
            >
              {
                discussionFields.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-elevated)]">
                    <p className="text-xs text-slate-500 font-medium">No discussion points added yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-[var(--tm-border)]/60 rounded-[8px] bg-[var(--tm-surface)]/80">
                    <table className="tm-data-table w-full text-left border-collapse min-w-[1000px]">
                      <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-[10px] text-slate-300 font-semibold uppercase tracking-wide">
                          <tr>
                          <th className="px-3 py-2.5 w-10 border-r border-[var(--tm-border)] text-center">#</th>
                          <th className="px-3 py-2.5 w-[25%] border-r border-[var(--tm-border)]">Topic / Agenda</th>
                          <th className="px-3 py-2.5 w-[25%] border-r border-[var(--tm-border)]">Discussion Summary</th>
                          <th className="px-3 py-2.5 w-[25%] border-r border-[var(--tm-border)]">Decision Remarks</th>
                          <th className="px-3 py-2.5 w-[25%] border-r border-[var(--tm-border)]">Action Required</th>
                          <th className="px-1 py-2.5 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--tm-border)]">
                        {discussionFields.map((field, index) => {
                          const isActionRequired = form.watch(`discussions.${index}.isActionRequired`);
                          const topicValue = (form.watch(`discussions.${index}.topic`) || '').trim();
                          return (
                            <React.Fragment key={field.id}>
                              <tr className="group hover:bg-[var(--tm-muted)]/30 transition-colors">
                                <td className="px-3 py-3 border-r border-[var(--tm-border)] text-center font-medium text-slate-400 align-top">
                                  {index + 1}
                                </td>
                                <td className="px-3 py-3 border-r border-[var(--tm-border)] align-top space-y-1">
                                  <FieldControl error={form.formState.errors.discussions?.[index]?.topic?.message}>
                                    <Input {...form.register(`discussions.${index}.topic`)} placeholder="What was discussed?" className={cn("h-9 rounded-[8px] text-xs font-medium bg-transparent", form.formState.errors.discussions?.[index]?.topic && "border-red-400")} />
                                  </FieldControl>
                                </td>
                                <td className="px-3 py-3 border-r border-[var(--tm-border)] align-top">
                                  <Controller
                                    control={form.control}
                                    name={`discussions.${index}.discussionSummary`}
                                    render={({ field }) => (
                                      <Textarea
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        placeholder="Details..."
                                        maxLength={700}
                                        className="min-h-[60px] rounded-[8px] text-xs bg-transparent resize-y focus-visible:ring-[#0EA5E9]/30"
                                      />
                                    )}
                                  />
                                </td>
                                <td className="px-3 py-3 border-r border-[var(--tm-border)] align-top">
                                  <Controller
                                    control={form.control}
                                    name={`discussions.${index}.decisionRemarks`}
                                    render={({ field }) => (
                                      <Textarea
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        placeholder="Final decision..."
                                        maxLength={300}
                                        className="min-h-[60px] rounded-[8px] text-xs bg-transparent resize-y focus-visible:ring-[#0EA5E9]/30"
                                      />
                                    )}
                                  />
                                </td>
                                <td className="px-3 py-3 border-r border-[var(--tm-border)] align-top">
                                  <Controller
                                    control={form.control}
                                    name={`discussions.${index}.isActionRequired`}
                                    render={({ field }) => (
                                      <div className="flex items-center gap-2 mb-2">
                                        <button
                                          type="button"
                                          role="switch"
                                          aria-checked={!!field.value}
                                          onClick={() => field.onChange(!field.value)}
                                          className="inline-flex items-center gap-2 shrink-0 cursor-pointer select-none rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/30"
                                        >
                                          <span className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200', field.value ? 'bg-[#0EA5E9]' : 'bg-slate-600')}>
                                            <span className={cn('absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200', field.value ? 'translate-x-[18px]' : 'translate-x-[2px]')} />
                                          </span>
                                          <span className={cn('text-[10px] font-semibold tracking-wide', field.value ? 'text-[#0EA5E9]' : 'text-slate-400')}>
                                            {field.value ? 'ON' : 'OFF'}
                                          </span>
                                        </button>
                                      </div>
                                    )}
                                  />
                                </td>
                                <td className="px-2 py-3 text-center align-top">
                                  <button
                                    type="button"
                                    onClick={() => requestRemoveItem('discussion', index, topicValue || `Discussion ${index + 1}`)}
                                    className="h-8 w-8 inline-flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-[8px] transition-colors mt-0.5"
                                    title="Remove discussion"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>

                              {/* Expandable Task Details Row */}
                              {isActionRequired && (
                                <tr className="bg-[var(--tm-muted)]/10 border-t border-[var(--tm-border)]/50">
                                  <td colSpan={6} className="p-3 pl-14">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9]"></div>
                                      <p className="text-[10px] font-semibold text-[#0EA5E9] uppercase tracking-wide">Task Details</p>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                      <FieldControl error={form.formState.errors.discussions?.[index]?.operTaskCategoryNo?.message}>
                                        <Controller
                                          control={form.control}
                                          name={`discussions.${index}.operTaskCategoryNo`}
                                          render={({ field }) => (
                                            <Combobox className={cn("rounded-[8px] h-9 text-xs", form.formState.errors.discussions?.[index]?.operTaskCategoryNo && "border-red-400")}
                                              options={taskFillValues?.category?.filter(c => c.Category.toLowerCase() !== 'all' && c.Category.toLowerCase() !== '[all]').map(c => ({ value: c.OperTaskCategoryNo.toString(), label: c.Category, colorCoding: c.colorCoding || c.ColorCoding })) || []}
                                              value={field.value != null && !Number.isNaN(Number(field.value)) ? String(field.value) : ''}
                                              onChange={(val) => field.onChange(toOptionalInt(val))}
                                              placeholder="Category"
                                            />
                                          )}
                                        />
                                      </FieldControl>

                                      {!isHideType && (
                                        <FieldControl error={form.formState.errors.discussions?.[index]?.operTaskTypeNo?.message}>
                                          <Controller
                                            control={form.control}
                                            name={`discussions.${index}.operTaskTypeNo`}
                                            render={({ field }) => (
                                              <Combobox className={cn("rounded-[8px] h-9 text-xs", form.formState.errors.discussions?.[index]?.operTaskTypeNo && "border-red-400")}
                                                options={taskFillValues?.type?.filter(t => t["Task Type"].toLowerCase() !== 'all' && t["Task Type"].toLowerCase() !== '[all]').map(c => ({ value: c.OperTaskTypeNo.toString(), label: c["Task Type"] })) || []}
                                                value={field.value != null && !Number.isNaN(Number(field.value)) ? String(field.value) : ''}
                                                onChange={(val) => field.onChange(toOptionalInt(val))}
                                                placeholder="Task Type"
                                              />
                                            )}
                                          />
                                        </FieldControl>
                                      )}

                                      <FieldControl error={form.formState.errors.discussions?.[index]?.operTaskPriorityNo?.message}>
                                        <Controller
                                          control={form.control}
                                          name={`discussions.${index}.operTaskPriorityNo`}
                                          render={({ field }) => (
                                            <Combobox className={cn("rounded-[8px] h-9 text-xs", form.formState.errors.discussions?.[index]?.operTaskPriorityNo && "border-red-400")}
                                              options={taskFillValues?.priority?.filter(p => p.Priority.toLowerCase() !== 'all' && p.Priority.toLowerCase() !== '[all]').map(c => ({ value: c.OperTaskPriorityNo.toString(), label: c.Priority, colorCoding: c.ColorCoding })) || []}
                                              value={field.value != null && !Number.isNaN(Number(field.value)) ? String(field.value) : ''}
                                              onChange={(val) => field.onChange(toOptionalInt(val))}
                                              sortAlphabetically={false}
                                              placeholder="Priority"
                                            />
                                          )}
                                        />
                                      </FieldControl>

                                      {!isHideFolder && (
                                        <Controller
                                          control={form.control}
                                          name={`discussions.${index}.operTaskCategoryNo`}
                                          render={({ field }) => (
                                            <Combobox className="rounded-[8px] h-9 text-xs"
                                              options={taskFillValues?.folder?.map(c => ({ value: c.TaskFolderNo.toString(), label: cleanMasterLabel(c["Folder Name"]) })) || []}
                                              value={field.value != null && !Number.isNaN(Number(field.value)) ? String(field.value) : ''}
                                              onChange={(val) => field.onChange(toOptionalInt(val))}
                                              placeholder="Folder"
                                            />
                                          )}
                                        />
                                      )}

                                      <FieldControl error={form.formState.errors.discussions?.[index]?.actionTaskOriginatorNo?.message}>
                                        <Controller
                                          control={form.control}
                                          name={`discussions.${index}.actionTaskOriginatorNo`}
                                          render={({ field }) => (
                                            <UserCombobox className={cn("rounded-[8px] h-9 text-xs", form.formState.errors.discussions?.[index]?.actionTaskOriginatorNo && "border-red-400")}
                                              value={field.value?.toString() || ''}
                                              onChange={(user: any) => field.onChange(user?.loginNo ? Number(user.loginNo) : undefined)}
                                              placeholder="Assign By"
                                            />
                                          )}
                                        />
                                      </FieldControl>

                                      <FieldControl error={form.formState.errors.discussions?.[index]?.actionTaskOwnerNo?.message}>
                                        <Controller
                                          control={form.control}
                                          name={`discussions.${index}.actionTaskOwnerNo`}
                                          render={({ field }) => (
                                            <UserCombobox className={cn("rounded-[8px] h-9 text-xs", form.formState.errors.discussions?.[index]?.actionTaskOwnerNo && "border-red-400")}
                                              value={field.value?.toString() || ''}
                                              onChange={(user: any) => field.onChange(user?.loginNo ? Number(user.loginNo) : undefined)}
                                              placeholder="Assign To"
                                            />
                                          )}
                                        />
                                      </FieldControl>

                                      <FieldControl error={form.formState.errors.discussions?.[index]?.actionDueDate?.message}>
                                        <Controller
                                          control={form.control}
                                          name={`discussions.${index}.actionDueDate`}
                                          render={({ field }) => (
                                            <DateTimePicker
                                              hour24
                                              className={cn("w-full rounded-[8px] h-9 text-xs", form.formState.errors.discussions?.[index]?.actionDueDate && "border-red-400")}
                                              date={field.value ? new Date(field.value) : undefined}
                                              onChange={(d) => field.onChange(toUtcIsoOrEmpty(d))}
                                              placeholder="Due Date & Time"
                                            />
                                          )}
                                        />
                                      </FieldControl>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div >
                )}
            </FormSection >

            {/* SECTION 3: Document Details */}
            < FormSection
              title="Document Details"
              icon={FileText}
              headerAction={
                < Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-[8px] border-[#0EA5E9]/25 text-[#0EA5E9] hover:bg-[var(--tm-tint)] font-medium text-xs px-3"
                  onClick={() => appendDocument({ documentType: 0, documentNo: 0 })}
                >
                  <Plus size={14} className="mr-1.5" />
                  Add Document
                </Button >
              }
            >
              {
                documentFields.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-elevated)]">
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
                          className="relative rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] overflow-visible group shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-[#0EA5E9]/30 hover:shadow-[0_8px_24px_-12px_rgba(14,165,233,0.18)] transition-all"
                        >
                          <div className="relative flex items-center gap-3 pl-4 pr-11 py-2.5 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] border-b border-[var(--tm-border)] rounded-t-[8px]">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[12px] font-semibold text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12">
                              {index + 1}
                            </span>
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/10">
                              <FileText size={14} strokeWidth={1.75} />
                            </span>
                            <div className="min-w-0 flex-1">
                              {summaryLabel ? (
                                <p className="text-[13px] font-semibold text-slate-100 truncate leading-tight">
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
                              className="absolute top-0 right-0 h-8 w-8 inline-flex items-center justify-center text-red-500 bg-red-500/10 hover:text-red-400 hover:bg-red-500/20 rounded-bl-[8px] rounded-tr-[7px] border-l border-b border-red-500/30 transition-colors"
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
                                              'h-10 rounded-[8px] bg-[var(--tm-surface)] text-xs shadow-none border-[var(--tm-border)]/80',
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
                                            {
                                              sortByLabel(meetingDocumentTypes, {
                                                getLabel: (d) => d.documentName || '',
                                                getValue: (d) => String(d.documentTypeNo),
                                              }).map((d) => (
                                                <SelectItem
                                                  key={d.documentTypeNo}
                                                  value={d.documentTypeNo.toString()}
                                                >
                                                  {d.documentName}
                                                </SelectItem>
                                              ))
                                            }
                                          </SelectContent >
                                        </Select >
                                      );
                                    }}
                                  />
                                </FieldControl >
                              </div >

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
                                          'h-10 rounded-[8px] bg-[var(--tm-surface)] text-xs shadow-none border-[var(--tm-border)]/80',
                                          form.formState.errors.documents?.[index]?.documentNo &&
                                          'border-red-400',
                                          !(Number(docType) > 0) && 'bg-[var(--tm-muted)]/80 text-slate-400'
                                        )}
                                      />
                                    )}
                                  />
                                </FieldControl>
                              </div>
                            </div >
                          </div >
                        </div >
                      );
                    })}
                  </div >
                )}
            </FormSection >

            {/* SECTION 5: Attachments */}
            < FormSection title="Attachments" icon={Paperclip} tourId="meeting-form-attachments" >
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
                  className="group relative flex items-center gap-3.5 rounded-[8px] border border-dashed border-[#0EA5E9]/25 bg-gradient-to-r from-[var(--tm-page)] to-[var(--tm-surface)] px-3.5 py-3 cursor-pointer transition-all hover:border-[#0EA5E9]/45 hover:shadow-[0_8px_24px_-16px_rgba(14,165,233,0.35)]"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={UPLOAD_ACCEPT_ATTR}
                    onChange={handleFileSelection}
                    className="hidden"
                  />
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-surface)] text-[#0EA5E9] ring-1 ring-[#0EA5E9]/12 shadow-sm group-hover:bg-[var(--tm-tint)] transition-colors">
                    <UploadCloud size={18} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-slate-100 leading-tight">
                      Drop files here or{' '}
                      <span className="text-[#0EA5E9] underline decoration-[#0EA5E9]/30 underline-offset-2">
                        browse
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                      {ALLOWED_UPLOAD_HELPER_TEXT}
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex h-8 items-center rounded-[7px] bg-[#0EA5E9] px-3 text-[11px] font-semibold text-white shadow-sm shadow-[#0EA5E9]/20 group-hover:bg-[#0284C7] transition-colors">
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
                    <div className="rounded-[8px] border border-[var(--tm-border)]/80 overflow-hidden divide-y divide-[var(--tm-border)] bg-[var(--tm-surface)]">
                      {uploadingFiles.map((file) => (
                        <motion.div
                          key={file.tempId}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className={cn(
                            'flex items-center gap-2.5 px-2.5 py-2',
                            file.status === 'failed' ? 'bg-red-500/10' : 'bg-[var(--tm-surface)]'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ring-1',
                              file.status === 'failed'
                                ? 'bg-red-500/10 text-red-400 ring-red-500/30'
                                : 'bg-[var(--tm-tint)] text-[#0EA5E9] ring-[#0EA5E9]/12'
                            )}
                          >
                            {file.status !== 'failed' ? (
                              <InlineLoader size={14} />
                            ) : file.name.toLowerCase().endsWith('.pdf') ? (
                              <FileText size={14} />
                            ) : (
                              <ImageIcon size={14} />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold text-slate-100 truncate leading-tight">
                              {file.name}
                            </p>
                            <p
                              className={cn(
                                'text-[10px] font-medium mt-0.5',
                                file.status === 'failed' ? 'text-red-400' : 'text-slate-400'
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
                                className="h-7 w-7 rounded-[7px] text-red-400 hover:bg-red-500/10"
                              >
                                <RefreshCw size={12} />
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveUploading(file.tempId)}
                              className="h-7 w-7 rounded-[7px] text-slate-400 hover:text-slate-300 hover:bg-[var(--tm-muted)]"
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
                        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tm-tint)] px-1.5 text-[10px] font-semibold text-[#0EA5E9] tabular-nums">
                          {attachments.length}
                        </span>
                      </div>
                      <div className="rounded-[8px] border border-[var(--tm-border)]/80 overflow-hidden divide-y divide-[var(--tm-border)] bg-[var(--tm-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                        {attachments.map((file: any) => {
                          const isPdf = (file.name || '').toLowerCase().endsWith('.pdf');
                          return (
                            <motion.div
                              key={file.id}
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="group/file flex items-center gap-2.5 px-2.5 py-2 hover:bg-[var(--tm-elevated)] transition-colors"
                            >
                              <span
                                className={cn(
                                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ring-1',
                                  isPdf
                                    ? 'bg-[var(--tm-tint)] text-[#0EA5E9] ring-[#0EA5E9]/12'
                                    : 'bg-violet-500/15 text-violet-400 ring-violet-500/30'
                                )}
                              >
                                {isPdf ? <FileText size={14} /> : <ImageIcon size={14} />}
                              </span>
                              {attachmentToRename?.id === file.id ? (
                                <InlineAttachmentRename
                                  originalName={file.name || 'document'}
                                  saving={isRenamingAttachment}
                                  onSave={confirmRenameAttachment}
                                  onCancel={() => setAttachmentToRename(null)}
                                />
                              ) : (
                                <>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <p className="text-[11px] font-semibold text-slate-100 truncate leading-tight">
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
                                      className="mt-0.5 text-[10px] font-semibold text-[#0EA5E9] hover:underline underline-offset-2"
                                    >
                                      View
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      title="Rename"
                                      aria-label="Rename attachment"
                                      disabled={attachmentToRename != null}
                                      onClick={() => setAttachmentToRename({ id: file.id, name: file.name })}
                                      className="h-7 w-7 shrink-0 rounded-[7px] text-slate-400 opacity-70 group-hover/file:opacity-100 hover:text-sky-400 hover:bg-sky-500/10 transition-all"
                                    >
                                      <FileEdit size={12} />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleRemoveAttachment(file.id, file.name)}
                                      className="h-7 w-7 shrink-0 rounded-[7px] text-slate-400 opacity-70 group-hover/file:opacity-100 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                    >
                                      <Trash size={12} />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </FormSection >

          </form >
        </div >
      </div >

      <MasterDeleteDialog
        open={!!itemToDelete}
        onOpenChange={(open) => {
          if (!open) setItemToDelete(null);
        }}
        onConfirm={confirmRemoveItem}
        recordName={itemToDelete?.label}
        entityLabel={
          itemToDelete?.type === 'participant'
            ? 'participant'
            : itemToDelete?.type === 'discussion'
              ? 'discussion'
              : 'document'
        }
      />

      <MasterDeleteDialog
        open={!!attachmentToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingAttachment) setAttachmentToDelete(null);
        }}
        onConfirm={confirmRemoveAttachment}
        recordName={attachmentToDelete?.name}
        entityLabel="attachment"
        confirming={isDeletingAttachment}
      />


      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="rounded-3xl max-w-md p-0 border-none shadow-xl bg-[var(--tm-surface)]/95 backdrop-blur-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-base font-medium text-slate-100 flex items-center gap-2"><AlertCircle size={18} className="text-amber-500" /> Invalid Files Skipped</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-2">Some files were skipped due to validation errors.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2 max-h-[300px] overflow-y-auto">
            <ul className="space-y-3">
              {invalidFiles.map((f, i) => (
                <li key={i} className="bg-amber-500/15 rounded-[8px] p-3 border border-amber-500/30 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-200 truncate">{f.name} <span className="text-slate-400 font-medium">{f.size}</span></span>
                  <span className="text-[10px] text-amber-400 font-medium">{f.reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="p-4 pt-2 mt-4 bg-[var(--tm-muted)]/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button type="button" onClick={() => setShowWarningDialog(false)} className="h-10 px-5 rounded-[8px] bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium">Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="rounded-3xl max-w-sm p-6 border-none shadow-2xl bg-[var(--tm-surface)] select-none">
          <DialogHeader className="pb-3 border-b border-[var(--tm-border)]">
            <DialogTitle className="text-base font-medium text-slate-100">Add Meeting Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <FieldLabel required className="text-xs font-semibold text-slate-200">Category Name</FieldLabel>
              <Input value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Enter category name" className="h-10 rounded-[8px]" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" className="h-9 rounded-[8px]" onClick={() => setCategoryModalOpen(false)}>Cancel</Button>
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
                {isSavingCategory ? <InlineLoader size={16} className="mr-2" /> : null} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Type Modal */}
      <Dialog open={typeModalOpen} onOpenChange={setTypeModalOpen}>
        <DialogContent className="rounded-3xl max-w-sm p-6 border-none shadow-2xl bg-[var(--tm-surface)] select-none">
          <DialogHeader className="pb-3 border-b border-[var(--tm-border)]">
            <DialogTitle className="text-base font-medium text-slate-100">Add Meeting Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <FieldLabel required className="text-xs font-semibold text-slate-200">Type Name</FieldLabel>
              <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Enter type name" className="h-10 rounded-[8px]" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" className="h-9 rounded-[8px]" onClick={() => setTypeModalOpen(false)}>Cancel</Button>
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
                {isSavingType ? <InlineLoader size={16} className="mr-2" /> : null} Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.state === 'blocked' ? blocker.reset?.() : null}>
        <DialogContent className="sm:max-w-[425px] overflow-hidden rounded-2xl border border-[var(--tm-border)] bg-[var(--tm-surface)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#F59E0B]" />
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-base font-semibold text-slate-100">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F59E0B]/15 text-[#F59E0B] ring-1 ring-[#F59E0B]/25">
                <AlertCircle size={16} strokeWidth={2.5} />
              </div>
              Unsaved Changes
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm font-medium leading-relaxed text-slate-400">
              You have unsaved edits on this meeting note. Leave now? Your changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-semibold border-[var(--tm-border)] text-slate-300 hover:bg-[var(--tm-muted)] hover:text-slate-100"
              onClick={() => blocker.proceed?.()}
            >
              Leave
            </Button>
            <Button
              type="button"
              className="rounded-xl font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm"
              onClick={() => blocker.reset?.()}
            >
              Keep editing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {
        resolvedMeetingNo ? (
          <SendMinutesDialog
            open={sendMinutesOpen}
            onOpenChange={setSendMinutesOpen}
            meetingNotesNo={Number(resolvedMeetingNo)}
            companyNo={Number(form.watch('operTaskCompanyNo') || companyNoStr) || Number(companyNoStr)}
            meetingTitle={watchedTitle}
            startDateTime={startDateTime}
            endDateTime={endDateTime}
            statusName={currentStatusName}
            statusAllowed={canSendMinutesStatus}
            recipients={minutesRecipients}
            onSent={() => setLastMinutesSentAt(toUtcIso(new Date()) || new Date().toISOString())}
          />
        ) : null
      }
      {/* Save Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={(open) => { if (!open) setShowConfirm(false); }}>
        <DialogContent className="rounded-[12px] max-w-sm p-0 border border-[var(--tm-border)]/80 shadow-xl">
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-base font-semibold text-slate-100 tracking-tight">
              Confirm Save
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1.5">
              Are you sure you want to save these meeting notes?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-[var(--tm-elevated)] flex justify-end gap-2 rounded-b-[12px] border-t border-[var(--tm-border)]">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="h-9 rounded-[8px] text-xs font-medium border-[var(--tm-border)] shadow-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              autoFocus
              onClick={handleConfirmSave}
              className="h-9 rounded-[8px] text-xs font-semibold bg-[#0EA5E9] hover:bg-[#0284C7] text-white shadow-sm"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? <InlineLoader size={14} className="mr-1.5" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
