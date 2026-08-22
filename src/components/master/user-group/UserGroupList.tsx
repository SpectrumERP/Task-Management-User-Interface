import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterEntityTable } from '../shared/MasterEntityTable';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { UserGroupMaster } from '@/store/useMasterStore';

const FORM_NO = 1546;
const TITLE = 'User Group Master';

export function UserGroupList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiUserGroups, setApiUserGroups] = useState<UserGroupMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchUserGroups = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get<any>(`/api/security/user-groups/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((u: any) => ({
          id: (u.userGroupNo ?? '').toString(),
          code: u.code || '',
          name: u.userGroupName || '',
          description: u.description || '',
          createdBy: u.createdBy?.printingName || u.createdBy?.displayName || u.createdBy?.loginId || u.createdByName || (typeof u.createdBy === 'string' || typeof u.createdBy === 'number' ? u.createdBy : '') || 'System',
          createdDate: u.createdDate || u.createdDateTime || u.createdOn || ''
        }));
        setApiUserGroups(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API user groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchUserGroups(); }, [companyNo]);

  const filteredList = apiUserGroups.filter((item) => {
    const query = searchQuery.toLowerCase();
    return item.name?.toLowerCase().includes(query) || item.code?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query);
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
    apiService.delete('/api/security/user-groups/delete', {
      params: { userGroupNo: deleteTargetId }
    }).then(() => fetchUserGroups()).catch(err => console.error('Failed to delete user group:', err));
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3.5 sm:p-4 sm:px-6 gap-2 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
      <MasterListHeader
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => navigate(toMasterNewPath('user-group'))}
        canAdd={isSave}
      />

      <div className="flex-1 min-h-0 flex flex-col">
        <MasterEntityTable
          rows={paginatedList}
          nameHeader="User Group Name"
          columns={[
            {
              header: 'Description',
              render: (item) => item.description || <span className="italic text-slate-300 font-medium">No description</span>,
            },
          ]}
          getCode={(item) => item.code || `SYS-${item.id}`}
          getName={(item) => <span>{item.name}</span>}
          onEdit={(item) => navigate(toMasterEditPath('user-group', item.id))}
          onDelete={handleDeleteClick}
          canUpdate={isUpdate}
          canDelete={isDelete}
          isLoading={isLoading}
          emptyIcon={Users}
        />
        {!isLoading && filteredList.length > 0 && (
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
