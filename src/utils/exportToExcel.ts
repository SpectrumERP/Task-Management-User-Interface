import * as XLSX from 'xlsx';

export const exportReportToExcel = (data: any[], groupedByUser: boolean, filename: string = 'Task_Report.xlsx') => {
  const wb = XLSX.utils.book_new();

  if (data.length === 0) return;

  const headerRow = [
    'Sr. No.',
    'Task',
    'Description of Task',
    'Pending Task',
    'Cross Functional Support',
    'Company',
    'Location',
    'Category',
    'Type',
    'Folder',
    'Priority',
    ...(groupedByUser ? [] : ['Assign To']),
    'Assign By',
    'Sub Task Count',
    'Road Block',
    'Task Progress Review',
    'Task Status',
    'User Remarks',
    'Management Remarks'
  ];

  const mapTaskToRow = (task: any, idx: number) => [
    idx + 1,
    task.title || '',
    task.description || '',
    task.isPending ? 'Yes' : 'No',
    task.hasCrossFunctionalSupport ? 'Yes' : 'No',
    task.taskCompany?.taskCompanyAlias || task.taskCompany?.companyName || '',
    task.location?.locationName || '',
    task.category?.categoryName || '',
    task.type?.typeName || '',
    task.folder?.folderName || '',
    task.priority?.priorityName || '',
    ...(groupedByUser ? [] : [task.assignedTo?.displayName || '']),
    task.originator?.displayName || '',
    task.subTaskCount ?? 0,
    task.roadBlock || '',
    task.taskProgressReview || '',
    task.status?.statusName || task.status || '',
    task.completionRemark || '',
    task.managementRemark || ''
  ];

  const rows: any[][] = [];

  if (groupedByUser) {
    const groupedData: Record<string, any[]> = {};
    data.forEach((task) => {
      const owner = task.assignedTo?.displayName || task.ownerLoginNo || 'Unassigned';
      if (!groupedData[owner]) groupedData[owner] = [];
      groupedData[owner].push(task);
    });

    Object.entries(groupedData).forEach(([owner, tasks]) => {
      rows.push([`Task Assign To - ${owner}`]);
      rows.push(headerRow);

      tasks.forEach((task, idx) => {
        rows.push(mapTaskToRow(task, idx));
      });

      // Add empty row for spacing
      rows.push([]);
    });
  } else {
    rows.push(headerRow);
    data.forEach((task, idx) => {
      rows.push(mapTaskToRow(task, idx));
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto-size columns roughly
  const colWidths = headerRow.map(() => ({ wch: 20 }));
  colWidths[2] = { wch: 40 }; // Description wider
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename);
};

export const exportMeetingReportToExcel = (data: any[], filename: string = 'Meeting_Notes_Report.xlsx') => {
  const wb = XLSX.utils.book_new();

  if (data.length === 0) return;

  const headerRow = [
    'Sr. No.',
    'Meeting Note Title',
    'Category',
    'Type',
    'Company',
    'Location',
    'Meeting Mode',
    'Start Date and Time',
    'End Date and Time',
    'Participants',
    'Discussions Made',
    'Discussion Remarks',
    'Status'
  ];

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      const d = new Date(dateString);
      return `${d.getDate().toString().padStart(2, '0')}-${d.toLocaleString('default', { month: 'short' })}-${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return dateString;
    }
  };

  const mapMeetingToRow = (meeting: any, idx: number) => [
    idx + 1,
    meeting.meetingTitle || meeting.title || '',
    meeting.meetingCategoryName || meeting.category?.categoryName || '',
    meeting.meetingTypeName || meeting.type?.typeName || '',
    meeting.companyName || meeting.taskCompany?.companyName || meeting.company?.companyName || '',
    meeting.locationName || meeting.location?.locationName || '',
    meeting.mode || meeting.meetingMode?.meetingModeName || '',
    formatDate(meeting.meetingStartDateTime || meeting.startDateTime || meeting.startDate),
    formatDate(meeting.meetingEndDateTime || meeting.endDateTime || meeting.endDate),
    Array.isArray(meeting.participants) ? meeting.participants.map((p: any) => typeof p === 'string' ? p : (p.printingName || p.loginId || p.participantName)).filter(Boolean).join(', ') : meeting.participants || meeting.internalUsers || '-',
    Array.isArray(meeting.discussionDetail) ? meeting.discussionDetail.map((d: any) => d.topic || d.discussionSummary).filter(Boolean).map((t: any) => `• ${t}`).join('\n') : meeting.discussionsMade || meeting.agenda || '-',
    Array.isArray(meeting.discussionDetail) ? meeting.discussionDetail.map((d: any) => d.decisionRemarks).filter(Boolean).map((t: any) => `• ${t}`).join('\n') : meeting.discussionRemarks || meeting.remarks || '-',
    meeting.statusName || meeting.status?.statusName || meeting.status || ''
  ];

  const rows: any[][] = [];
  rows.push(headerRow);
  data.forEach((meeting, idx) => {
    rows.push(mapMeetingToRow(meeting, idx));
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const colWidths = headerRow.map(() => ({ wch: 20 }));
  colWidths[1] = { wch: 30 };
  colWidths[9] = { wch: 40 };
  colWidths[10] = { wch: 40 };
  colWidths[11] = { wch: 40 };
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename);
};
