import {
  LayoutGrid,
  Plus,
  X,
  Briefcase,
  Layers,
  Sliders,
  AlertCircle,
  Folder,
  Users,
  Sparkles,
  MapPin,
  Ship,
  Anchor,
  Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LogoImage from '@/assets/SteelMountLogo01.png';

const navItems = [
  { icon: LayoutGrid, label: 'Tasks Dashboard', id: 'tasks' },
];

const masterItems = [
  { icon: Layers, label: 'Categories', id: 'master-category' },
  { icon: Sliders, label: 'Types', id: 'master-type' },
  { icon: AlertCircle, label: 'Priorities', id: 'master-priority' },
  { icon: Folder, label: 'Folders', id: 'master-folder' },
  { icon: Users, label: 'User Groups', id: 'master-user-group' },
  { icon: Sparkles, label: 'Benefit Types', id: 'master-benefit-type' },
  { icon: MapPin, label: 'Locations', id: 'master-location' },
  { icon: Ship, label: 'Vessels', id: 'master-vessel' },
  { icon: Anchor, label: 'Ports', id: 'master-port' },
  { icon: Building2, label: 'Business Entity Types', id: 'master-business-entity-type' },
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
        <div className="flex items-center justify-start py-1">
          <img src={LogoImage} alt="SteelMont Logo" className="h-10 w-auto object-contain" />
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
      <nav className="flex-1 space-y-6 overflow-y-auto pr-1 scrollbar-thin">
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm",
                activeTab === item.id
                  ? "bg-[#e1ecf7] text-[#006699]"
                  : "text-slate-600 hover:bg-slate-200/50"
              )}
            >
              <item.icon size={20} className={activeTab === item.id ? "text-[#006699]" : "text-slate-400"} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Master Data Section */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 mb-2 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00b4d8]" />
            Master Data
          </h3>
          <div className="space-y-1">
            {masterItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-bold text-[12px]",
                    isActive
                      ? "bg-[#e1ecf7] text-[#006699] shadow-sm"
                      : "text-slate-600 hover:bg-slate-200/40"
                  )}
                >
                  <item.icon size={16} className={isActive ? "text-[#006699]" : "text-slate-400"} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
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
