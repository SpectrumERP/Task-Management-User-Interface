import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, FileDown } from 'lucide-react';
import { exportReportToExcel } from '@/utils/exportToExcel';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSettings } from '@/hooks/useSettings';
import { MasterPaginationBar } from '@/components/master/shared/MasterPaginationBar';

function TruncatedCell({ text, minWidth = 'min-w-[200px]' }: { text: string, minWidth?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!text || text === '-') return <span className={minWidth}>{text || '-'}</span>;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={`line-clamp-1 cursor-pointer ${minWidth} whitespace-pre-wrap`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          {text}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto max-w-[400px] p-3 text-sm shadow-lg pointer-events-auto z-[150] bg-[var(--tm-surface)] border border-[var(--tm-border)]"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        sideOffset={5}
      >
        <div className="max-h-[300px] overflow-y-auto whitespace-pre-wrap select-all cursor-text text-slate-100">
          {text}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ReportTableProps {
  data: any[];
}

const DEFAULT_COLUMNS = [
  { id: 'srNo', label: 'Sr. No.', defaultVisible: true },
  { id: 'title', label: 'Task', defaultVisible: true },
  { id: 'description', label: 'Description of Task', defaultVisible: true },
  { id: 'isPending', label: 'Pending Task', defaultVisible: true },
  { id: 'crossFunctional', label: 'Cross Functional Support', defaultVisible: true },
  { id: 'company', label: 'Company', defaultVisible: true },
  { id: 'location', label: 'Location', defaultVisible: true },
  { id: 'category', label: 'Category', defaultVisible: true },
  { id: 'type', label: 'Type', defaultVisible: true },
  { id: 'folder', label: 'Folder', defaultVisible: true },
  { id: 'priority', label: 'Priority', defaultVisible: true },
  { id: 'owner', label: 'Owner', defaultVisible: true },
  { id: 'originator', label: 'Originator', defaultVisible: true },
  { id: 'subTaskCount', label: 'Sub Task Count', defaultVisible: true },
  { id: 'roadBlock', label: 'Road Block', defaultVisible: true },
  { id: 'progress', label: 'Task Progress Review', defaultVisible: true },
  { id: 'status', label: 'Task Status', defaultVisible: true },
  { id: 'userRemarks', label: 'User Remarks', defaultVisible: true },
  { id: 'managementRemarks', label: 'Management Remarks', defaultVisible: true },
];

export function ReportTable({ data }: ReportTableProps) {
  const { isHideType, isHideFolder } = useSettings();
  const isColumnAllowed = (id: string) => !((id === 'type' && isHideType) || (id === 'folder' && isHideFolder));

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_COLUMNS.filter(c => c.defaultVisible && isColumnAllowed(c.id)).map(c => c.id)
  );

  const [exportGrouped, setExportGrouped] = useState(true);
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageRows = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  );

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  const handleResizeStart = (e: React.MouseEvent, colId: string) => {
    e.preventDefault();
    const startX = e.pageX;
    const startWidth = colWidths[colId] || (e.target as HTMLElement).parentElement?.offsetWidth || 150;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (moveEvent.pageX - startX));
      setColWidths(prev => ({ ...prev, [colId]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev =>
      prev.includes(colId) ? prev.filter(id => id !== colId) : [...prev, colId]
    );
  };

  const handleExport = () => {
    exportReportToExcel(data, exportGrouped);
  };

  return (
    <section data-page-tour="report-table" className="flex h-full min-h-0 flex-col rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center justify-between px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)]">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
            Report Results
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--tm-tint)] px-1.5 text-[10px] font-semibold text-[#0EA5E9] tabular-nums">
              {data.length}
            </span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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

          <DropdownMenu>
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
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="tm-data-table w-full text-sm text-left relative" style={{ tableLayout: Object.keys(colWidths).length > 0 ? 'fixed' : 'auto' }}>
          <thead className="bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-[10px] text-slate-300 font-semibold uppercase tracking-wide sticky top-0 z-10">
            <tr>
              {DEFAULT_COLUMNS.map((col) => {
                if (!visibleColumns.includes(col.id) || !isColumnAllowed(col.id)) return null;
                const widthStyle = colWidths[col.id] ? { width: colWidths[col.id], minWidth: colWidths[col.id], maxWidth: colWidths[col.id] } : {};

                return (
                  <th
                    key={col.id}
                    className="px-3 py-2.5 border-r border-[var(--tm-border)] last:border-r-0 whitespace-nowrap relative group select-none overflow-hidden text-ellipsis"
                    style={widthStyle}
                  >
                    {col.label}
                    <div
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#0EA5E9]/40 group-hover:bg-slate-300 transition-colors z-20"
                      onMouseDown={(e) => handleResizeStart(e, col.id)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {totalItems === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="px-4 py-16 text-center">
                  <p className="text-xs font-medium text-slate-500">No tasks found matching criteria.</p>
                  <p className="text-[10px] text-slate-400 mt-1">Adjust filters and generate the report again.</p>
                </td>
              </tr>
            ) : (
              pageRows.map((task, index) => (
                <tr key={task.taskNo || task.operTaskNo || `${startIndex + index}`} className="border-b border-[var(--tm-border)] hover:bg-[var(--tm-elevated)]/50">
                  {visibleColumns.includes('srNo') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['srNo'] ? { maxWidth: colWidths['srNo'] } : {}}>{startIndex + index + 1}</td>
                  )}
                  {visibleColumns.includes('title') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] font-medium text-slate-50 align-top truncate" style={colWidths['title'] ? { maxWidth: colWidths['title'] } : {}}>
                      <TruncatedCell text={task.title} minWidth="min-w-[150px]" />
                    </td>
                  )}
                  {visibleColumns.includes('description') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-top truncate" style={colWidths['description'] ? { maxWidth: colWidths['description'] } : {}}>
                      <TruncatedCell text={task.description} />
                    </td>
                  )}
                  {visibleColumns.includes('isPending') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['isPending'] ? { maxWidth: colWidths['isPending'] } : {}}>
                      <TruncatedCell text={task.isPending ? 'Yes' : 'No'} />
                    </td>
                  )}
                  {visibleColumns.includes('crossFunctional') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['crossFunctional'] ? { maxWidth: colWidths['crossFunctional'] } : {}}>
                      <TruncatedCell text={task.hasCrossFunctionalSupport ? 'Yes' : 'No'} />
                    </td>
                  )}
                  {visibleColumns.includes('company') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['company'] ? { maxWidth: colWidths['company'] } : {}}>
                      <TruncatedCell text={task.taskCompany?.taskCompanyAlias || task.taskCompany?.companyName || '-'} />
                    </td>
                  )}
                  {visibleColumns.includes('location') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['location'] ? { maxWidth: colWidths['location'] } : {}}>
                      <TruncatedCell text={task.location?.locationName || '-'} />
                    </td>
                  )}
                  {visibleColumns.includes('category') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['category'] ? { maxWidth: colWidths['category'] } : {}}>
                      <TruncatedCell text={task.category?.categoryName || '-'} />
                    </td>
                  )}
                  {visibleColumns.includes('type') && isColumnAllowed('type') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['type'] ? { maxWidth: colWidths['type'] } : {}}>
                      <TruncatedCell text={task.type?.typeName || '-'} />
                    </td>
                  )}
                  {visibleColumns.includes('folder') && isColumnAllowed('folder') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['folder'] ? { maxWidth: colWidths['folder'] } : {}}>
                      <TruncatedCell text={task.folder?.folderName || '-'} />
                    </td>
                  )}
                  {visibleColumns.includes('priority') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['priority'] ? { maxWidth: colWidths['priority'] } : {}}>
                      <TruncatedCell text={task.priority?.priorityName || '-'} />
                    </td>
                  )}
                  {visibleColumns.includes('owner') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['owner'] ? { maxWidth: colWidths['owner'] } : {}}>
                      <TruncatedCell text={task.assignedTo?.displayName || '-'} />
                    </td>
                  )}
                  {visibleColumns.includes('originator') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['originator'] ? { maxWidth: colWidths['originator'] } : {}}>
                      <TruncatedCell text={task.originator?.displayName || '-'} />
                    </td>
                  )}
                  {visibleColumns.includes('subTaskCount') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate" style={colWidths['subTaskCount'] ? { maxWidth: colWidths['subTaskCount'] } : {}}>
                      {task.subTaskCount ?? 0}
                    </td>
                  )}
                  {visibleColumns.includes('roadBlock') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-top truncate" style={colWidths['roadBlock'] ? { maxWidth: colWidths['roadBlock'] } : {}}>
                      <TruncatedCell text={task.roadBlock || ''} minWidth="min-w-[150px]" />
                    </td>
                  )}
                  {visibleColumns.includes('progress') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-top truncate" style={colWidths['progress'] ? { maxWidth: colWidths['progress'] } : {}}>
                      <TruncatedCell text={task.taskProgressReview || ''} />
                    </td>
                  )}
                  {visibleColumns.includes('status') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-top truncate" style={colWidths['status'] ? { maxWidth: colWidths['status'] } : {}}>
                      {task.status?.statusName || task.status || '-'}
                    </td>
                  )}
                  {visibleColumns.includes('userRemarks') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-top truncate" style={colWidths['userRemarks'] ? { maxWidth: colWidths['userRemarks'] } : {}}>
                      <TruncatedCell text={task.completionRemark || ''} minWidth="min-w-[150px]" />
                    </td>
                  )}
                  {visibleColumns.includes('managementRemarks') && (
                    <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-top truncate" style={colWidths['managementRemarks'] ? { maxWidth: colWidths['managementRemarks'] } : {}}>
                      <TruncatedCell text={task.managementRemark || ''} minWidth="min-w-[150px]" />
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
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
      )}
    </section>
  );
}
