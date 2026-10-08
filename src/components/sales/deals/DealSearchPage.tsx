import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateOnly } from '@/lib/dateTime';
import { Edit, FileText, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { PageGuideButton } from '@/components/layout/PageGuideButton';
import { Combobox } from '@/components/ui/Combobox';
import { MasterDeleteDialog } from '@/components/master/shared/MasterDeleteDialog';
import { useAuthStore } from '@/store/useAuthStore';
import { DealRecord, DealSearchFilters } from '@/types/deal';
import { DealOption, deleteDeal, fetchDivisionsByCompany, searchDeals } from './dealApi';
import { toast } from 'sonner';
import { getUserErrorMessage, shouldToastCaughtError } from '@/lib/errorFeedback';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { ActionTip, TruncatedText } from '@/components/master/shared/TruncatedCellTip';
import { EmptyState } from '@/components/ui/EmptyState';
import { FieldLabel } from '@/components/ui/form-field';
import { SortableHeader, sortHeaderCellProps, usePagedTableSort } from '@/components/shared/useTableSort';
import { DataTableScroll } from '@/components/shared/DataTableScroll';
import { MasterPaginationBar } from '@/components/master/shared/MasterPaginationBar';
import { RowDeleteIcon, RowEditIcon } from '@/components/shared/RowIcons';

export function DealSearchPage() {
  const navigate = useNavigate();
  const authCompanies = useAuthStore((state) => state.company) || [];
  const defaultCompanyNo = (authCompanies[0]?.CompanyNo || authCompanies[0]?.companyNo || '').toString();
  const companyOptions = useMemo(() => authCompanies.map((company: any) => ({
    value: (company.CompanyNo || company.companyNo || '').toString(),
    label: company.companyName || company.CompanyName || company.name || company.alias || `Company ${company.companyNo || company.CompanyNo}`,
  })).filter((company: any) => company.value), [authCompanies]);

  const [filters, setFilters] = useState<DealSearchFilters>({
    companyNo: defaultCompanyNo,
    divisionNo: '',
    documentNoYearly: '',
    // Fetch a large page so client pagination + page-local sort can run.
    pageSize: 1000,
    pageNo: 1,
  });
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [divisionOptions, setDivisionOptions] = useState<DealOption[]>([]);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DealRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchDeals = async (nextFilters = filters) => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await searchDeals(nextFilters);
      setDeals(data);
    } catch (error) {
      console.error('Failed to search sales deals:', error);
      setLoadError(true);
      setDeals([]);
      if (shouldToastCaughtError(error)) {
        toast.error(getUserErrorMessage(error, 'Failed to load sales deals'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (defaultCompanyNo && !filters.companyNo) {
      setFilters((prev) => ({ ...prev, companyNo: defaultCompanyNo }));
    }
  }, [defaultCompanyNo, filters.companyNo]);

  useEffect(() => {
    if (filters.companyNo) {
      fetchDeals(filters);
    }
  }, [filters.pageNo, filters.pageSize]);

  useEffect(() => {
    const loadDivisions = async () => {
      if (!filters.companyNo) {
        setDivisionOptions([]);
        return;
      }

      setIsLoadingDivisions(true);
      try {
        const divisions = await fetchDivisionsByCompany(filters.companyNo);
        setDivisionOptions(divisions);
      } catch (error) {
        console.error('Failed to load divisions:', error);
        setDivisionOptions([]);
        if (shouldToastCaughtError(error)) {
          toast.error(getUserErrorMessage(error, 'Failed to load divisions'));
        }
      } finally {
        setIsLoadingDivisions(false);
      }
    };

    loadDivisions();
  }, [filters.companyNo]);

  const applyFilters = () => {
    const nextFilters = { ...filters, pageNo: 1 };
    setFilters(nextFilters);
    setCurrentPage(1);
    fetchDeals(nextFilters);
  };

  const resetFilters = () => {
    const nextFilters: DealSearchFilters = {
      companyNo: defaultCompanyNo,
      divisionNo: '',
      documentNoYearly: '',
      fromDocumentDate: undefined,
      toDocumentDate: undefined,
      pageSize: 1000,
      pageNo: 1,
    };
    setFilters(nextFilters);
    setCurrentPage(1);
    if (defaultCompanyNo) fetchDeals(nextFilters);
  };

  const handleEdit = (deal: DealRecord) => {
    const editId = deal.id || deal.raw?.dealEntryNo || deal.raw?.DealEntryNo;
    if (!editId) {
      console.error('Sales deal edit failed: missing record id', deal.raw || deal);
      toast.error('Cannot open this deal — record id is missing');
      return;
    }
    navigate(`/sales/deals/${editId}`);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setIsDeleting(true);
    try {
      const response = await deleteDeal(deleteTarget.id);
      if (response?.success === false) return;
      setDeleteTarget(null);
      toast.success('Sales deal deleted');
      fetchDeals(filters);
    } catch (error) {
      console.error('Failed to delete sales deal:', error);
      if (shouldToastCaughtError(error)) {
        toast.error(getUserErrorMessage(error, 'Failed to delete sales deal'));
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const getDealSortValue = useCallback((row: DealRecord, key: string) => {
    switch (key) {
      case 'companyName': return row.companyName || row.companyNo || '';
      case 'divisionName': return row.divisionName || row.divisionNo || '';
      case 'documentNoYearly': return row.documentNoYearly || '';
      case 'documentDate': return row.documentDate || '';
      case 'description': return row.description || '';
      default: return (row as unknown as Record<string, unknown>)[key] ?? '';
    }
  }, []);

  const {
    sortCol,
    sortDesc,
    handleSort,
    pageRows: sortedDeals,
    totalItems,
    totalPages,
    safePage,
    startIndex,
    endIndex,
  } = usePagedTableSort(deals, getDealSortValue, {
    defaultKey: 'companyName',
    defaultDesc: false,
    page: currentPage,
    pageSize: itemsPerPage,
  });

  const handleItemsPerPageChange = (size: number) => {
    setItemsPerPage(size);
    setCurrentPage(1);
  };

  return (
    <div className="page-shell">
      {/* CRM page band: title + primary action, then filters */}
      <div className="crm-band" data-page-tour="deals-breadcrumb">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="crm-page-title text-slate-50">Sales Deals - {totalItems}</h1>
          <div className="flex items-center gap-2 shrink-0">
          <PageGuideButton guideKey="deals" />
          <Button
            type="button"
            data-page-tour="deal-create"
            onClick={() => navigate('/sales/deals/new')}
            className="h-9 px-4 rounded-[7px] bg-[#1E56A0] hover:bg-[#17457F] text-white text-[13px] font-semibold gap-1.5"
          >
            <Plus size={15} strokeWidth={2.4} />
            Add
          </Button>
          </div>
        </div>
      <div data-page-tour="deal-filters">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="space-y-0.5">
              <FieldLabel className="text-[11px] font-medium text-slate-200 normal-case ml-1">Company</FieldLabel>
              <Combobox options={companyOptions} value={filters.companyNo || ''} onChange={(value) => setFilters((prev) => ({
                ...prev,
                companyNo: value,
                divisionNo: '',
              }))}
                placeholder="Select company"
                searchPlaceholder="Search company..."
                className="h-9 rounded-[7px] border-[var(--tm-border)] hover:border-[#1E56A0]/35 bg-[var(--tm-surface)] text-xs font-medium text-slate-200 w-full shadow-sm transition-colors focus:ring-2 focus:ring-[#1E56A0]/20 focus:border-[#1E56A0] focus-visible:ring-2 focus-visible:ring-[#1E56A0]/20 focus-visible:border-[#1E56A0] focus-visible:ring-offset-0 focus:outline-none"
              />
            </div>

            <div className="space-y-0.5">
              <FieldLabel className="text-[11px] font-medium text-slate-200 normal-case ml-1">Division</FieldLabel>
              <Combobox options={divisionOptions} value={filters.divisionNo || ''} onChange={(value) => setFilters((prev) => ({ ...prev, divisionNo: value }))}
                disabled={!filters.companyNo || isLoadingDivisions}
                placeholder={!filters.companyNo ? "Select company first" : isLoadingDivisions ? "Loading divisions..." : "All divisions"}
                searchPlaceholder="Search division..."
                className="h-9 rounded-[7px] border-[var(--tm-border)] hover:border-[#1E56A0]/35 bg-[var(--tm-surface)] text-xs font-medium text-slate-200 w-full shadow-sm transition-colors focus:ring-2 focus:ring-[#1E56A0]/20 focus:border-[#1E56A0] focus-visible:ring-2 focus-visible:ring-[#1E56A0]/20 focus-visible:border-[#1E56A0] focus-visible:ring-offset-0 focus:outline-none"
              />
            </div>

            {/* <div className="space-y-0.5">
              <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">Document No Yearly</label>
              <Input value={filters.documentNoYearly || ''} onChange={(event) => setFilters((prev) => ({ ...prev, documentNoYearly: event.target.value }))}
                className="h-11 rounded-2xl border-[var(--tm-border)] bg-[var(--tm-surface)] shadow-sm text-xs font-medium"
                placeholder="Enter document no"
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">From Date</label>
              <DatePicker date={filters.fromDocumentDate} onChange={(date) => setFilters((prev) => ({ ...prev, fromDocumentDate: date }))} placeholder="From date" />
            </div>

            <div className="space-y-0.5">
              <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">To Date</label>
              <DatePicker date={filters.toDocumentDate} onChange={(date) => setFilters((prev) => ({ ...prev, toDocumentDate: date }))} placeholder="To date" />
            </div> */}

            <div className="flex items-end gap-0.5">
              <Button type="button" variant="outline" data-page-tour="deal-reset" onClick={resetFilters} className="h-9 rounded-[7px] text-[13px] font-semibold gap-1 flex-1">
                <RotateCcw size={14} />
                Reset
              </Button>
              <Button type="button" data-page-tour="deal-search-btn" onClick={applyFilters} className="h-9 rounded-[7px] bg-[#1E56A0] hover:bg-[#17457F] text-white text-[13px] font-semibold gap-1 flex-1">
                <Search size={14} />
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

        <div data-page-tour="deal-table" className="crm-list-page crm-bleed-x crm-bleed-b flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="crm-pad-x flex-1 min-h-0 flex flex-col overflow-hidden">
          {isLoading && deals.length === 0 ? (
            <div className="px-4 py-16 flex items-center justify-center">
              <BrandLoader size="sm" message="Loading sales deals" />
            </div>
          ) : loadError && deals.length === 0 ? (
            <div className="px-4 py-8">
              <LoadErrorState
                title="Failed to load sales deals"
                onRetry={() => fetchDeals(filters)}
                compact
              />
            </div>
          ) : deals.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No records found"
              description="No sales deals match the current filters. Try adjusting company or division, then search again."
              compact
            />
          ) : (
            <DataTableScroll
              minWidth={760}
              mobile={
                <div className="flex flex-col gap-2 p-2">
                  {sortedDeals.map((deal) => (
                    <div
                      key={deal.id || `${deal.companyNo}-${deal.documentNoYearly}`}
                      className="rounded-xl border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/50 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <TruncatedText
                            text={String(deal.companyName || deal.companyNo || '-')}
                            className="text-sm font-semibold text-slate-100"
                          />
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-slate-400">
                            <span className="min-w-0 truncate">
                              <span className="text-slate-500">Division: </span>
                              {String(deal.divisionName || deal.divisionNo || 'N/A')}
                            </span>
                            <span className="min-w-0 truncate">
                              <span className="text-slate-500">Doc: </span>
                              {String(deal.documentNoYearly || '-')}
                            </span>
                            <span className="min-w-0 truncate">
                              <span className="text-slate-500">Date: </span>
                              {deal.documentDate ? formatDateOnly(deal.documentDate) : 'N/A'}
                            </span>
                          </div>
                          {deal.description ? (
                            <TruncatedText
                              text={deal.description}
                              className="mt-1 text-[11px] text-slate-500"
                            />
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <ActionTip label="Edit">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Edit"
                              onClick={() => handleEdit(deal)}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]"
                            >
                              <Edit size={14} />
                            </Button>
                          </ActionTip>
                          <ActionTip label="Delete">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Delete"
                              onClick={() => setDeleteTarget(deal)}
                              disabled={!deal.id}
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </ActionTip>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              }
              header={
                <table className="tm-data-table w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col style={{ width: '10rem' }} />
                    <col style={{ width: '9rem' }} />
                    <col style={{ width: '9rem' }} />
                    <col style={{ width: '8rem' }} />
                    <col />
                    <col style={{ width: '4.5rem' }} />
                  </colgroup>
                  <thead className="bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-slate-300 font-semibold uppercase tracking-wide">
                    <tr>
                      <th className="tm-col-sticky-code sticky left-0 z-[45] px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.28)] cursor-pointer" {...sortHeaderCellProps('companyName', handleSort)}>
                        <SortableHeader label="Company" sortKey="companyName" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                      </th>
                      <th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('divisionName', handleSort)}>
                        <SortableHeader label="Division" sortKey="divisionName" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                      </th>
                      <th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('documentNoYearly', handleSort)}>
                        <SortableHeader label="Document No Yearly" sortKey="documentNoYearly" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                      </th>
                      <th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('documentDate', handleSort)}>
                        <SortableHeader label="Document Date" sortKey="documentDate" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                      </th>
                      <th className="px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('description', handleSort)}>
                        <SortableHeader label="Description" sortKey="description" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                      </th>
                      <th className="tm-col-actions sticky right-0 z-40 px-1 py-2.5 pr-2 font-semibold tracking-wide text-slate-300 text-right border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.35)]">Actions</th>
                    </tr>
                  </thead>
                </table>
              }
              body={
                <table className="tm-data-table w-full table-fixed border-collapse text-left">
                  <colgroup>
                    <col style={{ width: '10rem' }} />
                    <col style={{ width: '9rem' }} />
                    <col style={{ width: '9rem' }} />
                    <col style={{ width: '8rem' }} />
                    <col />
                    <col style={{ width: '4.5rem' }} />
                  </colgroup>
                  <tbody>
                    {sortedDeals.map((deal) => (
                      <tr key={deal.id || `${deal.companyNo}-${deal.documentNoYearly}`} className="border-b border-[var(--tm-border)] hover:bg-[var(--tm-elevated)]/50 transition-colors">
                        <td className="tm-col-sticky-code tm-col-primary sticky left-0 z-20 px-3 py-2.5 font-medium text-slate-50 max-w-[10rem] min-w-0 overflow-hidden border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.18)]">
                          <TruncatedText text={String(deal.companyName || deal.companyNo || '-')} className="font-medium text-slate-50" />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 max-w-[9rem] min-w-0 overflow-hidden">
                          <TruncatedText text={String(deal.divisionName || deal.divisionNo || 'N/A')} className="text-slate-300" />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 max-w-[9rem] min-w-0 overflow-hidden">
                          <TruncatedText text={String(deal.documentNoYearly || '-')} className="text-slate-300" />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 max-w-[8rem] min-w-0 overflow-hidden">
                          <TruncatedText
                            text={deal.documentDate ? formatDateOnly(deal.documentDate) : 'N/A'}
                            className="text-slate-300"
                          />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 max-w-[320px] min-w-0 overflow-hidden">
                          <TruncatedText
                            text={deal.description || '-'}
                            className="text-slate-300"
                          />
                        </td>
                        <td className="tm-col-actions sticky right-0 z-10 px-1 py-2.5 pr-2 text-right border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                          <div className="flex items-center justify-end gap-1">
                            <ActionTip label="Edit">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Edit"
                                onClick={() => handleEdit(deal)}
                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]"
                              >
                                <RowEditIcon />
                              </Button>
                            </ActionTip>
                            <ActionTip label="Delete">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Delete"
                                onClick={() => setDeleteTarget(deal)}
                                disabled={!deal.id}
                                className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              >
                                <RowDeleteIcon />
                              </Button>
                            </ActionTip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              }
            />
          )}
        </div>

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
        </div>

      <MasterDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
        onConfirm={confirmDelete}
        recordName={deleteTarget?.documentNoYearly || deleteTarget?.description || null}
        entityLabel="sales deal"
        confirming={isDeleting}
      />
    </div>
  );
}
