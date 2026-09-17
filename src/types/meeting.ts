import * as z from 'zod';

/** Convert cleared combobox / NaN into null so Zod shows friendly required messages */
const emptyToNull = (v: unknown) => {
  if (v === '' || v === undefined) return null;
  if (typeof v === 'number' && Number.isNaN(v)) return null;
  return v;
};

export const meetingParticipantSchema = z.object({
  mnParticipantDetailNo: z.number().optional(),
  participantType: z.number(),
  userNo: z.number().optional().nullable(),
  empNo: z.number().optional().nullable(),
  businessEntityNo: z.number().optional().nullable(),
  businessEntityContactPersonDetailNo: z.number().optional().nullable(),
  participantName: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  contactNo: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  // If internal (e.g. 1), userNo is required. If external (e.g. 2), participantName is required.
  // Assuming 1 = Internal, 2 = External, 3 = Business Entity for validation logic
  if (data.participantType === 1) {
    if (!data.userNo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Internal User is required',
        path: ['userNo']
      });
    }
  } else if (data.participantType === 2) {
    if (!data.empNo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Employee No is required',
        path: ['empNo']
      });
    }
  } else if (data.participantType === 3) {
    if (!data.participantName || data.participantName.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Name is required', path: ['participantName'] });
    }
    if (!data.companyName || data.companyName.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Company is required', path: ['companyName'] });
    }
    if (!data.email || data.email.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Email is required', path: ['email'] });
    }
    if (!data.designation || data.designation.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Designation is required', path: ['designation'] });
    }
    if (!data.contactNo || data.contactNo.trim() === '') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Contact No is required', path: ['contactNo'] });
    }
  } else if (data.participantType === 4) {
    if (!data.businessEntityContactPersonDetailNo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Business Entity Contact is required',
        path: ['businessEntityContactPersonDetailNo']
      });
    }
  }
});

export const getMeetingDiscussionSchema = (isHideType: boolean = false) => z.object({
  mnDiscussionDetailNo: z.number().optional(),
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic cannot exceed 200 characters'),
  discussionSummary: z.string().max(700, 'Summary cannot exceed 700 characters').optional().nullable(),
  decisionRemarks: z.string().max(300, 'Decision cannot exceed 300 characters').optional().nullable(),
  isActionRequired: z.boolean().default(false),
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional().nullable(),

  // Required only if isActionRequired is true
  actionTaskOwnerNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  actionDueDate: z.string().optional().nullable(),
  operTaskCategoryNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  operTaskTypeNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  operTaskPriorityNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  taskFolderNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  actionTaskOriginatorNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  operTaskNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
}).superRefine((data, ctx) => {
  if (data.isActionRequired) {
    if (data.actionTaskOwnerNo == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Task Assign To is required', path: ['actionTaskOwnerNo'] });
    }
    if (!data.actionDueDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Due Date is required', path: ['actionDueDate'] });
    }
    if (data.operTaskCategoryNo == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Task Category is required', path: ['operTaskCategoryNo'] });
    }
    if (!isHideType && data.operTaskTypeNo == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Task Type is required', path: ['operTaskTypeNo'] });
    }
    if (data.operTaskPriorityNo == null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Task Priority is required', path: ['operTaskPriorityNo'] });
    }
  }
});

export const meetingDocumentSchema = z.object({
  mnDocumentDetailNo: z.number().optional(),
  documentType: z.preprocess(
    (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? 0 : Number(v)),
    z.number().refine((n) => n > 0, { message: 'Document Name is required' })
  ),
  documentNo: z.preprocess(
    (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? 0 : Number(v)),
    z.number().refine((n) => n > 0, { message: 'Document No is required' })
  ),
  formNo: z.number().optional(), // For UI logic
  context: z.string().optional(), // For UI logic
  documentDisplayValue: z.string().optional(), // For showing the selected doc name
  documentNoYearly: z.string().optional().nullable(),
});

export const getMeetingSchema = (isHideType: boolean = false) => z.object({
  meetingNotesNo: z.number().optional(),
  meetingTitle: z.string().min(1, 'Meeting Title is required').max(200, 'Title cannot exceed 200 characters'),
  meetingTypeNo: z.string().min(1, 'Meeting Type is required'),
  companyNo: z.string().min(1, 'Company is required'),
  divisionNo: z.string().optional(),
  meetingCategoryNo: z.string().min(1, 'Meeting Category is required'),
  meetingStartDateTime: z.string().min(1, 'Start Date & Time is required'),
  meetingEndDateTime: z.string().min(1, 'End Date & Time is required'),
  durationMinutes: z.number().min(1, 'Duration must be greater than 0'),
  meetingModeNo: z.string().min(1, 'Meeting Mode is required'),
  operTaskCompanyNo: z.string().min(1, 'Task Company is required'),
  operLocationNo: z.string().min(1, 'Location is required'),
  meetingMinutesUrl: z.string().url('Must be a valid URL').optional().nullable().or(z.literal('')),
  remarks: z.string().max(1000, 'Remarks cannot exceed 1000 characters').optional().nullable(),
  statusNo: z.number().default(1),
  documentStatusNo: z.number().default(1),

  participants: z.array(meetingParticipantSchema).min(1, 'At least one participant is required').default([]),
  discussions: z.array(getMeetingDiscussionSchema(isHideType)).default([]),
  documents: z.array(meetingDocumentSchema).default([]),
  attachments: z.array(z.any()).default([]),
}).superRefine((data, ctx) => {
  if (data.meetingStartDateTime && data.meetingEndDateTime) {
    if (new Date(data.meetingEndDateTime) <= new Date(data.meetingStartDateTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End Time must be after Start Time',
        path: ['meetingEndDateTime']
      });
    }
  }
});

export type MeetingNotesParticipant = z.infer<typeof meetingParticipantSchema>;
export type MeetingNotesDiscussion = z.infer<ReturnType<typeof getMeetingDiscussionSchema>>;
export type MeetingNotesDocument = z.infer<typeof meetingDocumentSchema>;
export type MeetingNotesFormData = z.infer<ReturnType<typeof getMeetingSchema>>;
