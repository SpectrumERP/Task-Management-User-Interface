import { MasterConfig } from '../core/types';

export const getPriorityConfig = (fillValues?: any): MasterConfig => ({
  title: 'Priority Master',
  endpoints: {
    search: '/api/master/task-priorities/search-data',
    load: '/api/master/task-priorities/load-data',
    save: '/api/master/task-priorities/save',
    delete: '/api/master/task-priorities/delete'
  },
  idField: 'operTaskPriorityNo',
  columns: [
    { key: 'code', header: 'Code', width: '120px' },
    { key: 'taskPriorityName', header: 'Priority Name' },
    { key: 'sequenceNo', header: 'Sequence' },
    { 
      key: 'priorityDuration', 
      header: 'Priority Duration',
      render: (val, row) => {
        if (val == null) return '-';
        const freq = row.priorityDurationFrequency?.frequencyName || row.priorityDurationFrequencyName || '';
        return `${val} ${freq}`.trim();
      }
    },
    { key: 'createdBy', header: 'Created By' },
    { key: 'createdDate', header: 'Created Date' }
  ],
  formFields: [
    {
      name: 'taskPriorityName',
      label: 'Priority Name',
      type: 'text',
      required: true,
      placeholder: 'Enter priority name'
    },
    {
      name: 'sequenceNo',
      label: 'Sequence No',
      type: 'number',
      placeholder: 'Enter sequence number'
    },
    {
      name: 'priorityDuration',
      label: 'Default Estimation Duration',
      type: 'number',
      placeholder: 'Enter duration'
    },
    {
      name: 'priorityDurationFrequency.frequencyNo',
      label: 'Default Estimation Unit',
      type: 'combobox',
      placeholder: 'Select default estimation unit',
      options: (fillValues?.frequency || []).map((f: any) => ({
        label: f.FrequencyName || f.Frequency || f.name || '',
        value: (f.FrequencyNo || f.id || '').toString()
      }))
    }
  ],
  transformBeforeSave: (payload) => ({
    operTaskPriorityNo: payload.operTaskPriorityNo,
    TaskPriorityName: payload.taskPriorityName || payload.operTaskPriorityName,
    sequenceNo: payload.sequenceNo ? Number(payload.sequenceNo) : null,
    priorityDuration: payload.priorityDuration ? Number(payload.priorityDuration) : null,
    priorityDurationFrequencyNo: payload['priorityDurationFrequency.frequencyNo'] ? Number(payload['priorityDurationFrequency.frequencyNo']) : null
  }),
  transformAfterLoad: (record) => ({
    ...record,
    // map the nested priorityDurationFrequency to the flat key the form expects
    'priorityDurationFrequency.frequencyNo': record.priorityDurationFrequency?.frequencyNo || record.priorityDurationFrequencyNo,
    // ensure names map to form fields
    taskPriorityName: record.taskPriorityName || record.operTaskPriorityName || record.name
  })
});
