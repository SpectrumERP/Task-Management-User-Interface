import { useEffect, useState } from 'react';
import { apiService } from '@/services/apiService';
import { useAuthStore } from '@/store/useAuthStore';
import { useFormRights } from '@/hooks/useFormRights';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserCombobox } from '@/components/ui/UserCombobox';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { MasterFormShell } from '../shared/MasterFormShell';
import { MasterDeleteDialog } from '../shared/MasterDeleteDialog';
import { useConfirmDelete } from '../shared/useConfirmDelete';
import { parseApiSaveError } from '../shared/parseSaveError';
import { useMasterFormGuard } from '../shared/useMasterFormGuard';
import { SortableHeader } from '@/components/shared/useTableSort';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';

const FORM_NO = 1546;
const TITLE = 'User Group Master';

const fieldClass = FIELD_CONTROL_CLASS;


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
  const deleteConfirm = useConfirmDelete('member');
  const { goToList } = useMasterFormGuard('user-group', editingId, rights);
  const { company: authCompanies } = useAuthStore();
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<GroupMember[]>([]);
  const [memberSortCol, setMemberSortCol] = useState<string | null>('userName');
  const [memberSortDesc, setMemberSortDesc] = useState(false);
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

  const requestRemoveGridUser = (index: number) => {
    const user = selectedUsers[index];
    const label = user?.displayName || user?.userName || user?.email || 'Member';
    deleteConfirm.requestConfirm({
      entityLabel: 'member',
      recordName: label,
      onConfirm: () => removeGridUser(index),
    });
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

  const handleMemberSort = (key: string) => {
    const nextDesc = memberSortCol === key ? !memberSortDesc : false;
    setMemberSortCol(key);
    setMemberSortDesc(nextDesc);
    setSelectedUsers((prev) => {
      const filled = prev.filter((u) => u.loginNo || u.userName || u.displayName || u.email);
      const empty = prev.filter((u) => !u.loginNo && !u.userName && !u.displayName && !u.email);
      const sorted = [...filled].sort((a, b) => {
        const av = String((a as unknown as Record<string, unknown>)[key] ?? '');
        const bv = String((b as unknown as Record<string, unknown>)[key] ?? '');
        const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base', numeric: true });
        return nextDesc ? -cmp : cmp;
      });
      return [...sorted, ...empty];
    });
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
      <section className="rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible">
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
            <Users size={15} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 tracking-tight">Group Details</h2>
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
                  'bg-[var(--tm-elevated)] text-slate-500 cursor-default select-none focus-visible:ring-0 focus-visible:border-[var(--tm-border)]/80'
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
        className="rounded-[8px] border border-[var(--tm-border)]/70 bg-[var(--tm-surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.06)] overflow-visible"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] rounded-t-[8px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9]">
              <UserPlus size={15} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-100 tracking-tight inline-flex items-center gap-1">
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
            className="h-8 px-3 rounded-[8px] bg-[#0EA5E9] hover:bg-[#0284C7] text-white text-[11px] font-semibold gap-1.5 shrink-0 shadow-sm shadow-[#0EA5E9]/20"
          >
            <UserPlus size={13} strokeWidth={2.5} />
            Add
          </Button>
        </div>

        <div className="p-4 sm:p-5 space-y-2">
          <div
            className={cn(
              'rounded-[8px] border border-[var(--tm-border)]/80 overflow-hidden bg-[var(--tm-surface)]',
              errors.selectedUsers && 'border-red-400 ring-2 ring-red-500/10'
            )}
          >
            <div className="overflow-x-auto">
              <table className="tm-data-table w-full text-left text-[11px] border-collapse table-fixed">
                <thead>
                  <tr className="bg-[var(--tm-elevated)] border-b border-[var(--tm-border)] text-[10px] text-slate-300 font-semibold uppercase tracking-wide">
                    <th className="px-3 py-2.5 border-r border-[var(--tm-border)] w-[28%]">
                      <SortableHeader
                        label="User Name"
                        sortKey="userName"
                        sortCol={memberSortCol}
                        sortDesc={memberSortDesc}
                        onSort={handleMemberSort}
                      />
                    </th>
                    <th className="px-3 py-2.5 border-r border-[var(--tm-border)] w-[28%]">
                      <SortableHeader
                        label="Display Name"
                        sortKey="displayName"
                        sortCol={memberSortCol}
                        sortDesc={memberSortDesc}
                        onSort={handleMemberSort}
                      />
                    </th>
                    <th className="px-3 py-2.5 border-r border-[var(--tm-border)] w-[36%]">
                      <SortableHeader
                        label="Email"
                        sortKey="email"
                        sortCol={memberSortCol}
                        sortDesc={memberSortDesc}
                        onSort={handleMemberSort}
                      />
                    </th>
                    <th className="px-1 py-2.5 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {selectedUsers.map((field, index) => {
                    const isDuplicate = !!field.loginNo && duplicateLoginNos.has(field.loginNo);
                    return (
                      <tr
                        key={index}
                        data-row-alert={isDuplicate ? true : undefined}
                        className={cn(
                          'group border-b border-[var(--tm-border)] transition-colors',
                          isDuplicate ? 'hover:bg-red-500/10' : 'hover:bg-[var(--tm-elevated)]/80'
                        )}
                      >
                        <td className="tm-col-primary px-3 py-2.5 border-r border-[var(--tm-border)]">
                          <UserCombobox
                            value={field.userName}
                            onChange={(user) => updateGridUser(index, user)}
                            placeholder="Select user"
                            className="h-8 rounded-[8px] border-[var(--tm-border)] group-hover:border-[#0EA5E9]/30 focus:border-[#0EA5E9] text-[11px] bg-[var(--tm-surface)] shadow-none px-2"
                            initialLabel={field.userName}
                            error={isDuplicate}
                          />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300">
                          <Input
                            disabled
                            value={field.displayName}
                            placeholder="—"
                            className="h-8 rounded-[8px] border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-200"
                          />
                        </td>
                        <td className="px-3 py-2.5 border-r border-[var(--tm-border)] text-slate-300">
                          <Input
                            disabled
                            value={field.email}
                            placeholder="—"
                            className="h-8 rounded-[8px] border-transparent text-[11px] bg-transparent shadow-none px-2 disabled:opacity-100 disabled:text-slate-200"
                          />
                        </td>
                        <td className="px-1 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => requestRemoveGridUser(index)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
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

      <MasterDeleteDialog
        open={deleteConfirm.open}
        onOpenChange={deleteConfirm.onOpenChange}
        onConfirm={deleteConfirm.handleConfirm}
        recordName={deleteConfirm.recordName}
        entityLabel={deleteConfirm.entityLabel}
        confirming={deleteConfirm.confirming}
      />
    </MasterFormShell>
  );
}
