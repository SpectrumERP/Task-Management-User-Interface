import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useNavigate } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterEntityTable } from '../shared/MasterEntityTable';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { CategoryMaster } from '@/store/useMasterStore';

const FORM_NO = 1561;
const TITLE = 'Category Master';

export function CategoryList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiCategories, setApiCategories] = useState<CategoryMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get<any>(`/api/master/task-categories/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((c: any) => ({
          id: (c.operTaskCategoryNo ?? '').toString(),
          code: c.code,
          name: c.operTaskCategoryName || '',
          isApprovalApplicable: c.isMultiLevelApproval,
          isInReviewRequired: c.isInReviewApplicable,
          isBusinessBenefitApplicable: c.isBusinessBenefitApplicable,
          checkList: Array.isArray(c.checkLists) ? c.checkLists.map((cl: any) => ({ description: cl.checkListDescription || cl.description || '', isChecked: !!cl.isChecked })) : [],
          color: c.colorCoding || '',
          createdBy: c.createdBy?.printingName || c.createdBy?.displayName || c.createdBy?.loginId || c.createdByName || (typeof c.createdBy === 'string' || typeof c.createdBy === 'number' ? c.createdBy : '') || 'System',
          createdDate: c.createdDate || c.createdDateTime || c.createdOn || ''
        }));
        setApiCategories(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, [companyNo]);

  const filteredList = apiCategories.filter((item) => {
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
    apiService.delete('/api/master/task-categories/delete', {
      params: { operTaskCategoryNo: deleteTargetId }
    }).then(() => fetchCategories()).catch(err => console.error('Failed to delete category:', err));
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  return (
    <div className="page-shell">
      <MasterListHeader
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => navigate(toMasterNewPath('category'))}
        canAdd={isSave}
      />

      <MasterEntityTable
        rows={paginatedList}
        nameHeader="Category Name"
        columns={[
          {
            header: 'Features',
            render: (item) => {
              const chips = [
                item.isApprovalApplicable && (
                  <span key="approval" className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[6px] border border-emerald-100">Approval</span>
                ),
                item.isInReviewRequired && (
                  <span key="review" className="text-[9px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-[6px] border border-amber-100">Review</span>
                ),
                item.isBusinessBenefitApplicable && (
                  <span key="benefit" className="text-[9px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-[6px] border border-sky-100">Benefit</span>
                ),
              ].filter(Boolean);

              if (chips.length === 0) {
                return <span className="text-slate-300">—</span>;
              }

              return <div className="flex flex-wrap gap-1">{chips}</div>;
            },
          },
        ]}
        getCode={(item) => item.code || `SYS-${item.id}`}
        getName={(item) => (
          <>
            {item.color ? (
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            ) : null}
            <span className="break-words">{item.name}</span>
          </>
        )}
        onEdit={(item) => navigate(toMasterEditPath('category', item.id))}
        onDelete={handleDeleteClick}
        canUpdate={isUpdate}
        canDelete={isDelete}
        isLoading={isLoading}
        emptyIcon={Layers}
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
