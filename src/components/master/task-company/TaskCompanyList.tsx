import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterEntityTable } from '../shared/MasterEntityTable';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { TaskCompanyMaster } from '@/store/useMasterStore';

const FORM_NO = 1565;
const TITLE = 'Task Company Master';

/** Trim + lowercase. Empty / whitespace-only → no active search. */
function normalizeSearchQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

function fieldIncludes(value: unknown, query: string): boolean {
  if (value === null || value === undefined) return false;
  return String(value).toLowerCase().includes(query);
}

/** Existing multi-field match (Name, Alias, code, address, geo, pin). */
function taskCompanyMatchesSearch(item: TaskCompanyMaster, query: string): boolean {
  return fieldIncludes(item.name, query)
    || fieldIncludes(item.code, query)
    || fieldIncludes(item.aliasName, query)
    || fieldIncludes(item.address1, query)
    || fieldIncludes(item.address2, query)
    || fieldIncludes(item.address3, query)
    || fieldIncludes(item.cityName, query)
    || fieldIncludes(item.stateName, query)
    || fieldIncludes(item.countryName, query)
    || fieldIncludes(item.pinCode, query);
}

/**
 * Name-primary search priority (lower = better).
 * 1 exact name · 2 partial name · 3 exact alias · 4 partial alias · 5 other fields only
 * When Name and Alias both match, the best (lowest) Name-capable tier wins.
 */
function getTaskCompanySearchPriority(item: TaskCompanyMaster, query: string): number {
  const name = (item.name ?? '').toString().toLowerCase();
  const alias = (item.aliasName ?? '').toString().toLowerCase();

  if (name === query) return 1;
  if (name.includes(query)) return 2;
  if (alias === query) return 3;
  if (alias.includes(query)) return 4;
  return 5;
}

export function TaskCompanyList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiTaskCompanies, setApiTaskCompanies] = useState<TaskCompanyMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string | null>(null);

  const fetchTaskCompanies = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await apiService.get<any>(`/api/crm/task-companies/search-data`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((tc: any) => ({
          id: (tc.operTaskCompanyNo ?? tc.taskCompanyNo ?? '').toString(),
          code: tc.code,
          name: tc.companyName || '',
          aliasName: tc.aliasName || '',
          address1: tc.address1 || '',
          address2: tc.address2 || '',
          address3: tc.address3 || '',
          countryNo: tc.countryNo || '',
          stateNo: tc.stateNo || '',
          cityNo: tc.cityNo || '',
          countryName: tc.countryName || '',
          stateName: tc.stateName || '',
          cityName: tc.cityName || '',
          pinCode: tc.pinCode || '',
          createdBy: tc.createdBy?.printingName || tc.createdBy?.displayName || tc.createdBy?.loginId || tc.createdByName || 'System',
          createdDate: tc.createdDate || tc.createdDateTime || tc.createdOn || ''
        }));
        setApiTaskCompanies(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API task companies:', error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTaskCompanies(); }, [companyNo]);

  // Normalize → Filter → Rank → stable secondary order (original API index) → then paginate below
  const filteredList = useMemo(() => {
    const query = normalizeSearchQuery(searchQuery);
    if (!query) return apiTaskCompanies;

    const matched: { item: TaskCompanyMaster; priority: number; index: number }[] = [];
    for (let index = 0; index < apiTaskCompanies.length; index++) {
      const item = apiTaskCompanies[index];
      if (!taskCompanyMatchesSearch(item, query)) continue;
      matched.push({
        item,
        priority: getTaskCompanySearchPriority(item, query),
        index,
      });
    }

    matched.sort((a, b) => a.priority - b.priority || a.index - b.index);
    return matched.map((entry) => entry.item);
  }, [apiTaskCompanies, searchQuery]);

  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedList = filteredList.slice(startIndex, endIndex);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleDeleteClick = (id: string, label?: string) => {
    setDeleteTargetId(id);
    setDeleteTargetLabel(label || null);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    apiService.delete('/api/crm/task-companies/delete', {
      params: { operTaskCompanyNo: deleteTargetId }
    }).then(() => {
      toast.success('Task company deleted');
      fetchTaskCompanies();
    }).catch(err => {
      console.error('Failed to delete task company:', err);
      toast.error('Failed to delete task company');
    });
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetLabel(null);
  };

  return (
    <div className="page-shell">
      <MasterListHeader
        count={totalItems}
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onAddClick={() => navigate(toMasterNewPath('task-company'))}
        canAdd={isSave}
        searchPlaceholder="Search by name, alias, code, address, city, state, country..."
      />

      <MasterEntityTable
        rows={paginatedList}
        nameHeader="Task Company Name"
        columns={[
          { header: 'Alias', sortKey: 'aliasName', render: (item) => item.aliasName || '' },
          { header: 'Address 1', sortKey: 'address1', render: (item) => item.address1 || '' },
          { header: 'City', sortKey: 'cityName', render: (item) => item.cityName || '' },
          { header: 'State', sortKey: 'stateName', render: (item) => item.stateName || '' },
          { header: 'Country', sortKey: 'countryName', render: (item) => item.countryName || '' },
        ]}
        getCode={(item) => item.code || `SYS-${item.id}`}
        getName={(item) => <span>{item.name}</span>}
        onEdit={(item) => navigate(toMasterEditPath('task-company', item.id))}
        onDelete={handleDeleteClick}
        canUpdate={isUpdate}
        canDelete={isDelete}
        isLoading={isLoading}
        loadError={loadError}
        onRetryLoad={fetchTaskCompanies}
        emptyIcon={Building2}
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
        entityLabel="task company"
      />
    </div>
  );
}
