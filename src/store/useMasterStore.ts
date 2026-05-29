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
