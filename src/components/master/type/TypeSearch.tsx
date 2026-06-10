import { useMemo, useEffect } from 'react';
import { DynamicSearch } from '../core/DynamicSearch';
import { useMasterLogic } from '../core/useMasterLogic';
import { getTypeConfig } from './typeConfig';
import { Tag } from 'lucide-react';

export function TypeSearch() {
  const config = useMemo(() => getTypeConfig(), []);
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
      masterPath="master/type"
      titleIcon={Tag}
    />
  );
}
