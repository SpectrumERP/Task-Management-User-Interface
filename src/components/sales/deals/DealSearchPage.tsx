import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDateOnly } from '@/lib/dateTime';
import { AlertCircle, ChevronRight, Edit, FileText, Loader2, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { Button } from '@/components/ui/button';
import { PageGuideButton } from '@/components/layout/PageGuideButton';
import { Card } from '@/components/ui/card';
import { Combobox } from '@/components/ui/Combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/useAuthStore';
import { DealRecord, DealSearchFilters } from '@/types/deal';
import { DealOption, deleteDeal, fetchDivisionsByCompany, searchDeals } from './dealApi';
import { toast } from 'sonner';
import { getUserErrorMessage, shouldToastCaughtError } from '@/lib/errorFeedback';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { TruncatedText } from '@/components/master/shared/TruncatedCellTip';
import { SortableHeader, useTableSort } from '@/components/shared/useTableSort';

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
    pageSize: 10,
    pageNo: 1,
  });
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [divisionOptions, setDivisionOptions] = useState<DealOption[]>([]);
  const [isLoadingDivisions, setIsLoadingDivisions] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DealRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState(false);

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
    fetchDeals(nextFilters);
  };

  const resetFilters = () => {
    const nextFilters: DealSearchFilters = {
      companyNo: defaultCompanyNo,
      divisionNo: '',
      documentNoYearly: '',
      fromDocumentDate: undefined,
      toDocumentDate: undefined,
      pageSize: filters.pageSize,
      pageNo: 1,
    };
    setFilters(nextFilters);
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
      default: return (row as Record<string, unknown>)[key] ?? '';
    }
  }, []);

  const { sortCol, sortDesc, handleSort, sortedRows: sortedDeals } = useTableSort(
    deals,
    getDealSortValue,
    { defaultKey: 'documentNoYearly', defaultDesc: false }
  );

  return (
    <div className="page-shell">
      <div className="shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <button className="text-slate-500 hover:text-[#0EA5E9] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0EA5E9] rounded cursor-default">Sales</button>
            <ChevronRight size={16} className="text-slate-400" />
            <span className="text-slate-50 font-bold tracking-tight">Sales Deals</span>
            <PageGuideButton guideKey="deals" />
          </div>
          <Button
            type="button"
            data-page-tour="deal-create"
            onClick={() => navigate('/sales/deals/new')}
            className="h-9 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-medium gap-0.5 shadow-lg shadow-[#0EA5E9]/20"
          >
            <Plus size={15} />
            New Deal
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        <Card data-page-tour="deal-filters" className="rounded-2xl border-[var(--tm-border)] shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="space-y-0.5">
              <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">Company</label>
              <Combobox options={companyOptions} value={filters.companyNo || ''} onChange={(value) => setFilters((prev) => ({
                ...prev,
                companyNo: value,
                divisionNo: '',
              }))}
                placeholder="Select company"
                searchPlaceholder="Search company..."
                className="h-11 rounded-[8px] border-[var(--tm-border)] hover:border-[#0EA5E9]/35 bg-[var(--tm-surface)] text-xs font-medium text-slate-200 w-full shadow-sm transition-colors focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/20 focus-visible:border-[#0EA5E9] focus-visible:ring-offset-0 focus:outline-none"
              />
            </div>

            <div className="space-y-0.5">
              <label className="text-[11px] font-medium text-slate-200 normal-case ml-1">Division</label>
              <Combobox options={divisionOptions} value={filters.divisionNo || ''} onChange={(value) => setFilters((prev) => ({ ...prev, divisionNo: value }))}
                disabled={!filters.companyNo || isLoadingDivisions}
                placeholder={!filters.companyNo ? "Select company first" : isLoadingDivisions ? "Loading divisions..." : "All divisions"}
                searchPlaceholder="Search division..."
                className="h-11 rounded-[8px] border-[var(--tm-border)] hover:border-[#0EA5E9]/35 bg-[var(--tm-surface)] text-xs font-medium text-slate-200 w-full shadow-sm transition-colors focus:ring-2 focus:ring-[#0EA5E9]/20 focus:border-[#0EA5E9] focus-visible:ring-2 focus-visible:ring-[#0EA5E9]/20 focus-visible:border-[#0EA5E9] focus-visible:ring-offset-0 focus:outline-none"
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
              <Button type="button" variant="outline" data-page-tour="deal-reset" onClick={resetFilters} className="h-11 rounded-xl text-xs font-medium gap-0.5 flex-1">
                <RotateCcw size={14} />
                Reset
              </Button>
              <Button type="button" data-page-tour="deal-search-btn" onClick={applyFilters} className="h-11 rounded-xl bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-xs font-medium gap-0.5 flex-1">
                <Search size={14} />
                Search
              </Button>
            </div>
          </div>
        </Card>

        <Card data-page-tour="deal-table" className="rounded-2xl border-[var(--tm-border)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="tm-data-table w-full min-w-[760px] text-left">
              <thead className="bg-[var(--tm-muted)] border-b border-[var(--tm-border)]">
                <tr>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-300">
                    <SortableHeader label="Company" sortKey="companyName" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-300">
                    <SortableHeader label="Division" sortKey="divisionName" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-300">
                    <SortableHeader label="Document No Yearly" sortKey="documentNoYearly" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-300">
                    <SortableHeader label="Document Date" sortKey="documentDate" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-300">
                    <SortableHeader label="Description" sortKey="description" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--tm-border)] bg-[var(--tm-surface)]">
                {isLoading && deals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex items-center justify-center">
                        <BrandLoader size="sm" message="Loading sales deals" />
                      </div>
                    </td>
                  </tr>
                ) : loadError && deals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <LoadErrorState
                        title="Failed to load sales deals"
                        onRetry={() => fetchDeals(filters)}
                        compact
                      />
                    </td>
                  </tr>
                ) : deals.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-0.5 text-slate-400">
                        <FileText size={26} />
                        <p className="text-xs font-medium">No records found</p>
                      </div>
                    </td>
                  </tr>
                ) : sortedDeals.map((deal) => (
                  <tr key={deal.id || `${deal.companyNo}-${deal.documentNoYearly}`} className="hover:bg-[var(--tm-muted)]/70 transition-colors">
                    <td className="px-4 py-3 text-xs font-medium text-slate-200 max-w-[10rem] min-w-0 overflow-hidden">
                      <TruncatedText text={String(deal.companyName || deal.companyNo || '-')} className="text-xs font-medium text-slate-200" />
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-200 max-w-[9rem] min-w-0 overflow-hidden">
                      <TruncatedText text={String(deal.divisionName || deal.divisionNo || 'N/A')} className="text-xs font-medium text-slate-200" />
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-slate-100 max-w-[9rem] min-w-0 overflow-hidden">
                      <TruncatedText text={String(deal.documentNoYearly || '-')} className="text-xs font-medium text-slate-100" />
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-300 max-w-[8rem] min-w-0 overflow-hidden">
                      <TruncatedText
                        text={deal.documentDate ? formatDateOnly(deal.documentDate) : 'N/A'}
                        className="text-xs font-semibold text-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-500 max-w-[320px] min-w-0 overflow-hidden">
                      <TruncatedText
                        text={deal.description || '-'}
                        className="text-xs font-semibold text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(deal)}
                          title="Edit"
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-muted)]"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(deal)}
                          disabled={!deal.id}
                          title="Delete"
                          className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <DialogContent className="rounded-2xl max-w-sm p-0 border-none shadow-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-lg font-medium text-slate-100 tracking-tight flex items-center gap-0.5">
              <AlertCircle size={20} className="text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Do you want to delete?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-[var(--tm-muted)]/50 flex justify-end gap-0.5 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteTarget(null)}
              className="h-10 px-4 rounded-xl text-xs font-medium text-slate-300 hover:bg-[var(--tm-muted)] border-transparent shadow-none"
            >
              No
            </Button>
            <Button
              type="button"
              disabled={isDeleting}
              onClick={confirmDelete}
              className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-xs normal-case shadow-md shadow-red-500/20 gap-0.5"
            >
              {isDeleting && <Loader2 size={14} className="animate-spin" />}
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
