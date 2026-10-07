import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/Combobox';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIELD_CONTROL_CLASS } from '@/lib/fieldStyles';
import { FieldControl, FieldLabel } from '@/components/ui/form-field';
import { CompanyFormSection, CompanyFormSubheading } from './CompanyFormSection';
import { CompanyPortsSection } from './CompanyPortsSection';

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
  const hasData =
    !!gstinTypeNo ||
    !!companyVatGst ||
    !!creditLimit ||
    !!creditInsuranceCompanyName ||
    ports.length > 0 ||
    !!errors.companyVatGst;

  return (
    <CompanyFormSection
      icon={Info}
      title="Other Details"
      description="VAT / GST, credit insurance and preferred ports"
      collapsible
      autoOpen={hasData}
    >
      <CompanyFormSubheading>Tax &amp; Credit Insurance</CompanyFormSubheading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3.5">
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

        <div className="space-y-1.5 min-w-0">
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
          <FieldLabel htmlFor="creditInsuranceCompany">Credit Insurance Company</FieldLabel>
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

      <CompanyFormSubheading className="mt-5">Preferred Ports</CompanyFormSubheading>
      <CompanyPortsSection
        ports={ports}
        portsList={portsList}
        selectedPortName={selectedPortName}
        onSelectedPortNameChange={onSelectedPortNameChange}
        onAdd={onAddPort}
        onRemove={onRemovePort}
        standalone={true}
      />
    </CompanyFormSection>
  );
}
