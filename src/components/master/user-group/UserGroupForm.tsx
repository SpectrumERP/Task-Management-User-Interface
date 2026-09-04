import { useEffect, useState, type ReactNode } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MasterFormShell } from '../shared/MasterFormShell';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';

const FORM_NO = 1546;
const TITLE = 'User Group Master';

const fieldClass =
  'h-10 w-full rounded-[8px] border-slate-200/80 bg-white text-xs font-medium text-slate-700 shadow-none focus-visible:ring-2 focus-visible:ring-[#006699]/20 focus-visible:border-[#006699]';

function FieldErrorTip({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span
      role="alert"
      className="pointer-events-none absolute right-1.5 top-0 z-40 -translate-y-1/2 max-w-[min(100%,200px)] rounded-[6px] bg-red-600 px-2 py-1 text-[10px] font-medium leading-tight text-white shadow-[0_6px_16px_-4px_rgba(220,38,38,0.45)] whitespace-normal text-right"
    >
      {message}
    </span>
  );
}

function FieldControl({
  children,
  error,
  className,
}: {
  children: ReactNode;
  error?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative min-w-0', className)}>
      {children}
      <FieldErrorTip message={error} />
    </div>
  );
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="inline-flex items-start gap-0.5 text-[11px] font-medium text-slate-600"
    >
      <span>{children}</span>
      {required ? (
        <span className="text-red-500 leading-none text-[12px] relative -top-px" aria-hidden>
          *
        </span>
      ) : null}
    </label>
  );
}

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
            email: u.email || '',
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
      newErrors.name = 'User Group Name is required';
    }
    if (!description.trim()) {
      newErrors.description = 'Group Description is required';
    }
    const filledUsers = selectedUsers.filter((u) => !!u.userName);
    if (filledUsers.length === 0) {
      newErrors.selectedUsers = 'At least one user required.';
    } else {
      const seen = new Set<number>();
      const hasDuplicate = filledUsers.some((u) => {
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
      selectedUsers
        .reduce((counts, u) => {
          if (u.loginNo) counts.set(u.loginNo, (counts.get(u.loginNo) || 0) + 1);
          return counts;
        }, new Map<number, number>())
        .entries()
    )
      .filter(([, count]) => count > 1)
      .map(([loginNo]) => loginNo)
  );

  const addGridUser = () => {
    setSelectedUsers([...selectedUsers, { loginNo: 0, userName: '', displayName: '', email: '' }]);
  };

  const removeGridUser = (index: number) => {
    const next = [...selectedUsers];
    next.splice(index, 1);
    setSelectedUsers(next);
    if (errors.selectedUsers) setErrors((prev) => ({ ...prev, selectedUsers: '' }));
  };

  const updateGridUser = (index: number, user: any) => {
    const next = [...selectedUsers];
    if (!user || user.loginNo === '' || user.loginNo === 0) {
      next[index] = { ...next[index], loginNo: 0, userName: '', displayName: '', email: '' };
    } else {
      next[index] = {
        ...next[index],
        loginNo: user.loginNo,
        userName: user.loginId || '',
        displayName: user.printingName || '',
        email: user.email || '',
      };
    }
    setSelectedUsers(next);
    if (errors.selectedUsers) setErrors((prev) => ({ ...prev, selectedUsers: '' }));
  };

  const memberCount = selectedUsers.filter((u) => !!u.userName).length;

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
      <section className="rounded-[8px] border border-slate-200/70 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[#f8fbfd] border-b border-slate-100 rounded-t-[8px]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699]">
            <Users size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800 tracking-tight">Group Details</h2>
            <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
              Define the user group name and description
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3 w-full">
            <div className="space-y-1.5 min-w-0">
              <FieldLabel>Code</FieldLabel>
              <Input
                readOnly
                tabIndex={-1}
                value={editingId ? code || '—' : 'AUTO-GEN-CODE'}
                className={cn(
                  fieldClass,
                  'bg-[#f8fbfd] text-slate-500 cursor-default select-none focus-visible:ring-0 focus-visible:border-slate-200/80'
                )}
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <FieldLabel htmlFor="userGroupName" required>
                User Group Name
              </FieldLabel>
              <FieldControl error={errors.name}>
                <Input
                  id="userGroupName"
                  placeholder="Enter user group name"
                  value={name}
                  maxLength={50}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.name &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>

            <div className="space-y-1.5 min-w-0 sm:col-span-2">
              <FieldLabel htmlFor="userGroupDescription" required>
                Group Description
              </FieldLabel>
              <FieldControl error={errors.description}>
                <Input
                  id="userGroupDescription"
                  placeholder="Enter Group Description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors((prev) => ({ ...prev, description: '' }));
                  }}
                  className={cn(
                    fieldClass,
                    errors.description &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                  )}
                />
              </FieldControl>
            </div>
          </div>
        </div>
      </section>

      <section
        id="form-group-members"
        className="rounded-[8px] border border-slate-200/70 bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#f8fbfd] border-b border-slate-100 rounded-t-[8px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8f3f8] text-[#006699]">
              <UserPlus size={15} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-800 tracking-tight inline-flex items-center gap-1">
                Group Members
                <span className="text-red-500 leading-none text-[12px] relative -top-px" aria-hidden>
                  *
                </span>
              </h2>
              <p className="text-[10px] font-medium text-slate-400 mt-0.5 truncate">
                {memberCount > 0
                  ? `${memberCount} member${memberCount === 1 ? '' : 's'} selected`
                  : 'Add at least one user to this group'}
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={addGridUser}
            className="h-8 px-3 rounded-[8px] bg-[#006699] hover:bg-[#005580] text-white text-[11px] font-semibold gap-1.5 shrink-0 shadow-sm shadow-[#006699]/20"
          >
            <UserPlus size={13} strokeWidth={2.5} />
            Add
          </Button>
        </div>

        <div className="p-4 sm:p-5 space-y-2">
          <div
            className={cn(
              'rounded-[8px] border border-slate-200/80 overflow-hidden bg-white',
              errors.selectedUsers && 'border-red-400 ring-2 ring-red-500/10'
            )}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse table-fixed">
                <thead>
                  <tr className="bg-[#f8fbfd] border-b border-slate-100">
                    <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] w-[28%]">
                      User Name
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] w-[28%]">
                      Display Name
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide text-[10px] w-[36%]">
                      Email
                    </th>
                    <th className="px-2 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedUsers.map((field, index) => {
                    const isDuplicate = !!field.loginNo && duplicateLoginNos.has(field.loginNo);
                    return (
                      <tr
                        key={index}
                        className={cn(
                          'group transition-colors',
                          isDuplicate ? 'bg-red-50/70 hover:bg-red-50' : 'hover:bg-[#f8fbfd]/80'
                        )}
                      >
                        <td className="px-2 py-1.5">
                          <UserCombobox
                            value={field.userName}
                            onChange={(user) => updateGridUser(index, user)}
                            placeholder="Select user"
                            className="h-8 rounded-[8px] border-slate-200/80 group-hover:border-slate-300 focus:border-[#006699] text-[11px] bg-white shadow-none px-2"
                            initialLabel={field.userName}
                            error={isDuplicate}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            disabled
                            value={field.displayName}
                            placeholder="—"
                            className="h-8 rounded-[8px] border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-700"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            disabled
                            value={field.email}
                            placeholder="—"
                            className="h-8 rounded-[8px] border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-700"
                          />
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeGridUser(index)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            aria-label="Remove member"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {selectedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center">
                        <p className="text-xs font-medium text-slate-400">No members yet</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Click Add to include users in this group
                        </p>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {errors.selectedUsers ? (
            <p className="text-[10px] text-red-500 font-semibold px-0.5">{errors.selectedUsers}</p>
          ) : null}
        </div>
      </section>
    </MasterFormShell>
  );
}
