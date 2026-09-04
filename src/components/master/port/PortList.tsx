import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { useNavigate } from 'react-router-dom';
import { Anchor } from 'lucide-react';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterEntityTable } from '../shared/MasterEntityTable';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { PortMaster } from '@/store/useMasterStore';

const FORM_NO = 1563;
const TITLE = 'Port Master';

export function PortList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiPorts, setApiPorts] = useState<PortMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchPorts = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get<any>(`/api/master/ports/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((p: any) => ({
          id: (p.portNo ?? p.PortNo ?? p.id ?? '').toString(),
          code: p.code || p.Code || '',
          name: p.portName || p.PortName || p.name || '',
          portAlias: p.portAlias || p.alias || '',
          countryNo: (p.countryNo ?? p.CountryNo ?? '').toString(),
          countryName: p.countryName || p.CountryName || '',
          stateNo: (p.stateNo ?? p.StateNo ?? '').toString(),
          stateName: p.stateName || p.StateName || '',
          cityNo: (p.cityNo ?? p.CityNo ?? '').toString(),
          cityName: p.cityName || p.CityName || '',
          createdBy: p.createdBy?.printingName || p.createdBy?.displayName || p.createdBy?.loginId || p.createdByName || (typeof p.createdBy === 'string' || typeof p.createdBy === 'number' ? p.createdBy : '') || 'System',
          createdDate: p.createdDate || p.createdDateTime || p.createdOn || ''
        }));
        setApiPorts(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API ports:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPorts(); }, [companyNo]);

  const filteredList = apiPorts.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesCountry = item.countryName?.toString().toLowerCase().includes(query) || item.countryNo?.toString().toLowerCase().includes(query);
    const matchesState = item.stateName?.toString().toLowerCase().includes(query) || item.stateNo?.toString().toLowerCase().includes(query);
    const matchesCity = item.cityName?.toString().toLowerCase().includes(query) || item.cityNo?.toString().toLowerCase().includes(query);
    return item.name?.toLowerCase().includes(query) || item.code?.toLowerCase().includes(query) || matchesCountry || matchesState || matchesCity;
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
    apiService.delete('/api/master/ports/delete', {
      params: { portNo: deleteTargetId }
    }).then(() => fetchPorts()).catch(err => console.error('Failed to delete port:', err));
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  return (
    <div className="page-shell">
      <MasterListHeader
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddClick={() => navigate(toMasterNewPath('port'))}
        canAdd={isSave}
      />

      <MasterEntityTable
        rows={paginatedList}
        nameHeader="Port Name"
        columns={[
          {
            header: 'Country',
            render: (item) =>
              item.countryName || (
                <span className="italic text-slate-300 font-medium">Not set</span>
              ),
          },
          {
            header: 'State',
            render: (item) =>
              item.stateName || (
                <span className="italic text-slate-300 font-medium">Not set</span>
              ),
          },
          {
            header: 'City',
            render: (item) =>
              item.cityName || (
                <span className="italic text-slate-300 font-medium">Not set</span>
              ),
          },
        ]}
        getCode={(item) => item.code || `SYS-${item.id}`}
        getName={(item) => <span>{item.name}</span>}
        onEdit={(item) => navigate(toMasterEditPath('port', item.id))}
        onDelete={handleDeleteClick}
        canUpdate={isUpdate}
        canDelete={isDelete}
        isLoading={isLoading}
        emptyIcon={Anchor}
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
