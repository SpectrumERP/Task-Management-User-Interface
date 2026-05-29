export interface DealRecord {
  id: string;
  companyNo: string;
  companyName?: string;
  divisionNo: string;
  divisionName?: string;
  documentNoYearly: string;
  documentDate: string;
  description: string;
  raw?: any;
}

export interface DealFormValues {
  companyNo: string;
  divisionNo: string;
  documentNoYearly: string;
  documentDate?: Date;
  description: string;
}

export interface DealSearchFilters {
  companyNo?: string;
  divisionNo?: string;
  documentNoYearly?: string;
  fromDocumentDate?: Date;
  toDocumentDate?: Date;
  pageSize?: number;
  pageNo?: number;
}
