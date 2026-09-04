import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterEntityTable } from '../shared/MasterEntityTable';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { BusinessBenefitTypeMaster } from '@/store/useMasterStore';

const FORM_NO = 1545;
const TITLE = 'Business Benefit Type Master';

export function BenefitTypeList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiBusinessBenefitTypes, setApiBusinessBenefitTypes] = useState<BusinessBenefitTypeMaster[]>([]);
  const [benefitFillValues, setBenefitFillValues] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchBusinessBenefitTypes = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get<any>(`/api/master/business-benefit-types/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((b: any) => ({
          id: (b.businessBenefitTypeNo ?? '').toString(),
          code: b.code || '',
          name: b.businessBenefitTypeName || '',
          valuationtypeNo: b.valuationType?.toString() || '0',
          createdBy: b.createdBy?.printingName || b.createdBy?.displayName || b.createdBy?.loginId || b.createdByName || (typeof b.createdBy === 'string' || typeof b.createdBy === 'number' ? b.createdBy : '') || 'System',
          createdDate: b.createdDate || b.createdDateTime || b.createdOn || ''
        }));
        setApiBusinessBenefitTypes(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API business benefit types:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinessBenefitTypes();
    apiService.get<any>(`/api/master/business-benefit-types/fill-values?companyNo=${companyNo}`).then((res) => {
      if (res) setBenefitFillValues(res.data || res);
    }).catch(err => console.error('Failed to load benefit fill values:', err));
  }, [companyNo]);

  const filteredList = apiBusinessBenefitTypes.filter((item) => {
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
    apiService.delete('/api/master/business-benefit-types/delete', {
      params: { businessBenefitTypeNo: deleteTargetId }
    }).then(() => fetchBusinessBenefitTypes()).catch(err => console.error('Failed to delete benefit type:', err));
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  return (
    <div className="page-shell">
      <MasterListHeader
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => navigate(toMasterNewPath('benefit-type'))}
        canAdd={isSave}
      />

      <div className="flex-1 min-h-0 flex flex-col">
        <MasterEntityTable
          rows={paginatedList}
          nameHeader="Benefit Type Name"
          columns={[
            {
              header: 'Valuation Mode',
              render: (item) => benefitFillValues?.valuationTypes?.find((v: any) => v.valuationTypeNo?.toString() === item.valuationtypeNo?.toString())?.valuationTypeName || item.valuationtypeNo,
            },
          ]}
          getCode={(item) => item.code || `SYS-${item.id}`}
          getName={(item) => <span>{item.name}</span>}
          onEdit={(item) => navigate(toMasterEditPath('benefit-type', item.id))}
          onDelete={handleDeleteClick}
          canUpdate={isUpdate}
          canDelete={isDelete}
          isLoading={isLoading}
          emptyIcon={Sparkles}
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
