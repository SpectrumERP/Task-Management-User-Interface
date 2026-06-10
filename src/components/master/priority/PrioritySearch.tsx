import { useMemo, useEffect } from 'react';
import { DynamicSearch } from '../core/DynamicSearch';
import { useMasterLogic } from '../core/useMasterLogic';
import { getPriorityConfig } from './priorityConfig';
import { AlertCircle } from 'lucide-react';

export function PrioritySearch() {
  const config = useMemo(() => getPriorityConfig(), []);
  const { data, isLoading, fetchData, deleteData } = useMasterLogic(config);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <DynamicSearch
      config={config}
      data={data}
      isLoading={isLoading}
      onDelete={deleteData}
      masterPath="master/priority"
      titleIcon={AlertCircle}
    />
  );
}
