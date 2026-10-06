import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';
import { CompanyFormSection } from './CompanyFormSection';
import { CompanyPortsSection } from './CompanyPortsSection';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type GstinTypeOption = {
  gstinTypeName?: string;
  gstinTypeNo?: string | number;
  id?: string | number;
  name?: string;
};

interface CompanyAdditionalDetailsSectionProps {
  creditLimit: number | null;
  setCreditLimit: (v: number | null) => void;
  creditInsuranceCompanyName: string;
  setCreditInsuranceCompanyName: (v: string) => void;
  companyVatGst: string;
  setCompanyVatGst: (v: string) => void;
  gstinTypeNo: string;
  setGstinTypeNo: (v: string) => void;
  gstinTypes: GstinTypeOption[];
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  // Ports props
  ports: any[];
  portsList: string[];
  selectedPortName: string;
  onSelectedPortNameChange: (val: string) => void;
  onAddPort: () => void;
  onRemovePort: (index: number) => void;
}

const fieldClass = FIELD_CONTROL_CLASS;

export function CompanyAdditionalDetailsSection({
  creditLimit,
  setCreditLimit,
  creditInsuranceCompanyName,
  setCreditInsuranceCompanyName,
  companyVatGst,
  setCompanyVatGst,
  gstinTypeNo,
  setGstinTypeNo,
  gstinTypes,
  errors,
  setErrors,
  ports,
  portsList,
  selectedPortName,
  onSelectedPortNameChange,
  onAddPort,
  onRemovePort,
}: CompanyAdditionalDetailsSectionProps) {
  return (
    <CompanyFormSection
      icon={Info}
      title="Other Details"
      description="VAT / GST, Insurance, Port and other details"
    >
      <Accordion type="multiple" className="w-full space-y-2">
        <AccordionItem value="vat-gst" className="border border-[var(--tm-border)]/70 bg-[var(--tm-elevated)] rounded-[8px] px-4">
          <AccordionTrigger className="hover:no-underline py-3 text-sm font-semibold text-slate-200">
            VAT / GST Details
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-3.5">
              <div className="space-y-1.5 min-w-0">
                <FieldLabel>Document Type</FieldLabel>
                <Combobox
                  options={gstinTypes.map((t) => ({
                    label: t.gstinTypeName || t.name || '',
                    value: String(t.gstinTypeNo || t.id || ''),
                  }))}
                  value={gstinTypeNo}
                  onChange={(val) => {
                    setGstinTypeNo(val);
                    if (!val && errors.companyVatGst) setErrors((prev) => ({ ...prev, companyVatGst: '' }));
                  }}
                  placeholder="Select document type"
                  className={cn(fieldClass, 'px-3')}
                />
              </div>

              <div className="space-y-1.5 min-w-0 sm:col-span-1 lg:col-span-1">
                <FieldLabel htmlFor="vatGst" required={!!gstinTypeNo}>
                  VAT / GST No
                </FieldLabel>
                <FieldControl error={errors.companyVatGst}>
                  <Input
                    id="vatGst"
                    placeholder="Enter VAT No. / GST No."
                    value={companyVatGst}
                    maxLength={30}
                    onChange={(e) => {
                      setCompanyVatGst(e.target.value);
                      if (errors.companyVatGst) setErrors((prev) => ({ ...prev, companyVatGst: '' }));
                    }}
                    className={cn(
                      fieldClass,
                      errors.companyVatGst &&
                      'border-red-400 focus-visible:ring-red-500/10 focus-visible:border-red-400'
                    )}
                  />
                </FieldControl>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="insurance" className="border border-[var(--tm-border)]/70 bg-[var(--tm-elevated)] rounded-[8px] px-4">
          <AccordionTrigger className="hover:no-underline py-3 text-sm font-semibold text-slate-200">
            Insurance Details
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3.5">
              <div className="space-y-1.5 min-w-0">
                <FieldLabel htmlFor="creditLimit">Credit Insurance Limit</FieldLabel>
                <Input
                  id="creditLimit"
                  type="number"
                  placeholder="Enter credit insurance limit"
                  value={creditLimit ?? ''}
                  onChange={(e) => setCreditLimit(e.target.value === '' ? null : Number(e.target.value))}
                  className={cn(
                    fieldClass,
                    'text-left [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
                  )}
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <FieldLabel htmlFor="creditInsuranceCompany">Credit Insurance Company Name</FieldLabel>
                <Input
                  id="creditInsuranceCompany"
                  placeholder="Enter credit insurance company name"
                  value={creditInsuranceCompanyName}
                  maxLength={100}
                  onChange={(e) => setCreditInsuranceCompanyName(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="port" className="border border-[var(--tm-border)]/70 bg-[var(--tm-elevated)] rounded-[8px] px-4">
          <AccordionTrigger className="hover:no-underline py-3 text-sm font-semibold text-slate-200">
            Port Details
          </AccordionTrigger>
          <AccordionContent className="pt-1 pb-4">
            <CompanyPortsSection
              ports={ports}
              portsList={portsList}
              selectedPortName={selectedPortName}
              onSelectedPortNameChange={onSelectedPortNameChange}
              onAdd={onAddPort}
              onRemove={onRemovePort}
              standalone={true}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </CompanyFormSection>
  );
}
