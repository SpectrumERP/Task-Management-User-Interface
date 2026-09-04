import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, FileDown } from 'lucide-react';
import { exportMeetingReportToExcel } from '@/utils/exportToExcel';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { MasterPaginationBar } from '@/components/master/shared/MasterPaginationBar';

function TruncatedCell({ text, minWidth = 'min-w-[200px]' }: { text: string; minWidth?: string }) {
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
        className="w-auto max-w-[400px] p-3 text-sm shadow-lg pointer-events-auto z-[150] bg-white border border-slate-200"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        sideOffset={5}
      >
        <div className="max-h-[300px] overflow-y-auto whitespace-pre-wrap select-all cursor-text text-slate-800">
          {text}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface MeetingReportTableProps {
  data: any[];
}

const DEFAULT_COLUMNS = [
  { id: 'srNo', label: 'Sr. No.', defaultVisible: true },
  { id: 'meetingTitle', label: 'Meeting Note Title', defaultVisible: true },
  { id: 'category', label: 'Category', defaultVisible: true },
  { id: 'type', label: 'Type', defaultVisible: true },
  { id: 'company', label: 'Company', defaultVisible: true },
  { id: 'location', label: 'Location', defaultVisible: true },
  { id: 'mode', label: 'Meeting Mode', defaultVisible: true },
  { id: 'startDateTime', label: 'Start Date and Time', defaultVisible: true },
  { id: 'endDateTime', label: 'End Date and Time', defaultVisible: true },
  { id: 'participants', label: 'Participants', defaultVisible: true },
  { id: 'discussionsMade', label: 'Discussions Made', defaultVisible: true },
  { id: 'discussionRemarks', label: 'Discussion Remarks', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
];

export function MeetingReportTable({ data }: MeetingReportTableProps) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.id)
  );
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
    const startWidth =
      colWidths[colId] || (e.target as HTMLElement).parentElement?.offsetWidth || 150;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (moveEvent.pageX - startX));
      setColWidths((prev) => ({ ...prev, [colId]: newWidth }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleColumn = (colId: string) => {
    setVisibleColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleExport = () => {
    exportMeetingReportToExcel(data, 'Meeting_Notes_Report.xlsx');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd-MMM-yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[8px] border border-slate-200/70 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center justify-between px-4 py-3 bg-[#f8fbfd] border-b border-slate-100">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 tracking-tight">
            Report Results
            <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e8f3f8] px-1.5 text-[10px] font-semibold text-[#006699] tabular-nums">
              {data.length}
            </span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-[8px] text-xs font-medium border-slate-200 shadow-none"
              >
                <Eye className="h-3.5 w-3.5" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {DEFAULT_COLUMNS.map((col) => (
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
            className="h-8 gap-1.5 rounded-[8px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            disabled={data.length === 0}
          >
            <FileDown className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table
          className="w-full text-sm text-left relative"
          style={{ tableLayout: Object.keys(colWidths).length > 0 ? 'fixed' : 'auto' }}
        >
          <thead className="bg-slate-50/90 border-b border-slate-200 text-[10px] text-slate-500 font-semibold uppercase tracking-wide sticky top-0 z-10">
            <tr>
              {DEFAULT_COLUMNS.map((col) => {
                if (!visibleColumns.includes(col.id)) return null;
                const widthStyle = colWidths[col.id]
                  ? {
                      width: colWidths[col.id],
                      minWidth: colWidths[col.id],
                      maxWidth: colWidths[col.id],
                    }
                  : {};

                return (
                  <th
                    key={col.id}
                    className="px-3 py-2.5 border-r border-slate-100 last:border-r-0 whitespace-nowrap relative group select-none overflow-hidden text-ellipsis"
                    style={widthStyle}
                  >
                    {col.label}
                    <div
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#006699]/40 group-hover:bg-slate-300 transition-colors z-20"
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
                  <p className="text-xs font-medium text-slate-500">
                    No meeting notes found matching criteria.
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Adjust filters and apply again.
                  </p>
                </td>
              </tr>
            ) : (
              pageRows.map((meeting, index) => (
                <tr
                  key={meeting.meetingNotesNo || `${startIndex + index}`}
                  className="border-b border-slate-100 hover:bg-[#f8fbfd]/50"
                >
                  {visibleColumns.includes('srNo') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={colWidths['srNo'] ? { maxWidth: colWidths['srNo'] } : {}}
                    >
                      {startIndex + index + 1}
                    </td>
                  )}
                  {visibleColumns.includes('meetingTitle') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 font-medium text-slate-900 align-top truncate"
                      style={
                        colWidths['meetingTitle'] ? { maxWidth: colWidths['meetingTitle'] } : {}
                      }
                    >
                      <TruncatedCell
                        text={meeting.meetingTitle || meeting.title}
                        minWidth="min-w-[150px]"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('category') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 align-top truncate"
                      style={colWidths['category'] ? { maxWidth: colWidths['category'] } : {}}
                    >
                      <TruncatedCell
                        text={meeting.meetingCategoryName || meeting.category?.categoryName}
                      />
                    </td>
                  )}
                  {visibleColumns.includes('type') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={colWidths['type'] ? { maxWidth: colWidths['type'] } : {}}
                    >
                      <TruncatedCell text={meeting.meetingTypeName || meeting.type?.typeName} />
                    </td>
                  )}
                  {visibleColumns.includes('company') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={colWidths['company'] ? { maxWidth: colWidths['company'] } : {}}
                    >
                      <TruncatedCell
                        text={
                          meeting.companyName ||
                          meeting.taskCompany?.companyName ||
                          meeting.company?.companyName
                        }
                      />
                    </td>
                  )}
                  {visibleColumns.includes('location') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={colWidths['location'] ? { maxWidth: colWidths['location'] } : {}}
                    >
                      <TruncatedCell
                        text={meeting.locationName || meeting.location?.locationName}
                      />
                    </td>
                  )}
                  {visibleColumns.includes('mode') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={colWidths['mode'] ? { maxWidth: colWidths['mode'] } : {}}
                    >
                      <TruncatedCell
                        text={meeting.mode || meeting.meetingMode?.meetingModeName}
                      />
                    </td>
                  )}
                  {visibleColumns.includes('startDateTime') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={
                        colWidths['startDateTime'] ? { maxWidth: colWidths['startDateTime'] } : {}
                      }
                    >
                      <TruncatedCell
                        text={formatDate(
                          meeting.meetingStartDateTime ||
                            meeting.startDateTime ||
                            meeting.startDate
                        )}
                      />
                    </td>
                  )}
                  {visibleColumns.includes('endDateTime') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={
                        colWidths['endDateTime'] ? { maxWidth: colWidths['endDateTime'] } : {}
                      }
                    >
                      <TruncatedCell
                        text={formatDate(
                          meeting.meetingEndDateTime || meeting.endDateTime || meeting.endDate
                        )}
                      />
                    </td>
                  )}
                  {visibleColumns.includes('participants') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={
                        colWidths['participants'] ? { maxWidth: colWidths['participants'] } : {}
                      }
                    >
                      <TruncatedCell
                        text={
                          Array.isArray(meeting.participants)
                            ? meeting.participants
                                .map((p: any) =>
                                  typeof p === 'string'
                                    ? p
                                    : p.printingName || p.loginId || p.participantName
                                )
                                .filter(Boolean)
                                .join(', ')
                            : meeting.participants || meeting.internalUsers || '-'
                        }
                      />
                    </td>
                  )}
                  {visibleColumns.includes('discussionsMade') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={
                        colWidths['discussionsMade']
                          ? { maxWidth: colWidths['discussionsMade'] }
                          : {}
                      }
                    >
                      <TruncatedCell
                        text={
                          Array.isArray(meeting.discussionDetail)
                            ? meeting.discussionDetail
                                .map((d: any) => d.topic || d.discussionSummary)
                                .filter(Boolean)
                                .map((t: any) => `• ${t}`)
                                .join('\n')
                            : meeting.discussionsMade || meeting.agenda || '-'
                        }
                      />
                    </td>
                  )}
                  {visibleColumns.includes('discussionRemarks') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={
                        colWidths['discussionRemarks']
                          ? { maxWidth: colWidths['discussionRemarks'] }
                          : {}
                      }
                    >
                      <TruncatedCell
                        text={
                          Array.isArray(meeting.discussionDetail)
                            ? meeting.discussionDetail
                                .map((d: any) => d.decisionRemarks)
                                .filter(Boolean)
                                .map((t: any) => `• ${t}`)
                                .join('\n')
                            : meeting.discussionRemarks || meeting.remarks || '-'
                        }
                      />
                    </td>
                  )}
                  {visibleColumns.includes('status') && (
                    <td
                      className="px-3 py-2.5 border-r border-slate-100 text-slate-600 truncate"
                      style={colWidths['status'] ? { maxWidth: colWidths['status'] } : {}}
                    >
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold ${
                          (meeting.status?.statusName || meeting.status) === 'Completed' ||
                          (meeting.status?.statusName || meeting.status) === 'Closed'
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80'
                            : (meeting.status?.statusName || meeting.status) === 'In Progress'
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/80'
                              : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/80'
                        }`}
                      >
                        {meeting.status?.statusName || meeting.status || 'Draft'}
                      </span>
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
