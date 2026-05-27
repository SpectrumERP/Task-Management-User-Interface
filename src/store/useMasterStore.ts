import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CategoryMaster {
  id: string;
  code: string;
  name: string;
  isApprovalApplicable: boolean;
  isInReviewRequired: boolean;
  isBusinessBenefitApplicable: boolean;
  checkList: string[]; // array of descriptions only
  color?: string;
}

export interface TypeMaster {
  id: string;
  code: string;
  name: string;
}

export interface PriorityMaster {
  id: string;
  code: string;
  name: string;
  priorityDuration: number;
  priorityFrequencyNo: string;
}

export interface FolderMaster {
  id: string;
  code: string;
  name: string;
  description: string;
  parentFolderNo: string;
  sequence: number;
}

export interface UserGroupMaster {
  id: string;
  code: string;
  name: string;
  description: string;
  users: string[]; // array of userIds
}

export interface BusinessBenefitTypeMaster {
  id: string;
  code: string;
  name: string;
  valuationtypeNo: string;
}

export interface LocationMaster {
  id: string;
  code: string;
  name: string;
  type: string;
  parentLocationNo: string;
  inchargeNo: string;
  address1: string;
  address2: string;
  address3: string;
  countryNo: string;
  stateNo: string;
  cityNo: string;
  pinCode: string;
  locationRegion: string;
}

export interface CompanyLocation {
  type: string;
  address: string;
  country: string;
  state: string;
  city: string;
  pinCode: string;
}

export interface CompanyContact {
  name: string;
  address: string;
  country: string;
  state: string;
  city: string;
  pinCode: string;
  phone?: string;
  email: string;
  designation?: string;
  department?: string;
}

export interface CompanyPort {
  name: string;
}

export interface CompanyAttachment {
  name: string;
  size: number;
}

export interface CompanyMaster {
  id: string;
  code: string;
  name: string;
  type: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  vatGst?: string;
  creditLimit?: number;
  status: string;
  locations: CompanyLocation[];
  contacts: CompanyContact[];
  ports: CompanyPort[];
  attachments: CompanyAttachment[];
}

interface MasterState {
  categories: CategoryMaster[];
  types: TypeMaster[];
  priorities: PriorityMaster[];
  folders: FolderMaster[];
  userGroups: UserGroupMaster[];
  businessBenefitTypes: BusinessBenefitTypeMaster[];
  locations: LocationMaster[];
  companies: CompanyMaster[];

  // CRUD for Categories
  addCategory: (item: Omit<CategoryMaster, 'id' | 'code'>) => void;
  updateCategory: (id: string, item: Partial<CategoryMaster>) => void;
  deleteCategory: (id: string) => void;

  // CRUD for Types
  addType: (item: Omit<TypeMaster, 'id' | 'code'>) => void;
  updateType: (id: string, item: Partial<TypeMaster>) => void;
  deleteType: (id: string) => void;

  // CRUD for Priorities
  addPriority: (item: Omit<PriorityMaster, 'id' | 'code'>) => void;
  updatePriority: (id: string, item: Partial<PriorityMaster>) => void;
  deletePriority: (id: string) => void;

  // CRUD for Folders
  addFolder: (item: Omit<FolderMaster, 'id' | 'code'>) => void;
  updateFolder: (id: string, item: Partial<FolderMaster>) => void;
  deleteFolder: (id: string) => void;

  // CRUD for User Groups
  addUserGroup: (item: Omit<UserGroupMaster, 'id' | 'code'>) => void;
  updateUserGroup: (id: string, item: Partial<UserGroupMaster>) => void;
  deleteUserGroup: (id: string) => void;

  // CRUD for Business Benefit Types
  addBusinessBenefitType: (item: Omit<BusinessBenefitTypeMaster, 'id' | 'code'>) => void;
  updateBusinessBenefitType: (id: string, item: Partial<BusinessBenefitTypeMaster>) => void;
  deleteBusinessBenefitType: (id: string) => void;

  // CRUD for Locations
  addLocation: (item: Omit<LocationMaster, 'id' | 'code'>) => void;
  updateLocation: (id: string, item: Partial<LocationMaster>) => void;
  deleteLocation: (id: string) => void;

  // CRUD for Companies
  addCompany: (item: Omit<CompanyMaster, 'id' | 'code'>) => void;
  updateCompany: (id: string, item: Partial<CompanyMaster>) => void;
  deleteCompany: (id: string) => void;
}

const generateCode = (prefix: string, listLength: number) => {
  const nextNum = listLength + 1;
  return `${prefix}-${nextNum.toString().padStart(4, '0')}`;
};

