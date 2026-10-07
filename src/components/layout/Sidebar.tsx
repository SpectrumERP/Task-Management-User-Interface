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
  Database,
  Monitor,
  Calendar,
  CalendarDays,
  FileText,
  Shield,
  UserRound,
  Handshake
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuthStore } from '@/store/useAuthStore';
import { UserType } from '@/types/enums';
import { TruncatedText } from '@/components/master/shared/TruncatedCellTip';
import { CRM_SSO_ENABLED, crmHomeUrl } from '@/lib/crmSso';
export const navItems = [
  { icon: LayoutGrid, label: 'Tasks List', id: 'tasks', formNo: 1547 },
  // { icon: Handshake, label: 'Sales Deals', id: 'sales-deals' },
  { icon: Monitor, label: 'Deal Monitor', id: 'deal-monitor', formNo: 1548 },
  { icon: Calendar, label: 'Meeting Notes', id: 'meeting-notes', formNo: 1559 },
  { icon: FileText, label: 'MIS Task Report', id: 'reports', formNo: 930 },
  { icon: FileText, label: 'MIS Meeting Report', id: 'meeting-reports', formNo: 934 }
];

export const masterItems = [
  { icon: Layers, label: 'Categories', id: 'master-category', formNo: 1561 },
  { icon: Sliders, label: 'Types', id: 'master-type', formNo: 1560 },
  { icon: AlertCircle, label: 'Priorities', id: 'master-priority', formNo: 1543 },
  { icon: Folder, label: 'Folders', id: 'master-folder', formNo: 1542 },
  { icon: Users, label: 'User Groups', id: 'master-user-group', formNo: 1546 },
  { icon: Sparkles, label: 'Benefit Types', id: 'master-benefit-type', formNo: 1545 },
  { icon: MapPin, label: 'Task Locations', id: 'master-location', formNo: 1541 },
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

/** Inside the CRM (shared sign-in): switches back to the CRM, a separate app, so it is not a tab of this one. */
const crmModuleItem = { icon: Handshake, label: 'CRM', id: 'crm-module' };

export const bottomItems: { icon: any; label: string; id: string }[] = [];

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  /** When true, brand/logo row is omitted (logo lives in the app header). */
  hideBrand?: boolean;
  className?: string;
}

type FlyoutItem = { icon: typeof LayoutGrid; label: string; id: string; formNo?: number };

function SectionFlyoutMenu({
  title,
  Icon,
  isSectionActive,
  onExpand,
  onToggleCollapse,
  dataTour,
}: {
  title: string;
  Icon: typeof Database;
  items: FlyoutItem[];
  isSectionActive: boolean;
  onExpand: () => void;
  onToggleCollapse?: () => void;
  activeTab: string;
  onTabChange: (id: string) => void;
  dataTour?: string;
}) {
  return (
    <div className="relative w-full flex justify-center">
      <button
        type="button"
        data-tour={dataTour}
        onClick={() => {
          if (onToggleCollapse) onToggleCollapse();
          onExpand();
        }}
        className={cn(
          "group flex items-center justify-center mx-auto h-9 w-9 rounded-[10px] p-0 transition-all duration-200 relative",
          isSectionActive
            ? "bg-[var(--tm-tint)] text-[#0EA5E9] shadow-sm"
            : "text-slate-500 hover:bg-[var(--tm-tint)] hover:text-[#0EA5E9] hover:shadow-sm"
        )}
      >
        <Icon
          size={18}
          strokeWidth={isSectionActive ? 2.15 : 1.75}
          className={isSectionActive ? "text-[#0EA5E9]" : "text-slate-400 group-hover:text-[#0EA5E9]"}
        />
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
          <div className="tm-sidebar-tip">
            {title}
            <span className="tm-sidebar-tip-arrow" aria-hidden />
          </div>
        </div>
      </button>
    </div>
  );
}

