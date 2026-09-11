import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { apiService } from '@/services/apiService';
import { attachmentService } from '@/services/attachmentService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { exportBusinessEntityReportToExcel } from '@/utils/exportToExcel';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Edit, Trash2, Layers, List, Building, Users, User, Paperclip, FileText, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';

/* API list payloads are loosely shaped; keep runtime mapping unchanged. */
/* eslint-disable @typescript-eslint/no-explicit-any */

const FORM_NO = 1550;
const TITLE = 'Business Entity Master';
type CompanyViewMode = 'list' | 'album' | 'contact-list' | 'contact-album' | 'attachment';

export function CompanyList() {
  const navigate = useNavigate();
  const { isSave, isUpdate, isDelete } = useFormRights(FORM_NO);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [businessEntityFillValues, setBusinessEntityFillValues] = useState<any>(null);
  const [apiCompanies, setApiCompanies] = useState<any[]>([]);
  const [apiAlphabets, setApiAlphabets] = useState<string[]>([]);
  const [firstRowNo, setFirstRowNo] = useState<number | null>(null);
  const [lastRowNo, setLastRowNo] = useState<number | null>(null);
  const [currentStartsWith, setCurrentStartsWith] = useState('');
  const [companyViewMode, setCompanyViewMode] = useState<CompanyViewMode>('list');
  const [isLoadingMoreCompanies, setIsLoadingMoreCompanies] = useState(false);
  const [pageSize] = useState(20);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetLabel, setDeleteTargetLabel] = useState<string | null>(null);

  const loadedRanges = useRef<{ min: number; max: number }>({ min: 999999, max: 0 });
  const isLoadingRef = useRef(false);
  const isPrependPending = useRef(false);
  const scrollHeightBeforePrepend = useRef(0);
  const scrollTopBeforePrepend = useRef(0);
  const lastScrollTopRef = useRef(0);

  useLayoutEffect(() => {
    if (isPrependPending.current) {
      isPrependPending.current = false;
      const container = document.getElementById('company-scroll-container');
      if (container && scrollHeightBeforePrepend.current > 0) {
        const diff = container.scrollHeight - scrollHeightBeforePrepend.current;
        container.scrollTop = scrollTopBeforePrepend.current + diff;
      }
    }
  }, [apiCompanies]);

  useEffect(() => {
    apiService.get<any>(`/api/master/business-entities/fill-values?companyNo=${companyNo}`).then((response) => {
      if (response) setBusinessEntityFillValues(response);
    }).catch(err => console.error('Failed to fetch business entity fill-values:', err));
  }, [companyNo]);

  const fetchCompanies = async (params: {
    startsWith?: string;
    cursorRowNo?: number;
    direction?: 'Prev' | 'Next';
    pageSize?: number;
    appendMode?: 'append' | 'prepend' | 'replace';
  } = {}) => {
    try {
      const pSize = params.pageSize || pageSize;
      const targetStartsWith = Object.prototype.hasOwnProperty.call(params, 'startsWith')
        ? params.startsWith
        : currentStartsWith;
      const appendMode = params.appendMode || 'replace';

      const queryParams: Record<string, string> = {
        PageSize: pSize.toString()
      };

      if (targetStartsWith) {
        queryParams.StartsWith = targetStartsWith;
      }
      if (params.cursorRowNo !== undefined && params.cursorRowNo !== null) {
        queryParams.CursorRowNo = params.cursorRowNo.toString();
      }
      if (params.direction) {
        queryParams.Direction = params.direction;
      }

      const isContactMode = companyViewMode === 'contact-list' || companyViewMode === 'contact-album';
      const isAttachmentMode = companyViewMode === 'attachment';
      const endpoint = isContactMode
        ? `/api/master/business-entities/search/contact-person-wise`
        : isAttachmentMode
          ? `/api/master/business-entities/search/attachment-wise`
          : `/api/master/business-entities/search/business-entity-wise`;

      const response = await apiService.get<any>(endpoint, { params: queryParams });

      let rawItems: any[] = [];
      if (response) {
        const body = response.data || response;
        rawItems = Array.isArray(body) ? body : (body.data && Array.isArray(body.data) ? body.data : []);

        if (response.alphabets) {
          setApiAlphabets(response.alphabets);
        }
        const firstItem = rawItems[0];
        const lastItem = rawItems[rawItems.length - 1];

        let derivedFirst = response.firstRowNo;
        let derivedLast = response.lastRowNo;

        if (derivedFirst === undefined && firstItem) {
          derivedFirst = firstItem.RowNo ?? firstItem.rowNo ?? firstItem.row_no ?? (isContactMode ? (firstItem.businessEntityContactPersonDetailNo ?? firstItem.businessEntityNo) : isAttachmentMode ? (firstItem.attachmentNo ?? firstItem.businessEntityNo) : (firstItem.BusinessEntityNo ?? firstItem.businessEntityNo));
        }
        if (derivedLast === undefined && lastItem) {
          derivedLast = lastItem.RowNo ?? lastItem.rowNo ?? lastItem.row_no ?? (isContactMode ? (lastItem.businessEntityContactPersonDetailNo ?? lastItem.businessEntityNo) : isAttachmentMode ? (lastItem.attachmentNo ?? lastItem.businessEntityNo) : (lastItem.BusinessEntityNo ?? lastItem.businessEntityNo));
        }

        if (appendMode === 'replace') {
          if (derivedFirst !== undefined && derivedFirst !== null) setFirstRowNo(derivedFirst);
          if (derivedLast !== undefined && derivedLast !== null) setLastRowNo(derivedLast);
        } else if (appendMode === 'append') {
          if (derivedLast !== undefined && derivedLast !== null) setLastRowNo(derivedLast);
        } else if (appendMode === 'prepend') {
          if (derivedFirst !== undefined && derivedFirst !== null) setFirstRowNo(derivedFirst);
        }

        if (derivedFirst !== undefined && derivedFirst !== null && derivedLast !== undefined && derivedLast !== null) {
          const first = derivedFirst;
          const last = derivedLast;
          if (appendMode === 'replace') {
            loadedRanges.current = { min: first, max: last };
          } else if (appendMode === 'append') {
            loadedRanges.current.max = Math.max(loadedRanges.current.max, last);
            if (rawItems.length === 0) loadedRanges.current.max = 999999999;
          } else if (appendMode === 'prepend') {
            loadedRanges.current.min = Math.min(loadedRanges.current.min, first);
            if (rawItems.length === 0 || first <= 1) loadedRanges.current.min = -999999999;
          }
        } else {
          if (appendMode === 'append') loadedRanges.current.max = 999999999;
          else if (appendMode === 'prepend') loadedRanges.current.min = -999999999;
        }
      }

      const mapped = rawItems.map((c: any) => {
        if (isAttachmentMode) {
          const detailNo = c.attachmentNo ?? c.businessEntityNo ?? 0;
          const beNo = c.businessEntityNo ?? 0;
          const beName = c.businessEntityName ?? 'N/A';
          const code = c.code ?? `BE-${beNo}`;
          const status = c.status || 'Active';
          const fName = c.fileName || 'document.pdf';
          const fSize = c.fileSize || 0;
          const fType = c.fileType || '';

          return {
            id: detailNo.toString(),
            code: code.trim(),
            name: beName.trim(),
            crmBusinessEntityTypeNo: 0,
            type: c.businessEntityTypeName || 'Operation',
            address: '', city: '', state: '', country: '', pinCode: '',
            vatGst: '', creditLimit: 0, status,
            locations: [], contacts: [], ports: [],
            attachments: [{ id: detailNo, fileName: fName, fileSize: fSize, fileType: fType, previewUrl: '' }],
            createdBy: 'System', createdDate: ''
          };
        }

        if (isContactMode) {
          const detailNo = c.businessEntityContactPersonDetailNo ?? c.businessEntityNo ?? 0;
          const beNo = c.businessEntityNo ?? 0;
          const contactName = c.contactPersonName ?? 'N/A';
          const email = c.email ?? 'N/A';
          const department = c.department ?? 'N/A';
          const designation = c.designation ?? 'N/A';
          const beName = c.businessEntityName ?? 'N/A';
          const code = c.code ?? `BE-${beNo}`;
          const cityName = c.cityName ?? '';
          const stateName = c.stateName ?? '';
          const countryName = c.countryName ?? '';
          const status = c.status || 'Active';
          const phone = c.phoneNo || c.phone || 'N/A';

          return {
            id: detailNo.toString(),
            code: code.trim(),
            name: beName.trim(),
            crmBusinessEntityTypeNo: 0,
            type: c.businessEntityTypeName || 'Operation',
            address: '', city: cityName, state: stateName, country: countryName, pinCode: '',
            vatGst: '', creditLimit: 0, status,
            locations: [],
            contacts: [{
              businessEntityContactPersonDetailNo: detailNo,
              contactPersonName: contactName, email, department, designation, phoneNo: phone, status
            }],
            ports: [], attachments: [],
            createdBy: 'System', createdDate: ''
          };
        }

        const beNo = c.businessEntityNo ?? c.BusinessEntityNo ?? c.companyNo ?? c.id ?? '';
        const name = c.businessEntityName ?? c.BusinessEntityName ?? c.companyName ?? c.name ?? '';
        const code = c.code ?? c.Code ?? `BE-${beNo}`;

        const vat = c.vatgstNo ?? c.VATGSTNo ?? c.vatGst ?? '';
        const limit = c.creditInsuranceLimit ?? c.CreditInsuranceLimit ?? c.creditLimit ?? 0;
        const addr = c.address ?? c.Address ?? '';
        const cityName = c.cityName ?? c.CityName ?? c.city ?? '';
        const stateName = c.stateName ?? c.StateName ?? c.state ?? '';
        const countryName = c.countryName ?? c.CountryName ?? c.country ?? '';
        const pin = c.pinCode ?? c.PinCode ?? '';
        const user = c.DisplayName ?? c.UserName ?? (c.createdBy?.printingName || c.createdBy?.displayName || c.createdBy?.loginId || c.createdByName || 'System');
        const date = c.createdDate ?? c.CreatedDate ?? '';

        const locations = c.locations || (c.LocationNo ? [{
          locationTypeNo: c.LocationTypeNo || 1,
          address: addr, countryName, stateName, cityName, pinCode: pin,
          locationTypeName: c.locationTypeName || c.locationType?.addressTypeName || ''
        }] : []);

        const typeNo = c.CRMBusinessEntityTypeNo ?? c.BusinessEntityTypeNo ?? c.crmBusinessEntityTypeNo ?? c.businessEntityType?.operCRMBusinessEntityTypeNo ?? '';
        let typeName = c.BusinessEntityTypeName ?? c.CRMBusinessEntityTypeName ?? c.crmBusinessEntityTypeName ?? c.businessEntityTypeName ?? c.BusinessEntityType ?? c.Type ?? c.type ?? '';

        if (!typeName && typeNo) {
          const fillTypes = businessEntityFillValues?.data?.businessEntityTypes || businessEntityFillValues?.businessEntityTypes || [];
          const found = fillTypes.find((t: any) => t.operCRMBusinessEntityTypeNo?.toString() === typeNo.toString());
          if (found) typeName = found.operCRMBusinessEntityTypeName || '';
        }

        if (!typeName) {
          const fillTypes = businessEntityFillValues?.data?.businessEntityTypes || businessEntityFillValues?.businessEntityTypes || [];
          if (fillTypes.length > 0) {
            const beNoNum = parseInt(beNo) || 0;
            const index = beNoNum % fillTypes.length;
            typeName = fillTypes[index]?.operCRMBusinessEntityTypeName || 'Operation';
          } else {
            typeName = 'Operation';
          }
        }

        return {
          id: beNo.toString(),
          code: code.trim(),
          name: name.trim(),
          crmBusinessEntityTypeNo: typeNo ? parseInt(typeNo) : 0,
          type: typeName,
          address: addr, city: cityName, state: stateName, country: countryName, pinCode: pin,
          vatGst: vat, creditLimit: limit, status: c.status || 'Active',
          locations,
          contacts: c.contactPersons || c.contacts || [],
          ports: c.ports || [],
          attachments: c.attachments || c.attachment || [],
          createdBy: user, createdDate: date
        };
      });

      if (appendMode === 'append') {
        setApiCompanies(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNew = mapped.filter(item => !existingIds.has(item.id));
          return [...prev, ...uniqueNew];
        });
      } else if (appendMode === 'prepend') {
        const container = document.getElementById('company-scroll-container');
        if (container) {
          isPrependPending.current = true;
          scrollHeightBeforePrepend.current = container.scrollHeight;
          scrollTopBeforePrepend.current = container.scrollTop;
        }

        setApiCompanies(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const uniqueNew = mapped.filter(item => !existingIds.has(item.id));
          return [...uniqueNew, ...prev];
        });
      } else {
        setApiCompanies(mapped);
      }
    } catch (error) {
      console.error('Failed to fetch API companies:', error);
      if (params.appendMode !== 'append' && params.appendMode !== 'prepend') {
        setApiCompanies([]);
      }
    }
  };

  const handleAlphabetClick = async (letter: string) => {
    if (isLoadingRef.current) return;
    const isClearing = currentStartsWith === letter;
    const targetLetter = isClearing ? '' : letter;

    loadedRanges.current = { min: 999999, max: 0 };

    setCurrentStartsWith(targetLetter);
    isLoadingRef.current = true;
    setIsLoadingMoreCompanies(true);
    try {
      await fetchCompanies({ startsWith: targetLetter, appendMode: 'replace', cursorRowNo: undefined, direction: undefined });
      const container = document.getElementById('company-scroll-container');
      if (container) container.scrollTo({ top: 0 });
    } catch (err) {
      console.error('Failed to jump to alphabet:', err);
    } finally {
      isLoadingRef.current = false;
      setIsLoadingMoreCompanies(false);
    }
  };

  const handleLoadMore = async (direction: 'up' | 'down') => {
    if (isLoadingRef.current) return;

    if (direction === 'down') {
      if (lastRowNo === null || lastRowNo === undefined) return;
      if (loadedRanges.current.max > lastRowNo) return;

      isLoadingRef.current = true;
      setIsLoadingMoreCompanies(true);
      try {
        await fetchCompanies({ startsWith: '', cursorRowNo: lastRowNo, direction: 'Next', appendMode: 'append' });
      } catch (err) {
        console.error('Failed to load next page:', err);
      } finally {
        isLoadingRef.current = false;
        setIsLoadingMoreCompanies(false);
      }
    } else if (direction === 'up') {
      if (firstRowNo === null || firstRowNo === undefined || firstRowNo <= 1) return;
      if (loadedRanges.current.min < firstRowNo) return;

      isLoadingRef.current = true;
      setIsLoadingMoreCompanies(true);
      try {
        await fetchCompanies({ startsWith: '', cursorRowNo: firstRowNo, direction: 'Prev', appendMode: 'prepend' });
      } catch (err) {
        console.error('Failed to load previous page:', err);
      } finally {
        isLoadingRef.current = false;
        setIsLoadingMoreCompanies(false);
      }
    }
  };

  // Auto-fill viewport when the first page does not create a scrollbar.
  useEffect(() => {
    if (apiCompanies.length === 0) return;

    const timer = setTimeout(() => {
      const container = document.getElementById('company-scroll-container');
      if (container) {
        const hasScrollbar = container.scrollHeight > container.clientHeight;
        const hasMoreData = loadedRanges.current.max < 999999999;

        if (!hasScrollbar && hasMoreData && !isLoadingRef.current && !isLoadingMoreCompanies) {
          void handleLoadMore('down');
        }
      }
    }, 200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiCompanies, pageSize, isLoadingMoreCompanies, lastRowNo]);

  // Remount list data when company or view mode changes (intentional full reset + fetch).
  /* eslint-disable react-hooks/set-state-in-effect -- intentional list remount on company/view change */
  useEffect(() => {
    setCurrentStartsWith('');
    loadedRanges.current = { min: 999999, max: 0 };
    setFirstRowNo(null);
    setLastRowNo(null);
    setApiCompanies([]);
    void fetchCompanies({ appendMode: 'replace', startsWith: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyViewMode, companyNo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const filteredList = apiCompanies.filter((item) => {
    const query = searchQuery.toLowerCase();
    const matchesName = item.name?.toLowerCase().includes(query);
    const matchesCode = item.code?.toLowerCase().includes(query);
    const matchesCountry = item.country?.toString().toLowerCase().includes(query);
    const matchesState = item.state?.toString().toLowerCase().includes(query);
    const matchesCity = item.city?.toString().toLowerCase().includes(query);
    const matchesContactName = item.contacts?.some((c: any) =>
      (c.contactPersonName || c.contactName || c.name)?.toLowerCase().includes(query)
    );
    const matchesAttachmentName = item.attachments?.some((a: any) =>
      (a.fileName || a.name)?.toLowerCase().includes(query)
    );
    return matchesName || matchesCode || matchesCountry || matchesState || matchesCity || matchesContactName || matchesAttachmentName;
  });

  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedList = filteredList.slice(startIndex, endIndex);

  const groupedCompanies = useMemo(() => {
    const sorted = [...paginatedList].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    const groups: { letter: string; items: any[] }[] = [];
    sorted.forEach(item => {
      const firstChar = (item.name || '').charAt(0).toUpperCase();
      const letter = /^[A-Z]$/.test(firstChar) ? firstChar : '#';

      let group = groups.find(g => g.letter === letter);
      if (!group) {
        group = { letter, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });

    groups.sort((a, b) => {
      if (a.letter === '#') return 1;
      if (b.letter === '#') return -1;
      return a.letter.localeCompare(b.letter);
    });

    return groups;
  }, [paginatedList]);

  const handleAddClick = () => navigate(toMasterNewPath('company'));
  const handleEditClick = (company: any) => navigate(toMasterEditPath('company', company.id));
  const handleDeleteClick = (id: string, label?: string) => {
    setDeleteTargetId(id);
    setDeleteTargetLabel(label || null);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    apiService.delete('/api/master/business-entities/delete', {
      params: { businessEntityNo: deleteTargetId }
    }).then(() => {
      toast.success('Record deleted');
      fetchCompanies();
    }).catch(err => {
      console.error('Failed to delete company via API:', err);
      toast.error('Failed to delete record');
      fetchCompanies();
    });
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetLabel(null);
  };

  const viewModes: { id: CompanyViewMode; label: string; icon: ComponentType<{ size?: number }> }[] = [
    { id: 'list', label: 'Grid List', icon: List },
    { id: 'album', label: 'Album View', icon: Building },
    { id: 'contact-list', label: 'Contact List', icon: Users },
    { id: 'contact-album', label: 'Contact Album', icon: User },
    { id: 'attachment', label: 'Attachments', icon: Paperclip },
  ];

  const paginationBar = (
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
  );

  return (
    <div className="page-shell">
      <MasterListHeader
        title={TITLE}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onAddClick={handleAddClick}
        canAdd={isSave}
        guideKey="master-company"
      >
        <div
          data-page-tour="company-view-mode"
          className="flex flex-wrap items-center gap-0.5 h-auto min-h-10 p-0.5 rounded-[8px] border border-[var(--tm-border)] bg-[var(--tm-surface)] shrink-0"
        >
          {viewModes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setCompanyViewMode(id)}
              className={cn(
                'px-2.5 h-8 rounded-[6px] text-[10px] font-semibold transition-colors flex items-center gap-1.5',
                companyViewMode === id
                  ? 'bg-[#0EA5E9] text-white'
                  : 'text-slate-500 hover:text-slate-100 hover:bg-[var(--tm-muted)]'
              )}
            >
              <Icon size={12} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </MasterListHeader>

      <div className="flex-1 min-h-0 flex flex-col select-none">
        {filteredList.length === 0 ? (
          <div className="flex flex-col min-h-0 max-h-full w-full rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
            <div className="flex flex-col items-center justify-center p-10 text-center min-h-[200px]">
              <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-[10px] bg-[var(--tm-tint)] text-[#0EA5E9]/70">
                <Layers size={22} strokeWidth={1.75} />
              </span>
              <h3 className="text-sm font-semibold text-slate-100 tracking-tight">No Companies Found</h3>
              <p className="mt-1 max-w-sm text-[11px] font-medium text-slate-400 leading-relaxed">
                No companies match your search criteria. Try adjusting filters or click the Add button above to create a new one.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden relative">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]/50 shrink-0">
              <span className="text-[11px] font-semibold text-slate-400">Total {totalItems} Records</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => exportBusinessEntityReportToExcel(filteredList, companyViewMode, 'Business_Entity_Report.csv')}
                className="h-7 px-3 text-[10px] font-semibold gap-1.5 rounded-[6px] border-[#0EA5E9]/20 text-[#0EA5E9] hover:bg-[#0EA5E9]/10 shadow-sm"
              >
                <Download size={12} />
                Export CSV
              </Button>
            </div>
            <div className="flex-1 min-h-0 flex relative">
              <div
                className="flex-1 overflow-y-auto overflow-x-auto pr-10 scrollbar-thin min-h-0"
                id="company-scroll-container"
                onScroll={(e) => {
                  const target = e.currentTarget;
                  const currentScrollTop = target.scrollTop;
                  const isScrollingDown = currentScrollTop > lastScrollTopRef.current;
                  const isScrollingUp = currentScrollTop < lastScrollTopRef.current;
                  lastScrollTopRef.current = currentScrollTop;

                  const isNearBottom = isScrollingDown && target.scrollHeight > target.clientHeight && (target.scrollHeight - currentScrollTop - target.clientHeight < 80);
                  const isNearTop = isScrollingUp && currentScrollTop < 20;

                  if (isNearBottom && !isLoadingMoreCompanies) handleLoadMore('down');
                  else if (isNearTop && !isLoadingMoreCompanies) handleLoadMore('up');
                }}
                onWheel={(e) => {
                  const target = e.currentTarget;
                  if (target.scrollTop === 0 && e.deltaY < 0 && !isLoadingMoreCompanies) handleLoadMore('up');
                }}
              >
                {companyViewMode === 'list' ? (
                  <table className="tm-data-table w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-[var(--tm-muted)]/95 backdrop-blur-sm border-b border-[var(--tm-border)]">
                      <tr>
                        <th className="px-3 py-2 pl-4 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Code</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Business Entity Name</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Type</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Primary Address</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">City</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">State</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Country</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">VAT/GST No.</th>
                        <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Credit Limit</th>
                        <th className="px-3 py-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedList.map((company: any) => {
                        const locStr = [company.address, company.city, company.state, company.country].filter(Boolean).join(', ') || 'N/A';
                        return (
                          <tr key={company.id} className="border-b border-[var(--tm-border)] last:border-b-0 hover:bg-[var(--tm-elevated)]/70 transition-colors group">
                            <td className="px-3 py-2 pl-4">
                              <span className="text-[11px] font-medium text-[#0EA5E9] whitespace-nowrap tabular-nums">
                                {company.code}
                              </span>
                            </td>
                            <td
                              className={cn(
                                'px-3 py-2 text-xs font-semibold text-slate-100 min-w-0',
                                isUpdate && 'hover:text-[#0EA5E9] cursor-pointer'
                              )}
                              onClick={() => isUpdate && handleEditClick(company)}
                            >
                              <div className="min-w-0 truncate">{company.name}</div>
                            </td>
                            <td className="px-3 py-2 text-xs font-medium text-slate-300">
                              <span
                                className={cn(
                                  'px-2 py-0.5 rounded-[6px] text-[9px] font-semibold border',
                                  company.type === 'Buy'
                                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                )}
                              >
                                {company.type}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs font-medium text-slate-300 max-w-[200px] truncate" title={locStr}>
                              {locStr}
                            </td>
                            <td className="px-3 py-2 text-xs font-medium text-slate-300">
                              {company.city || 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-xs font-medium text-slate-300">
                              {company.state || 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-xs font-medium text-slate-300">
                              {company.country || 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-xs font-medium text-slate-300 font-mono">
                              {company.vatGst || 'N/A'}
                            </td>
                            <td className="px-3 py-2 text-xs font-medium text-slate-300">
                              {company.creditLimit ? `$${company.creditLimit.toLocaleString()}` : 'No Limit'}
                            </td>
                            <td className="px-3 py-2 pr-4 text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                {isUpdate ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditClick(company)}
                                    className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]"
                                  >
                                    <Edit size={13} />
                                  </Button>
                                ) : null}
                                {isDelete ? (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteClick(company.id, company.name || company.businessEntityName || company.code)}
                                    className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                  >
                                    <Trash2 size={13} />
                                  </Button>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : companyViewMode === 'album' ? (
                  <div className="space-y-5 p-3">
                    {groupedCompanies.map((group) => (
                      <div key={group.letter} id={`company-group-${group.letter}`} className="space-y-3 relative scroll-mt-2">
                        <div className="sticky top-0 z-10 py-1.5 px-3 bg-[var(--tm-tint)] rounded-[8px] text-xs font-semibold text-[#0EA5E9] flex items-center justify-between">
                          <span>Alphabet {group.letter}</span>
                          <span className="text-[10px] font-medium opacity-70">{group.items.length} Entities</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {group.items.map((company: any) => (
                            <Card key={company.id} className="relative rounded-[8px] border border-[var(--tm-border)]/70 shadow-sm hover:shadow-md hover:border-[#0EA5E9]/25 p-3.5 bg-[var(--tm-surface)] transition-all flex flex-col gap-3 overflow-hidden group">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-[8px] bg-[#0EA5E9] text-white flex items-center justify-center font-semibold text-xs shrink-0 uppercase">
                                    {company.name ? company.name.substring(0, 2) : 'BE'}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-[11px] font-semibold text-slate-50 leading-tight group-hover:text-[#0EA5E9] transition-colors truncate" title={company.name}>{company.name}</h4>
                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-[6px] bg-[var(--tm-elevated)] text-slate-300 border border-[var(--tm-border)]/80">{company.code}</span>
                                      <span className={cn("text-[8px] font-semibold px-1.5 py-0.5 rounded-[6px] border",
                                        company.type === 'Buy' ? "bg-sky-500/15 text-sky-400 border-sky-500/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30")}>
                                        {company.type}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {isUpdate && (
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(company)} className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]">
                                      <Edit size={11} />
                                    </Button>
                                  )}
                                  {isDelete && (
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(company.id, company.name || company.businessEntityName || company.code)} className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                                      <Trash2 size={11} />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 py-1.5 border-t border-b border-[var(--tm-border)] text-[10px] font-medium text-slate-500">
                                <div className="col-span-2">
                                  <span className="text-[8px] font-semibold text-[#0EA5E9] block mb-0.5">Primary Location</span>
                                  <span className="text-slate-100 font-medium block truncate leading-snug" title={company.address || 'N/A'}>{company.address || 'N/A'}</span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[8px] font-semibold text-slate-400 block mb-0.5">City & PIN Code</span>
                                  <span className="text-slate-200 font-medium block truncate" title={[company.city, company.pinCode].filter(Boolean).join(' - ')}>
                                    {[company.city, company.pinCode].filter(Boolean).join(' - ') || 'N/A'}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[8px] font-semibold text-slate-400 block mb-0.5">State & Country</span>
                                  <span className="text-slate-200 font-medium block truncate" title={[company.state, company.country].filter(Boolean).join(', ')}>
                                    {[company.state, company.country].filter(Boolean).join(', ') || 'N/A'}
                                  </span>
                                </div>
                                <div className="col-span-2 min-w-0">
                                  <span className="text-[8px] font-semibold text-slate-400 block mb-0.5">Credit limit & GST</span>
                                  <span className="text-slate-200 font-medium block truncate" title={`${company.creditLimit ? `$${company.creditLimit.toLocaleString()}` : 'No Limit'}${company.vatGst ? ` | GST: ${company.vatGst}` : ''}`}>
                                    {company.creditLimit ? `$${company.creditLimit.toLocaleString()}` : 'No Limit'}
                                    {company.vatGst ? ` | GST: ${company.vatGst}` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[9px] font-medium text-slate-400 pt-0.5 mt-auto">
                                <span className="flex items-center gap-1 min-w-0">
                                  <User size={10} className="text-slate-400 shrink-0" />
                                  Created By: <strong className="text-slate-300 truncate max-w-[100px]">{company.createdBy || company.displayName || company.userName || 'System'}</strong>
                                </span>
                                <span className="text-[8px] text-slate-400 font-semibold shrink-0">
                                  {company.createdDate ? new Date(company.createdDate).toLocaleDateString() : ''}
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : companyViewMode === 'contact-list' ? (
                  <div className="space-y-5 p-3">
                    {groupedCompanies.map((group) => {
                      const hasContacts = group.items.some(c => c.contacts && c.contacts.length > 0);
                      if (!hasContacts) return null;

                      return (
                        <div key={group.letter} id={`company-group-${group.letter}`} className="space-y-3 relative scroll-mt-2">
                          <div className="sticky top-0 z-10 py-1.5 px-3 bg-[var(--tm-tint)] rounded-[8px] text-xs font-semibold text-[#0EA5E9] flex items-center justify-between">
                            <span>Alphabet {group.letter}</span>
                            <span className="text-[10px] font-medium opacity-70">Contacts</span>
                          </div>

                          <div className="rounded-[8px] border border-[var(--tm-border)]/70 overflow-hidden bg-[var(--tm-surface)]">
                            <table className="tm-data-table w-full border-collapse text-left">
                              <thead className="sticky top-[28px] z-10 bg-[var(--tm-muted)]/95 backdrop-blur-sm border-b border-[var(--tm-border)]">
                                <tr>
                                  <th className="px-3 py-2 pl-4 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Contact Name</th>
                                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Business Entity</th>
                                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Designation</th>
                                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Department</th>
                                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Phone</th>
                                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Email</th>
                                  <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Status</th>
                                  <th className="px-3 py-2 pr-4 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.items.map((company: any) =>
                                  (company.contacts || []).map((contact: any, cIdx: number) => (
                                    <tr key={`${company.id}-${cIdx}`} className="border-b border-[var(--tm-border)] last:border-b-0 hover:bg-[var(--tm-elevated)]/70 transition-colors">
                                      <td className="px-3 py-2 pl-4 text-xs font-semibold text-slate-100">
                                        {contact.contactPersonName || contact.contactName || contact.name}
                                      </td>
                                      <td
                                        className={cn('px-3 py-2 text-xs font-medium text-slate-200', isUpdate && 'hover:text-[#0EA5E9] cursor-pointer')}
                                        onClick={() => isUpdate && handleEditClick(company)}
                                      >
                                        {company.name}
                                      </td>
                                      <td className="px-3 py-2 text-xs font-medium text-slate-300">{contact.designation || 'N/A'}</td>
                                      <td className="px-3 py-2 text-xs font-medium text-slate-300">{contact.department || 'N/A'}</td>
                                      <td className="px-3 py-2 text-xs font-medium text-slate-300 font-mono">{contact.phoneNo || contact.phone || 'N/A'}</td>
                                      <td className="px-3 py-2 text-xs font-medium text-slate-300">{contact.email || 'N/A'}</td>
                                      <td className="px-3 py-2 text-xs">
                                        <span className={cn(
                                          'px-2 py-0.5 rounded-[6px] text-[8px] font-semibold',
                                          (contact.status || 'Active') === 'Active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-[var(--tm-muted)] text-slate-500 border border-[var(--tm-border)]'
                                        )}>
                                          {contact.status || 'Active'}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 pr-4 text-right">
                                        {isUpdate ? (
                                          <Button type="button" variant="ghost" size="icon" onClick={() => handleEditClick(company)} className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)] ml-auto">
                                            <Edit size={13} />
                                          </Button>
                                        ) : null}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : companyViewMode === 'contact-album' ? (
                  <div className="space-y-5 p-3">
                    {groupedCompanies.map((group) => {
                      const hasContacts = group.items.some(c => c.contacts && c.contacts.length > 0);
                      if (!hasContacts) return null;

                      return (
                        <div key={group.letter} id={`company-group-${group.letter}`} className="space-y-3 relative scroll-mt-2">
                          <div className="sticky top-0 z-10 py-1.5 px-3 bg-[var(--tm-tint)] rounded-[8px] text-xs font-semibold text-[#0EA5E9] flex items-center justify-between">
                            <span>Alphabet {group.letter}</span>
                            <span className="text-[10px] font-medium opacity-70">Contact Cards</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {group.items.map((company: any) =>
                              (company.contacts || []).map((contact: any, cIdx: number) => {
                                const cName = contact.contactPersonName || contact.contactName || contact.name;
                                return (
                                  <Card key={`${company.id}-${cIdx}`} className="relative rounded-[8px] border border-[var(--tm-border)]/70 shadow-sm hover:shadow-md p-4 bg-[var(--tm-surface)] transition-all flex flex-col gap-3 group">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-[8px] bg-[#0EA5E9] text-white flex items-center justify-center font-semibold text-sm shrink-0 uppercase">
                                          {cName ? cName.substring(0, 2) : 'CP'}
                                        </div>
                                        <div>
                                          <h4 className="text-xs font-semibold text-slate-100 leading-tight">{cName}</h4>
                                          <p className="text-[9px] font-medium text-slate-400 mt-0.5">{contact.designation || 'Representative'} ({contact.department || 'General'})</p>
                                        </div>
                                      </div>
                                      <span className={cn(
                                        'px-2 py-0.5 rounded-[6px] text-[8px] font-semibold shrink-0',
                                        (contact.status || 'Active') === 'Active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-[var(--tm-muted)] text-slate-500 border border-[var(--tm-border)]'
                                      )}>
                                        {contact.status || 'Active'}
                                      </span>
                                    </div>

                                    <div className="border-t border-[var(--tm-border)] pt-2 text-[10px] font-medium text-slate-500 space-y-1">
                                      <div className="flex justify-between">
                                        <span className={cn('text-slate-50 font-semibold', isUpdate && 'hover:text-[#0EA5E9] cursor-pointer')} onClick={() => isUpdate && handleEditClick(company)}>{company.name}</span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-slate-400">Phone:</span>
                                        <span className="text-slate-200 font-mono">{contact.phoneNo || contact.phone || 'N/A'}</span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-slate-400">Email:</span>
                                        <span className="text-slate-200 truncate max-w-[150px]">{contact.email || 'N/A'}</span>
                                      </div>
                                    </div>

                                    <div className="pt-2 mt-auto flex items-center justify-between border-t border-[var(--tm-border)]">
                                      <span className="text-[9px] text-slate-400 font-medium">Code: {company.code}</span>
                                      {isUpdate && (
                                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(company)} className="h-7 rounded-[6px] text-slate-500 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)] text-[10px] font-semibold gap-1">
                                          <Edit size={11} />
                                          Edit
                                        </Button>
                                      )}
                                    </div>
                                  </Card>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-5 p-3">
                    {groupedCompanies.map((group) => {
                      const mergedMap = new Map<string, any>();
                      group.items.forEach((c: any) => {
                        const key = c.name || c.id;
                        if (mergedMap.has(key)) {
                          mergedMap.get(key).attachments.push(...(c.attachments || []));
                        } else {
                          mergedMap.set(key, { ...c, attachments: [...(c.attachments || [])] });
                        }
                      });

                      const mergedItems = Array.from(mergedMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                      const hasAttachments = mergedItems.some(c => c.attachments && c.attachments.length > 0);
                      if (!hasAttachments) return null;

                      return (
                        <div key={group.letter} id={`company-group-${group.letter}`} className="space-y-3 relative scroll-mt-2">
                          <div className="sticky top-0 z-10 py-1.5 px-3 bg-[var(--tm-tint)] rounded-[8px] text-xs font-semibold text-[#0EA5E9] flex items-center justify-between">
                            <span>Alphabet {group.letter}</span>
                            <span className="text-[10px] font-medium opacity-70">{mergedItems.length} Entities</span>
                          </div>
                          <div className="space-y-3">
                            {mergedItems.map((company: any) => {
                              if (!company.attachments || company.attachments.length === 0) return null;
                              return (
                                <div key={company.id} className="bg-[var(--tm-elevated)] rounded-[8px] border border-[var(--tm-border)]/70 p-4">
                                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--tm-border)]/60 mb-3">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] flex items-center justify-center font-semibold text-sm uppercase">
                                        {company.name ? company.name.substring(0, 2) : 'BE'}
                                      </div>
                                      <div>
                                        <h4 className={cn('text-xs font-semibold text-slate-50', isUpdate && 'hover:text-[#0EA5E9] cursor-pointer')} onClick={() => isUpdate && handleEditClick(company)}>{company.name}</h4>
                                        <p className="text-[9px] font-medium text-slate-400">{company.code} Ã¢ÂÂ¢ {company.type}</p>
                                      </div>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-semibold bg-[var(--tm-surface)] px-2.5 py-1 rounded-[6px] border border-[var(--tm-border)]/80">
                                      {company.attachments?.length || 0} Document(s)
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {company.attachments.map((att: any, idx: number) => {
                                      const isPdf = (att.fileName || att.name || '').toLowerCase().endsWith('.pdf');
                                      const isDoc = (att.fileName || att.name || '').toLowerCase().match(/\.(docx|doc)$/);
                                      const isSheet = (att.fileName || att.name || '').toLowerCase().match(/\.(xlsx|xls|csv)$/);

                                      return (
                                        <Card key={idx} className="bg-[var(--tm-surface)] rounded-[8px] border border-[var(--tm-border)]/70 p-3.5 hover:shadow-md hover:border-[#0EA5E9]/30 transition-all flex flex-col justify-between gap-3 group">
                                          <div className="flex items-start gap-3">
                                            <div className={cn(
                                              'p-2 rounded-[8px] shrink-0 flex items-center justify-center',
                                              isPdf ? 'bg-red-500/10 text-red-500' : isSheet ? 'bg-emerald-500/15 text-emerald-500' : isDoc ? 'bg-blue-500/15 text-blue-500' : 'bg-[var(--tm-muted)] text-slate-500'
                                            )}>
                                              <FileText size={18} />
                                            </div>
                                            <div className="min-w-0">
                                              <h5 className="text-xs font-semibold text-slate-200 truncate leading-snug group-hover:text-[#0EA5E9] transition-colors">{att.fileName || att.name}</h5>
                                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                <p className="text-[9px] text-slate-400 font-medium font-mono">
                                                  {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Attached Document'}
                                                </p>
                                                {att.fileType ? (
                                                  <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-[6px] bg-[var(--tm-elevated)] text-slate-500 border border-[var(--tm-border)]/80">{att.fileType}</span>
                                                ) : null}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-end pt-2 border-t border-[var(--tm-border)] mt-auto">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => attachmentService.downloadAttachment(att.id, att.fileName || att.name)}
                                              className="h-7 px-2.5 rounded-[6px] text-[9px] font-semibold text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30"
                                            >
                                              Download
                                            </Button>
                                          </div>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="absolute right-1.5 top-2 bottom-2 w-9 bg-[var(--tm-surface)]/95 backdrop-blur-sm rounded-[8px] border border-[var(--tm-border)]/80 shadow-sm flex flex-col items-center justify-between py-2 z-20 select-none">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map((char) => {
                  const hasItems = apiAlphabets.includes(char) || apiAlphabets.includes(char.toLowerCase());
                  const isSelected = currentStartsWith === char;
                  return (
                    <button
                      key={char}
                      type="button"
                      disabled={!hasItems}
                      onClick={() => handleAlphabetClick(char)}
                      className={cn(
                        'h-5 w-5 text-[9px] font-semibold rounded-[5px] flex items-center justify-center transition-colors',
                        isSelected
                          ? 'bg-[#0EA5E9] text-white'
                          : hasItems
                            ? 'text-slate-200 hover:text-white hover:bg-[#0EA5E9] cursor-pointer'
                            : 'text-slate-300 cursor-not-allowed opacity-40'
                      )}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>
            </div>
            {paginationBar}
          </div>
        )}
      </div>

      <MasterDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        recordName={deleteTargetLabel}
      />
    </div>
  );
}
