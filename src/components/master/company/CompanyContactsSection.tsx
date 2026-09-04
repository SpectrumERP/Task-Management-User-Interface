import { Button } from '@/components/ui/button';
import { User, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CompanyFormSection } from './CompanyFormSection';

interface CompanyContactsSectionProps {
  contacts: any[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function CompanyContactsSection({ contacts, onAdd, onEdit, onRemove }: CompanyContactsSectionProps) {
  return (
    <CompanyFormSection
      icon={User}
      title="Contact Persons"
      description="People associated with this business entity"
      action={
        <Button
          type="button"
          onClick={onAdd}
          className="h-8 rounded-[8px] px-3 bg-[#006699] hover:bg-[#005580] text-white font-semibold text-xs gap-1.5 shadow-sm shadow-[#006699]/20"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contacts.map((c, idx) => (
            <div
              key={idx}
              className="bg-[#f8fbfd] border border-slate-200/70 rounded-[8px] p-3.5 relative group hover:border-[#006699]/35 transition-colors"
            >
              <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => onEdit(idx)}
                  className="p-1.5 rounded-[6px] text-slate-400 hover:text-[#006699] hover:bg-[#e8f3f8] transition-colors"
                  title="Edit Contact"
                >
                  <Edit size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="p-1.5 rounded-[6px] text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Remove Contact"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-[8px] bg-[#e8f3f8] text-[#006699] flex items-center justify-center font-semibold text-xs shrink-0 uppercase">
                  {c.name ? c.name.substring(0, 2) : 'CP'}
                </div>
                <div className="space-y-1 pr-12 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-800 leading-snug truncate">
                    {c.name || c.contactName}
                  </h4>
                  <div className="flex flex-wrap items-center gap-1">
                    {c.designation ? (
                      <span className="px-1.5 py-0.5 rounded-[6px] bg-white text-slate-600 text-[9px] font-semibold border border-slate-200/80">
                        {c.designation}
                      </span>
                    ) : null}
                    {c.department ? (
                      <span className="px-1.5 py-0.5 rounded-[6px] bg-white text-slate-600 text-[9px] font-semibold border border-slate-200/80">
                        {c.department}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded-[6px] text-[8px] font-semibold border',
                        (c.status || 'Active') === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      )}
                    >
                      {c.status || 'Active'}
                    </span>
                  </div>
                  <div className="text-[10px] font-medium space-y-0.5 text-slate-500">
                    <p>
                      <span className="text-slate-400">Phone:</span>{' '}
                      <strong className="text-slate-700 font-semibold">{c.phone}</strong>
                    </p>
                    <p>
                      <span className="text-slate-400">Email:</span>{' '}
                      <strong className="text-[#006699] font-semibold select-all">{c.email}</strong>
                    </p>
                    {c.address ? (
                      <p className="text-[9px] text-slate-400 italic line-clamp-1 mt-0.5">
                        {c.address}, {c.city}, {c.state}, {c.country}
                      </p>
                    ) : null}
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
