import { useState, useEffect } from 'react';
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
  ChevronDown,
  Menu,
  Database,
  Monitor,
  Calendar,
  CalendarDays,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LogoImage from '@/assets/SteelMountLogo01.png';

export const navItems = [
  { icon: LayoutGrid, label: 'Tasks List', id: 'tasks', formNo: 1547 },
  // { icon: Handshake, label: 'Sales Deals', id: 'sales-deals' },
  { icon: Monitor, label: 'Deal Monitor', id: 'deal-monitor', formNo: 1548 },
  { icon: Calendar, label: 'Meeting Notes', id: 'meeting-notes', formNo: 1559 },
  { icon: FileText, label: 'MIS Task Report', id: 'reports', formNo: 930 },
  { icon: FileText, label: 'MIS Meeting Report', id: 'meeting-reports', formNo: 934 },
];

export const masterItems = [
  { icon: Layers, label: 'Categories', id: 'master-category', formNo: 1561 },
  { icon: Sliders, label: 'Types', id: 'master-type', formNo: 1560 },
  { icon: AlertCircle, label: 'Priorities', id: 'master-priority', formNo: 1543 },
  { icon: Folder, label: 'Folders', id: 'master-folder', formNo: 1542 },
  { icon: Users, label: 'User Groups', id: 'master-user-group', formNo: 1546 },
  { icon: Sparkles, label: 'Benefit Types', id: 'master-benefit-type', formNo: 1545 },
  { icon: MapPin, label: 'Locations', id: 'master-location', formNo: 1541 },
  { icon: Ship, label: 'Vessels', id: 'master-vessel', formNo: 1549 },
  { icon: Anchor, label: 'Ports', id: 'master-port', formNo: 1563 },
  { icon: Building2, label: 'Business Entity Types', id: 'master-business-entity-type', formNo: 1564 },
  { icon: Building2, label: 'Business Entity', id: 'master-company', formNo: 1550 },
  { icon: Building2, label: 'Task Company', id: 'master-task-company', formNo: 1565 },
  { icon: Globe, label: 'Countries', id: 'master-country', formNo: 14 },
  { icon: MapPin, label: 'States', id: 'master-state', formNo: 13 },
  { icon: Building, label: 'Cities', id: 'master-city', formNo: 12 }
];

export const menuMasterItems = [
  { icon: Calendar, label: 'Meeting Category', id: 'master-meeting-category', formNo: 1561 },
  { icon: CalendarDays, label: 'Meeting Types', id: 'master-meeting-type', formNo: 1560 }
];

export const bottomItems: { icon: any; label: string; id: string }[] = [];

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

import { useAuthStore } from '@/store/useAuthStore';

