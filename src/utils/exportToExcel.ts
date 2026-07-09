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
    ...(groupedByUser ? [] : ['Owner']),
    'Originator',
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
      rows.push([`Task Owner - ${owner}`]);
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
