import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useNavigate } from 'react-router-dom';
import { Sliders } from 'lucide-react';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterEntityTable } from '../shared/MasterEntityTable';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { TypeMaster } from '@/store/useMasterStore';

const FORM_NO = 1560;
const TITLE = 'Type Master';

export function TypeList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiTypes, setApiTypes] = useState<TypeMaster[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const response = await apiService.get<any>(`/api/master/task-types/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((t: any) => ({
          id: (t.operTaskTypeNo ?? '').toString(),
          code: t.code,
          name: t.operTaskTypeName || '',
          createdBy: t.createdBy?.printingName || t.createdBy?.displayName || t.createdBy?.loginId || t.createdByName || (typeof t.createdBy === 'string' || typeof t.createdBy === 'number' ? t.createdBy : '') || 'System',
          createdDate: t.createdDate || t.createdDateTime || t.createdOn || ''
        }));
        setApiTypes(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API types:', error);
    } finally {
      setIsLoadingTypes(false);
    }
  };

  useEffect(() => { fetchTypes(); }, [companyNo]);

  const filteredList = apiTypes.filter((item) => {
    const query = searchQuery.toLowerCase();
    return item.name?.toLowerCase().includes(query) || item.code?.toLowerCase().includes(query);
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
    apiService.delete('/api/master/task-types/delete', {
      params: { operTaskTypeNo: deleteTargetId }
    }).then(() => fetchTypes()).catch(err => console.error('Failed to delete type:', err));
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3.5 sm:p-4 sm:px-6 gap-2 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
      <MasterListHeader
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => navigate(toMasterNewPath('type'))}
        canAdd={isSave}
      />

      <div className="flex-1 min-h-0 flex flex-col">
        <MasterEntityTable
          rows={paginatedList}
          nameHeader="Type Name"
          getCode={(item) => item.code || `SYS-${item.id}`}
          getName={(item) => <span>{item.name}</span>}
          onEdit={(item) => navigate(toMasterEditPath('type', item.id))}
          onDelete={handleDeleteClick}
          canUpdate={isUpdate}
          canDelete={isDelete}
          isLoading={isLoadingTypes}
          emptyIcon={Sliders}
        />
        {!isLoadingTypes && filteredList.length > 0 && (
          <MasterPaginationBar
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }}
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <MasterDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