export function Sidebar({ activeTab, onTabChange, onClose, isCollapsed = false, onToggleCollapse, hideBrand = false, className }: SidebarProps) {
  const accessibleForms = useAuthStore(state => state.accessibleForms);
  const user = useAuthStore(state => state.user);

  const userTypeValue = Number(user?.UserType ?? user?.userType ?? user?.role);
  const roleLabel =
    userTypeValue === UserType.admin
      ? 'Admin'
      : userTypeValue === UserType.General
        ? 'General'
        : (typeof user?.role === 'string' && user.role.trim() ? user.role : null);
  const userDisplayName =
    user?.PrintingName ||
    user?.name ||
    user?.LoginID ||
    user?.loginId ||
    user?.username ||
    null;
  const userLoginId =
    (typeof user?.LoginID === 'string' && user.LoginID.trim()) ||
    (typeof user?.loginId === 'string' && user.loginId.trim()) ||
    (typeof user?.username === 'string' && user.username.trim()) ||
    null;
  const userShieldTip = [
    userDisplayName ? `Name: ${userDisplayName}` : null,
    roleLabel ? `Role: ${roleLabel}` : null,
    userLoginId && userLoginId !== userDisplayName ? `Login: ${userLoginId}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Menu rights are loaded once by MainLayout — avoid a second task-management-menu call here.

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
    "w-full flex items-center text-left relative group transition-[background-color,color,box-shadow,transform] duration-200 ease-out";

  const renderNavItem = (item: { icon: typeof LayoutGrid; label: string; id: string }, onClick?: () => void) => {
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        data-tour={`nav-${item.id}`}
        onClick={onClick ?? (() => onTabChange(item.id))}
        className={cn(
          navBtnBase,
          isCollapsed
            ? cn(
              "justify-center mx-auto h-9 w-9 rounded-[10px] p-0",
              isActive
                ? "bg-[#0EA5E9] text-white shadow-[0_6px_16px_-6px_rgba(14,165,233,0.55)]"
                : "text-slate-500 hover:bg-[#0EA5E9] hover:text-white hover:shadow-[0_6px_16px_-6px_rgba(14,165,233,0.35)]"
            )
            : cn(
              "gap-3 rounded-xl px-3 py-[9px] text-[13px] tracking-[-0.01em]",
              isActive
                ? "bg-[var(--tm-chrome-muted)] text-slate-50 font-semibold"
                : "font-medium text-slate-300 hover:bg-[var(--tm-chrome-muted)] hover:text-[#0EA5E9]"
            )
        )}
      >
        {isActive && !isCollapsed && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-1/2 h-[70%] w-[3px] -translate-y-1/2 rounded-r-full bg-[#0EA5E9]"
          />
        )}
        <item.icon
          size={isCollapsed ? 16 : 16}
          strokeWidth={isActive ? 2.15 : 1.75}
          className={cn(
            "shrink-0 transition-colors duration-200",
            isCollapsed && isActive
              ? "text-white"
              : isActive
                ? "text-slate-50"
                : isCollapsed
                  ? "text-slate-400 group-hover:text-white"
                  : "text-slate-400 group-hover:text-[#0EA5E9]"
          )}
        />
        {!isCollapsed && (
          <span className="min-w-0 flex-1 overflow-hidden text-left">
            <TruncatedText text={item.label} className="text-left" />
          </span>
        )}

        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200">
            <div className="tm-sidebar-tip">
              {item.label}
              <span className="tm-sidebar-tip-arrow" aria-hidden />
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
            "relative ml-4 w-[calc(100%-1rem)] flex items-center gap-2.5 pl-2 pr-2.5 py-[6px] rounded-lg text-left text-[12.5px] tracking-[-0.01em] transition-colors duration-150 group",
            isActive
              ? "bg-[var(--tm-chrome-muted)] text-slate-50 font-semibold"
              : "font-medium text-slate-500 hover:bg-[var(--tm-chrome-muted)] hover:text-[#0EA5E9]"
          )}
        >
          {isActive && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-full bg-[#0EA5E9]"
            />
          )}
          <item.icon
            size={14}
            strokeWidth={isActive ? 2.1 : 1.7}
            className={cn(
              "shrink-0",
              isActive ? "text-slate-50" : "text-slate-400 group-hover:text-[#0EA5E9]"
            )}
          />
          <span className="min-w-0 flex-1 overflow-hidden text-left">
            <TruncatedText text={item.label} className="text-left" />
          </span>
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
    dataTour,
  }: {
    title: string;
    Icon: typeof Database;
    items: typeof filteredMasterItems;
    isExpanded: boolean;
    isSectionActive: boolean;
    onToggle: () => void;
    dataTour?: string;
  }) => {
    const showActive = isExpanded || isSectionActive;

    return (
      <div>
        <button
          onClick={onToggle}
          data-tour={dataTour}
          className={cn(
            "relative w-full flex items-center gap-3 px-3 py-[9px] rounded-xl cursor-pointer transition-colors duration-150 text-left text-[13px] tracking-[-0.01em] group",
            showActive
              ? "bg-[var(--tm-chrome-muted)] text-slate-50 font-semibold"
              : "font-medium text-slate-300 hover:bg-[var(--tm-chrome-muted)] hover:text-[#0EA5E9]"
          )}
        >
          {showActive && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-0 top-1/2 h-[70%] w-[3px] -translate-y-1/2 rounded-r-full bg-[#0EA5E9]"
            />
          )}
          <Icon
            size={16}
            strokeWidth={showActive ? 2.15 : 1.75}
            className={cn("shrink-0", showActive ? "text-slate-50" : "text-slate-400 group-hover:text-[#0EA5E9]")}
          />
          <span className="min-w-0 flex-1 overflow-hidden text-left">
            <TruncatedText text={title} className="text-left" />
          </span>
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={cn(
              "shrink-0 transition-transform duration-300",
              showActive ? "text-slate-400" : "text-slate-300",
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
    onExpand: () => void,
    dataTour?: string
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
      dataTour={dataTour}
    />
  );

  return (
    <aside
      className={cn(
        "relative h-full flex flex-col shrink-0 transition-all duration-300 border-r border-[var(--tm-chrome-border)]",
        "bg-[linear-gradient(180deg,var(--tm-sidebar)_0%,var(--tm-sidebar-end)_100%)]",
        isCollapsed ? "w-14 items-center overflow-visible" : "w-56 overflow-visible",
        className
      )}
    >
      {/* Brand — skipped when logo is in the full app header */}
      {!hideBrand && (
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
            <BrandLogo
              maxHeight={isCollapsed ? 40 : 44}
              maxWidth={isCollapsed ? 56 : 200}
              className={isCollapsed ? "justify-center" : undefined}
              imgClassName={isCollapsed ? "object-center" : undefined}
            />
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden h-8 w-8 rounded-xl hover:bg-[var(--tm-chrome-muted)] flex items-center justify-center shrink-0"
            >
              <X size={18} className="text-slate-500" />
            </Button>
          )}
          <div className="pointer-events-none absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--tm-border)] to-transparent" />
        </div>
      )}

      {/* Navigation */}
      <nav
        data-tour="sidebar-nav"
        className={cn(
          "flex-1 scrollbar-hide",
          isCollapsed ? "overflow-visible px-1 pt-2.5 space-y-1" : "overflow-y-auto px-2.5 py-3.5 space-y-0.5"
        )}
      >
        {filteredNavItems.map((item) => renderNavItem(item))}

        {/* Master Data Section */}
        {filteredMasterItems.length > 0 && (
          isCollapsed ? (
            renderSectionFlyout(
              "Master Data",
              Database,
              filteredMasterItems,
              isMasterActive,
              () => setIsMasterExpanded(true),
              "nav-master"
            )
          ) : (
            renderTreeSection({
              title: "Master Data",
              Icon: Database,
              items: filteredMasterItems,
              isExpanded: isMasterExpanded,
              isSectionActive: isMasterActive,
              onToggle: () => setIsMasterExpanded(!isMasterExpanded),
              dataTour: "nav-master",
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
              () => setIsMenuMasterExpanded(true),
              "nav-meeting-masters"
            )
          ) : (
            renderTreeSection({
              title: "Meeting Masters",
              Icon: Calendar,
              items: filteredMenuMasterItems,
              isExpanded: isMenuMasterExpanded,
              isSectionActive: isMenuMasterActive,
              onToggle: () => setIsMenuMasterExpanded(!isMenuMasterExpanded),
              dataTour: "nav-meeting-masters",
            })
          )
        )}
        {CRM_SSO_ENABLED && renderNavItem(crmModuleItem, () => window.location.assign(crmHomeUrl))}
      </nav>

      {bottomItems.length > 0 && (
        <div className="space-y-0 pt-1 border-t border-[var(--tm-border)]/70">
          {bottomItems.map((item) => (
            <button
              key={item.id}
              className={cn(
                "w-full flex items-center text-left transition-colors font-medium text-sm text-slate-500 hover:bg-[var(--tm-chrome-muted)] hover:text-[#0EA5E9] rounded-xl group",
                isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={18} strokeWidth={1.75} className="text-slate-400 group-hover:text-[#0EA5E9]" />
              {!isCollapsed && (
                <span className="min-w-0 flex-1 overflow-hidden text-left">
                  <TruncatedText text={item.label} className="text-left" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {(userDisplayName || roleLabel) && (
        <div
          className={cn(
            'shrink-0 border-t border-[var(--tm-border)]/70 overflow-visible',
            isCollapsed ? 'px-1.5 py-2.5' : 'px-2.5 py-2.5'
          )}
        >
          <div
            className={cn(
              'overflow-visible',
              isCollapsed
                ? 'mx-auto flex h-9 w-9 items-center justify-center'
                : 'flex items-center justify-center'
            )}
          >
            <div
              className={cn(
                'inline-flex items-center min-w-0 max-w-full',
                isCollapsed ? '' : 'gap-1.5'
              )}
            >
              <span
                className={cn(
                  'group/shield relative inline-flex shrink-0 items-center justify-center cursor-default text-[#0EA5E9]',
                  isCollapsed ? 'h-9 w-9' : 'h-4 w-4'
                )}
                aria-label={userShieldTip}
              >
                {roleLabel ? (
                  <Shield size={isCollapsed ? 15 : 13} strokeWidth={1.75} />
                ) : (
                  <UserRound size={isCollapsed ? 15 : 13} strokeWidth={1.75} />
                )}
                {userShieldTip ? (
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 opacity-0 pointer-events-none group-hover/shield:opacity-100 transition-opacity duration-200">
                    <div className="tm-sidebar-tip">
                      {userShieldTip}
                      <span className="tm-sidebar-tip-arrow" aria-hidden />
                    </div>
                  </div>
                ) : null}
              </span>

              {!isCollapsed && (
                <div className="min-w-0 overflow-hidden inline-flex items-center gap-1">
                  {userDisplayName ? (
                    <TruncatedText
                      text={userDisplayName}
                      className="min-w-0 w-auto max-w-[7.5rem] text-[13px] font-medium leading-none text-[var(--tm-input-fg)]"
                    />
                  ) : null}
                  {userDisplayName && roleLabel ? (
                    <span className="shrink-0 text-[12px] leading-none text-slate-400" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  {roleLabel ? (
                    <span className="shrink-0 text-[12px] font-medium leading-none text-[#0EA5E9]">
                      {roleLabel}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
