import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '@/services/apiService';
import { attachmentService } from '@/services/attachmentService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, X, Plus, Edit, Trash2, Layers, List, Building, Users, User, Paperclip, FileText, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';

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
    if (apiCompanies.length === 0) return;

    const timer = setTimeout(() => {
      const container = document.getElementById('company-scroll-container');
      if (container) {
        const hasScrollbar = container.scrollHeight > container.clientHeight;
        const hasMoreData = loadedRanges.current.max < 999999999;

        if (!hasScrollbar && hasMoreData && !isLoadingRef.current && !isLoadingMoreCompanies) {
          handleLoadMore('down');
        }
      }
    }, 200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiCompanies, pageSize]);

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
      const targetStartsWith = params.hasOwnProperty('startsWith') ? params.startsWith : currentStartsWith;
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

  useEffect(() => {
    setCurrentStartsWith('');
    loadedRanges.current = { min: 999999, max: 0 };
    setFirstRowNo(null);
    setLastRowNo(null);
    setApiCompanies([]);
    fetchCompanies({ appendMode: 'replace', startsWith: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyViewMode, companyNo]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

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
  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    apiService.delete('/api/master/business-entities/delete', {
      params: { businessEntityNo: deleteTargetId }
    }).then(() => {
      fetchCompanies();
    }).catch(err => {
      console.error('Failed to delete company via API:', err);
      fetchCompanies();
    });
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  return (
    <div className="page-shell">
      {/* Breadcrumb Header */}
      <div className="flex items-center shrink-0 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold min-w-0">
          <button
            type="button"
            className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded cursor-default"
          >
            Masters
          </button>
          <ChevronRight size={16} className="text-slate-400 shrink-0" />
          <span className="text-slate-900 font-bold tracking-tight truncate">{TITLE}</span>
        </div>
      </div>

      {/* Filters & Actions Section */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
        <Card className="flex-1 p-3.5 border-none shadow-md shadow-slate-200/20 bg-white/90 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center gap-3 h-10 sm:h-11">
          <Search size={16} className="text-slate-400 ml-1 shrink-0" />
          <Input placeholder="Search business entity master records by name, code, city, state, country..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs font-medium text-slate-700 h-full p-0 focus-visible:ring-0 placeholder:text-slate-400 placeholder:font-semibold flex-1"
          />
          {searchQuery && (
            <Button variant="ghost" size="icon" onClick={() => setSearchQuery('')} className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-655 flex items-center justify-center shrink-0">
              <X size={14} />
            </Button>
          )}
        </Card>

        <div className="flex flex-wrap items-center bg-white/90 p-1 rounded-xl sm:rounded-2xl border border-slate-200/40 shadow-md shrink-0 gap-1">
          <button
            onClick={() => setCompanyViewMode('list')}
            className={cn("px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 h-7 sm:h-8",
              companyViewMode === 'list' ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15 scale-[1.02]" : "text-slate-500 hover:text-slate-750 hover:bg-slate-100/50")}
          >
            <List size={12} /><span>Grid List</span>
          </button>
          <button
            onClick={() => setCompanyViewMode('album')}
            className={cn("px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 h-7 sm:h-8",
              companyViewMode === 'album' ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15 scale-[1.02]" : "text-slate-500 hover:text-slate-750 hover:bg-slate-100/50")}
          >
            <Building size={12} /><span>Album View</span>
          </button>
          <button
            onClick={() => setCompanyViewMode('contact-list')}
            className={cn("px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 h-7 sm:h-8",
              companyViewMode === 'contact-list' ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15 scale-[1.02]" : "text-slate-500 hover:text-slate-755 hover:bg-slate-100/50")}
          >
            <Users size={12} /><span>Contact List</span>
          </button>
          <button
            onClick={() => setCompanyViewMode('contact-album')}
            className={cn("px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 h-7 sm:h-8",
              companyViewMode === 'contact-album' ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15 scale-[1.02]" : "text-slate-500 hover:text-slate-755 hover:bg-slate-100/50")}
          >
            <User size={12} /><span>Contact Album</span>
          </button>
          <button
            onClick={() => setCompanyViewMode('attachment')}
            className={cn("px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 h-7 sm:h-8",
              companyViewMode === 'attachment' ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15 scale-[1.02]" : "text-slate-500 hover:text-slate-755 hover:bg-slate-100/50")}
          >
            <Paperclip size={12} /><span>Attachments</span>
          </button>
        </div>

        {isSave && (
          <Button onClick={handleAddClick} className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-[#006699] hover:bg-[#005580] text-white shadow-lg shadow-[#006699]/15 font-medium text-xs normal-case gap-0.5 shrink-0 transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center">
            <Plus size={14} strokeWidth={3.5} />
            Add Record
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {filteredList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-[24px] border border-slate-100 p-8 text-center animate-fade-in">
            <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-3">
              <Layers size={32} />
            </div>
            <h3 className="text-sm font-medium text-slate-700">No Companies Found</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm">No companies match your search criteria. Try adjusting filters or click the Add button above to create a new one.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col relative select-none">
            <div className="flex-1 min-h-0 flex gap-3 relative">
              <div
                className="flex-1 overflow-y-auto overflow-x-auto pr-10 scrollbar-thin space-y-6 pb-12"
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
                  <div className="bg-white rounded-2xl border border-slate-150 shadow-md flex flex-col overflow-visible">
                    <table className="w-full border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(241,245,249,1)]">
                        <tr>
                          <th className="px-4 py-3 text-[11px] font-semibold text-slate-600   pl-5">Code</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Business Entity Name</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Type</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Primary Address</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">City</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">State</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Country</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">VAT/GST No.</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Credit Limit</th>
                          <th className="px-4 py-3 text-[11px] font-semibold text-slate-600   text-center pr-5">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedList.map((company: any) => {
                          const locStr = [company.address, company.cityName, company.stateName, company.countryName].filter(Boolean).join(', ') || 'N/A';
                          return (
                            <tr key={company.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 text-xs font-medium text-slate-700 pl-5">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200/50 text-[10px]">
                                  {company.code}
                                </span>
                              </td>
                              <td className={cn("px-4 py-3 text-xs font-medium text-slate-900", isUpdate && "hover:text-[#006699] hover:underline cursor-pointer")} onClick={() => isUpdate && handleEditClick(company)}>
                                {company.name}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                                <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-medium   border",
                                  company.type === 'Buy' ? "bg-sky-50 text-sky-600 border-sky-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>
                                  {company.type}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-500 max-w-[200px] truncate" title={locStr}>
                                {locStr}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                                {company.city || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                                {company.state || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                                {company.country || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-xs font-semibold text-slate-500 font-mono">
                                {company.vatGst || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-xs font-medium text-slate-700">
                                {company.creditLimit ? `$${company.creditLimit.toLocaleString()}` : 'No Limit'}
                              </td>
                              <td className="px-4 py-3 text-xs text-center pr-5">
                                <div className="flex items-center justify-center gap-1">
                                  {isUpdate && (
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(company)} className="h-8 w-8 rounded-xl text-slate-400 hover:text-[#006699] hover:bg-slate-100 flex items-center justify-center">
                                      <Edit size={13} />
                                    </Button>
                                  )}
                                  {isDelete && (
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(company.id)} className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center">
                                      <Trash2 size={13} />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : companyViewMode === 'album' ? (
                  <div className="space-y-6">
                    {groupedCompanies.map((group) => (
                      <div key={group.letter} id={`company-group-${group.letter}`} className="space-y-3 relative scroll-mt-2">
                        <div className="sticky top-0 z-10 py-1.5 px-3 bg-[#006699]/10 rounded-lg text-xs font-medium text-[#006699] normal-case backdrop-blur-sm flex items-center justify-between shadow-sm">
                          <span>Alphabet {group.letter}</span>
                          <span className="text-[10px] opacity-70">{group.items.length} Entities</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {group.items.map((company: any) => (
                            <Card key={company.id} className="relative rounded-xl border border-slate-150 shadow-sm hover:shadow-lg hover:border-[#006699]/20 p-3.5 bg-white transition-all duration-300 flex flex-col gap-3 overflow-hidden group">
                              <div className="flex items-start justify-between gap-0.5.5">
                                <div className="flex items-center gap-0.5.5 min-w-0">
                                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#006699] to-[#00bfff] text-white flex items-center justify-center font-medium text-xs shadow-md shadow-[#006699]/10 shrink-0 uppercase">
                                    {company.name ? company.name.substring(0, 2) : 'BE'}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-[11px] font-medium text-slate-900 leading-tight group-hover:text-[#006699] transition-colors truncate" title={company.name}>{company.name}</h4>
                                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                                      <span className="text-[8px] font-medium   px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/50">{company.code}</span>
                                      <span className={cn("text-[8px] font-medium   px-1.5 py-0.5 rounded border",
                                        company.type === 'Buy' ? "bg-sky-50 text-sky-600 border-sky-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>
                                        {company.type}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {isUpdate && (
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(company)} className="h-7 w-7 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-slate-105 transition-colors flex items-center justify-center">
                                      <Edit size={11} />
                                    </Button>
                                  )}
                                  {isDelete && (
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(company.id)} className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center">
                                      <Trash2 size={11} />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 py-1.5 border-t border-b border-slate-100 text-[10px] font-semibold text-slate-500">
                                <div className="col-span-2">
                                  <span className="text-[8px] font-medium  text-[#006699] block  mb-0.5">Primary Location</span>
                                  <span className="text-slate-800 font-medium block truncate leading-snug" title={company.address || 'N/A'}>{company.address || 'N/A'}</span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[8px] font-medium  text-slate-400 block  mb-0.5">City & PIN Code</span>
                                  <span className="text-slate-700 font-medium block truncate" title={[company.city, company.pinCode].filter(Boolean).join(' - ')}>
                                    {[company.city, company.pinCode].filter(Boolean).join(' - ') || 'N/A'}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[8px] font-medium  text-slate-400 block  mb-0.5">State & Country</span>
                                  <span className="text-slate-700 font-medium block truncate" title={[company.state, company.country].filter(Boolean).join(', ')}>
                                    {[company.state, company.country].filter(Boolean).join(', ') || 'N/A'}
                                  </span>
                                </div>
                                <div className="col-span-2 min-w-0">
                                  <span className="text-[8px] font-medium  text-slate-400 block  mb-0.5">Credit limit & GST</span>
                                  <span className="text-slate-700 font-medium block truncate" title={`${company.creditLimit ? `$${company.creditLimit.toLocaleString()}` : 'No Limit'}${company.vatGst ? ` | GST: ${company.vatGst}` : ''}`}>
                                    {company.creditLimit ? `$${company.creditLimit.toLocaleString()}` : 'No Limit'}
                                    {company.vatGst ? ` | GST: ${company.vatGst}` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[9px] font-medium text-slate-400 pt-0.5 mt-auto">
                                <span className="flex items-center gap-1 min-w-0">
                                  <User size={10} className="text-slate-400 shrink-0" />
                                  Created By: <strong className="text-slate-600 truncate max-w-[100px]">{company.displayName || company.userName || 'System'}</strong>
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
                  <div className="space-y-6">
                    {groupedCompanies.map((group) => {
                      const hasContacts = group.items.some(c => c.contacts && c.contacts.length > 0);
                      if (!hasContacts) return null;

                      return (
                        <div key={group.letter} id={`company-group-${group.letter}`} className="space-y-3 relative scroll-mt-2">
                          <div className="sticky top-0 z-10 py-1.5 px-3 bg-[#006699]/10 rounded-lg text-xs font-medium text-[#006699] normal-case backdrop-blur-sm flex items-center justify-between shadow-sm">
                            <span>Alphabet {group.letter}</span>
                            <span className="text-[10px] opacity-70">Contacts</span>
                          </div>

                          <div className="bg-white rounded-2xl border border-slate-150 shadow-md flex flex-col overflow-visible">
                            <table className="w-full border-collapse text-left">
                              <thead className="sticky top-[28px] z-10 bg-slate-50/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(241,245,249,1)]">
                                <tr>
                                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-600   pl-5">Contact Name</th>
                                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Business Entity</th>
                                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Designation</th>
                                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Department</th>
                                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Phone</th>
                                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Email</th>
                                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Status</th>
                                  <th className="px-4 py-3 text-[11px] font-semibold text-slate-600   text-center pr-5">Parent Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.items.map((company: any) =>
                                  (company.contacts || []).map((contact: any, cIdx: number) => (
                                    <tr key={`${company.id}-${cIdx}`} className="hover:bg-slate-50/50 transition-colors">
                                      <td className="px-4 py-3 text-xs font-medium text-slate-700 pl-5">
                                        {contact.contactPersonName || contact.contactName || contact.name}
                                      </td>
                                      <td className={cn("px-4 py-3 text-xs font-medium text-slate-900", isUpdate && "hover:text-[#006699] hover:underline cursor-pointer")} onClick={() => isUpdate && handleEditClick(company)}>
                                        {company.name}
                                      </td>
                                      <td className="px-4 py-3 text-xs font-semibold text-slate-600">{contact.designation || 'N/A'}</td>
                                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">{contact.department || 'N/A'}</td>
                                      <td className="px-4 py-3 text-xs font-semibold text-slate-500 font-mono">{contact.phoneNo || contact.phone || 'N/A'}</td>
                                      <td className="px-4 py-3 text-xs font-semibold text-slate-550">{contact.email || 'N/A'}</td>
                                      <td className="px-4 py-3 text-xs">
                                        <span className={cn("px-2 py-0.5 rounded text-[8px] font-medium  ",
                                          (contact.status || 'Active') === 'Active' ? "bg-emerald-100/60 text-emerald-700" : "bg-slate-105 text-slate-500")}>
                                          {contact.status || 'Active'}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-xs text-center pr-5">
                                        {isUpdate && (
                                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(company)} className="h-8 w-8 rounded-xl text-slate-400 hover:text-[#006699] hover:bg-slate-100 mx-auto flex items-center justify-center">
                                            <Edit size={13} />
                                          </Button>
                                        )}
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
                  <div className="space-y-6">
                    {groupedCompanies.map((group) => {
                      const hasContacts = group.items.some(c => c.contacts && c.contacts.length > 0);
                      if (!hasContacts) return null;

                      return (
                        <div key={group.letter} id={`company-group-${group.letter}`} className="space-y-3 relative scroll-mt-2">
                          <div className="sticky top-0 z-10 py-1.5 px-3 bg-[#006699]/10 rounded-lg text-xs font-medium text-[#006699] normal-case backdrop-blur-sm flex items-center justify-between shadow-sm">
                            <span>Alphabet {group.letter}</span>
                            <span className="text-[10px] opacity-70">Contact Cards</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.items.map((company: any) =>
                              (company.contacts || []).map((contact: any, cIdx: number) => {
                                const cName = contact.contactPersonName || contact.contactName || contact.name;
                                return (
                                  <Card key={`${company.id}-${cIdx}`} className="relative rounded-2xl border border-slate-150 shadow-md hover:shadow-xl p-4 bg-white transition-all flex flex-col gap-3 group">
                                    <div className="flex items-start justify-between gap-0.5">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#006699] to-[#00bfff] text-white flex items-center justify-center font-medium text-sm shadow-md shrink-0 uppercase">
                                          {cName ? cName.substring(0, 2) : 'CP'}
                                        </div>
                                        <div>
                                          <h4 className="text-xs font-medium text-slate-800 leading-tight">{cName}</h4>
                                          <p className="text-[9px] font-medium text-slate-400 mt-0.5">{contact.designation || 'Representative'} ({contact.department || 'General'})</p>
                                        </div>
                                      </div>
                                      <span className={cn("px-2 py-0.5 rounded text-[8px] font-medium   shrink-0",
                                        (contact.status || 'Active') === 'Active' ? "bg-emerald-100/60 text-emerald-700" : "bg-slate-105 text-slate-500")}>
                                        {contact.status || 'Active'}
                                      </span>
                                    </div>

                                    <div className="border-t border-slate-100 pt-2 text-[10px] font-semibold text-slate-500 space-y-0.5">
                                      <div className="flex justify-between">
                                        <span className={cn("text-slate-900 font-medium", isUpdate && "hover:text-[#006699] hover:underline cursor-pointer")} onClick={() => isUpdate && handleEditClick(company)}>{company.name}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Phone:</span>
                                        <span className="text-slate-700 font-mono">{contact.phoneNo || contact.phone || 'N/A'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-400">Email:</span>
                                        <span className="text-slate-700 truncate max-w-[150px]">{contact.email || 'N/A'}</span>
                                      </div>
                                    </div>

                                    <div className="pt-2 mt-auto flex items-center justify-between border-t border-slate-100">
                                      <span className="text-[9px] text-slate-400 font-medium">Code: {company.code}</span>
                                      {isUpdate && (
                                        <Button variant="ghost" size="sm" onClick={() => handleEditClick(company)} className="h-7 rounded-lg text-slate-500 hover:text-[#006699] hover:bg-slate-100 text-[10px] font-medium flex items-center gap-1">
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
                  <div className="space-y-6">
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
                          <div className="sticky top-0 z-10 py-1.5 px-3 bg-[#006699]/10 rounded-lg text-xs font-medium text-[#006699] normal-case backdrop-blur-sm flex items-center justify-between shadow-sm">
                            <span>Alphabet {group.letter}</span>
                            <span className="text-[10px] opacity-70">{mergedItems.length} Entities</span>
                          </div>
                          <div className="space-y-4">
                            {mergedItems.map((company: any) => {
                              if (!company.attachments || company.attachments.length === 0) return null;
                              return (
                                <div key={company.id} className="bg-slate-50/50 rounded-[22px] border border-slate-150 p-5">
                                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200/60 mb-4">
                                    <div className="flex items-center gap-0.5">
                                      <div className="w-8 h-8 rounded-lg bg-[#006699]/10 text-[#006699] flex items-center justify-center font-medium text-sm uppercase">
                                        {company.name ? company.name.substring(0, 2) : 'BE'}
                                      </div>
                                      <div>
                                        <h4 className={cn("text-xs font-medium text-slate-900", isUpdate && "hover:text-[#006699] hover:underline cursor-pointer")} onClick={() => isUpdate && handleEditClick(company)}>{company.name}</h4>
                                        <p className="text-[9px] font-medium text-slate-400 normal-case">{company.code} • {company.type}</p>
                                      </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium bg-white px-2.5 py-1 rounded-lg border border-slate-100">
                                      {company.attachments?.length || 0} Document(s)
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {company.attachments.map((att: any, idx: number) => {
                                      const isPdf = (att.fileName || att.name || '').toLowerCase().endsWith('.pdf');
                                      const isDoc = (att.fileName || att.name || '').toLowerCase().match(/\.(docx|doc)$/);
                                      const isSheet = (att.fileName || att.name || '').toLowerCase().match(/\.(xlsx|xls|csv)$/);

                                      return (
                                        <Card key={idx} className="bg-white rounded-xl border border-slate-150 p-4 hover:shadow-md hover:border-[#006699]/30 transition-all flex flex-col justify-between gap-3 relative overflow-hidden group">
                                          <div className="flex items-start gap-3">
                                            <div className={cn("p-2.5 rounded-lg shrink-0 flex items-center justify-center",
                                              isPdf ? "bg-red-50 text-red-500" : isSheet ? "bg-emerald-50 text-emerald-500" : isDoc ? "bg-blue-50 text-blue-500" : "bg-slate-50 text-slate-500")}>
                                              <FileText size={20} />
                                            </div>
                                            <div className="min-w-0">
                                              <h5 className="text-xs font-medium text-slate-705 truncate leading-snug group-hover:text-[#006699] transition-colors">{att.fileName || att.name}</h5>
                                              <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
                                                <p className="text-[9px] text-slate-400 font-medium normal-case font-mono">
                                                  {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Attached Document'}
                                                </p>
                                                {att.fileType && (
                                                  <span className="text-[8px] font-medium   px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/50">{att.fileType}</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center justify-end gap-0.5 pt-2 border-t border-slate-100 mt-auto">
                                            <Button variant="ghost" size="sm" onClick={() => attachmentService.downloadAttachment(att.id, att.fileName || att.name)} className="h-7 px-2.5 rounded-lg text-[9px] font-medium text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-1 border border-emerald-150">
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

              {/* FLOATING INDEX ALPHABET SIDEBAR */}
              <div className="absolute -right-1 top-0 bottom-12 w-11 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl flex flex-col items-center justify-between py-3 z-20 select-none">
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map((char) => {
                  const hasItems = apiAlphabets.includes(char) || apiAlphabets.includes(char.toLowerCase());
                  const isSelected = currentStartsWith === char;
                  return (
                    <button
                      key={char}
                      disabled={!hasItems}
                      onClick={() => handleAlphabetClick(char)}
                      style={{ height: '21px', width: '21px' }}
                      className={cn(
                        "text-[10px] font-medium rounded-full flex items-center justify-center transition-all",
                        isSelected
                          ? "bg-[#006699] text-white shadow-md shadow-[#006699]/30 scale-110"
                          : hasItems
                            ? "text-slate-800 hover:text-white hover:bg-[#006699] cursor-pointer hover:scale-120 active:scale-95 shadow-sm hover:shadow"
                            : "text-slate-350 cursor-not-allowed opacity-30 text-[9px]"
                      )}
                    >
                      {char}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-md overflow-hidden">
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
            </div>
          </div>
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
