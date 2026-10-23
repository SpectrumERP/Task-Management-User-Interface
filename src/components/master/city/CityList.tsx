import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useNavigate } from 'react-router-dom';
import { Building } from 'lucide-react';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterEntityTable } from '../shared/MasterEntityTable';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { CityMaster } from '@/store/useMasterStore';

const FORM_NO = 12;
const TITLE = 'City Master';

export function CityList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiCities, setApiCities] = useState<CityMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string | null>(null);

  const fetchCities = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await apiService.get<any>(`/api/master/cities/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((ct: any) => ({
          id: (ct.cityNo ?? ct.id ?? '').toString(),
          code: ct.code || ct.cityCode || '',
          name: ct.cityName || ct.name || '',
          countryNo: (ct.countryNo ?? ct.CountryNo ?? '').toString(),
          stateNo: (ct.stateNo ?? ct.StateNo ?? '').toString(),
          createdBy: ct.createdBy?.printingName || ct.createdBy?.displayName || ct.createdBy?.loginId || ct.createdByName || (typeof ct.createdBy === 'string' || typeof ct.createdBy === 'number' ? ct.createdBy : '') || 'System',
          createdByLoginNo: ct.createdBy?.loginNo ?? ct.createdBy?.id ?? null,
          createdDate: ct.createdDate || ct.createdDateTime || ct.createdOn || ''
        }));
        setApiCities(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API cities:', error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCities(); }, [companyNo]);

  const filteredList = apiCities.filter((item) => {
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
    apiService.delete(`/api/master/cities/${deleteTargetId}`, {
      params: { companyNo }
    }).then(() => { toast.success('City deleted'); fetchCities(); }).catch(err => { console.error('Failed to delete city:', err); toast.error('Failed to delete city'); });
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
        onSearchChange={setSearchQuery}
        onAddClick={() => navigate(toMasterNewPath('city'))}
        canAdd={isSave}
      />

      <MasterEntityTable
        rows={paginatedList}
        nameHeader="City Name"
        getCode={(item) => item.code || `SYS-${item.id}`}
        getName={(item) => <span>{item.name}</span>}
        onEdit={(item) => navigate(toMasterEditPath('city', item.id))}
        onDelete={handleDeleteClick}
        canUpdate={isUpdate}
        canDelete={isDelete}
        isLoading={isLoading}
        loadError={loadError}
        onRetryLoad={fetchCities}
        emptyIcon={Building}
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
        entityLabel="city"
      />
    </div>
  );
}
