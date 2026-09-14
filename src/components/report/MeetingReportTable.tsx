import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, FileDown, ClipboardList } from 'lucide-react';
import { exportMeetingReportToExcel } from '@/utils/exportToExcel';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MasterPaginationBar } from '@/components/master/shared/MasterPaginationBar';
import { TruncatedText } from '@/components/master/shared/TruncatedCellTip';
import { EmptyState } from '@/components/ui/EmptyState';
import { SortableHeader, useTableSort } from '@/components/shared/useTableSort';
import { getStatusTextClass } from '@/lib/taskStatusGroups';
import { formatUtcDateTime, toUtcMs } from '@/lib/dateTime';

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

  const getMeetingReportSortValue = useCallback((row: any, key: string) => {
    switch (key) {
      case 'srNo': return row.meetingNotesNo ?? '';
      case 'meetingTitle': return row.meetingTitle || row.title || '';
      case 'category': return row.meetingCategoryName || row.category?.categoryName || '';
      case 'type': return row.meetingTypeName || row.type?.typeName || '';
      case 'company':
        return row.companyName || row.taskCompany?.companyName || row.company?.companyName || '';
      case 'location': return row.locationName || row.location?.locationName || '';
      case 'mode': return row.mode || row.meetingMode?.meetingModeName || '';
      case 'startDateTime':
        return toUtcMs(row.meetingStartDateTime || row.startDateTime || row.startDate) ?? '';
      case 'endDateTime':
        return toUtcMs(row.meetingEndDateTime || row.endDateTime || row.endDate) ?? '';
      case 'participants':
        return Array.isArray(row.participants)
          ? row.participants
              .map((p: any) =>
                typeof p === 'string' ? p : p.printingName || p.loginId || p.participantName
              )
              .filter(Boolean)
              .join(', ')
          : String(row.participants || row.internalUsers || '');
      case 'discussionsMade':
        return Array.isArray(row.discussionDetail)
          ? row.discussionDetail
              .map((d: any) => d.topic || d.discussionSummary)
              .filter(Boolean)
              .join(' ')
          : row.discussionsMade || row.agenda || '';
      case 'discussionRemarks':
        return Array.isArray(row.discussionDetail)
          ? row.discussionDetail
              .map((d: any) => d.decisionRemarks)
              .filter(Boolean)
              .join(' ')
          : row.discussionRemarks || row.remarks || '';
      case 'status': return row.status?.statusName || row.status || '';
      default: return (row as Record<string, unknown>)[key] ?? '';
    }
  }, []);

  const { sortCol, sortDesc, handleSort, sortedRows } = useTableSort(
    data,
    getMeetingReportSortValue,
    { defaultKey: 'startDateTime', defaultDesc: true }
  );

  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageRows = useMemo(
    () => sortedRows.slice(startIndex, endIndex),
    [sortedRows, startIndex, endIndex]
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
    return formatUtcDateTime(dateString, '-');
  };

  return (
    <section data-page-tour="mreport-table" className="flex h-full min-h-0 flex-col rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
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
            data-page-tour="mreport-export"
            className="h-8 gap-1.5 rounded-[8px] text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-sm"
            disabled={data.length === 0}
          >
            <FileDown className="h-3.5 w-3.5" />
            Export Excel
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {totalItems === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No results match your filters"
            description="Adjust filters and apply again."
            compact
          />
        ) : (
          <>
            <div className="md:hidden flex flex-col gap-2 p-2">
              {pageRows.map((meeting, index) => {
                const title = meeting.meetingTitle || meeting.title || '-';
                const statusName = String(meeting.status?.statusName || meeting.status || 'Draft');
                const company =
                  meeting.companyName ||
                  meeting.taskCompany?.companyName ||
                  meeting.company?.companyName ||
                  '-';
                const when = formatDate(
                  meeting.meetingStartDateTime || meeting.startDateTime || meeting.startDate || ''
                );
                return (
                  <div
                    key={meeting.meetingNotesNo || `${startIndex + index}`}
                    className="rounded-xl border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/50 px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-semibold text-[#0EA5E9] tabular-nums">
                        #{startIndex + index + 1}
                      </span>
                      <span className={`text-[10px] font-semibold ${getStatusTextClass(statusName)}`}>
                        {statusName}
                      </span>
                    </div>
                    <TruncatedText text={title} className="mt-1 text-sm font-semibold text-slate-100" />
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                      <span className="min-w-0 truncate">
                        <span className="text-slate-500">Company: </span>
                        {company}
                      </span>
                      <span className="min-w-0 truncate">
                        <span className="text-slate-500">Start: </span>
                        {when}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <table
              className="tm-data-table hidden md:table w-full text-sm text-left relative"
              style={{ tableLayout: Object.keys(colWidths).length > 0 ? 'fixed' : 'auto' }}
            >
          <thead className="bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-[10px] text-slate-300 font-semibold uppercase tracking-wide sticky top-0 z-10">
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
                    className="px-3 py-2.5 border-r border-[var(--tm-border)] last:border-r-0 whitespace-nowrap relative group select-none"
                    style={widthStyle}
                  >
                    <SortableHeader
                      label={col.label}
                      sortKey={col.id}
                      sortCol={sortCol}
                      sortDesc={sortDesc}
                      onSort={handleSort}
                      className="pr-2"
                    />
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
            {pageRows.map((meeting, index) => (
                <tr
                  key={meeting.meetingNotesNo || `${startIndex + index}`}
                  className="border-b border-[var(--tm-border)] hover:bg-[var(--tm-elevated)]/50"
                >
                  {visibleColumns.includes('srNo') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate"
                      style={colWidths['srNo'] ? { maxWidth: colWidths['srNo'] } : {}}
                    >
                      {startIndex + index + 1}
                    </td>
                  )}
                  {visibleColumns.includes('meetingTitle') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] font-medium text-slate-50 align-top min-w-0 overflow-hidden"
                      style={
                        colWidths['meetingTitle'] ? { maxWidth: colWidths['meetingTitle'] } : {}
                      }
                    >
                      <TruncatedText
                        text={meeting.meetingTitle || meeting.title || '-'}
                        className="min-w-[150px] font-medium text-slate-50"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('category') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-top min-w-0 overflow-hidden"
                      style={colWidths['category'] ? { maxWidth: colWidths['category'] } : {}}
                    >
                      <TruncatedText
                        text={meeting.meetingCategoryName || meeting.category?.categoryName || '-'}
                        className="text-slate-300"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('type') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 min-w-0 overflow-hidden"
                      style={colWidths['type'] ? { maxWidth: colWidths['type'] } : {}}
                    >
                      <TruncatedText
                        text={meeting.meetingTypeName || meeting.type?.typeName || '-'}
                        className="text-slate-300"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('company') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 min-w-0 overflow-hidden"
                      style={colWidths['company'] ? { maxWidth: colWidths['company'] } : {}}
                    >
                      <TruncatedText
                        text={
                          meeting.companyName ||
                          meeting.taskCompany?.companyName ||
                          meeting.company?.companyName ||
                          '-'
                        }
                        className="text-slate-300"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('location') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 min-w-0 overflow-hidden"
                      style={colWidths['location'] ? { maxWidth: colWidths['location'] } : {}}
                    >
                      <TruncatedText
                        text={meeting.locationName || meeting.location?.locationName || '-'}
                        className="text-slate-300"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('mode') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 min-w-0 overflow-hidden"
                      style={colWidths['mode'] ? { maxWidth: colWidths['mode'] } : {}}
                    >
                      <TruncatedText
                        text={meeting.mode || meeting.meetingMode?.meetingModeName || '-'}
                        className="text-slate-300"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('startDateTime') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 min-w-0 overflow-hidden"
                      style={
                        colWidths['startDateTime'] ? { maxWidth: colWidths['startDateTime'] } : {}
                      }
                    >
                      <TruncatedText
                        text={formatDate(
                          meeting.meetingStartDateTime ||
                            meeting.startDateTime ||
                            meeting.startDate
                        )}
                        className="text-slate-300"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('endDateTime') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 min-w-0 overflow-hidden"
                      style={
                        colWidths['endDateTime'] ? { maxWidth: colWidths['endDateTime'] } : {}
                      }
                    >
                      <TruncatedText
                        text={formatDate(
                          meeting.meetingEndDateTime || meeting.endDateTime || meeting.endDate
                        )}
                        className="text-slate-300"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('participants') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 min-w-0 overflow-hidden"
                      style={
                        colWidths['participants'] ? { maxWidth: colWidths['participants'] } : {}
                      }
                    >
                      <TruncatedText
                        text={
                          Array.isArray(meeting.participants)
                            ? meeting.participants
                                .map((p: any) =>
                                  typeof p === 'string'
                                    ? p
                                    : p.printingName || p.loginId || p.participantName
                                )
                                .filter(Boolean)
                                .join(', ') || '-'
                            : String(meeting.participants || meeting.internalUsers || '-')
                        }
                        className="text-slate-300"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('discussionsMade') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 min-w-0 overflow-hidden"
                      style={
                        colWidths['discussionsMade']
                          ? { maxWidth: colWidths['discussionsMade'] }
                          : {}
                      }
                    >
                      <TruncatedText
                        text={
                          Array.isArray(meeting.discussionDetail)
                            ? meeting.discussionDetail
                                .map((d: any) => d.topic || d.discussionSummary)
                                .filter(Boolean)
                                .map((t: any) => `• ${t}`)
                                .join('\n') || '-'
                            : meeting.discussionsMade || meeting.agenda || '-'
                        }
                        className="text-slate-300"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('discussionRemarks') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 min-w-0 overflow-hidden"
                      style={
                        colWidths['discussionRemarks']
                          ? { maxWidth: colWidths['discussionRemarks'] }
                          : {}
                      }
                    >
                      <TruncatedText
                        text={
                          Array.isArray(meeting.discussionDetail)
                            ? meeting.discussionDetail
                                .map((d: any) => d.decisionRemarks)
                                .filter(Boolean)
                                .map((t: any) => `• ${t}`)
                                .join('\n') || '-'
                            : meeting.discussionRemarks || meeting.remarks || '-'
                        }
                        className="text-slate-300"
                      />
                    </td>
                  )}
                  {visibleColumns.includes('status') && (
                    <td
                      className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 truncate"
                      style={colWidths['status'] ? { maxWidth: colWidths['status'] } : {}}
                    >
                      <span className={`inline-flex max-w-full min-w-0 items-center text-[10px] ${getStatusTextClass(String(meeting.status?.statusName || meeting.status || 'Draft'))}`}>
                        <TruncatedText
                          text={String(meeting.status?.statusName || meeting.status || 'Draft')}
                          className="!w-auto !max-w-full"
                        />
                      </span>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
          </>
        )}
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
