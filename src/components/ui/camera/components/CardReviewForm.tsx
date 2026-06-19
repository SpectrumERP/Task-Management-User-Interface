import { BusinessCardData } from '../models/BusinessCardData';
import { ClipboardInput } from '@/components/ui/ClipboardInput';
import { Label } from '@/components/ui/label';

interface CardReviewFormProps {
  data: BusinessCardData;
  onChange: (data: BusinessCardData) => void;
}

export function CardReviewForm({ data, onChange }: CardReviewFormProps) {
  const handleChange = (field: keyof BusinessCardData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="grid gap-4 py-4">

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <ClipboardInput
            id="name"
            fieldLabel="Name"
            value={data.name || ''}
            onValueChange={(val) => handleChange('name', val)}
            className='rounded-md'
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <ClipboardInput
            id="designation"
            fieldLabel="Designation"
            value={data.designation || ''}
            onValueChange={(val) => handleChange('designation', val)}
            className='rounded-md'
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <ClipboardInput
          id="company"
          fieldLabel="Company"
          value={data.company || ''}
          onValueChange={(val) => handleChange('company', val)}
          className='rounded-md'
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <ClipboardInput
            id="email"
            type="email"
            fieldLabel="Email"
            value={data.email || ''}
            onValueChange={(val) => handleChange('email', val)}
            className='rounded-md'
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <ClipboardInput
            id="phone"
            fieldLabel="Phone"
            value={data.phone || ''}
            onValueChange={(val) => handleChange('phone', val)}
            className='rounded-md'
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <ClipboardInput
          id="website"
          fieldLabel="Website"
          value={data.website || ''}
          onValueChange={(val) => handleChange('website', val)}
          className='rounded-md'
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <ClipboardInput
          id="address"
          fieldLabel="Address"
          value={data.address || ''}
          onValueChange={(val) => handleChange('address', val)}
          className='rounded-md'

        />
      </div>
    </div>
  );
}
