export const MASTER_TYPES = [
  'category',
  'type',
  'priority',
  'folder',
  'user-group',
  'benefit-type',
  'location',
  'vessel',
  'port',
  'business-entity-type',
  'company',
  'task-company',
  'country',
  'state',
  'city',
  'meeting-category',
  'meeting-type',
] as const;

export type MasterType = typeof MASTER_TYPES[number];

export const toMasterListPath = (type: MasterType | string) => `/master/${type}`;
export const toMasterNewPath = (type: MasterType | string) => `/master/${type}/new`;
export const toMasterEditPath = (type: MasterType | string, id: string) => `/master/${type}/edit/${id}`;
