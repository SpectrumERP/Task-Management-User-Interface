import React, { useEffect, useMemo, useState, useRef } from 'react';
import { AttachedFileRow } from '@/components/shared/AttachedFileRow';
import { AttachmentDropZone } from '@/components/shared/AttachmentDropZone';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { Link, useNavigate, useBlocker, useLocation } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Users, Plus, Trash2, Paperclip, MessageSquare, FileText, Clock, X, Lock, Pencil, Eye, CalendarClock, ExternalLink, ChevronDown, Printer, AlertCircle as AlertCircleIcon } from 'lucide-react';
import { InlineLoader } from '@/components/ui/InlineLoader';
import { SkeletonForm } from '@/components/ui/skeleton';
import { Combobox } from '@/components/ui/Combobox';
import { LocationCombobox } from '@/components/ui/LocationCombobox';
import { formatLocationDisplayLabel, locationService } from '@/services/locationService';
import { MasterCreateDialog } from '@/components/master/MasterCreateDialog';
import { isAdminUser } from '@/lib/taskAccess';
import { ParticipantChipsInput } from '@/components/meetings/ParticipantChipsInput';
import { ExternalParticipantDialog } from '@/components/meetings/ExternalParticipantDialog';
import { PARTICIPANT_TYPE, participantLabel, resolveParticipantContacts, type ParticipantValue } from '@/lib/meetingParticipants';
import { buildMeetingMinutesHtml } from '@/components/meetings/MeetingMinutesPrint';
import { printHtml } from '@/lib/printHtml';
import { userService } from '@/services/userService';
import { buildTaskOptions, discussionsFromApi, discussionsToApi, optionLabel } from '@/lib/meetingDiscussions';
import { taskUrl } from '@/lib/dealMonitor';
import { AssigneeAvatar, AssigneeLabel, DiscussionTasksDrawer } from '@/components/meetings/DiscussionTasksDrawer';
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
import { getMeetingSchema, MeetingNotesFormData, type MeetingNotesDiscussion, type MeetingNotesDiscussionTask } from '@/types/meeting';
import { attachmentService } from '@/services/attachmentService';
import { Image as ImageIcon, RefreshCw, AlertCircle } from 'lucide-react';
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
  isMeetingFinalized,
  isMinutesSendStatusAllowed,
  participantTypeLabel,
  readLastMinutesSentAt,
} from '@/lib/meetingMinutesShare';
import {
  ALLOWED_UPLOAD_HELPER_TEXT,
  UPLOAD_ACCEPT_ATTR,
  selectUploadBatch,
} from '@/lib/allowedUploadFiles';

