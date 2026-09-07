import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useNavigate } from 'react-router-dom';
import { Flag } from 'lucide-react';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterEntityTable } from '../shared/MasterEntityTable';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { PriorityMaster } from '@/store/useMasterStore';

const FORM_NO = 1543;
const TITLE = 'Priority Master';

export function PriorityList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const { fillValues, fetchFillValues } = useTaskStore();

  const [apiPriorities, setApiPriorities] = useState<PriorityMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string | null>(null);

  const getFrequencyName = (no: string | number) => {
    if (!fillValues?.frequency) return no;
    const item = fillValues.frequency.find((f: any) => (f.FrequencyNo || f.id || f.frequencyNo)?.toString() === no?.toString());
    return item ? (item.FrequencyName || item.Frequency || item.name || no) : no;
  };

  const fetchPriorities = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await apiService.get<any>(`/api/master/task-priorities/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((p: any) => ({
          id: (p.operTaskPriorityNo ?? '').toString(),
          code: p.code,
          name: p.taskPriorityName || '',
          priorityDuration: p.priorityDuration || '',
          priorityFrequencyNo: (p.priorityDurationFrequencyNo || '').toString(),
          sequence: p.sequenceNo || '',
          createdBy: p.createdBy?.printingName || p.createdBy?.displayName || p.createdBy?.loginId || p.createdByName || (typeof p.createdBy === 'string' || typeof p.createdBy === 'number' ? p.createdBy : '') || 'System',
          createdDate: p.createdDate || p.createdDateTime || p.createdOn || ''
        }));
        setApiPriorities(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API priorities:', error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPriorities();
    fetchFillValues(companyNo);
  }, [companyNo]);

  const filteredList = apiPriorities.filter((item) => {
    const query = searchQuery.toLowerCase();
    return item.name?.toLowerCase().includes(query) || item.code?.toLowerCase().includes(query);
  });

  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedList = filteredList.slice(startIndex, endIndex);

  const handleDeleteClick = (id: string, label?: string) => {
    setDeleteTargetId(id);
    setDeleteTargetLabel(label || null);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    apiService.delete('/api/master/task-priorities/delete', {
      params: { operTaskPriorityNo: deleteTargetId }
    }).then(() => { toast.success('Record deleted'); fetchPriorities(); }).catch(err => { console.error('Failed to delete priority:', err); toast.error('Failed to delete record'); });
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetLabel(null);
  };

  return (
    <div className="page-shell">
      <MasterListHeader
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => navigate(toMasterNewPath('priority'))}
        canAdd={isSave}
      />

      <MasterEntityTable
        rows={paginatedList}
        nameHeader="Priority Name"
        columns={[
          {
            header: 'Sequence',
            render: (item) => (
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[6px] bg-[var(--tm-muted)] px-1.5 text-[11px] font-semibold text-slate-200 tabular-nums">
                {item.sequence || '—'}
              </span>
            ),
          },
          {
            header: 'Priority Duration',
            render: (item) => (
              <span className="inline-flex items-center rounded-[6px] border border-[#0EA5E9]/15 bg-[var(--tm-tint)] px-2 py-0.5 text-[11px] font-semibold text-[#0EA5E9]">
                {item.priorityDuration} {getFrequencyName(item.priorityFrequencyNo)}
              </span>
            ),
          },
        ]}
        getCode={(item) => item.code || `SYS-${item.id}`}
        getName={(item) => <span className="uppercase tracking-wide">{item.name}</span>}
        onEdit={(item) => navigate(toMasterEditPath('priority', item.id))}
        onDelete={handleDeleteClick}
        canUpdate={isUpdate}
        canDelete={isDelete}
        isLoading={isLoading}
        loadError={loadError}
        onRetryLoad={fetchPriorities}
        emptyIcon={Flag}
        footer={
          !isLoading && filteredList.length > 0 ? (
            <MasterPaginationBar
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={(size) => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          ) : null
        }
      />

      <MasterDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        recordName={deleteTargetLabel}
/>
    </div>
  );
}
