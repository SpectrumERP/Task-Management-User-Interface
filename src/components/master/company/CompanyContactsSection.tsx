import { Button } from '@/components/ui/button';
import { User, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionTip } from '@/components/master/shared/TruncatedCellTip';
import { CompanyFormSection } from './CompanyFormSection';
import { BusinessEntityShareMenu } from './BusinessEntityShareMenu';

interface CompanyContactsSectionProps {
  contacts: any[];
  companyName?: string;
  companyCode?: string;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function CompanyContactsSection({
  contacts,
  companyName,
  companyCode,
  onAdd,
  onEdit,
  onRemove,
}: CompanyContactsSectionProps) {
  return (
    <CompanyFormSection
      icon={User}
      title="Contact Persons"
      description="Other people at this business entity"
      collapsible
      count={contacts.length}
      autoOpen={contacts.length > 0}
      action={
        <Button
          type="button"
          onClick={onAdd}
          className="h-8 rounded-[8px] px-3 bg-[#0EA5E9] hover:bg-[#0284C7] text-white font-semibold text-xs gap-1.5 shadow-sm shadow-[#0EA5E9]/20"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Contact Person
        </Button>
      }
      bodyClassName={contacts.length === 0 ? 'py-3' : undefined}
    >
      {contacts.length === 0 ? (
        <p className="text-[11px] text-slate-400 font-medium text-center py-2">
          No contact persons added yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
          {contacts.map((c, idx) => (
            <div
              key={idx}
              className="bg-[var(--tm-elevated)] border border-[var(--tm-border)]/70 rounded-[8px] p-3.5 relative group hover:border-[#0EA5E9]/35 transition-colors"
            >
              <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <BusinessEntityShareMenu
                  mode="contact"
                  contact={{
                    companyName,
                    companyCode,
                    name: c.name || c.contactName,
                    designation: c.designation,
                    phone: c.phone,
                    email: c.email,
                  }}
                />
                <ActionTip label="Edit Contact">
                  <button
                    type="button"
                    onClick={() => onEdit(idx)}
                    aria-label="Edit Contact"
                    className="p-1.5 rounded-[6px] text-slate-400 hover:text-[#0EA5E9] hover:bg-[var(--tm-tint)] transition-colors"
                  >
                    <Edit size={13} />
                  </button>
                </ActionTip>
                <ActionTip label="Remove Contact">
                  <button
                    type="button"
                    onClick={() => onRemove(idx)}
                    aria-label="Remove Contact"
                    className="p-1.5 rounded-[6px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </ActionTip>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-[8px] bg-[var(--tm-tint)] text-[#0EA5E9] flex items-center justify-center font-semibold text-xs shrink-0 uppercase">
                  {c.name ? c.name.substring(0, 2) : 'CP'}
                </div>
                <div className="space-y-1 pr-16 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-100 leading-snug truncate">
                    {c.name || c.contactName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1">
                    {c.designation ? (
                      <span className="px-1.5 py-0.5 rounded-[6px] bg-[var(--tm-surface)] text-slate-300 text-[9px] font-semibold border border-[var(--tm-border)]/80">
                        {c.designation}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-[6px] text-[8px] font-semibold border',
                        (c.status || 'Active') === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-[var(--tm-muted)] text-slate-500 border-[var(--tm-border)]'
                      )}
                    >
                      {c.status || 'Active'}
                    </span>
                  </div>
                  <div className="text-[10px] font-medium space-y-0.5 text-slate-500">
                    <p>
                      <span className="text-slate-400">Phone:</span>{' '}
                      <strong className="text-slate-200 font-semibold">{c.phone}</strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Email:</span>{' '}
                      <strong className="text-[#0EA5E9] font-semibold select-all">{c.email}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CompanyFormSection>
  );
}
