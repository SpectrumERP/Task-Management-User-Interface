import { MasterConfig } from '../core/types';

export const getTypeConfig = (): MasterConfig => ({
  title: 'Type Master',
  endpoints: {
    search: '/api/master/task-types/search-data',
    load: '/api/master/task-types/load-data',
    save: '/api/master/task-types/save',
    delete: '/api/master/task-types/delete'
  },
  idField: 'operTaskTypeNo',
  columns: [
    { key: 'code', header: 'Code', width: '120px' },
    { key: 'operTaskTypeName', header: 'Type Name' },
    { key: 'createdBy', header: 'Created By' },
    { key: 'createdDate', header: 'Created Date' }
  ],
  formFields: [
    {
      name: 'operTaskTypeName',
      label: 'Type Name',
      type: 'text',
      required: true,
      placeholder: 'Enter type name',
      colSpan: 2 // It spans across the grid in MasterManager
    }
  ],
  transformBeforeSave: (payload) => ({
    operTaskTypeNo: payload.operTaskTypeNo,
    operTaskTypeName: payload.operTaskTypeName
  }),
  transformAfterLoad: (record) => ({
    ...record,
    operTaskTypeName: record.name || record.operTaskTypeName
  })
});
