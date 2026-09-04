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
  sequence?: number | string;
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

export interface VesselMaster {
  id: string;
  code: string;
  name: string;
  createdBy?: string;
  createdDate?: string;
}

export interface PortMaster {
  id: string;
  code: string;
  name: string;
  portAlias: string;
  countryNo: string;
  countryName?: string;
  stateNo: string;
  stateName?: string;
  cityNo: string;
  cityName?: string;
  createdBy?: string;
  createdDate?: string;
}

export interface BusinessEntityTypeMaster {
  id: string;
  code: string;
  name: string;
  description: string;
  createdBy?: string;
  createdDate?: string;
}

export interface CountryMaster {
  id: string;
  code: string;
  name: string;
  createdBy?: string;
  createdDate?: string;
}

export interface StateMaster {
  id: string;
  code: string;
  name: string;
  countryNo: string;
  gstStateCode: string;
  isUnionTerritory: boolean;
  createdBy?: string;
  createdDate?: string;
}

export interface CityMaster {
  id: string;
  code: string;
  name: string;
  countryNo: string;
  stateNo: string;
  createdBy?: string;
  createdDate?: string;
}

export interface TaskCompanyMaster {
  id: string;
  code: string;
  name: string;
  aliasName: string;
  address1: string;
  address2: string;
  address3: string;
  countryNo: string;
  stateNo: string;
  cityNo: string;
  countryName: string;
  stateName: string;
  cityName: string;
  pinCode: string;
  createdBy?: string;
  createdDate?: string;
}

export interface MeetingCategoryMaster {
  id: string;
  code: string;
  name: string;
  inactive?: boolean;
  createdBy?: string;
  createdDate?: string;
}

export interface MeetingTypeMaster {
  id: string;
  code: string;
  name: string;
  inactive?: boolean;
  createdBy?: string;
  createdDate?: string;
}
