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
import { getBrand } from '@/config/brandConfig';
import { useAuthStore } from '@/store/useAuthStore';

const brand = getBrand();
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

type FlyoutItem = { icon: typeof LayoutGrid; label: string; id: string; formNo?: number };

function SectionFlyoutMenu({
  title,
  Icon,
  isSectionActive,
  onExpand,
  onToggleCollapse,
}: {
  title: string;
  Icon: typeof Database;
  items: FlyoutItem[];
  isSectionActive: boolean;
  onExpand: () => void;
  onToggleCollapse?: () => void;
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  return (
    <div className="relative w-full flex justify-center">
      <button
        type="button"
        onClick={() => {
          if (onToggleCollapse) onToggleCollapse();
          onExpand();
        }}
        className={cn(
          "group flex items-center justify-center mx-auto h-10 w-10 rounded-[11px] p-0 transition-all duration-200 relative",
          isSectionActive
            ? "bg-white text-[#006699] shadow-sm"
            : "text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm"
        )}
      >
        <Icon
          size={18}
          strokeWidth={isSectionActive ? 2.15 : 1.75}
          className={isSectionActive ? "text-[#006699]" : "text-slate-400 group-hover:text-slate-500"}
        />
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
          <div className="relative rounded-lg border border-[#006699]/12 bg-white px-2.5 py-1.5 text-[11px] font-semibold tracking-[-0.01em] text-[#006699] whitespace-nowrap shadow-[0_8px_24px_-8px_rgba(15,23,42,0.28)]">
            {title}
            <span className="absolute left-0 top-1/2 -translate-x-[5px] -translate-y-1/2 h-2.5 w-2.5 rotate-45 border-l border-b border-[#006699]/12 bg-white" />
          </div>
        </div>
      </button>
    </div>
  );
}

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

  const navBtnBase =
    "w-full flex items-center relative group transition-[background-color,color,box-shadow,transform] duration-200 ease-out";

  const renderNavItem = (item: { icon: typeof LayoutGrid; label: string; id: string }) => {
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        className={cn(
          navBtnBase,
          isCollapsed
            ? cn(
                "justify-center mx-auto h-10 w-10 rounded-[11px] p-0",
                isActive
                  ? "bg-[#006699] text-white shadow-[0_6px_16px_-6px_rgba(0,102,153,0.55)]"
                  : "text-slate-500 hover:bg-white hover:text-slate-700 hover:shadow-sm"
              )
            : cn(
                "gap-3 rounded-xl px-3 py-[9px] text-[13px] tracking-[-0.01em]",
                isActive
                  ? "bg-[#e8f3f8] text-[#006699] font-semibold"
                  : "font-medium text-slate-600 hover:bg-white/70 hover:text-slate-800"
              )
        )}
      >
        <item.icon
          size={isCollapsed ? 18 : 16}
          strokeWidth={isActive ? 2.15 : 1.75}
          className={cn(
            "shrink-0 transition-colors duration-200",
            isCollapsed && isActive
              ? "text-white"
              : isActive
                ? "text-[#006699]"
                : "text-slate-400 group-hover:text-slate-500"
          )}
        />
        {!isCollapsed && <span className="truncate">{item.label}</span>}

        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
            <div className="relative rounded-lg border border-[#006699]/12 bg-white px-2.5 py-1.5 text-[11px] font-semibold tracking-[-0.01em] text-[#006699] whitespace-nowrap shadow-[0_8px_24px_-8px_rgba(15,23,42,0.28)]">
              {item.label}
              <span className="absolute left-0 top-1/2 -translate-x-[5px] -translate-y-1/2 h-2.5 w-2.5 rotate-45 border-l border-b border-[#006699]/12 bg-white" />
            </div>
          </div>
        )}
      </button>
    );
  };

  const renderTreeLeaf = (
    item: { icon: typeof LayoutGrid; label: string; id: string },
    isLast: boolean
  ) => {
    const isActive = activeTab === item.id;

    return (
      <div key={item.id} className="relative flex items-stretch min-h-[32px]">
        {/* Vertical rail */}
        <span
          className={cn(
            "absolute left-[7px] w-px bg-slate-200",
            isLast ? "top-0 h-1/2" : "inset-y-0"
          )}
        />
        {/* Elbow */}
        <span className="absolute left-[7px] top-1/2 w-2.5 h-px bg-slate-200" />

        <button
          onClick={() => onTabChange(item.id)}
          className={cn(
            "ml-4 w-[calc(100%-1rem)] flex items-center gap-2.5 pl-2 pr-2.5 py-[6px] rounded-lg text-[12.5px] tracking-[-0.01em] transition-colors duration-150 group",
            isActive
              ? "bg-[#e8f3f8] text-[#006699] font-semibold"
              : "font-medium text-slate-500 hover:bg-white hover:text-slate-700"
          )}
        >
          <item.icon
            size={14}
            strokeWidth={isActive ? 2.1 : 1.7}
            className={cn(
              "shrink-0",
              isActive ? "text-[#006699]" : "text-slate-400 group-hover:text-slate-500"
            )}
          />
          <span className="truncate text-left">{item.label}</span>
        </button>
      </div>
    );
  };

  const renderTreeSection = ({
    title,
    Icon,
    items,
    isExpanded,
    isSectionActive,
    onToggle,
  }: {
    title: string;
    Icon: typeof Database;
    items: typeof filteredMasterItems;
    isExpanded: boolean;
    isSectionActive: boolean;
    onToggle: () => void;
  }) => {
    const showActive = isExpanded || isSectionActive;

    return (
      <div>
        <button
          onClick={onToggle}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-[9px] rounded-xl cursor-pointer transition-colors duration-150 text-[13px] tracking-[-0.01em]",
            showActive
              ? "bg-[#e8f3f8] text-[#006699] font-semibold"
              : "font-medium text-slate-600 hover:bg-white/60 hover:text-slate-800"
          )}
        >
          <Icon
            size={16}
            strokeWidth={showActive ? 2.15 : 1.75}
            className={cn("shrink-0", showActive ? "text-[#006699]" : "text-slate-400")}
          />
          <span className="flex-1 text-left truncate">{title}</span>
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={cn(
              "shrink-0 transition-transform duration-300",
              showActive ? "text-[#006699]/55" : "text-slate-300",
              !isExpanded && "-rotate-90"
            )}
          />
        </button>

        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out",
            isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="relative ml-3 mt-0.5 mb-1 pl-0">
            {items.map((item, index) =>
              renderTreeLeaf(item, index === items.length - 1)
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSectionFlyout = (
    title: string,
    Icon: typeof Database,
    items: typeof filteredMasterItems,
    isSectionActive: boolean,
    onExpand: () => void
  ) => (
    <SectionFlyoutMenu
      title={title}
      Icon={Icon}
      items={items}
      isSectionActive={isSectionActive}
      onExpand={onExpand}
      onToggleCollapse={onToggleCollapse}
      activeTab={activeTab}
      onTabChange={onTabChange}
    />
  );

  return (
    <aside
      className={cn(
        "h-full flex flex-col shrink-0 transition-all duration-300 border-r border-[#d9e4ec]/80",
        "bg-[linear-gradient(180deg,#f7fafc_0%,#f3f7fa_48%,#eef4f8_100%)]",
        isCollapsed ? "w-[80px] items-center overflow-visible" : "w-64",
        className
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "relative shrink-0",
          isCollapsed
            ? "flex flex-col gap-1 justify-center items-center px-0 py-3"
            : "flex items-center justify-between gap-2 px-4 py-3.5"
        )}
      >
        <div
          className={cn(
            "flex items-center overflow-hidden transition-all duration-300",
            isCollapsed ? "w-14 h-11 justify-center" : "min-w-0 flex-1"
          )}
        >
          <img
            src={brand.logoSrc}
            alt={`${brand.brandName} Logo`}
            className={cn(
              "w-auto object-contain object-left",
              isCollapsed ? "h-10 max-h-10 max-w-full" : "h-9 max-h-9 max-w-[148px]"
            )}
          />
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden h-8 w-8 rounded-xl hover:bg-white/80 flex items-center justify-center shrink-0"
          >
            <X size={18} className="text-slate-500" />
          </Button>
        )}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="hidden lg:flex h-8 w-8 rounded-xl shrink-0 text-slate-400 hover:text-[#006699] hover:bg-white/80"
          >
            <Menu size={16} strokeWidth={1.75} />
          </Button>
        )}
        <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200/90 to-transparent" />
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 scrollbar-hide",
          isCollapsed ? "overflow-visible px-1.5 pt-3 space-y-1" : "overflow-y-auto px-2.5 py-3.5 space-y-0.5"
        )}
      >
        {!isCollapsed && (
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400/90">
            Menu
          </p>
        )}

        {filteredNavItems.map((item) => renderNavItem(item))}

        {/* Master Data Section */}
        {filteredMasterItems.length > 0 && (
          isCollapsed ? (
            renderSectionFlyout(
              "Master Data",
              Database,
              filteredMasterItems,
              isMasterActive,
              () => setIsMasterExpanded(true)
            )
          ) : (
            renderTreeSection({
              title: "Master Data",
              Icon: Database,
              items: filteredMasterItems,
              isExpanded: isMasterExpanded,
              isSectionActive: isMasterActive,
              onToggle: () => setIsMasterExpanded(!isMasterExpanded),
            })
          )
        )}

        {/* Meeting Master Section */}
        {filteredMenuMasterItems.length > 0 && (
          isCollapsed ? (
            renderSectionFlyout(
              "Meeting Masters",
              Calendar,
              filteredMenuMasterItems,
              isMenuMasterActive,
              () => setIsMenuMasterExpanded(true)
            )
          ) : (
            renderTreeSection({
              title: "Meeting Masters",
              Icon: Calendar,
              items: filteredMenuMasterItems,
              isExpanded: isMenuMasterExpanded,
              isSectionActive: isMenuMasterActive,
              onToggle: () => setIsMenuMasterExpanded(!isMenuMasterExpanded),
            })
          )
        )}
      </nav>

      {bottomItems.length > 0 && (
        <div className="space-y-0 pt-1 border-t border-slate-200/70">
          {bottomItems.map((item) => (
            <button
              key={item.id}
              className={cn(
                "w-full flex items-center transition-colors font-medium text-sm text-slate-500 hover:bg-white/70 rounded-xl",
                isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2"
              )}
              title={item.label}
            >
              <item.icon size={18} strokeWidth={1.75} className="text-slate-400" />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
