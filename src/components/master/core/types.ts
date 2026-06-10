import type { ReactNode } from 'react';

export interface TableColumnConfig {
  key: string;
  header: string;
  width?: string;
  render?: (val: any, row: any) => ReactNode;
}

export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'combobox' | 'textarea' | 'sub-table' | 'custom';

export interface FormFieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  
  // For 'select' or 'combobox'
  options?: { label: string; value: string | number }[];
  optionsSource?: string; // If options are fetched dynamically from a store or API
  
  // UI and UX properties matching current MasterManager
  placeholder?: string;
  disabledPlaceholder?: string;
  className?: string; // Additional Tailwind classes

  // Dependencies
  dependsOn?: string; // Name of another field this field depends on
  disabledIf?: (formData: any) => boolean;

  // Interactions
  onAddNewAction?: 'openCreateModal';
  onAddNewMasterType?: string; // E.g., 'state', 'country'
  
  // Layout
  colSpan?: number; // E.g., 2 to span two columns in the grid

  // Custom Rendering
  customRender?: (formData: any, onChange: (val: any) => void, errors: Record<string, string>) => ReactNode;
}

export interface MasterConfig {
  title: string;
  endpoints: {
    search: string;
    load: string;
    save: string;
    delete: string;
  };
  idField: string;
  columns: TableColumnConfig[];
  formFields: FormFieldConfig[];
  
  // Allow transforming data before saving or after loading to bridge API quirks
  transformBeforeSave?: (data: any) => any;
  transformAfterLoad?: (data: any) => any;
}
