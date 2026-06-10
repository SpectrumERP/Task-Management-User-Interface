import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DynamicForm } from '../core/DynamicForm';
import { useMasterLogic } from '../core/useMasterLogic';
import { getPriorityConfig } from './priorityConfig';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Save, ChevronRight, X, Loader2 } from 'lucide-react';
import { useTaskStore } from '@/store/useTaskStore';
import { useAuthStore } from '@/store/useAuthStore';

export function PriorityForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id && id !== 'new';
  
  const authCompanies = useAuthStore((state: any) => state.company);
  const companyNo = authCompanies?.[0]?.CompanyNo || authCompanies?.[0]?.companyNo || 1;
  
  const { fillValues, fetchFillValues } = useTaskStore();
  
  useEffect(() => {
    fetchFillValues(companyNo.toString());
  }, [fetchFillValues, companyNo]);

  const config = useMemo(() => getPriorityConfig(fillValues), [fillValues]);
  
  const { fetchSingle, saveData } = useMasterLogic(config);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      fetchSingle(id).then((record) => {
        if (record) setFormData(record);
      });
    }
  }, [isEdit, id, fetchSingle]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...formData };
      if (isEdit && id) {
        payload[config.idField] = Number(id);
      }
      await saveData(payload);
      navigate(`/master/priority`);
    } catch (error) {
      console.error('Save failed', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-3.5 sm:p-4 sm:px-6 gap-2 bg-gradient-to-br from-slate-50 to-[#e8f1f8]">
      {/* Breadcrumb Header */}
      <div className="flex items-start shrink-0 mb-0 px-1 justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <button onClick={() => navigate(`/master/priority`)} className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded">Masters</button>
          <ChevronRight size={16} className="text-slate-400" />
          <button onClick={() => navigate(`/master/priority`)} className="text-slate-500 hover:text-[#006699] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#006699] rounded">{config.title}</button>
          <ChevronRight size={16} className="text-slate-400" />
          <span className="text-slate-900 font-bold tracking-tight">{isEdit ? 'Edit' : 'New'}</span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(`/master/priority`)}
            className="rounded-xl h-9 px-3 sm:px-5 font-medium text-slate-600 hover:bg-slate-100 transition-colors gap-0.5 text-xs flex items-center"
          >
            <X size={16} />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl h-9 px-3 sm:px-6 bg-[#006699] hover:bg-[#005580] font-medium text-white shadow-lg shadow-[#006699]/20 gap-0.5 transition-all hover:scale-105 active:scale-95 text-xs disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                {isEdit ? 'Update' : 'Save'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Master Form Card */}
      <Card className="flex-1 rounded-[28px] border-none shadow-xl shadow-slate-200/40 bg-white flex flex-col p-0 outline-none overflow-hidden max-w-6xl w-full mx-auto">
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 scrollbar-thin">
          <DynamicForm
            config={config}
            data={formData}
            onChange={handleChange}
          />
        </form>
      </Card>
    </div>
  );
}
