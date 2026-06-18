import React from 'react';
import { BusinessCardData } from '../models/BusinessCardData';
import { Input } from '@/components/ui/input';
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
      {data.logo && (
        <div className="flex flex-col items-center justify-center mb-2">
          <p className="text-xs text-slate-500 font-medium mb-1 self-start">Extracted Logo</p>
          <div className="p-2 border rounded-md bg-white shadow-sm flex items-center justify-center h-24 w-auto min-w-[100px]">
            <img src={data.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input 
            id="name" 
            value={data.name || ''} 
            onChange={(e) => handleChange('name', e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="designation">Designation</Label>
          <Input 
            id="designation" 
            value={data.designation || ''} 
            onChange={(e) => handleChange('designation', e.target.value)} 
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Company</Label>
        <Input 
          id="company" 
          value={data.company || ''} 
          onChange={(e) => handleChange('company', e.target.value)} 
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email"
            value={data.email || ''} 
            onChange={(e) => handleChange('email', e.target.value)} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input 
            id="phone" 
            value={data.phone || ''} 
            onChange={(e) => handleChange('phone', e.target.value)} 
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input 
          id="website" 
          value={data.website || ''} 
          onChange={(e) => handleChange('website', e.target.value)} 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input 
          id="address" 
          value={data.address || ''} 
          onChange={(e) => handleChange('address', e.target.value)} 
        />
      </div>
    </div>
  );
}
