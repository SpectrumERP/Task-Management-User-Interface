import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterEntityTable } from '../shared/MasterEntityTable';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { LocationMaster } from '@/store/useMasterStore';

const FORM_NO = 1541;
const TITLE = 'Location Master';

export function LocationList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiLocations, setApiLocations] = useState<LocationMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string | null>(null);

  const fetchLocations = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await apiService.get<any>(`/api/master/task-locations/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((l: any) => ({
          id: (l.operLocationNo ?? '').toString(),
          code: l.code,
          name: l.operLocationName || l.locationName || l.name || '',
          type: (l.operLocationType ?? l.locationType ?? l.type ?? '').toString(),
          parentLocationNo: (l.parentLocationNo ?? '').toString(),
          inchargeNo: (l.locationIncharge ?? l.inchargeNo ?? '').toString(),
          address1: l.address1 || '',
          address2: l.address2 || '',
          address3: l.address3 || '',
          countryNo: l.countryName || l.countryNo || '',
          stateNo: l.stateName || l.stateNo || '',
          cityNo: l.cityName || l.cityNo || '',
          pinCode: l.pinCode || '',
          locationRegion: l.regionName || l.locationRegion || '',
          createdBy: l.createdBy?.printingName || l.createdBy?.displayName || l.createdBy?.loginId || l.createdByName || (typeof l.createdBy === 'string' || typeof l.createdBy === 'number' ? l.createdBy : '') || 'System',
          createdDate: l.createdDate || l.createdDateTime || l.createdOn || '',
        }));
        setApiLocations(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API locations:', error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLocations(); }, [companyNo]);

  const filteredList = apiLocations.filter((item) => {
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
    apiService.delete('/api/master/task-locations/delete', {
      params: {
        operLocationNo: deleteTargetId,
        locationNo: deleteTargetId,
        id: deleteTargetId,
      },
    }).then(() => { toast.success('Location deleted'); fetchLocations(); }).catch(err => { console.error('Failed to delete location:', err); toast.error('Failed to delete location'); });
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetLabel(null);
  };

  const formatAddress = (item: LocationMaster) => {
    const parts = [item.address1, item.cityNo].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  };

  return (
    <div className="page-shell">
      <MasterListHeader
        count={totalItems}
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => navigate(toMasterNewPath('location'))}
        canAdd={isSave}
      />

      <MasterEntityTable
        rows={paginatedList}
        nameHeader="Location Name"
        columns={[
          {
            header: 'Type',
            width: 100,
            render: (item) => item.type || '—',
          },
          {
            header: 'Incharge',
            width: 140,
            render: (item) => item.inchargeNo || 'No Lead',
          },
          {
            header: 'Address',
            width: 220,
            render: (item) => formatAddress(item),
          },
          {
            header: 'Region',
            width: 100,
            render: (item) => item.locationRegion || 'Central',
          },
        ]}
        getCode={(item) => item.code || `SYS-${item.id}`}
        getName={(item) => item.name}
        onEdit={(item) => navigate(toMasterEditPath('location', item.id))}
        onDelete={handleDeleteClick}
        canUpdate={isUpdate}
        canDelete={isDelete}
        isLoading={isLoading}
        loadError={loadError}
        onRetryLoad={fetchLocations}
        emptyIcon={MapPin}
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
        entityLabel="location"
      />
    </div>
  );
}