export function Sidebar({ activeTab, onTabChange, onClose, isCollapsed = false, onToggleCollapse, className }: SidebarProps) {
  const accessibleForms = useAuthStore(state => state.accessibleForms);
  const fetchAccessibleForms = useAuthStore(state => state.fetchAccessibleForms);

  useEffect(() => {
    if (accessibleForms === null) {
      fetchAccessibleForms();
    }
  }, [accessibleForms, fetchAccessibleForms]);

  const filteredNavItems = accessibleForms ? navItems.filter(item => item.formNo && accessibleForms.includes(item.formNo)) : [];
  const filteredMasterItems = accessibleForms ? masterItems.filter(item => item.formNo && accessibleForms.includes(item.formNo)) : [];
  const filteredMenuMasterItems = accessibleForms ? menuMasterItems.filter(item => item.formNo && accessibleForms.includes(item.formNo)) : [];

  const isMasterActive = filteredMasterItems.some(item => item.id === activeTab);
  const [isMasterExpanded, setIsMasterExpanded] = useState(isMasterActive);

  const isMenuMasterActive = filteredMenuMasterItems.some(item => item.id === activeTab);
  const [isMenuMasterExpanded, setIsMenuMasterExpanded] = useState(isMenuMasterActive);

  useEffect(() => {
    setIsMasterExpanded(filteredMasterItems.some(item => item.id === activeTab));
    setIsMenuMasterExpanded(filteredMenuMasterItems.some(item => item.id === activeTab));
  }, [activeTab, accessibleForms]);

  return (
    <aside className={cn("h-full bg-[#f4f7fa] border-r flex flex-col shrink-0 transition-all duration-300", isCollapsed ? "w-[80px] items-center" : "w-64", className)}>
      {/* Brand */}
      <div className={cn("flex items-center mb-2 relative", isCollapsed ? "flex-col gap-1 justify-center px-0 mt-2" : "justify-between px-2")}>
        <div className={cn("flex items-center justify-start py-1 overflow-hidden transition-all duration-300", isCollapsed ? "w-14 h-10" : "w-auto")}>
          <img src={LogoImage} alt="SteelMont Logo" className="h-10 w-auto max-w-none object-left object-contain" />
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden h-8 w-8 rounded-lg hover:bg-slate-200/50 flex items-center justify-center shrink-0"
          >
            <X size={18} className="text-slate-500" />
          </Button>
        )}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hidden lg:flex h-10 w-10 rounded-xl hover:bg-slate-200/50 text-slate-500 shrink-0"
          >
            <Menu size={20} />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-3 scrollbar-hide", isCollapsed ? "overflow-visible" : "overflow-y-auto")}>
        <div className="space-y-0">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "w-full flex items-center transition-all font-bold text-sm relative group",
                isCollapsed ? "justify-center px-0 py-3 rounded-xl" : "gap-3 px-4 py-3 rounded-xl",
                activeTab === item.id
                  ? "bg-[#e1ecf7] text-[#006699]"
                  : "text-slate-600 hover:bg-slate-200/50"
              )}
            >
              <item.icon size={20} className={activeTab === item.id ? "text-[#006699]" : "text-slate-400"} />
              {!isCollapsed && <span>{item.label}</span>}

              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-lg">
                  {item.label}
                  <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Master Data Section */}
        {filteredMasterItems.length > 0 && (
          <div className="space-y-0">
            {isCollapsed ? (
              <div className="relative group w-full flex justify-center">
                <button
                  onClick={() => {
                    if (onToggleCollapse) onToggleCollapse();
                    setIsMasterExpanded(true);
                  }}
                  className="flex items-center justify-center px-0 py-3 rounded-xl transition-all font-bold text-sm relative text-slate-600 hover:bg-slate-200/50 w-full"
                >
                  <Database size={20} className={isMasterActive ? "text-[#006699]" : "text-slate-400"} />
                </button>

                {/* Interactive Hover Menu */}
                <div className="absolute left-full top-0 ml-2 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all z-50 shadow-xl min-w-[200px]">
                  {/* Invisible bridge to maintain hover */}
                  <div className="absolute -left-3 top-0 bottom-0 w-4 bg-transparent" />

                  <div className="px-3 py-2 flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 mb-1">
                    <Database size={14} className="text-[#00b4d8]" />
                    Master Data
                  </div>

                  <div className="max-h-[300px] overflow-y-auto py-1">
                    {filteredMasterItems.map(item => {
                      const isActive = activeTab === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTabChange(item.id);
                          }}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg cursor-pointer transition-colors",
                            isActive
                              ? "bg-[#e1ecf7] text-[#006699]"
                              : "text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <item.icon size={14} className={isActive ? "text-[#006699]" : "text-slate-400"} />
                          <span className="text-xs">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsMasterExpanded(!isMasterExpanded)}
                className="w-full flex items-center justify-between px-4 mb-1 group cursor-pointer hover:bg-slate-200/50 py-1.5 rounded-lg transition-colors"
              >
                <h3 className="text-sm font-black text-slate-500   flex items-center gap-1.5">
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
              (isMasterExpanded && !isCollapsed) ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 hidden"
            )}>
              {filteredMasterItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "w-full flex items-center transition-all font-bold text-sm relative group",
                      isCollapsed ? "justify-center px-0 py-2.5 rounded-xl" : "gap-3 px-4 py-2.5 rounded-xl",
                      isActive
                        ? "bg-[#e1ecf7] text-[#006699] shadow-sm"
                        : "text-slate-600 hover:bg-slate-200/40"
                    )}
                  >
                    <item.icon size={16} className={isActive ? "text-[#006699]" : "text-slate-400"} />
                    {!isCollapsed && <span>{item.label}</span>}

                    {isCollapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-lg">
                        {item.label}
                        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Meeting Master Section */}
        {filteredMenuMasterItems.length > 0 && (
          <div className="space-y-0 mt-1">
            {isCollapsed ? (
              <div className="relative group w-full flex justify-center">
                <button
                  onClick={() => {
                    if (onToggleCollapse) onToggleCollapse();
                    setIsMenuMasterExpanded(true);
                  }}
                  className="flex items-center justify-center px-0 py-3 rounded-xl transition-all font-bold text-sm relative text-slate-600 hover:bg-slate-200/50 w-full"
                >
                  <Menu size={20} className={isMenuMasterActive ? "text-[#006699]" : "text-slate-400"} />
                </button>

                {/* Interactive Hover Menu */}
                <div className="absolute left-full top-0 ml-2 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all z-50 shadow-xl min-w-[200px]">
                  <div className="absolute -left-3 top-0 bottom-0 w-4 bg-transparent" />

                  <div className="px-3 py-2 flex items-center gap-2 text-xs font-bold text-slate-800 border-b border-slate-100 mb-1">
                    <Menu size={14} className="text-[#00b4d8]" />
                    Meeting Masters
                  </div>

                  <div className="max-h-[300px] overflow-y-auto py-1">
                    {filteredMenuMasterItems.map(item => {
                      const isActive = activeTab === item.id;
                      return (
                        <div
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTabChange(item.id);
                          }}
                          className={cn(
                            "flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-lg cursor-pointer transition-colors",
                            isActive
                              ? "bg-[#e1ecf7] text-[#006699]"
                              : "text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <item.icon size={14} className={isActive ? "text-[#006699]" : "text-slate-400"} />
                          <span className="text-xs">{item.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsMenuMasterExpanded(!isMenuMasterExpanded)}
                className="w-full flex items-center justify-between px-4 mb-2 group cursor-pointer hover:bg-slate-200/50 py-1.5 rounded-lg transition-colors"
              >
                <h3 className="text-sm font-black text-slate-500 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00b4d8]" />
                  Meeting Masters
                </h3>
                <ChevronDown
                  size={14}
                  className={cn(
                    "text-slate-400 transition-transform duration-300",
                    !isMenuMasterExpanded && "-rotate-90"
                  )}
                />
              </button>
            )}
            <div className={cn(
              "space-y-1 overflow-hidden transition-all duration-300",
              (isMenuMasterExpanded && !isCollapsed) ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0 hidden"
            )}>
              {filteredMenuMasterItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "w-full flex items-center transition-all font-bold text-sm relative group",
                      isCollapsed ? "justify-center px-0 py-2.5 rounded-xl" : "gap-3 px-4 py-2.5 rounded-xl",
                      isActive
                        ? "bg-[#e1ecf7] text-[#006699] shadow-sm"
                        : "text-slate-600 hover:bg-slate-200/40"
                    )}
                  >
                    <item.icon size={16} className={isActive ? "text-[#006699]" : "text-slate-400"} />
                    {!isCollapsed && <span>{item.label}</span>}

                    {isCollapsed && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap shadow-lg">
                        {item.label}
                        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Items */}
      <div className="space-y-0 pt-1 border-t border-slate-200">
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


    </aside>
  );
}
