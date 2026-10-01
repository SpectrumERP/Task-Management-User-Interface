import { useEffect, useState, lazy, Suspense } from 'react';
import { apiService } from '@/services/apiService';
import { attachmentService } from '@/services/attachmentService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
const CameraComp = lazy(() => import('@/components/ui/CameraComp'));
import { Camera as CameraIcon } from 'lucide-react';
import { BrandLoader } from '@/components/ui/BrandLoader';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { validateUploadFile } from '@/lib/allowedUploadFiles';
import { MasterFormShell } from '../shared/MasterFormShell';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { RenameAttachmentDialog } from '../shared/RenameAttachmentDialog';
import { useConfirmDelete } from '../shared/useConfirmDelete';
import { fetchStatesByCountry, fetchCitiesByState } from '../shared/geo';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';
import { CompanyHeaderFields } from './CompanyHeaderFields';
import { CompanyLocationsSection } from './CompanyLocationsSection';
import { CompanyLocationModal } from './CompanyLocationModal';
import { CompanyContactsSection } from './CompanyContactsSection';
import { CompanyContactModal } from './CompanyContactModal';
import { CompanyPortsSection } from './CompanyPortsSection';
import { CompanyAttachmentsSection } from './CompanyAttachmentsSection';
import { CompanyNotesSection, FollowUpNote } from './CompanyNotesSection';

/* API payloads in this form are loosely typed; keep runtime behavior unchanged. */
/* eslint-disable @typescript-eslint/no-explicit-any */

const FORM_NO = 1550;
const TITLE = 'Business Entity';

/** Loose shapes returned by master geo / fill-values APIs */
type GeoCountry = { countryName?: string; countryNo?: string | number };
type GeoState = { stateName?: string; stateNo?: string | number; id?: string | number };
type GeoCity = { cityName?: string; cityNo?: string | number; id?: string | number };

const asGeoList = <T,>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

const resolveGeoNo = (
  row: { stateNo?: string | number; countryNo?: string | number; cityNo?: string | number; id?: string | number } | undefined,
  key: 'stateNo' | 'countryNo' | 'cityNo'
): string | number | null => {
  if (!row) return null;
  const value = row[key] ?? row.id;
  if (value === undefined || value === null || value === '') return null;
  return value;
};

interface CompanyFormProps {
  id?: string;
}

