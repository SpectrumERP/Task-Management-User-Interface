# Meeting notes: several tasks per discussion line

A discussion line (agenda) can raise several tasks. The UI uses the `taskDetails` list on
`POST /api/crm/meeting-notes/save` and `GET /api/crm/meeting-notes/load-data/{id}`.

## What the UI sends

```jsonc
"discussions": [
  {
    "topic": "Vendor onboarding",
    "discussionSummary": "…",
    "decisionRemarks": "…",
    "remarks": null,
    "isActionRequired": true,           // true exactly when taskDetails is not empty
    "taskDetails": [
      {
        "title": "Collect vendor KYC",  // NEEDED: own title per task (UI defaults it to the topic)
        "operTaskCompanyNo": 3,         // same values as the task form's Company
        "operTaskCategoryNo": 12,
        "operTaskTypeNo": 4,            // null when task types are hidden in settings
        "operTaskPriorityNo": 2,
        "taskFolderNo": null,
        "actionTaskOriginatorNo": 101,  // Assign By
        "actionTaskOwnerNo": 145,       // Assign To
        "actionDueDate": "2026-10-24T09:30:00.000Z"
      }
    ]
  }
]
```

The UI requires every field above except `taskFolderNo`, and requires `operTaskTypeNo` only when
task types are shown.

From load-data the UI reads `title`, `operTaskNo` (to link each card to its created task) and the
master objects (`operTaskCompany`, `category`, `taskType`, `priority`, `folder`, `originator`,
`owner`). Tasks without a `title` show the discussion topic.

## When tasks are created

Until the meeting notes are finalized, `taskDetails` is only data on the meeting. Users can save,
change and remove those rows as often as they need. The tasks are created when the notes are saved
with the Finalize status, and from then on the notes can't be changed. The UI makes the form read
only when the saved status name contains "final".

## Requests for the backend

1. **Create tasks only at finalize:** create the tasks once, on the save that sets the Finalize
   status, and set `operTaskNo` on each task detail row.
2. **Reject updates to finalized notes:** the UI hides Save for finalized notes, but the API should
   also refuse a save (and attachment changes) for them, so the lock can't be bypassed.
3. **Add `title` to both task models:** each task has its own title. Add `title` (string, max 200,
   required) to `MeetingNotesDiscussionTaskSaveModel` and `MeetingNotesDiscussionTaskLoadModel`, and
   use it as the created task's title. The UI already sends it; until then it is dropped on save.

UI mapping: `src/lib/meetingDiscussions.ts` (`discussionsFromApi` / `discussionsToApi`).
