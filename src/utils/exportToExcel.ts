import * as XLSX from 'xlsx';
import { formatDateOnly, formatUtcDateTime } from '@/lib/dateTime';

export const exportReportToExcel = (data: any[], groupedByUser: boolean, filename: string = 'Task_Report.xlsx') => {
  const wb = XLSX.utils.book_new();

  if (data.length === 0) return;

  const savedStr = localStorage.getItem('taskListViewColumns');
  let visibleSet = new Set<string>();
  if (savedStr) {
    try {
      const parsed = JSON.parse(savedStr);
      if (Array.isArray(parsed)) parsed.forEach(k => visibleSet.add(k));
    } catch {}
  }
  if (visibleSet.size === 0) {
    ['code', 'status', 'title', 'category', 'type', 'priority', 'dueDate', 'completionDate', 'folder', 'createdBy', 'createdDate', 'owner', 'originator', 'companyName', 'location'].forEach(k => visibleSet.add(k));
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return formatDateOnly(dateString, '-');
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return formatUtcDateTime(dateString, '-');
  };

  const activeCols: { key: string; label: string; getVal: (t: any) => any }[] = [];
  
  if (visibleSet.has('code')) activeCols.push({ key: 'code', label: 'Task ID', getVal: t => t.taskNo || t.operTaskNo || '' });
  if (visibleSet.has('title')) activeCols.push({ key: 'title', label: 'Task Title', getVal: t => t.title || t.taskName || '' });
  if (visibleSet.has('status')) activeCols.push({ key: 'status', label: 'Task Status', getVal: t => t.status?.statusName || t.status || '' });
  if (visibleSet.has('category')) activeCols.push({ key: 'category', label: 'Category', getVal: t => t.categoryName || t.category?.categoryName || '' });
  if (visibleSet.has('type')) activeCols.push({ key: 'type', label: 'Type', getVal: t => t.typeName || t.type?.typeName || '' });
  if (visibleSet.has('priority')) activeCols.push({ key: 'priority', label: 'Priority', getVal: t => t.priority || t.priority?.priorityName || '' });
  if (visibleSet.has('dueDate')) activeCols.push({ key: 'dueDate', label: 'Due Date', getVal: t => formatDate(t.dueDate || t.targetDate) });
  if (visibleSet.has('completionDate')) activeCols.push({ key: 'completionDate', label: 'Completion Date', getVal: t => formatDate(t.completionDate) });
  if (visibleSet.has('folder')) activeCols.push({ key: 'folder', label: 'Folder', getVal: t => t.folderName || t.folder?.folderName || '' });
  if (visibleSet.has('createdBy')) activeCols.push({ key: 'createdBy', label: 'Created By', getVal: t => t.createdByDisplayName || t.createdBy?.displayName || t.createdBy?.printingName || '' });
  if (visibleSet.has('createdDate')) activeCols.push({ key: 'createdDate', label: 'Created Date', getVal: t => formatDateTime(t.createdDate) });
  if (visibleSet.has('owner') && !groupedByUser) activeCols.push({ key: 'owner', label: 'Assign To', getVal: t => t.assignedDisplayName || t.assignedTo?.displayName || t.ownerLoginNo || 'Unassigned' });
  if (visibleSet.has('originator')) activeCols.push({ key: 'originator', label: 'Assign By', getVal: t => t.originatorDisplayName || t.originator?.displayName || t.originatorLoginNo || '' });
  if (visibleSet.has('companyName')) activeCols.push({ key: 'companyName', label: 'Company', getVal: t => t.companyName || t.taskCompany?.taskCompanyAlias || t.taskCompany?.companyName || '' });
  if (visibleSet.has('location')) activeCols.push({ key: 'location', label: 'Location', getVal: t => t.locationName || t.location?.locationName || '' });

  const headerRow = ['Sr. No.', ...activeCols.map(c => c.label)];

  const mapTaskToRow = (task: any, idx: number) => [
    idx + 1,
    ...activeCols.map(c => c.getVal(task))
  ];

  const rows: any[][] = [];

  if (groupedByUser) {
    const groupedData: Record<string, any[]> = {};
    data.forEach((task) => {
      const owner = task.assignedDisplayName || task.assignedTo?.displayName || task.ownerLoginNo || 'Unassigned';
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
  const titleIdx = headerRow.findIndex(h => h === 'Task Title');
  if (titleIdx >= 0) colWidths[titleIdx] = { wch: 40 };
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename);
};

export const exportMeetingReportToExcel = (data: any[], filename: string = 'Meeting_Notes_Report.xlsx') => {
  const wb = XLSX.utils.book_new();

  if (data.length === 0) return;

  const headerRow = [
    'Sr. No.',
    'Title',
    'Meeting Type',
    'Category',
    'Company',
    'Start Date & Time',
    'End Date & Time',
    'Status'
  ];

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-';
    return formatUtcDateTime(dateString, '-');
  };

  const mapMeetingToRow = (meeting: any, idx: number) => [
    idx + 1,
    meeting.meetingTitle || meeting.title || '',
    meeting.meetingTypeName || meeting.type?.typeName || '',
    meeting.meetingCategoryName || meeting.category?.categoryName || '',
    meeting.companyName || meeting.taskCompany?.companyName || meeting.company?.companyName || '',
    formatDateTime(meeting.meetingStartDateTime || meeting.startDateTime || meeting.startDate),
    formatDateTime(meeting.meetingEndDateTime || meeting.endDateTime || meeting.endDate),
    meeting.docStatusName || meeting.statusName || meeting.status?.statusName || meeting.status || ''
  ];

  const rows: any[][] = [];
  rows.push(headerRow);
  data.forEach((meeting, idx) => {
    rows.push(mapMeetingToRow(meeting, idx));
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const colWidths = headerRow.map(() => ({ wch: 20 }));
  colWidths[1] = { wch: 30 }; // Title
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename);
};

export const exportBusinessEntityReportToExcel = (data: any[], viewMode: 'list' | 'album' | 'contact-list' | 'contact-album' | 'attachment', filename: string = 'Business_Entity_Report.xlsx') => {
  const wb = XLSX.utils.book_new();

  if (data.length === 0) return;

  let headerRow: string[] = [];
  let mapRowToCols: (item: any, idx: number) => any[] = () => [];
  let colWidths: number[] = [];

  const isContactMode = viewMode === 'contact-list' || viewMode === 'contact-album';
  const isAttachmentMode = viewMode === 'attachment';

  if (isContactMode) {
    headerRow = ['Sr. No.', 'Contact Person Name', 'Business Entity', 'Email', 'Phone', 'Department', 'Designation', 'Status'];
    mapRowToCols = (item: any, idx: number) => {
      const contact = item.contacts?.[0] || {};
      return [
        idx + 1,
        contact.contactPersonName || contact.contactName || contact.name || '-',
        item.name || '-',
        contact.email || '-',
        contact.phoneNo || contact.phone || '-',
        contact.department || '-',
        contact.designation || '-',
        contact.status || 'Active'
      ];
    };
    colWidths = [10, 30, 30, 30, 20, 20, 20, 15];
  } else if (isAttachmentMode) {
    headerRow = ['Sr. No.', 'Name', 'Business Entity', 'Code', 'Size', 'Type', 'Status'];
    mapRowToCols = (item: any, idx: number) => {
      const attachment = item.attachments?.[0] || {};
      return [
        idx + 1,
        attachment.fileName || attachment.name || '-',
        item.name || '-',
        item.code || '-',
        attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(2)} KB` : '-',
        attachment.fileType || '-',
        attachment.status || 'Active'
      ];
    };
    colWidths = [10, 30, 30, 20, 15, 15, 15];
  } else {
    headerRow = ['Sr. No.', 'Code', 'Business Entity Name', 'Type', 'Primary Address', 'City', 'State', 'Country', 'VAT/GST No.', 'Credit Limit'];
    mapRowToCols = (item: any, idx: number) => {
      const addr = item.locations?.[0]?.address || item.address || '';
      return [
        idx + 1,
        item.code || '-',
        item.name || '-',
        item.type || '-',
        addr || '-',
        item.city || '-',
        item.state || '-',
        item.country || '-',
        item.vatGst || 'N/A',
        item.creditLimit > 0 ? item.creditLimit : 'No Limit'
      ];
    };
    colWidths = [10, 20, 40, 20, 40, 20, 20, 20, 20, 20];
  }

  const rows: any[][] = [];
  rows.push(headerRow);
  data.forEach((item, idx) => {
    rows.push(mapRowToCols(item, idx));
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = colWidths.map(wch => ({ wch }));

  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, filename);
};
