import { useAuthStore } from '@/store/useAuthStore';

export function useFormRights(formNo: number | undefined | null) {
  const formRights = useAuthStore(state => state.formRights);

  if (!formNo || !formRights || !formRights[formNo]) {
    // Default to conservative permissions if no formNo is provided or rights aren't loaded
    return {
      isDelete: false,
      isOpen: false,
      isReport: false,
      isSave: false,
      isUpdate: false,
    };
  }

  return formRights[formNo];
}
