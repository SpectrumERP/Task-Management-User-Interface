import { Button } from '@/components/ui/button';
import { User, Plus, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyContactsSectionProps {
  contacts: any[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}

export function CompanyContactsSection({ contacts, onAdd, onEdit, onRemove }: CompanyContactsSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-0.5">
          <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
            <User size={18} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-800 tracking-tight">Contact Persons</h3>
          </div>
        </div>
        <Button
          type="button"
          onClick={onAdd}
          className="h-8 rounded-lg px-3 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs gap-0.5 flex items-center shadow"
        >
          <Plus size={14} />
          Add Contact Person
        </Button>
      </div>

      {contacts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((c, idx) => (
            <div key={idx} className="bg-white border border-slate-200/70 rounded-2xl p-4 shadow-sm relative group hover:border-[#006699]/40 transition-colors">
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                <button
                  type="button"
                  onClick={() => onEdit(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#006699] hover:bg-[#006699]/5 transition-colors"
                  title="Edit Contact"
                >
                  <Edit size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                  title="Remove Contact"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#006699]/10 text-[#006699] flex items-center justify-center font-medium text-xs shrink-0 uppercase">
                  {c.name ? c.name.substring(0, 2) : 'CP'}
                </div>
                <div className="space-y-0.5 pr-14 min-w-0">
                  <div>
                    <h4 className="text-xs font-medium text-slate-800 leading-snug truncate">{c.name || c.contactName}</h4>
                    <div className="flex flex-wrap items-center gap-0.5 mt-1">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-medium border border-slate-200/50">
                        {c.designation}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-medium border border-slate-200/50">
                        {c.department}
                      </span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[8px] font-medium   border",
                        (c.status || 'Active') === 'Active'
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                          : "bg-slate-50 text-slate-500 border-slate-200/60"
                      )}>
                        {c.status || 'Active'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] font-semibold space-y-0 text-slate-500">
                    <p className="flex items-center gap-1"><span className="text-slate-400">Phone:</span> <strong className="text-slate-700">{c.phone}</strong></p>
                    <p className="flex items-center gap-1"><span className="text-slate-400">Email:</span> <strong className="text-[#006699] select-all">{c.email}</strong></p>
                    {c.address && (
                      <p className="text-[9px] text-slate-400 italic line-clamp-1 mt-1">{c.address}, {c.city}, {c.state}, {c.country}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