const formatFileSize = (bytes?: number | null) => {
  if (bytes === undefined || bytes === null || bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

type PrintUserRef = { printingName?: string; displayName?: string; loginId?: string };
/** Fields of GET /api/crm/meeting-notes/load-data used by the printed minutes. */
type MeetingRecordForPrint = {
  code?: string;
  taskCompanyName?: string;
  statusName?: string;
  meetingCategoryName?: string;
  meetingTypeName?: string;
  meetingModeName?: string;
  operLocation?: string;
  createdBy?: PrintUserRef | null;
  createdDate?: string | null;
  authorizedBy?: PrintUserRef | null;
  authorizedDate?: string | null;
};

export function MeetingForm({ initialData, onComplete, meetingNotesNo }: { initialData?: any, onComplete?: () => void, meetingNotesNo?: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSave, isUpdate } = useFormRights(1559);
  const { isHideType, isHideFolder } = useSettings();
  const { company: authCompanies, user: authUser } = useAuthStore();
  // "Add New Location" in Business Location: admins, and users who may save the Location master (form 1541).
  const { isSave: canSaveLocationMaster } = useFormRights(1541);
  const canAddLocation = isAdminUser(authUser) || canSaveLocationMaster;
  const [locationCreateOpen, setLocationCreateOpen] = useState(false);
  const currentLoginNo = Number(authUser?.LoginNo ?? authUser?.loginNo) || null;
  const companyNoStr = authCompanies?.[0]?.CompanyNo?.toString() || authCompanies?.[0]?.companyNo?.toString() || '1';

  // Task Masters for Action Items
  const { fillValues: taskFillValues, fetchFillValues: fetchTaskFillValues } = useTaskStore();

  // Meeting Masters
  const [meetingTypes, setMeetingTypes] = useState<any[]>([]);
  const [meetingCategories, setMeetingCategories] = useState<any[]>([]);
  const [meetingModes, setMeetingModes] = useState<any[]>([]);
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
    type: 'participant' | 'discussion' | 'document' | 'task';
    index: number;
    /** type 'task': the task within discussion `index`. */
    taskIndex?: number;
    label: string;
  } | null>(null);
  const [invalidFiles, setInvalidFiles] = useState<Array<{ name: string; size: number; reason: string }>>([]);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  // Discussion lines whose task table is open (by field id, so it survives reordering / removal).
  const [expandedLines, setExpandedLines] = useState<Set<string>>(() => new Set());
  const toggleLineTasks = (fieldId: string) =>
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  // Task drawer: one task of a discussion line (taskIndex null = add), with a snapshot of it.
  // Kept (with open: false) while the drawer animates closed; `session` remounts it per opening.
  const [tasksDrawer, setTasksDrawer] = useState<{
    open: boolean;
    session: number;
    index: number;
    taskIndex: number | null;
    task: MeetingNotesDiscussionTask | null;
    topic: string;
  } | null>(null);
  const openTask = (index: number, taskIndex: number | null) =>
    setTasksDrawer((prev) => {
      const tasks = form.getValues(`discussions.${index}.tasks`) ?? [];
      return {
        open: true,
        session: (prev?.session ?? 0) + 1,
        index,
        taskIndex,
        task: taskIndex == null ? null : { ...tasks[taskIndex] },
        topic: form.getValues(`discussions.${index}.topic`) ?? '',
      };
    });
  // External participant details dialog: the participant (index + snapshot), null when closed.
  const [externalEdit, setExternalEdit] = useState<{ index: number; value: ParticipantValue } | null>(null);
  const openExternalDetails = (index: number) => {
    const value = form.getValues(`participants.${index}`) as ParticipantValue | undefined;
    if (value) setExternalEdit({ index, value: { ...value } });
  };
  const addDiscussion = () =>
    appendDiscussion(
      { topic: '', discussionSummary: '', decisionRemarks: '', remarks: '', tasks: [] },
      { shouldFocus: true, focusName: `discussions.${discussionFields.length}.topic` }
    );

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [sendMinutesOpen, setSendMinutesOpen] = useState(false);
  const [lastMinutesSentAt, setLastMinutesSentAt] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingType, setIsSavingType] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  // The record as loaded (code, names, created / finalized by) — for the printed minutes.
  const [meetingRecord, setMeetingRecord] = useState<MeetingRecordForPrint | null>(initialData || null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  // Status as last saved — finalized notes are locked (picking Finalize only locks once saved).
  const [savedStatus, setSavedStatus] = useState<{ no: number | null; name: string }>(() => ({
    no: initialData?.statusNo ?? null,
    name: initialData?.statusName || '',
  }));
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
      discussions: discussionsFromApi(initialData?.discussions, Number(initialData?.operTaskCompanyNo ?? companyNoStr) || null),
      documents: initialData?.documents || []
    }
  });

  /** Selects a location just added from the Business Location dropdown. */
  const selectCreatedLocation = async (createdId: string, label: string) => {
    let id = createdId;
    if (!id) {
      // The save response had no id: find the new location by its name.
      const matches = await locationService.searchLocations(label);
      const found = matches.find((l) => formatLocationDisplayLabel(l).toLowerCase() === label.trim().toLowerCase());
      id = found?.operLocationNo?.toString() || '';
    }
    if (!id) {
      toast.success(`Location "${label.trim()}" added. Select it from the list.`);
      return;
    }
    form.setValue('operLocationNo', id, { shouldDirty: true, shouldValidate: true });
    setLocationLabel(label.trim());
    toast.success(`Location "${label.trim()}" added and selected.`);
  };

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

            setSavedStatus({ no: res.data.statusNo ?? null, name: res.data.statusName || '' });
            setMeetingRecord(res.data);
            form.reset({
              ...res.data,
              meetingTypeNo: res.data.meetingTypeNo?.toString(),
              companyNo: res.data.operTaskCompanyNo?.toString() || companyNoStr,
              // Tasks saved before company existed start with the meeting's company.
              discussions: discussionsFromApi(res.data.discussions, Number(res.data.operTaskCompanyNo ?? companyNoStr) || null),
              meetingCategoryNo: res.data.meetingCategoryNo?.toString(),
              meetingModeNo: res.data.meetingModeNo?.toString(),
              operTaskCompanyNo: res.data.companyNo?.toString(),
              operLocationNo: res.data.operLocationNo?.toString(),
            });
            // Users / employees saved without an email get it looked up (Send Minutes needs it).
            void resolveParticipantContacts(res.data.participants || []).then((resolved) => {
              if (resolved.some((p, i) => p !== res.data.participants[i])) {
                form.setValue('participants', resolved as MeetingNotesFormData['participants'], { shouldDirty: false });
              }
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

  const { fields: participantFields, append: appendParticipant, remove: removeParticipant, update: updateParticipant } = useFieldArray({
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

  // Company for meeting tasks — same options as the task form.
  const taskCompanyOptions = useMemo(
    () =>
      taskFillValues?.taskCompany?.length
        ? taskFillValues.taskCompany.map((c) => ({
            label: c.CompanyName || c.AliasName || c.Code || 'Unknown Company',
            value: String(c.OperTaskCompanyNo || ''),
          }))
        : ((authCompanies || []) as Array<{ CompanyName?: string; companyName?: string; name?: string; companyNo?: number | string; CompanyNo?: number | string }>).map((c) => ({
            label: c.CompanyName || c.companyName || c.name || 'Unknown Company',
            value: String(c.companyNo || c.CompanyNo || ''),
          })),
    [taskFillValues, authCompanies]
  );
  const watchedCompanyNo = form.watch('companyNo');
  const taskOptions = useMemo(() => buildTaskOptions(taskFillValues), [taskFillValues]);

  const currentStatusName = useMemo(() => {
    const match = statuses.find(
      (s) => String(s.statusNo) === String(watchedStatusNo)
    );
    return match?.statusName || match?.StatusName || '';
  }, [statuses, watchedStatusNo]);

  const savedStatusName =
    savedStatus.name ||
    statuses.find((s) => savedStatus.no != null && String(s.statusNo) === String(savedStatus.no))?.statusName ||
    '';
  /** Finalized: the tasks have been created and the meeting notes can no longer be changed. */
  const isLocked = Boolean(resolvedMeetingNo) && isMeetingFinalized(savedStatusName);
  /** This save finalizes the notes: it creates the tasks and locks the form. */
  const isFinalizing = !isLocked && isMeetingFinalized(currentStatusName);

  const minutesRecipients = useMemo(
    () => buildMinutesRecipients(watchedParticipants || []),
    [watchedParticipants]
  );

  /** Prints the meeting notes as minutes of meeting (what is on screen; DRAFT until finalized). */
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const v = form.getValues();
      const rec = meetingRecord || {};
      const userName = (u?: PrintUserRef | null) => String(u?.printingName || u?.displayName || u?.loginId || '').trim();
      const label = (list: Array<Record<string, unknown>>, value: unknown, key: string, nameKey: string) => {
        const match = list.find((x) => String(x?.id ?? x?.[key]) === String(value ?? ''));
        return String(match?.[nameKey] || match?.name || '');
      };

      // Assignee names: one cached lookup per person.
      const ownerNos = [
        ...new Set((v.discussions || []).flatMap((d) => (d.tasks || []).map((t) => Number(t.actionTaskOwnerNo)).filter((n) => n > 0))),
      ];
      const owners = new Map(
        await Promise.all(ownerNos.map(async (n) => [n, (await userService.getUserBrief(n))?.name || ''] as const))
      );

      const html = buildMeetingMinutesHtml({
        meetingCode: rec.code || '',
        title: v.meetingTitle || '',
        status: currentStatusName || rec.statusName || '',
        finalized: isLocked,
        category: label(meetingCategories, v.meetingCategoryNo, 'meetingCategoryNo', 'meetingCategoryName') || rec.meetingCategoryName || '',
        type: label(meetingTypes, v.meetingTypeNo, 'meetingTypeNo', 'meetingTypeName') || rec.meetingTypeName || '',
        mode: label(meetingModes, v.meetingModeNo, 'meetingModeNo', 'meetingModeName') || rec.meetingModeName || '',
        location: locationLabel || rec.operLocation || '',
        taskCompany:
          rec.taskCompanyName ||
          optionLabel(taskCompanyOptions, v.companyNo) ||
          optionLabel(taskCompanyOptions, v.operTaskCompanyNo) ||
          '',
        start: v.meetingStartDateTime,
        end: v.meetingEndDateTime,
        durationMinutes: v.durationMinutes,
        minutesUrl: v.meetingMinutesUrl,
        remarks: v.remarks,
        preparedBy: rec.createdBy ? { name: userName(rec.createdBy), date: rec.createdDate } : null,
        finalizedBy: isLocked && rec.authorizedBy ? { name: userName(rec.authorizedBy), date: rec.authorizedDate } : null,
        participants: (v.participants || []).map((p) => ({
          name: participantLabel(p as ParticipantValue),
          type: participantTypeLabel(p.participantType),
          organisation: p.companyName || '',
          designation: p.designation || '',
          email: p.email || '',
          contact: p.contactNo || '',
        })),
        discussions: (v.discussions || []).map((d) => ({
          topic: d.topic || '',
          summary: d.discussionSummary || '',
          decision: d.decisionRemarks || '',
          remarks: d.remarks || '',
          tasks: (d.tasks || []).map((t) => ({
            title: t.title || '',
            assignee: owners.get(Number(t.actionTaskOwnerNo)) || '',
            due: t.actionDueDate,
            priority: optionLabel(taskOptions.priority, t.operTaskPriorityNo) || '',
            category: optionLabel(taskOptions.category, t.operTaskCategoryNo) || '',
            type: optionLabel(taskOptions.type, t.operTaskTypeNo) || '',
            company: optionLabel(taskCompanyOptions, t.operTaskCompanyNo) || '',
            taskNo: t.operTaskNo,
          })),
        })),
        hideType: isHideType,
        printedBy: String(authUser?.PrintingName || authUser?.printingName || authUser?.DisplayName || authUser?.displayName || '').trim(),
        printedAt: new Date(),
      });
      await printHtml(html);
    } catch (err) {
      console.error('Failed to print meeting notes:', err);
      toast.error('Could not prepare the print. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

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
    // Already attached + still in the upload queue count toward the per-meeting limit.
    const existing = [
      ...((form.getValues('attachments') || []) as Array<{ name?: string; size?: number }>),
      ...uploadingFiles.map((f) => ({ name: f.name, size: f.fileObject?.size })),
    ];
    const { accepted: validFiles, rejected: failed } = selectUploadBatch(files, existing);
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
    type: 'participant' | 'discussion' | 'document' | 'task',
    index: number,
    label: string,
    taskIndex?: number
  ) => {
    setItemToDelete({ type, index, label, taskIndex });
  };

  const confirmRemoveItem = () => {
    if (!itemToDelete) return;
    const { type, index, taskIndex } = itemToDelete;
    if (type === 'participant') removeParticipant(index);
    else if (type === 'discussion') removeDiscussion(index);
    else if (type === 'task') {
      const path = `discussions.${index}.tasks` as const;
      const tasks = form.getValues(path) ?? [];
      form.setValue(path, tasks.filter((_, i) => i !== taskIndex), { shouldDirty: true });
      if (form.formState.errors.discussions?.[index]?.tasks) void form.trigger(path);
    } else removeDocument(index);
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
    if (isLocked) return;
    setPendingData(data);
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    const data = pendingData;
    if (!data || isLocked) return;

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
        meetingTypeNo: data.meetingTypeNo ? parseInt(data.meetingTypeNo) : null,
        // Not sent at the meeting level; each discussion task sends its own company.
        operTaskCompanyNo: null,
        meetingCategoryNo: parseInt(data.meetingCategoryNo),
        meetingModeNo: parseInt(data.meetingModeNo),
        operLocationNo: parseInt(data.operLocationNo),

        attachments: data.attachments.map((a: any) => ({
          docNo: a.id
        })),
        discussions: discussionsToApi(data.discussions || []),
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

          // External (typed email address)
          return {
            participantType: PARTICIPANT_TYPE.external,
            participantName: p.participantName || p.email,
            email: p.email,
            companyName: p.companyName,
            designation: p.designation,
            contactNo: p.contactNo,
          };
        })
      };

      const isUpdate = !!(meetingNotesNo || initialData?.meetingNotesNo);
      const url = '/api/crm/meeting-notes/save';

      if (isUpdate) {
        (payload as any).meetingNotesNo = meetingNotesNo || initialData?.meetingNotesNo;
      }

      await apiService.post(url, cleanEmptyStrings(payload));
      toast.success(
        isFinalizing
          ? 'Meeting notes finalized. Tasks have been created.'
          : isUpdate
            ? 'Meeting notes updated successfully.'
            : 'Meeting notes saved successfully.'
      );
      setSavedStatus({ no: data.statusNo ?? null, name: currentStatusName });
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
            const focusable = (element?.matches('input, select, textarea')
              ? element
              : element?.querySelector('button, input:not([type="hidden"]), select, textarea')) as HTMLElement;
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
      <div className="absolute inset-0 overflow-hidden bg-[var(--tm-page)] p-4 sm:p-6">
        <div className="rounded-[16px] border border-[var(--tm-border)] bg-[var(--tm-surface)] p-4 sm:p-6">
          <SkeletonForm
            sections={[6, 4]}
            textarea
            label={isFetchingData ? 'Loading meeting details' : 'Loading options'}
          />
        </div>
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
            label: isLocked
              ? 'View Meeting Note'
              : meetingNotesNo || initialData?.meetingNotesNo
                ? 'Edit Meeting Note'
                : 'Create Meeting Note',
            current: true,
          },
        ]}
        guideKey="meeting-form"
        actions={
          <div className="flex items-center gap-2" data-page-tour="meeting-form-actions">
            <Button type="button" variant="outline" size="sm" className="h-9 rounded-[8px] text-xs font-medium border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] text-slate-300 shadow-none px-3" onClick={requestLeave}>
              {isLocked ? 'Back' : 'Cancel'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPrinting || isFetchingData}
              onClick={() => void handlePrint()}
              title={isLocked ? 'Print the minutes of meeting' : 'Print the minutes (marked DRAFT until finalized)'}
              className="h-9 gap-1.5 rounded-[8px] text-xs font-medium border-[var(--tm-border)] bg-[var(--tm-surface)] hover:bg-[var(--tm-muted)] text-slate-300 shadow-none px-3"
            >
              <Printer size={14} /> {isPrinting ? 'Preparing…' : 'Print'}
            </Button>
            {!isLocked && ((meetingNotesNo || initialData?.meetingNotesNo) ? isUpdate : isSave) && (
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
          {isLocked ? (
            <div role="status" className="mb-3 flex items-start gap-2.5 rounded-[8px] border border-[#0EA5E9]/30 bg-[var(--tm-tint)] px-3.5 py-2.5">
              <Lock size={15} className="mt-0.5 shrink-0 text-[#0EA5E9]" />
              <div>
                <p className="text-xs font-semibold text-slate-100">Finalized — read only</p>
                <p className="text-[11px] text-slate-400">
                  The tasks from the discussion points have been created. These meeting notes can no longer be changed.
                </p>
              </div>
            </div>
          ) : null}
          <form onSubmit={form.handleSubmit(onSubmit, onValidationError)} className="space-y-3">
            <fieldset disabled={isLocked} className="m-0 min-w-0 space-y-3 border-0 p-0">

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
                          disabled={isLocked}
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

                {!isHideType && (
                <div id="form-group-meetingTypeNo" className="space-y-1.5">
                  <FieldLabel>Meeting Type</FieldLabel>
                  <Controller
                    control={form.control}
                    name="meetingTypeNo"
                    render={({ field }) => (
                      <FieldControl error={form.formState.errors.meetingTypeNo?.message}>
                        <Combobox className={cn("rounded-[8px] h-10 w-full", form.formState.errors.meetingTypeNo && "border-red-400")}
                          disabled={isLocked}
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
                )}


                <div id="form-group-operLocationNo" className="space-y-1.5">
                  <FieldLabel required>Business Location</FieldLabel>
                  <Controller
                    control={form.control}
                    name="operLocationNo"
                    render={({ field }) => (
                      <FieldControl error={form.formState.errors.operLocationNo?.message}>
                        <LocationCombobox
                          disabled={isLocked}
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
                          onAddNew={canAddLocation ? () => setLocationCreateOpen(true) : undefined}
                          addNewLabel="Add New Location"
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
                          disabled={isLocked}
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
                          disabled={isLocked}
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

            {/* SECTION 2: Participants — one Outlook-style "To" field */}
            <FormSection
              title="Participants"
              icon={Users}
              tourId="meeting-form-participants"
              headerAction={
                participantFields.length > 0 ? (
                  <span className="text-[11px] font-medium text-slate-400">
                    {participantFields.length} participant{participantFields.length === 1 ? '' : 's'}
                  </span>
                ) : null
              }
            >
              <div id="form-group-participants">
                <FieldControl
                  error={
                    (form.formState.errors.participants?.message ||
                      form.formState.errors.participants?.root?.message ||
                      (Array.isArray(form.formState.errors.participants) && form.formState.errors.participants.some(Boolean)
                        ? 'Add the missing details for the highlighted external participants.'
                        : undefined)) as string | undefined
                  }
                >
                  <ParticipantChipsInput
                    participants={(watchedParticipants || []) as ParticipantValue[]}
                    onAdd={(participant) => {
                      const index = (form.getValues('participants') || []).length;
                      appendParticipant(participant as MeetingNotesFormData['participants'][number]);
                      if (form.formState.errors.participants) void form.trigger('participants');
                      // External: ask for the details the API requires (several pasted at once → the first).
                      if (participant.participantType === PARTICIPANT_TYPE.external) {
                        setExternalEdit((open) => open ?? { index, value: { ...participant } });
                      }
                    }}
                    onRemove={(index) => {
                      removeParticipant(index);
                      void form.trigger('participants');
                    }}
                    onEditExternal={openExternalDetails}
                    invalid={!!form.formState.errors.participants}
                    disabled={isLocked}
                  />
                </FieldControl>
                {!isLocked ? (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Search users or employees by name, or type an email address and press Enter to add an external participant. Click an external participant to edit their details.
                  </p>
                ) : null}
              </div>
            </FormSection>
            </fieldset>

            {/* SECTION 4: Discussions & Action Items — topic, summary and decision inline; tasks in a drawer.
                Kept outside the disabled fieldset: once finalized, its controls are read-only one by one
                (isLocked), while the task list toggle and "View task" must still work. */}
            <FormSection
              title="Discussions & Outcomes"
              icon={MessageSquare}
              tourId="meeting-form-discussions"
              headerAction={
                isLocked ? null : <Button type="button" onClick={addDiscussion} variant="outline" size="sm" className="h-9 rounded-[8px] text-xs font-medium border-[#0EA5E9]/25 text-[#0EA5E9] hover:bg-[var(--tm-tint)]">
                  <Plus size={14} className="mr-1" /> Add Discussion Point
                </Button>
              }
            >
              {discussionFields.length === 0 ? (
                <div id="form-group-discussions" className="text-center p-8 border border-dashed border-[var(--tm-border)] rounded-[8px] bg-[var(--tm-elevated)]">
                  <p className="text-xs text-slate-500 font-medium">No discussion points added yet.</p>
                </div>
              ) : (
                <div id="form-group-discussions" className="overflow-x-auto border border-[var(--tm-border)]/60 rounded-[8px] bg-[var(--tm-surface)]/80">
                  <table className="tm-data-table w-full text-left border-collapse min-w-[1000px]">
                    <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-[10px] text-slate-300 font-semibold uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2.5 w-10 border-r border-[var(--tm-border)] text-center">#</th>
                        <th className="px-3 py-2.5 w-[22%] border-r border-[var(--tm-border)]">Topic / Agenda{!isLocked && <span className="ml-0.5 text-red-400">*</span>}</th>
                        <th className="px-3 py-2.5 w-[26%] border-r border-[var(--tm-border)]">Discussion Summary</th>
                        <th className="px-3 py-2.5 w-[20%] border-r border-[var(--tm-border)]">Decision Remarks</th>
                        <th className="px-3 py-2.5 w-[24%] border-r border-[var(--tm-border)]">Tasks</th>
                        <th className="px-1 py-2.5 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--tm-border)]">
                      {discussionFields.map((field, index) => {
                        const line = (form.watch(`discussions.${index}`) || {}) as MeetingNotesDiscussion;
                        const topicValue = (line.topic || '').trim();
                        const lineErrors = form.formState.errors.discussions?.[index];
                        const topicError = lineErrors?.topic?.message;
                        const tasksError = !!lineErrors?.tasks;
                        const tasks = line.tasks ?? [];
                        // Missing task details keep the task table open so they can be fixed.
                        const expanded = expandedLines.has(field.id) || tasksError;
                        const owners = [...new Set(tasks.map((t) => t.actionTaskOwnerNo).filter((n): n is number => n != null))];
                        const nextDue = tasks
                          .map((t) => t.actionDueDate)
                          .filter((d): d is string => !!d && !Number.isNaN(Date.parse(d)))
                          .sort((a, b) => Date.parse(a) - Date.parse(b))[0];
                        const invalidCount = tasks.filter((_, ti) => !!lineErrors?.tasks?.[ti]).length;
                        return (
                          <React.Fragment key={field.id}>
                          <tr className={cn('group align-top', (topicError || tasksError) && 'bg-red-500/5')}>
                            <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-center font-medium text-slate-400 align-top">
                              {index + 1}
                            </td>
                            <td className="px-2 py-2 border-r border-[var(--tm-border)] align-top">
                              {isLocked ? (
                                <p className="px-1 py-0.5 text-xs font-semibold text-slate-100 whitespace-normal break-words">{topicValue || '—'}</p>
                              ) : (
                                <FieldControl error={topicError}>
                                  <Input
                                    {...form.register(`discussions.${index}.topic` as const)}
                                    maxLength={200}
                                    placeholder="What was discussed?"
                                    aria-label={`Topic / Agenda ${index + 1}`}
                                    className={cn('h-9 rounded-[8px] text-xs font-semibold', topicError && 'border-red-400')}
                                  />
                                </FieldControl>
                              )}
                            </td>
                            <td className="px-2 py-2 border-r border-[var(--tm-border)] align-top">
                              {isLocked ? (
                                <p className="px-1 py-0.5 text-xs text-slate-300 whitespace-pre-wrap break-words">{line.discussionSummary || '—'}</p>
                              ) : (
                                <FieldControl error={lineErrors?.discussionSummary?.message}>
                                  <Textarea
                                    {...form.register(`discussions.${index}.discussionSummary` as const)}
                                    maxLength={700}
                                    placeholder="Details..."
                                    aria-label={`Discussion Summary ${index + 1}`}
                                    className="min-h-[72px] rounded-[8px] text-xs"
                                  />
                                </FieldControl>
                              )}
                            </td>
                            <td className="px-2 py-2 border-r border-[var(--tm-border)] align-top">
                              {isLocked ? (
                                <p className="px-1 py-0.5 text-xs text-slate-300 whitespace-pre-wrap break-words">{line.decisionRemarks || '—'}</p>
                              ) : (
                                <FieldControl error={lineErrors?.decisionRemarks?.message}>
                                  <Textarea
                                    {...form.register(`discussions.${index}.decisionRemarks` as const)}
                                    maxLength={300}
                                    placeholder="Final decision..."
                                    aria-label={`Decision Remarks ${index + 1}`}
                                    className="min-h-[72px] rounded-[8px] text-xs"
                                  />
                                </FieldControl>
                              )}
                            </td>
                            <td className="px-3 py-2.5 border-r border-[var(--tm-border)] align-top">
                              {tasks.length === 0 ? (
                                isLocked ? (
                                  <span className="text-[11px] text-slate-500">No tasks</span>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openTask(index, null)}
                                    className="h-7 px-1.5 -mx-1.5 rounded-[6px] text-[11px] font-medium text-[#0EA5E9] hover:bg-[var(--tm-tint)] hover:text-[#0EA5E9]"
                                  >
                                    <Plus size={12} className="mr-1" /> Add Task
                                  </Button>
                                )
                              ) : (
                                <div className="flex min-w-0 items-start gap-1">
                                  {/* Summary: count, assignees, next due, missing details; expands the task table below */}
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => toggleLineTasks(field.id)}
                                    aria-expanded={expanded}
                                    aria-label={`${expanded ? 'Hide' : 'Show'} tasks of discussion ${index + 1}`}
                                    className="h-auto min-w-0 flex-1 flex-wrap justify-start gap-x-2 gap-y-1 whitespace-normal rounded-[6px] px-1.5 py-1 -mx-1.5 text-left hover:bg-[var(--tm-muted)]/40"
                                  >
                                    <ChevronDown size={14} className={cn('shrink-0 text-slate-400 transition-transform', expanded && 'rotate-180')} />
                                    <span className="text-[11px] font-semibold text-slate-100">
                                      {tasks.length} task{tasks.length === 1 ? '' : 's'}
                                    </span>
                                    {owners.length ? (
                                      <span className="flex items-center -space-x-1.5">
                                        {owners.slice(0, 3).map((loginNo) => (
                                          <AssigneeAvatar key={loginNo} loginNo={loginNo} className="ring-2 ring-[var(--tm-surface)]" />
                                        ))}
                                        {owners.length > 3 ? (
                                          <span className="relative inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--tm-muted)] px-1 text-[9px] font-semibold text-slate-300 ring-2 ring-[var(--tm-surface)]">
                                            +{owners.length - 3}
                                          </span>
                                        ) : null}
                                      </span>
                                    ) : null}
                                    {nextDue ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-normal text-slate-400">
                                        <CalendarClock size={11} /> Next {formatUtcDateTime(nextDue)}
                                      </span>
                                    ) : null}
                                    {invalidCount > 0 && !isLocked ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                                        <AlertCircleIcon size={10} /> {invalidCount} need details
                                      </span>
                                    ) : null}
                                  </Button>
                                  {!isLocked && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openTask(index, null)}
                                      aria-label={`Add task to discussion ${index + 1}`}
                                      title="Add task"
                                      className="h-7 w-7 shrink-0 rounded-[6px] text-[#0EA5E9] hover:bg-[var(--tm-tint)] hover:text-[#0EA5E9]"
                                    >
                                      <Plus size={14} />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-1 py-2 text-center align-top">
                              {!isLocked && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => requestRemoveItem('discussion', index, topicValue || `Discussion ${index + 1}`)}
                                  className="h-8 w-8 rounded-[8px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  title="Remove discussion"
                                  aria-label="Remove discussion"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                            </td>
                          </tr>
                          {expanded && tasks.length > 0 ? (
                            <tr className="bg-[var(--tm-elevated)]/30">
                              <td colSpan={6} className="px-3 py-2">
                                <div className="ml-7 overflow-hidden rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)]">
                                  {/* One line per task; scrolls past ~8 so long lists stay compact */}
                                  <div className="max-h-[22rem] overflow-auto">
                                    <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
                                      <thead className="sticky top-0 z-10 bg-[var(--tm-elevated)] text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        <tr>
                                          <th className="w-8 px-2 py-1.5 text-center">#</th>
                                          <th className="px-2 py-1.5">Task Title</th>
                                          <th className="px-2 py-1.5">Assign To</th>
                                          <th className="px-2 py-1.5">Due</th>
                                          <th className="px-2 py-1.5">Priority</th>
                                          <th className="px-2 py-1.5">Category</th>
                                          {!isHideType && <th className="px-2 py-1.5">Type</th>}
                                          <th className="px-2 py-1.5">Company</th>
                                          <th className="w-16 px-2 py-1.5" />
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-[var(--tm-border)]">
                                        {tasks.map((task, ti) => {
                                          const taskInvalid = !!lineErrors?.tasks?.[ti];
                                          const taskLabel = task.title || `Task ${ti + 1}`;
                                          return (
                                            <tr key={task.key || ti} className={cn('align-middle hover:bg-[var(--tm-muted)]/30', taskInvalid && 'bg-red-500/5')}>
                                              <td className="px-2 py-1.5 text-center text-slate-500">{ti + 1}</td>
                                              <td className="px-2 py-1.5">
                                                <div className="flex min-w-0 items-center gap-1.5">
                                                  {taskInvalid && !isLocked ? (
                                                    <AlertCircleIcon size={12} className="shrink-0 text-red-400" aria-label="Missing required details" />
                                                  ) : null}
                                                  <span className="font-semibold text-slate-100 whitespace-normal break-words">{taskLabel}</span>
                                                  {task.operTaskNo ? (
                                                    <Link
                                                      to={taskUrl(Number(task.operTaskNo))}
                                                      target="_blank"
                                                      title="Open created task"
                                                      aria-label={`Open created task ${taskLabel}`}
                                                      className="shrink-0 text-[#0EA5E9] hover:text-[#0284C7]"
                                                    >
                                                      <ExternalLink size={11} />
                                                    </Link>
                                                  ) : null}
                                                </div>
                                              </td>
                                              <td className="px-2 py-1.5">
                                                {task.actionTaskOwnerNo ? <AssigneeLabel loginNo={task.actionTaskOwnerNo} /> : <span className="text-slate-500">—</span>}
                                              </td>
                                              <td className="px-2 py-1.5 whitespace-nowrap text-slate-300">
                                                {task.actionDueDate ? formatUtcDateTime(task.actionDueDate) : '—'}
                                              </td>
                                              <td className="px-2 py-1.5 text-slate-300">{optionLabel(taskOptions.priority, task.operTaskPriorityNo) || '—'}</td>
                                              <td className="px-2 py-1.5 text-slate-300">{optionLabel(taskOptions.category, task.operTaskCategoryNo) || '—'}</td>
                                              {!isHideType && (
                                                <td className="px-2 py-1.5 text-slate-300">{optionLabel(taskOptions.type, task.operTaskTypeNo) || '—'}</td>
                                              )}
                                              <td className="px-2 py-1.5 text-slate-300">{optionLabel(taskCompanyOptions, task.operTaskCompanyNo) || '—'}</td>
                                              <td className="px-2 py-1.5">
                                                <div className="flex items-center justify-end gap-0.5">
                                                  {isLocked ? (
                                                    <Button
                                                      type="button"
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={() => openTask(index, ti)}
                                                      aria-label={`View task ${taskLabel}`}
                                                      title="View task"
                                                      className="h-6 w-6 rounded-[6px] text-slate-400 hover:bg-[var(--tm-muted)] hover:text-[#0EA5E9]"
                                                    >
                                                      <Eye size={12} />
                                                    </Button>
                                                  ) : (
                                                    <>
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openTask(index, ti)}
                                                        aria-label={`Edit task ${taskLabel}`}
                                                        title="Edit task"
                                                        className="h-6 w-6 rounded-[6px] text-slate-400 hover:bg-[var(--tm-muted)] hover:text-[#0EA5E9]"
                                                      >
                                                        <Pencil size={12} />
                                                      </Button>
                                                      <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => requestRemoveItem('task', index, taskLabel, ti)}
                                                        aria-label={`Delete task ${taskLabel}`}
                                                        title="Delete task"
                                                        className="h-6 w-6 rounded-[6px] text-red-400 hover:bg-red-500/10 hover:text-red-400"
                                                      >
                                                        <Trash2 size={12} />
                                                      </Button>
                                                    </>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                  {!isLocked && (
                                    <div className="border-t border-[var(--tm-border)] px-2 py-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openTask(index, null)}
                                        className="h-7 px-1.5 rounded-[6px] text-[11px] font-medium text-[#0EA5E9] hover:bg-[var(--tm-tint)] hover:text-[#0EA5E9]"
                                      >
                                        <Plus size={12} className="mr-1" /> Add Task
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : null}
                        </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </FormSection>

            <ExternalParticipantDialog
              open={externalEdit !== null}
              onOpenChange={(open) => {
                if (!open) setExternalEdit(null);
              }}
              value={externalEdit?.value ?? null}
              onSave={(details) => {
                if (!externalEdit) return;
                const current = form.getValues(`participants.${externalEdit.index}`);
                updateParticipant(externalEdit.index, { ...current, ...details, participantType: PARTICIPANT_TYPE.external });
                if (form.formState.errors.participants) void form.trigger('participants');
              }}
            />

            {tasksDrawer ? (
              <DiscussionTasksDrawer
                key={tasksDrawer.session}
                open={tasksDrawer.open}
                onOpenChange={(open) => {
                  if (!open) setTasksDrawer((prev) => (prev ? { ...prev, open: false } : prev));
                }}
                task={tasksDrawer.task}
                taskNo={tasksDrawer.taskIndex != null ? tasksDrawer.taskIndex + 1 : undefined}
                topic={tasksDrawer.topic}
                lineNo={tasksDrawer.index + 1}
                taskFillValues={taskFillValues}
                companyOptions={taskCompanyOptions}
                defaultCompanyNo={Number(watchedCompanyNo) || null}
                isHideType={isHideType}
                isHideFolder={isHideFolder}
                currentLoginNo={currentLoginNo}
                readOnly={isLocked}
                onSave={(task) => {
                  const path = `discussions.${tasksDrawer.index}.tasks` as const;
                  const current = form.getValues(path) ?? [];
                  const { taskIndex } = tasksDrawer;
                  const tasks = taskIndex == null ? [...current, task] : current.map((t, i) => (i === taskIndex ? task : t));
                  form.setValue(path, tasks, { shouldDirty: true });
                  const fieldId = discussionFields[tasksDrawer.index]?.id;
                  if (fieldId) setExpandedLines((prev) => new Set(prev).add(fieldId));
                  if (form.formState.errors.discussions?.[tasksDrawer.index]?.tasks) void form.trigger(path);
                  setTasksDrawer((prev) => (prev ? { ...prev, open: false } : prev));
                }}
              />
            ) : null}

            <fieldset disabled={isLocked} className="m-0 min-w-0 space-y-3 border-0 p-0">
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
                                        disabled={isLocked || !(Number(docType) > 0)}
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

            </fieldset>

            {/* SECTION 5: Attachments */}
            < FormSection title="Documents / Attachments" icon={Paperclip} tourId="meeting-form-attachments" >
              <div className="space-y-3">
                {/* Same upload area as the CRM's lead / opportunity forms. */}
                {!isLocked && (
                <AttachmentDropZone
                  inputRef={fileInputRef}
                  onFiles={processFiles}
                  onInputChange={handleFileSelection}
                  accept={UPLOAD_ACCEPT_ATTR}
                  helperText={ALLOWED_UPLOAD_HELPER_TEXT}
                />
                )}

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

                  // Uploaded files, as in the CRM's attachment list.
                  return (
                    <div className="space-y-2">
                      {attachments.map((file: any) => (
                        <AttachedFileRow
                          key={file.id}
                          name={file.name}
                          sizeLabel={file.size ? formatFileSize(file.size) : undefined}
                          onView={() => attachmentService.downloadAttachment(file.id, file.name)}
                          onRename={() => setAttachmentToRename({ id: file.id, name: file.name })}
                          onDelete={() => handleRemoveAttachment(file.id, file.name)}
                          renameDisabled={attachmentToRename != null}
                          readOnly={isLocked}
                          renaming={
                            attachmentToRename?.id === file.id ? (
                              <InlineAttachmentRename
                                originalName={file.name || 'document'}
                                saving={isRenamingAttachment}
                                onSave={confirmRenameAttachment}
                                onCancel={() => setAttachmentToRename(null)}
                              />
                            ) : undefined
                          }
                        />
                      ))}
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
              : itemToDelete?.type === 'task'
                ? 'task'
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
      <MasterCreateDialog
        open={locationCreateOpen}
        onOpenChange={setLocationCreateOpen}
        type="location"
        companyNo={companyNoStr}
        fillValues={taskFillValues}
        onSuccess={(id, label) => void selectCreatedLocation(id, label)}
      />
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
              {isFinalizing ? 'Finalize meeting notes?' : 'Confirm Save'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-1.5">
              {isFinalizing
                ? (() => {
                    const taskCount = ((pendingData?.discussions || []) as MeetingNotesDiscussion[]).reduce((n, d) => n + (d.tasks?.length || 0), 0);
                    return `Finalizing creates ${taskCount} task${taskCount === 1 ? '' : 's'} from the discussion points and locks these meeting notes. They can't be edited afterwards.`;
                  })()
                : 'Are you sure you want to save these meeting notes?'}
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
              {isFinalizing ? 'Finalize' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
