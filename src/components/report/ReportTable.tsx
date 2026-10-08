import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, FileDown, ClipboardList } from 'lucide-react';
import { exportReportToExcel } from '@/utils/exportToExcel';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSettings } from '@/hooks/useSettings';
import { MasterPaginationBar } from '@/components/master/shared/MasterPaginationBar';
import { ActionTip, TruncatedText } from '@/components/master/shared/TruncatedCellTip';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SortableHeader, sortHeaderCellProps, usePagedTableSort } from '@/components/shared/useTableSort';
import { DataTableScroll } from '@/components/shared/DataTableScroll';
import { getStatusTextClass } from '@/lib/taskStatusGroups';
import { cn } from '@/lib/utils';

interface ReportTableProps {
  data: any[];
}

const DEFAULT_COLUMNS = [
  // minWidth guides auto layout — columns size to content within these bounds
  { id: 'srNo', label: 'Sr. No.', defaultVisible: true, width: 88 },
  { id: 'title', label: 'Task', defaultVisible: true, width: 180, maxWidth: 260 },
  { id: 'status', label: 'Status', defaultVisible: true, width: 110 },
  { id: 'priority', label: 'Priority', defaultVisible: true, width: 96 },
  { id: 'owner', label: 'Owner', defaultVisible: true, width: 150 },
  { id: 'originator', label: 'Originator', defaultVisible: true, width: 150 },
  { id: 'company', label: 'Company', defaultVisible: true, width: 130 },
  { id: 'category', label: 'Category', defaultVisible: true, width: 120 },
  { id: 'location', label: 'Location', defaultVisible: true, width: 120 },
  // Optional — enable from Columns
  { id: 'type', label: 'Type', defaultVisible: false, width: 100 },
  { id: 'folder', label: 'Folder', defaultVisible: false, width: 110 },
  { id: 'isPending', label: 'Pending', defaultVisible: false, width: 80 },
  { id: 'crossFunctional', label: 'Cross Func.', defaultVisible: false, width: 100 },
  { id: 'subTaskCount', label: 'Subs', defaultVisible: false, width: 72 },
  { id: 'description', label: 'Description', defaultVisible: false, width: 120, maxWidth: 220 },
  { id: 'roadBlock', label: 'Road Block', defaultVisible: false, width: 100, maxWidth: 160 },
  { id: 'progress', label: 'Progress', defaultVisible: false, width: 90, maxWidth: 160 },
  { id: 'userRemarks', label: 'User Remarks', defaultVisible: false, width: 110, maxWidth: 150 },
  { id: 'managementRemarks', label: 'Mgmt Remarks', defaultVisible: false, width: 110, maxWidth: 150 },
] as Array<{
  id: string;
  label: string;
  defaultVisible: boolean;
  width: number;
  maxWidth?: number;
}>;