export function CompanyForm({ id }: CompanyFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('company', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  const deleteConfirm = useConfirmDelete('record');

  // Header fields
  const [name, setName] = useState('');
  const [aliasName, setAliasName] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [companyTimeZoneNo, setCompanyTimeZoneNo] = useState('');
  const [selectedTimeZoneName, setSelectedTimeZoneName] = useState('');
  const [creditLimit, setCreditLimit] = useState<number | null>(null);
  const [creditInsuranceCompanyName, setCreditInsuranceCompanyName] = useState('');
  const [companyVatGst, setCompanyVatGst] = useState('');
  const [gstinTypeNo, setGstinTypeNo] = useState('');
  const [followUpNotes, setFollowUpNotes] = useState<FollowUpNote[]>([]);
  const [businessEntityFillValues, setBusinessEntityFillValues] = useState<any>(null);

  // Locations
  const [companyLocations, setCompanyLocations] = useState<any[]>([]);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null);
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
  const [locStatesList, setLocStatesList] = useState<GeoState[]>([]);
  const [locCitiesList, setLocCitiesList] = useState<GeoCity[]>([]);

  // Contacts
  const [companyContacts, setCompanyContacts] = useState<any[]>([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null);
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
  const [contactStatus, setContactStatus] = useState('Active');
  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [contactStatesList, setContactStatesList] = useState<GeoState[]>([]);
  const [contactCitiesList, setContactCitiesList] = useState<GeoCity[]>([]);

  // Ports
  const [companyPorts, setCompanyPorts] = useState<any[]>([]);
  const [selectedPortName, setSelectedPortName] = useState('');

  // Attachments
  const [companyAttachments, setCompanyAttachments] = useState<any[]>([]);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [analyzeFile, setAnalyzeFile] = useState<File | undefined>();
  const [analyzingAttachmentId, setAnalyzingAttachmentId] = useState<number | null>(null);
  const [analyzedAttachmentIds, setAnalyzedAttachmentIds] = useState<number[]>([]);
  const [attachmentToRename, setAttachmentToRename] = useState<{ id: number; name: string } | null>(null);
  const [isRenamingAttachment, setIsRenamingAttachment] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(!!editingId);
  const [loadError, setLoadError] = useState(false);
  const [loadRetryKey, setLoadRetryKey] = useState(0);

  useEffect(() => {
    apiService.get<any>(`/api/master/business-entities/fill-values?companyNo=${companyNo}`).then((response) => {
      if (response) setBusinessEntityFillValues(response);
    }).catch(err => console.error('Failed to fetch business entity fill-values:', err));
  }, [companyNo]);

  useEffect(() => {
    if (!editingId) {
      setIsLoadingRecord(false);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    setIsLoadingRecord(true);
    setLoadError(false);
    apiService.get<any>(`/api/master/business-entities/load-data/${editingId}?companyNo=${companyNo}`).then(async (response) => {
      if (cancelled) return;
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.businessEntityName || '');
          setAliasName(dl.aliasName || dl.businessEntityAlias || dl.AliasName || '');
          setCompanyType(dl.businessEntityType?.id?.toString() || '');
          setCompanyVatGst(dl.vatgstNo || '');
          setGstinTypeNo(dl.gstinTypeNo?.toString() || dl.gstinType?.id?.toString() || dl.gstinType?.gstinTypeNo?.toString() || '');
          setCreditLimit(dl.creditInsuranceLimit ?? null);
          setCreditInsuranceCompanyName(dl.creditInsuranceCompanyName || '');
          setCompanyTimeZoneNo(dl.timeZone?.timeZoneNo?.toString() || '');
          setSelectedTimeZoneName(
            dl.timeZone?.timeZoneName ||
              dl.timeZone?.crmTimeZoneName ||
              dl.timeZone?.name ||
              dl.timeZoneName ||
              ''
          );
          const mappedFollowUpNotes: FollowUpNote[] = Array.isArray(dl.followUpDetails)
            ? dl.followUpDetails.map((n: any) => ({ date: n.followUpDate || '', note: n.followUpNotes || '' }))
            : (dl.notes ? [{ date: '', note: dl.notes }] : []);
          setFollowUpNotes(mappedFollowUpNotes);

          const mappedLocations = (dl.locations || []).map((l: any) => ({
            type: l.locationType?.addressTypeNo?.toString() || l.locationType?.addressTypeName || '',
            address: l.address || '',
            country: l.country?.countryName || '',
            state: l.state?.stateName || '',
            city: l.city?.cityName || '',
            pinCode: l.pinCode || '',
            mapUrl: l.mapUrl || l.MapUrl || '',
            latitude: l.latitude ?? l.Latitude ?? '',
            longitude: l.longitude ?? l.Longitude ?? ''
          }));
          setCompanyLocations(mappedLocations);

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

          const mappedPorts = (dl.ports || []).map((p: any) => ({
            name: p.port?.portName || '',
            portName: p.port?.portName || '',
            portNo: p.port?.portId || 0
          }));
          setCompanyPorts(mappedPorts);

          try {
            const attachmentList = await attachmentService.getAttachments(parseInt(editingId), 1550);
            if (cancelled) return;
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
            if (!cancelled) setCompanyAttachments([]);
          }
        } else {
          setLoadError(true);
        }
      } else {
        setLoadError(true);
      }
    }).catch(err => {
      console.error('Failed to load company details via API:', err);
      if (!cancelled) setLoadError(true);
    }).finally(() => {
      if (!cancelled) setIsLoadingRecord(false);
    });
    return () => {
      cancelled = true;
    };
  }, [editingId, companyNo, loadRetryKey]);

  const countries: GeoCountry[] = asGeoList<GeoCountry>(
    businessEntityFillValues?.data?.countries || businessEntityFillValues?.countries
  );
  const businessEntityTypes = businessEntityFillValues?.data?.businessEntityTypes || businessEntityFillValues?.businessEntityTypes || [];
  const timeZones = businessEntityFillValues?.data?.timeZones || businessEntityFillValues?.timeZones || [];
  const locationTypes = businessEntityFillValues?.data?.locationTypes || businessEntityFillValues?.locationTypes || [];
  const portsList = (businessEntityFillValues?.data?.ports || businessEntityFillValues?.ports || []).map((pt: any) => pt.portName || pt.name || '');
  const gstinTypes = businessEntityFillValues?.data?.gstinTypes || businessEntityFillValues?.gstinTypes || [];

  const getCountryNo = (countryName: string) => {
    const found = countries.find((x) => x.countryName?.toLowerCase() === countryName?.toLowerCase());
    const no = resolveGeoNo(found, 'countryNo');
    return no != null ? parseInt(String(no), 10) : null;
  };
  const getStateNo = (stateName: string) => {
    const list = locStatesList.length ? locStatesList : (contactStatesList.length ? contactStatesList : []);
    const found = list.find((x) => x.stateName?.toLowerCase() === stateName?.toLowerCase());
    const no = resolveGeoNo(found, 'stateNo');
    return no != null ? parseInt(String(no), 10) : null;
  };
  const getCityNo = (cityName: string) => {
    const list = locCitiesList.length ? locCitiesList : (contactCitiesList.length ? contactCitiesList : []);
    const found = list.find((x) => x.cityName?.toLowerCase() === cityName?.toLowerCase());
    const no = resolveGeoNo(found, 'cityNo');
    return no != null ? parseInt(String(no), 10) : null;
  };
  const getPortNo = (portName: string) => {
    const list = businessEntityFillValues?.data?.ports || businessEntityFillValues?.ports || [];
    const found = list.find((x: any) => x.portName?.toLowerCase() === portName?.toLowerCase());
    return found ? parseInt(found.portNo) : null;
  };
  const getLocationTypeName = (no: string | number) => {
    const found = locationTypes.find((x: any) => x.locationTypeNo?.toString() === no?.toString());
    return found ? found.locationTypeName : (no as string);
  };
  const getLocationTypeNo = (locName: string) => {
    const found = locationTypes.find((x: any) => x.locationTypeName?.toLowerCase() === locName?.toLowerCase());
    return found ? found.locationTypeNo : null;
  };

  // ---- Location modal ----
  const openAddLocationModal = () => {
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
    setLocLatitude(loc.latitude !== undefined && loc.latitude !== null ? loc.latitude.toString() : '');
    setLocLongitude(loc.longitude !== undefined && loc.longitude !== null ? loc.longitude.toString() : '');
    setLocErrors({});
    setEditingLocationIndex(index);
    setLocationModalOpen(true);

    if (loc.country) {
      const foundCountry = countries.find((c) => c.countryName?.toLowerCase() === loc.country.toLowerCase());
      const countryNo = resolveGeoNo(foundCountry, 'countryNo');
      if (countryNo != null) {
        fetchStatesByCountry(countryNo).then((states) => {
          const stateRows = asGeoList<GeoState>(states);
          setLocStatesList(stateRows);
          if (loc.state) {
            const foundState = stateRows.find((s) => s.stateName?.toLowerCase() === loc.state.toLowerCase());
            const stateNo = resolveGeoNo(foundState, 'stateNo');
            if (stateNo != null) {
              fetchCitiesByState(stateNo).then((cities) => setLocCitiesList(asGeoList<GeoCity>(cities)));
            }
          }
        });
      }
    }
  };

  const removeCompanyLocation = (index: number) => {
    setCompanyLocations(prev => prev.filter((_, i) => i !== index));
  };

  const requestRemoveCompanyLocation = (index: number) => {
    const loc = companyLocations[index];
    const typeName = getLocationTypeName(loc?.locationTypeNo || loc?.type || '');
    const label = [typeName, loc?.city || loc?.address].filter(Boolean).join(' · ') || 'Location';
    deleteConfirm.requestConfirm({
      entityLabel: 'location',
      recordName: label,
      onConfirm: () => removeCompanyLocation(index),
    });
  };

  const handleLocationCountryChange = async (val: string) => {
    setLocCountry(val);
    setLocState('');
    setLocCity('');
    setLocStatesList([]);
    setLocCitiesList([]);
    if (locErrors.country) setLocErrors(prev => ({ ...prev, country: '' }));

    const foundCountry = countries.find((c) => c.countryName === val);
    const countryNo = resolveGeoNo(foundCountry, 'countryNo');
    if (countryNo != null) {
      const statesData = await fetchStatesByCountry(countryNo);
      setLocStatesList(asGeoList<GeoState>(statesData));
    }
  };

  const handleLocationStateChange = async (val: string) => {
    setLocState(val);
    setLocCity('');
    setLocCitiesList([]);
    if (locErrors.state) setLocErrors(prev => ({ ...prev, state: '' }));

    const foundState = locStatesList.find((s) => s.stateName === val);
    const stateNo = resolveGeoNo(foundState, 'stateNo');
    if (stateNo != null) {
      const citiesData = await fetchCitiesByState(stateNo);
      setLocCitiesList(asGeoList<GeoCity>(citiesData));
    }
  };

  const addCompanyLocation = () => {
    const errs: Record<string, string> = {};
    if (!locType || locType === 'none') errs.type = 'Location type is required';
    if (!locAddress.trim()) errs.address = 'Location address is required';

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
      latitude: locLatitude,
      longitude: locLongitude
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

  // ---- Contact modal ----
  const openAddContactModal = () => {
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

    if (c.country) {
      const foundCountry = countries.find((cnt) => cnt.countryName?.toLowerCase() === c.country.toLowerCase());
      const countryNo = resolveGeoNo(foundCountry, 'countryNo');
      if (countryNo != null) {
        fetchStatesByCountry(countryNo).then((states) => {
          const stateRows = asGeoList<GeoState>(states);
          setContactStatesList(stateRows);
          if (c.state) {
            const foundState = stateRows.find((s) => s.stateName?.toLowerCase() === c.state.toLowerCase());
            const stateNo = resolveGeoNo(foundState, 'stateNo');
            if (stateNo != null) {
              fetchCitiesByState(stateNo).then((cities) => setContactCitiesList(asGeoList<GeoCity>(cities)));
            }
          }
        });
      }
    }
  };

  const removeCompanyContact = (index: number) => {
    setCompanyContacts(prev => prev.filter((_, i) => i !== index));
  };

  const requestRemoveCompanyContact = (index: number) => {
    const c = companyContacts[index];
    const label = c?.name || c?.contactName || c?.email || 'Contact';
    deleteConfirm.requestConfirm({
      entityLabel: 'contact',
      recordName: label,
      onConfirm: () => removeCompanyContact(index),
    });
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

  const handleContactCountryChange = async (val: string) => {
    setContactCountry(val);
    setContactState('');
    setContactCity('');
    setContactStatesList([]);
    setContactCitiesList([]);
    if (contactErrors.country) setContactErrors(prev => ({ ...prev, country: '' }));

    const foundCountry = countries.find((c) => c.countryName === val);
    const countryNo = resolveGeoNo(foundCountry, 'countryNo');
    if (countryNo != null) {
      const statesData = await fetchStatesByCountry(countryNo);
      setContactStatesList(asGeoList<GeoState>(statesData));
    }
  };

  const handleContactStateChange = async (val: string) => {
    setContactState(val);
    setContactCity('');
    setContactCitiesList([]);
    if (contactErrors.state) setContactErrors(prev => ({ ...prev, state: '' }));

    const foundState = contactStatesList.find((s) => s.stateName === val);
    const stateNo = resolveGeoNo(foundState, 'stateNo');
    if (stateNo != null) {
      const citiesData = await fetchCitiesByState(stateNo);
      setContactCitiesList(asGeoList<GeoCity>(citiesData));
    }
  };

  const addCompanyContact = () => {
    const errs: Record<string, string> = {};
    if (!contactName.trim()) errs.name = 'Representative Name is required';
    if (!contactPhone.trim()) errs.phone = 'Phone number is required';

    if (!contactEmail.trim()) {
      errs.email = 'Email address is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactEmail)) {
        errs.email = 'Please enter a valid email address';
      }
    }

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

  // ---- Ports ----
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

  const requestRemoveCompanyPort = (index: number) => {
    const p = companyPorts[index];
    const label = p?.name || p?.portName || 'Port';
    deleteConfirm.requestConfirm({
      entityLabel: 'port',
      recordName: label,
      onConfirm: () => removeCompanyPort(index),
    });
  };

  // ---- Attachments ----
  const handleAnalyzeAttachment = async (att: any) => {
    try {
      const toastId = toast.loading('Fetching document for analysis...');
      let fileToAnalyze: File;

      if (att.id || att.docNo) {
        fileToAnalyze = await attachmentService.getAttachmentFile(att.id || att.docNo, att.fileName || 'document.jpg');
      } else {
        toast.error('Cannot analyze this file yet.');
        toast.dismiss(toastId);
        return;
      }
      toast.dismiss(toastId);
      setAnalyzeFile(fileToAnalyze);
      setAnalyzingAttachmentId(att.id || att.docNo);
      setIsCameraModalOpen(true);
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error('Failed to load file for analysis');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    e.target.value = '';

    const validation = validateUploadFile(file);
    if (!validation.ok) {
      toast.error(validation.reason);
      return;
    }

    try {
      const activeCompanyNo = parseInt(companyNo as any) || 1;
      let newAttachment: any = null;
      try {
        const entry = await attachmentService.createEntry(file.name, activeCompanyNo, 1550);
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
        console.warn('API Upload failed, falling back to rich mock attachment:', uploadError);
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
      console.error('File upload failed:', err);
    }
  };

  const handleCameraAttachmentUploaded = (attachment: any) => {
    if (attachment) {
      setCompanyAttachments(prev => [...prev, {
        id: attachment.id,
        docNo: attachment.id,
        fileName: attachment.name || attachment.fileName || 'camera-capture.jpg',
        filePath: attachment.storedFilePath || attachment.relativePath || '',
        fileSize: attachment.size || attachment.fileSize || 0
      }]);
    }
    if (errors.attachments) setErrors(prev => ({ ...prev, attachments: '' }));
    setIsCameraModalOpen(false);
    if (analyzingAttachmentId) {
      setAnalyzedAttachmentIds(prev => [...prev, analyzingAttachmentId]);
    }
    setAnalyzeFile(undefined);
    setAnalyzingAttachmentId(null);
  };

  const removeCompanyAttachment = async (index: number) => {
    const att = companyAttachments[index];
    if (att && att.id && att.id > 1000000000) {
      try {
        await attachmentService.deleteAttachment(att.id);
      } catch (err) {
        console.warn('Failed to delete attachment from server:', err);
      }
    }
    setCompanyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const requestRemoveCompanyAttachment = (index: number) => {
    const att = companyAttachments[index];
    const label = att?.fileName || att?.name || 'Attachment';
    deleteConfirm.requestConfirm({
      entityLabel: 'attachment',
      recordName: label,
      onConfirm: () => removeCompanyAttachment(index),
    });
  };

  const requestRenameCompanyAttachment = (index: number) => {
    const att = companyAttachments[index];
    if (att && (att.id || att.docNo)) {
      setAttachmentToRename({ id: att.id || att.docNo, name: att.fileName || att.name || 'document' });
    }
  };

  const confirmRenameCompanyAttachment = async (newName: string) => {
    if (!attachmentToRename) return;
    const { id } = attachmentToRename;
    setIsRenamingAttachment(true);
    try {
      await attachmentService.renameAttachment(id, newName, 1550); // 1550 for Company forms
      
      setCompanyAttachments(prev => prev.map(a => {
        if ((a.id === id) || (a.docNo === id)) {
          return { ...a, fileName: newName, name: newName };
        }
        return a;
      }));
      
      toast.success("Attachment renamed successfully.");
      setAttachmentToRename(null);
    } catch (error) {
      console.error('Failed to rename attachment on server:', error);
      toast.error('Failed to rename attachment');
    } finally {
      setIsRenamingAttachment(false);
    }
  };

  const requestRemoveFollowUpNote = (index: number) => {
    const note = followUpNotes[index];
    const label = (note?.note || '').trim().slice(0, 60) || 'Note';
    deleteConfirm.requestConfirm({
      entityLabel: 'follow-up note',
      recordName: label,
      onConfirm: () => setFollowUpNotes((prev) => prev.filter((_, i) => i !== index)),
    });
  };

  // ---- Save ----
  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Business Entity name is required';
    }
    if (!companyType || companyType === '' || companyType === 'none') {
      newErrors.companyType = 'Business Entity Type is required';
    }
    if (companyLocations.length === 0) {
      newErrors.companyLocations = 'At least one location is required';
    }
    if (gstinTypeNo && !companyVatGst.trim()) {
      newErrors.companyVatGst = 'VAT / GST No is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
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
        mapUrl: l.mapUrl || '',
        latitude: l.latitude !== undefined && l.latitude !== null && l.latitude !== '' ? Number(l.latitude) : null,
        longitude: l.longitude !== undefined && l.longitude !== null && l.longitude !== '' ? Number(l.longitude) : null
      }));

      const computedPorts = companyPorts.map(p => ({
        portNo: p.portNo || getPortNo(p.name || p.portName) || parseInt(p.portNo) || null
      }));

      const computedAttachments = companyAttachments.map(a => ({
        docNo: a.docNo || a.id || null
      }));

      const payload = {
        businessEntityNo: editingId ? parseInt(editingId) : null,
        businessEntityName: name,
        aliasName: aliasName.trim() || null,
        businessEntityAlias: aliasName.trim() || null,
        crmBusinessEntityTypeNo: companyType ? parseInt(companyType) : null,
        crmTimeZoneNo: companyTimeZoneNo ? parseInt(companyTimeZoneNo) : null,
        vatgstNo: companyVatGst || null,
        gstinTypeNo: gstinTypeNo ? parseInt(gstinTypeNo) : null,
        creditInsuranceLimit: creditLimit ?? null,
        creditInsuranceCompanyName: creditInsuranceCompanyName || null,
        address: null,
        countryNo: null,
        stateNo: null,
        cityNo: null,
        pinCode: null,
        contactPersons: computedContacts,
        locations: computedLocations,
        ports: computedPorts,
        attachment: computedAttachments,
        followUpDetails: followUpNotes.map(n => ({ followUpNotes: n.note, followUpDate: n.date || null }))
      };
      await apiService.post('/api/master/business-entities/save', payload);
      setShowSuccessAlert(true);
    } catch (err: any) {
      const parsed = parseApiSaveError(err);
      setErrors(parsed.fieldErrors);
      setServerError(parsed.serverError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <MasterFormShell
      type="company"
      title={TITLE}
      editingId={editingId}
      isSaving={isSaving}
      serverError={serverError}
      onSubmit={handleSubmit}
      showConfirm={showConfirm}
      onCancelConfirm={() => setShowConfirm(false)}
      onConfirmSave={handleConfirmSave}
      showSuccessAlert={showSuccessAlert}
      onSuccessOk={() => { setShowSuccessAlert(false); goToList(); }}
      isLoadingRecord={isLoadingRecord}
      loadError={loadError}
      onRetryLoad={() => setLoadRetryKey((k) => k + 1)}
    >
      <div className="space-y-4 pb-4">
        <div data-page-tour="company-header">
          <CompanyHeaderFields
            code={editingId ? `BE-${editingId}` : ''}
            editingId={editingId}
            name={name}
            setName={setName}
            aliasName={aliasName}
            setAliasName={setAliasName}
            companyType={companyType}
            setCompanyType={setCompanyType}
            companyTimeZoneNo={companyTimeZoneNo}
            setCompanyTimeZoneNo={setCompanyTimeZoneNo}
            selectedTimeZoneName={selectedTimeZoneName}
            setSelectedTimeZoneName={setSelectedTimeZoneName}
            creditLimit={creditLimit}
            setCreditLimit={setCreditLimit}
            creditInsuranceCompanyName={creditInsuranceCompanyName}
            setCreditInsuranceCompanyName={setCreditInsuranceCompanyName}
            companyVatGst={companyVatGst}
            setCompanyVatGst={setCompanyVatGst}
            gstinTypeNo={gstinTypeNo}
            setGstinTypeNo={setGstinTypeNo}
            gstinTypes={asGeoList(gstinTypes)}
            businessEntityTypes={businessEntityTypes}
            timeZones={timeZones}
            errors={errors}
            setErrors={setErrors}
            onOpenCamera={() => setIsCameraModalOpen(true)}
          />
        </div>

        <div data-page-tour="company-locations">
          <CompanyLocationsSection
            locations={companyLocations}
            getLocationTypeName={getLocationTypeName}
            onAdd={openAddLocationModal}
            onEdit={handleEditLocation}
            onRemove={requestRemoveCompanyLocation}
            error={errors.companyLocations}
          />
        </div>

        <div data-page-tour="company-contacts">
          <CompanyContactsSection
            contacts={companyContacts}
            companyName={name}
            onAdd={openAddContactModal}
            onEdit={handleEditContact}
            onRemove={requestRemoveCompanyContact}
          />
        </div>

        <CompanyPortsSection
          ports={companyPorts}
          portsList={portsList}
          selectedPortName={selectedPortName}
          onSelectedPortNameChange={setSelectedPortName}
          onAdd={addCompanyPort}
          onRemove={requestRemoveCompanyPort}
        />

        <div data-page-tour="company-attachments">
          <CompanyAttachmentsSection
            attachments={companyAttachments}
            companyName={name}
            onFileUpload={handleFileUpload}
            onOpenCamera={() => setIsCameraModalOpen(true)}
            onAnalyze={handleAnalyzeAttachment}
            onRemove={requestRemoveCompanyAttachment}
            onRename={requestRenameCompanyAttachment}
            analyzedAttachmentIds={analyzedAttachmentIds}
            error={errors.attachments}
          />
        </div>
        <CompanyNotesSection
          notes={followUpNotes}
          onChange={setFollowUpNotes}
          onRemove={requestRemoveFollowUpNote}
        />

        {isCameraModalOpen && (
          <Dialog
            open={isCameraModalOpen}
            onOpenChange={(open) => {
              setIsCameraModalOpen(open);
              if (!open) setAnalyzeFile(undefined);
            }}
          >
            <DialogContent
              className={cn(
                'w-[calc(100vw-1.5rem)] max-w-4xl p-0 gap-0 overflow-hidden',
                'max-h-[min(90dvh,900px)] flex flex-col',
                'rounded-[12px] border border-[var(--tm-border)]/80 shadow-xl bg-[var(--tm-surface)] select-none'
              )}
            >
              <DialogHeader className="shrink-0 px-4 sm:px-5 py-3 border-b border-[var(--tm-border)] bg-[var(--tm-elevated)]">
                <DialogTitle className="text-base font-semibold text-slate-100 tracking-tight flex items-center gap-2 pr-6">
                  <CameraIcon size={16} className="text-[#0EA5E9] shrink-0" />
                  {analyzeFile ? 'Analyze Attachment' : 'Capture Attachment'}
                </DialogTitle>
                <DialogDescription className="text-[11px] font-medium text-slate-500 mt-0.5">
                  {analyzeFile
                    ? 'Review and extract data from the selected document.'
                    : 'Take a photo and upload it as a Business Entity attachment.'}
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                <Suspense
                  fallback={
                    <div className="flex flex-1 items-center justify-center py-20">
                      <BrandLoader size="sm" message="Loading camera" />
                    </div>
                  }
                >
                  <CameraComp
                    companyNo={parseInt(companyNo as any) || 1}
                    formNo={1550}
                    fileNamePrefix="business-entity-capture"
                    className="border-0 shadow-none rounded-none flex-1 min-h-0"
                    initialAnalyzeFile={analyzeFile}
                    onUploaded={handleCameraAttachmentUploaded}
                    onCancel={() => {
                      setIsCameraModalOpen(false);
                      setAnalyzeFile(undefined);
                    }}
                    onCardScanned={(data: any) => {
                      if (data.company && !name?.trim()) {
                        setName(data.company);
                      }
                      if (data.name || data.email || data.phone || data.mobile || data.designation) {
                        setCompanyContacts(prev => [
                          ...prev,
                          {
                            contactName: data.name || '',
                            name: data.name || '',
                            contactPersonName: data.name || '',
                            designation: data.designation || '',
                            department: '',
                            phone: data.phone || data.mobile || '',
                            phoneNo: data.phone || data.mobile || '',
                            email: data.email || '',
                            address: data.address || '',
                            // country: data.country || '',
                            // state: data.state || '',
                            // city: data.city || '',
                            status: 'Active'
                          }
                        ]);
                      }
                      /*
                      if (data.address || data.city || data.state || data.country) {
                        const defaultLocType = locationTypes.find((t: any) => /office/i.test(t.locationTypeName || ''))?.locationTypeNo ?? locationTypes[0]?.locationTypeNo;
                        setCompanyLocations(prev => [
                          ...prev,
                          {
                            type: defaultLocType !== undefined ? defaultLocType.toString() : '',
                            address: data.address || '',
                            // country: data.country || '',
                            // state: data.state || '',
                            // city: data.city || '',
                            pinCode: '',
                            mapUrl: '',
                            latitude: '',
                            longitude: ''
                          }
                        ]);
                      }
                      */
                    }}
                  />
                </Suspense>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <CompanyLocationModal
          open={locationModalOpen}
          onOpenChange={setLocationModalOpen}
          editingIndex={editingLocationIndex}
          locationTypes={locationTypes}
          countries={countries}
          statesList={locStatesList}
          citiesList={locCitiesList}
          locType={locType}
          setLocType={setLocType}
          locAddress={locAddress}
          setLocAddress={setLocAddress}
          locCountry={locCountry}
          onCountryChange={handleLocationCountryChange}
          locState={locState}
          onStateChange={handleLocationStateChange}
          locCity={locCity}
          setLocCity={setLocCity}
          locPin={locPin}
          setLocPin={setLocPin}
          locMapUrl={locMapUrl}
          setLocMapUrl={setLocMapUrl}
          locLatitude={locLatitude}
          setLocLatitude={setLocLatitude}
          locLongitude={locLongitude}
          setLocLongitude={setLocLongitude}
          locErrors={locErrors}
          setLocErrors={setLocErrors}
          onSave={addCompanyLocation}
        />

        <CompanyContactModal
          open={contactModalOpen}
          onOpenChange={setContactModalOpen}
          editingIndex={editingContactIndex}
          countries={countries}
          statesList={contactStatesList}
          citiesList={contactCitiesList}
          contactName={contactName}
          setContactName={setContactName}
          contactDesignation={contactDesignation}
          setContactDesignation={setContactDesignation}
          contactDepartment={contactDepartment}
          setContactDepartment={setContactDepartment}
          contactPhone={contactPhone}
          setContactPhone={setContactPhone}
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          onEmailBlur={validateEmailBlur}
          contactAddress={contactAddress}
          setContactAddress={setContactAddress}
          contactCountry={contactCountry}
          onCountryChange={handleContactCountryChange}
          contactState={contactState}
          onStateChange={handleContactStateChange}
          contactCity={contactCity}
          setContactCity={setContactCity}
          contactPinCode={contactPinCode}
          setContactPinCode={setContactPinCode}
          contactStatus={contactStatus}
          setContactStatus={setContactStatus}
          contactErrors={contactErrors}
          setContactErrors={setContactErrors}
          onSave={addCompanyContact}
        />

        <MasterDeleteDialog
          open={deleteConfirm.open}
          onOpenChange={deleteConfirm.onOpenChange}
          onConfirm={deleteConfirm.handleConfirm}
          recordName={deleteConfirm.recordName}
          entityLabel={deleteConfirm.entityLabel}
          confirming={deleteConfirm.confirming}
        />

        {attachmentToRename && (
          <RenameAttachmentDialog
            open={!!attachmentToRename}
            onOpenChange={(open) => {
              if (!open && !isRenamingAttachment) setAttachmentToRename(null);
            }}
            onConfirm={confirmRenameCompanyAttachment}
            originalName={attachmentToRename.name}
            confirming={isRenamingAttachment}
          />
        )}
      </div>
    </MasterFormShell>
  );
}
