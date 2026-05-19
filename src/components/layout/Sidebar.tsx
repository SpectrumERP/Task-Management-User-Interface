import {
  LayoutGrid,
  Plus,
  Snowflake,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutGrid, label: 'Board', id: 'board' },
];

const bottomItems: { icon: any; label: string; id: string }[] = [];

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  onCreateTask: () => void;
  onClose?: () => void;
}

export function Sidebar({ activeTab, onTabChange, onCreateTask, onClose }: SidebarProps) {
  return (
    <aside className="w-64 h-full bg-[#f4f7fa] border-r flex flex-col p-4 shrink-0">
      {/* Brand */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="bg-[#0077b6] p-2 rounded-xl text-white">
            <Snowflake size={24} />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 leading-tight">Task Management</h2>
          </div>
        </div>
        {onClose && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose} 
            className="lg:hidden h-8 w-8 rounded-lg hover:bg-slate-200/50 flex items-center justify-center"
          >
            <X size={18} className="text-slate-500" />
          </Button>
        )}
      </div>

      {/* Create Task Button */}
      <Button
        onClick={onCreateTask}
        className="w-full bg-[#006699] hover:bg-[#005580] text-white rounded-xl py-6 mb-8 gap-2 font-bold shadow-lg shadow-[#006699]/20"
      >
        <Plus size={18} />
        Create Task
      </Button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm",
              activeTab === item.id
                ? "bg-[#e1ecf7] text-[#006699]"
                : "text-slate-500 hover:bg-slate-200/50"
            )}
          >
            <item.icon size={20} className={activeTab === item.id ? "text-[#006699]" : "text-slate-400"} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom Items */}
      <div className="space-y-1 pt-4 border-t border-slate-200">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-200/50 transition-all font-medium text-sm"
          >
            <item.icon size={20} className="text-slate-400" />
            {item.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
