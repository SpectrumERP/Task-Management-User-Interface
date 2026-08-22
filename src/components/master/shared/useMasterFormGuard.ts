import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { toMasterListPath, MasterType } from './masterRoutes';

interface FormRights {
  isSave: boolean;
  isUpdate: boolean;
}

export function useMasterFormGuard(type: MasterType | string, editingId: string | null, rights: FormRights) {
  const navigate = useNavigate();
  const isNew = !editingId;
  const isEdit = !!editingId;

  useEffect(() => {
    if (isNew && !rights.isSave) {
      toast.error('You do not have permission to create records.', { id: 'no-create-permission' });
      navigate(toMasterListPath(type), { replace: true });
    }
    if (isEdit && !rights.isUpdate) {
      toast.error('You do not have permission to update records.', { id: 'no-update-permission' });
      navigate(toMasterListPath(type), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, isEdit, rights.isSave, rights.isUpdate, navigate, type]);

  const goToList = () => navigate(toMasterListPath(type));

  return { goToList, isNew, isEdit };
}
