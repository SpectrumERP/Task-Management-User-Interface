import { useEffect, useState } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchLocations = async () => {
    setIsLoading(true);
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
          createdDate: l.createdDate || l.createdDateTime || l.createdOn || ''
        }));
        setApiLocations(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API locations:', error);
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

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    apiService.delete('/api/master/task-locations/delete', {
      params: {
        operLocationNo: deleteTargetId,
        locationNo: deleteTargetId,
        id: deleteTargetId,
      }
    }).then(() => fetchLocations()).catch(err => console.error('Failed to delete location:', err));
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3.5 sm:p-4 sm:px-6 gap-2 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
      <MasterListHeader
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => navigate(toMasterNewPath('location'))}
        canAdd={isSave}
      />

      <div className="flex-1 min-h-0 flex flex-col">
        <MasterEntityTable
          rows={paginatedList}
          nameHeader="Location Name"
          columns={[
            {
              header: 'Type',
              render: (item) => (
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium text-[9px]">
                  {item.type || ''}
                </span>
              ),
            },
            { header: 'Incharge', render: (item) => item.inchargeNo || 'No Lead' },
            {
              header: 'Address',
              render: (item) => (
                <span className="max-w-[150px] truncate">
                  {item.address1} {item.cityNo ? `, ${item.cityNo}` : ''}
                </span>
              ),
            },
            { header: 'Region', render: (item) => item.locationRegion || 'Central' },
          ]}
          getCode={(item) => item.code || `SYS-${item.id}`}
          getName={(item) => <span>{item.name}</span>}
          onEdit={(item) => navigate(toMasterEditPath('location', item.id))}
          onDelete={handleDeleteClick}
          canUpdate={isUpdate}
          canDelete={isDelete}
          isLoading={isLoading}
          emptyIcon={MapPin}
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
