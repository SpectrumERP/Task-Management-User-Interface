import {
  LayoutGrid,
  Plus,
  Snowflake
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
}

export function Sidebar({ activeTab, onTabChange, onCreateTask }: SidebarProps) {
  return (
    <aside className="w-64 h-screen bg-[#f4f7fa] border-r flex flex-col p-4">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="bg-[#0077b6] p-2 rounded-xl text-white">
          <Snowflake size={24} />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 leading-tight">Task Management</h2>
          {/* <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Execution Mode</p> */}
        </div>
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
