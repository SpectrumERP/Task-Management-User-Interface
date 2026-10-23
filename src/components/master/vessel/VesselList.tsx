import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useNavigate } from 'react-router-dom';
import { Ship } from 'lucide-react';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterEntityTable } from '../shared/MasterEntityTable';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { VesselMaster } from '@/store/useMasterStore';

const FORM_NO = 1549;
const TITLE = 'Vessel Master';

export function VesselList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiVessels, setApiVessels] = useState<VesselMaster[]>([]);
  const [isLoadingVessels, setIsLoadingVessels] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string | null>(null);

  const fetchVessels = async () => {
    setIsLoadingVessels(true);
    setLoadError(false);
    try {
      const response = await apiService.get<any>(`/api/master/vessels/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((v: any) => ({
          id: (v.vesselNo ?? v.VesselNo ?? v.id ?? '').toString(),
          code: v.code || v.Code || '',
          name: v.vesselName || v.VesselName || v.name || '',
          createdBy: v.createdBy?.printingName || v.createdBy?.displayName || v.createdBy?.loginId || v.createdByName || (typeof v.createdBy === 'string' || typeof v.createdBy === 'number' ? v.createdBy : '') || 'System',
          createdByLoginNo: v.createdBy?.loginNo ?? v.createdBy?.id ?? null,
          createdDate: v.createdDate || v.createdDateTime || v.createdOn || ''
        }));
        setApiVessels(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API vessels:', error);
      setLoadError(true);
    } finally {
      setIsLoadingVessels(false);
    }
  };

  useEffect(() => { fetchVessels(); }, [companyNo]);

  const filteredList = apiVessels.filter((item) => {
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
    apiService.delete('/api/master/vessels/delete', {
      params: { vesselNo: deleteTargetId }
    }).then(() => { toast.success('Vessel deleted'); fetchVessels(); }).catch(err => { console.error('Failed to delete vessel:', err); toast.error('Failed to delete vessel'); });
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
        onAddClick={() => navigate(toMasterNewPath('vessel'))}
        canAdd={isSave}
      />

      <MasterEntityTable
        rows={paginatedList}
        nameHeader="Vessel Name"
        getCode={(item) => item.code || `SYS-${item.id}`}
        getName={(item) => <span>{item.name}</span>}
        onEdit={(item) => navigate(toMasterEditPath('vessel', item.id))}
        onDelete={handleDeleteClick}
        canUpdate={isUpdate}
        canDelete={isDelete}
        isLoading={isLoadingVessels}
        loadError={loadError}
        onRetryLoad={fetchVessels}
        emptyIcon={Ship}
        footer={
          !isLoadingVessels && filteredList.length > 0 ? (
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
          ) : null
        }
      />

      <MasterDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        recordName={deleteTargetLabel}
        entityLabel="vessel"
      />
    </div>
  );
}
