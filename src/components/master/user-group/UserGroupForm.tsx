import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { UserPlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MasterFormShell } from '../shared/MasterFormShell';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1546;
const TITLE = 'User Group Master';

interface UserGroupFormProps {
  id?: string;
}

interface GroupMember {
  loginNo: number;
  userName: string;
  displayName: string;
  email: string;
}

export function UserGroupForm({ id }: UserGroupFormProps) {
  const editingId = id ?? null;
  const rights = useFormRights(FORM_NO);
  const { goToList } = useMasterFormGuard('user-group', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<GroupMember[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!editingId) return;
    apiService.get<any>(`/api/security/user-groups/load-data/${editingId}?companyNo=${companyNo}`).then((response) => {
      if (response) {
        const body = response.data || response;
        const dl = body.data || body;
        if (dl) {
          setName(dl.userGroupName || dl.name || '');
          setDescription(dl.description || '');
          const members = Array.isArray(dl.users) ? dl.users.map((u: any) => ({
            loginNo: u.loginNo,
            userName: u.loginId,
            displayName: u.printingName || u.loginId,
            email: u.email || ''
          })) : [];
          setSelectedUsers(members);
          setCode(dl.code || '');
        }
      }
    }).catch(err => console.error('Failed to load user group details:', err));
  }, [editingId, companyNo]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'user-group Name is required';
    }
    if (!description.trim()) {
      newErrors.description = 'User Group Description is required';
    }
    const filledUsers = selectedUsers.filter(u => !!u.userName);
    if (filledUsers.length === 0) {
      newErrors.selectedUsers = 'Atleast one user required.';
    } else {
      const seen = new Set<number>();
      const hasDuplicate = filledUsers.some(u => {
        if (seen.has(u.loginNo)) return true;
        seen.add(u.loginNo);
        return false;
      });
      if (hasDuplicate) {
        newErrors.selectedUsers = 'Duplicate members are not allowed — the same user is selected more than once.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) return;
    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      const payload = {
        userGroupNo: editingId ? parseInt(editingId) : null,
        userGroupName: name,
        description: description || null,
        inactive: false,
        memberLoginNos: selectedUsers.map((u) => parseInt(u.loginNo as any) || 0).filter(Boolean),
      };
      await apiService.post('/api/security/user-groups/save', payload);
      setShowSuccessAlert(true);
    } catch (err: any) {
      const parsed = parseApiSaveError(err);
      setErrors(parsed.fieldErrors);
      setServerError(parsed.serverError);
    } finally {
      setIsSaving(false);
    }
  };

  const duplicateLoginNos = new Set(
    Array.from(
      selectedUsers.reduce((counts, u) => {
        if (u.loginNo) counts.set(u.loginNo, (counts.get(u.loginNo) || 0) + 1);
        return counts;
      }, new Map<number, number>()).entries()
    ).filter(([, count]) => count > 1).map(([loginNo]) => loginNo)
  );

  const addGridUser = () => {
    setSelectedUsers([...selectedUsers, { loginNo: 0, userName: '', displayName: '', email: '' }]);
  };
  const removeGridUser = (index: number) => {
    const next = [...selectedUsers];
    next.splice(index, 1);
    setSelectedUsers(next);
    if (errors.selectedUsers) setErrors(prev => ({ ...prev, selectedUsers: '' }));
  };
  const updateGridUser = (index: number, user: any) => {
    const next = [...selectedUsers];
    if (!user || user.loginNo === '' || user.loginNo === 0) {
      next[index] = { ...next[index], loginNo: 0, userName: '', displayName: '', email: '' };
    } else {
      next[index] = { ...next[index], loginNo: user.loginNo, userName: user.loginId || '', displayName: user.printingName || '', email: user.email || '' };
    }
    setSelectedUsers(next);
    if (errors.selectedUsers) setErrors(prev => ({ ...prev, selectedUsers: '' }));
  };

  return (
    <MasterFormShell
      type="user-group"
      title={TITLE}
      editingId={editingId}
      isSaving={isSaving}
      serverError={serverError}
      onSubmit={handleSubmit}
      showConfirm={showConfirm}
      onCancelConfirm={() => setShowConfirm(false)}
      onConfirmSave={handleConfirmSave}
      showSuccessAlert={showSuccessAlert}
      onSuccessOk={() => { setShowSuccessAlert(false); goToList(); }}
    >
      {/* Disabled System Code */}
      <div className="flex items-center gap-0.5 px-1 mb-4">
        <label className="text-[11px] font-medium text-slate-700 normal-case">Code:</label>
        <div className="text-xs font-medium text-slate-500 select-none">
          {editingId ? code : 'AUTO-GEN-CODE'}
        </div>
      </div>

      {/* Standard Name Input */}
      <div className="space-y-0">
        <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">User Group Name <span className="text-red-500 font-medium">*</span></label>
        <Input placeholder="Enter user group name" value={name} maxLength={50} onChange={(e) => {
          setName(e.target.value);
          if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
        }}
          className={cn(
            "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
            errors.name && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
          )}
        />
        {errors.name && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.name}</p>}
      </div>

      <div className="space-y-3">
        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Group Description <span className="text-red-500 font-medium">*</span></label>
          <Input placeholder="Enter Group Description" value={description} onChange={(e) => setDescription(e.target.value)}
            className={cn(
              "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699] focus-visible:ring-offset-0 focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
              errors.description && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
          />
          {errors.description && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.description}</p>}
        </div>

        <div className="space-y-3" id="form-group-members">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <h4 className="text-[11px] font-medium text-slate-700  ">Group Members <span className="text-red-500 font-medium">*</span></h4>
            </div>
            <Button type="button" onClick={addGridUser} variant="ghost" size="sm" className="h-7 text-[9px] font-medium text-[#006699] hover:bg-[#e1ecf7] rounded-lg gap-1">
              <UserPlus size={12} /> Add
            </Button>
          </div>
          <div className={cn("bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-all", errors.selectedUsers && "border-red-500 ring-2 ring-red-500/10")}>
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-slate-100/80 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-1.5 font-semibold text-slate-700  ">User Name</th>
                  <th className="px-3 py-1.5 font-semibold text-slate-700  ">Display Name</th>
                  <th className="px-3 py-1.5 font-semibold text-slate-700  ">Email</th>
                  <th className="px-2 py-1.5 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedUsers.map((field, index) => {
                  const isDuplicate = !!field.loginNo && duplicateLoginNos.has(field.loginNo);
                  return (
                  <tr key={index} className={cn("group transition-colors", isDuplicate ? "bg-red-50/70 hover:bg-red-50" : "hover:bg-white")}>
                    <td className="px-2 py-1">
                      <UserCombobox value={field.userName} onChange={(user) => updateGridUser(index, user)}
                        placeholder="User Name"
                        className="h-7 rounded-lg border-transparent group-hover:border-slate-200 focus:border-[#006699] text-[11px] bg-transparent shadow-none px-2"
                        initialLabel={field.userName}
                        error={isDuplicate}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input disabled value={field.displayName} placeholder="Display Name" className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 " />
                    </td>
                    <td className="px-2 py-1">
                      <Input disabled value={field.email} placeholder="Email" className="h-7 rounded-lg border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-900 " />
                    </td>
                    <td className="px-1 py-1 text-center">
                      <button type="button" onClick={() => removeGridUser(index)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {selectedUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-slate-400 italic font-medium">No members.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {errors.selectedUsers && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.selectedUsers}</p>}
        </div>
      </div>
    </MasterFormShell>
  );
}
