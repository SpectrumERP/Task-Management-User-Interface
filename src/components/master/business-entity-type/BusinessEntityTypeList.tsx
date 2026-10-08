import { useEffect, useState } from 'react';
import { toast } from 'sonner';
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
import { BusinessEntityTypeMaster } from '@/store/useMasterStore';
import { pickDescription } from '@/lib/pickDescription';

const FORM_NO = 1564;
const TITLE = 'Business Entity Type';

export function BusinessEntityTypeList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [apiBusinessEntityTypes, setApiBusinessEntityTypes] = useState<BusinessEntityTypeMaster[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string | null>(null);

  const fetchBusinessEntityTypes = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await apiService.get<any>(`/api/master/business-entity-types/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        let mapped: BusinessEntityTypeMaster[] = rawItems.map((b: any) => ({
          id: (b.operCRMBusinessEntityTypeNo ?? b.OperCRMBusinessEntityTypeNo ?? b.id ?? '').toString(),
          code: b.code || b.Code || '',
          name: b.operCRMBusinessEntityTypeName || b.OperCRMBusinessEntityTypeName || b.name || '',
          description: pickDescription(b),
          createdBy: b.createdBy?.printingName || b.createdBy?.displayName || b.createdBy?.loginId || b.createdByName || (typeof b.createdBy === 'string' || typeof b.createdBy === 'number' ? b.createdBy : '') || 'System',
          createdDate: b.createdDate || b.createdDateTime || b.createdOn || ''
        }));

        // search-data may omit description or return empty — hydrate from load-data when blank
        const needsHydrate = mapped.filter((item) => item.id && !item.description);
        if (needsHydrate.length > 0) {
          const hydrated = await Promise.all(
            needsHydrate.map(async (item) => {
              try {
                const detail = await apiService.get<any>(
                  `/api/master/business-entity-types/load-data/${item.id}?companyNo=${companyNo}`
                );
                const body = detail?.data || detail;
                const dl = body?.data || body;
                return { id: item.id, description: pickDescription(dl) };
              } catch {
                return { id: item.id, description: '' };
              }
            })
          );
          const byId = new Map(hydrated.map((h) => [h.id, h.description]));
          mapped = mapped.map((item) => {
            const next = byId.get(item.id);
            return next ? { ...item, description: next } : item;
          });
        }

        setApiBusinessEntityTypes(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API business entity types:', error);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBusinessEntityTypes(); }, [companyNo]);

  const filteredList = apiBusinessEntityTypes.filter((item) => {
    const query = searchQuery.toLowerCase();
    return item.name?.toLowerCase().includes(query) || item.code?.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query);
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
    apiService.delete('/api/master/business-entity-types/delete', {
      params: { operCRMBusinessEntityTypeNo: deleteTargetId }
    }).then(() => { toast.success('Business entity type deleted'); fetchBusinessEntityTypes(); }).catch(err => { console.error('Failed to delete business entity type:', err); toast.error('Failed to delete business entity type'); });
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
        onAddClick={() => navigate(toMasterNewPath('business-entity-type'))}
        canAdd={isSave}
      />
      <MasterEntityTable
        rows={paginatedList}
        nameHeader="Business Entity Type Name"
        columns={[
          {
            header: 'Description',
            sortKey: 'description',
            render: (item) => item.description || <span className="italic text-slate-300 font-medium">No description</span>,
          },
        ]}
        getCode={(item) => item.code || `SYS-${item.id}`}
        getName={(item) => <span>{item.name}</span>}
        onEdit={(item) => navigate(toMasterEditPath('business-entity-type', item.id))}
        onDelete={handleDeleteClick}
        canUpdate={isUpdate}
        canDelete={isDelete}
        isLoading={isLoading}
        loadError={loadError}
        onRetryLoad={fetchBusinessEntityTypes}
        emptyIcon={Building2}
        footer={
          !isLoading && filteredList.length > 0 ? (
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
        entityLabel="business entity type"
      />
    </div>
  );
}
