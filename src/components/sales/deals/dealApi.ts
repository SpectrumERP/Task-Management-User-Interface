import { apiService } from '@/services/apiService';
import { DealFormValues, DealRecord, DealSearchFilters } from '@/types/deal';

export const DEAL_ENDPOINTS = {
  searchData: '/api/sales/deals/search-data',
  loadData: (id: string) => `/api/sales/deals/load-data/${id}`,
  save: '/api/sales/deals/save',
  delete: '/api/sales/deals/delete',
  divisionsByCompany: (companyNo: string) => `/api/master/divisions/by-company/${companyNo}`,
};

export interface DealOption {
  value: string;
  label: string;
}

const toIsoDate = (date?: Date | string | null) => {
  if (!date) return undefined;
  if (typeof date === 'string') return date;
  return date.toISOString();
};

const pickId = (item: any) => (
  item?.dealEntryNo ??
  item?.DealEntryNo ??
  item?.salesDealNo ??
  item?.SalesDealNo ??
  item?.salesDealsNo ??
  item?.SalesDealsNo ??
  item?.salesDealHeaderNo ??
  item?.SalesDealHeaderNo ??
  item?.operSalesDealNo ??
  item?.OperSalesDealNo ??
  item?.dealNo ??
  item?.DealNo ??
  item?.id ??
  item?.Id ??
  item?.documentNo ??
  item?.DocumentNo ??
  ''
).toString();

export const mapDealRecord = (item: any): DealRecord => ({
  id: pickId(item),
  companyNo: (item?.companyNo ?? item?.CompanyNo ?? item?.company?.companyNo ?? item?.company?.CompanyNo ?? '').toString(),
  companyName: item?.companyName ?? item?.CompanyName ?? item?.company?.companyName ?? item?.company?.CompanyName ?? item?.company?.name ?? '',
  divisionNo: (item?.divisionNo ?? item?.DivisionNo ?? item?.division?.divisionNo ?? item?.division?.DivisionNo ?? '').toString(),
  divisionName: item?.divisionName ?? item?.DivisionName ?? item?.division?.divisionName ?? item?.division?.DivisionName ?? item?.division?.name ?? '',
  documentNoYearly: (item?.documentNoYearly ?? item?.DocumentNoYearly ?? '').toString(),
  documentDate: item?.documentDate ?? item?.DocumentDate ?? '',
  description: item?.description ?? item?.Description ?? '',
  raw: item,
});

export const buildSearchParams = (filters: DealSearchFilters) => {
  const params: Record<string, any> = {};
  if (filters.companyNo) params.CompanyNo = Number(filters.companyNo);
  if (filters.divisionNo) params.DivisionNo = Number(filters.divisionNo);
  if (filters.documentNoYearly) params.DocumentNoYearly = filters.documentNoYearly;
  if (filters.fromDocumentDate) params.FromDocumentDate = toIsoDate(filters.fromDocumentDate);
  if (filters.toDocumentDate) params.ToDocumentDate = toIsoDate(filters.toDocumentDate);
  params.PageSize = filters.pageSize ?? 10;
  params.PageNo = filters.pageNo ?? 1;
  return params;
};

export const buildSavePayload = (values: DealFormValues, existing?: DealRecord | null) => {
  const payload: Record<string, any> = {
    companyNo: Number(values.companyNo),
    documentNoYearly: values.documentNoYearly,
    documentDate: toIsoDate(values.documentDate),
    description: values.description,
    documentStatusNo: existing?.raw?.documentStatusNo ?? existing?.raw?.DocumentStatusNo ?? 30
  };

  if (values.divisionNo) {
    payload.divisionNo = Number(values.divisionNo);
  }

  const yearNo = existing?.raw?.yearNo ?? existing?.raw?.YearNo;
  if (yearNo !== undefined && yearNo !== null) {
    payload.yearNo = Number(yearNo);
  }

  if (existing?.id) {
    payload.dealEntryNo = Number.isNaN(Number(existing.id)) ? existing.id : Number(existing.id);
  }

  return payload;
};

export async function searchDeals(filters: DealSearchFilters): Promise<DealRecord[]> {
  const response = await apiService.get<any>(DEAL_ENDPOINTS.searchData, {
    params: buildSearchParams(filters),
  });
  const rawItems = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
  return rawItems.map(mapDealRecord);
}

const mapDivisionOption = (item: any): DealOption => ({
  value: (item?.divisionNo ?? item?.DivisionNo ?? item?.id ?? item?.Id ?? item?.value ?? '').toString(),
  label: item?.divisionName ?? item?.DivisionName ?? item?.name ?? item?.Name ?? item?.label ?? '',
});

export async function fetchDivisionsByCompany(companyNo: string): Promise<DealOption[]> {
  if (!companyNo) return [];
  const response = await apiService.get<any>(DEAL_ENDPOINTS.divisionsByCompany(companyNo));
  const data = response?.data ?? response ?? [];
  const rawDivisions = Array.isArray(data) ? data : data.divisions ?? data.Divisions ?? data.division ?? data.Division ?? [];
  return Array.isArray(rawDivisions) ? rawDivisions.map(mapDivisionOption).filter((item) => item.value) : [];
}

export async function loadDeal(id: string): Promise<DealRecord | null> {
  const response = await apiService.get<any>(DEAL_ENDPOINTS.loadData(id));
  const data = response?.data ?? response;
  return data ? mapDealRecord(data) : null;
}

export async function saveDeal(values: DealFormValues, existing?: DealRecord | null) {
  return apiService.post<any>(DEAL_ENDPOINTS.save, buildSavePayload(values, existing));
}

export async function deleteDeal(id: string) {
  return apiService.delete<any>(DEAL_ENDPOINTS.delete, {
    params: { dealEntryNo: id },
  });
}
