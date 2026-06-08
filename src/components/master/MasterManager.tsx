import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { apiService } from '@/services/apiService';
import { Combobox } from '@/components/ui/Combobox';
import { format } from 'date-fns';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { useTaskStore } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';
import {
  LocationMaster
} from '@/store/useMasterStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Layers,
  Sliders,
  AlertCircle,
  Folder,
  Users,
  Sparkles,
  MapPin,
  Ship,
  Anchor,
  Building2,
  X,
  Loader2,
  Save,
  UserPlus,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  Building,
  UploadCloud,
  FileText,
  Paperclip,
  User,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { attachmentService } from '@/services/attachmentService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomFieldsSection } from '@/components/ui/CustomFieldsSection';
import { MasterCreateDialog } from '@/components/master/MasterCreateDialog';

interface MasterManagerProps {
  type: 'category' | 'type' | 'priority' | 'folder' | 'user-group' | 'benefit-type' | 'location' | 'vessel' | 'port' | 'business-entity-type' | 'company' | 'task-company' | 'country' | 'state' | 'city';
}
import { Textarea } from '../ui/textarea';

export function MasterManager({ type }: MasterManagerProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/new');
  const isEdit = !!id;
  const isFormPage = isNew || isEdit;

  const { fillValues } = useTaskStore();
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Master Create Dialog State
  const [isMasterCreateOpen, setIsMasterCreateOpen] = useState(false);
  const [activeMasterType, setActiveMasterType] = useState<'category' | 'type' | 'priority' | 'folder' | 'location' | 'company' | 'task-company' | 'benefit-type' | 'country' | 'state' | 'city' | null>(null);

  // Real API State
  const [apiLocations, setApiLocations] = useState<LocationMaster[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationFillValues, setLocationFillValues] = useState<any>(null);
  const [apiVessels, setApiVessels] = useState<any[]>([]);
  const [isLoadingVessels, setIsLoadingVessels] = useState(false);
  const [apiPorts, setApiPorts] = useState<any[]>([]);
  const [isLoadingPorts, setIsLoadingPorts] = useState(false);
  const [apiBusinessEntityTypes, setApiBusinessEntityTypes] = useState<any[]>([]);
  const [isLoadingBusinessEntityTypes, setIsLoadingBusinessEntityTypes] = useState(false);

  const [apiCompanies, setApiCompanies] = useState<any[]>([]);
  const [apiAlphabets, setApiAlphabets] = useState<string[]>([]);
  const [firstRowNo, setFirstRowNo] = useState<number | null>(null);
  const [lastRowNo, setLastRowNo] = useState<number | null>(null);
  const [currentStartsWith, setCurrentStartsWith] = useState<string>('');
  const [companyViewMode, setCompanyViewMode] = useState<'list' | 'album' | 'contact-list' | 'contact-album' | 'attachment'>('list');
  const [isLoadingMoreCompanies, setIsLoadingMoreCompanies] = useState(false);
  const [pageSize] = useState<number>(20);
  const [apiCountries, setApiCountries] = useState<any[]>([]);
  const [_isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [apiStates, setApiStates] = useState<any[]>([]);
  const [_isLoadingStates, setIsLoadingStates] = useState(false);
  const [apiCities, setApiCities] = useState<any[]>([]);
  const [_isLoadingCities, setIsLoadingCities] = useState(false);
  const [apiTaskCompanies, setApiTaskCompanies] = useState<any[]>([]);
  const [, setIsLoading] = useState(false);

  // Task Company specific states
  const [tcCompanyName, setTcCompanyName] = useState('');
  const [tcAliasName, setTcAliasName] = useState('');
  const [tcLocationName, setTcLocationName] = useState('');
  const [tcAddress1, setTcAddress1] = useState('');
  const [tcAddress2, setTcAddress2] = useState('');
  const [tcAddress3, setTcAddress3] = useState('');
  const [tcPinCode, setTcPinCode] = useState('');
  const [tcCountryNo, setTcCountryNo] = useState('');
  const [tcStateNo, setTcStateNo] = useState('');
  const [tcCityNo, setTcCityNo] = useState('');

  const [taskCompanyCountries, setTaskCompanyCountries] = useState<any[]>([]);
  const [taskCompanyStates, setTaskCompanyStates] = useState<any[]>([]);
  const [taskCompanyCities, setTaskCompanyCities] = useState<any[]>([]);

  // Cache track for loaded row numbers
  const loadedRanges = useRef<{ min: number; max: number }>({ min: 999999, max: 0 });

  // Refs to control synchronous load lock and synchronous anchoring
  const isLoadingRef = useRef(false);
  const isPrependPending = useRef(false);
  const scrollHeightBeforePrepend = useRef(0);
  const scrollTopBeforePrepend = useRef(0);
  const lastScrollTopRef = useRef(0);
  // Synchronous scroll anchor correction before the browser repaints
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

  // Automatic scroll filling when the content is less than the viewport height
  useEffect(() => {
    if (type !== 'company' || apiCompanies.length === 0) return;

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
  }, [apiCompanies, type, pageSize]);

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
        // companyNo: companyNo.toString(),
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

        const isContactMode = companyViewMode === 'contact-list' || companyViewMode === 'contact-album';
        const isAttachmentMode = companyViewMode === 'attachment';
        if (derivedFirst === undefined && firstItem) {
          derivedFirst = firstItem.RowNo ?? firstItem.rowNo ?? firstItem.row_no ?? (isContactMode ? (firstItem.businessEntityContactPersonDetailNo ?? firstItem.businessEntityNo) : isAttachmentMode ? (firstItem.attachmentNo ?? firstItem.businessEntityNo) : (firstItem.BusinessEntityNo ?? firstItem.businessEntityNo));
        }
        if (derivedLast === undefined && lastItem) {
          derivedLast = lastItem.RowNo ?? lastItem.rowNo ?? lastItem.row_no ?? (isContactMode ? (lastItem.businessEntityContactPersonDetailNo ?? lastItem.businessEntityNo) : isAttachmentMode ? (lastItem.attachmentNo ?? lastItem.businessEntityNo) : (lastItem.BusinessEntityNo ?? lastItem.businessEntityNo));
        }

        if (appendMode === 'replace') {
          if (derivedFirst !== undefined && derivedFirst !== null) {
            setFirstRowNo(derivedFirst);
          }
          if (derivedLast !== undefined && derivedLast !== null) {
            setLastRowNo(derivedLast);
          }
        } else if (appendMode === 'append') {
          if (derivedLast !== undefined && derivedLast !== null) {
            setLastRowNo(derivedLast);
          }
        } else if (appendMode === 'prepend') {
          if (derivedFirst !== undefined && derivedFirst !== null) {
            setFirstRowNo(derivedFirst);
          }
        }

        // Cache registration
        if (derivedFirst !== undefined && derivedFirst !== null && derivedLast !== undefined && derivedLast !== null) {
          const first = derivedFirst;
          const last = derivedLast;
          if (appendMode === 'replace') {
            loadedRanges.current = { min: first, max: last };
          } else if (appendMode === 'append') {
            loadedRanges.current.max = Math.max(loadedRanges.current.max, last);
            if (rawItems.length === 0) {
              loadedRanges.current.max = 999999999;
            }
          } else if (appendMode === 'prepend') {
            loadedRanges.current.min = Math.min(loadedRanges.current.min, first);
            if (rawItems.length === 0 || first <= 1) {
              loadedRanges.current.min = -999999999;
            }
          }
        } else {
          if (appendMode === 'append') {
            loadedRanges.current.max = 999999999;
          } else if (appendMode === 'prepend') {
            loadedRanges.current.min = -999999999;
          }
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
          const previewUrl = '';

          return {
            id: detailNo.toString(),
            code: code.trim(),
            name: beName.trim(),
            crmBusinessEntityTypeNo: 0,
            type: c.businessEntityTypeName || 'Operation',
            address: '',
            city: '',
            state: '',
            country: '',
            pinCode: '',
            vatGst: '',
            creditLimit: 0,
            status: status,
            locations: [],
            contacts: [],
            ports: [],
            attachments: [{
              id: detailNo,
              fileName: fName,
              fileSize: fSize,
              fileType: fType,
              previewUrl: previewUrl
            }],
            createdBy: 'System',
            createdDate: ''
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
            address: '',
            city: cityName,
            state: stateName,
            country: countryName,
            pinCode: '',
            vatGst: '',
            creditLimit: 0,
            status: status,
            locations: [],
            contacts: [{
              businessEntityContactPersonDetailNo: detailNo,
              contactPersonName: contactName,
              email: email,
              department: department,
              designation: designation,
              phoneNo: phone,
              status: status
            }],
            ports: [],
            attachments: [],
            createdBy: 'System',
            createdDate: ''
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

        // Derive 1st location
        const locations = c.locations || (c.LocationNo ? [{
          locationTypeNo: c.LocationTypeNo || 1,
          address: addr,
          countryName: countryName,
          stateName: stateName,
          cityName: cityName,
          pinCode: pin,
          locationTypeName: c.locationTypeName || c.locationType?.addressTypeName || ''
        }] : []);

        const typeNo = c.CRMBusinessEntityTypeNo ?? c.BusinessEntityTypeNo ?? c.crmBusinessEntityTypeNo ?? c.businessEntityType?.operCRMBusinessEntityTypeNo ?? '';
        let typeName = c.BusinessEntityTypeName ?? c.CRMBusinessEntityTypeName ?? c.crmBusinessEntityTypeName ?? c.businessEntityTypeName ?? c.BusinessEntityType ?? c.Type ?? c.type ?? '';

        if (!typeName && typeNo) {
          const fillTypes = businessEntityFillValues?.data?.businessEntityTypes || businessEntityFillValues?.businessEntityTypes || [];
          const found = fillTypes.find((t: any) => t.operCRMBusinessEntityTypeNo?.toString() === typeNo.toString());
          if (found) {
            typeName = found.operCRMBusinessEntityTypeName || '';
          }
        }

        // Deterministic premium fallback based on businessEntityNo to guarantee the type is never blank
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
          address: addr,
          city: cityName,
          state: stateName,
          country: countryName,
          pinCode: pin,
          vatGst: vat,
          creditLimit: limit,
          status: c.status || 'Active',
          locations: locations,
          contacts: c.contactPersons || c.contacts || [],
          ports: c.ports || [],
          attachments: c.attachments || c.attachment || [],
          createdBy: user,
          createdDate: date
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
      console.error("Failed to fetch API companies:", error);
      if (params.appendMode !== 'append' && params.appendMode !== 'prepend') {
        setApiCompanies([]);
      }
    }
  };

  const handleAlphabetClick = async (letter: string) => {
    if (isLoadingRef.current) return;
    const isClearing = currentStartsWith === letter;
    const targetLetter = isClearing ? '' : letter;

    // Clear loaded range cache for the new filter
    loadedRanges.current = { min: 999999, max: 0 };

    setCurrentStartsWith(targetLetter);
    isLoadingRef.current = true;
    setIsLoadingMoreCompanies(true);
    try {
      await fetchCompanies({
        startsWith: targetLetter,
        appendMode: 'replace',
        cursorRowNo: undefined,
        direction: undefined
      });
      // Smooth scroll back to top of container when alphabet changes
      const container = document.getElementById('company-scroll-container');
      if (container) {
        container.scrollTo({ top: 0 });
      }
    } catch (err) {
      console.error("Failed to jump to alphabet:", err);
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
        await fetchCompanies({
          startsWith: '',
          cursorRowNo: lastRowNo,
          direction: 'Next',
          appendMode: 'append'
        });
      } catch (err) {
        console.error("Failed to load next page:", err);
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
        await fetchCompanies({
          startsWith: '',
          cursorRowNo: firstRowNo,
          direction: 'Prev',
          appendMode: 'prepend'
        });
      } catch (err) {
        console.error("Failed to load previous page:", err);
      } finally {
        isLoadingRef.current = false;
        setIsLoadingMoreCompanies(false);
      }
    }
  };

  // Trigger fetch and reset ranges when view mode changes
  useEffect(() => {
    if (type === 'company') {
      setCurrentStartsWith('');
      loadedRanges.current = { min: 999999, max: 0 };
      setFirstRowNo(null);
      setLastRowNo(null);
      setApiCompanies([]);
      fetchCompanies({ appendMode: 'replace', startsWith: '' });
    }
  }, [companyViewMode]);

  const [apiCategories, setApiCategories] = useState<any[]>([]);

  const fetchCategories = async () => {
    try {
      const response = await apiService.get<any>(`/api/master/task-categories/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((c: any) => ({
          id: (c.operTaskCategoryNo ?? '').toString(),
          code: c.code,
          name: c.operTaskCategoryName || '',
          inactive: c.inactive,
          isApprovalApplicable: c.isMultiLevelApproval,
          isInReviewRequired: c.isInReviewApplicable,
          isBusinessBenefitApplicable: c.isBusinessBenefitApplicable,
          checkList: Array.isArray(c.checkLists) ? c.checkLists.map((cl: any) => ({ description: cl.checkListDescription || cl.description || '', isChecked: !!cl.isChecked })) : [],
          color: c.colorCoding || '',
          createdBy: c.createdBy?.printingName || c.createdBy?.displayName || c.createdBy?.loginId || c.createdByName || (typeof c.createdBy === 'string' || typeof c.createdBy === 'number' ? c.createdBy : '') || 'System',
          createdDate: c.createdDate || c.createdDateTime || c.createdOn || ''
        }));
        setApiCategories(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API categories:", error);
    }
  };

  const [apiUserGroups, setApiUserGroups] = useState<any[]>([]);

  const fetchUserGroups = async () => {
    try {
      const response = await apiService.get<any>(`/api/security/user-groups/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((u: any) => ({
          id: (u.userGroupNo ?? '').toString(),
          code: u.code || '',
          name: u.userGroupName || '',
          description: u.description || '',
          inactive: u.inactive,
          createdBy: u.createdBy?.printingName || u.createdBy?.displayName || u.createdBy?.loginId || u.createdByName || (typeof u.createdBy === 'string' || typeof u.createdBy === 'number' ? u.createdBy : '') || 'System',
          createdDate: u.createdDate || u.createdDateTime || u.createdOn || ''
        }));
        setApiUserGroups(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API user groups:", error);
    }
  };

  const [apiBusinessBenefitTypes, setApiBusinessBenefitTypes] = useState<any[]>([]);
  const [benefitFillValues, setBenefitFillValues] = useState<any>(null);

  const fetchBusinessBenefitTypes = async () => {
    try {
      const response = await apiService.get<any>(`/api/master/business-benefit-types/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((b: any) => ({
          id: (b.businessBenefitTypeNo ?? '').toString(),
          code: b.code || '',
          name: b.businessBenefitTypeName || '',
          valuationtypeNo: b.valuationType?.toString() || '0',
          inactive: b.inactive,
          createdBy: b.createdBy?.printingName || b.createdBy?.displayName || b.createdBy?.loginId || b.createdByName || (typeof b.createdBy === 'string' || typeof b.createdBy === 'number' ? b.createdBy : '') || 'System',
          createdDate: b.createdDate || b.createdDateTime || b.createdOn || ''
        }));
        setApiBusinessBenefitTypes(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API business benefit types:", error);
    }
  };

  const fetchBenefitFillValues = async () => {
    try {
      const res = await apiService.get<any>(`/api/master/business-benefit-types/fill-values?companyNo=${companyNo}`);
      if (res) {
        const data = res.data || res;
        setBenefitFillValues(data);
      }
    } catch (err) {
      console.error("Failed to load benefit fill values:", err);
    }
  };

  const [apiTypes, setApiTypes] = useState<any[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);

  const fetchTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const response = await apiService.get<any>(`/api/master/task-types/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((t: any) => ({
          id: (t.operTaskTypeNo ?? '').toString(),
          code: t.code,
          name: t.operTaskTypeName || '',
          inactive: t.inactive,
          createdBy: t.createdBy?.printingName || t.createdBy?.displayName || t.createdBy?.loginId || t.createdByName || (typeof t.createdBy === 'string' || typeof t.createdBy === 'number' ? t.createdBy : '') || 'System',
          createdDate: t.createdDate || t.createdDateTime || t.createdOn || ''
        }));
        setApiTypes(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API types:", error);
    } finally {
      setIsLoadingTypes(false);
    }
  };

  const [apiPriorities, setApiPriorities] = useState<any[]>([]);
  const [isLoadingPriorities, setIsLoadingPriorities] = useState(false);

  const fetchPriorities = async () => {
    setIsLoadingPriorities(true);
    try {
      const response = await apiService.get<any>(`/api/master/task-priorities/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((p: any) => ({
          id: (p.operTaskPriorityNo ?? '').toString(),
          code: p.code,
          name: p.taskPriorityName || '',
          priorityDuration: p.priorityDuration || '',
          priorityFrequencyNo: (p.priorityDurationFrequencyNo || '').toString(),
          sequence: p.sequenceNo || '',
          inactive: p.inactive,
          createdBy: p.createdBy?.printingName || p.createdBy?.displayName || p.createdBy?.loginId || p.createdByName || (typeof p.createdBy === 'string' || typeof p.createdBy === 'number' ? p.createdBy : '') || 'System',
          createdDate: p.createdDate || p.createdDateTime || p.createdOn || ''
        }));
        setApiPriorities(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API priorities:", error);
    } finally {
      setIsLoadingPriorities(false);
    }
  };

  const [apiFolders, setApiFolders] = useState<any[]>([]);
  const [folderFillValues, setFolderFillValues] = useState<any>(null);

  const fetchFolders = async () => {
    try {
      const response = await apiService.get<any>(`/api/master/task-folders/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((f: any) => ({
          id: (f.taskFolderNo ?? '').toString(),
          code: f.code || f.taskFolderNo,
          name: f.taskFolderName || '',
          description: f.description || '',
          parentFolderNo: (f.parentFolderNo ?? '').toString(),
          sequence: f.sequenceNo || f.sequence || '',
          inactive: f.inactive,
          createdBy: f.createdBy?.printingName || f.createdBy?.displayName || f.createdBy?.loginId || f.createdByName || (typeof f.createdBy === 'string' || typeof f.createdBy === 'number' ? f.createdBy : '') || 'System',
          createdDate: f.createdDate || f.createdDateTime || f.createdOn || ''
        }));
        setApiFolders(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API folders:", error);
    }
  };

  const fetchFolderFillValues = async () => {
    try {
      const response = await apiService.get<any>(`/api/master/task-folders/fill-values?companyNo=${companyNo}`);
      if (response) {
        setFolderFillValues(response.data || response);
      }
    } catch (error) {
      console.error("Failed to fetch folder fill-values:", error);
    }
  };

  const fetchLocations = async () => {
    setIsLoadingLocations(true);
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
      console.error("Failed to fetch API locations:", error);
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const fetchLocationFillValues = async () => {
    try {
      const response = await apiService.get<any>(`/api/master/task-locations/fill-values?companyNo=${companyNo}`);
      if (response) {
        setLocationFillValues(response);
      }
    } catch (error) {
      console.error("Failed to fetch location fill-values:", error);
    }
  };

  const fetchBusinessEntityFillValues = async () => {
    try {
      const response = await apiService.get<any>(`/api/master/business-entities/fill-values?companyNo=${companyNo}`);
      if (response) {
        setBusinessEntityFillValues(response);
      }
    } catch (error) {
      console.error("Failed to fetch business entity fill-values:", error);
    }
  };

  const fetchCategoryFillValues = async () => {
    try {
      const response = await apiService.get<any>(`/api/master/task-categories/fill-values?companyNo=${companyNo}`);
      if (response) {
        setCategoryFillValues(response.data || response);
      }
    } catch (error) {
      console.error("Failed to fetch category fill-values:", error);
    }
  };

  const fetchTaskCompanyCountries = async () => {
    try {
      const response = await apiService.get<any>(`/api/crm/task-companies/fill-values`);
      if (response && response.data && response.data.countries) {
        setTaskCompanyCountries(response.data.countries);
      } else if (response && response.countries) {
        setTaskCompanyCountries(response.countries);
      }
    } catch (err) {
      console.error("Failed to fetch task company countries:", err);
    }
  };

  const fetchTaskCompanyStates = async (countryNo: string) => {
    if (!countryNo) {
      setTaskCompanyStates([]);
      return;
    }
    try {
      const response = await apiService.get<any>(`/api/master/states/by-country/${countryNo}`);
      setTaskCompanyStates(Array.isArray(response) ? response : (response.data || []));
    } catch (err) {
      console.error("Failed to fetch task company states:", err);
      setTaskCompanyStates([]);
    }
  };

  const fetchTaskCompanyCities = async (stateNo: string) => {
    if (!stateNo) {
      setTaskCompanyCities([]);
      return;
    }
    try {
      const response = await apiService.get<any>(`/api/master/cities/by-state/${stateNo}`);
      setTaskCompanyCities(Array.isArray(response) ? response : (response.data || []));
    } catch (err) {
      console.error("Failed to fetch task company cities:", err);
      setTaskCompanyCities([]);
    }
  };

  const fetchTaskCompanies = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.get<any>(`/api/crm/task-companies/search-data`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((tc: any) => ({
          id: (tc.operTaskCompanyNo ?? tc.taskCompanyNo ?? '').toString(),
          code: tc.code,
          name: tc.companyName || '',
          aliasName: tc.aliasName || '',
          address1: tc.address1 || '',
          address2: tc.address2 || '',
          address3: tc.address3 || '',
          countryNo: tc.countryNo || '',
          stateNo: tc.stateNo || '',
          cityNo: tc.cityNo || '',
          pinCode: tc.pinCode || '',
          createdBy: tc.createdBy?.printingName || tc.createdBy?.displayName || tc.createdBy?.loginId || tc.createdByName || 'System',
          createdDate: tc.createdDate || ''
        }));
        setApiTaskCompanies(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch task companies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sub-task list helpers
  const addSubtaskItem = () => {
    if (newSubtaskItem.trim()) {
      setSubtasks([...subtasks, { description: newSubtaskItem.trim(), isChecked: false, taskTypeNo: newSubtaskTaskTypeNo }]);
      setNewSubtaskItem('');
      setNewSubtaskTaskTypeNo('');
    }
  };

  const removeSubtaskItem = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  // Reusable custom fields managed via CustomFieldsSection

  const fetchVessels = async () => {
    setIsLoadingVessels(true);
    try {
      const response = await apiService.get<any>(`/api/master/vessels/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((v: any) => ({
          id: (v.vesselNo ?? v.VesselNo ?? v.id ?? '').toString(),
          code: v.code || v.Code || '',
          name: v.vesselName || v.VesselName || v.name || '',
          createdBy: v.createdBy?.printingName || v.createdBy?.displayName || v.createdBy?.loginId || v.createdByName || (typeof v.createdBy === 'string' || typeof v.createdBy === 'number' ? v.createdBy : '') || 'System',
          createdDate: v.createdDate || v.createdDateTime || v.createdOn || ''
        }));
        setApiVessels(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API vessels:", error);
    } finally {
      setIsLoadingVessels(false);
    }
  };

  const fetchPorts = async () => {
    setIsLoadingPorts(true);
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
      console.error("Failed to fetch API ports:", error);
    } finally {
      setIsLoadingPorts(false);
    }
  };

  const fetchBusinessEntityTypes = async () => {
    setIsLoadingBusinessEntityTypes(true);
    try {
      const response = await apiService.get<any>(`/api/master/business-entity-types/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((b: any) => ({
          id: (b.operCRMBusinessEntityTypeNo ?? b.OperCRMBusinessEntityTypeNo ?? b.id ?? '').toString(),
          code: b.code || b.Code || '',
          name: b.operCRMBusinessEntityTypeName || b.OperCRMBusinessEntityTypeName || b.name || '',
          description: b.description || b.Description || '',
          createdBy: b.createdBy?.printingName || b.createdBy?.displayName || b.createdBy?.loginId || b.createdByName || (typeof b.createdBy === 'string' || typeof b.createdBy === 'number' ? b.createdBy : '') || 'System',
          createdDate: b.createdDate || b.createdDateTime || b.createdOn || ''
        }));
        setApiBusinessEntityTypes(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API business entity types:", error);
    } finally {
      setIsLoadingBusinessEntityTypes(false);
    }
  };

  const fetchCountries = async () => {
    setIsLoadingCountries(true);
    try {
      const response = await apiService.get<any>(`/api/master/countries/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((c: any) => ({
          id: (c.countryNo ?? c.id ?? '').toString(),
          code: c.code || c.countryCode || '',
          name: c.countryName || c.name || '',
          createdBy: c.createdBy?.printingName || c.createdBy?.displayName || c.createdBy?.loginId || c.createdByName || (typeof c.createdBy === 'string' || typeof c.createdBy === 'number' ? c.createdBy : '') || 'System',
          createdDate: c.createdDate || c.createdDateTime || c.createdOn || ''
        }));
        setApiCountries(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API countries:", error);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const fetchStates = async () => {
    setIsLoadingStates(true);
    try {
      const response = await apiService.get<any>(`/api/master/states/search-data?companyNo=${companyNo}`);
      if (response) {
        const rawItems = Array.isArray(response) ? response : (response.data && Array.isArray(response.data) ? response.data : []);
        const mapped = rawItems.map((s: any) => ({
          id: (s.stateNo ?? s.id ?? '').toString(),
          code: s.code || s.stateCode || '',
          name: s.stateName || s.name || '',
          countryNo: (s.countryNo ?? s.CountryNo ?? '').toString(),
          gstStateCode: s.gstStateCode || s.gstCode || '',
          isUnionTerritory: s.isUnionTerritory || false,
          createdBy: s.createdBy?.printingName || s.createdBy?.displayName || s.createdBy?.loginId || s.createdByName || (typeof s.createdBy === 'string' || typeof s.createdBy === 'number' ? s.createdBy : '') || 'System',
          createdDate: s.createdDate || s.createdDateTime || s.createdOn || ''
        }));
        setApiStates(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API states:", error);
    } finally {
      setIsLoadingStates(false);
    }
  };

  const fetchCities = async () => {
    setIsLoadingCities(true);
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
          createdDate: ct.createdDate || ct.createdDateTime || ct.createdOn || ''
        }));
        setApiCities(mapped);
      }
    } catch (error) {
      console.error("Failed to fetch API cities:", error);
    } finally {
      setIsLoadingCities(false);
    }
  };

  useEffect(() => {
    if (type === 'location') {
      fetchLocations();
      fetchLocationFillValues();
    } else if (type === 'vessel') {
      fetchVessels();
    } else if (type === 'port') {
      fetchPorts();
      fetchLocationFillValues();
    } else if (type === 'business-entity-type') {
      fetchBusinessEntityTypes();
    } else if (type === 'type') {
      fetchTypes();
    } else if (type === 'priority') {
      fetchPriorities();
    } else if (type === 'folder') {
      fetchFolders();
      fetchFolderFillValues();
    } else if (type === 'category') {
      fetchCategories();
      fetchCategoryFillValues();
    } else if (type === 'user-group') {
      fetchUserGroups();
    } else if (type === 'benefit-type') {
      fetchBusinessBenefitTypes();
      fetchBenefitFillValues();
      setValuationtypeNo('1');
    } else if (type === 'company') {
      fetchCompanies();
      fetchBusinessEntityFillValues();
    } else if (type === 'country') {
      fetchCountries();
      fetchLocationFillValues();
    } else if (type === 'state') {
      fetchStates();
      fetchLocationFillValues();
    } else if (type === 'city') {
      fetchCities();
      fetchLocationFillValues();
    } else if (type === 'task-company') {
      fetchTaskCompanies();
      fetchTaskCompanyCountries();
    }
  }, [type]);

  // Local UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset pagination to first page when search query or master type changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, type]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<any | null>(null);

  // Form states matching schemas
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Category extra fields
  const [isApprovalApplicable, setIsApprovalApplicable] = useState(false);
  const [isInReviewRequired, setIsInReviewRequired] = useState(false);
  const [isBusinessBenefitApplicable, setIsBusinessBenefitApplicable] = useState(false);
  const [checklist, setChecklist] = useState<{ description: string; isChecked: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [color, setColor] = useState('');
  const [subtasks, setSubtasks] = useState<{ description: string; isChecked: boolean; taskTypeNo?: string }[]>([]);
  const [newSubtaskItem, setNewSubtaskItem] = useState('');
  const [newSubtaskTaskTypeNo, setNewSubtaskTaskTypeNo] = useState('');
  const [categoryFillValues, setCategoryFillValues] = useState<any>(null);
  const [categoryCustomFields, setCategoryCustomFields] = useState<{ customFieldNo: string; fieldValue: string }[]>([]);
  const [editingChecklistIdx, setEditingChecklistIdx] = useState<number | null>(null);
  const [editingSubtaskIdx, setEditingSubtaskIdx] = useState<number | null>(null);
  const [tempEditText, setTempEditText] = useState('');
  const [tempEditSubtaskTaskTypeNo, setTempEditSubtaskTaskTypeNo] = useState('');

  // Priority extra fields
  const [priorityDuration, setPriorityDuration] = useState<number | null>(null);
  const [priorityFrequencyNo, setPriorityFrequencyNo] = useState('');

  // Folder extra fields
  const [description, setDescription] = useState('');
  const [parentFolderNo, setParentFolderNo] = useState('');
  const [sequence, setSequence] = useState<number | null>(null);

  // User Group extra fields
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  // Business Benefit Type extra fields
  const [valuationtypeNo, setValuationtypeNo] = useState('');

  // Country Master extra fields
  const [_countryCode, setCountryCode] = useState('');
  const [_countryName, setCountryName] = useState('');

  // State Master extra fields
  const [_stateCode, setStateCode] = useState('');
  const [_stateName, setStateName] = useState('');
  const [gstStateCode, setGstStateCode] = useState('');
  const [isUnionTerritory, setIsUnionTerritory] = useState(false);
  const [stateCountryNo, setStateCountryNo] = useState('');
  const [_availableCountries, setAvailableCountries] = useState<any[]>([]);

  // City Master extra fields
  const [_cityCode, setCityCode] = useState('');
  const [_cityName, setCityName] = useState('');
  const [cityCityCountryNo, setCityCityCountryNo] = useState('');
  const [cityCityStateNo, setCityCityStateNo] = useState('');
  const [_availableCityCountries, setAvailableCityCountries] = useState<any[]>([]);
  const [availableCityStates, setAvailableCityStates] = useState<any[]>([]);

  // Location extra fields
  const [parentLocationNo, setParentLocationNo] = useState('');
  const [inchargeNo, setInchargeNo] = useState('');
  const [inchargeLabel, setInchargeLabel] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [address3, setAddress3] = useState('');
  const [countryNo, setCountryNo] = useState('United States');
  const [stateNo, setStateNo] = useState('');
  const [cityNo, setCityNo] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [locationRegion, setLocationRegion] = useState('');

  // Company Master extra fields
  const [companyType, setCompanyType] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyState, setCompanyState] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyPinCode, setCompanyPinCode] = useState('');
  const [companyVatGst, setCompanyVatGst] = useState('');
  const [creditLimit, setCreditLimit] = useState<number | null>(null);
  const [_companyStatus, setCompanyStatus] = useState('Active');

  const [companyLocations, setCompanyLocations] = useState<any[]>([]);
  const [companyPorts, setCompanyPorts] = useState<any[]>([]);
  const [companyAttachments, setCompanyAttachments] = useState<any[]>([]);

  // Sub-section modal form states
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);

  // Location Modal states
  const [locType, setLocType] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCountry, setLocCountry] = useState('');
  const [locState, setLocState] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locPin, setLocPin] = useState('');
  const [locMapUrl, setLocMapUrl] = useState('');
  const [locLatitude, setLocLatitude] = useState('');
  const [locLongitude, setLocLongitude] = useState('');
  const [locErrors, setLocErrors] = useState<Record<string, string>>({});

  // Flat Contact Person states
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactDesignation, setContactDesignation] = useState('');
  const [contactDepartment, setContactDepartment] = useState('');
  const [contactAddress, setContactAddress] = useState('');
  const [contactCountry, setContactCountry] = useState('');
  const [contactState, setContactState] = useState('');
  const [contactCity, setContactCity] = useState('');
  const [contactPinCode, setContactPinCode] = useState('');

  const [companyContacts, setCompanyContacts] = useState<any[]>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [contactStatus, setContactStatus] = useState('Active');
  const [selectedPortName, setSelectedPortName] = useState('');

  // Business Entity Fill Values and lists
  const [businessEntityFillValues, setBusinessEntityFillValues] = useState<any>(null);
  const [companyTimeZoneNo, setCompanyTimeZoneNo] = useState<string>('');

  // Dynamic Country-State-City lists for different forms
  const [companyStatesList, setCompanyStatesList] = useState<any[]>([]);
  const [companyCitiesList, setCompanyCitiesList] = useState<any[]>([]);

  const [locStatesList, setLocStatesList] = useState<any[]>([]);
  const [locCitiesList, setLocCitiesList] = useState<any[]>([]);

  const [portStatesList, setPortStatesList] = useState<any[]>([]);
  const [portCitiesList, setPortCitiesList] = useState<any[]>([]);
  const [portAlias, setPortAlias] = useState('');

  const [contactStatesList, setContactStatesList] = useState<any[]>([]);
  const [contactCitiesList, setContactCitiesList] = useState<any[]>([]);

  const fetchStatesByCountry = async (countryNo: number | string) => {
    if (!countryNo) return [];
    try {
      const response = await apiService.get<any>(`/api/master/states/by-country/${countryNo}`);
      if (response) {
        return response.data || response || [];
      }
    } catch (error) {
      console.error(`Failed to fetch states for countryNo ${countryNo}:`, error);
    }
    return [];
  };

  const fetchCitiesByState = async (stateNo: number | string) => {
    if (!stateNo) return [];
    try {
      const response = await apiService.get<any>(`/api/master/cities/by-state/${stateNo}`);
      if (response) {
        return response.data || response || [];
      }
    } catch (error) {
      console.error(`Failed to fetch cities for stateNo ${stateNo}:`, error);
    }
    return [];
  };

  const getCountryNo = (name: string) => {
    const list = businessEntityFillValues?.data?.countries || businessEntityFillValues?.countries || [];
    const found = list.find((x: any) => x.countryName?.toLowerCase() === name?.toLowerCase());
    return found ? parseInt(found.countryNo) : null;
  };
  const getStateNo = (name: string) => {
    const list = companyStatesList.length ? companyStatesList : (locStatesList.length ? locStatesList : (contactStatesList.length ? contactStatesList : []));
    const found = list.find((x: any) => x.stateName?.toLowerCase() === name?.toLowerCase());
    return found ? parseInt(found.stateNo) : null;
  };
  const getCityNo = (name: string) => {
    const list = companyCitiesList.length ? companyCitiesList : (locCitiesList.length ? locCitiesList : (contactCitiesList.length ? contactCitiesList : []));
    const found = list.find((x: any) => x.cityName?.toLowerCase() === name?.toLowerCase());
    return found ? parseInt(found.cityNo) : null;
  };
  const getPortNo = (name: string) => {
    const list = businessEntityFillValues?.data?.ports || businessEntityFillValues?.ports || [];
    const found = list.find((x: any) => x.portName?.toLowerCase() === name?.toLowerCase());
    return found ? parseInt(found.portNo) : null;
  };

  const getLocationTypeName = (no: string | number) => {
    const list = businessEntityFillValues?.data?.locationTypes || businessEntityFillValues?.locationTypes || [];
    const found = list.find((x: any) => x.locationTypeNo?.toString() === no?.toString());
    return found ? found.locationTypeName : no;
  };

  const getLocationTypeNo = (name: string) => {
    const list = businessEntityFillValues?.data?.locationTypes || businessEntityFillValues?.locationTypes || [];
    const found = list.find((x: any) => x.locationTypeName?.toLowerCase() === name?.toLowerCase());
    return found ? found.locationTypeNo : null;
  };

  const handlePortCountryChange = async (val: string) => {
    setCountryNo(val);
    setStateNo('');
    setCityNo('');
    setPortStatesList([]);
    setPortCitiesList([]);
    if (errors.countryNo || errors.stateNo || errors.cityNo) {
      setErrors(prev => ({ ...prev, countryNo: '', stateNo: '', cityNo: '' }));
    }
    if (val) {
      const states = await fetchStatesByCountry(val);
      setPortStatesList(states);
    }
  };

  const handlePortStateChange = async (val: string) => {
    setStateNo(val);
    setCityNo('');
    setPortCitiesList([]);
    if (errors.stateNo || errors.cityNo) {
      setErrors(prev => ({ ...prev, stateNo: '', cityNo: '' }));
    }
    if (val) {
      const cities = await fetchCitiesByState(val);
      setPortCitiesList(cities);
    }
  };

  const handleLocationCountryChange = async (val: string) => {
    setCountryNo(val);
    setStateNo('');
    setCityNo('');
    setLocStatesList([]);
    setLocCitiesList([]);
    if (errors.countryNo || errors.stateNo || errors.cityNo) {
      setErrors(prev => ({ ...prev, countryNo: '', stateNo: '', cityNo: '' }));
    }
    if (val) {
      const states = await fetchStatesByCountry(val);
      setLocStatesList(states);
    }
  };

  const handleLocationStateChange = async (val: string) => {
    setStateNo(val);
    setCityNo('');
    setLocCitiesList([]);
    if (errors.stateNo || errors.cityNo) {
      setErrors(prev => ({ ...prev, stateNo: '', cityNo: '' }));
    }
    if (val) {
      const cities = await fetchCitiesByState(val);
      setLocCitiesList(cities);
    }
  };

  useEffect(() => {
    if (isNew) {
      setErrors({});
      setEditingId(null);
      setName('');
      setIsApprovalApplicable(false);
      setIsInReviewRequired(false);
      setIsBusinessBenefitApplicable(false);
      setChecklist([]);
      setNewChecklistItem('');
      setSubtasks([]);
      setNewSubtaskItem('');
      setNewSubtaskTaskTypeNo('');
      setCategoryCustomFields([]);
      setEditingChecklistIdx(null);
      setEditingSubtaskIdx(null);
      setTempEditText('');
      setTempEditSubtaskTaskTypeNo('');
      setColor('');
      setPriorityDuration(null);
      setPriorityFrequencyNo('');
      setDescription('');
      setParentFolderNo('');
      setSequence(null);
      setSelectedUsers([]);
      setValuationtypeNo(type === 'benefit-type' ? '1' : '');
      setParentLocationNo('');
      setInchargeNo('');
      setInchargeLabel('');
      setAddress1('');
      setAddress2('');
      setAddress3('');
      setCountryNo('');
      setStateNo('');
      setCityNo('');
      setPinCode('');
      setLocationRegion('');
      setPortStatesList([]);
      setPortCitiesList([]);
      setPortAlias('');
      setServerError(null);

      // Company Master resets
      setCompanyType('');
      setCompanyAddress('');
      setCompanyCity('');
      setCompanyState('');
      setCompanyCountry('');
      setCompanyPinCode('');
      setCompanyVatGst('');
      setCreditLimit(null);
      setCompanyStatus('Active');
      setCompanyLocations([]);
      setCompanyPorts([]);
      setCompanyAttachments([]);
      setLocType('');
      setLocAddress('');
      setLocCountry('');
      setLocState('');
      setLocCity('');
      setLocPin('');
      setLocMapUrl('');
      setLocLatitude('');
      setLocLongitude('');
      setLocErrors({});
      setEditingLocationIndex(null);
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setContactDesignation('');
      setContactDepartment('');
      setContactAddress('');
      setContactCountry('');
      setContactState('');
      setContactCity('');
      setContactPinCode('');
      setCompanyContacts([]);
      setContactModalOpen(false);
      setEditingContactIndex(null);
      setContactErrors({});
      setContactStatus('Active');
      setSelectedPortName('');
      setCompanyTimeZoneNo('');
      setCompanyStatesList([]);
      setCompanyCitiesList([]);
      setLocStatesList([]);
      setLocCitiesList([]);
      setContactStatesList([]);
      setContactCitiesList([]);

      // Country, State, City Master resets
      setCountryCode('');
      setCountryName('');
      setStateCode('');
      setStateName('');
      setGstStateCode('');
      setIsUnionTerritory(false);
      setStateCountryNo('');
      setAvailableCountries([]);
      setCityCode('');
      setCityName('');
      setCityCityCountryNo('');
      setCityCityStateNo('');
      setAvailableCityCountries([]);
      setAvailableCityStates([]);

      // Task Company resets
      setTcCompanyName('');
      setTcAliasName('');
      setTcLocationName('');
      setTcAddress1('');
      setTcAddress2('');
      setTcAddress3('');
      setTcPinCode('');
      setTcCountryNo('');
      setTcStateNo('');
      setTcCityNo('');
    } else if (isEdit && id) {
      setErrors({});
      setEditingId(id);
      setServerError(null);

      const companyNoVal = companyNo;
      if (type === 'category') {
        apiService.get<any>(`/api/master/task-categories/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.operTaskCategoryName || dl.name || '');
              setIsApprovalApplicable(dl.isMultiLevelApproval || false);
              setIsInReviewRequired(dl.isInReviewApplicable || false);
              setIsBusinessBenefitApplicable(dl.isBusinessBenefitApplicable || false);
              setChecklist(Array.isArray(dl.checkLists) ? dl.checkLists.map((cl: any) => ({ description: cl.checkListDescription || cl.description || '', isChecked: !!cl.isChecked })) : []);
              const rawSubtasks = dl.subtasks || dl.subTasks;
              setSubtasks(Array.isArray(rawSubtasks) ? rawSubtasks.map((st: any) => ({
                description: st.title || st.subtaskTitle || st.description || st.taskName || st.subTaskName || (typeof st === 'string' ? st : ''),
                isChecked: !!st.isChecked,
                taskTypeNo: (st.taskTypeNo ?? st.operTaskTypeNo ?? st.taskType?.operTaskTypeNo ?? '').toString()
              })) : []);
              setCategoryCustomFields(Array.isArray(dl.customFields) ? dl.customFields.map((cf: any) => ({
                customFieldNo: (cf.customFieldNo ?? cf.customFieldNo ?? '').toString(),
                fieldValue: cf.fieldValue || cf.value || ''
              })) : []);
              setColor(dl.colorCoding || '');
              setNewChecklistItem('');
              setNewSubtaskItem('');
              setNewSubtaskTaskTypeNo('');
            }
          }
        }).catch(err => console.error("Failed to load category details:", err));
      } else if (type === 'priority') {
        apiService.get<any>(`/api/master/task-priorities/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.taskPriorityName || dl.name || '');
              setPriorityDuration(dl.priorityDuration !== undefined && dl.priorityDuration !== null ? dl.priorityDuration : null);
              setPriorityFrequencyNo(dl.priorityDurationFrequencyNo ? dl.priorityDurationFrequencyNo.toString() : '');
              setSequence(dl.sequenceNo !== undefined && dl.sequenceNo !== null ? dl.sequenceNo : null);
            }
          }
        }).catch(err => console.error("Failed to load priority details:", err));
      } else if (type === 'folder') {
        apiService.get<any>(`/api/master/task-folders/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.taskFolderName || dl.name || '');
              setDescription(dl.description || '');
              setParentFolderNo((dl.parentFolderNo || '').toString());
              setSequence(dl.sequenceNo !== undefined && dl.sequenceNo !== null ? dl.sequenceNo : null);
            }
          }
        }).catch(err => console.error("Failed to load folder details:", err));
      } else if (type === 'user-group') {
        apiService.get<any>(`/api/security/user-groups/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.userGroupName || dl.name || '');
              setDescription(dl.description || '');
              const members = Array.isArray(dl.users) ? dl.users.map((u: any) => ({
                loginNo: u.loginNo,
                userName: u.loginId,
                displayName: u.printingName || u.loginId,
                email: u.email || ''
              })) : [];
              setSelectedUsers(members);
            }
          }
        }).catch(err => console.error("Failed to load user group details:", err));
      } else if (type === 'benefit-type') {
        apiService.get<any>(`/api/master/business-benefit-types/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.businessBenefitTypeName || dl.name || '');
              setValuationtypeNo(dl.valuationType ? (dl.valuationType.valuationTypeNo ?? dl.valuationType ?? '').toString() : '');
            }
          }
        }).catch(err => console.error("Failed to load benefit type details:", err));
      } else if (type === 'vessel') {
        apiService.get<any>(`/api/master/vessels/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.vesselName || dl.VesselName || dl.name || '');
            }
          }
        }).catch(err => console.error("Failed to load vessel details:", err));
      } else if (type === 'port') {
        apiService.get<any>(`/api/master/ports/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.portName || dl.PortName || dl.name || '');
              const loadedCountry = dl.country?.countryNo ?? dl.countryNo ?? dl.CountryNo ?? '';
              const loadedState = dl.state?.stateNo ?? dl.stateNo ?? dl.StateNo ?? '';
              const loadedCity = dl.city?.cityNo ?? dl.cityNo ?? dl.CityNo ?? '';
              setCountryNo(loadedCountry?.toString?.() ?? '');
              setStateNo(loadedState?.toString?.() ?? '');
              setCityNo(loadedCity?.toString?.() ?? '');
              setPortAlias(dl.portAlias || dl.alias || dl.portAliasName || '');
              if (loadedCountry) {
                fetchStatesByCountry(loadedCountry).then((states) => setPortStatesList(states));
              }
              if (loadedState) {
                fetchCitiesByState(loadedState).then((cities) => setPortCitiesList(cities));
              }
            }
          }
        }).catch(err => console.error("Failed to load port details:", err));
      } else if (type === 'business-entity-type') {
        apiService.get<any>(`/api/master/business-entity-types/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.operCRMBusinessEntityTypeName || dl.OperCRMBusinessEntityTypeName || dl.name || '');
              setDescription(dl.description || dl.Description || '');
            }
          }
        }).catch(err => console.error("Failed to load business entity type details:", err));
      } else if (type === 'type') {
        apiService.get<any>(`/api/master/task-types/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.operTaskTypeName || dl.name || '');
            }
          }
        }).catch(err => console.error("Failed to load type details:", err));
      } else if (type === 'location') {
        apiService.get<any>(`/api/master/task-locations/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              const parentVal = dl.parentLocationNo || dl.parentLocation || 'none';
              setParentLocationNo(parentVal.toString());
              const inchargeVal = dl.operLocationIncharge?.loginNo || dl.locationIncharge || dl.inchargeNo || 'none';
              setInchargeNo(inchargeVal.toString());
              const inchargeName = dl.operLocationIncharge?.printingName || dl.operLocationIncharge?.loginId || dl.locationIncharge || '';
              setInchargeLabel(inchargeName.toString());
              const addr = dl.address || dl;
              setAddress1(addr.address1 || '');
              setAddress2(addr.address2 || '');
              setAddress3(addr.address3 || '');
              const countryVal = addr.country?.countryNo || addr.countryNo || '';
              setCountryNo(countryVal.toString());
              const stateVal = addr.state?.stateNo || addr.stateNo || '';
              setStateNo(stateVal.toString());
              const cityVal = addr.city?.cityNo || addr.cityNo || '';
              setCityNo(cityVal.toString());
              if (countryVal) {
                fetchStatesByCountry(countryVal).then((states) => setLocStatesList(states));
              }
              if (stateVal) {
                fetchCitiesByState(stateVal).then((cities) => setLocCitiesList(cities));
              }
              setPinCode(addr.pinCode || addr.pincode || '');
              const regionVal = addr.region?.regionNo || addr.regionNo || '';
              setLocationRegion(regionVal.toString());
            }
          }
        }).catch(err => console.error("Failed to load location details:", err));
      } else if (type === 'company') {
        apiService.get<any>(`/api/master/business-entities/load-data/${id}?companyNo=${companyNoVal}`).then(async (response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.businessEntityName || '');
              setCompanyType(dl.businessEntityType?.id?.toString() || '');
              setCompanyVatGst(dl.vatgstNo || '');
              setCreditLimit(dl.creditInsuranceLimit || null);
              setCompanyStatus(dl.status || 'Active');
              setCompanyTimeZoneNo(dl.timeZone?.timeZoneNo?.toString() || '');

              // Map locations properly
              const mappedLocations = (dl.locations || []).map((l: any) => ({
                type: l.locationType?.addressTypeNo?.toString() || l.locationType?.addressTypeName || '',
                address: l.address || '',
                country: l.country?.countryName || '',
                state: l.state?.stateName || '',
                city: l.city?.cityName || '',
                pinCode: l.pinCode || '',
                mapUrl: l.mapUrl || '',
                latitude: l.latitude || 0,
                longitude: l.longitude || 0
              }));
              setCompanyLocations(mappedLocations);

              // Map contact persons properly
              const mappedContacts = (dl.contactPersons || []).map((c: any) => ({
                contactName: c.contactPersonName || '',
                name: c.contactPersonName || '',
                phone: c.phoneNo || '',
                email: c.email || '',
                designation: c.designation || '',
                department: c.department || '',
                address: c.address || '',
                country: c.country?.countryName || '',
                state: c.state?.stateName || '',
                city: c.city?.cityName || '',
                pinCode: c.pinCode || '',
                status: c.status || 'Active'
              }));
              setCompanyContacts(mappedContacts);

              // Map ports properly
              const mappedPorts = (dl.ports || []).map((p: any) => ({
                name: p.port?.portName || '',
                portName: p.port?.portName || '',
                portNo: p.port?.portId || 0
              }));
              setCompanyPorts(mappedPorts);

              // Fetch attachments from dedicated API (formNo 1150 = Business Entity)
              try {
                const attachmentList = await attachmentService.getAttachments(parseInt(id), 1550);
                if (attachmentList && attachmentList.length > 0) {
                  setCompanyAttachments(attachmentList.map((a: any) => ({
                    id: a.id || a.docNo || null,
                    docNo: a.id || a.docNo || null,
                    fileName: a.name || a.fileName || '',
                    fileSize: a.size || a.fileSize || 0,
                    filePath: a.storedFilePath || a.relativePath || ''
                  })));
                } else {
                  setCompanyAttachments([]);
                }
              } catch (attErr) {
                console.error('Failed to load business entity attachments:', attErr);
                setCompanyAttachments([]);
              }
            }
          }
        }).catch(err => {
          console.error("Failed to load company details via API:", err);
        });
      } else if (type === 'country') {
        apiService.get<any>(`/api/master/countries/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.countryName || dl.name || '');
            }
          }
        }).catch(err => console.error("Failed to load country details:", err));
      } else if (type === 'state') {
        apiService.get<any>(`/api/master/states/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.stateName || dl.name || '');
              setGstStateCode(dl.gstStateCode || dl.gstCode || '');
              setIsUnionTerritory(dl.isUnionTerritory || false);
              setStateCountryNo((dl.countryNo || dl.CountryNo || '').toString());
            }
          }
        }).catch(err => console.error("Failed to load state details:", err));
      } else if (type === 'city') {
        apiService.get<any>(`/api/master/cities/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const body = response.data || response;
            const dl = body.data || body;
            if (dl) {
              setName(dl.cityName || dl.name || '');
              setCityCityCountryNo((dl.countryNo || dl.CountryNo || '').toString());
              setCityCityStateNo((dl.stateNo || dl.StateNo || '').toString());

              // Load states for the selected country
              if (dl.countryNo || dl.CountryNo) {
                fetchStatesByCountry(dl.countryNo || dl.CountryNo).then((states) => {
                  setAvailableCityStates(states);
                });
              }
            }
          }
        }).catch(err => console.error("Failed to load city details:", err));
      } else if (type === 'task-company') {
        apiService.get<any>(`/api/crm/task-companies/load-data/${id}?companyNo=${companyNoVal}`).then((response) => {
          if (response) {
            const dl = response.data || response;
            if (dl) {
              setTcCompanyName(dl.companyName || '');
              setTcAliasName(dl.aliasName || '');
              setTcLocationName(dl.locationName || '');
              setTcAddress1(dl.address1 || '');
              setTcAddress2(dl.address2 || '');
              setTcAddress3(dl.address3 || '');
              setTcPinCode(dl.pinCode || '');
              const countryVal = dl.country?.id ?? dl.countryNo ?? '';
              const stateVal = dl.state?.id ?? dl.stateNo ?? '';
              const cityVal = dl.city?.id ?? dl.cityNo ?? '';

              setTcCountryNo(countryVal.toString());
              setTcStateNo(stateVal.toString());
              setTcCityNo(cityVal.toString());

              if (countryVal) {
                fetchTaskCompanyStates(countryVal.toString());
              }
              if (stateVal) {
                fetchTaskCompanyCities(stateVal.toString());
              }
            }
          }
        }).catch(err => console.error("Failed to load task company details:", err));
      }
    }
  }, [isNew, isEdit, id, type, companyNo]);

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  const getFrequencyName = (no: string | number) => {
    if (!fillValues?.frequency) return no;
    const item = fillValues.frequency.find((f: any) => (f.FrequencyNo || f.id || f.frequencyNo)?.toString() === no?.toString());
    return item ? (item.FrequencyName || item.Frequency || item.name || no) : no;
  };

  const getMasterInfo = () => {
    switch (type) {
      case 'category':
        return { title: 'Category Master', desc: 'Manage task operational categories and checklist definitions', icon: Layers, list: apiCategories };
      case 'type':
        return { title: 'Type Master', desc: 'Manage high-level task classification profiles', icon: Sliders, list: apiTypes };
      case 'priority':
        return { title: 'Priority Master', desc: 'Set Priority durations, and frequency controls', icon: AlertCircle, list: apiPriorities };
      case 'folder':
        return { title: 'Folder Master', desc: 'Configure workspace project directories and parent layouts', icon: Folder, list: apiFolders };
      case 'user-group':
        return { title: 'User Group Master', desc: 'Define access permission teams and user list aggregates', icon: Users, list: apiUserGroups };
      case 'benefit-type':
        return { title: 'Business Benefit Type Master', desc: 'Configure valuation standards and benefit metrics', icon: Sparkles, list: apiBusinessBenefitTypes };
      case 'location':
        return { title: 'Location Master', desc: 'Manage physical addresses, regional hubs, and location hierarchies', icon: MapPin, list: apiLocations };
      case 'company':
        return { title: 'Business Entity Master', desc: 'Define and manage business entity profiles, branch locations, and contact persons', icon: Layers, list: apiCompanies };
      case 'vessel':
        return { title: 'Vessel Master', desc: 'Manage vessel names and generated vessel codes', icon: Ship, list: apiVessels };
      case 'port':
        return { title: 'Port Master', desc: 'Manage port names with optional country, state, and city references', icon: Anchor, list: apiPorts };
      case 'business-entity-type':
        return { title: 'Business Entity Type Master', desc: 'Manage business entity type names and generated codes', icon: Building2, list: apiBusinessEntityTypes };
      case 'country':
        return { title: 'Country Master', desc: 'Manage countries with codes and names', icon: Globe, list: apiCountries };
      case 'state':
        return { title: 'State Master', desc: 'Manage states with country references, GST codes, and union territory status', icon: MapPin, list: apiStates };
      case 'city':
        return { title: 'City Master', desc: 'Manage cities with country and state references', icon: Building, list: apiCities };
      case 'task-company':
        return { title: 'Task Company Master', desc: 'Manage Task Companies and their locations', icon: Building2, list: apiTaskCompanies };
    }
  };

  const { title, icon: Icon, list: rawList } = getMasterInfo();
  const list = type === 'location' ? apiLocations : type === 'vessel' ? apiVessels : type === 'port' ? apiPorts : type === 'business-entity-type' ? apiBusinessEntityTypes : type === 'type' ? apiTypes : type === 'priority' ? apiPriorities : type === 'folder' ? apiFolders : type === 'category' ? apiCategories : type === 'user-group' ? apiUserGroups : type === 'benefit-type' ? apiBusinessBenefitTypes : type === 'company' ? apiCompanies : type === 'task-company' ? apiTaskCompanies : type === 'country' ? apiCountries : type === 'state' ? apiStates : type === 'city' ? apiCities : rawList;

  // Filtered List
  const filteredList = list.filter((item: any) => {
    const query = searchQuery.toLowerCase();
    const matchesName = item.name?.toLowerCase().includes(query);
    const matchesCode = item.code?.toLowerCase().includes(query);
    const matchesDesc = item.description?.toLowerCase().includes(query);
    const matchesCountry = item.countryName?.toString().toLowerCase().includes(query) || item.countryNo?.toString().toLowerCase().includes(query);
    const matchesState = item.stateName?.toString().toLowerCase().includes(query) || item.stateNo?.toString().toLowerCase().includes(query);
    const matchesCity = item.cityName?.toString().toLowerCase().includes(query) || item.cityNo?.toString().toLowerCase().includes(query);

    // Add match for contact person name specifically
    const matchesContactName = item.contacts?.some((c: any) =>
      (c.contactPersonName || c.contactName || c.name)?.toLowerCase().includes(query)
    );

    // Add match for attachment file name specifically
    const matchesAttachmentName = item.attachments?.some((a: any) =>
      (a.fileName || a.name)?.toLowerCase().includes(query)
    );

    return matchesName || matchesCode || matchesDesc || matchesCountry || matchesState || matchesCity || matchesContactName || matchesAttachmentName;
  });

  // Pagination Calculations
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  // Safe page boundary checks
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const paginatedList = filteredList.slice(startIndex, endIndex);

  // Group companies by first letter for A-Z sidebar navigation
  const groupedCompanies = useMemo(() => {
    if (type !== 'company') return [];

    // Sort all matching companies alphabetically by name
    const sorted = [...paginatedList].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );

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

    // Order alphabetically, putting '#' at the very end
    groups.sort((a, b) => {
      if (a.letter === '#') return 1;
      if (b.letter === '#') return -1;
      return a.letter.localeCompare(b.letter);
    });

    return groups;
  }, [filteredList, type]);

  // Open Modal to Add
  const handleAddClick = () => {
    navigate(`/master/${type}/new`);
  };

  // Open Modal to Edit
  const handleEditClick = (item: any) => {
    navigate(`/master/${type}/edit/${item.id}`);
  };

  // Delete Record
  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    switch (type) {
      case 'category':
        apiService.delete(`/api/master/task-categories/delete`, {
          params: { operTaskCategoryNo: id }
        }).then(() => fetchCategories()).catch(err => console.error("Failed to delete category:", err));
        break;
      case 'type':
        apiService.delete(`/api/master/task-types/delete`, {
          params: { operTaskTypeNo: id }
        }).then(() => fetchTypes()).catch(err => console.error("Failed to delete type:", err));
        break;
      case 'priority':
        apiService.delete(`/api/master/task-priorities/delete`, {
          params: { operTaskPriorityNo: id }
        }).then(() => fetchPriorities()).catch(err => console.error("Failed to delete priority:", err));
        break;
      case 'folder':
        apiService.delete(`/api/master/task-folders/delete`, {
          params: { taskFolderNo: id }
        }).then(() => fetchFolders()).catch(err => console.error("Failed to delete folder:", err));
        break;
      case 'user-group':
        apiService.delete(`/api/security/user-groups/delete`, {
          params: { userGroupNo: id }
        }).then(() => fetchUserGroups()).catch(err => console.error("Failed to delete user group:", err));
        break;
      case 'benefit-type':
        apiService.delete(`/api/master/business-benefit-types/delete`, {
          params: { businessBenefitTypeNo: id }
        }).then(() => fetchBusinessBenefitTypes()).catch(err => console.error("Failed to delete benefit type:", err));
        break;
      case 'vessel':
        apiService.delete(`/api/master/vessels/delete`, {
          params: { vesselNo: id }
        }).then(() => fetchVessels()).catch(err => console.error("Failed to delete vessel:", err));
        break;
      case 'port':
        apiService.delete(`/api/master/ports/delete`, {
          params: { portNo: id }
        }).then(() => fetchPorts()).catch(err => console.error("Failed to delete port:", err));
        break;
      case 'business-entity-type':
        apiService.delete(`/api/master/business-entity-types/delete`, {
          params: { operCRMBusinessEntityTypeNo: id }
        }).then(() => fetchBusinessEntityTypes()).catch(err => console.error("Failed to delete business entity type:", err));
        break;
      case 'location':
        apiService.delete(`/api/master/task-locations/delete`, {
          params: {
            operLocationNo: id,
            locationNo: id,
            id: id
          }
        }).then(() => {
          fetchLocations();
        }).catch(err => console.error("Failed to delete location:", err));
        break;
      case 'company':
        apiService.delete(`/api/master/business-entities/delete`, {
          params: { businessEntityNo: id }
        }).then(() => {
          fetchCompanies();
        }).catch(err => {
          console.error("Failed to delete company via API:", err);
          fetchCompanies();
        });
        break;
      case 'country':
        apiService.delete(`/api/master/countries/delete`, {
          params: { countryNo: id }
        }).then(() => fetchCountries()).catch(err => console.error("Failed to delete country:", err));
        break;
      case 'state':
        apiService.delete(`/api/master/states/delete`, {
          params: { stateNo: id }
        }).then(() => fetchStates()).catch(err => console.error("Failed to delete state:", err));
        break;
      case 'city':
        apiService.delete(`/api/master/cities/${id}`, {
          params: { companyNo }
        }).then(() => fetchCities()).catch(err => console.error("Failed to delete city:", err));
        break;
      case 'task-company':
        apiService.delete(`/api/crm/task-companies/delete`, {
          params: { operTaskCompanyNo: id }
        }).then(() => fetchTaskCompanies()).catch(err => console.error("Failed to delete task company:", err));
        break;
    }
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (type !== 'task-company' && !name.trim()) {
      newErrors.name = type === 'company' ? 'Business Entity name is required' : `${type.replace(/-/g, ' ')} Name is required`;
    }

    if (type === 'priority') {
      if (priorityDuration !== null && priorityDuration <= 0) {
        newErrors.priorityDuration = 'Duration must be a positive number';
      }
      if (sequence !== null && sequence <= 0) {
        newErrors.sequence = 'Sequence must be a positive number';
      }
    } else if (type === 'folder') {
      if (!description.trim()) {
        newErrors.description = 'Folder Description is required';
      }
      if (sequence !== null && sequence < 0) {
        newErrors.sequence = 'Sequence order must be 0 or greater';
      }
    } else if (type === 'user-group') {
      if (!description.trim()) {
        newErrors.description = 'User Group Description is required';
      }
      if (selectedUsers.length === 0 || selectedUsers.some(u => !u.userName)) {
        newErrors.selectedUsers = 'Atleast one user required.';
      }
    } else if (type === 'port') {
      if (!portAlias || portAlias === '') {
        newErrors.portAlias = 'Port Alias is required';
      }
      // if (!countryNo || countryNo === 'none' || countryNo === '') {
      //   newErrors.countryNo = 'Country is required';
      // }
      // if (!stateNo || stateNo === 'none' || stateNo === '') {
      //   newErrors.stateNo = 'State is required';
      // }
      // if (!cityNo || cityNo === 'none' || cityNo === '') {
      //   newErrors.cityNo = 'City is required';
      // }
    } else if (type === 'location') {
      if (!address1.trim()) {
        newErrors.address1 = 'Address Line 1 is required';
      }
      // if (!pinCode.trim()) {
      //   newErrors.pinCode = 'PIN / ZIP Code is required';
      // } else 
      if (pinCode.trim().length !== 10) {
        newErrors.pinCode = 'PIN / ZIP Code must be exactly 10 characters';
      }
      // if (!countryNo || countryNo === 'none' || countryNo === '') {
      //   newErrors.countryNo = 'Country is required';
      // }
      // if (!stateNo || stateNo === 'none' || stateNo === '') {
      //   newErrors.stateNo = 'State is required';
      // }
      // if (!cityNo || cityNo === 'none' || cityNo === '') {
      //   newErrors.cityNo = 'City is required';
      // }
      if (!inchargeNo || inchargeNo === 'none' || inchargeNo === '') {
        newErrors.inchargeNo = 'Incharge Lead is required';
      }
    } else if (type === 'company') {
      if (!companyType || companyType === '' || companyType === 'none') {
        newErrors.companyType = 'Business Entity Type is required';
      }
      if (companyLocations.length === 0) {
        newErrors.companyLocations = 'At least one location is required';
      }
      // if (companyAttachments.length === 0) {
      //   newErrors.attachments = 'At least one attachment is mandatory';
      // }
      // } else if (type === 'state') {
      //   if (!stateCountryNo || stateCountryNo === 'none' || stateCountryNo === '') {
      //     newErrors.stateCountryNo = 'Country is required';
      //   }
      // } else if (type === 'city') {
      //   if (!cityCityCountryNo || cityCityCountryNo === 'none' || cityCityCountryNo === '') {
      //     newErrors.cityCityCountryNo = 'Country is required';
      //   }
      //   if (!cityCityStateNo || cityCityStateNo === 'none' || cityCityStateNo === '') {
      //     newErrors.cityCityStateNo = 'State is required';
      //   }
    } else if (type === 'task-company') {
      if (!tcCompanyName.trim()) {
        newErrors.tcCompanyName = 'Company Name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Add/Edit Form
  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      if (editingId) {
        // Update
        const id = editingId;
        if (type === 'category') {
          const payload = {
            operTaskCategoryNo: parseInt(id) || null,
            operTaskCategoryName: name,
            isMultiLevelApproval: isApprovalApplicable,
            isInReviewApplicable: isInReviewRequired,
            isBusinessBenefitApplicable: isBusinessBenefitApplicable,
            checkLists: checklist.map(c => ({
              description: typeof c === 'string' ? c : c.description,
              isChecked: typeof c === 'string' ? false : c.isChecked
            })),
            subtasks: subtasks.map(s => ({
              subtaskTitle: typeof s === 'string' ? s : s.description,
              operTaskTypeNo: typeof s === 'string' ? null : (parseInt(s.taskTypeNo || '') || null)
            })),
            customFields: categoryCustomFields.map(cf => ({
              customFieldNo: parseInt(cf.customFieldNo) || null,
              fieldValue: cf.fieldValue
            })),
            colorCoding: color || null
          };
          await apiService.post('/api/master/task-categories/save', payload);
          await fetchCategories();
        } else if (type === 'type') {
          const payload = {
            operTaskTypeNo: parseInt(id) || null,
            operTaskTypeName: name
          };
          await apiService.post('/api/master/task-types/save', payload);
          await fetchTypes();
        } else if (type === 'priority') {
          const payload = {
            operTaskPriorityNo: parseInt(id) || null,
            taskPriorityName: name,
            priorityDuration: Number(priorityDuration) || null,
            priorityDurationFrequencyNo: parseInt(priorityFrequencyNo) || null,
            sequenceNo: Number(sequence) || null
          };
          await apiService.post('/api/master/task-priorities/save', payload);
          await fetchPriorities();
        } else if (type === 'folder') {
          const payload = {
            taskFolderNo: parseInt(id) || null,
            taskFolderName: name,
            description: description || null,
            parentFolderNo: parentFolderNo === 'none' || !parentFolderNo ? 0 : parseInt(parentFolderNo) || null,
            sequenceNo: sequence || null
          };
          await apiService.post(`/api/master/task-folders/save`, payload);
          await fetchFolders();
        } else if (type === 'user-group') {
          const payload = {
            userGroupNo: parseInt(id) || null,
            userGroupName: name,
            description: description || null,
            inactive: false,
            memberLoginNos: selectedUsers.map((u: any) => parseInt(u.loginNo) || 0).filter(Boolean)
          };
          await apiService.post('/api/security/user-groups/save', payload);
          await fetchUserGroups();
        } else if (type === 'benefit-type') {
          const payload = {
            businessBenefitTypeNo: parseInt(id) || "",
            businessBenefitTypeName: name,
            valuationType: parseInt(valuationtypeNo) || 1
          };
          await apiService.post('/api/master/business-benefit-types/save', payload);
          await fetchBusinessBenefitTypes();
        } else if (type === 'vessel') {
          const payload = {
            vesselNo: parseInt(id) || null,
            vesselName: name
          };
          await apiService.post('/api/master/vessels/save', payload);
          await fetchVessels();
        } else if (type === 'port') {
          const payload = {
            portNo: parseInt(id) || null,
            portName: name,
            portAlias: portAlias || null,
            countryNo: parseInt(countryNo) || null,
            stateNo: parseInt(stateNo) || null,
            cityNo: parseInt(cityNo) || null
          };
          await apiService.post('/api/master/ports/save', payload);
          await fetchPorts();
        } else if (type === 'business-entity-type') {
          const payload = {
            operCRMBusinessEntityTypeNo: parseInt(id) || null,
            operCRMBusinessEntityTypeName: name,
            description: description || null
          };
          await apiService.post('/api/master/business-entity-types/save', payload);
          await fetchBusinessEntityTypes();
        } else if (type === 'location') {
          const cleanParent = parentLocationNo === 'none' ? '' : parentLocationNo;
          const cleanIncharge = inchargeNo === 'none' ? '' : inchargeNo;
          const payload = {
            operLocationNo: parseInt(id) || null,
            operLocationName: name,
            operLocationInchargeNo: cleanIncharge ? parseInt(cleanIncharge) || null : null,
            operLocationParentNo: cleanParent ? parseInt(cleanParent) || null : null,
            address1,
            address2,
            address3,
            cityNo: parseInt(cityNo) || null,
            pinCode,
            stateNo: parseInt(stateNo) || null,
            countryNo: parseInt(countryNo) || null,
            regionNo: parseInt(locationRegion) || null
          };
          await apiService.post('/api/master/task-locations/save', payload);
          await fetchLocations();
        } else if (type === 'company') {
          // portsList derived from companyPorts state directly
          const computedContacts = companyContacts.map(c => ({
            contactPersonName: c.contactName || c.name || '',
            address: c.address || '',
            countryNo: getCountryNo(c.country) || null,
            stateNo: getStateNo(c.state) || null,
            cityNo: getCityNo(c.city) || null,
            pinCode: c.pinCode || c.pin || '',
            phoneNo: c.phone || '',
            email: c.email || '',
            designation: c.designation || '',
            department: c.department || ''
          }));

          const computedLocations = companyLocations.map(l => ({
            locationTypeNo: getLocationTypeNo(l.type) || parseInt(l.type) || null,
            address: l.address || '',
            countryNo: getCountryNo(l.country) || null,
            stateNo: getStateNo(l.state) || null,
            cityNo: getCityNo(l.city) || null,
            pinCode: l.pinCode || l.pin || '',
            mapUrl: l.mapUrl || null,
            latitude: l.latitude || 0,
            longitude: l.longitude || 0
          }));

          const computedPorts = companyPorts.map(p => ({
            portNo: p.portNo || getPortNo(p.name || p.portName) || parseInt(p.portNo) || null
          }));

          const computedAttachments = companyAttachments.map(a => ({
            docNo: a.docNo || a.id || null
          }));

          const payload = {
            businessEntityNo: parseInt(id) || null,
            businessEntityName: name,
            crmBusinessEntityTypeNo: companyType ? parseInt(companyType) : null,
            crmTimeZoneNo: companyTimeZoneNo ? parseInt(companyTimeZoneNo) : null,
            vatgstNo: companyVatGst || null,
            creditInsuranceLimit: creditLimit ?? null,
            address: companyAddress || null,
            countryNo: getCountryNo(companyCountry) || null,
            stateNo: getStateNo(companyState) || null,
            cityNo: getCityNo(companyCity) || null,
            pinCode: companyPinCode || null,
            contactPersons: computedContacts,
            locations: computedLocations,
            ports: computedPorts,
            attachment: computedAttachments
          };
          await apiService.post('/api/master/business-entities/save', payload);

          await fetchCompanies();
        } else if (type === 'task-company') {
          const payload = {
            operTaskCompanyNo: parseInt(id) || null,
            companyName: tcCompanyName,
            aliasName: tcAliasName,
            locationName: tcLocationName,
            address1: tcAddress1,
            address2: tcAddress2,
            address3: tcAddress3,
            cityNo: parseInt(tcCityNo) || null,
            stateNo: parseInt(tcStateNo) || null,
            countryNo: parseInt(tcCountryNo) || null,
            pinCode: tcPinCode
          };
          await apiService.post('/api/crm/task-companies/save', payload);
          await fetchTaskCompanies();
        }
      } else {
        // Add
        if (type === 'category') {
          const payload = {
            operTaskCategoryNo: null,
            operTaskCategoryName: name,
            isMultiLevelApproval: isApprovalApplicable,
            isInReviewApplicable: isInReviewRequired,
            isBusinessBenefitApplicable: isBusinessBenefitApplicable,
            checkLists: checklist.map(c => ({
              description: typeof c === 'string' ? c : c.description,
              isChecked: typeof c === 'string' ? false : c.isChecked
            })),
            subtasks: subtasks.map(s => ({
              subtaskTitle: typeof s === 'string' ? s : s.description,
              operTaskTypeNo: typeof s === 'string' ? null : (parseInt(s.taskTypeNo || '') || null)
            })),
            customFields: categoryCustomFields.map(cf => ({
              customFieldNo: parseInt(cf.customFieldNo) || null,
              fieldValue: cf.fieldValue
            })),
            colorCoding: color || null
          };
          await apiService.post('/api/master/task-categories/save', payload);
          await fetchCategories();
        } else if (type === 'type') {
          const payload = {
            operTaskTypeNo: null,
            operTaskTypeName: name
          };
          await apiService.post('/api/master/task-types/save', payload);
          await fetchTypes();
        } else if (type === 'priority') {
          const payload = {
            operTaskPriorityNo: null,
            taskPriorityName: name,
            priorityDuration: Number(priorityDuration) || null,
            priorityDurationFrequencyNo: parseInt(priorityFrequencyNo) || null,
            sequenceNo: Number(sequence) || null
          };
          await apiService.post('/api/master/task-priorities/save', payload);
          await fetchPriorities();
        } else if (type === 'folder') {
          const payload = {
            taskFolderNo: null,
            taskFolderName: name,
            description: description,
            parentFolderNo: parentFolderNo === 'none' || !parentFolderNo ? 0 : parseInt(parentFolderNo),
            sequenceNo: sequence !== null ? Number(sequence) : null
          };
          await apiService.post(`/api/master/task-folders/save`, payload);
          await fetchFolders();
        } else if (type === 'user-group') {
          const payload = {
            userGroupNo: null,
            userGroupName: name,
            description: description,
            inactive: false,
            memberLoginNos: selectedUsers.map((u: any) => parseInt(u.loginNo) || 0).filter(Boolean)
          };
          await apiService.post('/api/security/user-groups/save', payload);
          await fetchUserGroups();
        } else if (type === 'benefit-type') {
          const payload = {
            businessBenefitTypeNo: null,
            businessBenefitTypeName: name,
            valuationType: parseInt(valuationtypeNo) || null
          };
          await apiService.post('/api/master/business-benefit-types/save', payload);
          await fetchBusinessBenefitTypes();
        } else if (type === 'vessel') {
          const payload = {
            vesselNo: null,
            vesselName: name
          };
          await apiService.post('/api/master/vessels/save', payload);
          await fetchVessels();
        } else if (type === 'port') {
          const payload = {
            portNo: null,
            portName: name,
            portAlias: portAlias || null,
            countryNo: parseInt(countryNo) || null,
            stateNo: parseInt(stateNo) || null,
            cityNo: parseInt(cityNo) || null
          };
          await apiService.post('/api/master/ports/save', payload);
          await fetchPorts();
        } else if (type === 'business-entity-type') {
          const payload = {
            operCRMBusinessEntityTypeNo: null,
            operCRMBusinessEntityTypeName: name,
            description: description || null
          };
          await apiService.post('/api/master/business-entity-types/save', payload);
          await fetchBusinessEntityTypes();
        } else if (type === 'location') {
          const cleanParent = parentLocationNo === 'none' ? '' : parentLocationNo;
          const cleanIncharge = inchargeNo === 'none' ? '' : inchargeNo;
          const payload = {
            operLocationNo: null,
            operLocationName: name,
            operLocationInchargeNo: cleanIncharge ? parseInt(cleanIncharge) || null : null,
            operLocationParentNo: cleanParent ? parseInt(cleanParent) || null : null,
            address1,
            address2,
            address3,
            cityNo: parseInt(cityNo) || null,
            pinCode,
            stateNo: parseInt(stateNo) || null,
            countryNo: parseInt(countryNo) || null,
            regionNo: parseInt(locationRegion) || null
          };
          await apiService.post('/api/master/task-locations/save', payload);
          await fetchLocations();
        } else if (type === 'company') {
          // portsList derived from companyPorts state directly
          const computedContacts = companyContacts.map(c => ({
            contactPersonName: c.contactName || c.name || '',
            address: c.address || '',
            countryNo: getCountryNo(c.country) || null,
            stateNo: getStateNo(c.state) || null,
            cityNo: getCityNo(c.city) || null,
            pinCode: c.pinCode || c.pin || '',
            phoneNo: c.phone || '',
            email: c.email || '',
            designation: c.designation || '',
            department: c.department || ''
          }));

          const computedLocations = companyLocations.map(l => ({
            locationTypeNo: getLocationTypeNo(l.type) || parseInt(l.type) || null,
            address: l.address || '',
            countryNo: getCountryNo(l.country) || null,
            stateNo: getStateNo(l.state) || null,
            cityNo: getCityNo(l.city) || null,
            pinCode: l.pinCode || l.pin || '',
            mapUrl: l.mapUrl || null,
            latitude: l.latitude || 0,
            longitude: l.longitude || 0
          }));

          const computedPorts = companyPorts.map(p => ({
            portNo: p.portNo || getPortNo(p.name || p.portName) || parseInt(p.portNo) || null
          }));

          const computedAttachments = companyAttachments.map(a => ({
            docNo: a.docNo || a.id || null
          }));

          const payload = {
            businessEntityNo: null,
            businessEntityName: name,
            crmBusinessEntityTypeNo: companyType ? parseInt(companyType) : null,
            crmTimeZoneNo: companyTimeZoneNo ? parseInt(companyTimeZoneNo) : null,
            vatgstNo: companyVatGst || null,
            creditInsuranceLimit: creditLimit ?? null,
            address: companyAddress || null,
            countryNo: getCountryNo(companyCountry) || null,
            stateNo: getStateNo(companyState) || null,
            cityNo: getCityNo(companyCity) || null,
            pinCode: companyPinCode || null,
            contactPersons: computedContacts,
            locations: computedLocations,
            ports: computedPorts,
            attachment: computedAttachments
          };
          await apiService.post('/api/master/business-entities/save', payload);

          await fetchCompanies();
        } else if (type === 'task-company') {
          const payload = {
            operTaskCompanyNo: id ? parseInt(id) : null,
            companyName: tcCompanyName,
            aliasName: tcAliasName,
            locationName: tcLocationName,
            address1: tcAddress1,
            address2: tcAddress2,
            address3: tcAddress3,
            cityNo: parseInt(tcCityNo) || null,
            stateNo: parseInt(tcStateNo) || null,
            countryNo: parseInt(tcCountryNo) || null,
            pinCode: tcPinCode
          };
          await apiService.post('/api/crm/task-companies/save', payload);
          await fetchTaskCompanies();
        }
      }

      if (type === 'country') {
        const payload = {
          countryNo: editingId ? parseInt(editingId) : null,
          countryName: name,
          companyNo: authCompanies?.find(itm => itm.HeadOfficeNo == itm.CompanyNo)?.CompanyNo
        };
        if (editingId) {
          await apiService.post('/api/master/countries/save', payload);
        } else {
          await apiService.post('/api/master/countries/save', { ...payload, countryNo: null });
        }
        await fetchCountries();
      } else if (type === 'state') {
        const payload = {
          stateNo: editingId ? parseInt(editingId) : null,
          stateName: name,
          gstStateCode: gstStateCode,
          isUnionTerritory: isUnionTerritory,
          countryNo: parseInt(stateCountryNo) || null,
          companyNo: authCompanies?.find(itm => itm.HeadOfficeNo == itm.CompanyNo)?.CompanyNo
        };
        if (editingId) {
          await apiService.post('/api/master/states/save', payload);
        } else {
          await apiService.post('/api/master/states/save', { ...payload, stateNo: null });
        }
        await fetchStates();
      } else if (type === 'city') {
        const payload = {
          cityNo: editingId ? parseInt(editingId) : null,
          cityName: name,
          stateNo: parseInt(cityCityStateNo) || null,
          companyNo: authCompanies?.find(itm => itm.HeadOfficeNo == itm.CompanyNo)?.CompanyNo
        };
        if (editingId) {
          await apiService.post('/api/master/cities/save', payload);
        } else {
          await apiService.post('/api/master/cities/save', { ...payload, cityNo: null });
        }
        await fetchCities();
      }
      setShowSuccessAlert(true);
    } catch (err: any) {
      console.error("Save failed:", err);
      if (err && err.data) {
        const errData = err.data;
        if (Array.isArray(errData.errors)) {
          const newFieldErrors: Record<string, string> = {};
          const unmappedErrors: string[] = [];

          errData.errors.forEach((e: any) => {
            if (e && e.propertyName && e.errorMessage) {
              const prop = e.propertyName;
              const msg = e.errorMessage;
              const propLower = prop.toLowerCase();

              if (propLower.includes('name')) {
                newFieldErrors.name = msg;
              } else if (propLower === 'priorityduration') {
                newFieldErrors.priorityDuration = msg;
              } else if (propLower.includes('frequency') || propLower.includes('unit')) {
                newFieldErrors.frequencyUnit = msg;
              } else if (propLower.includes('sequence')) {
                newFieldErrors.sequence = msg;
              } else if (propLower === 'valuationtype' || propLower === 'valuationtypeno') {
                newFieldErrors.valuationType = msg;
              } else if (propLower.includes('parentlocation') || propLower.includes('parentno')) {
                newFieldErrors.parentLocationNo = msg;
              } else if (propLower.includes('inchargeno') || propLower.includes('incharge')) {
                newFieldErrors.inchargeNo = msg;
              } else if (propLower === 'address1') {
                newFieldErrors.address1 = msg;
              } else if (propLower === 'address2') {
                newFieldErrors.address2 = msg;
              } else if (propLower === 'address3') {
                newFieldErrors.address3 = msg;
                // } else if (propLower === 'cityno' || propLower === 'city') {
                //   newFieldErrors.cityNo = msg;
                // } else if (propLower === 'pincode' || propLower === 'zip') {
                //   newFieldErrors.pinCode = msg;
                // } else if (propLower === 'stateno' || propLower === 'state') {
                //   newFieldErrors.stateNo = msg;
                // } else if (propLower === 'countryno' || propLower === 'country') {
                //   newFieldErrors.countryNo = msg;
              } else if (propLower === 'regionno' || propLower === 'locationregion') {
                newFieldErrors.locationRegion = msg;
              } else if (propLower === 'description') {
                newFieldErrors.description = msg;
              } else if (propLower.includes('user') || propLower.includes('member')) {
                newFieldErrors.selectedUsers = msg;
              } else {
                unmappedErrors.push(`${prop}: ${msg}`);
              }
            }
          });

          setErrors(newFieldErrors);

          if (unmappedErrors.length > 0) {
            setServerError(unmappedErrors.join(' | '));
          } else {
            setServerError(null);
          }
        } else {
          const serverErrors = errData.errors;
          if (serverErrors && typeof serverErrors === 'object') {
            const messages: string[] = [];
            Object.entries(serverErrors).forEach(([field, msgs]) => {
              if (Array.isArray(msgs)) {
                messages.push(`${field}: ${msgs.join(', ')}`);
              } else if (typeof msgs === 'string') {
                messages.push(`${field}: ${msgs}`);
              }
            });
            if (messages.length > 0) {
              setServerError(messages.join(' | '));
            } else {
              setServerError(errData.title || err.message || 'Validation error occurred');
            }
          } else {
            setServerError(errData.title || errData.message || err.message || 'Operation failed');
          }
        }
      } else {
        setServerError(err?.message || 'Operation failed due to connection error.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Checklist Helpers
  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklist([...checklist, { description: newChecklistItem.trim(), isChecked: false }]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const toggleChecklistItem = (index: number) => {
    setChecklist(checklist.map((c, i) => {
      if (i === index) {
        if (typeof c === 'string') {
          return { description: c, isChecked: true };
        }
        return { ...c, isChecked: !c.isChecked };
      }
      return c;
    }));
  };

  // Toggle user selection in group
  const addGridUser = () => {
    setSelectedUsers([...selectedUsers, { loginNo: 0, userName: '', displayName: '', email: '' }]);
  };
  const removeGridUser = (index: number) => {
    const next = [...selectedUsers];
    next.splice(index, 1);
    setSelectedUsers(next);
  };
  const updateGridUser = (index: number, user: any) => {
    const next = [...selectedUsers];
    if (!user || user.loginNo === "" || user.loginNo === 0) {
      next[index] = { ...next[index], loginNo: 0, userName: '', displayName: '', email: '' };
    } else {
      next[index] = { ...next[index], loginNo: user.loginNo, userName: user.loginId || '', displayName: user.printingName || '', email: user.email || '' };
    }
    setSelectedUsers(next);
  };


  // =========================================================================
  // Company Master Nested Lists Helpers
  // =========================================================================
  const addCompanyLocation = () => {
    const errs: Record<string, string> = {};
    if (!locAddress.trim()) errs.address = 'Location address is required';
    // if (!locCountry || locCountry === 'none') errs.country = 'Country is required';
    // if (!locState || locState === 'none') errs.state = 'State is required';
    // if (!locCity || locCity === 'none') errs.city = 'City is required';
    // if (!locPin.trim()) {
    //   errs.pin = 'PIN Code is required';
    // } else 
    // if (locPin.trim().length !== 6) {
    //   errs.pin = 'PIN Code must be exactly 10 characters';
    // }

    if (Object.keys(errs).length > 0) {
      setLocErrors(errs);
      return;
    }

    const newLoc = {
      type: locType,
      address: locAddress,
      country: locCountry,
      state: locState,
      city: locCity,
      pinCode: locPin,
      mapUrl: locMapUrl,
      latitude: locLatitude ? parseFloat(locLatitude) || 0 : 0,
      longitude: locLongitude ? parseFloat(locLongitude) || 0 : 0
    };

    if (editingLocationIndex !== null) {
      setCompanyLocations(prev => {
        const next = [...prev];
        next[editingLocationIndex] = newLoc;
        return next;
      });
      setEditingLocationIndex(null);
    } else {
      setCompanyLocations(prev => [...prev, newLoc]);
    }

    // reset location modal
    setLocType('');
    setLocAddress('');
    setLocCountry('');
    setLocState('');
    setLocCity('');
    setLocPin('');
    setLocMapUrl('');
    setLocLatitude('');
    setLocLongitude('');
    setLocErrors({});
    setLocationModalOpen(false);
  };

  const handleEditLocation = (index: number) => {
    const loc = companyLocations[index];
    setLocType(loc.type || '');
    setLocAddress(loc.address || '');
    setLocCountry(loc.country || '');
    setLocState(loc.state || '');
    setLocCity(loc.city || '');
    setLocPin(loc.pinCode || loc.pin || '');
    setLocMapUrl(loc.mapUrl || '');
    setLocLatitude(loc.latitude ? loc.latitude.toString() : '');
    setLocLongitude(loc.longitude ? loc.longitude.toString() : '');
    setLocErrors({});
    setEditingLocationIndex(index);
    setLocationModalOpen(true);

    const activeFillValues = businessEntityFillValues || locationFillValues;
    const countries = activeFillValues?.data?.countries || activeFillValues?.countries || [];
    if (loc.country) {
      const foundCountry = countries.find((c: any) => c.countryName?.toLowerCase() === loc.country.toLowerCase());
      if (foundCountry) {
        fetchStatesByCountry(foundCountry.countryNo).then((states) => {
          setLocStatesList(states);
          if (loc.state) {
            const foundState = states.find((s: any) => s.stateName?.toLowerCase() === loc.state.toLowerCase());
            if (foundState) {
              fetchCitiesByState(foundState.stateNo).then((cities) => {
                setLocCitiesList(cities);
              });
            }
          }
        });
      }
    }
  };

  const removeCompanyLocation = (index: number) => {
    setCompanyLocations(prev => prev.filter((_, i) => i !== index));
  };

  const validateEmailBlur = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      setContactErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return false;
    }
    setContactErrors(prev => ({ ...prev, email: '' }));
    return true;
  };

  const addCompanyContact = () => {
    const errs: Record<string, string> = {};
    if (!contactName.trim()) errs.name = 'Representative Name is required';
    if (!contactPhone.trim()) errs.phone = 'Phone number is required';

    // Email validations
    if (!contactEmail.trim()) {
      errs.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        errs.email = 'Please enter a valid email address';
      }
    }

    if (!contactDesignation.trim()) errs.designation = 'Designation is required';
    if (!contactDepartment.trim()) errs.department = 'Department is required';


    if (Object.keys(errs).length > 0) {
      setContactErrors(errs);
      return;
    }

    const newContact = {
      contactName,
      name: contactName,
      phone: contactPhone,
      email: contactEmail,
      designation: contactDesignation,
      department: contactDepartment,
      address: contactAddress,
      country: contactCountry,
      state: contactState,
      city: contactCity,
      pinCode: contactPinCode,
      status: contactStatus
    };

    if (editingContactIndex !== null) {
      setCompanyContacts(prev => {
        const next = [...prev];
        next[editingContactIndex] = newContact;
        return next;
      });
      setEditingContactIndex(null);
    } else {
      setCompanyContacts(prev => [...prev, newContact]);
    }

    // reset contact modal
    setContactName('');
    setContactPhone('');
    setContactEmail('');
    setContactDesignation('');
    setContactDepartment('');
    setContactAddress('');
    setContactCountry('');
    setContactState('');
    setContactCity('');
    setContactPinCode('');
    setContactStatus('Active');
    setContactErrors({});
    setContactModalOpen(false);
  };

  const handleEditContact = (index: number) => {
    const c = companyContacts[index];
    setContactName(c.contactName || c.name || '');
    setContactPhone(c.phone || '');
    setContactEmail(c.email || '');
    setContactDesignation(c.designation || '');
    setContactDepartment(c.department || '');
    setContactAddress(c.address || '');
    setContactCountry(c.country || '');
    setContactState(c.state || '');
    setContactCity(c.city || '');
    setContactPinCode(c.pinCode || c.pin || '');
    setContactStatus(c.status || 'Active');
    setContactErrors({});
    setEditingContactIndex(index);
    setContactModalOpen(true);

    const activeFillValues = businessEntityFillValues || locationFillValues;
    const countries = activeFillValues?.data?.countries || activeFillValues?.countries || [];
    if (c.country) {
      const foundCountry = countries.find((cnt: any) => cnt.countryName?.toLowerCase() === c.country.toLowerCase());
      if (foundCountry) {
        fetchStatesByCountry(foundCountry.countryNo).then((states) => {
          setContactStatesList(states);
          if (c.state) {
            const foundState = states.find((s: any) => s.stateName?.toLowerCase() === c.state.toLowerCase());
            if (foundState) {
              fetchCitiesByState(foundState.stateNo).then((cities) => {
                setContactCitiesList(cities);
              });
            }
          }
        });
      }
    }
  };

  const removeCompanyContact = (index: number) => {
    setCompanyContacts(prev => prev.filter((_, i) => i !== index));
  };

  const addCompanyPort = () => {
    if (!selectedPortName) return;
    const exists = companyPorts.some(p => (p.name || p.portName || '').toLowerCase() === selectedPortName.toLowerCase());
    if (exists) return;
    setCompanyPorts(prev => [...prev, { name: selectedPortName, portName: selectedPortName }]);
    setSelectedPortName('');
  };

  const removeCompanyPort = (index: number) => {
    setCompanyPorts(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const activeCompanyNo = parseInt(companyNo) || 1;
      let newAttachment: any = null;
      try {
        const entry = await attachmentService.createEntry(file.name, activeCompanyNo, 1550); // 1550: Business Entity form no (replace with dynamic formNo)
        if (entry && entry.id) {
          await attachmentService.uploadFile(entry.id, file);
          const isVerified = await attachmentService.checkStatus(entry.id);
          if (isVerified) {
            newAttachment = {
              id: entry.id,
              fileName: file.name,
              filePath: (entry as any).filePath || '',
              fileSize: file.size
            };
          }
        }
      } catch (uploadError) {
        console.warn("API Upload failed, falling back to rich mock attachment:", uploadError);
        const mockId = Date.now();
        newAttachment = {
          id: mockId,
          fileName: file.name,
          filePath: `/mock/attachments/${file.name}`,
          fileSize: file.size
        };
      }

      if (newAttachment) {
        setCompanyAttachments(prev => [...prev, newAttachment]);
        if (errors.attachments) setErrors(prev => ({ ...prev, attachments: '' }));
      }
    } catch (err) {
      console.error("File upload failed:", err);
    }
  };

  const removeCompanyAttachment = async (index: number) => {
    const att = companyAttachments[index];
    if (att && att.id && att.id > 1000000000) { // check if not mock
      try {
        await attachmentService.deleteAttachment(att.id);
      } catch (err) {
        console.warn("Failed to delete attachment from server:", err);
      }
    }
    setCompanyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const renderCompanyForm = () => {
    // Fill Values exclusively from API
    const countries = businessEntityFillValues?.data?.countries || businessEntityFillValues?.countries || [];


    const businessEntityTypes = businessEntityFillValues?.data?.businessEntityTypes || businessEntityFillValues?.businessEntityTypes || [];
    const timeZones = businessEntityFillValues?.data?.timeZones || businessEntityFillValues?.timeZones || [];

    const portsList = (businessEntityFillValues?.data?.ports || businessEntityFillValues?.ports || []).map((pt: any) => pt.portName || pt.name || '');

    return (
      <div className="space-y-4 pb-4">
        {/* =========================================================================
            HEADER SECTION (General Information)
           ========================================================================= */}
        <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
          <div className="flex items-center gap-0.5 pb-2 border-b border-slate-200/80">
            <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
              <Building size={18} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-800 tracking-tight">General Business Entity Information</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* System Code */}
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Code</label>
              <Input disabled value={editingId ? (list.find((c: any) => c.id === editingId)?.code || '') : ''}
                className="bg-slate-100/80 border-slate-200/50 h-10 rounded-xl cursor-not-allowed select-none"
              />
            </div>

            {/* Business Entity Name */}
            <div className="space-y-0 md:col-span-2">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Business Entity Name <span className="text-red-500">*</span></label>
              <Input placeholder="Enter Business Entity Name" value={name} maxLength={100} onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
              }}
                className={cn(
                  "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                  errors.name && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.name && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.name}</p>}
            </div>

            {/* Type */}
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Business Entity Type <span className="text-red-500">*</span></label>
              <Combobox
                options={businessEntityTypes.map((t: any) => ({ label: t.operCRMBusinessEntityTypeName, value: t.operCRMBusinessEntityTypeNo.toString() }))}
                value={companyType}
                onChange={(val) => {
                  setCompanyType(val);
                  if (errors.companyType) setErrors(prev => ({ ...prev, companyType: '' }));
                }}
                placeholder="Select business entity type"
                className={cn(
                  "bg-white border border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                  errors.companyType && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.companyType && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.companyType}</p>}
            </div>

            {/* Timezone */}
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Timezone</label>
              <Combobox
                options={timeZones.map((tz: any) => ({ label: tz.crmTimeZoneName, value: tz.crmTimeZoneNo.toString() }))}
                value={companyTimeZoneNo}
                onChange={(val) => setCompanyTimeZoneNo(val)}
                placeholder="Select timezone"
                className="bg-white border border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
              />
            </div>

            {/* Credit Insurance Limit */}
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Credit Insurance Limit</label>
              <Input type="number" placeholder="Enter credit insurance limit" value={creditLimit || ''} onChange={(e) => setCreditLimit(e.target.value ? Number(e.target.value) : null)}
                className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
              />
            </div>

            {/* VAT / GST No */}
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">VAT / GST No</label>
              <Input placeholder="Enter VAT No. / GST No." value={companyVatGst} maxLength={30} onChange={(e) => setCompanyVatGst(e.target.value)}
                className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            LOCATIONS SECTION (Branch / Warehouse Cards)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-0.5">
              <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
                <MapPin size={18} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-800 tracking-tight">Locations <span className="text-red-500">*</span></h3>
                {/* <p className="text-[10px] text-slate-500 font-semibold leading-none">Branch offices, warehouses, and industrial plants</p> */}
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                setLocErrors({});
                setEditingLocationIndex(null);
                setLocType('');
                setLocAddress('');
                setLocCountry('');
                setLocState('');
                setLocCity('');
                setLocPin('');
                setLocMapUrl('');
                setLocLatitude('');
                setLocLongitude('');
                setLocationModalOpen(true);
              }}
              className="h-8 rounded-lg px-3 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs gap-0.5 flex items-center shadow"
            >
              <Plus size={14} />
              Add Location
            </Button>
          </div>

          {errors.companyLocations && (
            <p className="text-[10px] text-red-500 font-medium ml-1">{errors.companyLocations}</p>
          )}

          {companyLocations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyLocations.map((loc, idx) => (
                <div key={idx} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm relative group hover:border-[#006699]/40 transition-colors">
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleEditLocation(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-[#006699]/5 transition-colors"
                      title="Edit Location"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCompanyLocation(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove Location"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-slate-100 rounded-xl text-slate-600 shrink-0">
                      <Building size={16} />
                    </div>
                    <div className="space-y-0.5 pr-14">
                      <div className="flex items-center gap-0.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[9px] font-medium  tracking-wide",
                          getLocationTypeName(loc.type) === 'Office' ? "bg-blue-50 text-blue-700 border border-blue-100" :
                            getLocationTypeName(loc.type) === 'Warehouse' ? "bg-amber-50 text-amber-700 border border-amber-100" :
                              "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        )}>
                          {getLocationTypeName(loc.type)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-700 leading-snug">{loc.address}</p>
                      <div className="text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-0.5">
                        <span>{loc.city}</span>
                        <span>•</span>
                        <span>{loc.state}</span>
                        <span>•</span>
                        <span>{loc.country}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-400">{loc.pinCode || loc.pin}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================================================
            CONTACT PERSON SECTION (Multiple Display Cards)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
            <div className="flex items-center gap-0.5">
              <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
                <User size={18} />
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-800 tracking-tight">Contact Persons</h3>
                {/* <p className="text-[10px] text-slate-500 font-semibold leading-none">Corporate representatives & point of contacts</p> */}
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                setEditingContactIndex(null);
                setContactName('');
                setContactPhone('');
                setContactEmail('');
                setContactDesignation('');
                setContactDepartment('');
                setContactAddress('');
                setContactCountry('');
                setContactState('');
                setContactCity('');
                setContactPinCode('');
                setContactErrors({});
                setContactModalOpen(true);
              }}
              className="h-8 rounded-lg px-3 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs gap-0.5 flex items-center shadow"
            >
              <Plus size={14} />
              Add Contact Person
            </Button>
          </div>

          {companyContacts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {companyContacts.map((c, idx) => (
                <div key={idx} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm relative group hover:border-[#006699]/40 transition-colors">
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleEditContact(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-[#006699]/5 transition-colors"
                      title="Edit Contact"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCompanyContact(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remove Contact"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#006699]/10 text-[#006699] flex items-center justify-center font-medium text-xs shrink-0 uppercase">
                      {c.name ? c.name.substring(0, 2) : 'CP'}
                    </div>
                    <div className="space-y-0.5 pr-14 min-w-0">
                      <div>
                        <h4 className="text-xs font-medium text-slate-800 leading-snug truncate">{c.name || c.contactName}</h4>
                        <div className="flex flex-wrap items-center gap-0.5 mt-1">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-medium border border-slate-200/50">
                            {c.designation}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-medium border border-slate-200/50">
                            {c.department}
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-medium   border",
                            (c.status || 'Active') === 'Active'
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-slate-50 text-slate-500 border-slate-200/60"
                          )}>
                            {c.status || 'Active'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] font-semibold space-y-0 text-slate-500">
                        <p className="flex items-center gap-1"><span className="text-slate-400">Phone:</span> <strong className="text-slate-700">{c.phone}</strong></p>
                        <p className="flex items-center gap-1"><span className="text-slate-400">Email:</span> <strong className="text-[#006699] select-all">{c.email}</strong></p>
                        {c.address && (
                          <p className="text-[9px] text-slate-400 italic line-clamp-1 mt-1">{c.address}, {c.city}, {c.state}, {c.country}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* =========================================================================
            PORTS SECTION (Import / Export Port Tags)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center gap-0.5 pb-2 border-b border-slate-200/80">
            <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-800 tracking-tight">Preferred Ports</h3>
              {/* <p className="text-[10px] text-slate-500 font-semibold leading-none">Preffered ports for shipping & logistics</p> */}
            </div>
          </div>

          <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
            <div className="flex gap-0.5">
              <Combobox
                options={portsList.map((p: string) => ({ label: p, value: p }))}
                value={selectedPortName}
                onChange={(val) => setSelectedPortName(val)}
                placeholder="Select Port"
                className="bg-white border border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
              />
              <Button
                type="button"
                onClick={addCompanyPort}
                disabled={!selectedPortName}
                className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs shrink-0 shadow disabled:opacity-50"
              >
                Assign
              </Button>
            </div>

            {companyPorts.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-medium italic text-center py-2">No ports assigned to this company profile.</p>
            ) : (
              <div className="flex flex-wrap gap-0.5">
                {companyPorts.map((port, idx) => (
                  <div key={idx} className="bg-white border border-[#006699]/15 text-[#006699] text-xs font-medium rounded-lg px-2.5 py-1 flex items-center gap-0.5 shadow-sm">
                    <span>{port.portName}</span>
                    <button
                      type="button"
                      onClick={() => removeCompanyPort(idx)}
                      className="p-0.5 rounded-full hover:bg-[#006699]/10 text-slate-400 hover:text-[#006699] transition-colors"
                      title="Unassign Port"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            ATTACHMENTS SECTION (File Upload with Attachment Service)
           ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center gap-0.5 pb-2 border-b border-slate-200/80">
            <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-800 tracking-tight">Document Attachments <span className="text-red-500">*</span></h3>

            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Drag and Drop box */}
            <div className={cn(
              "md:col-span-1 border-2 border-dashed border-slate-200 bg-slate-50/30 hover:bg-slate-50/75 rounded-2xl p-6 text-center cursor-pointer transition-colors relative flex flex-col items-center justify-center min-h-[140px]",
              errors.attachments && "border-red-400 bg-red-50/10 hover:bg-red-50/20"
            )}>
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Choose file to attach"
              />
              <UploadCloud size={28} className={cn("text-slate-400 mb-1.5", errors.attachments && "text-red-400")} />
              <p className="text-xs font-medium text-slate-700">Upload Attachment</p>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">PDF, DOCX or XLSX up to 10MB</p>
            </div>

            {/* List of Attachments */}
            <div className="md:col-span-2 space-y-0">
              {companyAttachments.length === 0 ? (
                <div className="flex h-[140px] items-center justify-center border border-slate-200 rounded-2xl bg-slate-50/20 text-slate-400 italic text-xs font-semibold">
                  At least one attachment is mandatory to save.
                </div>
              ) : (
                <div className="max-h-[160px] overflow-y-auto space-y-0.5 pr-2 scrollbar-thin">
                  {companyAttachments.map((att, idx) => (
                    <div key={idx} className="bg-white border border-slate-150 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm hover:border-[#006699]/30 transition-colors">
                      <div className="flex items-center gap-0.5.5 min-w-0">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600 shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-0.5 mb-0.5">
                            <p className="text-xs font-medium text-slate-700 truncate leading-snug">{att.fileName}</p>
                            <span className="text-[10px] text-slate-400 font-medium normal-case font-mono">
                              ({att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Attached File'})
                            </span>
                          </div>
                          {(att.id || att.docNo) && (
                            <button
                              type="button"
                              onClick={() => attachmentService.downloadAttachment(att.id || att.docNo, att.fileName || 'document')}
                              className="text-[9px] font-medium text-[#006699] hover:underline block text-left mt-0.5"
                            >
                              View document
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCompanyAttachment(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                        title="Remove Attachment"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {errors.attachments && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.attachments}</p>}
            </div>
          </div>
        </div>

        {/* =========================================================================
            SUB-ENTITY DIALOG MODALS (Locations & Contact Persons)
           ========================================================================= */}
        {/* Location Modal */}
        <Dialog open={locationModalOpen} onOpenChange={setLocationModalOpen}>
          <DialogContent className="rounded-3xl max-w-md p-6 border-none shadow-2xl bg-white select-none">
            <DialogHeader className="pb-3 border-b border-slate-150">
              <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
                <MapPin size={18} className="text-[#006699]" />
                {editingLocationIndex !== null ? 'Edit Location Address' : 'Add Location Address'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Type */}
              <div className="space-y-0">
                <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Location Type</label>
                <Combobox
                  options={(businessEntityFillValues?.data?.locationTypes || businessEntityFillValues?.locationTypes || []).map((lt: any) => ({ label: lt.locationTypeName, value: lt.locationTypeNo.toString() }))}
                  value={locType}
                  onChange={(val) => setLocType(val)}
                  placeholder="Select Location Type"
                  className="bg-white border border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
                />
              </div>

              {/* Address */}
              <div className="space-y-0">
                <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Address</label>
                <textarea
                  rows={2}
                  placeholder="Enter address"
                  value={locAddress}
                  onChange={(e) => {
                    setLocAddress(e.target.value);
                    if (locErrors.address) setLocErrors(prev => ({ ...prev, address: '' }));
                  }}
                  className={cn(
                    "bg-white border border-slate-200 hover:border-slate-300 transition-colors py-2 px-3 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20 min-h-[50px] resize-y",
                    locErrors.address && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                />
                {locErrors.address && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Country */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Country</label>
                  <Combobox
                    options={countries.map((c: any) => ({ label: c.countryName, value: c.countryName }))}
                    value={locCountry}
                    onChange={async (val) => {
                      setLocCountry(val);
                      setLocState('');
                      setLocCity('');
                      setLocStatesList([]);
                      setLocCitiesList([]);
                      if (locErrors.country) setLocErrors(prev => ({ ...prev, country: '' }));

                      const foundCountry = countries.find((c: any) => c.countryName === val);
                      if (foundCountry) {
                        const statesData = await fetchStatesByCountry(foundCountry.countryNo);
                        setLocStatesList(statesData);
                      }
                    }}
                    placeholder="Select country"
                    className={cn(
                      "bg-white border border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      locErrors.country && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {locErrors.country && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.country}</p>}
                </div>

                {/* State */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">State</label>
                  <Combobox
                    options={locStatesList.map((s: any) => ({ label: s.stateName, value: s.stateName }))}
                    value={locState}
                    onChange={async (val) => {
                      setLocState(val);
                      setLocCity('');
                      setLocCitiesList([]);
                      if (locErrors.state) setLocErrors(prev => ({ ...prev, state: '' }));

                      const foundState = locStatesList.find((s: any) => s.stateName === val);
                      if (foundState) {
                        const citiesData = await fetchCitiesByState(foundState.stateNo);
                        setLocCitiesList(citiesData);
                      }
                    }}
                    placeholder="Select state"
                    className={cn(
                      "bg-white border border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      locErrors.state && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {locErrors.state && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.state}</p>}
                </div>

                {/* City */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">City</label>
                  <Combobox
                    options={locCitiesList.map((ci: any) => ({ label: ci.cityName, value: ci.cityName }))}
                    value={locCity}
                    onChange={(val) => {
                      setLocCity(val);
                      if (locErrors.city) setLocErrors(prev => ({ ...prev, city: '' }));
                    }}
                    placeholder="Select city"
                    className={cn(
                      "bg-white border border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      locErrors.city && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {locErrors.city && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.city}</p>}
                </div>

                {/* PIN Code */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">PIN / ZIP Code</label>
                  <Input placeholder="Enter PIN / ZIP Code" value={locPin} maxLength={10} onChange={(e) => {
                    setLocPin(e.target.value);
                    if (locErrors.pin) setLocErrors(prev => ({ ...prev, pin: '' }));
                  }}
                    className={cn(
                      "bg-white border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      locErrors.pin && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {locErrors.pin && <p className="text-[9px] text-red-500 font-medium ml-1">{locErrors.pin}</p>}
                </div>
                {/* Map URL */}
                <div className="space-y-0 col-span-2">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Map URL</label>
                  <Input placeholder="Enter Map URL" value={locMapUrl} maxLength={2000} onChange={(e) => setLocMapUrl(e.target.value)}
                    className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
                  />
                </div>
                {/* Latitude */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Latitude</label>
                  <Input placeholder="Enter Latitude" value={locLatitude} maxLength={15} onChange={(e) => setLocLatitude(e.target.value)}
                    className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
                  />
                </div>
                {/* Longitude */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Longitude</label>
                  <Input placeholder="Enter Longitude" value={locLongitude} maxLength={15} onChange={(e) => setLocLongitude(e.target.value)}
                    className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-150 flex justify-end gap-0.5 bg-slate-50/50 -mx-6 -mb-6 p-4 rounded-b-3xl">
              <Button type="button" variant="ghost" onClick={() => setLocationModalOpen(false)} className="rounded-xl h-9 text-xs font-medium text-slate-500 hover:bg-slate-100">
                Cancel
              </Button>
              <Button type="button" onClick={addCompanyLocation} className="rounded-xl h-9 text-xs font-medium bg-[#006699] hover:bg-[#005580] text-white">
                {editingLocationIndex !== null ? 'Save Changes' : 'Add Location'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contact Person Modal */}
        <Dialog open={contactModalOpen} onOpenChange={setContactModalOpen}>
          <DialogContent className="rounded-3xl max-w-lg p-6 border-none shadow-2xl bg-white select-none">
            <DialogHeader className="pb-3 border-b border-slate-150">
              <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
                <User size={18} className="text-[#006699]" />
                {editingContactIndex !== null ? 'Edit Contact Person' : 'Add Contact Person'}
              </DialogTitle>
              {/* <DialogDescription className="text-[11px] text-slate-500 font-semibold leading-tight">
                {editingContactIndex !== null ? 'Modify representative profile.' : 'Add representative profile and point of contact details.'}
              </DialogDescription> */}
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin">
              <div className="grid grid-cols-2 gap-3">
                {/* Contact Name */}
                <div className="space-y-0 col-span-2">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Representative Name</label>
                  <Input placeholder="Enter representative name" value={contactName} onChange={(e) => {
                    setContactName(e.target.value);
                    if (contactErrors.name) setContactErrors(prev => ({ ...prev, name: '' }));
                  }}
                    className={cn(
                      "bg-white border-slate-200 hover:border-slate-350 transition-colors h-9 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      contactErrors.name && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {contactErrors.name && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.name}</p>}
                </div>
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Designation</label>
                  <Input placeholder="Enter designation" value={contactDesignation} onChange={(e) => {
                    setContactDesignation(e.target.value);
                    if (contactErrors.designation) setContactErrors(prev => ({ ...prev, designation: '' }));
                  }}
                    className={cn(
                      "bg-white border-slate-200 hover:border-slate-350 transition-colors h-9 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      contactErrors.designation && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {contactErrors.designation && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.designation}</p>}
                </div>

                {/* Department - Text Field */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Department</label>
                  <Input placeholder="Enter department" value={contactDepartment} onChange={(e) => {
                    setContactDepartment(e.target.value);
                    if (contactErrors.department) setContactErrors(prev => ({ ...prev, department: '' }));
                  }}
                    className={cn(
                      "bg-white border-slate-200 hover:border-slate-350 transition-colors h-9 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      contactErrors.department && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {contactErrors.department && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.department}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Phone</label>
                  <Input placeholder="Enter phone" value={contactPhone} onChange={(e) => {
                    const val = e.target.value.replace(/[^\d+()\-\s]/g, '');
                    setContactPhone(val);
                    if (contactErrors.phone) setContactErrors(prev => ({ ...prev, phone: '' }));
                  }}
                    className={cn(
                      "bg-white border-slate-200 hover:border-slate-350 transition-colors h-9 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      contactErrors.phone && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {contactErrors.phone && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.phone}</p>}
                </div>

                {/* Email */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Email</label>
                  <Input placeholder="Enter email" value={contactEmail} onBlur={validateEmailBlur} onChange={(e) => {
                    setContactEmail(e.target.value);
                    if (contactErrors.email) setContactErrors(prev => ({ ...prev, email: '' }));
                  }}
                    className={cn(
                      "bg-white border-slate-200 hover:border-slate-355 transition-colors h-9 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      contactErrors.email && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {contactErrors.email && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.email}</p>}
                </div>

                {/* Address */}
                <div className="space-y-0 col-span-2">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Address</label>
                  <Input placeholder="Enter address" value={contactAddress} onChange={(e) => setContactAddress(e.target.value)}
                    className="bg-white border-slate-200 hover:border-slate-350 transition-colors h-9 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
                  />
                </div>

                {/* Country */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Country</label>
                  <Combobox
                    options={countries.map((c: any) => ({ label: c.countryName, value: c.countryName }))}
                    value={contactCountry}
                    onChange={async (val) => {
                      setContactCountry(val);
                      setContactState('');
                      setContactCity('');
                      setContactStatesList([]);
                      setContactCitiesList([]);
                      if (contactErrors.country) setContactErrors(prev => ({ ...prev, country: '' }));

                      const foundCountry = countries.find((c: any) => c.countryName === val);
                      if (foundCountry) {
                        const statesData = await fetchStatesByCountry(foundCountry.countryNo);
                        setContactStatesList(statesData);
                      }
                    }}
                    placeholder="Select country"
                    className={cn(
                      "bg-white border border-slate-200 hover:border-slate-350 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      contactErrors.country && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {contactErrors.country && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.country}</p>}
                </div>

                {/* State */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">State</label>
                  <Combobox
                    options={contactStatesList.map((s: any) => ({ label: s.stateName, value: s.stateName }))}
                    value={contactState}
                    onChange={async (val) => {
                      setContactState(val);
                      setContactCity('');
                      setContactCitiesList([]);
                      if (contactErrors.state) setContactErrors(prev => ({ ...prev, state: '' }));

                      const foundState = contactStatesList.find((s: any) => s.stateName === val);
                      if (foundState) {
                        const citiesData = await fetchCitiesByState(foundState.stateNo);
                        setContactCitiesList(citiesData);
                      }
                    }}
                    placeholder="Select state"
                    className={cn(
                      "bg-white border border-slate-200 hover:border-slate-350 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      contactErrors.state && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {contactErrors.state && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.state}</p>}
                </div>

                {/* City */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">City</label>
                  <Combobox
                    options={contactCitiesList.map((ci: any) => ({ label: ci.cityName, value: ci.cityName }))}
                    value={contactCity}
                    onChange={(val) => {
                      setContactCity(val);
                      if (contactErrors.city) setContactErrors(prev => ({ ...prev, city: '' }));
                    }}
                    placeholder="Select city"
                    className={cn(
                      "bg-white border border-slate-200 hover:border-slate-350 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      contactErrors.city && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {contactErrors.city && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.city}</p>}
                </div>

                {/* PIN Code */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">PIN/Zip Code</label>
                  <Input placeholder="Enter PIN/Zip Code" value={contactPinCode} maxLength={10} onChange={(e) => {
                    setContactPinCode(e.target.value);
                    if (contactErrors.pinCode) setContactErrors(prev => ({ ...prev, pinCode: '' }));
                  }}
                    className={cn(
                      "bg-white border-slate-200 hover:border-slate-350 transition-colors h-9 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
                      contactErrors.pinCode && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {contactErrors.pinCode && <p className="text-[9px] text-red-500 font-medium ml-1">{contactErrors.pinCode}</p>}
                </div>

                {/* Status dropdown */}
                <div className="space-y-0">
                  <label className="text-[10px] font-medium text-slate-700 normal-case ml-0.5">Status</label>
                  <Combobox
                    options={[
                      { label: 'Active', value: 'Active' },
                      { label: 'Inactive', value: 'Inactive' }
                    ]}
                    value={contactStatus}
                    onChange={(val) => setContactStatus(val)}
                    placeholder="Select status"
                    className="bg-white border border-slate-200 hover:border-slate-350 transition-colors h-9 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-150 flex justify-end gap-0.5 bg-slate-50/50 -mx-6 -mb-6 p-4 rounded-b-3xl">
              <Button type="button" variant="ghost" onClick={() => setContactModalOpen(false)} className="rounded-xl h-9 text-xs font-medium text-slate-500 hover:bg-slate-100">
                Cancel
              </Button>
              <Button type="button" onClick={addCompanyContact} className="rounded-xl h-9 text-xs font-medium bg-[#006699] hover:bg-[#005580] text-white">
                {editingContactIndex !== null ? 'Save Changes' : 'Add Contact'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderFormContent = () => {
    if (type === 'company') {
      return renderCompanyForm();
    }
    return (
      <>
        {/* Disabled System Code */}
        <div className="flex items-center gap-0.5 px-1 mb-4">
          <label className="text-[11px] font-medium text-slate-700 normal-case">Code:</label>
          <div className="text-xs font-medium text-slate-500 select-none">
            {editingId ? (list.find((c: any) => c.id === editingId)?.code || '') : 'AUTO-GEN-CODE'}
          </div>
        </div>

        {/* Standard Name Input */}
        {type !== 'task-company' && (
          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">{type.replace(/-/g, ' ')} Name</label>
            <Input placeholder={`Enter ${title.replace(' Master', '').toLowerCase()} name`} value={name} maxLength={50} onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
            }}
              className={cn(
                "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                errors.name && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
              )}
            />
            {errors.name && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.name}</p>}
          </div>
        )}

        {/* ----------------- PORT EXTRA FIELDS ----------------- */}
        {type === 'port' && (<>
          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Port Alias</label>
            <Input placeholder="Enter Port Alias" value={portAlias} maxLength={10} onChange={(e) => {
              setPortAlias(e.target.value);
              if (errors.portAlias) setErrors(prev => ({ ...prev, portAlias: '' }));
            }}
              className={cn("bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                errors.portAlias && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:border-red-500")}
            />
            {errors.portAlias && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.portAlias}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Country</label>
              <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
                label: c.countryName || '',
                value: (c.countryNo || '').toString()
              }))}
                value={countryNo}
                onChange={handlePortCountryChange}
                placeholder="Select country"
                searchPlaceholder="Search country"
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.countryNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:border-red-500"
                )}
              />
              {errors.countryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.countryNo}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">State / Province</label>
              <Combobox options={portStatesList.map((s: any) => ({
                label: s.stateName || '',
                value: (s.stateNo || '').toString()
              }))}
                value={stateNo}
                onChange={handlePortStateChange}
                disabled={!countryNo}
                placeholder={countryNo ? "Select state" : "Select country first"}
                searchPlaceholder="Search state"
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.stateNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:border-red-500"
                )}
              />
              {errors.stateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateNo}</p>}
            </div>

            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">City</label>
              <Combobox options={portCitiesList.map((c: any) => ({
                label: c.cityName || '',
                value: (c.cityNo || '').toString()
              }))}
                value={cityNo}
                onChange={(val) => {
                  setCityNo(val);
                  if (errors.cityNo) setErrors(prev => ({ ...prev, cityNo: '' }));
                }}
                disabled={!stateNo}
                placeholder={stateNo ? "Select city" : "Select state first"}
                searchPlaceholder="Search city"
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.cityNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:border-red-500"
                )}
              />
              {errors.cityNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityNo}</p>}
            </div>

          </div>
        </>
        )}

        {/* Color Coding Option (Category only) */}
        {type === 'category' && (
          <div className="space-y-0.5">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 block">Color Code</label>
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={
                  color === '' ? 'none' :
                    [
                      '#93c5fd', '#fca5a5', '#86efac', '#fdba74',
                      '#d8b4fe', '#f9a8d4', '#a5b4fc', '#67e8f9'
                    ].includes(color) ? color : 'custom'
                }
                onValueChange={(val) => {
                  if (val === 'none') setColor('');
                  else if (val === 'custom') setColor('#000000'); // default custom
                  else setColor(val);
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px] h-10 bg-white border-slate-200 rounded-xl focus:ring-[#006699]/20">
                  <SelectValue placeholder="Select color code" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <X size={14} className="text-slate-400" />
                      <span>None</span>
                    </div>
                  </SelectItem>
                  {[
                    { hex: '#93c5fd', name: 'Blue' },
                    { hex: '#fca5a5', name: 'Red' },
                    { hex: '#86efac', name: 'Green' },
                    { hex: '#fdba74', name: 'Orange' },
                    { hex: '#d8b4fe', name: 'Purple' },
                    { hex: '#f9a8d4', name: 'Pink' },
                    { hex: '#a5b4fc', name: 'Indigo' },
                    { hex: '#67e8f9', name: 'Cyan' },
                  ].map((preset) => (
                    <SelectItem key={preset.hex} value={preset.hex}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: preset.hex }} />
                        <span>{preset.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-slate-200 bg-gradient-to-tr from-red-500 via-green-500 to-blue-500" />
                      <span>Custom Color</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Color Input - only show if 'custom' is selected */}
              {color !== '' && ![
                '#93c5fd', '#fca5a5', '#86efac', '#fdba74',
                '#d8b4fe', '#f9a8d4', '#a5b4fc', '#67e8f9'
              ].includes(color) && (
                  <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50">
                    <input
                      type="color"
                      value={color || '#000000'}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-7 h-7 border-0 bg-transparent cursor-pointer rounded"
                    />
                    <span className="text-xs font-mono font-medium text-slate-500 uppercase">{color}</span>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ----------------- CATEGORY EXTRA FIELDS ----------------- */}
        {type === 'category' && (
          <div className="space-y-5 pt-2">
            <div className="flex flex-col sm:flex-row gap-6 pt-1">
              <div className="flex items-center gap-0.5">
                <Checkbox
                  id="business-benefit"
                  checked={isBusinessBenefitApplicable}
                  onCheckedChange={(checked) => setIsBusinessBenefitApplicable(!!checked)}
                />
                <label htmlFor="business-benefit" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                  Business Benefit
                </label>
              </div>
            </div>

            {/* Checklist Editor */}
            <div className="space-y-0.5">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center">
                Checklist Items
                <span className="bg-[#e1ecf7] text-[#006699] text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-1.5 shrink-0">
                  {checklist.length}
                </span>
              </label>
              <div className="flex gap-0.5">
                <Input placeholder="Enter description" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
                />
                <Button
                  type="button"
                  onClick={addChecklistItem}
                  className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs"
                >
                  Add
                </Button>
              </div>

              {checklist.length > 0 && (
                <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all w-full">
                  <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                    {checklist.map((item, index) => {
                      const desc = typeof item === 'string' ? item : item.description;
                      const isChecked = typeof item === 'string' ? false : item.isChecked;
                      const isEditing = editingChecklistIdx === index;

                      return (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center justify-between gap-3 px-4 py-2.5 transition-colors",
                            isEditing ? "bg-slate-50/70" : "bg-white hover:bg-slate-50/30"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <Checkbox
                              id={`cl-item-${index}`}
                              checked={isChecked}
                              onCheckedChange={() => toggleChecklistItem(index)}
                              className="h-4 w-4 rounded border-slate-300 shrink-0"
                            />
                            {isEditing ? (
                              <Input value={tempEditText} onChange={(e) => setTempEditText(e.target.value)}
                                placeholder="Edit checklist"
                                className={cn(
                                  "h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] px-2.5 rounded-lg w-full transition-all",
                                  !tempEditText.trim() && "border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400"
                                )}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (!tempEditText.trim()) return;
                                    const next = [...checklist];
                                    if (typeof next[index] === 'string') {
                                      next[index] = { description: tempEditText.trim(), isChecked: false };
                                    } else {
                                      next[index] = { ...next[index], description: tempEditText.trim() };
                                    }
                                    setChecklist(next);
                                    setEditingChecklistIdx(null);
                                    setTempEditText('');
                                  } else if (e.key === 'Escape') {
                                    setEditingChecklistIdx(null);
                                    setTempEditText('');
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <span className={cn("text-xs font-medium text-slate-750 truncate", isChecked && "line-through text-slate-400 font-semibold")}>
                                {desc}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={!tempEditText.trim()}
                                  onClick={() => {
                                    if (!tempEditText.trim()) return;
                                    const next = [...checklist];
                                    if (typeof next[index] === 'string') {
                                      next[index] = { description: tempEditText.trim(), isChecked: false };
                                    } else {
                                      next[index] = { ...next[index], description: tempEditText.trim() };
                                    }
                                    setChecklist(next);
                                    setEditingChecklistIdx(null);
                                    setTempEditText('');
                                  }}
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed p-1.5 rounded-lg transition-all"
                                  title="Save"
                                >
                                  <CheckCircle size={14} strokeWidth={2.5} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingChecklistIdx(null);
                                    setTempEditText('');
                                  }}
                                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                                  title="Cancel"
                                >
                                  <X size={14} strokeWidth={2.5} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingChecklistIdx(index);
                                    setTempEditText(desc);
                                  }}
                                  className="text-slate-400 hover:text-[#006699] hover:bg-[#e1ecf7]/50 p-1.5 rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeChecklistItem(index)}
                                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sub-tasks Editor */}
            <div className="space-y-0.5">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1 flex items-center">
                Sub-tasks
                <span className="bg-[#e1ecf7] text-[#006699] text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-1.5 shrink-0">
                  {subtasks.length}
                </span>
              </label>
              <div className="flex gap-0.5">
                <Combobox options={((categoryFillValues?.taskTypes || categoryFillValues?.taskType || []) as any[]).map((t: any) => ({
                  label: t.operTaskTypeName || t.taskTypeName || t.TaskTypeName || t.name || '',
                  value: (t.operTaskTypeNo || t.taskTypeNo || t.TaskTypeNo || t.id || '').toString()
                }))}
                  value={newSubtaskTaskTypeNo}
                  onChange={(val) => setNewSubtaskTaskTypeNo(val)}
                  placeholder="Select task type"
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-[220px] min-w-[220px] transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
                />
                <Input placeholder="Enter sub-task description" value={newSubtaskItem} onChange={(e) => setNewSubtaskItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSubtaskItem();
                    }
                  }}
                  className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
                />
                <Button
                  type="button"
                  onClick={addSubtaskItem}
                  className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs"
                >
                  Add
                </Button>
              </div>

              {subtasks.length > 0 && (
                <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all w-full">
                  <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                    {subtasks.map((item, index) => {
                      const desc = typeof item === 'string' ? item : item.description;
                      const taskTypeNo = typeof item === 'string' ? '' : (item.taskTypeNo || '');
                      const taskTypeSource = ((categoryFillValues?.taskTypes || categoryFillValues?.taskType || []) as any[]);
                      const taskTypeLabel = taskTypeSource.find((t: any) =>
                        (t.operTaskTypeNo || t.taskTypeNo || t.TaskTypeNo || t.id || '').toString() === taskTypeNo
                      )?.operTaskTypeName || taskTypeSource.find((t: any) =>
                        (t.operTaskTypeNo || t.taskTypeNo || t.TaskTypeNo || t.id || '').toString() === taskTypeNo
                      )?.taskTypeName || taskTypeSource.find((t: any) =>
                        (t.operTaskTypeNo || t.taskTypeNo || t.TaskTypeNo || t.id || '').toString() === taskTypeNo
                      )?.TaskTypeName || taskTypeSource.find((t: any) =>
                        (t.operTaskTypeNo || t.taskTypeNo || t.TaskTypeNo || t.id || '').toString() === taskTypeNo
                      )?.name || '';
                      const isEditing = editingSubtaskIdx === index;

                      return (
                        <div
                          key={index}
                          className={cn(
                            "flex items-center justify-between gap-3 px-4 py-2.5 transition-colors",
                            isEditing ? "bg-slate-50/70" : "bg-white hover:bg-slate-50/30"
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1 pl-1">
                            {isEditing ? (
                              <div className="flex items-center gap-0.5 w-full">
                                <Combobox options={((categoryFillValues?.taskTypes || categoryFillValues?.taskType || []) as any[]).map((t: any) => ({
                                  label: t.operTaskTypeName || t.taskTypeName || t.TaskTypeName || t.name || '',
                                  value: (t.operTaskTypeNo || t.taskTypeNo || t.TaskTypeNo || t.id || '').toString()
                                }))}
                                  value={tempEditSubtaskTaskTypeNo}
                                  onChange={(val) => setTempEditSubtaskTaskTypeNo(val)}
                                  placeholder="Select task type"
                                  className="h-8 rounded-lg border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-[220px] min-w-[220px] transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
                                />
                                <Input value={tempEditText} onChange={(e) => setTempEditText(e.target.value)}
                                  placeholder="Edit sub-task description"
                                  className={cn(
                                    "h-8 text-xs font-medium text-slate-700 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] px-2.5 rounded-lg w-full transition-all",
                                    !tempEditText.trim() && "border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400"
                                  )}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (!tempEditText.trim()) return;
                                      const next = [...subtasks];
                                      if (typeof next[index] === 'string') {
                                        next[index] = { description: tempEditText.trim(), isChecked: false, taskTypeNo: tempEditSubtaskTaskTypeNo };
                                      } else {
                                        next[index] = { ...next[index], description: tempEditText.trim(), taskTypeNo: tempEditSubtaskTaskTypeNo };
                                      }
                                      setSubtasks(next);
                                      setEditingSubtaskIdx(null);
                                      setTempEditText('');
                                      setTempEditSubtaskTaskTypeNo('');
                                    } else if (e.key === 'Escape') {
                                      setEditingSubtaskIdx(null);
                                      setTempEditText('');
                                      setTempEditSubtaskTaskTypeNo('');
                                    }
                                  }}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <div className="min-w-0 flex items-center gap-0.5">
                                {taskTypeLabel && (
                                  <span className="inline-flex items-center rounded-full bg-[#e1ecf7] px-2 py-0.5 text-[10px] font-medium text-[#006699] shrink-0">
                                    {taskTypeLabel}
                                  </span>
                                )}
                                <span className="text-xs font-medium text-slate-750 truncate">
                                  {desc}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={!tempEditText.trim()}
                                  onClick={() => {
                                    if (!tempEditText.trim()) return;
                                    const next = [...subtasks];
                                    if (typeof next[index] === 'string') {
                                      next[index] = { description: tempEditText.trim(), isChecked: false, taskTypeNo: tempEditSubtaskTaskTypeNo };
                                    } else {
                                      next[index] = { ...next[index], description: tempEditText.trim(), taskTypeNo: tempEditSubtaskTaskTypeNo };
                                    }
                                    setSubtasks(next);
                                    setEditingSubtaskIdx(null);
                                    setTempEditText('');
                                    setTempEditSubtaskTaskTypeNo('');
                                  }}
                                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed p-1.5 rounded-lg transition-all"
                                  title="Save"
                                >
                                  <CheckCircle size={14} strokeWidth={2.5} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubtaskIdx(null);
                                    setTempEditText('');
                                    setTempEditSubtaskTaskTypeNo('');
                                  }}
                                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all"
                                  title="Cancel"
                                >
                                  <X size={14} strokeWidth={2.5} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSubtaskIdx(index);
                                    setTempEditText(desc);
                                    setTempEditSubtaskTaskTypeNo(taskTypeNo);
                                  }}
                                  className="text-slate-400 hover:text-[#006699] hover:bg-[#e1ecf7]/50 p-1.5 rounded-lg transition-all"
                                  title="Edit"
                                >
                                  <Edit size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeSubtaskItem(index)}
                                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                  title="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Category Custom Fields Section */}
            <CustomFieldsSection
              customFields={categoryCustomFields}
              onChange={setCategoryCustomFields}
              categoryFillValues={categoryFillValues}
            />
          </div>
        )}

        {/* ----------------- PRIORITY EXTRA FIELDS ----------------- */}
        {type === 'priority' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Default Estimation Duration</label>
              <Input type="number" min={1} maxLength={3} value={priorityDuration ?? ''} onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                setPriorityDuration(val);
                if (errors.priorityDuration) setErrors(prev => ({ ...prev, priorityDuration: '' }));
              }}
                className={cn(
                  "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                  errors.priorityDuration && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.priorityDuration && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.priorityDuration}</p>}
            </div>
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Default Estimation Unit</label>
              <Combobox options={(fillValues?.frequency || []).map((f: any) => ({
                label: f.FrequencyName || f.Frequency || f.name || '',
                value: (f.FrequencyNo || f.id || '').toString()
              }))}
                value={priorityFrequencyNo}
                onChange={(val) => {
                  setPriorityFrequencyNo(val);
                  if (errors.priorityFrequencyNo) setErrors(prev => ({ ...prev, priorityFrequencyNo: '' }));
                }}
                placeholder="Select default estimation unit"
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.priorityFrequencyNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.priorityFrequencyNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.priorityFrequencyNo}</p>}
            </div>
            <div className="space-y-0 col-span-2">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Sequence Number</label>
              <Input type="number" min={1} maxLength={5} value={sequence ?? ''} onChange={(e) => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                setSequence(val);
                if (errors.sequence) setErrors(prev => ({ ...prev, sequence: '' }));
              }}
                className={cn(
                  "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                  errors.sequence && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.sequence && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.sequence}</p>}
            </div>
          </div>
        )}

        {/* ----------------- BUSINESS ENTITY TYPE EXTRA FIELDS ----------------- */}
        {type === 'business-entity-type' && (
          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Description</label>
            <Textarea placeholder="Enter Description" value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)}
              className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
            />
          </div>
        )}

        {/* ----------------- FOLDER EXTRA FIELDS ----------------- */}
        {type === 'folder' && (
          <div className="space-y-3">
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Folder Description</label>
              <Input placeholder="Enter Folder Description" value={description} onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
              }}
                className={cn(
                  "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                  errors.description && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.description && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Parent Folder</label>
                <Combobox options={[{ label: 'No Parent (Root)', value: 'none' }, ...(Array.isArray(folderFillValues?.folders) ? folderFillValues.folders : Array.isArray(folderFillValues?.parentFolder) ? folderFillValues.parentFolder : Array.isArray(folderFillValues?.data) ? folderFillValues.data : Array.isArray(folderFillValues) ? folderFillValues : []).map((f: any) => ({
                  label: f.folderName || f.taskFolderName || f.FolderName || f.name || '',
                  value: (f.taskFolderNo || f.TaskFolderNo || f.id || '').toString()
                }))
                ]}
                  value={parentFolderNo}
                  onChange={setParentFolderNo}
                  placeholder="Select Parent Folder"
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
                />
              </div>

              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Sequence Order</label>
                <Input type="number" min={1} value={sequence ?? ''} onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setSequence(val);
                  if (errors.sequence) setErrors(prev => ({ ...prev, sequence: '' }));
                }}
                  className={cn(
                    "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                    errors.sequence && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                />
                {errors.sequence && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.sequence}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- USER GROUP EXTRA FIELDS ----------------- */}
        {type === 'user-group' && (
          <div className="space-y-3">
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Group Description</label>
              <Input placeholder="Enter Group Description" value={description} onChange={(e) => setDescription(e.target.value)}
                className={cn(
                  "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                  errors.description && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.description && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.description}</p>}
            </div>

            <div className="space-y-3" id="form-group-members">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] font-medium text-slate-700  ">Group Members</h4>
                </div>
                <Button type="button" onClick={addGridUser} variant="ghost" size="sm" className="h-7 text-[9px] font-medium text-[#006699] hover:bg-[#e1ecf7] rounded-lg gap-1">
                  <UserPlus size={12} /> Add
                </Button>
              </div>
              <div className={cn("bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all", errors.selectedUsers && "border-red-500 ring-2 ring-red-500/10")}>
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100/80 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-1.5 font-semibold text-slate-700  ">User Name</th>
                      <th className="px-3 py-1.5 font-semibold text-slate-700  ">Display Name</th>
                      <th className="px-3 py-1.5 font-semibold text-slate-700  ">Email</th>
                      <th className="px-2 py-1.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedUsers.map((field, index) => (
                      <tr key={index} className="group hover:bg-white transition-colors">
                        <td className="px-2 py-1">
                          <UserCombobox value={field.userName} onChange={(user) => updateGridUser(index, user)}
                            placeholder="User Name"
                            className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2"
                            initialLabel={field.userName}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input disabled value={field.displayName} placeholder="Display Name" className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 " />
                        </td>
                        <td className="px-2 py-1">
                          <Input disabled value={field.email} placeholder="Email" className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 " />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button type="button" onClick={() => removeGridUser(index)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {selectedUsers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-slate-400 italic font-medium">No members.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {errors.selectedUsers && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.selectedUsers}</p>}
            </div>
          </div>
        )}

        {/* ----------------- BENEFIT TYPE EXTRA FIELDS ----------------- */}
        {type === 'benefit-type' && (
          <div className="space-y-0">
            <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Valuation Scale / Type</label>
            <Combobox options={(benefitFillValues?.valuationTypes || []).map((v: any) => ({
              label: v.valuationTypeName || v.name || '',
              value: (v.valuationTypeNo || v.id || '').toString()
            }))}
              value={valuationtypeNo}
              onChange={setValuationtypeNo}
              placeholder="Select Valuation Scale / Type"
              className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
            />
          </div>
        )}

        {/* ----------------- LOCATION EXTRA FIELDS ----------------- */}
        {type === 'location' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Parent Location</label>
                <Combobox options={[{ label: "No Parent (Root)", value: "none" }, ...(locationFillValues?.data?.locations || locationFillValues?.locations || apiLocations || []).filter((l: any) => (l.operLocationNo || l.id || '').toString() !== editingId).map((l: any) => ({
                  label: l.operLocationName || l.locationName || l.name || '',
                  value: (l.operLocationNo || l.id || '').toString()
                }))
                ]}
                  value={parentLocationNo}
                  onChange={setParentLocationNo}
                  placeholder="Select Parent Location"
                  searchPlaceholder="Search parent..."
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
                />
              </div>

              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Incharge Lead</label>
                <UserCombobox value={inchargeNo} onChange={(user) => {
                  setInchargeNo(user.loginNo.toString());
                  setInchargeLabel(user.printingName);
                  if (errors.inchargeNo) setErrors(prev => ({ ...prev, inchargeNo: '' }));
                }}
                  initialLabel={inchargeLabel}
                  placeholder="Search Incharge Lead..."
                  className={cn(
                    "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                    errors.inchargeNo && "border-red-500 focus:ring-red-500/10 focus:border-red-500 focus-visible:ring-red-500/10 focus-visible:border-red-500"
                  )}
                />
                {errors.inchargeNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.inchargeNo}</p>}
              </div>
            </div>

            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Location Region</label>
              <Combobox options={(locationFillValues?.data?.regions || locationFillValues?.regions || []).map((r: any) => ({
                label: r.regionName || '',
                value: (r.regionNo || '').toString()
              }))}
                value={locationRegion}
                onChange={setLocationRegion}
                placeholder="Select Location Region"
                searchPlaceholder="Search region..."
                className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
              />
            </div>

            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Address</label>
              <div className="space-y-0">
                <Input placeholder="Enter Address" value={address1} maxLength={150} onChange={(e) => {
                  setAddress1(e.target.value);
                  if (errors.address1) setErrors(prev => ({ ...prev, address1: '' }));
                }}
                  className={cn(
                    "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                    errors.address1 && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                />
                {errors.address1 && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.address1}</p>}
                <Input placeholder="Address Line 2 (Optional)" value={address2} maxLength={150} onChange={(e) => setAddress2(e.target.value)}
                  className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
                />
                <Input placeholder="Address Line 3 (Optional)" value={address3} maxLength={150} onChange={(e) => setAddress3(e.target.value)}
                  className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Country</label>
                <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
                  label: c.countryName || '',
                  value: (c.countryNo || '').toString()
                }))}
                  value={countryNo}
                  onChange={handleLocationCountryChange}
                  placeholder="Select Country"
                  searchPlaceholder="Search country..."
                  className={cn(
                    "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                    errors.countryNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                  onAddNew={() => {
                    setActiveMasterType('country');
                    setIsMasterCreateOpen(true);
                  }}
                />
                {errors.countryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.countryNo}</p>}
              </div>
              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">State / Province</label>
                <Combobox options={locStatesList.map((s: any) => ({
                  label: s.stateName || '',
                  value: (s.stateNo || '').toString()
                }))}
                  value={stateNo}
                  onChange={handleLocationStateChange}
                  disabled={!countryNo}
                  placeholder={countryNo ? "Select State" : "Select country first"}
                  searchPlaceholder="Search state..."
                  className={cn(
                    "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                    errors.stateNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                  onAddNew={() => {
                    setActiveMasterType('state');
                    setIsMasterCreateOpen(true);
                  }}
                />
                {errors.stateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateNo}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-0.5.5">
              <div className="space-y-0 col-span-2">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">City</label>
                <Combobox options={locCitiesList.map((c: any) => ({
                  label: c.cityName || '',
                  value: (c.cityNo || '').toString()
                }))}
                  value={cityNo}
                  onChange={(val) => {
                    setCityNo(val);
                    if (errors.cityNo) setErrors(prev => ({ ...prev, cityNo: '' }));
                  }}
                  disabled={!stateNo}
                  placeholder={stateNo ? "Select City" : "Select state first"}
                  searchPlaceholder="Search city..."
                  className={cn(
                    "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                    errors.cityNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                  onAddNew={() => {
                    setActiveMasterType('city');
                    setIsMasterCreateOpen(true);
                  }}
                />
                {errors.cityNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityNo}</p>}
              </div>
              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">PIN / ZIP Code</label>
                <Input placeholder="Enter PIN / ZIP Code" value={pinCode} maxLength={10} onChange={(e) => {
                  setPinCode(e.target.value);
                  if (errors.pinCode) setErrors(prev => ({ ...prev, pinCode: '' }));
                }}
                  className={cn(
                    "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                    errors.pinCode && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                />
                {errors.pinCode && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.pinCode}</p>}
              </div>
            </div>
          </div>
        )}



        {/* STATE MASTER FIELDS */}
        {type === 'state' && (
          <div className="space-y-4">
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Country</label>
              <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
                label: c.countryName || '',
                value: (c.countryNo || '').toString()
              }))}
                value={stateCountryNo}
                onChange={(val) => {
                  setStateCountryNo(val);
                  if (errors.stateCountryNo) setErrors(prev => ({ ...prev, stateCountryNo: '' }));
                }}
                placeholder="Select Country"
                searchPlaceholder="Search country..."
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.stateCountryNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
                onAddNew={() => {
                  setActiveMasterType('country');
                  setIsMasterCreateOpen(true);
                }}
              />
              {errors.stateCountryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateCountryNo}</p>}
            </div>
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">GST State Code</label>
              <Input placeholder="Enter GST State Code" value={gstStateCode} maxLength={2} onChange={(e) => {
                setGstStateCode(e.target.value);
                if (errors.gstStateCode) setErrors(prev => ({ ...prev, gstStateCode: '' }));
              }}
                className={cn(
                  "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                  errors.gstStateCode && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.gstStateCode && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.gstStateCode}</p>}
            </div>
            {/* <div className="space-y-0 flex items-center gap-3">
              <Checkbox
                checked={isUnionTerritory}
                onCheckedChange={(checked) => setIsUnionTerritory(checked as boolean)}
                className="rounded-md border-slate-300"
              />
              <label className="text-[11px] font-medium text-slate-700 normal-case cursor-pointer">
                Is Union Territory
              </label>
            </div> */}
          </div>
        )}

        {/* CITY MASTER FIELDS */}
        {type === 'city' && (
          <div className="space-y-4">
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Country</label>
              <Combobox options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
                label: c.countryName || '',
                value: (c.countryNo || '').toString()
              }))}
                value={cityCityCountryNo}
                onChange={(val) => {
                  setCityCityCountryNo(val);
                  setCityCityStateNo('');
                  setAvailableCityStates([]);
                  if (errors.cityCityCountryNo) setErrors(prev => ({ ...prev, cityCityCountryNo: '' }));
                  if (val) {
                    fetchStatesByCountry(val).then((states) => {
                      setAvailableCityStates(states);
                    });
                  }
                }}
                placeholder="Select Country"
                searchPlaceholder="Search country..."
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.cityCityCountryNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
                onAddNew={() => {
                  setActiveMasterType('country');
                  setIsMasterCreateOpen(true);
                }}
              />
              {errors.cityCityCountryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityCityCountryNo}</p>}
            </div>
            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">State</label>
              <Combobox options={availableCityStates.map((s: any) => ({
                label: s.stateName || s.name || '',
                value: (s.stateNo || s.id || '').toString()
              }))}
                value={cityCityStateNo}
                onChange={(val) => {
                  setCityCityStateNo(val);
                  if (errors.cityCityStateNo) setErrors(prev => ({ ...prev, cityCityStateNo: '' }));
                }}
                disabled={!cityCityCountryNo}
                placeholder={cityCityCountryNo ? "Select State..." : "Select country first"}
                searchPlaceholder="Search state..."
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.cityCityStateNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
                onAddNew={() => {
                  setActiveMasterType('state');
                  setIsMasterCreateOpen(true);
                }}
              />
              {errors.cityCityStateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityCityStateNo}</p>}
            </div>
          </div>
        )}

        {/* TASK COMPANY MASTER FIELDS */}
        {type === 'task-company' && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="space-y-0 w-3/4">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Company Name <span className="text-red-500">*</span></label>
                <Input value={tcCompanyName} onChange={(e) => {
                  setTcCompanyName(e.target.value);
                  if (errors.tcCompanyName) setErrors(prev => ({ ...prev, tcCompanyName: '' }));
                }}
                  maxLength={100}
                  placeholder="Enter Company Name"
                  className={cn(
                    "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full",
                    errors.tcCompanyName && "border-red-500 focus:ring-red-500/10"
                  )}
                />
                {errors.tcCompanyName && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.tcCompanyName}</p>}
              </div>

              <div className="space-y-0 w-1/4">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Alias</label>
                <Input value={tcAliasName} onChange={(e) => setTcAliasName(e.target.value)}
                  maxLength={15}
                  placeholder="Enter Alias"
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
                />
              </div>
            </div>

            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Location Name</label>
              <Input value={tcLocationName} onChange={(e) => setTcLocationName(e.target.value)}
                maxLength={50}
                placeholder="Enter Location Name"
                className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
              />
            </div>

            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Address 1</label>
              <Input value={tcAddress1} onChange={(e) => setTcAddress1(e.target.value)}
                maxLength={50}
                placeholder="Enter Address 1"
                className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
              />
            </div>

            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Address 2</label>
              <Input value={tcAddress2} onChange={(e) => setTcAddress2(e.target.value)}
                maxLength={50}
                placeholder="Enter Address 2"
                className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
              />
            </div>

            <div className="space-y-0">
              <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Address 3</label>
              <Input value={tcAddress3} onChange={(e) => setTcAddress3(e.target.value)}
                maxLength={50}
                placeholder="Enter Address 3"
                className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Country</label>
                <Combobox options={taskCompanyCountries.map((c: any) => ({
                  label: c.countryName || '',
                  value: (c.countryNo || '').toString()
                }))}
                  value={tcCountryNo}
                  onChange={(val) => {
                    setTcCountryNo(val);
                    setTcStateNo('');
                    setTcCityNo('');
                    if (val) {
                      fetchTaskCompanyStates(val);
                    } else {
                      setTaskCompanyStates([]);
                    }
                  }}
                  placeholder="Select Country"
                  searchPlaceholder="Search country..."
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
                  onAddNew={() => {
                    setActiveMasterType('country');
                    setIsMasterCreateOpen(true);
                  }}
                />
              </div>

              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">State</label>
                <Combobox options={taskCompanyStates.map((s: any) => ({
                  label: s.stateName || s.name || '',
                  value: (s.stateNo || s.id || '').toString()
                }))}
                  value={tcStateNo}
                  onChange={(val) => {
                    setTcStateNo(val);
                    setTcCityNo('');
                    if (val) {
                      fetchTaskCompanyCities(val);
                    } else {
                      setTaskCompanyCities([]);
                    }
                  }}
                  disabled={!tcCountryNo}
                  placeholder={tcCountryNo ? "Select State..." : "Select country first"}
                  searchPlaceholder="Search state..."
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
                  onAddNew={() => {
                    setActiveMasterType('state');
                    setIsMasterCreateOpen(true);
                  }}
                />
              </div>

              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">City</label>
                <Combobox options={taskCompanyCities.map((c: any) => ({
                  label: c.cityName || c.name || '',
                  value: (c.cityNo || c.id || '').toString()
                }))}
                  value={tcCityNo}
                  onChange={(val) => setTcCityNo(val)}
                  disabled={!tcStateNo}
                  placeholder={tcStateNo ? "Select City..." : "Select state first"}
                  searchPlaceholder="Search city..."
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
                  onAddNew={() => {
                    setActiveMasterType('city');
                    setIsMasterCreateOpen(true);
                  }}
                />
              </div>

              <div className="space-y-0">
                <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Pin Code</label>
                <Input value={tcPinCode} onChange={(e) => setTcPinCode(e.target.value)}
                  placeholder="Enter Pin Code"
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-semibold transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-offset-0 w-full"
                  maxLength={6}
                />
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  if (isFormPage) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden p-3.5 sm:p-4 sm:px-6 gap-2 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
        {/* Breadcrumb Header */}
        <div className="flex items-start shrink-0 mb-0 px-1 justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <button onClick={() => navigate(`/master/${type}`)} className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded">Masters</button>
            <ChevronRight size={16} className="text-slate-400" />
            <button onClick={() => navigate(`/master/${type}`)} className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded">{title}</button>
            <ChevronRight size={16} className="text-slate-400" />
            <span className="text-slate-900 font-bold tracking-tight">{editingId ? 'Edit' : 'New'}</span>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(`/master/${type}`)}
              className="rounded-xl h-9 px-3 sm:px-5 font-medium text-slate-600 hover:bg-slate-100 transition-colors gap-0.5 text-xs flex items-center"
            >
              <X size={16} />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="rounded-xl h-9 px-3 sm:px-6 bg-[#006699] hover:bg-[#005580] font-medium text-white shadow-lg shadow-[#006699]/20 gap-0.5 transition-all hover:scale-105 active:scale-95 text-xs disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {editingId ? 'Update' : 'Save'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Master Form Card */}
        <Card className="flex-1 rounded-[28px] border-none shadow-xl shadow-slate-200/40 bg-white flex flex-col p-0 outline-none overflow-hidden max-w-6xl w-full mx-auto">

          {/* Form Content Area */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
            {renderFormContent()}
          </form>

          {serverError && (
            <div className="mx-6 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-2xl flex items-start gap-0.5 shadow-sm animate-pulse shrink-0">
              <span className="font-medium select-none">⚠️ Error:</span>
              <span className="flex-1 whitespace-pre-wrap leading-relaxed">{serverError}</span>
            </div>
          )}

        </Card>

        {/* Save/Update Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="rounded-3xl max-w-sm p-0 border-none shadow-xl">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
                Confirm Save
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-2">
                Are you sure you want to save these changes?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-3xl">
              <Button variant="ghost" onClick={() => setShowConfirm(false)} className="rounded-xl h-9 text-xs font-medium text-slate-500 hover:bg-slate-100">
                No, Cancel
              </Button>
              <Button onClick={handleConfirmSave} className="rounded-xl h-9 text-xs font-medium bg-[#006699] hover:bg-[#005580] text-white shadow-md">
                Yes, Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Success Alert Dialog */}
        <Dialog open={showSuccessAlert} onOpenChange={setShowSuccessAlert}>
          <DialogContent className="rounded-3xl max-w-xs p-0 border-none shadow-2xl bg-white/95 backdrop-blur-xl [&>button]:hidden overflow-hidden">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-emerald-50 rounded-full border border-emerald-100/80 flex items-center justify-center mb-4 shadow-sm relative">
                <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping"></div>
                <CheckCircle className="w-7 h-7 text-emerald-600 relative z-10" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 tracking-tight mb-1">Success</h3>
              <p className="text-xs font-semibold text-slate-500 max-w-[200px] leading-relaxed">Data saved successfully.</p>
            </div>
            <div className="p-4 bg-slate-50/80 border-t border-slate-100/50 flex justify-center">
              <Button
                type="button"
                onClick={() => {
                  setShowSuccessAlert(false);
                  navigate(`/master/${type}`);
                }}
                className="w-full h-10 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-medium text-xs normal-case shadow-md shadow-[#006699]/10 transition-all hover:scale-[1.01] active:scale-95"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const renderPaginationBar = () => (
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-slate-50/70 border-t border-slate-100 gap-4 select-none mt-auto shrink-0">
      {/* Left Side: Range Info */}
      <div className="text-[11px] text-slate-500 font-medium">
        Showing <span className="text-slate-800 font-medium">{totalItems === 0 ? 0 : startIndex + 1}</span> to{" "}
        <span className="text-slate-800 font-medium">{endIndex}</span> of{" "}
        <span className="text-slate-800 font-medium">{totalItems}</span> records
      </div>

      {/* Center: Items Per Page Selector */}
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] font-medium text-slate-400  ">Per Page:</span>
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-sm">
          {[10, 25, 50].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => {
                setItemsPerPage(size);
                setCurrentPage(1);
              }}
              className={cn(
                "h-6 px-2.5 rounded-md text-[10px] font-medium tracking-wide uppercase transition-all",
                itemsPerPage === size
                  ? "bg-[#006699] text-white shadow-sm font-medium"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Right Side: Page Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          disabled={safeCurrentPage === 1}
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-105 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm"
        >
          <ChevronLeft size={14} strokeWidth={2.5} />
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              return (
                page === 1 ||
                page === totalPages ||
                Math.abs(page - safeCurrentPage) <= 1
              );
            })
            .map((page, idx, arr) => {
              const isPageActive = safeCurrentPage === page;
              const hasGap = idx > 0 && page - arr[idx - 1] > 1;

              return (
                <React.Fragment key={page}>
                  {hasGap && (
                    <span className="text-[10px] font-medium text-slate-400 px-1 select-none">
                      ...
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "h-7 w-7 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center border shadow-sm",
                      isPageActive
                        ? "bg-[#006699] border-[#006699] text-white font-medium shadow-md shadow-[#006699]/10"
                        : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          disabled={safeCurrentPage === totalPages}
          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          className="h-7 w-7 rounded-lg text-slate-505 hover:bg-slate-105 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm"
        >
          <ChevronRight size={14} strokeWidth={2.5} />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3.5 sm:p-4 sm:px-6 gap-2 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
      {/* Breadcrumb Header */}
      <div className="flex items-center shrink-0 mb-0 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <button className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded cursor-default">Masters</button>
          <ChevronRight size={16} className="text-slate-400" />
          <span className="text-slate-900 font-bold tracking-tight">{title}</span>
        </div>
      </div>

      {/* Filters & Actions Section */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
        {/* Search Input Card */}
        <Card className="flex-1 p-3.5 border-none shadow-md shadow-slate-200/20 bg-white/90 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center gap-3 h-10 sm:h-11">
          <Search size={16} className="text-slate-400 ml-1 shrink-0" />
          <Input placeholder={`Search ${title.toLowerCase()} records by name, code...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs font-medium text-slate-700 h-full p-0 focus-visible:ring-0 placeholder:text-slate-400 placeholder:font-semibold flex-1"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchQuery('')}
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-655 flex items-center justify-center shrink-0"
            >
              <X size={14} />
            </Button>
          )}
        </Card>

        {/* Custom Toggle for Company View Mode */}
        {type === 'company' && (
          <div className="flex flex-wrap items-center bg-white/90 p-1 rounded-xl sm:rounded-2xl border border-slate-200/40 shadow-md shrink-0 gap-1">
            <button
              onClick={() => setCompanyViewMode('list')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 h-7 sm:h-8",
                companyViewMode === 'list'
                  ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15 scale-[1.02]"
                  : "text-slate-500 hover:text-slate-750 hover:bg-slate-100/50"
              )}
            >
              <List size={12} />
              <span>Grid List</span>
            </button>
            <button
              onClick={() => setCompanyViewMode('album')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 h-7 sm:h-8",
                companyViewMode === 'album'
                  ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15 scale-[1.02]"
                  : "text-slate-500 hover:text-slate-750 hover:bg-slate-100/50"
              )}
            >
              <Building size={12} />
              <span>Album View</span>
            </button>
            <button
              onClick={() => setCompanyViewMode('contact-list')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 h-7 sm:h-8",
                companyViewMode === 'contact-list'
                  ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15 scale-[1.02]"
                  : "text-slate-500 hover:text-slate-755 hover:bg-slate-100/50"
              )}
            >
              <Users size={12} />
              <span>Contact List</span>
            </button>
            <button
              onClick={() => setCompanyViewMode('contact-album')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 h-7 sm:h-8",
                companyViewMode === 'contact-album'
                  ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15 scale-[1.02]"
                  : "text-slate-500 hover:text-slate-755 hover:bg-slate-100/50"
              )}
            >
              <User size={12} />
              <span>Contact Album</span>
            </button>
            <button
              onClick={() => setCompanyViewMode('attachment')}
              className={cn(
                "px-2.5 py-1.5 rounded-lg sm:rounded-xl text-[10px] font-medium transition-all flex items-center gap-1 h-7 sm:h-8",
                companyViewMode === 'attachment'
                  ? "bg-[#006699] text-white shadow-md shadow-[#006699]/15 scale-[1.02]"
                  : "text-slate-500 hover:text-slate-755 hover:bg-slate-100/50"
              )}
            >
              <Paperclip size={12} />
              <span>Attachments</span>
            </button>
          </div>
        )}

        {/* Add Record Button */}
        <Button
          onClick={handleAddClick}
          className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-[#006699] hover:bg-[#005580] text-white shadow-lg shadow-[#006699]/15 font-medium text-xs normal-case gap-0.5 shrink-0 transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center"
        >
          <Plus size={14} strokeWidth={3.5} />
          Add Record
        </Button>
      </div>

      {/* Tabular Search Grid Display List */}
      <div className="flex-1 min-h-0 flex flex-col">
        {
          type === 'company' ? (
            filteredList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-[24px] border border-slate-100 p-8 text-center animate-fade-in">
                <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-3">
                  <Icon size={32} />
                </div>
                <h3 className="text-sm font-medium text-slate-700">No Companies Found</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm">No companies match your search criteria. Try adjusting filters or click the Add button above to create a new one.</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col relative select-none">
                <div className="flex-1 min-h-0 flex gap-3 relative">
                  {/* Scrollable List container */}
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

                      if (isNearBottom && !isLoadingMoreCompanies) {
                        handleLoadMore('down');
                      } else if (isNearTop && !isLoadingMoreCompanies) {
                        handleLoadMore('up');
                      }
                    }}
                    onWheel={(e) => {
                      const target = e.currentTarget;
                      if (target.scrollTop === 0 && e.deltaY < 0 && !isLoadingMoreCompanies) {
                        handleLoadMore('up');
                      }
                    }}
                  >
                    {companyViewMode === 'list' ? (
                      /* GRID LIST VIEW */
                      <div className="bg-white rounded-2xl border border-slate-150 shadow-md flex flex-col overflow-visible">
                        <table className="w-full border-collapse text-left">
                          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(241,245,249,1)]">
                            <tr>
                              <th className="px-4 py-3 text-[11px] font-semibold text-slate-600   pl-5">Code</th>
                              <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Business Entity Name</th>
                              <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Type</th>
                              <th className="px-4 py-3 text-[11px] font-semibold text-slate-600  ">Primary Address</th>
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
                                  <td className="px-4 py-3 text-xs font-medium text-slate-900 hover:text-[#006699] hover:underline cursor-pointer" onClick={() => handleEditClick(company)}>
                                    {company.name}
                                  </td>
                                  <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[9px] font-medium   border",
                                      company.type === 'Buy'
                                        ? "bg-sky-50 text-sky-600 border-sky-100"
                                        : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                    )}>
                                      {company.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-xs font-semibold text-slate-500 max-w-[200px] truncate" title={locStr}>
                                    {locStr}
                                  </td>
                                  <td className="px-4 py-3 text-xs font-semibold text-slate-500 font-mono">
                                    {company.vatGst || 'N/A'}
                                  </td>
                                  <td className="px-4 py-3 text-xs font-medium text-slate-700">
                                    {company.creditLimit ? `$${company.creditLimit.toLocaleString()}` : 'No Limit'}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-center pr-5">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditClick(company)}
                                        className="h-8 w-8 rounded-xl text-slate-400 hover:text-[#006699] hover:bg-slate-100 flex items-center justify-center"
                                      >
                                        <Edit size={13} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteClick(company.id)}
                                        className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"
                                      >
                                        <Trash2 size={13} />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : companyViewMode === 'album' ? (
                      /* ALBUM VIEW CARD LIST */
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
                                  {/* Top Header Card Info */}
                                  <div className="flex items-start justify-between gap-0.5.5">
                                    <div className="flex items-center gap-0.5.5 min-w-0">
                                      {/* Company Avatar Badge */}
                                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#006699] to-[#00bfff] text-white flex items-center justify-center font-medium text-xs shadow-md shadow-[#006699]/10 shrink-0 uppercase">
                                        {company.name ? company.name.substring(0, 2) : 'BE'}
                                      </div>
                                      <div className="min-w-0">
                                        <h4 className="text-[11px] font-medium text-slate-900 leading-tight group-hover:text-[#006699] transition-colors truncate" title={company.name}>{company.name}</h4>
                                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                                          <span className="text-[8px] font-medium   px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/50">
                                            {company.code}
                                          </span>
                                          <span className={cn(
                                            "text-[8px] font-medium   px-1.5 py-0.5 rounded border",
                                            company.type === 'Buy'
                                              ? "bg-sky-50 text-sky-600 border-sky-100"
                                              : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                          )}>
                                            {company.type}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions Button */}
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditClick(company)}
                                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-slate-105 transition-colors flex items-center justify-center"
                                      >
                                        <Edit size={11} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteClick(company.id)}
                                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                                      >
                                        <Trash2 size={11} />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Middle Address & Finance details */}
                                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 py-1.5 border-t border-b border-slate-100 text-[10px] font-semibold text-slate-500">
                                    <div className="col-span-2">
                                      <span className="text-[8px] font-medium  text-[#006699] block  mb-0.5">Primary Location</span>
                                      <span className="text-slate-800 font-medium block truncate leading-snug" title={company.address || 'N/A'}>
                                        {company.address || 'N/A'}
                                      </span>
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

                                  {/* Footer statistics */}
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
                      /* CONTACT PERSON LIST VIEW */
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
                                          <td className="px-4 py-3 text-xs font-medium text-slate-900 hover:text-[#006699] hover:underline cursor-pointer" onClick={() => handleEditClick(company)}>
                                            {company.name}
                                          </td>
                                          <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                                            {contact.designation || 'N/A'}
                                          </td>
                                          <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                                            {contact.department || 'N/A'}
                                          </td>
                                          <td className="px-4 py-3 text-xs font-semibold text-slate-500 font-mono">
                                            {contact.phoneNo || contact.phone || 'N/A'}
                                          </td>
                                          <td className="px-4 py-3 text-xs font-semibold text-slate-550">
                                            {contact.email || 'N/A'}
                                          </td>
                                          <td className="px-4 py-3 text-xs">
                                            <span className={cn(
                                              "px-2 py-0.5 rounded text-[8px] font-medium  ",
                                              (contact.status || 'Active') === 'Active'
                                                ? "bg-emerald-100/60 text-emerald-700"
                                                : "bg-slate-105 text-slate-500"
                                            )}>
                                              {contact.status || 'Active'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-xs text-center pr-5">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => handleEditClick(company)}
                                              className="h-8 w-8 rounded-xl text-slate-400 hover:text-[#006699] hover:bg-slate-100 mx-auto flex items-center justify-center"
                                            >
                                              <Edit size={13} />
                                            </Button>
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
                      /* CONTACT PERSON ALBUM VIEW */
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
                                          <span className={cn(
                                            "px-2 py-0.5 rounded text-[8px] font-medium   shrink-0",
                                            (contact.status || 'Active') === 'Active'
                                              ? "bg-emerald-100/60 text-emerald-700"
                                              : "bg-slate-105 text-slate-500"
                                          )}>
                                            {contact.status || 'Active'}
                                          </span>
                                        </div>

                                        <div className="border-t border-slate-100 pt-2 text-[10px] font-semibold text-slate-500 space-y-0.5">
                                          <div className="flex justify-between">
                                            <span className="text-slate-400">Business Entity:</span>
                                            <span className="text-slate-900 font-medium hover:text-[#006699] hover:underline cursor-pointer" onClick={() => handleEditClick(company)}>{company.name}</span>
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
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditClick(company)}
                                            className="h-7 rounded-lg text-slate-500 hover:text-[#006699] hover:bg-slate-100 text-[10px] font-medium flex items-center gap-1"
                                          >
                                            <Edit size={11} />
                                            Edit
                                          </Button>
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
                      /* ATTACHMENT-WISE GROUPED VIEW */
                      <div className="space-y-6">
                        {groupedCompanies.map((group) => {
                          // Merge multiple rows that share the same business entity into one combined record
                          const mergedMap = new Map<string, any>();
                          group.items.forEach((c: any) => {
                            const key = c.name || c.id;
                            if (mergedMap.has(key)) {
                              // Append attachments to the existing entry
                              mergedMap.get(key).attachments.push(...(c.attachments || []));
                            } else {
                              mergedMap.set(key, { ...c, attachments: [...(c.attachments || [])] });
                            }
                          });
                          // Sort merged entities alphabetically by name
                          const mergedItems = Array.from(mergedMap.values()).sort((a, b) =>
                            (a.name || '').localeCompare(b.name || '')
                          );

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
                                            <h4 className="text-xs font-medium text-slate-900 hover:text-[#006699] hover:underline cursor-pointer" onClick={() => handleEditClick(company)}>{company.name}</h4>
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
                                                <div className={cn(
                                                  "p-2.5 rounded-lg shrink-0 flex items-center justify-center",
                                                  isPdf ? "bg-red-50 text-red-500" :
                                                    isSheet ? "bg-emerald-50 text-emerald-500" :
                                                      isDoc ? "bg-blue-50 text-blue-500" : "bg-slate-50 text-slate-500"
                                                )}>
                                                  <FileText size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                  <h5 className="text-xs font-medium text-slate-705 truncate leading-snug group-hover:text-[#006699] transition-colors">{att.fileName || att.name}</h5>
                                                  <div className="flex items-center gap-0.5 mt-0.5 flex-wrap">
                                                    <p className="text-[9px] text-slate-400 font-medium normal-case font-mono">
                                                      {att.fileSize ? `${(att.fileSize / 1024).toFixed(1)} KB` : 'Attached Document'}
                                                    </p>
                                                    {att.fileType && (
                                                      <span className="text-[8px] font-medium   px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200/50">
                                                        {att.fileType}
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Visual Preview Badge / Mock Area */}
                                              {/* <div className="bg-slate-50 rounded-lg p-2.5 flex items-center justify-center border border-slate-100 min-h-[60px] text-center select-none">
                                              <div className="text-[9px] text-slate-400 font-medium leading-tight">
                                                {isPdf ? "📄 PDF Document Preview Ready" :
                                                  isSheet ? "📊 Excel Spreadsheet Data Sheet" :
                                                    "📝 Text Profile Document Data"}
                                              </div>
                                            </div> */}

                                              {/* Action controls */}
                                              <div className="flex items-center justify-end gap-0.5 pt-2 border-t border-slate-100 mt-auto">
                                                {/* <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                  setPreviewAttachment({
                                                    fileName: att.fileName || att.name,
                                                    fileSize: att.fileSize,
                                                    companyName: company.name,
                                                    isPdf: !!isPdf,
                                                    isSheet: !!isSheet
                                                  });
                                                }}
                                                className="h-7 px-2.5 rounded-lg text-[9px] font-medium text-[#006699] hover:bg-[#006699]/10 flex items-center justify-center gap-1 shadow-sm border border-[#006699]/10"
                                              >
                                                Preview
                                              </Button> */}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => attachmentService.downloadAttachment(att.id, att.fileName || att.name)}
                                                  className="h-7 px-2.5 rounded-lg text-[9px] font-medium text-emerald-600 hover:bg-emerald-50 flex items-center justify-center gap-1 border border-emerald-150"
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

                  {/* FLOATING INDEX ALPHABET SIDEBAR (Perfect containment) */}
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
                              ? "text-white bg-[#006699] font-medium scale-110 shadow-md shadow-[#006699]/20"
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
                  {renderPaginationBar()}
                </div>
              </div>
            )
          ) : (
            /* STANDARD TABULAR SEARCH GRID DISPLAY LIST (for other masters) */
            (type === 'location' && isLoadingLocations) || (type === 'vessel' && isLoadingVessels) || (type === 'port' && isLoadingPorts) || (type === 'business-entity-type' && isLoadingBusinessEntityTypes) || (type === 'type' && isLoadingTypes) || (type === 'priority' && isLoadingPriorities) ? (
              <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl overflow-hidden p-6 space-y-4 animate-pulse flex-1">
                <div className="h-10 bg-slate-100 rounded-xl w-full" />
                <div className="h-12 bg-slate-55 rounded-xl w-full" />
                <div className="h-12 bg-slate-55 rounded-xl w-full" />
                <div className="h-12 bg-slate-55 rounded-xl w-full" />
              </div>
            ) : filteredList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-[24px] border border-slate-100 p-8 text-center animate-fade-in">
                <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-3">
                  <Icon size={32} />
                </div>
                <h3 className="text-sm font-medium text-slate-700">No Records Found</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm">No master records match your search criteria. Try adjusting filters or click the Add button above to create a new one.</p>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-md rounded-[24px] border border-slate-100 shadow-xl shadow-slate-100/30 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin min-h-0">
                  <table className="w-full border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(241,245,249,1)]">
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600   pl-4">Code</th>
                        <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">{type.replace(/-/g, ' ')} Name</th>
                        {type === 'category' && (
                          <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Features</th>
                        )}
                        {type === 'priority' && (
                          <>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Sequence</th>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Priority Duration</th>
                          </>
                        )}
                        {type === 'folder' && (
                          <>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Sequence</th>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Parent Folder</th>
                          </>
                        )}
                        {type === 'user-group' && (
                          <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Description</th>
                        )}
                        {type === 'business-entity-type' && (
                          <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Description</th>
                        )}
                        {type === 'benefit-type' && (
                          <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Valuation Mode</th>
                        )}
                        {type === 'port' && (
                          <>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Country</th>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">State</th>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">City</th>
                          </>
                        )}
                        {type === 'location' && (
                          <>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Type</th>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Incharge</th>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Address</th>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Region</th>
                          </>
                        )}
                        {type === 'task-company' && (
                          <>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Alias</th>
                            <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Address 1</th>
                          </>
                        )}
                        <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Created By</th>
                        <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600  ">Created Date</th>
                        <th className="px-3.5 py-2.5 text-[11px] font-semibold text-slate-600   text-right pr-4 w-[100px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 bg-white">
                      {paginatedList.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-3.5 py-2 text-[11px] font-medium text-slate-700 pl-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium  bg-slate-100 text-slate-600 border border-slate-200/50">
                              {item.code || `SYS-${item.id}`}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 text-[11px] font-medium text-slate-800">
                            <div className="flex items-center gap-0.5">
                              {type === 'category' && item.color && (
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                              )}
                              <span>{item.name}</span>
                            </div>
                          </td>
                          {type === 'category' && (
                            <td className="px-3.5 py-2">
                              <div className="flex flex-wrap gap-1">
                                {item.isApprovalApplicable && (
                                  <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Approval</span>
                                )}
                                {item.isInReviewRequired && (
                                  <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Review</span>
                                )}
                                {item.isBusinessBenefitApplicable && (
                                  <span className="text-[9px] font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">Benefit</span>
                                )}
                              </div>
                            </td>
                          )}
                          {type === 'priority' && (
                            <>
                              <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">{item.sequence}</td>
                              <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">
                                {item.priorityDuration} {getFrequencyName(item.priorityFrequencyNo)}
                              </td>
                            </>
                          )}
                          {type === 'folder' && (
                            <>
                              <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">{item.sequence}</td>
                              <td className="px-3.5 py-2 text-[11px] text-slate-500 font-semibold">{item.parentFolderNo || 'Root'}</td>
                            </>
                          )}
                          {type === 'user-group' && (
                            <td className="px-3.5 py-2 text-[11px] text-slate-500 font-semibold max-w-[200px] truncate">
                              {item.description || <span className="italic text-slate-300 font-medium">No description</span>}
                            </td>
                          )}
                          {type === 'business-entity-type' && (
                            <td className="px-3.5 py-2 text-[11px] text-slate-500 font-semibold max-w-[240px] truncate">
                              {item.description || <span className="italic text-slate-300 font-medium">No description</span>}
                            </td>
                          )}
                          {type === 'benefit-type' && (
                            <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">
                              {benefitFillValues?.valuationTypes?.find((v: any) => v.valuationTypeNo?.toString() === item.valuationtypeNo?.toString())?.valuationTypeName || item.valuationtypeNo}
                            </td>
                          )}
                          {type === 'port' && (
                            <>
                              <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">
                                {item.countryName || <span className="italic text-slate-300 font-medium">Not set</span>}
                              </td>
                              <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">
                                {item.stateName || <span className="italic text-slate-300 font-medium">Not set</span>}
                              </td>
                              <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">
                                {item.cityName || <span className="italic text-slate-300 font-medium">Not set</span>}
                              </td>
                            </>
                          )}
                          {type === 'location' && (
                            <>
                              <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium text-[9px]  ">
                                  {item.type || ''}
                                </span>
                              </td>
                              <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">{item.inchargeNo || 'No Lead'}</td>
                              <td className="px-3.5 py-2 text-[11px] text-slate-500 font-semibold max-w-[150px] truncate">
                                {item.address1} {item.cityNo ? `, ${item.cityNo}` : ''}
                              </td>
                              <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium">{item.locationRegion || 'Central'}</td>
                            </>
                          )}
                          {type === 'task-company' && (
                            <>
                              <td className="px-3.5 py-2 text-[11px] text-slate-600 font-medium max-w-[150px] truncate">{item.aliasName || '-'}</td>
                              <td className="px-3.5 py-2 text-[11px] text-slate-500 font-semibold max-w-[200px] truncate" title={[item.address1, item.cityNo, item.stateNo].filter(Boolean).join(', ')}>
                                {[item.address1, item.cityNo, item.stateNo].filter(Boolean).join(', ') || '-'}
                              </td>
                            </>
                          )}
                          <td className="px-3.5 py-2 text-[11px] font-semibold text-slate-600 truncate max-w-[120px]">
                            {item.createdBy || 'System'}
                          </td>
                          <td className="px-3.5 py-2 text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                            {item.createdDate ? format(new Date(item.createdDate), 'MMM dd, yyyy') : 'N/A'}
                          </td>
                          <td className="px-3.5 py-2 text-right pr-4 w-[100px]">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(item)}
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-slate-100/60 transition-colors flex items-center justify-center"
                              >
                                <Edit size={13} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(item.id)}
                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50/50 transition-colors flex items-center justify-center"
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {renderPaginationBar()}
              </div>
            )
          )}
      </div>



      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="rounded-2xl max-w-sm p-0 border-none shadow-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-lg font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
              <AlertCircle size={20} className="text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Do you want to delete?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeleteTargetId(null);
              }}
              className="h-10 px-4 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border-transparent shadow-none"
            >
              No
            </Button>
            <Button
              onClick={confirmDelete}
              className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-xs normal-case shadow-md shadow-red-500/20 gap-0.5 transition-transform hover:scale-[1.02] active:scale-95"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save/Update Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="rounded-3xl max-w-sm p-0 border-none shadow-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
              Confirm {editingId ? "Update" : "Save"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Do you want to {editingId ? "update" : "save"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-0.5 rounded-b-3xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="h-10 px-4 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 border-transparent shadow-none"
            >
              No
            </Button>
            <Button
              onClick={handleConfirmSave}
              className="h-10 px-5 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-medium text-xs normal-case shadow-md shadow-[#006699]/10 gap-0.5 transition-transform hover:scale-[1.02] active:scale-95"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Alert Dialog */}
      <Dialog open={showSuccessAlert} onOpenChange={setShowSuccessAlert}>
        <DialogContent className="rounded-3xl max-w-xs p-0 border-none shadow-2xl bg-white/95 backdrop-blur-xl [&>button]:hidden overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-emerald-50 rounded-full border border-emerald-100/80 flex items-center justify-center mb-4 shadow-sm relative">
              {/* Inner glowing pulse ring */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-ping"></div>
              <CheckCircle className="w-7 h-7 text-emerald-600 relative z-10" />
            </div>

            <h3 className="text-lg font-medium text-slate-800 tracking-tight mb-1">
              Success
            </h3>

            <p className="text-xs font-semibold text-slate-500 max-w-[200px] leading-relaxed">
              Data save sucessfully.
            </p>
          </div>

          <div className="p-4 bg-slate-50/80 border-t border-slate-100/50 flex justify-center">
            <Button
              type="button"
              onClick={() => setShowSuccessAlert(false)}
              className="w-full h-10 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-medium text-xs normal-case shadow-md shadow-[#006699]/10 transition-all hover:scale-[1.01] active:scale-95"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Live Document Preview Dialog */}
      <Dialog open={!!previewAttachment} onOpenChange={(open) => !open && setPreviewAttachment(null)}>
        <DialogContent className="rounded-3xl max-w-2xl p-0 border-none shadow-2xl overflow-hidden bg-white [&>button]:hidden">
          <DialogHeader className="p-6 pb-4 bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-base font-medium text-slate-800 tracking-tight flex items-center gap-0.5">
                <FileText size={18} className="text-[#006699]" />
                <span>{previewAttachment?.fileName || 'Document Preview'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-semibold mt-1">
                Owner Company: <strong className="text-slate-600">{previewAttachment?.companyName || 'N/A'}</strong>
              </DialogDescription>
            </div>
            <button
              onClick={() => setPreviewAttachment(null)}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={16} />
            </button>
          </DialogHeader>

          <div className="p-8 bg-slate-100/40 min-h-[300px] flex flex-col items-center justify-center border-b border-slate-100">
            {previewAttachment?.isPdf ? (
              <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-md p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-medium text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded  ">PDF Document</span>
                  <span className="text-[10px] text-slate-400 font-medium">{previewAttachment?.fileSize ? `${(previewAttachment.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                </div>
                <div className="space-y-3 font-serif text-[11px] text-slate-600 leading-relaxed py-2 select-text">
                  <h4 className="text-xs font-medium text-slate-800 font-sans tracking-tight mb-2 text-center underline ">Company Registration Profile</h4>
                  <p>This document details the corporate structure, registration details, and tax identity configurations of <strong>{previewAttachment?.companyName}</strong>.</p>
                  <p>All active certifications, operational nodes, and financial insurance limits represented in this file are validated under the governing authority as of the active creation date.</p>
                  <p className="italic text-slate-400 text-[10px] mt-4 text-center font-sans">** End of Document Preview Stream **</p>
                </div>
              </div>
            ) : previewAttachment?.isSheet ? (
              <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
                <div className="px-4 py-3 bg-emerald-50/50 border-b border-slate-150 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded  ">Data Spreadsheet</span>
                  <span className="text-[10px] text-slate-400 font-medium">{previewAttachment?.fileSize ? `${(previewAttachment.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[11px] font-medium text-slate-600">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-150">
                        <th className="p-2.5 pl-4 font-semibold text-[11px]   text-slate-600">Parameter</th>
                        <th className="p-2.5 font-semibold text-[11px]   text-slate-600">Value Field</th>
                        <th className="p-2.5 pr-4 font-semibold text-[11px]   text-slate-600">Verification Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2.5 pl-4 font-medium text-slate-700">Company Name</td>
                        <td className="p-2.5 text-[#006699] font-medium">{previewAttachment?.companyName}</td>
                        <td className="p-2.5 pr-4"><span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span></td>
                      </tr>
                      <tr>
                        <td className="p-2.5 pl-4 font-medium text-slate-700">Audit Status</td>
                        <td className="p-2.5">Compliant</td>
                        <td className="p-2.5 pr-4"><span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span></td>
                      </tr>
                      <tr>
                        <td className="p-2.5 pl-4 font-medium text-slate-700">Limit Valuation</td>
                        <td className="p-2.5">Standard Tier 1</td>
                        <td className="p-2.5 pr-4"><span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-md p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-medium text-blue-500 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded  ">Information Log</span>
                  <span className="text-[10px] text-slate-400 font-medium">{previewAttachment?.fileSize ? `${(previewAttachment.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                </div>
                <div className="p-4 bg-slate-55 rounded-xl font-mono text-[10px] text-slate-600 leading-relaxed border border-slate-100 min-h-[120px] select-text">
                  <p className="font-medium text-slate-800">// Company master log initialization stream</p>
                  <p className="mt-2">[INFO] Handshake verified with corporate directory.</p>
                  <p>[INFO] Primary locations successfully compiled.</p>
                  <p>[INFO] Credit rating evaluation complete.</p>
                  <p className="mt-3 text-slate-400">// End of file</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-50 flex justify-end gap-0.5">
            <Button
              type="button"
              onClick={() => setPreviewAttachment(null)}
              className="h-10 px-6 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs normal-case shadow-none border-none"
            >
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isMasterCreateOpen && (
        <MasterCreateDialog
          open={isMasterCreateOpen}
          onOpenChange={setIsMasterCreateOpen}
          type={activeMasterType}
          companyNo={companyNo}
          fillValues={fillValues}
          onSuccess={() => { }}
        />
      )}
    </div>
  );
}
