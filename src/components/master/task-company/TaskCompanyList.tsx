import { useEffect, useState } from 'react';
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

export function TaskCompanyList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiTaskCompanies, setApiTaskCompanies] = useState<TaskCompanyMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchTaskCompanies = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTaskCompanies(); }, [companyNo]);

  const filteredList = apiTaskCompanies.filter((item) => {
    const query = searchQuery.toLowerCase();
    return item.name?.toLowerCase().includes(query)
      || item.code?.toLowerCase().includes(query)
      || item.cityName?.toLowerCase().includes(query)
      || item.stateName?.toLowerCase().includes(query)
      || item.countryName?.toLowerCase().includes(query);
  });

  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedList = filteredList.slice(startIndex, endIndex);

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    apiService.delete('/api/crm/task-companies/delete', {
      params: { operTaskCompanyNo: deleteTargetId }
    }).then(() => fetchTaskCompanies()).catch(err => console.error('Failed to delete task company:', err));
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  return (
    <div className="page-shell">
      <MasterListHeader
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => navigate(toMasterNewPath('task-company'))}
        canAdd={isSave}
        searchPlaceholder="Search task company master records by name, code, city, state, country..."
      />

      <MasterEntityTable
        rows={paginatedList}
        nameHeader="Task Company Name"
        columns={[
          { header: 'Alias', render: (item) => item.aliasName || '-' },
          { header: 'Address 1', render: (item) => item.address1 || '-' },
          { header: 'City', render: (item) => item.cityName || '-' },
          { header: 'State', render: (item) => item.stateName || '-' },
          { header: 'Country', render: (item) => item.countryName || '-' },
        ]}
        getCode={(item) => item.code || `SYS-${item.id}`}
        getName={(item) => <span>{item.name}</span>}
        onEdit={(item) => navigate(toMasterEditPath('task-company', item.id))}
        onDelete={handleDeleteClick}
        canUpdate={isUpdate}
        canDelete={isDelete}
        isLoading={isLoading}
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
      />
    </div>
  );
}
