import { useEffect, useRef, useState } from 'react';
import { apiService } from '@/services/apiService';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { Building, Camera as CameraIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyHeaderFieldsProps {
  code: string;
  editingId: string | null;
  name: string;
  setName: (v: string) => void;
  companyType: string;
  setCompanyType: (v: string) => void;
  companyTimeZoneNo: string;
  setCompanyTimeZoneNo: (v: string) => void;
  creditLimit: number | null;
  setCreditLimit: (v: number | null) => void;
  companyVatGst: string;
  setCompanyVatGst: (v: string) => void;
  businessEntityTypes: any[];
  timeZones: any[];
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onOpenCamera: () => void;
}

export function CompanyHeaderFields({
  code,
  editingId,
  name,
  setName,
  companyType,
  setCompanyType,
  companyTimeZoneNo,
  setCompanyTimeZoneNo,
  creditLimit,
  setCreditLimit,
  companyVatGst,
  setCompanyVatGst,
  businessEntityTypes,
  timeZones,
  errors,
  setErrors,
  onOpenCamera,
}: CompanyHeaderFieldsProps) {
  const [beSuggestions, setBeSuggestions] = useState<any[]>([]);
  const [showBeSuggestions, setShowBeSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const beSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!name || name.trim().length < 2) {
      setBeSuggestions([]);
      return;
    }

    if (beSearchTimeout.current) {
      clearTimeout(beSearchTimeout.current);
    }

    beSearchTimeout.current = setTimeout(async () => {
      try {
        const res = await apiService.get<any>(`/api/master/business-entities?BusinessEntityName=${encodeURIComponent(name)}`);
        if (res && res.data) {
          setBeSuggestions(res.data);
          setHighlightedIndex(-1);
        } else if (Array.isArray(res)) {
          setBeSuggestions(res);
          setHighlightedIndex(-1);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => {
      if (beSearchTimeout.current) clearTimeout(beSearchTimeout.current);
    };
  }, [name]);

  return (
    <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-0.5">
          <div className="p-1.5 bg-[#006699]/10 rounded-lg text-[#006699]">
            <Building size={18} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-800 tracking-tight">General Business Entity Information</h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCamera}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-[#006699]/10 text-[#006699] rounded-lg hover:bg-[#006699]/20 transition-colors"
        >
          <CameraIcon size={16} />
          <span>Capture Attachment</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-1.5 h-full pt-4">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Code:</label>
          <div className="text-xs font-medium text-slate-500 select-none">
            {editingId ? code : 'AUTO-GEN-CODE'}
          </div>
        </div>

        <div className="space-y-0 md:col-span-2 relative">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Business Entity Name <span className="text-red-500">*</span></label>
          <div className="relative">
            <Input placeholder="Enter Business Entity Name" value={name} maxLength={100} onChange={(e) => {
              setName(e.target.value);
              setShowBeSuggestions(true);
              if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
            }}
              onFocus={() => {
                if (name.length >= 2) setShowBeSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowBeSuggestions(false), 200);
              }}
              onKeyDown={(e) => {
                if (!showBeSuggestions || beSuggestions.length === 0) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightedIndex(prev => (prev < beSuggestions.length - 1 ? prev + 1 : prev));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
                } else if (e.key === 'Enter') {
                  if (highlightedIndex >= 0 && highlightedIndex < beSuggestions.length) {
                    e.preventDefault();
                    const be = beSuggestions[highlightedIndex];
                    setName(be.businessEntityName || be.BusinessEntityName || be.name || '');
                    setShowBeSuggestions(false);
                  }
                }
              }}
              className={cn(
                "bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]",
                errors.name && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
              )}
            />
            {showBeSuggestions && beSuggestions.length > 0 && (
              <div className="absolute z-[100] w-full mt-1 bg-white rounded-md border border-slate-200 shadow-lg max-h-48 overflow-auto">
                {beSuggestions.map((be: any, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "px-3 py-2 text-sm cursor-pointer text-slate-700",
                      idx === highlightedIndex ? "bg-slate-100" : "hover:bg-slate-100"
                    )}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setName(be.businessEntityName || be.BusinessEntityName || be.name || '');
                      setShowBeSuggestions(false);
                    }}
                  >
                    {be.businessEntityName || be.BusinessEntityName || be.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.name && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.name}</p>}
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Business Entity Type <span className="text-red-500">*</span></label>
          <Combobox
            options={businessEntityTypes.map((t: any) => ({ label: t.operCRMBusinessEntityTypeName, value: t.operCRMBusinessEntityTypeNo.toString() }))}
            value={companyType}
            onChange={(val) => {
              setCompanyType(val);
              if (errors.companyType) setErrors(prev => ({ ...prev, companyType: '' }));
            }}
            placeholder="Select business entity type"
            className={cn(
              "bg-white border border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20",
              errors.companyType && "border-red-500 focus:ring-red-500/10 focus-visible:ring-red-500/10 focus-visible:border-red-500 focus:ring-red-500/10 focus:border-red-500"
            )}
          />
          {errors.companyType && <p className="text-[10px] text-red-500 font-semibold ml-1">{errors.companyType}</p>}
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Timezone</label>
          <Combobox
            options={timeZones.map((tz: any) => ({ label: tz.crmTimeZoneName, value: tz.crmTimeZoneNo.toString() }))}
            value={companyTimeZoneNo}
            onChange={(val) => setCompanyTimeZoneNo(val)}
            placeholder="Select timezone"
            className="bg-white border border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl px-3 w-full focus:outline-none focus:ring-2 focus:ring-[#006699]/20"
          />
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">Credit Insurance Limit</label>
          <Input type="number" placeholder="Enter credit insurance limit" value={creditLimit ?? ''} onChange={(e) => setCreditLimit(e.target.value === '' ? null : Number(e.target.value))}
            className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
          />
        </div>

        <div className="space-y-0">
          <label className="text-[11px] font-medium text-slate-700 normal-case ml-1">VAT / GST No</label>
          <Input placeholder="Enter VAT No. / GST No." value={companyVatGst} maxLength={30} onChange={(e) => setCompanyVatGst(e.target.value)}
            className="bg-white border-slate-200 hover:border-slate-300 transition-colors h-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006699]/20 focus:border-[#006699]"
          />
        </div>
      </div>
    </div>
  );
}
