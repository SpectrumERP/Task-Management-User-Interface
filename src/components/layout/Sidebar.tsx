import { useState } from 'react';
import {
  LayoutGrid,
  X,
  Layers,
  Sliders,
  AlertCircle,
  Folder,
  Users,
  Sparkles,
  MapPin,
  Ship,
  Anchor,
  Building2,
  Globe,
  Building,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Handshake
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LogoImage from '@/assets/SteelMountLogo01.png';

const navItems = [
  { icon: LayoutGrid, label: 'Tasks List', id: 'tasks' },
  { icon: Handshake, label: 'Sales Deals', id: 'sales-deals' },
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
  { icon: Building2, label: 'Business Entity', id: 'master-company' },
  { icon: Globe, label: 'Countries', id: 'master-country' },
  { icon: MapPin, label: 'States', id: 'master-state' },
  { icon: Building, label: 'Cities', id: 'master-city' }
];

const bottomItems: { icon: any; label: string; id: string }[] = [];

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function Sidebar({ activeTab, onTabChange, onClose, isCollapsed = false, onToggleCollapse, className }: SidebarProps) {
  const [isMasterExpanded, setIsMasterExpanded] = useState(true);

  return (
    <aside className={cn("h-full bg-[#f4f7fa] border-r flex flex-col p-4 shrink-0 transition-all duration-300", isCollapsed ? "w-[80px] items-center px-2" : "w-64", className)}>
      {/* Brand */}
      <div className={cn("flex items-center mb-8 px-2 relative", isCollapsed ? "justify-center" : "justify-between")}>
        <div className="flex items-center justify-start py-1">
          <img src={LogoImage} alt="SteelMont Logo" className={cn("h-10 w-auto object-contain transition-all", isCollapsed && "scale-75")} />
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

      {/* Navigation */}
      <nav className="flex-1 space-y-6 overflow-y-auto pr-1 scrollbar-thin">
        <div className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center transition-all font-bold text-sm",
                isCollapsed ? "justify-center px-0 py-3 rounded-xl" : "gap-3 px-4 py-3 rounded-xl",
                activeTab === item.id
                  ? "bg-[#e1ecf7] text-[#006699]"
                  : "text-slate-600 hover:bg-slate-200/50"
              )}
              title={item.label}
            >
              <item.icon size={20} className={activeTab === item.id ? "text-[#006699]" : "text-slate-400"} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* Master Data Section */}
        <div className="space-y-2">
          {!isCollapsed && (
            <button
              onClick={() => setIsMasterExpanded(!isMasterExpanded)}
              className="w-full flex items-center justify-between px-4 mb-2 group cursor-pointer hover:bg-slate-200/50 py-1.5 rounded-lg transition-colors"
            >
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00b4d8]" />
                Master Data
              </h3>
              <ChevronDown
                size={14}
                className={cn(
                  "text-slate-400 transition-transform duration-300",
                  !isMasterExpanded && "-rotate-90"
                )}
              />
            </button>
          )}
          <div className={cn(
            "space-y-1 overflow-hidden transition-all duration-300",
            (isMasterExpanded || isCollapsed) ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
          )}>
            {masterItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "w-full flex items-center transition-all font-bold text-[12px]",
                    isCollapsed ? "justify-center px-0 py-2.5 rounded-xl" : "gap-3 px-4 py-2.5 rounded-xl",
                    isActive
                      ? "bg-[#e1ecf7] text-[#006699] shadow-sm"
                      : "text-slate-600 hover:bg-slate-200/40"
                  )}
                  title={item.label}
                >
                  <item.icon size={16} className={isActive ? "text-[#006699]" : "text-slate-400"} />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Bottom Items */}
      <div className="space-y-1 pt-1 border-t border-slate-200">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            className={cn(
              "w-full flex items-center transition-all font-medium text-sm text-slate-500 hover:bg-slate-200/50 rounded-xl",
              isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-2"
            )}
            title={item.label}
          >
            <item.icon size={20} className="text-slate-400" />
            {!isCollapsed && <span>{item.label}</span>}
          </button>
        ))}
      </div>

      {/* Collapse Toggle */}
      {onToggleCollapse && (
        <div className={cn("hidden lg:flex pt-1 mt-1", isCollapsed ? "justify-center" : "justify-end")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-8 w-8 rounded-lg hover:bg-slate-200/50 text-slate-500"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>
      )}
    </aside>
  );
}
