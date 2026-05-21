import { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';
import { Combobox } from '@/components/ui/Combobox';
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
  Check,
  X,
  Loader2,
  UserPlus

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

interface MasterManagerProps {
  type: 'category' | 'type' | 'priority' | 'folder' | 'user-group' | 'benefit-type' | 'location';
}

export function MasterManager({ type }: MasterManagerProps) {

  const { fillValues } = useTaskStore();
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.companyNo || authCompanies?.[0]?.CompanyNo || 2;

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Real API State
  const [apiLocations, setApiLocations] = useState<LocationMaster[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationFillValues, setLocationFillValues] = useState<any>(null);

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
          checkList: Array.isArray(c.checkLists) ? c.checkLists.map((cl: any) => cl.checkListDescription || cl.description) : [],
          color: c.colorCoding || ''
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
          inactive: u.inactive
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
          inactive: b.inactive
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
          inactive: t.inactive
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
          priorityDuration: p.priorityDuration || 0,
          priorityFrequencyNo: (p.priorityDurationFrequencyNo || '').toString(),
          sequence: p.sequenceNo || 0,
          inactive: p.inactive
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
          sequence: f.sequenceNo || f.sequence || 0,
          inactive: f.inactive
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
          locationRegion: l.regionName || l.locationRegion || ''
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

  useEffect(() => {
    if (type === 'location') {
      fetchLocations();
      fetchLocationFillValues();
    } else if (type === 'type') {
      fetchTypes();
    } else if (type === 'priority') {
      fetchPriorities();
    } else if (type === 'folder') {
      fetchFolders();
      fetchFolderFillValues();
    } else if (type === 'category') {
      fetchCategories();
    } else if (type === 'user-group') {
      fetchUserGroups();
    } else if (type === 'benefit-type') {
      fetchBusinessBenefitTypes();
      fetchBenefitFillValues();
    }
  }, [type]);

  // Local UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states matching schemas
  const [name, setName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Category extra fields
  const [isApprovalApplicable, setIsApprovalApplicable] = useState(false);
  const [isInReviewRequired, setIsInReviewRequired] = useState(false);
  const [isBusinessBenefitApplicable, setIsBusinessBenefitApplicable] = useState(false);
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [color, setColor] = useState('');

  // Priority extra fields
  const [priorityDuration, setPriorityDuration] = useState<number>(1);
  const [priorityFrequencyNo, setPriorityFrequencyNo] = useState('Days');

  // Folder extra fields
  const [description, setDescription] = useState('');
  const [parentFolderNo, setParentFolderNo] = useState('');
  const [sequence, setSequence] = useState<number>(1);

  // User Group extra fields
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

  // Business Benefit Type extra fields
  const [valuationtypeNo, setValuationtypeNo] = useState('Financial Valuation');

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
    }
  };

  const { title, icon: Icon, list: rawList } = getMasterInfo();
  const list = type === 'location' ? apiLocations : type === 'type' ? apiTypes : type === 'priority' ? apiPriorities : type === 'folder' ? apiFolders : type === 'category' ? apiCategories : type === 'user-group' ? apiUserGroups : type === 'benefit-type' ? apiBusinessBenefitTypes : rawList;

  // Filtered List
  const filteredList = list.filter((item: any) => {
    const query = searchQuery.toLowerCase();
    const matchesName = item.name?.toLowerCase().includes(query);
    const matchesCode = item.code?.toLowerCase().includes(query);
    const matchesDesc = item.description?.toLowerCase().includes(query);
    return matchesName || matchesCode || matchesDesc;
  });

  // Open Modal to Add
  const handleAddClick = () => {
    setErrors({});
    setEditingId(null);
    setName('');
    setIsApprovalApplicable(false);
    setIsInReviewRequired(false);
    setIsBusinessBenefitApplicable(false);
    setChecklist([]);
    setNewChecklistItem('');
    setColor('');
    setPriorityDuration(1);
    setPriorityFrequencyNo('Days');
    setDescription('');
    setParentFolderNo('none');
    setSequence(1);
    setSelectedUsers([]);
    setValuationtypeNo('Financial Valuation');
    setParentLocationNo('none');
    setInchargeNo('none');
    setInchargeLabel('');
    setAddress1('');
    setAddress2('');
    setAddress3('');
    setCountryNo('United States');
    setStateNo('');
    setCityNo('');
    setPinCode('');
    setLocationRegion('');
    setIsModalOpen(true);
  };

  // Open Modal to Edit
  const handleEditClick = (item: any) => {
    setErrors({});
    setEditingId(item.id);
    setName(item.name || '');

    if (type === 'category') {
      apiService.get<any>(`/api/master/task-categories/load-data/${item.id}?companyNo=${companyNo}`).then((response) => {
        if (response) {
          const body = response.data || response;
          const dl = body.data || body;
          if (dl) {
            setName(dl.operTaskCategoryName || dl.name || '');
            setIsApprovalApplicable(dl.isMultiLevelApproval || false);
            setIsInReviewRequired(dl.isInReviewApplicable || false);
            setIsBusinessBenefitApplicable(dl.isBusinessBenefitApplicable || false);
            setChecklist(Array.isArray(dl.checkLists) ? dl.checkLists.map((cl: any) => cl.checkListDescription || cl.description) : []);
            setColor(dl.colorCoding || '');
            setNewChecklistItem('');
          }
        }
      }).catch(err => console.error("Failed to load category details:", err));
    } else if (type === 'priority') {
      apiService.get<any>(`/api/master/task-priorities/load-data/${item.id}?companyNo=${companyNo}`).then((response) => {
        if (response) {
          const body = response.data || response;
          const dl = body.data || body;
          if (dl) {
            setName(dl.taskPriorityName || dl.name || '');
            setPriorityDuration(dl.priorityDuration || 1);
            setPriorityFrequencyNo((dl.priorityDurationFrequencyNo || '').toString());
            setSequence(dl.sequenceNo || 1);
          }
        }
      }).catch(err => console.error("Failed to load priority details:", err));
    } else if (type === 'folder') {
      apiService.get<any>(`/api/master/task-folders/load-data/${item.id}?companyNo=${companyNo}`).then((response) => {
        if (response) {
          const body = response.data || response;
          const dl = body.data || body;
          if (dl) {
            setName(dl.taskFolderName || dl.name || '');
            setDescription(dl.description || '');
            setParentFolderNo((dl.parentFolderNo || 'none').toString());
            setSequence(dl.sequenceNo || dl.sequence || 0);
          }
        }
      }).catch(err => console.error("Failed to load folder details:", err));
    } else if (type === 'user-group') {
      apiService.get<any>(`/api/security/user-groups/load-data/${item.id}?companyNo=${companyNo}`).then((response) => {
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
      apiService.get<any>(`/api/master/business-benefit-types/load-data/${item.id}?companyNo=${companyNo}`).then((response) => {
        if (response) {
          const body = response.data || response;
          const dl = body.data || body;
          if (dl) {
            setName(dl.businessBenefitTypeName || dl.name || '');
            setValuationtypeNo((dl.valuationType?.valuationTypeNo ?? dl.valuationType ?? 0).toString());
          }
        }
      }).catch(err => console.error("Failed to load benefit type details:", err));
    } else if (type === 'type') {
      apiService.get<any>(`/api/master/task-types/load-data/${item.id}?companyNo=${companyNo}`).then((response) => {
        if (response) {
          const body = response.data || response;
          const dl = body.data || body;
          if (dl) {
            setName(dl.operTaskTypeName || dl.name || '');
          }
        }
      }).catch(err => console.error("Failed to load type details:", err));
    } else if (type === 'location') {
      const loc = item as LocationMaster;
      setParentLocationNo(loc.parentLocationNo || 'none');
      setInchargeNo(loc.inchargeNo || 'none');
      setAddress1(loc.address1);
      setAddress2(loc.address2);
      setAddress3(loc.address3);
      setCountryNo(loc.countryNo);
      setStateNo(loc.stateNo);
      setCityNo(loc.cityNo);
      setPinCode(loc.pinCode);
      setLocationRegion(loc.locationRegion);

      // Fetch detail load from backend GET /api/master/task-locations/load-data/{id}
      apiService.get<any>(`/api/master/task-locations/load-data/${item.id}?companyNo=${companyNo}`).then((response) => {
        if (response) {
          const body = response.data || response;
          const dl = body.data || body;

          if (dl) {
            // Parent Location No
            const parentVal = dl.parentLocationNo || dl.parentLocation || 'none';
            setParentLocationNo(parentVal.toString());

            // Incharge No
            const inchargeVal = dl.operLocationIncharge?.loginNo || dl.locationIncharge || dl.inchargeNo || 'none';
            setInchargeNo(inchargeVal.toString());
            const inchargeName = dl.operLocationIncharge?.printingName || dl.operLocationIncharge?.loginId || dl.locationIncharge || '';
            setInchargeLabel(inchargeName.toString());

            // Address details
            const addr = dl.address || dl;
            setAddress1(addr.address1 || '');
            setAddress2(addr.address2 || '');
            setAddress3(addr.address3 || '');

            // Country, State, City, Pin, Region
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

    setIsModalOpen(true);
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
      if (!priorityDuration || priorityDuration <= 0) {
        newErrors.priorityDuration = 'Duration must be a positive number';
      }
      if (!priorityFrequencyNo || priorityFrequencyNo === 'none') {
        newErrors.priorityFrequencyNo = 'Frequency Unit is required';
      }
      if (!sequence || sequence <= 0) {
        newErrors.sequence = 'Sequence must be a positive number';
      }
    } else if (type === 'folder') {
      if (!sequence || sequence < 0) {
        newErrors.sequence = 'Sequence order must be 0 or greater';
      }
    } else if (type === 'user-group') {
      if (selectedUsers.length === 0) {
        newErrors.selectedUsers = 'At least one member is required';
      } else {
        const hasEmpty = selectedUsers.some(u => !u.userName);
        if (hasEmpty) {
          newErrors.selectedUsers = 'All group members must have a valid username';
        }
      }
    } else if (type === 'location') {
      if (!address1.trim()) {
        newErrors.address1 = 'Address Line 1 is required';
      }
      if (!countryNo || countryNo === 'none') {
        newErrors.countryNo = 'Country is required';
      }
      if (!stateNo || stateNo === 'none') {
        newErrors.stateNo = 'State is required';
      }
      if (!cityNo || cityNo === 'none') {
        newErrors.cityNo = 'City is required';
      }
      if (!pinCode.trim()) {
        newErrors.pinCode = 'PIN / ZIP Code is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Add/Edit Form
  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      if (editingId) {
        // Update
        const id = editingId;
        if (type === 'category') {
          const payload = {
            operTaskCategoryNo: parseInt(id) || 0,
            operTaskCategoryName: name,
            isMultiLevelApproval: isApprovalApplicable,
            isInReviewApplicable: isInReviewRequired,
            isBusinessBenefitApplicable: isBusinessBenefitApplicable,
            checkLists: checklist.map(c => ({ description: c, checkListDescription: c, isChecked: false })),
            colorCoding: color || null
          };
          await apiService.post('/api/master/task-categories/save', payload);
          await fetchCategories();
        } else if (type === 'type') {
          const payload = {
            operTaskTypeNo: parseInt(id) || 0,
            operTaskTypeName: name
          };
          await apiService.post('/api/master/task-types/save', payload);
          await fetchTypes();
        } else if (type === 'priority') {
          const payload = {
            operTaskPriorityNo: parseInt(id) || 0,
            taskPriorityName: name,
            priorityDuration: Number(priorityDuration) || 0,
            priorityDurationFrequencyNo: parseInt(priorityFrequencyNo) || 0,
            sequenceNo: Number(sequence) || 0
          };
          await apiService.post('/api/master/task-priorities/save', payload);
          await fetchPriorities();
        } else if (type === 'folder') {
          const payload = {
            taskFolderNo: parseInt(id) || 0,
            taskFolderName: name,
            description: description,
            parentFolderNo: parentFolderNo === 'none' || !parentFolderNo ? 0 : parseInt(parentFolderNo),
            sequenceNo: sequence
          };
          await apiService.post(`/api/master/task-folders/save`, payload);
          await fetchFolders();
        } else if (type === 'user-group') {
          const payload = {
            userGroupNo: parseInt(id) || 0,
            userGroupName: name,
            description: description,
            inactive: false,
            memberLoginNos: selectedUsers.map((u: any) => parseInt(u.loginNo) || 0).filter(Boolean)
          };
          await apiService.post('/api/security/user-groups/save', payload);
          await fetchUserGroups();
        } else if (type === 'benefit-type') {
          const payload = {
            businessBenefitTypeNo: parseInt(id) || 0,
            businessBenefitTypeName: name,
            valuationType: parseInt(valuationtypeNo) || 0
          };
          await apiService.post('/api/master/business-benefit-types/save', payload);
          await fetchBusinessBenefitTypes();
        } else if (type === 'location') {
          const cleanParent = parentLocationNo === 'none' ? '' : parentLocationNo;
          const cleanIncharge = inchargeNo === 'none' ? '' : inchargeNo;
          const payload = {
            operLocationNo: parseInt(id) || 0,
            operLocationName: name,
            operLocationInchargeNo: cleanIncharge ? parseInt(cleanIncharge) || 0 : 0,
            operLocationParentNo: cleanParent ? parseInt(cleanParent) || 0 : 0,
            address1,
            address2,
            address3,
            cityNo: parseInt(cityNo) || 0,
            pinCode,
            stateNo: parseInt(stateNo) || 0,
            countryNo: parseInt(countryNo) || 0,
            regionNo: parseInt(locationRegion) || 0
          };
          await apiService.post('/api/master/task-locations/save', payload);
          await fetchLocations();
        }
      } else {
        // Add
        if (type === 'category') {
          const payload = {
            operTaskCategoryNo: 0,
            operTaskCategoryName: name,
            isMultiLevelApproval: isApprovalApplicable,
            isInReviewApplicable: isInReviewRequired,
            isBusinessBenefitApplicable: isBusinessBenefitApplicable,
            checkLists: checklist.map(c => ({ description: c, checkListDescription: c, isChecked: true })),
            colorCoding: color || null
          };
          await apiService.post('/api/master/task-categories/save', payload);
          await fetchCategories();
        } else if (type === 'type') {
          const payload = {
            operTaskTypeNo: 0,
            operTaskTypeName: name
          };
          await apiService.post('/api/master/task-types/save', payload);
          await fetchTypes();
        } else if (type === 'priority') {
          const payload = {
            operTaskPriorityNo: 0,
            taskPriorityName: name,
            priorityDuration: Number(priorityDuration) || 0,
            priorityDurationFrequencyNo: parseInt(priorityFrequencyNo) || 0,
            sequenceNo: Number(sequence) || 0
          };
          await apiService.post('/api/master/task-priorities/save', payload);
          await fetchPriorities();
        } else if (type === 'folder') {
          const payload = {
            taskFolderNo: 0,
            taskFolderName: name,
            description: description,
            parentFolderNo: parentFolderNo === 'none' || !parentFolderNo ? 0 : parseInt(parentFolderNo),
            sequenceNo: sequence
          };
          await apiService.post(`/api/master/task-folders/save`, payload);
          await fetchFolders();
        } else if (type === 'user-group') {
          const payload = {
            userGroupNo: 0,
            userGroupName: name,
            description: description,
            inactive: false,
            memberLoginNos: selectedUsers.map((u: any) => parseInt(u.loginNo) || 0).filter(Boolean)
          };
          await apiService.post('/api/security/user-groups/save', payload);
          await fetchUserGroups();
        } else if (type === 'benefit-type') {
          const payload = {
            businessBenefitTypeNo: 0,
            businessBenefitTypeName: name,
            valuationType: parseInt(valuationtypeNo) || 0
          };
          await apiService.post('/api/master/business-benefit-types/save', payload);
          await fetchBusinessBenefitTypes();
        } else if (type === 'location') {
          const cleanParent = parentLocationNo === 'none' ? '' : parentLocationNo;
          const cleanIncharge = inchargeNo === 'none' ? '' : inchargeNo;
          const payload = {
            operLocationNo: 0,
            operLocationName: name,
            operLocationInchargeNo: cleanIncharge ? parseInt(cleanIncharge) || 0 : 0,
            operLocationParentNo: cleanParent ? parseInt(cleanParent) || 0 : 0,
            address1,
            address2,
            address3,
            cityNo: parseInt(cityNo) || 0,
            pinCode,
            stateNo: parseInt(stateNo) || 0,
            countryNo: parseInt(countryNo) || 0,
            regionNo: parseInt(locationRegion) || 0
          };
          await apiService.post('/api/master/task-locations/save', payload);
          await fetchLocations();
        }
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Checklist Helpers
  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setChecklist([...checklist, newChecklistItem.trim()]);
      setNewChecklistItem('');
    }
  };

  const removeChecklistItem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
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


  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
      {/* Breadcrumb Header */}
      <div className="flex items-center shrink-0 mb-1 px-1">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <span className="hover:text-slate-700 cursor-pointer transition-colors">Masters</span>
          <span className="text-slate-300 font-normal">/</span>
          <span className="text-[#006699] font-black">{title}</span>
        </div>
      </div>

      {/* Filters & Actions Section */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Search Input Card */}
        <Card className="flex-1 p-3.5 border-none shadow-md shadow-slate-200/20 bg-white/90 backdrop-blur-md rounded-2xl flex items-center gap-3 h-12">
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
              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center shrink-0"
            >
              <X size={14} />
            </Button>
          )}
        </Card>

        {/* Add Record Button */}
        <Button
          onClick={handleAddClick}
          className="h-12 px-6 rounded-2xl bg-gradient-to-r from-[#006699] to-[#00b4d8] hover:from-[#005580] hover:to-[#0096c7] text-white shadow-lg shadow-[#006699]/15 font-black text-xs uppercase tracking-widest gap-2 shrink-0 transition-transform hover:scale-[1.02] active:scale-95"
        >
          <Plus size={15} strokeWidth={3.5} />
          Add Record
        </Button>
      </div>

      {/* Tabular Search Grid Display List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {(type === 'location' && isLoadingLocations) || (type === 'type' && isLoadingTypes) || (type === 'priority' && isLoadingPriorities) ? (
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-xl overflow-hidden p-6 space-y-4 animate-pulse">
            <div className="h-10 bg-slate-100 rounded-xl w-full" />
            <div className="h-12 bg-slate-50 rounded-xl w-full" />
            <div className="h-12 bg-slate-50 rounded-xl w-full" />
            <div className="h-12 bg-slate-50 rounded-xl w-full" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center bg-white/40 backdrop-blur-sm rounded-[24px] border border-slate-100 p-8 text-center animate-fade-in">
            <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-3">
              <Icon size={32} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No Records Found</h3>
            <p className="text-xs text-slate-400 font-semibold mt-1 max-w-sm">No master records match your search criteria. Try adjusting filters or click the Add button above to create a new one.</p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-md rounded-[24px] border border-slate-100 shadow-xl shadow-slate-100/30 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-6">Code</th>
                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                    {type === 'category' && (
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Features</th>
                    )}
                    {type === 'priority' && (
                      <>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sequence</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Priority Duration</th>
                      </>
                    )}
                    {type === 'folder' && (
                      <>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sequence</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parent Folder</th>
                      </>
                    )}
                    {type === 'user-group' && (
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</th>
                    )}
                    {type === 'benefit-type' && (
                      <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Valuation Mode</th>
                    )}
                    {type === 'location' && (
                      <>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Incharge</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Address</th>
                        <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Region</th>
                      </>
                    )}
                    <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-6 w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 bg-white">
                  {filteredList.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-5 py-3.5 text-xs font-black text-slate-700 pl-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider bg-slate-100 text-slate-600 border border-slate-200/50">
                          {item.code || `SYS-${item.id}`}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          {type === 'category' && item.color && (
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          )}
                          <span>{item.name}</span>
                        </div>
                      </td>
                      {type === 'category' && (
                        <td className="px-5 py-3.5">
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
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-bold">{item.sequence}</td>
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-bold">
                            {item.priorityDuration} {getFrequencyName(item.priorityFrequencyNo)}
                          </td>
                        </>
                      )}
                      {type === 'folder' && (
                        <>
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-bold">{item.sequence}</td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 font-semibold">{item.parentFolderNo || 'Root'}</td>
                        </>
                      )}
                      {type === 'user-group' && (
                        <td className="px-5 py-3.5 text-xs text-slate-500 font-semibold max-w-[300px] truncate">
                          {item.description || <span className="italic text-slate-300 font-medium">No description</span>}
                        </td>
                      )}
                      {type === 'benefit-type' && (
                        <td className="px-5 py-3.5 text-xs text-slate-600 font-bold">
                          {benefitFillValues?.valuationTypes?.find((v: any) => v.valuationTypeNo?.toString() === item.valuationtypeNo?.toString())?.valuationTypeName || item.valuationtypeNo}
                        </td>
                      )}
                      {type === 'location' && (
                        <>
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-bold">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider">
                              {item.type || 'Office'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-bold">{item.inchargeNo || 'No Lead'}</td>
                          <td className="px-5 py-3.5 text-xs text-slate-500 font-semibold max-w-[200px] truncate">
                            {item.address1} {item.cityNo ? `, ${item.cityNo}` : ''}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-slate-600 font-bold">{item.locationRegion || 'Central'}</td>
                        </>
                      )}
                      <td className="px-5 py-3.5 text-right pr-6 w-[100px]">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(item)}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-[#006699] hover:bg-slate-100/60 transition-colors flex items-center justify-center"
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(item.id)}
                            className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50/50 transition-colors flex items-center justify-center"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Add / Edit Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="rounded-[28px] max-w-3xl w-full max-h-[85vh] flex flex-col p-0 border-none shadow-2xl bg-white outline-none overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100/60 bg-gradient-to-br from-slate-50/50 to-white">
            <DialogTitle className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Icon size={18} className="text-[#006699]" />
              {editingId ? `Edit ${title.replace(' Master', '')}` : `Add New ${title.replace(' Master', '')}`}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Fill in details for {title}.
            </DialogDescription>
          </DialogHeader>

          {/* Form Content Area */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
            {/* Disabled System Code */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Code</label>
              <Input
                disabled
                value={editingId ? (list.find((c: any) => c.id === editingId)?.code || '') : 'AUTO-GEN-CODE'}
                className="bg-slate-100/80 border-slate-200/50 h-11 text-xs font-bold text-slate-500 rounded-2xl cursor-not-allowed select-none"
              />
            </div>

            {/* Standard Name Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Name / Label</label>
              <Input
                placeholder={`Enter ${title.replace(' Master', '').toLowerCase()} name...`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                className={cn(
                  "bg-white border-slate-200 h-11 text-xs font-bold text-slate-700 rounded-2xl focus:ring-2 focus:ring-[#006699]/15",
                  errors.name && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                )}
              />
              {errors.name && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.name}</p>}
            </div>

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
                      id="need-approval"
                      checked={isApprovalApplicable}
                      onCheckedChange={(checked) => setIsApprovalApplicable(!!checked)}
                    />
                    <label htmlFor="need-approval" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Need Approval
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="need-review"
                      checked={isInReviewRequired}
                      onCheckedChange={(checked) => setIsInReviewRequired(!!checked)}
                    />
                    <label htmlFor="need-review" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                      Need Review
                    </label>
                  </div>

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
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1 block">Checklist Items (Descriptions Array)</label>
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
                      className="bg-white border-slate-200 h-10 text-xs font-bold text-slate-700 rounded-xl"
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
                    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-150/60 max-h-40 overflow-y-auto space-y-1.5 scrollbar-thin">
                      {checklist.map((item, index) => (
                        <div key={index} className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                          <span className="text-[11px] font-semibold text-slate-700 truncate">{item}</span>
                          <button
                            type="button"
                            onClick={() => removeChecklistItem(index)}
                            className="text-red-500 hover:text-red-700 p-0.5 rounded-full hover:bg-slate-100/80"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ----------------- PRIORITY EXTRA FIELDS ----------------- */}
            {type === 'priority' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Priority Duration Value</label>
                  <Input
                    type="number"
                    min={1}
                    value={priorityDuration}
                    onChange={(e) => {
                      setPriorityDuration(Number(e.target.value));
                      if (errors.priorityDuration) setErrors(prev => ({ ...prev, priorityDuration: '' }));
                    }}
                    className={cn(
                      "bg-white border-slate-200 h-11 text-xs font-bold text-slate-700 rounded-2xl",
                      errors.priorityDuration && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {errors.priorityDuration && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.priorityDuration}</p>}
                </div>
                <div className="space-y-1.5">
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
                      errors.priorityFrequencyNo && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {errors.priorityFrequencyNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.priorityFrequencyNo}</p>}
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Sequence Number</label>
                  <Input
                    type="number"
                    min={1}
                    value={sequence}
                    onChange={(e) => {
                      setSequence(Number(e.target.value));
                      if (errors.sequence) setErrors(prev => ({ ...prev, sequence: '' }));
                    }}
                    className={cn(
                      "bg-white border-slate-200 h-11 text-xs font-bold text-slate-700 rounded-2xl",
                      errors.sequence && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                    )}
                  />
                  {errors.sequence && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.sequence}</p>}
                </div>
              </div>
            )}

            {/* ----------------- FOLDER EXTRA FIELDS ----------------- */}
            {type === 'folder' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Folder Description</label>
                  <Input
                    placeholder="Enter short directory purpose..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white border-slate-200 h-11 text-xs font-bold text-slate-700 rounded-2xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
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
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Sequence Order</label>
                    <Input
                      type="number"
                      min={1}
                      value={sequence}
                      onChange={(e) => {
                        setSequence(Number(e.target.value));
                        if (errors.sequence) setErrors(prev => ({ ...prev, sequence: '' }));
                      }}
                      className={cn(
                        "bg-white border-slate-200 h-11 text-xs font-bold text-slate-700 rounded-2xl",
                        errors.sequence && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                      )}
                    />
                    {errors.sequence && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.sequence}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- USER GROUP EXTRA FIELDS ----------------- */}
            {type === 'user-group' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Group Description</label>
                  <Input
                    placeholder="E.g., Core team that reviews task approvals..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-white border-slate-200 h-11 text-xs font-bold text-slate-700 rounded-2xl"
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
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Valuation Scale / Type</label>
                <Combobox
                  options={(benefitFillValues?.valuationTypes || []).map((v: any) => ({
                    label: v.valuationTypeName || v.name || '',
                    value: (v.valuationTypeNo || v.id || '').toString()
                  }))}
                  value={valuationtypeNo}
                  onChange={setValuationtypeNo}
                  placeholder="Select Valuation Type..."
                />
              </div>
            )}

            {/* ----------------- LOCATION EXTRA FIELDS ----------------- */}
            {type === 'location' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
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
                      className="h-11 rounded-2xl border-slate-200 bg-white text-xs font-bold text-slate-700 w-full"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Incharge Lead</label>
                    <UserCombobox
                      value={inchargeNo}
                      onChange={(user) => {
                        setInchargeNo(user.loginNo.toString());
                        setInchargeLabel(user.printingName);
                      }}
                      initialLabel={inchargeLabel}
                      placeholder="Search Incharge Lead..."
                      className="h-11 rounded-2xl border-slate-200 bg-white text-xs font-bold text-slate-700 w-full"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
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
                    className="h-11 rounded-2xl border-slate-200 bg-white text-xs font-bold text-slate-700 w-full"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">Address</label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Address Line 1"
                      value={address1}
                      onChange={(e) => {
                        setAddress1(e.target.value);
                        if (errors.address1) setErrors(prev => ({ ...prev, address1: '' }));
                      }}
                      className={cn(
                        "bg-white border-slate-200 h-10 text-xs font-bold text-slate-700 rounded-xl",
                        errors.address1 && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                      )}
                    />
                    {errors.address1 && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.address1}</p>}
                    <Input
                      placeholder="Address Line 2 (Optional)"
                      value={address2}
                      onChange={(e) => setAddress2(e.target.value)}
                      className="bg-white border-slate-200 h-10 text-xs font-bold text-slate-700 rounded-xl"
                    />
                    <Input
                      placeholder="Address Line 3 (Optional)"
                      value={address3}
                      onChange={(e) => setAddress3(e.target.value)}
                      className="bg-white border-slate-200 h-10 text-xs font-bold text-slate-700 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
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
                        "h-11 rounded-2xl border-slate-200 bg-white text-xs font-bold text-slate-700 w-full",
                        errors.countryNo && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                      )}
                    />
                    {errors.countryNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.countryNo}</p>}
                  </div>
                  <div className="space-y-1.5">
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
                        "h-11 rounded-2xl border-slate-200 bg-white text-xs font-bold text-slate-700 w-full",
                        errors.stateNo && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                      )}
                    />
                    {errors.stateNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.stateNo}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5 col-span-2">
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
                        "h-11 rounded-2xl border-slate-200 bg-white text-xs font-bold text-slate-700 w-full",
                        errors.cityNo && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                      )}
                    />
                    {errors.cityNo && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.cityNo}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider ml-1">PIN / ZIP Code</label>
                    <Input
                      placeholder="ZIP"
                      value={pinCode}
                      onChange={(e) => {
                        setPinCode(e.target.value);
                        if (errors.pinCode) setErrors(prev => ({ ...prev, pinCode: '' }));
                      }}
                      className={cn(
                        "bg-white border-slate-200 h-11 text-xs font-bold text-slate-700 rounded-2xl",
                        errors.pinCode && "border-red-500 focus:ring-red-500/10 focus:border-red-500"
                      )}
                    />
                    {errors.pinCode && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.pinCode}</p>}
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Form Footer Action triggers */}
          <DialogFooter className="p-6 border-t border-slate-100/60 bg-gradient-to-tr from-slate-50/50 to-white flex items-center justify-between gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="h-11 px-5 rounded-2xl border-slate-200 text-xs font-extrabold text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSaving}
              className="h-11 px-6 rounded-2xl bg-[#006699] hover:bg-[#005580] text-white shadow-lg shadow-[#006699]/15 font-black text-xs uppercase tracking-widest gap-2 transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
            >
              {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
              {editingId ? 'Save Changes' : 'Create Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="rounded-2xl max-w-sm p-0 border-none shadow-xl">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500 mt-2">
              Are you sure you want to delete this master record? This action cannot be undone.
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
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-md shadow-red-500/20 gap-2 transition-transform hover:scale-[1.02] active:scale-95"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
