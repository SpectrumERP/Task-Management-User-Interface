import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
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
  Edit, Trash2, Layers, List, Building, Users, User, Paperclip, FileText, Download, Eye, Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatUtcDateTime } from '@/lib/dateTime';
import { SortableHeader, sortHeaderCellProps, usePagedTableSort } from '@/components/shared/useTableSort';
import { useColumnResize } from '@/components/shared/useColumnResize';
import { MasterListHeader } from '../shared/MasterListHeader';
import { MasterPaginationBar } from '../shared/MasterPaginationBar';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { ActionTip, TruncatedText } from '../shared/TruncatedCellTip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';
import { LoadErrorState } from '@/components/ui/LoadErrorState';
import { toMasterNewPath, toMasterEditPath } from '../shared/masterRoutes';
import { BusinessEntityShareMenu } from './BusinessEntityShareMenu';
import { useInView } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { RowDeleteIcon, RowEditIcon } from '@/components/shared/RowIcons';
import { PersonName } from '@/components/ui/PersonHoverCard';
import { userRef } from '@/lib/personDetails';

function AttachmentThumbnail({ attachment, onPreview, className }: { attachment: any; onPreview: (url: string) => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "200px" });
  const [imgData, setImgData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isInView && !imgData && !loading) {
      setLoading(true);
      attachmentService.getImages([attachment.id])
        .then(res => {
          if (res && res.length > 0 && res[0].imageBase64) {
            const base64Str = res[0].imageBase64;
            setImgData(base64Str.startsWith('data:') ? base64Str : `data:${res[0].contentType || 'image/jpeg'};base64,${base64Str}`);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isInView, attachment.id]);

  return (
    <div ref={ref} className={cn("shrink-0 overflow-hidden bg-[var(--tm-muted)] flex items-center justify-center relative group", className || "w-16 h-16 rounded-[8px] border border-[var(--tm-border)]")}>
      {loading ? (
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      ) : imgData ? (
        <>
          <img src={imgData} alt={attachment.fileName || ''} className="w-full h-full object-cover" />
          <div 
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
            onClick={() => onPreview(imgData)}
          >
            <Eye size={16} className="text-white" />
          </div>
        </>
      ) : (
        <ImageIcon size={18} className="text-slate-500" />
      )}
    </div>
  );
}
/* API list payloads are loosely shaped; keep runtime mapping unchanged. */
/* eslint-disable @typescript-eslint/no-explicit-any */

const FORM_NO = 1550;
const TITLE = 'Business Entity';
type CompanyViewMode = 'list' | 'album' | 'contact-list' | 'contact-album' | 'attachment';

/**
 * Default px widths for the desktop tables. In each table one column fills the remaining
 * space (its value here is its minimum); the rest stay fixed until the user resizes them.
 */
const GRID_LIST_WIDTHS = { name: 200, alias: 110, type: 150, address: 200, city: 110, state: 110, country: 110, vatGst: 140, creditLimit: 130, actions: 100 };
const CONTACT_LIST_WIDTHS = { contactName: 180, name: 180, designation: 150, department: 140, phone: 130, email: 200, status: 100, actions: 100 };
const ATTACHMENT_LIST_WIDTHS = { fileName: 220, name: 200, fileType: 110, fileSize: 100, actions: 160 };

const sumWidths = (defaults: Record<string, number>, widthOf: (key: string, fallback: number) => number) =>
  Object.entries(defaults).reduce((sum, [key, fallback]) => sum + widthOf(key, fallback), 0);

/** Trim + lowercase. Empty / whitespace-only → no active search. */
function normalizeSearchQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

function fieldIncludes(value: unknown, query: string): boolean {
  if (value === null || value === undefined) return false;
  return String(value).toLowerCase().includes(query);
}

/** Multi-field match: name, alias, code, geo, contacts, attachments. */
function companyMatchesSearch(item: any, query: string): boolean {
  if (
    fieldIncludes(item.name, query)
    || fieldIncludes(item.aliasName, query)
    || fieldIncludes(item.code, query)
    || fieldIncludes(item.country, query)
    || fieldIncludes(item.state, query)
    || fieldIncludes(item.city, query)
  ) {
    return true;
  }
  if (item.contacts?.some((c: any) =>
    fieldIncludes(c.contactPersonName || c.contactName || c.name, query)
    || fieldIncludes(c.email, query)
    || fieldIncludes(c.phoneNo || c.phone, query)
    || fieldIncludes(c.designation, query)
    || fieldIncludes(c.department, query)
  )) {
    return true;
  }
  if (item.attachments?.some((a: any) =>
    fieldIncludes(a.fileName || a.name, query)
    || fieldIncludes(a.fileType, query)
  )) {
    return true;
  }
  return false;
}

/**
 * Name-primary search priority (lower = better).
 * 1 exact name · 2 partial name · 3 exact alias · 4 partial alias · 5 other
 */
function getCompanySearchPriority(item: any, query: string): number {
  const name = (item.name ?? '').toString().toLowerCase();
  const alias = (item.aliasName ?? '').toString().toLowerCase();

  if (name === query) return 1;
  if (name.includes(query)) return 2;
  if (alias === query) return 3;
  if (alias.includes(query)) return 4;
  return 5;
}

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
  const [isListLoading, setIsListLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pageSize] = useState(20);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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
    const appendMode = params.appendMode || 'replace';
    if (appendMode === 'replace') {
      setLoadError(false);
    }
    try {
      const pSize = params.pageSize || pageSize;
      const targetStartsWith = Object.prototype.hasOwnProperty.call(params, 'startsWith')
        ? params.startsWith
        : currentStartsWith;

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
          const beName = c.businessEntityName ?? '';
          const code = c.code ?? `BE-${beNo}`;
          const status = c.status || 'Active';
          const fName = c.fileName || 'document.pdf';
          const fSize = c.fileSize || 0;
          const fType = c.fileType || '';

          return {
            id: detailNo.toString(),
            code: code.trim(),
            name: beName.trim(),
            aliasName: (c.aliasName || c.businessEntityAlias || c.AliasName || '').toString().trim(),
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
          const contactName = c.contactPersonName ?? '';
          const email = c.email ?? '';
          const department = c.department ?? '';
          const designation = c.designation ?? '';
          const beName = c.businessEntityName ?? '';
          const code = c.code ?? `BE-${beNo}`;
          const cityName = c.cityName ?? '';
          const stateName = c.stateName ?? '';
          const countryName = c.countryName ?? '';
          const status = c.status || 'Active';
          const phone = c.phoneNo || c.phone || '';

          return {
            id: detailNo.toString(),
            code: code.trim(),
            name: beName.trim(),
            aliasName: (c.aliasName || c.businessEntityAlias || c.AliasName || '').toString().trim(),
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
        const userLoginNo = c.createdBy?.loginNo ?? c.createdBy?.id ?? null;
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
          aliasName: (c.aliasName || c.businessEntityAlias || c.AliasName || '').toString().trim(),
          crmBusinessEntityTypeNo: typeNo ? parseInt(typeNo) : 0,
          type: typeName,
          address: addr, city: cityName, state: stateName, country: countryName, pinCode: pin,
          vatGst: vat, creditLimit: limit, status: c.status || 'Active',
          locations,
          contacts: c.contactPersons || c.contacts || [],
          ports: c.ports || [],
          attachments: c.attachments || c.attachment || [],
          createdBy: user, createdByLoginNo: userLoginNo, createdDate: date
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
        setLoadError(true);
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
        toast.error('Failed to load more business entities');
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
        toast.error('Failed to load previous business entities');
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
    setIsListLoading(true);
    setLoadError(false);
    void fetchCompanies({ appendMode: 'replace', startsWith: '' }).finally(() => {
      setIsListLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyViewMode, companyNo]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  // Normalize → Filter → Rank → stable secondary order (original API index)
  const filteredList = useMemo(() => {
    const query = normalizeSearchQuery(searchQuery);
    if (!query) return apiCompanies;

    const matched: { item: any; priority: number; index: number }[] = [];
    for (let index = 0; index < apiCompanies.length; index++) {
      const item = apiCompanies[index];
      if (!companyMatchesSearch(item, query)) continue;
      matched.push({
        item,
        priority: getCompanySearchPriority(item, query),
        index,
      });
    }

    matched.sort((a, b) => a.priority - b.priority || a.index - b.index);
    return matched.map((entry) => entry.item);
  }, [apiCompanies, searchQuery]);

  const getCompanySortValue = useCallback((row: any, key: string) => {
    switch (key) {
      case 'code': return row.code ?? '';
      case 'name': return row.name ?? '';
      case 'alias': return row.aliasName ?? '';
      case 'type': return row.type ?? '';
      case 'address': return row.address ?? '';
      case 'city': return row.city ?? '';
      case 'state': return row.state ?? '';
      case 'country': return row.country ?? '';
      case 'vatGst': return row.vatGst ?? '';
      case 'creditLimit': return typeof row.creditLimit === 'number' ? row.creditLimit : Number(row.creditLimit) || 0;
      case 'contactName': return row.contacts?.[0]?.contactPersonName || row.contacts?.[0]?.contactName || row.contacts?.[0]?.name || '';
      case 'designation': return row.contacts?.[0]?.designation || '';
      case 'department': return row.contacts?.[0]?.department || '';
      case 'phone': return row.contacts?.[0]?.phoneNo || row.contacts?.[0]?.phone || '';
      case 'email': return row.contacts?.[0]?.email || '';
      case 'status': return row.contacts?.[0]?.status || row.status || '';
      case 'fileName': return row.attachments?.[0]?.fileName || row.attachments?.[0]?.name || '';
      case 'fileSize': return Number(row.attachments?.[0]?.fileSize) || 0;
      case 'fileType': return row.attachments?.[0]?.fileType || '';
      default: return (row as Record<string, unknown>)[key] ?? '';
    }
  }, []);

  const {
    sortCol,
    sortDesc,
    handleSort,
    pageRows: paginatedList,
    totalItems,
    totalPages,
    safePage: safeCurrentPage,
    startIndex,
    endIndex,
  } = usePagedTableSort(filteredList, getCompanySortValue, {
    defaultKey: null,
    defaultDesc: false,
    page: currentPage,
    pageSize: itemsPerPage,
  });

  const gridResize = useColumnResize();
  const contactResize = useColumnResize();
  const attachmentResize = useColumnResize();

  const groupedCompanies = useMemo(() => {
    // Album view: letter-group the current page rows (name order for grouping only).
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
      toast.success('Business entity deleted');
      fetchCompanies();
    }).catch(err => {
      console.error('Failed to delete company via API:', err);
      toast.error('Failed to delete business entity');
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
        count={totalItems}
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
                'px-2.5 h-8 rounded-[6px] text-xs font-semibold transition-colors flex items-center gap-1.5',
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
        {isListLoading && apiCompanies.length === 0 ? (
          <div className="flex flex-col min-h-0 max-h-full w-full rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
            <SkeletonTable rows={10} columns={[10, 30, 16, 16, 12, 8]} label="Loading business entities" />
          </div>
        ) : loadError && apiCompanies.length === 0 ? (
          <div className="flex flex-col min-h-0 max-h-full w-full rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
            <LoadErrorState
              title="Failed to load business entities"
              description="Could not load this list. Retry runs the same search again."
              onRetry={() => {
                setIsListLoading(true);
                setLoadError(false);
                void fetchCompanies({ appendMode: 'replace', startsWith: currentStartsWith || '' }).finally(() => {
                  setIsListLoading(false);
                });
              }}
            />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex flex-col min-h-0 max-h-full w-full rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-hidden">
            <EmptyState
              icon={Layers}
              title={searchQuery.trim() ? 'No results match your search' : 'No Companies Found'}
              description={
                searchQuery.trim()
                  ? 'Try a different search term or clear the search to see all business entities.'
                  : 'No companies match your criteria. Try adjusting filters or click the Add button above to create a new one.'
              }
              actions={
                searchQuery.trim() ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-[8px] text-xs font-semibold border-[var(--tm-border)]"
                    onClick={() => handleSearchChange('')}
                  >
                    Clear search
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="crm-list-page crm-bleed-x crm-bleed-b flex-1 min-h-0 flex flex-col overflow-hidden relative">
            <div className="crm-pad-x pb-2 flex items-center justify-between shrink-0">
              <span className="text-[12px] font-semibold text-slate-500">Total {totalItems} Records</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportBusinessEntityReportToExcel(filteredList, companyViewMode, 'Business_Entity_Report.csv')}
                className="h-8 px-3 text-[12px] font-semibold gap-1.5 rounded-[7px] border-[var(--tm-border)] bg-[var(--tm-surface)] text-slate-500 hover:bg-[var(--tm-muted)]"
              >
                <Download size={13} />
                Export CSV
              </Button>
            </div>
            <div className="crm-pad-x flex-1 min-h-0 flex overflow-hidden">
              <div
                className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin min-h-0 min-w-0 relative z-0"
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
                  <>
                    <div className="md:hidden flex flex-col gap-2 p-2">
                      {paginatedList.map((company: any) => {
                        const locStr = [company.city, company.state, company.country].filter(Boolean).join(', ') || '';
                        const typeStr = company.type || '';
                        return (
                          <div
                            key={company.id}
                            className="rounded-xl border border-[var(--tm-border)]/80 bg-[var(--tm-elevated)]/50 px-3 py-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                className={cn(
                                  'min-w-0 flex-1 text-left',
                                  isUpdate && 'cursor-pointer'
                                )}
                                onClick={() => isUpdate && handleEditClick(company)}
                              >
                                <TruncatedText
                                  text={company.code || ''}
                                  className="font-semibold text-[#0EA5E9] tabular-nums"
                                />
                                <TruncatedText
                                  text={company.name || ''}
                                  className="mt-0.5 text-sm font-semibold text-slate-100"
                                />
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-400">
                                  {typeStr ? (
                                    <span
                                      className={cn(
                                        'inline-flex px-1.5 py-0.5 rounded-[5px] text-[9px] font-semibold border',
                                        typeStr === 'Buy'
                                          ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                      )}
                                    >
                                      {typeStr}
                                    </span>
                                  ) : null}
                                  {company.aliasName ? (
                                    <span className="min-w-0 truncate">Alias: {company.aliasName}</span>
                                  ) : null}
                                  <span className="min-w-0 truncate">{locStr}</span>
                                </div>
                              </button>
                              <div className="flex shrink-0 items-center gap-0.5">
                                {isUpdate ? (
                                  <ActionTip label="Edit">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Edit"
                                      onClick={() => handleEditClick(company)}
                                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]"
                                    >
                                      <Edit size={14} />
                                    </Button>
                                  </ActionTip>
                                ) : null}
                                {isDelete ? (
                                  <ActionTip label="Delete">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      aria-label="Delete"
                                      onClick={() =>
                                        handleDeleteClick(
                                          company.id,
                                          company.name || company.businessEntityName || company.code
                                        )
                                      }
                                      className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                    >
                                      <Trash2 size={14} />
                                    </Button>
                                  </ActionTip>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <table
                      className="tm-data-table hidden md:table w-full table-fixed border-collapse text-left"
                      style={{ minWidth: `calc(var(--tm-col-id-width) + ${sumWidths(GRID_LIST_WIDTHS, gridResize.widthOf)}px)` }}
                    >
                      <colgroup>
                        <col className="tm-col-id-col" style={{ width: 'var(--tm-col-id-width)' }} />
                        {/* Name fills the remaining space */}
                        <col />
                        {(['alias', 'type', 'address', 'city', 'state', 'country', 'vatGst', 'creditLimit'] as const).map((key) => (
                          <col key={key} style={{ width: gridResize.widthOf(key, GRID_LIST_WIDTHS[key]) }} />
                        ))}
                        <col style={{ width: GRID_LIST_WIDTHS.actions }} />
                      </colgroup>
                      <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-slate-300 font-semibold uppercase tracking-wide">
                        <tr>
                          <th className="tm-col-id tm-col-sticky-code sticky left-0 z-[45] px-2 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.28)] cursor-pointer" {...sortHeaderCellProps('code', handleSort)}>
                            <SortableHeader label="Code" sortKey="code" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} className="pr-1" />
                          </th>
                          <th className="relative min-w-[140px] px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('name', handleSort)}>
                            <SortableHeader label="Business Entity Name" sortKey="name" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                            {gridResize.resizeHandle('name')}
                          </th>
                          <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('alias', handleSort)}>
                            <SortableHeader label="Alias" sortKey="alias" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                            {gridResize.resizeHandle('alias')}
                          </th>
                          <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('type', handleSort)}>
                            <SortableHeader label="Type" sortKey="type" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                            {gridResize.resizeHandle('type')}
                          </th>
                          <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('address', handleSort)}>
                            <SortableHeader label="Primary Address" sortKey="address" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                            {gridResize.resizeHandle('address')}
                          </th>
                          <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('city', handleSort)}>
                            <SortableHeader label="City" sortKey="city" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                            {gridResize.resizeHandle('city')}
                          </th>
                          <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('state', handleSort)}>
                            <SortableHeader label="State" sortKey="state" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                            {gridResize.resizeHandle('state')}
                          </th>
                          <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('country', handleSort)}>
                            <SortableHeader label="Country" sortKey="country" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                            {gridResize.resizeHandle('country')}
                          </th>
                          <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('vatGst', handleSort)}>
                            <SortableHeader label="VAT/GST No." sortKey="vatGst" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                            {gridResize.resizeHandle('vatGst')}
                          </th>
                          <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('creditLimit', handleSort)}>
                            <SortableHeader label="Credit Limit" sortKey="creditLimit" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                            {gridResize.resizeHandle('creditLimit')}
                          </th>
                          <th className="tm-col-actions sticky right-0 z-40 w-[100px] px-1 py-2.5 pr-2 text-center font-semibold tracking-wide text-slate-300 whitespace-nowrap border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.35)]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedList.map((company: any) => {
                          const locStr = [company.address, company.city, company.state, company.country].filter(Boolean).join(', ') || '';
                          const creditStr = company.creditLimit ? `$${company.creditLimit.toLocaleString()}` : '';
                          const cityStr = company.city || '';
                          const stateStr = company.state || '';
                          const countryStr = company.country || '';
                          const vatStr = company.vatGst || '';
                          const typeStr = company.type || '';
                          const nameStr = company.name || '';
                          return (
                            <tr key={company.id} className="border-b border-[var(--tm-border)] last:border-b-0 hover:bg-[var(--tm-elevated)]/70 transition-colors group">
                              <td className="tm-col-id tm-col-sticky-code sticky left-0 z-20 px-2 py-2.5 align-middle min-w-0 overflow-hidden border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.18)]">
                                <TruncatedText
                                  text={company.code || ''}
                                  className="text-[11px] font-medium text-[#0EA5E9] tabular-nums"
                                />
                              </td>
                              <td
                                className={cn(
                                  'tm-col-primary px-3 py-2.5 border-r border-[var(--tm-border)] font-medium text-slate-50 align-middle min-w-0',
                                  isUpdate && 'hover:text-[#0EA5E9] cursor-pointer'
                                )}
                                onClick={() => isUpdate && handleEditClick(company)}
                              >
                                <TruncatedText text={nameStr} className="font-medium text-slate-50" />
                              </td>
                              <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                                <TruncatedText text={company.aliasName || ''} className="text-slate-300" />
                              </td>
                              <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                                {typeStr ? (
                                  <span
                                    className={cn(
                                      'inline-flex max-w-full truncate px-2 py-0.5 rounded-[6px] text-[9px] font-semibold border leading-none',
                                      typeStr === 'Buy'
                                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    )}
                                    title={typeStr}
                                  >
                                    {typeStr}
                                  </span>
                                ) : (
                                  null
                                )}
                              </td>
                              <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                                <TruncatedText text={locStr} className="text-slate-300" />
                              </td>
                              <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                                <TruncatedText text={cityStr} className="text-slate-300" />
                              </td>
                              <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                                <TruncatedText text={stateStr} className="text-slate-300" />
                              </td>
                              <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                                <TruncatedText text={countryStr} className="text-slate-300" />
                              </td>
                              <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 font-mono align-middle min-w-0">
                                <TruncatedText text={vatStr} className="text-slate-300 font-mono" />
                              </td>
                              <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                                <TruncatedText text={creditStr} className="text-slate-300" />
                              </td>
                              <td className="tm-col-actions sticky right-0 z-10 px-1 py-2.5 pr-2 text-center align-middle whitespace-nowrap border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                <div className="inline-flex items-center justify-center gap-0.5">
                                  {isUpdate ? (
                                    <ActionTip label="Edit">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Edit"
                                        onClick={() => handleEditClick(company)}
                                        className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]"
                                      >
                                        <RowEditIcon />
                                      </Button>
                                    </ActionTip>
                                  ) : null}
                                  {isDelete ? (
                                    <ActionTip label="Delete">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Delete"
                                        onClick={() => handleDeleteClick(company.id, company.name || company.businessEntityName || company.code)}
                                        className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                      >
                                        <RowDeleteIcon />
                                      </Button>
                                    </ActionTip>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                ) : companyViewMode === 'album' ? (
                  <div className="space-y-5 p-3">
                    {groupedCompanies.map((group) => (
                      <div key={group.letter} id={`company-group-${group.letter}`} className="space-y-3 relative scroll-mt-2">
                        <div className="sticky top-0 z-10 py-1.5 px-3 bg-[var(--tm-tint)] rounded-[8px] text-xs font-semibold text-[#0EA5E9] flex items-center justify-between">
                          <span>Alphabet {group.letter}</span>
                          <span className="font-medium opacity-70">{group.items.length} Entities</span>
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
                                    <TruncatedText text={company.name || ''} className="text-[11px] font-semibold text-slate-50 leading-tight group-hover:text-[#0EA5E9] transition-colors" />
                                    <div className="flex items-center gap-1 mt-1 flex-wrap min-w-0">
                                      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-[6px] bg-[var(--tm-elevated)] text-slate-300 border border-[var(--tm-border)]/80">{company.code}</span>
                                      <div className={cn(
                                        "min-w-0 max-w-full text-[8px] font-semibold px-1.5 py-0.5 rounded-[6px] border leading-snug",
                                        company.type === 'Buy' ? "bg-sky-500/15 text-sky-400 border-sky-500/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                      )}>
                                        <TruncatedText text={company.type || ''} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  {isUpdate && (
                                    <ActionTip label="Edit">
                                      <Button variant="ghost" size="icon" aria-label="Edit" onClick={() => handleEditClick(company)} className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]">
                                        <Edit size={11} />
                                      </Button>
                                    </ActionTip>
                                  )}
                                  {isDelete && (
                                    <ActionTip label="Delete">
                                      <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => handleDeleteClick(company.id, company.name || company.businessEntityName || company.code)} className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                                        <Trash2 size={11} />
                                      </Button>
                                    </ActionTip>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 py-1.5 border-t border-b border-[var(--tm-border)] font-medium text-slate-500">
                                <div className="col-span-2 min-w-0">
                                  <span className="text-[8px] font-semibold text-[#0EA5E9] block mb-0.5">Primary Location</span>
                                  <TruncatedText text={company.address || ''} className="text-slate-100 font-medium leading-snug" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[8px] font-semibold text-slate-400 block mb-0.5">City & PIN Code</span>
                                  <TruncatedText text={[company.city, company.pinCode].filter(Boolean).join(' - ') || ''} className="text-slate-200 font-medium" />
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[8px] font-semibold text-slate-400 block mb-0.5">State & Country</span>
                                  <TruncatedText text={[company.state, company.country].filter(Boolean).join(', ') || ''} className="text-slate-200 font-medium" />
                                </div>
                                <div className="col-span-2 min-w-0">
                                  <span className="text-[8px] font-semibold text-slate-400 block mb-0.5">Credit limit & GST</span>
                                  <TruncatedText
                                    text={[company.creditLimit ? `$${company.creditLimit.toLocaleString()}` : '', company.vatGst ? `GST: ${company.vatGst}` : ''].filter(Boolean).join(' | ')}
                                    className="text-slate-200 font-medium"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[9px] font-medium text-slate-400 pt-0.5 mt-auto">
                                <span className="flex items-center gap-1 min-w-0">
                                  <User size={10} className="text-slate-400 shrink-0" />
                                  <span className="shrink-0">Created By:</span>
                                  <div className="min-w-0 flex-1 overflow-hidden">
                                    {company.createdBy && userRef(company.createdByLoginNo) ? (
                                      <PersonName
                                        person={userRef(company.createdByLoginNo)}
                                        name={company.createdBy}
                                        className="block text-slate-300 font-semibold"
                                      />
                                    ) : (
                                      <TruncatedText
                                        text={company.createdBy || company.displayName || company.userName || 'System'}
                                        className="text-slate-300 font-semibold"
                                      />
                                    )}
                                  </div>
                                </span>
                                <span className="text-[8px] text-slate-400 font-semibold shrink-0">
                                  {company.createdDate ? formatUtcDateTime(company.createdDate) : ''}
                                </span>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : companyViewMode === 'contact-list' ? (
                  <table
                    className="tm-data-table w-full table-fixed border-collapse text-left"
                    style={{ minWidth: sumWidths(CONTACT_LIST_WIDTHS, contactResize.widthOf) }}
                  >
                    <colgroup>
                      <col style={{ width: contactResize.widthOf('contactName', CONTACT_LIST_WIDTHS.contactName) }} />
                      {/* Business Entity fills the remaining space */}
                      <col />
                      {(['designation', 'department', 'phone', 'email', 'status'] as const).map((key) => (
                        <col key={key} style={{ width: contactResize.widthOf(key, CONTACT_LIST_WIDTHS[key]) }} />
                      ))}
                      <col style={{ width: CONTACT_LIST_WIDTHS.actions }} />
                    </colgroup>
                    <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-slate-300 font-semibold uppercase tracking-wide">
                      <tr>
                        <th className="tm-col-sticky-code sticky left-0 z-[45] px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.28)] cursor-pointer" {...sortHeaderCellProps('contactName', handleSort)}>
                          <SortableHeader label="Contact Name" sortKey="contactName" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {contactResize.resizeHandle('contactName')}
                        </th>
                        <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('name', handleSort)}>
                          <SortableHeader label="Business Entity" sortKey="name" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {contactResize.resizeHandle('name')}
                        </th>
                        <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('designation', handleSort)}>
                          <SortableHeader label="Designation" sortKey="designation" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {contactResize.resizeHandle('designation')}
                        </th>
                        <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('department', handleSort)}>
                          <SortableHeader label="Department" sortKey="department" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {contactResize.resizeHandle('department')}
                        </th>
                        <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('phone', handleSort)}>
                          <SortableHeader label="Phone" sortKey="phone" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {contactResize.resizeHandle('phone')}
                        </th>
                        <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('email', handleSort)}>
                          <SortableHeader label="Email" sortKey="email" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {contactResize.resizeHandle('email')}
                        </th>
                        <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('status', handleSort)}>
                          <SortableHeader label="Status" sortKey="status" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {contactResize.resizeHandle('status')}
                        </th>
                        <th className="tm-col-actions sticky right-0 z-40 w-[100px] px-1 py-2.5 pr-2 text-center font-semibold tracking-wide text-slate-300 whitespace-nowrap border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.35)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedList.map((company: any) => {
                        const contact = company.contacts?.[0] || {};
                        const contactName = contact.contactPersonName || contact.contactName || contact.name || '';
                        const phoneStr = contact.phoneNo || contact.phone || '';
                        const emailStr = contact.email || '';
                        const designationStr = contact.designation || '';
                        const departmentStr = contact.department || '';
                        const statusStr = contact.status || company.status || 'Active';
                        return (
                          <tr key={company.id} className="border-b border-[var(--tm-border)] last:border-b-0 hover:bg-[var(--tm-elevated)]/70 transition-colors">
                            <td className="tm-col-sticky-code tm-col-primary sticky left-0 z-20 px-3 py-2.5 align-middle min-w-0 overflow-hidden border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.18)]">
                              <TruncatedText text={contactName} className="font-medium text-slate-50" />
                            </td>
                            <td
                              className={cn('px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0', isUpdate && 'cursor-pointer')}
                              onClick={() => isUpdate && handleEditClick(company)}
                            >
                              <TruncatedText
                                text={company.name || ''}
                                className={cn('text-slate-300', isUpdate && 'hover:text-[#0EA5E9]')}
                              />
                            </td>
                            <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                              <TruncatedText text={designationStr} className="text-slate-300" />
                            </td>
                            <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                              <TruncatedText text={departmentStr} className="text-slate-300" />
                            </td>
                            <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                              <TruncatedText text={phoneStr} className="text-slate-300 font-mono" />
                            </td>
                            <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                              <TruncatedText text={emailStr} className="text-slate-300" />
                            </td>
                            <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle whitespace-nowrap">
                              <span className={cn(
                                'inline-flex px-2 py-0.5 rounded-[6px] text-[8px] font-semibold',
                                statusStr === 'Active' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-[var(--tm-muted)] text-slate-500 border border-[var(--tm-border)]'
                              )}>
                                {statusStr}
                              </span>
                            </td>
                            <td className="tm-col-actions sticky right-0 z-10 px-1 py-2.5 pr-2 text-center align-middle whitespace-nowrap border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                              <div className="inline-flex items-center justify-center gap-0.5">
                                <BusinessEntityShareMenu
                                  mode="contact"
                                  contact={{
                                    companyName: company.name,
                                    companyCode: company.code,
                                    name: contactName,
                                    designation: contact.designation,
                                    department: contact.department,
                                    phone: contact.phoneNo || contact.phone,
                                    email: contact.email,
                                  }}
                                />
                                {isUpdate ? (
                                  <ActionTip label="Edit">
                                    <Button type="button" variant="ghost" size="icon" aria-label="Edit" onClick={() => handleEditClick(company)} className="h-7 w-7 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)]">
                                      <RowEditIcon />
                                    </Button>
                                  </ActionTip>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : companyViewMode === 'contact-album' ? (
                  <div className="space-y-5 p-3">
                    {groupedCompanies.map((group) => {
                      const hasContacts = group.items.some(c => c.contacts && c.contacts.length > 0);
                      if (!hasContacts) return null;

                      return (
                        <div key={group.letter} id={`company-group-${group.letter}`} className="space-y-3 relative scroll-mt-2">
                          <div className="sticky top-0 z-10 py-1.5 px-3 bg-[var(--tm-tint)] rounded-[8px] text-xs font-semibold text-[#0EA5E9] flex items-center justify-between">
                            <span>Alphabet {group.letter}</span>
                            <span className="font-medium opacity-70">Contact Cards</span>
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

                                    <div className="border-t border-[var(--tm-border)] pt-2 font-medium text-slate-500 space-y-1">
                                      <div className="flex justify-between">
                                        <span className={cn('text-slate-50 font-semibold', isUpdate && 'hover:text-[#0EA5E9] cursor-pointer')} onClick={() => isUpdate && handleEditClick(company)}>{company.name}</span>
                                      </div>
                                      <div className="flex justify-between gap-2">
                                        <span className="text-slate-400">Phone:</span>
                                        <span className="text-slate-200 font-mono">{contact.phoneNo || contact.phone || ''}</span>
                                      </div>
                                      <div className="flex justify-between gap-2 min-w-0">
                                        <span className="text-slate-400 shrink-0">Email:</span>
                                        <div className="min-w-0 max-w-[150px] overflow-hidden">
                                          <TruncatedText text={contact.email || ''} className="text-slate-200 text-right" />
                                        </div>
                                      </div>
                                    </div>

                                    <div className="pt-2 mt-auto flex items-center justify-between border-t border-[var(--tm-border)]">
                                      <span className="text-[9px] text-slate-400 font-medium">Code: {company.code}</span>
                                      <div className="flex items-center gap-0.5">
                                        <BusinessEntityShareMenu
                                          mode="contact"
                                          contact={{
                                            companyName: company.name,
                                            companyCode: company.code,
                                            name: cName,
                                            designation: contact.designation,
                                            department: contact.department,
                                            phone: contact.phoneNo || contact.phone,
                                            email: contact.email,
                                          }}
                                        />
                                        {isUpdate && (
                                          <Button variant="ghost" size="sm" onClick={() => handleEditClick(company)} className="h-7 rounded-[6px] text-slate-500 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)] font-semibold gap-1">
                                            <Edit size={11} />
                                            Edit
                                          </Button>
                                        )}
                                      </div>
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
                ) : companyViewMode === 'attachment' ? (
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
                                      const isImg = (att.fileName || att.name || '').toLowerCase().match(/\.(jpeg|jpg|png|gif|webp)$/);

                                      if (isImg) {
                                        return (
                                          <Card key={idx} className="bg-[var(--tm-surface)] rounded-[8px] border border-[var(--tm-border)]/70 overflow-hidden hover:shadow-md hover:border-[#0EA5E9]/30 transition-all group relative h-48">
                                            <AttachmentThumbnail attachment={att} onPreview={setPreviewImage} className="absolute inset-0 w-full h-full" />
                                            <div className="absolute bottom-2 right-2 p-2.5 rounded-[8px] bg-black/50 backdrop-blur-md border border-white/20 flex flex-col items-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto z-10">
                                              <div className="text-right">
                                                <h5 className="text-[11px] font-semibold text-white truncate max-w-[150px]">{att.fileName || att.name}</h5>
                                                <p className="text-[9px] text-white/80 font-mono mt-0.5">
                                                  {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Image'} {att.fileType || ''}
                                                </p>
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => attachmentService.downloadAttachment(att.id, att.fileName || att.name)}
                                                className="h-6 px-2 mt-0.5 rounded-[4px] text-[9px] font-semibold text-white bg-white/10 hover:bg-white/25 border border-white/10"
                                              >
                                                <Download size={10} className="mr-1" /> Download
                                              </Button>
                                            </div>
                                          </Card>
                                        );
                                      }

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
                ) : (
                  <table
                    className="tm-data-table w-full table-fixed border-collapse text-left"
                    style={{ minWidth: `calc(var(--tm-col-id-width) + ${sumWidths(ATTACHMENT_LIST_WIDTHS, attachmentResize.widthOf)}px)` }}
                  >
                    <colgroup>
                      {/* File name fills the remaining space */}
                      <col />
                      <col style={{ width: attachmentResize.widthOf('name', ATTACHMENT_LIST_WIDTHS.name) }} />
                      <col style={{ width: 'var(--tm-col-id-width)' }} />
                      {(['fileType', 'fileSize'] as const).map((key) => (
                        <col key={key} style={{ width: attachmentResize.widthOf(key, ATTACHMENT_LIST_WIDTHS[key]) }} />
                      ))}
                      <col style={{ width: ATTACHMENT_LIST_WIDTHS.actions }} />
                    </colgroup>
                    <thead className="sticky top-0 z-30 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-slate-300 font-semibold uppercase tracking-wide">
                      <tr>
                        <th className="tm-col-sticky-code sticky left-0 z-[45] px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.28)] cursor-pointer" {...sortHeaderCellProps('fileName', handleSort)}>
                          <SortableHeader label="File Name" sortKey="fileName" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {attachmentResize.resizeHandle('fileName')}
                        </th>
                        <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('name', handleSort)}>
                          <SortableHeader label="Business Entity" sortKey="name" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {attachmentResize.resizeHandle('name')}
                        </th>
                        <th className="tm-col-code px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('code', handleSort)}>
                          <SortableHeader label="Code" sortKey="code" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                        </th>
                        <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('fileType', handleSort)}>
                          <SortableHeader label="Type" sortKey="fileType" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {attachmentResize.resizeHandle('fileType')}
                        </th>
                        <th className="relative px-3 py-2.5 font-semibold uppercase tracking-wide text-slate-300 whitespace-nowrap border-r border-[var(--tm-border)] cursor-pointer" {...sortHeaderCellProps('fileSize', handleSort)}>
                          <SortableHeader label="Size" sortKey="fileSize" sortCol={sortCol} sortDesc={sortDesc} onSort={handleSort} />
                          {attachmentResize.resizeHandle('fileSize')}
                        </th>
                        <th className="tm-col-actions sticky right-0 z-40 w-[160px] px-1 py-2.5 pr-2 text-center font-semibold tracking-wide text-slate-300 whitespace-nowrap border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.35)]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedList.map((company: any) => {
                        const att = company.attachments?.[0] || {};
                        const fileName = att.fileName || att.name || '';
                        const fileType = att.fileType || '';
                        const sizeStr = att.fileSize ? `${(Number(att.fileSize) / 1024).toFixed(1)} KB` : '';
                        return (
                          <tr key={company.id} className="border-b border-[var(--tm-border)] last:border-b-0 hover:bg-[var(--tm-elevated)]/70 transition-colors group">
                            <td className="tm-col-sticky-code tm-col-primary sticky left-0 z-20 px-3 py-2.5 align-middle min-w-0 overflow-hidden border-r border-[var(--tm-border)] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.18)]">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={14} className="shrink-0 text-slate-400" />
                                <TruncatedText
                                  text={fileName}
                                  className="font-medium text-slate-50 group-hover:text-[#0EA5E9] transition-colors"
                                />
                              </div>
                            </td>
                            <td
                              className={cn('px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0', isUpdate && 'cursor-pointer')}
                              onClick={() => isUpdate && handleEditClick(company)}
                            >
                              <TruncatedText
                                text={company.name || ''}
                                className={cn('text-slate-300', isUpdate && 'hover:text-[#0EA5E9]')}
                              />
                            </td>
                            <td className="tm-col-code px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                              <TruncatedText text={company.code || ''} className="text-[11px] font-medium text-[#0EA5E9] tabular-nums" />
                            </td>
                            <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                              <TruncatedText text={fileType} className="text-slate-300" />
                            </td>
                            <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300 align-middle min-w-0">
                              <TruncatedText text={sizeStr} className="text-slate-300 font-mono" />
                            </td>
                            <td className="tm-col-actions sticky right-0 z-10 px-1 py-2.5 pr-2 text-center align-middle whitespace-nowrap border-l border-[var(--tm-border)] shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                              <div className="inline-flex items-center justify-center gap-1">
                                {att.id ? (
                                  <BusinessEntityShareMenu
                                    mode="attachment"
                                    attachmentId={att.id}
                                    fileName={fileName || 'document'}
                                    companyName={company.name}
                                    iconOnly={false}
                                  />
                                ) : null}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => attachmentService.downloadAttachment(att.id, att.fileName || att.name)}
                                  className="h-7 px-2.5 rounded-[6px] text-[9px] font-semibold text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30"
                                >
                                  Download
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <aside
                aria-label="Jump to letter"
                className="shrink-0 w-10 self-stretch border-l border-[var(--tm-border)] bg-[var(--tm-elevated)] z-20 relative flex flex-col items-stretch justify-evenly py-2 px-0.5 select-none overflow-hidden shadow-[-6px_0_12px_-8px_rgba(0,0,0,0.35)]"
              >
                {'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map((char) => {
                  const hasItems = apiAlphabets.includes(char) || apiAlphabets.includes(char.toLowerCase());
                  const isSelected = currentStartsWith === char;
                  return (
                    <button
                      key={char}
                      type="button"
                      disabled={!hasItems}
                      onClick={() => handleAlphabetClick(char)}
                      title={hasItems ? `Jump to ${char}` : undefined}
                      className={cn(
                        'flex-1 min-h-0 w-full max-h-5 text-[8px] font-semibold rounded-[4px] flex items-center justify-center leading-none transition-colors',
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
              </aside>
            </div>
            <div className="mt-3 shrink-0">{paginationBar}</div>
          </div>
        )}
      </div>

      <MasterDeleteDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        recordName={deleteTargetLabel}
        entityLabel="business entity"
      />

      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl bg-transparent border-none p-0 shadow-none [&>button]:text-white [&>button]:bg-black/50 [&>button]:hover:bg-black/80 [&>button]:rounded-full [&>button]:p-2 [&>button]:w-8 [&>button]:h-8 [&>button]:-right-4 [&>button]:-top-4 overflow-visible">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImage && (
            <img src={previewImage} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain rounded-[8px]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
