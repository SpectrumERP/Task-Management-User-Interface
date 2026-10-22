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
  // Display names sent by load-data (not saved)
  printingName: z.string().optional().nullable(),
  empName: z.string().optional().nullable(),
  businessEntityContactPersonName: z.string().optional().nullable(),
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
    // External participants: added by email, the API also requires name, company, designation and contact.
    const required: [keyof typeof data, string][] = [
      ['participantName', 'Name is required'],
      ['email', 'Email is required'],
      ['companyName', 'Company Name is required'],
      ['designation', 'Designation is required'],
      ['contactNo', 'Contact No is required'],
    ];
    for (const [path, message] of required) {
      if (!String(data[path] ?? '').trim()) ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
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

/** One task raised from a discussion line (agenda). A line can raise several. */
export const getMeetingDiscussionTaskSchema = (isHideType: boolean = false) => z.object({
  /** Client-side key for the task cards (not saved). */
  key: z.string().optional(),
  /** Sent by load-data: the task detail row, and the task once it has been created. */
  mnDiscussionTaskDetailNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  operTaskNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  title: z.string().trim().min(1, 'Task Title is required').max(200, 'Title cannot exceed 200 characters'),
  operTaskCompanyNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  operTaskCategoryNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  operTaskTypeNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  operTaskPriorityNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  taskFolderNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  actionTaskOriginatorNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  actionTaskOwnerNo: z.preprocess(emptyToNull, z.number().optional().nullable()),
  actionDueDate: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  // Same mandatory fields as the task form.
  const required: [keyof typeof data, string][] = [
    ['operTaskCompanyNo', 'Company is required'],
    ['operTaskCategoryNo', 'Task Category is required'],
    ['operTaskPriorityNo', 'Task Priority is required'],
    ['actionTaskOriginatorNo', 'Task Assign By is required'],
    ['actionTaskOwnerNo', 'Task Assign To is required'],
    ['actionDueDate', 'Due Date is required'],
  ];
  if (!isHideType) required.push(['operTaskTypeNo', 'Task Type is required']);
  for (const [path, message] of required) {
    if (data[path] == null || data[path] === '') ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
  }
});

export const getMeetingDiscussionSchema = (isHideType: boolean = false) => z.object({
  mnDiscussionDetailNo: z.number().optional(),
  topic: z.string().min(1, 'Topic is required').max(200, 'Topic cannot exceed 200 characters'),
  discussionSummary: z.string().max(700, 'Summary cannot exceed 700 characters').optional().nullable(),
  decisionRemarks: z.string().max(300, 'Decision cannot exceed 300 characters').optional().nullable(),
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional().nullable(),
  tasks: z.array(getMeetingDiscussionTaskSchema(isHideType)).default([]),
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
  meetingTypeNo: z.string().optional().default(''),
  // Not shown on the form; defaults to the logged-in company.
  companyNo: z.string().optional().default(''),
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
export type MeetingNotesDiscussionTask = z.infer<ReturnType<typeof getMeetingDiscussionTaskSchema>>;
export type MeetingNotesDocument = z.infer<typeof meetingDocumentSchema>;
export type MeetingNotesFormData = z.infer<ReturnType<typeof getMeetingSchema>>;