export function ReportTable({ data }: ReportTableProps) {
  const { isHideType, isHideFolder } = useSettings();
  const isColumnAllowed = (id: string) => !((id === 'type' && isHideType) || (id === 'folder' && isHideFolder));

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_COLUMNS.filter(c => c.defaultVisible && isColumnAllowed(c.id)).map(c => c.id)
  );

  const [exportGrouped, setExportGrouped] = useState(true);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const getReportSortValue = useCallback((row: any, key: string) => {
    switch (key) {
      case 'srNo': {
        // Original row index (1-based). Display uses the same value so sort is visible.
        const n = Number(row._sr ?? NaN);
        return Number.isFinite(n) ? n : 0;
      }
      case 'title': return row.title ?? '';
      case 'description': return row.description ?? '';
      case 'isPending': return row.isPending ? 'Yes' : 'No';
      case 'crossFunctional': return row.hasCrossFunctionalSupport ? 'Yes' : 'No';
      case 'company': return row.taskCompany?.taskCompanyAlias || row.taskCompany?.companyName || '';
      case 'location': return row.location?.locationName || '';
      case 'category': return row.category?.categoryName || '';
      case 'type': return row.type?.typeName || '';
      case 'folder': return row.folder?.folderName || '';
      case 'priority': return row.priority?.priorityName || '';
      case 'owner': return row.assignedTo?.displayName || '';
      case 'originator': return row.originator?.displayName || '';
      case 'subTaskCount': return typeof row.subTaskCount === 'number' ? row.subTaskCount : Number(row.subTaskCount) || 0;
      case 'roadBlock': return row.roadBlock || '';
      case 'progress': return row.taskProgressReview || '';
      case 'status': return row.status?.statusName || row.status || '';
      case 'userRemarks': return row.completionRemark || '';
      case 'managementRemarks': return row.managementRemark || '';
      default: return (row as Record<string, unknown>)[key] ?? '';
    }
  }, []);

  const numberedData = useMemo(
    () => data.map((row, index) => ({ ...row, _sr: index + 1 })),
    [data]
  );

  const {
    sortCol,
    sortDesc,
    handleSort,
    pageRows,
    totalItems,
    totalPages,
    safePage,
    startIndex,
    endIndex,
  } = usePagedTableSort(numberedData, getReportSortValue, {
    defaultKey: 'srNo',
    defaultDesc: false,
    page: currentPage,
    pageSize: itemsPerPage,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleResizeStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    const startX = e.pageX;
    const defaultW = DEFAULT_COLUMNS.find((c) => c.id === colId)?.width ?? 150;
    const startWidth = colWidths[colId] || (e.target as HTMLElement).parentElement?.offsetWidth || defaultW;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(72, startWidth + (moveEvent.pageX - startX));
      setColWidths(prev => ({ ...prev, [colId]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const getColStyle = (colId: string): CSSProperties => {
    const meta = DEFAULT_COLUMNS.find((c) => c.id === colId);
    const resized = colWidths[colId];
    if (resized) {
      return { width: resized, minWidth: resized, maxWidth: resized };
    }
    if (colId === 'srNo') {
      return {
        width: 'var(--tm-col-id-width)',
        minWidth: 'var(--tm-col-id-width)',
        maxWidth: 'var(--tm-col-id-width)',
      };
    }
    // Capped columns: hug header when empty, grow with content up to maxWidth.
    if (meta?.maxWidth) {
      return {
        width: 'auto',
        minWidth: meta.width,
        maxWidth: meta.maxWidth,
      };
    }
    // Other columns: auto-size to header/content.
    return {
      width: 'auto',
      minWidth: meta?.width ?? 100,
    };
  };

  const activeColumns = useMemo(
    () =>
      DEFAULT_COLUMNS.filter(
        (col) => visibleColumns.includes(col.id) && isColumnAllowed(col.id)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleColumns, isHideType, isHideFolder]
  );


  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev =>
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const handleExport = () => {
    exportReportToExcel(data, exportGrouped, 'MIS_Task_Report.xlsx', visibleColumns);
  };

  const renderCell = (colId: string, task: any, rowIndex: number) => {
    const tdClass =
      'px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 whitespace-nowrap';
    const widthStyle = getColStyle(colId);

    switch (colId) {
      case 'srNo':
        return (
          <td key={colId} className={cn(tdClass, 'tm-col-sr tm-col-id truncate px-2')} style={widthStyle}>
            {task._sr ?? startIndex + rowIndex + 1}
          </td>
        );
      case 'title':
        return (
          <td key={colId} className={cn(tdClass, 'tm-col-primary font-medium text-slate-50 max-w-[280px] overflow-hidden')} style={widthStyle}>
            <TruncatedText text={task.title || '-'} className="font-medium text-slate-50" />
          </td>
        );
      case 'status': {
        const statusName = String(task.status?.statusName || task.status || '-');
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            <TruncatedText text={statusName} className={getStatusTextClass(statusName)} />
          </td>
        );
      }
      case 'priority':
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            <TruncatedText text={task.priority?.priorityName || '-'} className="text-slate-300" />
          </td>
        );
      case 'owner':
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            {task.assignedTo?.displayName ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <UserAvatar
                  loginNo={task.assignedTo?.id || task.assignedTo?.loginNo}
                  displayName={task.assignedTo.displayName}
                  size="sm"
                  className="shrink-0"
                />
                <TruncatedText
                  text={task.assignedTo.displayName}
                  className="tm-person-link text-slate-300 text-xs font-medium"
                />
              </div>
            ) : (
              <TruncatedText text="-" className="text-slate-300" />
            )}
          </td>
        );
      case 'originator':
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            {task.originator?.displayName ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <UserAvatar
                  loginNo={task.originator?.id || task.originator?.loginNo}
                  displayName={task.originator.displayName}
                  size="sm"
                  className="shrink-0"
                />
                <TruncatedText
                  text={task.originator.displayName}
                  className="tm-person-link text-slate-300 text-xs font-medium"
                />
              </div>
            ) : (
              <TruncatedText text="-" className="text-slate-300" />
            )}
          </td>
        );
      case 'company':
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            <TruncatedText
              text={task.taskCompany?.taskCompanyAlias || task.taskCompany?.companyName || '-'}
              className="text-slate-300"
            />
          </td>
        );
      case 'location':
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            <TruncatedText text={task.location?.locationName || '-'} className="text-slate-300" />
          </td>
        );
      case 'category':
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            <TruncatedText text={task.category?.categoryName || '-'} className="text-slate-300" />
          </td>
        );
      case 'type':
        if (!isColumnAllowed('type')) return null;
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            <TruncatedText text={task.type?.typeName || '-'} className="text-slate-300" />
          </td>
        );
      case 'folder':
        if (!isColumnAllowed('folder')) return null;
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            <TruncatedText text={task.folder?.folderName || '-'} className="text-slate-300" />
          </td>
        );
      case 'isPending':
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            <TruncatedText text={task.isPending ? 'Yes' : 'No'} className="text-slate-300" />
          </td>
        );
      case 'crossFunctional':
        return (
          <td key={colId} className={tdClass} style={widthStyle}>
            <TruncatedText
              text={task.hasCrossFunctionalSupport ? 'Yes' : 'No'}
              className="text-slate-300"
            />
          </td>
        );
      case 'subTaskCount':
        return (
          <td key={colId} className={cn(tdClass, 'truncate tabular-nums text-center')} style={widthStyle}>
            {task.subTaskCount ?? 0}
          </td>
        );
      case 'description':
        return (
          <td
            key={colId}
            className={cn(tdClass, 'max-w-[220px] overflow-hidden text-ellipsis')}
            style={widthStyle}
          >
            <TruncatedText text={task.description || '-'} className="text-slate-300" />
          </td>
        );
      case 'roadBlock':
        return (
          <td key={colId} className={cn(tdClass, 'overflow-hidden')} style={widthStyle}>
            <TruncatedText text={task.roadBlock || '-'} className="text-slate-300" />
          </td>
        );
      case 'progress':
        return (
          <td key={colId} className={cn(tdClass, 'overflow-hidden')} style={widthStyle}>
            <TruncatedText text={task.taskProgressReview || '-'} className="text-slate-300" />
          </td>
        );
      case 'userRemarks':
        return (
          <td
            key={colId}
            className={cn(tdClass, 'max-w-[150px] overflow-hidden text-ellipsis')}
            style={widthStyle}
          >
            <TruncatedText text={task.completionRemark || '-'} className="text-slate-300" />
          </td>
        );
      case 'managementRemarks':
        return (
          <td
            key={colId}
            className={cn(tdClass, 'max-w-[150px] overflow-hidden text-ellipsis')}
            style={widthStyle}
          >
            <TruncatedText text={task.managementRemark || '-'} className="text-slate-300" />
          </td>
        );
      default:
        return null;
    }
  };

  return (
    <section data-page-tour="report-table" className="crm-list-page flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="crm-pad-x pb-2 shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 tracking-tight inline-flex items-center">
            Report Results
            <ActionTip label={`${data.length} matching record${data.length === 1 ? '' : 's'}`}>
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#eef3fc] dark:bg-[var(--tm-tint)] px-1.5 font-semibold text-[#1E56A0] dark:text-[#4f86d1] tabular-nums">
                {data.length}
              </span>
            </ActionTip>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <ActionTip
            label="When enabled, Excel groups tasks under each owner"
            multiline
          >
            <label
              htmlFor="export-grouped"
              className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--tm-border)]/80 bg-[var(--tm-surface)] px-2.5 py-1.5 cursor-pointer"
            >
              <Checkbox
                id="export-grouped"
                checked={exportGrouped}
                onCheckedChange={(c) => setExportGrouped(!!c)}
                className="data-[state=checked]:bg-[#0EA5E9] data-[state=checked]:border-[#0EA5E9]"
              />
              <span className="text-[11px] font-medium text-slate-300">
                Group by User for Export
              </span>
            </label>
          </ActionTip>

          <DropdownMenu>
            <ActionTip label="Show or hide columns">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 rounded-[8px] text-xs font-medium border-[var(--tm-border)] shadow-none"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
            </ActionTip>
            <DropdownMenuContent align="end" className="w-56">
              {DEFAULT_COLUMNS.filter((col) => isColumnAllowed(col.id)).map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleColumns.includes(col.id)}
                  onCheckedChange={() => toggleColumn(col.id)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <ActionTip label={data.length === 0 ? 'Generate a report to export' : 'Download results as Excel'}>
            <Button
              onClick={handleExport}
              size="sm"
              data-page-tour="report-export"
              className="h-8 gap-1.5 rounded-[8px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
              disabled={data.length === 0}
            >
              <FileDown className="h-3.5 w-3.5" />
              Export Excel
            </Button>
          </ActionTip>
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="flex-1 min-h-0 overflow-auto">
          <EmptyState
            icon={ClipboardList}
            title="No results match your filters"
            description="Adjust filters and generate the report again."
            compact
          />
        </div>
      ) : (
        <DataTableScroll
          className="crm-pad-x"
          mobile={
            <div className="flex flex-col gap-2 p-2">
              {pageRows.map((task, index) => {
                const statusName = String(task.status?.statusName || task.status || '-');
                const companyName =
                  task.taskCompany?.taskCompanyAlias || task.taskCompany?.companyName || '-';
                const ownerName = task.assignedTo?.displayName || '-';
                const priorityName = task.priority?.priorityName || '-';
                return (
                  <div
                    key={task.taskNo || task.operTaskNo || `${startIndex + index}`}
                    className="rounded-xl border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/50 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-[#0EA5E9] tabular-nums">
                        #{task._sr ?? startIndex + index + 1}
                      </span>
                      <TruncatedText
                        text={statusName}
                        className={cn('font-semibold shrink-0', getStatusTextClass(statusName))}
                      />
                    </div>
                    <TruncatedText
                      text={task.title || '-'}
                      className="mt-1 text-sm font-semibold text-slate-100"
                    />
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-slate-400">
                      <span className="min-w-0 truncate">
                        <span className="text-slate-500">Company: </span>
                        {companyName}
                      </span>
                      <span className="min-w-0 truncate">
                        <span className="text-slate-500">Owner: </span>
                        {ownerName}
                      </span>
                      <span className="min-w-0 truncate">
                        <span className="text-slate-500">Priority: </span>
                        {priorityName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          }
          header={
            <table
              className="tm-data-table w-max text-left relative border-collapse"
              style={{ tableLayout: 'auto' }}
            >
              <colgroup>
                {activeColumns.map((col) => (
                  <col key={col.id} style={getColStyle(col.id)} />
                ))}
              </colgroup>
              <thead className="bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-slate-300 font-semibold uppercase tracking-wide">
                <tr>
                  {activeColumns.map((col) => (
                    <th
                      key={col.id}
                      className={cn(
                        'px-3 py-2.5 border-r border-[var(--tm-border)] last:border-r-0 relative group select-none whitespace-nowrap cursor-pointer',
                        col.id === 'srNo' && 'tm-col-sr tm-col-id'
                      )}
                      style={getColStyle(col.id)}
                      {...sortHeaderCellProps(col.id, handleSort)}
                    >
                      <SortableHeader
                        label={col.label}
                        sortKey={col.id}
                        sortCol={sortCol}
                        sortDesc={sortDesc}
                        onSort={handleSort}
                        className="w-full justify-start pr-3"
                      />
                      <div
                        data-col-resize
                        className="absolute right-0 top-0 z-[2] h-full w-1.5 cursor-col-resize hover:bg-[#0EA5E9]/40 group-hover:bg-slate-300 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleResizeStart(e, col.id);
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
            </table>
          }
          body={
            <table
              className="tm-data-table w-max text-left relative border-collapse"
              style={{ tableLayout: 'auto' }}
            >
              <colgroup>
                {activeColumns.map((col) => (
                  <col key={col.id} style={getColStyle(col.id)} />
                ))}
              </colgroup>
              <tbody>
                {pageRows.map((task, index) => (
                  <tr
                    key={task.taskNo || task.operTaskNo || `${startIndex + index}`}
                    className="border-b border-[var(--tm-border)] hover:bg-[var(--tm-elevated)]/50"
                  >
                    {activeColumns.map((col) => renderCell(col.id, task, index))}
                  </tr>
                ))}
              </tbody>
            </table>
          }
        />
      )}

      {totalItems > 0 && (
        <div className="mt-3 shrink-0">
        <MasterPaginationBar
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={handleItemsPerPageChange}
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
        </div>
      )}
    </section>
  );
}