export const useMasterStore = create<MasterState>()(
  persist(
    (set) => ({
      categories: [
        {
          id: 'cat-1',
          code: 'CAT-0001',
          name: 'Operational Tasks',
          isApprovalApplicable: true,
          isInReviewRequired: true,
          isBusinessBenefitApplicable: true,
          checkList: ['Verify user logs', 'Audit DB connection pool', 'Analyze system metrics'],
          color: '#3b82f6',
        },
        {
          id: 'cat-2',
          code: 'CAT-0002',
          name: 'Safety Tasks',
          isApprovalApplicable: true,
          isInReviewRequired: false,
          isBusinessBenefitApplicable: false,
          checkList: ['Inspect fire exit locks', 'Test gas backup sensors'],
          color: '#ef4444',
        },
        {
          id: 'cat-3',
          code: 'CAT-0003',
          name: 'Maintenance Tasks',
          isApprovalApplicable: false,
          isInReviewRequired: true,
          isBusinessBenefitApplicable: true,
          checkList: ['Oil rotor bearings', 'Clean particulate filters'],
          color: '#10b981',
        }
      ],
      types: [
        { id: 'typ-1', code: 'TYP-0001', name: 'Internal' },
        { id: 'typ-2', code: 'TYP-0002', name: 'Client Request' },
        { id: 'typ-3', code: 'TYP-0003', name: 'Maintenance' }
      ],
      priorities: [
        { id: 'pri-1', code: 'PRI-0001', name: 'Urgent', priorityDuration: 4, priorityFrequencyNo: 'Hours' },
        { id: 'pri-2', code: 'PRI-0002', name: 'High', priorityDuration: 1, priorityFrequencyNo: 'Days' },
        { id: 'pri-3', code: 'PRI-0003', name: 'Medium', priorityDuration: 3, priorityFrequencyNo: 'Days' },
        { id: 'pri-4', code: 'PRI-0004', name: 'Low', priorityDuration: 1, priorityFrequencyNo: 'Weeks' }
      ],
      folders: [
        { id: 'fld-1', code: 'FLD-0001', name: 'Sprint Backlog', description: 'Immediate sprint deliverables', parentFolderNo: '', sequence: 1 },
        { id: 'fld-2', code: 'FLD-0002', name: 'Release 2.0', description: 'Product launch milestones', parentFolderNo: '', sequence: 2 },
        { id: 'fld-3', code: 'FLD-0003', name: 'Core Infrastructure', description: 'Cloud setup and DevOps pipelines', parentFolderNo: '', sequence: 3 }
      ],
      userGroups: [
        { id: 'ug-1', code: 'GRP-0001', name: 'Engineering Core', description: 'System architects and lead programmers', users: ['1', '2', '3'] },
        { id: 'ug-2', code: 'GRP-0002', name: 'QA Team', description: 'Manual testers and automation engineers', users: ['4', '5'] }
      ],
      businessBenefitTypes: [
        { id: 'bbt-1', code: 'BBT-0001', name: 'Revenue Expansion', valuationtypeNo: 'Financial Valuation' },
        { id: 'bbt-2', code: 'BBT-0002', name: 'Time Savings / SLA Reduction', valuationtypeNo: 'Non-Financial (Hours)' },
        { id: 'bbt-3', code: 'BBT-0003', name: 'Customer Satisfaction SLA', valuationtypeNo: 'Intangible Score' }
      ],
      locations: [
        {
          id: 'loc-1',
          code: 'LOC-0001',
          name: 'Silicon Valley Headquarters',
          type: 'Headquarters',
          parentLocationNo: '',
          inchargeNo: '1',
          address1: '100 Infinity Loop',
          address2: 'Suite 400',
          address3: '',
          countryNo: 'United States',
          stateNo: 'California',
          cityNo: 'Cupertino',
          pinCode: '95014',
          locationRegion: 'West Coast'
        },
        {
          id: 'loc-2',
          code: 'LOC-0002',
          name: 'London Regional Hub',
          type: 'Regional Office',
          parentLocationNo: '1',
          inchargeNo: '3',
          address1: '32 Finsbury Square',
          address2: '',
          address3: '',
          countryNo: 'United Kingdom',
          stateNo: 'Greater London',
          cityNo: 'London',
          pinCode: 'EC2A 1HD',
          locationRegion: 'EMEA'
        }
      ],
      companies: [
        {
          id: 'comp-1',
          code: 'COMP-0001',
          name: 'Acme Global Inc.',
          type: 'Buy',
          address: '456 Innovation Way',
          city: 'New York',
          state: 'New York State',
          country: 'United States',
          pinCode: '10001',
          vatGst: 'US987654321',
          creditLimit: 500000,
          status: 'Active',
          locations: [
            {
              type: 'Office',
              address: '789 Corporate Tower, 12th Floor',
              country: 'United States',
              state: 'New York State',
              city: 'New York',
              pinCode: '10001'
            }
          ],
          contacts: [
            {
              name: 'John Doe',
              address: '789 Corporate Tower, 12th Floor',
              country: 'United States',
              state: 'New York State',
              city: 'New York',
              pinCode: '10001',
              phone: '123-456-7890',
              email: 'john.doe@acme.com',
              designation: 'Purchasing Manager',
              department: 'Procurement'
            }
          ],
          ports: [
            { name: 'Port of Los Angeles' }
          ],
          attachments: [
            { name: 'acme_certificate.pdf', size: 1048576 }
          ]
        }
      ],

      // Categories actions
      addCategory: (item) => set((state) => {
        const id = `cat-${Date.now()}`;
        const code = generateCode('CAT', state.categories.length);
        return { categories: [...state.categories, { ...item, id, code }] };
      }),
      updateCategory: (id, item) => set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? { ...c, ...item } : c)),
      })),
      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
      })),

      // Types actions
      addType: (item) => set((state) => {
        const id = `typ-${Date.now()}`;
        const code = generateCode('TYP', state.types.length);
        return { types: [...state.types, { ...item, id, code }] };
      }),
      updateType: (id, item) => set((state) => ({
        types: state.types.map((t) => (t.id === id ? { ...t, ...item } : t)),
      })),
      deleteType: (id) => set((state) => ({
        types: state.types.filter((t) => t.id !== id),
      })),

      // Priorities actions
      addPriority: (item) => set((state) => {
        const id = `pri-${Date.now()}`;
        const code = generateCode('PRI', state.priorities.length);
        return { priorities: [...state.priorities, { ...item, id, code }] };
      }),
      updatePriority: (id, item) => set((state) => ({
        priorities: state.priorities.map((p) => (p.id === id ? { ...p, ...item } : p)),
      })),
      deletePriority: (id) => set((state) => ({
        priorities: state.priorities.filter((p) => p.id !== id),
      })),

      // Folders actions
      addFolder: (item) => set((state) => {
        const id = `fld-${Date.now()}`;
        const code = generateCode('FLD', state.folders.length);
        return { folders: [...state.folders, { ...item, id, code }] };
      }),
      updateFolder: (id, item) => set((state) => ({
        folders: state.folders.map((f) => (f.id === id ? { ...f, ...item } : f)),
      })),
      deleteFolder: (id) => set((state) => ({
        folders: state.folders.filter((f) => f.id !== id),
      })),

      // User Groups actions
      addUserGroup: (item) => set((state) => {
        const id = `ug-${Date.now()}`;
        const code = generateCode('GRP', state.userGroups.length);
        return { userGroups: [...state.userGroups, { ...item, id, code }] };
      }),
      updateUserGroup: (id, item) => set((state) => ({
        userGroups: state.userGroups.map((u) => (u.id === id ? { ...u, ...item } : u)),
      })),
      deleteUserGroup: (id) => set((state) => ({
        userGroups: state.userGroups.filter((u) => u.id !== id),
      })),

      // Business Benefit Types actions
      addBusinessBenefitType: (item) => set((state) => {
        const id = `bbt-${Date.now()}`;
        const code = generateCode('BBT', state.businessBenefitTypes.length);
        return { businessBenefitTypes: [...state.businessBenefitTypes, { ...item, id, code }] };
      }),
      updateBusinessBenefitType: (id, item) => set((state) => ({
        businessBenefitTypes: state.businessBenefitTypes.map((b) => (b.id === id ? { ...b, ...item } : b)),
      })),
      deleteBusinessBenefitType: (id) => set((state) => ({
        businessBenefitTypes: state.businessBenefitTypes.filter((b) => b.id !== id),
      })),

      // Locations actions
      addLocation: (item) => set((state) => {
        const id = `loc-${Date.now()}`;
        const code = generateCode('LOC', state.locations.length);
        return { locations: [...state.locations, { ...item, id, code }] };
      }),
      updateLocation: (id, item) => set((state) => ({
        locations: state.locations.map((l) => (l.id === id ? { ...l, ...item } : l)),
      })),
      deleteLocation: (id) => set((state) => ({
        locations: state.locations.filter((l) => l.id !== id),
      })),

      // Companies actions
      addCompany: (item) => set((state) => {
        const id = `comp-${Date.now()}`;
        const code = generateCode('COMP', state.companies.length);
        return { companies: [...state.companies, { ...item, id, code }] };
      }),
      updateCompany: (id, item) => set((state) => ({
        companies: state.companies.map((c) => (c.id === id ? { ...c, ...item } : c)),
      })),
      deleteCompany: (id) => set((state) => ({
        companies: state.companies.filter((c) => c.id !== id),
      })),
    }),
    {
      name: 'glacier_masters_persistence',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
