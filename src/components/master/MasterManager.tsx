import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CustomFieldsSection } from '@/components/ui/CustomFieldsSection';

interface MasterManagerProps {
  type: 'category' | 'type' | 'priority' | 'folder' | 'user-group' | 'benefit-type' | 'location' | 'vessel' | 'port' | 'business-entity-type';
}

export function MasterManager({ type }: MasterManagerProps) {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = useLocation();
  const isNew = location.pathname.endsWith('/new');
  const isEdit = !!id;
  const isFormPage = isNew || isEdit;

  const { fillValues } = useTaskStore();
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.companyNo || authCompanies?.[0]?.CompanyNo || 2;

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  // Sub-task list helpers
  const addSubtaskItem = () => {
    if (newSubtaskItem.trim()) {
      setSubtasks([...subtasks, { description: newSubtaskItem.trim(), isChecked: false }]);
      setNewSubtaskItem('');
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
  const [subtasks, setSubtasks] = useState<{ description: string; isChecked: boolean }[]>([]);
  const [newSubtaskItem, setNewSubtaskItem] = useState('');
  const [categoryFillValues, setCategoryFillValues] = useState<any>(null);
  const [categoryCustomFields, setCategoryCustomFields] = useState<{ customFieldNo: string; fieldValue: string }[]>([]);
  const [editingChecklistIdx, setEditingChecklistIdx] = useState<number | null>(null);
  const [editingSubtaskIdx, setEditingSubtaskIdx] = useState<number | null>(null);
  const [tempEditText, setTempEditText] = useState('');

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
      setCategoryCustomFields([]);
      setEditingChecklistIdx(null);
      setEditingSubtaskIdx(null);
      setTempEditText('');
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
      setServerError(null);
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
              setSubtasks(Array.isArray(rawSubtasks) ? rawSubtasks.map((st: any) => ({ description: st.title || st.subtaskTitle || st.description || st.taskName || st.subTaskName || (typeof st === 'string' ? st : ''), isChecked: !!st.isChecked })) : []);
              setCategoryCustomFields(Array.isArray(dl.customFields) ? dl.customFields.map((cf: any) => ({
                customFieldNo: (cf.customFieldNo ?? cf.customFieldNo ?? '').toString(),
                fieldValue: cf.fieldValue || cf.value || ''
              })) : []);
              setColor(dl.colorCoding || '');
              setNewChecklistItem('');
              setNewSubtaskItem('');
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
              setPinCode(addr.pinCode || addr.pincode || '');
              const regionVal = addr.region?.regionNo || addr.regionNo || '';
              setLocationRegion(regionVal.toString());
            }
          }
        }).catch(err => console.error("Failed to load location details:", err));
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
      case 'vessel':
        return { title: 'Vessel Master', desc: 'Manage vessel names and generated vessel codes', icon: Ship, list: apiVessels };
      case 'port':
        return { title: 'Port Master', desc: 'Manage port names with optional country, state, and city references', icon: Anchor, list: apiPorts };
      case 'business-entity-type':
        return { title: 'Business Entity Type Master', desc: 'Manage business entity type names and generated codes', icon: Building2, list: apiBusinessEntityTypes };
    }
  };

  const { title, icon: Icon, list: rawList } = getMasterInfo();
  const list = type === 'location' ? apiLocations : type === 'vessel' ? apiVessels : type === 'port' ? apiPorts : type === 'business-entity-type' ? apiBusinessEntityTypes : type === 'type' ? apiTypes : type === 'priority' ? apiPriorities : type === 'folder' ? apiFolders : type === 'category' ? apiCategories : type === 'user-group' ? apiUserGroups : type === 'benefit-type' ? apiBusinessBenefitTypes : rawList;

  // Filtered List
  const filteredList = list.filter((item: any) => {
    const query = searchQuery.toLowerCase();
    const matchesName = item.name?.toLowerCase().includes(query);
    const matchesCode = item.code?.toLowerCase().includes(query);
    const matchesDesc = item.description?.toLowerCase().includes(query);
    const matchesCountry = item.countryName?.toString().toLowerCase().includes(query) || item.countryNo?.toString().toLowerCase().includes(query);
    const matchesState = item.stateName?.toString().toLowerCase().includes(query) || item.stateNo?.toString().toLowerCase().includes(query);
    const matchesCity = item.cityName?.toString().toLowerCase().includes(query) || item.cityNo?.toString().toLowerCase().includes(query);
    return matchesName || matchesCode || matchesDesc || matchesCountry || matchesState || matchesCity;
  });

  // Pagination Calculations
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Safe page boundary checks
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  
  const paginatedList = filteredList.slice(startIndex, endIndex);

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
    }
    setDeleteConfirmOpen(false);
    setDeleteTargetId(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name / Label is required';
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
      if (selectedUsers.length > 0) {
        const hasEmpty = selectedUsers.some(u => !u.userName);
        if (hasEmpty) {
          newErrors.selectedUsers = 'All group members must have a valid username';
        }
      }
    } else if (type === 'port') {
      if (!countryNo || countryNo === 'none' || countryNo === '') {
        newErrors.countryNo = 'Country is required';
      }
      if (!stateNo || stateNo === 'none' || stateNo === '') {
        newErrors.stateNo = 'State is required';
      }
      if (!cityNo || cityNo === 'none' || cityNo === '') {
        newErrors.cityNo = 'City is required';
      }
    } else if (type === 'location') {
      if (!address1.trim()) {
        newErrors.address1 = 'Address Line 1 is required';
      }
      if (!pinCode.trim()) {
        newErrors.pinCode = 'PIN / ZIP Code is required';
      }
      if (!countryNo || countryNo === 'none' || countryNo === '') {
        newErrors.countryNo = 'Country is required';
      }
      if (!stateNo || stateNo === 'none' || stateNo === '') {
        newErrors.stateNo = 'State is required';
      }
      if (!cityNo || cityNo === 'none' || cityNo === '') {
        newErrors.cityNo = 'City is required';
      }
      if (!inchargeNo || inchargeNo === 'none' || inchargeNo === '') {
        newErrors.inchargeNo = 'Incharge Lead is required';
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
              subtaskTitle: typeof s === 'string' ? s : s.description
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
            countryNo: parseInt(countryNo) || null,
            stateNo: parseInt(stateNo) || null,
            cityNo: parseInt(cityNo) || null
          };
          await apiService.post('/api/master/ports/save', payload);
          await fetchPorts();
        } else if (type === 'business-entity-type') {
          const payload = {
            operCRMBusinessEntityTypeNo: parseInt(id) || null,
            operCRMBusinessEntityTypeName: name
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
              subtaskTitle: typeof s === 'string' ? s : s.description
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
            countryNo: parseInt(countryNo) || null,
            stateNo: parseInt(stateNo) || null,
            cityNo: parseInt(cityNo) || null
          };
          await apiService.post('/api/master/ports/save', payload);
          await fetchPorts();
        } else if (type === 'business-entity-type') {
          const payload = {
            operCRMBusinessEntityTypeNo: null,
            operCRMBusinessEntityTypeName: name
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
        }
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
              } else if (propLower === 'cityno' || propLower === 'city') {
                newFieldErrors.cityNo = msg;
              } else if (propLower === 'pincode' || propLower === 'zip') {
                newFieldErrors.pinCode = msg;
              } else if (propLower === 'stateno' || propLower === 'state') {
                newFieldErrors.stateNo = msg;
              } else if (propLower === 'countryno' || propLower === 'country') {
                newFieldErrors.countryNo = msg;
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
    next[index] = { ...next[index], loginNo: user.loginNo, userName: user.loginId, displayName: user.printingName, email: user.email };
    setSelectedUsers(next);
  };


  const renderFormContent = () => {
    return (
      <>
        {/* Disabled System Code */}
        <div className="space-y-1">
          <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Code</label>
          <Input
            disabled
            value={editingId ? (list.find((c: any) => c.id === editingId)?.code || '') : 'AUTO-GEN-CODE'}
            className="bg-slate-100/80 border-slate-200/50 h-10 text-xs font-bold text-slate-500 rounded-xl cursor-not-allowed select-none"
          />
        </div>

        {/* Standard Name Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Name / Label</label>
          <Input
            placeholder={`Enter ${title.replace(' Master', '').toLowerCase()} name...`}
            value={name}
            maxLength={50}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
            }}
            className={cn(
              "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
              errors.name && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
          />
          {errors.name && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.name}</p>}
        </div>

        {/* ----------------- PORT EXTRA FIELDS ----------------- */}
        {type === 'port' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Country</label>
              <Combobox
                options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
                  label: c.countryName || '',
                  value: (c.countryNo || '').toString()
                }))}
                value={countryNo}
                onChange={(val) => {
                  setCountryNo(val);
                  if (errors.countryNo) setErrors(prev => ({ ...prev, countryNo: '' }));
                }}
                placeholder="Select Country"
                searchPlaceholder="Search country..."
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.countryNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.countryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.countryNo}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">State / Province</label>
              <Combobox
                options={(locationFillValues?.data?.states || locationFillValues?.states || []).map((s: any) => ({
                  label: s.stateName || '',
                  value: (s.stateNo || '').toString()
                }))}
                value={stateNo}
                onChange={(val) => {
                  setStateNo(val);
                  if (errors.stateNo) setErrors(prev => ({ ...prev, stateNo: '' }));
                }}
                placeholder="Select State"
                searchPlaceholder="Search state..."
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.stateNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.stateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateNo}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">City</label>
              <Combobox
                options={(locationFillValues?.data?.cities || locationFillValues?.cities || []).map((c: any) => ({
                  label: c.cityName || '',
                  value: (c.cityNo || '').toString()
                }))}
                value={cityNo}
                onChange={(val) => {
                  setCityNo(val);
                  if (errors.cityNo) setErrors(prev => ({ ...prev, cityNo: '' }));
                }}
                placeholder="Select City"
                searchPlaceholder="Search city..."
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.cityNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.cityNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityNo}</p>}
            </div>
          </div>
        )}

        {/* Color Coding Option (Category only) */}
        {type === 'category' && (
          <div className="space-y-2.5">
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1 block">Color Code</label>
            <div className="flex flex-wrap items-center gap-3">
              {/* Premium Color Presets */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setColor('')}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-all hover:scale-110 active:scale-95 flex items-center justify-center bg-slate-100 text-slate-400",
                    color === '' ? "border-slate-800 scale-105" : "border-slate-200 hover:border-slate-300"
                  )}
                  title="No Color"
                >
                  <X size={12} strokeWidth={3} />
                </button>
                {[
                  { hex: '#3b82f6', name: 'Blue' },
                  { hex: '#ef4444', name: 'Red' },
                  { hex: '#10b981', name: 'Green' },
                  { hex: '#f59e0b', name: 'Orange' },
                  { hex: '#8b5cf6', name: 'Purple' },
                  { hex: '#ec4899', name: 'Pink' },
                  { hex: '#6366f1', name: 'Indigo' },
                  { hex: '#06b6d4', name: 'Cyan' },
                ].map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setColor(preset.hex)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-all hover:scale-110 active:scale-95",
                      color === preset.hex ? "border-slate-800 scale-105" : "border-transparent"
                    )}
                    style={{ backgroundColor: preset.hex }}
                    title={preset.name}
                  />
                ))}
              </div>
              {/* Custom Color Input */}
              <div className="flex items-center gap-2 ml-auto border border-slate-200 rounded-xl px-2.5 py-1 bg-slate-50/50">
                <input
                  type="color"
                  value={color || '#000000'}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 border-0 bg-transparent cursor-pointer rounded"
                />
                <span className="text-[10px] font-mono font-black text-slate-500 uppercase">{color || 'NONE'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- CATEGORY EXTRA FIELDS ----------------- */}
        {type === 'category' && (
          <div className="space-y-5 pt-2">
            <div className="flex flex-col sm:flex-row gap-6 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="business-benefit"
                  checked={isBusinessBenefitApplicable}
                  onCheckedChange={(checked) => setIsBusinessBenefitApplicable(!!checked)}
                />
                <label htmlFor="business-benefit" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Business Benefit
                </label>
              </div>
            </div>

            {/* Checklist Descriptions Array Editor */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1 flex items-center">
                Checklist Items (Descriptions Array)
                <span className="bg-[#e1ecf7] text-[#006699] text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1.5 shrink-0">
                  {checklist.length}
                </span>
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add description..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addChecklistItem();
                    }
                  }}
                  className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
                />
                <Button
                  type="button"
                  onClick={addChecklistItem}
                  className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
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
                              <Input
                                value={tempEditText}
                                onChange={(e) => setTempEditText(e.target.value)}
                                placeholder="Edit checklist item..."
                                className={cn(
                                  "h-8 text-xs font-bold text-slate-700 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] px-2.5 rounded-lg w-full transition-all",
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
                              <span className={cn("text-xs font-bold text-slate-750 truncate", isChecked && "line-through text-slate-400 font-semibold")}>
                                {desc}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
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

            {/* Sub-tasks Descriptions Array Editor */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1 flex items-center">
                Sub-tasks (Descriptions Array)
                <span className="bg-[#e1ecf7] text-[#006699] text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1.5 shrink-0">
                  {subtasks.length}
                </span>
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add sub-task description..."
                  value={newSubtaskItem}
                  onChange={(e) => setNewSubtaskItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSubtaskItem();
                    }
                  }}
                  className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
                />
                <Button
                  type="button"
                  onClick={addSubtaskItem}
                  className="h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
                >
                  Add
                </Button>
              </div>

              {subtasks.length > 0 && (
                <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all w-full">
                  <div className="max-h-[250px] overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
                    {subtasks.map((item, index) => {
                      const desc = typeof item === 'string' ? item : item.description;
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
                              <Input
                                value={tempEditText}
                                onChange={(e) => setTempEditText(e.target.value)}
                                placeholder="Edit sub-task description..."
                                className={cn(
                                  "h-8 text-xs font-bold text-slate-700 bg-white border-slate-200 focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] px-2.5 rounded-lg w-full transition-all",
                                  !tempEditText.trim() && "border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400"
                                )}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (!tempEditText.trim()) return;
                                    const next = [...subtasks];
                                    if (typeof next[index] === 'string') {
                                      next[index] = { description: tempEditText.trim(), isChecked: false };
                                    } else {
                                      next[index] = { ...next[index], description: tempEditText.trim() };
                                    }
                                    setSubtasks(next);
                                    setEditingSubtaskIdx(null);
                                    setTempEditText('');
                                  } else if (e.key === 'Escape') {
                                    setEditingSubtaskIdx(null);
                                    setTempEditText('');
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <span className="text-xs font-bold text-slate-750 truncate">
                                {desc}
                              </span>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={!tempEditText.trim()}
                                  onClick={() => {
                                    if (!tempEditText.trim()) return;
                                    const next = [...subtasks];
                                    if (typeof next[index] === 'string') {
                                      next[index] = { description: tempEditText.trim(), isChecked: false };
                                    } else {
                                      next[index] = { ...next[index], description: tempEditText.trim() };
                                    }
                                    setSubtasks(next);
                                    setEditingSubtaskIdx(null);
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
                                    setEditingSubtaskIdx(null);
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
                                    setEditingSubtaskIdx(index);
                                    setTempEditText(desc);
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
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Priority Duration Value</label>
              <Input
                type="number"
                min={1}
                value={priorityDuration ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setPriorityDuration(val);
                  if (errors.priorityDuration) setErrors(prev => ({ ...prev, priorityDuration: '' }));
                }}
                className={cn(
                  "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                  errors.priorityDuration && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.priorityDuration && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.priorityDuration}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Frequency Unit</label>
              <Combobox
                options={(fillValues?.frequency || []).map((f: any) => ({
                  label: f.FrequencyName || f.Frequency || f.name || '',
                  value: (f.FrequencyNo || f.id || '').toString()
                }))}
                value={priorityFrequencyNo}
                onChange={(val) => {
                  setPriorityFrequencyNo(val);
                  if (errors.priorityFrequencyNo) setErrors(prev => ({ ...prev, priorityFrequencyNo: '' }));
                }}
                placeholder="Select frequency..."
                className={cn(
                  "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                  errors.priorityFrequencyNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.priorityFrequencyNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.priorityFrequencyNo}</p>}
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Sequence Number</label>
              <Input
                type="number"
                min={1}
                value={sequence ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  setSequence(val);
                  if (errors.sequence) setErrors(prev => ({ ...prev, sequence: '' }));
                }}
                className={cn(
                  "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                  errors.sequence && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.sequence && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.sequence}</p>}
            </div>
          </div>
        )}

        {/* ----------------- FOLDER EXTRA FIELDS ----------------- */}
        {type === 'folder' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Folder Description</label>
              <Input
                placeholder="Enter short directory purpose..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                }}
                className={cn(
                  "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                  errors.description && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.description && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Parent Folder</label>
                <Combobox
                  options={[
                    { label: 'No Parent (Root)', value: 'none' },
                    ...(Array.isArray(folderFillValues?.folders) ? folderFillValues.folders :
                      Array.isArray(folderFillValues?.parentFolder) ? folderFillValues.parentFolder :
                        Array.isArray(folderFillValues?.data) ? folderFillValues.data :
                          Array.isArray(folderFillValues) ? folderFillValues : []).map((f: any) => ({
                            label: f.folderName || f.taskFolderName || f.FolderName || f.name || '',
                            value: (f.taskFolderNo || f.TaskFolderNo || f.id || '').toString()
                          }))
                  ]}
                  value={parentFolderNo}
                  onChange={setParentFolderNo}
                  placeholder="Select Parent Folder..."
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Sequence Order</label>
                <Input
                  type="number"
                  min={1}
                  value={sequence ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setSequence(val);
                    if (errors.sequence) setErrors(prev => ({ ...prev, sequence: '' }));
                  }}
                  className={cn(
                    "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
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
            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Group Description</label>
              <Input
                placeholder="E.g., Core team that reviews task approvals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
              />
            </div>

            <div className="space-y-3" id="form-group-members">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">Group Members</h4>
                  {errors.selectedUsers && <p className="text-[10px] text-red-500 font-semibold">{errors.selectedUsers}</p>}
                </div>
                <Button type="button" onClick={addGridUser} variant="ghost" size="sm" className="h-7 text-[9px] font-bold text-[#006699] hover:bg-[#e1ecf7] rounded-lg gap-1">
                  <UserPlus size={12} /> Add
                </Button>
              </div>
              <div className="bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100/80 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-1.5 font-black text-slate-700 uppercase tracking-wider">User Name</th>
                      <th className="px-3 py-1.5 font-black text-slate-700 uppercase tracking-wider">Display Name</th>
                      <th className="px-3 py-1.5 font-black text-slate-700 uppercase tracking-wider">Email</th>
                      <th className="px-2 py-1.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedUsers.map((field, index) => (
                      <tr key={index} className="group hover:bg-white transition-colors">
                        <td className="px-2 py-1">
                          <UserCombobox
                            value={field.userName}
                            onChange={(user) => updateGridUser(index, user)}
                            placeholder="User Name"
                            className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2"
                            initialLabel={field.userName}
                          />
                        </td>
                        <td className="px-2 py-1">
                          <Input disabled value={field.displayName} placeholder="Display Name" className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 font-bold" />
                        </td>
                        <td className="px-2 py-1">
                          <Input disabled value={field.email} placeholder="Email" className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 font-bold" />
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
            </div>
          </div>
        )}

        {/* ----------------- BENEFIT TYPE EXTRA FIELDS ----------------- */}
        {type === 'benefit-type' && (
          <div className="space-y-1">
            <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Valuation Scale / Type</label>
            <Combobox
              options={(benefitFillValues?.valuationTypes || []).map((v: any) => ({
                label: v.valuationTypeName || v.name || '',
                value: (v.valuationTypeNo || v.id || '').toString()
              }))}
              value={valuationtypeNo}
              onChange={setValuationtypeNo}
              placeholder="Select Valuation Type..."
              className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
            />
          </div>
        )}

        {/* ----------------- LOCATION EXTRA FIELDS ----------------- */}
        {type === 'location' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Parent Location</label>
                <Combobox
                  options={[
                    { label: "No Parent (Root)", value: "none" },
                    ...(locationFillValues?.data?.locations || locationFillValues?.locations || apiLocations || []).filter((l: any) => (l.operLocationNo || l.id || '').toString() !== editingId).map((l: any) => ({
                      label: l.operLocationName || l.locationName || l.name || '',
                      value: (l.operLocationNo || l.id || '').toString()
                    }))
                  ]}
                  value={parentLocationNo}
                  onChange={setParentLocationNo}
                  placeholder="Select Parent"
                  searchPlaceholder="Search parent..."
                  className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Incharge Lead</label>
                <UserCombobox
                  value={inchargeNo}
                  onChange={(user) => {
                    setInchargeNo(user.loginNo.toString());
                    setInchargeLabel(user.printingName);
                    if (errors.inchargeNo) setErrors(prev => ({ ...prev, inchargeNo: '' }));
                  }}
                  initialLabel={inchargeLabel}
                  placeholder="Search Incharge Lead..."
                  className={cn(
                    "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                    errors.inchargeNo && "border-red-500 focus:ring-red-500/10 focus:border-red-500 focus-visible:ring-red-500/10 focus-visible:border-red-500"
                  )}
                />
                {errors.inchargeNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.inchargeNo}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Location Region</label>
              <Combobox
                options={(locationFillValues?.data?.regions || locationFillValues?.regions || []).map((r: any) => ({
                  label: r.regionName || '',
                  value: (r.regionNo || '').toString()
                }))}
                value={locationRegion}
                onChange={setLocationRegion}
                placeholder="Select Region"
                searchPlaceholder="Search region..."
                className="h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Address</label>
              <div className="space-y-2">
                <Input
                  placeholder="Address Line 1"
                  value={address1}
                  maxLength={150}
                  onChange={(e) => {
                    setAddress1(e.target.value);
                    if (errors.address1) setErrors(prev => ({ ...prev, address1: '' }));
                  }}
                  className={cn(
                    "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                    errors.address1 && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                />
                {errors.address1 && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.address1}</p>}
                <Input
                  placeholder="Address Line 2 (Optional)"
                  value={address2}
                  maxLength={150}
                  onChange={(e) => setAddress2(e.target.value)}
                  className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
                />
                <Input
                  placeholder="Address Line 3 (Optional)"
                  value={address3}
                  maxLength={150}
                  onChange={(e) => setAddress3(e.target.value)}
                  className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Country</label>
                <Combobox
                  options={(locationFillValues?.data?.countries || locationFillValues?.countries || []).map((c: any) => ({
                    label: c.countryName || '',
                    value: (c.countryNo || '').toString()
                  }))}
                  value={countryNo}
                  onChange={(val) => {
                    setCountryNo(val);
                    if (errors.countryNo) setErrors(prev => ({ ...prev, countryNo: '' }));
                  }}
                  placeholder="Select Country"
                  searchPlaceholder="Search country..."
                  className={cn(
                    "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                    errors.countryNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                />
                {errors.countryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.countryNo}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">State / Province</label>
                <Combobox
                  options={(locationFillValues?.data?.states || locationFillValues?.states || []).map((s: any) => ({
                    label: s.stateName || '',
                    value: (s.stateNo || '').toString()
                  }))}
                  value={stateNo}
                  onChange={(val) => {
                    setStateNo(val);
                    if (errors.stateNo) setErrors(prev => ({ ...prev, stateNo: '' }));
                  }}
                  placeholder="Select State"
                  searchPlaceholder="Search state..."
                  className={cn(
                    "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                    errors.stateNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                />
                {errors.stateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateNo}</p>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="space-y-1 col-span-2">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">City</label>
                <Combobox
                  options={(locationFillValues?.data?.cities || locationFillValues?.cities || []).map((c: any) => ({
                    label: c.cityName || '',
                    value: (c.cityNo || '').toString()
                  }))}
                  value={cityNo}
                  onChange={(val) => {
                    setCityNo(val);
                    if (errors.cityNo) setErrors(prev => ({ ...prev, cityNo: '' }));
                  }}
                  placeholder="Select City"
                  searchPlaceholder="Search city..."
                  className={cn(
                    "h-10 rounded-xl border-slate-200 hover:border-slate-300 bg-white text-xs font-bold text-slate-700 w-full transition-colors focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699] focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none",
                    errors.cityNo && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                />
                {errors.cityNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityNo}</p>}
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">PIN / ZIP Code</label>
                <Input
                  placeholder="ZIP"
                  value={pinCode}
                  maxLength={10}
                  onChange={(e) => {
                    setPinCode(e.target.value);
                    if (errors.pinCode) setErrors(prev => ({ ...prev, pinCode: '' }));
                  }}
                  className={cn(
                    "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 text-xs font-bold text-slate-700 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                    errors.pinCode && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
                  )}
                />
                {errors.pinCode && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.pinCode}</p>}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  if (isFormPage) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden p-3.5 sm:p-6 gap-4 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
        {/* Breadcrumb Header */}
        <div className="flex items-start shrink-0 mb-1 px-1 justify-between">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <span onClick={() => navigate(`/master/${type}`)} className="hover:text-slate-700 cursor-pointer transition-colors">Masters</span>
            <span className="text-slate-300 font-normal">/</span>
            <span onClick={() => navigate(`/master/${type}`)} className="hover:text-slate-700 cursor-pointer transition-colors">{title}</span>
            <span className="text-slate-300 font-normal">/</span>
            <span className="text-[#006699] font-black">{editingId ? 'Edit Record' : 'Add New Record'}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(`/master/${type}`)}
              className="rounded-xl h-9 px-3 sm:px-5 font-bold text-slate-600 hover:bg-slate-100 transition-colors gap-2 text-xs flex items-center"
            >
              <X size={16} />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="rounded-xl h-9 px-3 sm:px-6 bg-[#006699] hover:bg-[#005580] font-bold text-white shadow-lg shadow-[#006699]/20 gap-2 transition-all hover:scale-105 active:scale-95 text-xs disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center"
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
        <Card className="flex-1 rounded-[28px] border-none shadow-xl shadow-slate-200/40 bg-white flex flex-col p-0 outline-none overflow-hidden max-w-4xl w-full mx-auto">

          {/* Form Content Area */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
            {renderFormContent()}
          </form>

          {serverError && (
            <div className="mx-6 mb-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-4 py-3 rounded-2xl flex items-start gap-2 shadow-sm animate-pulse shrink-0">
              <span className="font-extrabold select-none">⚠️ Error:</span>
              <span className="flex-1 whitespace-pre-wrap leading-relaxed">{serverError}</span>
            </div>
          )}

        </Card>

        {/* Save/Update Confirmation Dialog */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent className="rounded-3xl max-w-sm p-0 border-none shadow-xl">
            <DialogHeader className="p-6 pb-4">
              <DialogTitle className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                Confirm Save
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 mt-2">
                Are you sure you want to save these changes?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-2 rounded-b-3xl">
              <Button variant="ghost" onClick={() => setShowConfirm(false)} className="rounded-xl h-9 text-xs font-bold text-slate-500 hover:bg-slate-100">
                No, Cancel
              </Button>
              <Button onClick={handleConfirmSave} className="rounded-xl h-9 text-xs font-bold bg-[#006699] hover:bg-[#005580] text-white shadow-md">
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
              <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1">Success</h3>
              <p className="text-xs font-semibold text-slate-500 max-w-[200px] leading-relaxed">Data saved successfully.</p>
            </div>
            <div className="p-4 bg-slate-50/80 border-t border-slate-100/50 flex justify-center">
              <Button
                type="button"
                onClick={() => {
                  setShowSuccessAlert(false);
                  navigate(`/master/${type}`);
                }}
                className="w-full h-10 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-black text-xs uppercase tracking-widest shadow-md shadow-[#006699]/10 transition-all hover:scale-[1.01] active:scale-95"
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3.5 sm:p-6 gap-4 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
      {/* Breadcrumb Header */}
      <div className="flex items-center shrink-0 mb-1 px-1">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <span className="hover:text-slate-700 cursor-pointer transition-colors">Masters</span>
          <span className="text-slate-300 font-normal">/</span>
          <span className="text-[#006699] font-black">{title}</span>
        </div>
      </div>

      {/* Filters & Actions Section */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
        {/* Search Input Card */}
        <Card className="flex-1 p-3.5 border-none shadow-md shadow-slate-200/20 bg-white/90 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center gap-3 h-10 sm:h-11">
          <Search size={16} className="text-slate-400 ml-1 shrink-0" />
          <Input
            placeholder={`Search ${title.toLowerCase()} records by name, code...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none text-xs font-bold text-slate-700 h-full p-0 focus-visible:ring-0 placeholder:text-slate-400 placeholder:font-semibold flex-1"
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

        {/* Add Record Button */}
        <Button
          onClick={handleAddClick}
          className="h-10 sm:h-11 px-4 sm:px-6 rounded-xl sm:rounded-2xl bg-[#006699] hover:bg-[#005580] text-white shadow-lg shadow-[#006699]/15 font-black text-xs uppercase tracking-widest gap-2 shrink-0 transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center"
        >
          <Plus size={14} strokeWidth={3.5} />
          Add Record
        </Button>
      </div>

      {/* Tabular Search Grid Display List */}
      <div className="flex-1 min-h-0 flex flex-col">
        {(type === 'location' && isLoadingLocations) || (type === 'vessel' && isLoadingVessels) || (type === 'port' && isLoadingPorts) || (type === 'business-entity-type' && isLoadingBusinessEntityTypes) || (type === 'type' && isLoadingTypes) || (type === 'priority' && isLoadingPriorities) ? (
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl overflow-hidden p-6 space-y-4 animate-pulse flex-1">
            <div className="h-10 bg-slate-100 rounded-xl w-full" />
            <div className="h-12 bg-slate-50 rounded-xl w-full" />
            <div className="h-12 bg-slate-50 rounded-xl w-full" />
            <div className="h-12 bg-slate-50 rounded-xl w-full" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-[24px] border border-slate-100 p-8 text-center animate-fade-in">
            <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-3">
              <Icon size={32} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No Records Found</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm">No master records match your search criteria. Try adjusting filters or click the Add button above to create a new one.</p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-md rounded-[24px] border border-slate-100 shadow-xl shadow-slate-100/30 overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin min-h-0">
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-md shadow-[0_1px_0_0_rgba(241,245,249,1)]">
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest pl-4">Code</th>
                    <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                    {type === 'category' && (
                      <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Features</th>
                    )}
                    {type === 'priority' && (
                      <>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Sequence</th>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Priority Duration</th>
                      </>
                    )}
                    {type === 'folder' && (
                      <>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Sequence</th>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Parent Folder</th>
                      </>
                    )}
                    {type === 'user-group' && (
                      <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                    )}
                    {type === 'benefit-type' && (
                      <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Valuation Mode</th>
                    )}
                    {type === 'port' && (
                      <>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Country No</th>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">State No</th>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">City No</th>
                      </>
                    )}
                    {type === 'location' && (
                      <>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Incharge</th>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Address</th>
                        <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Region</th>
                      </>
                    )}
                    <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Created By</th>
                    <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Created Date</th>
                    <th className="px-3.5 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right pr-4 w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 bg-white">
                  {paginatedList.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-3.5 py-2 text-[11px] font-black text-slate-700 pl-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-slate-100 text-slate-600 border border-slate-200/50">
                          {item.code || `SYS-${item.id}`}
                        </span>
                      </td>
                      <td className="px-3.5 py-2 text-[11px] font-bold text-slate-800">
                        <div className="flex items-center gap-2">
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
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Approval</span>
                            )}
                            {item.isInReviewRequired && (
                              <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Review</span>
                            )}
                            {item.isBusinessBenefitApplicable && (
                              <span className="text-[9px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">Benefit</span>
                            )}
                          </div>
                        </td>
                      )}
                      {type === 'priority' && (
                        <>
                          <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">{item.sequence}</td>
                          <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">
                            {item.priorityDuration} {getFrequencyName(item.priorityFrequencyNo)}
                          </td>
                        </>
                      )}
                      {type === 'folder' && (
                        <>
                          <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">{item.sequence}</td>
                          <td className="px-3.5 py-2 text-[11px] text-slate-500 font-semibold">{item.parentFolderNo || 'Root'}</td>
                        </>
                      )}
                      {type === 'user-group' && (
                        <td className="px-3.5 py-2 text-[11px] text-slate-500 font-semibold max-w-[200px] truncate">
                          {item.description || <span className="italic text-slate-300 font-medium">No description</span>}
                        </td>
                      )}
                      {type === 'benefit-type' && (
                        <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">
                          {benefitFillValues?.valuationTypes?.find((v: any) => v.valuationTypeNo?.toString() === item.valuationtypeNo?.toString())?.valuationTypeName || item.valuationtypeNo}
                        </td>
                      )}
                      {type === 'port' && (
                        <>
                          <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">
                            {item.countryNo || <span className="italic text-slate-300 font-medium">Not set</span>}
                          </td>
                          <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">
                            {item.stateNo || <span className="italic text-slate-300 font-medium">Not set</span>}
                          </td>
                          <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">
                            {item.cityNo || <span className="italic text-slate-300 font-medium">Not set</span>}
                          </td>
                        </>
                      )}
                      {type === 'location' && (
                        <>
                          <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider">
                              {item.type || 'Office'}
                            </span>
                          </td>
                          <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">{item.inchargeNo || 'No Lead'}</td>
                          <td className="px-3.5 py-2 text-[11px] text-slate-500 font-semibold max-w-[150px] truncate">
                            {item.address1} {item.cityNo ? `, ${item.cityNo}` : ''}
                          </td>
                          <td className="px-3.5 py-2 text-[11px] text-slate-600 font-bold">{item.locationRegion || 'Central'}</td>
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
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50/50 transition-colors flex items-center justify-center"
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

            {/* Pagination Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-slate-50/70 border-t border-slate-100 gap-4 select-none">
              {/* Left Side: Range Info */}
              <div className="text-[11px] text-slate-500 font-bold">
                Showing <span className="text-slate-800 font-black">{totalItems === 0 ? 0 : startIndex + 1}</span> to{" "}
                <span className="text-slate-800 font-black">{endIndex}</span> of{" "}
                <span className="text-slate-800 font-black">{totalItems}</span> records
              </div>

              {/* Center: Items Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Per Page:</span>
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
                        "h-6 px-2.5 rounded-md text-[10px] font-black tracking-wide uppercase transition-all",
                        itemsPerPage === size
                          ? "bg-[#006699] text-white shadow-sm font-black"
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
                {/* Previous Page Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={safeCurrentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-105 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} />
                </Button>

                {/* Direct Page Numbers */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first, last, and pages around current page
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
                            <span className="text-[10px] font-bold text-slate-400 px-1 select-none">
                              ...
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(page)}
                            className={cn(
                              "h-7 w-7 rounded-lg text-[10px] font-black transition-all flex items-center justify-center border shadow-sm",
                              isPageActive
                                ? "bg-[#006699] border-[#006699] text-white font-black shadow-md shadow-[#006699]/10"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                {/* Next Page Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={safeCurrentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="h-7 w-7 rounded-lg text-slate-500 hover:bg-slate-105 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center shrink-0 border border-slate-200 bg-white shadow-sm"
                >
                  <ChevronRight size={14} strokeWidth={2.5} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="rounded-2xl max-w-sm p-0 border-none shadow-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Do you want to delete?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-2 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setDeleteTargetId(null);
              }}
              className="h-10 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border-transparent shadow-none"
            >
              No
            </Button>
            <Button
              onClick={confirmDelete}
              className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-md shadow-red-500/20 gap-2 transition-transform hover:scale-[1.02] active:scale-95"
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
            <DialogTitle className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              Confirm {editingId ? "Update" : "Save"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Do you want to {editingId ? "update" : "save"}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="p-4 pt-2 bg-slate-50/50 flex justify-end gap-2 rounded-b-3xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirm(false)}
              className="h-10 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border-transparent shadow-none"
            >
              No
            </Button>
            <Button
              onClick={handleConfirmSave}
              className="h-10 px-5 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-black text-xs uppercase tracking-widest shadow-md shadow-[#006699]/10 gap-2 transition-transform hover:scale-[1.02] active:scale-95"
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

            <h3 className="text-lg font-black text-slate-800 tracking-tight mb-1">
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
              className="w-full h-10 rounded-xl bg-[#006699] hover:bg-[#005580] text-white font-black text-xs uppercase tracking-widest shadow-md shadow-[#006699]/10 transition-all hover:scale-[1.01] active:scale-95"
            >
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
