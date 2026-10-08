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
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { UserType } from '@/types/enums';
import { TruncatedText } from '@/components/master/shared/TruncatedCellTip';
import { CRM_SSO_ENABLED } from '@/lib/crmSso';
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

/**
 * Collapsed sidebar, grouped section (Master Data, Meeting Masters…): hovering the icon opens a flyout
 * beside the rail listing every option inside, so they can be opened without expanding the sidebar.
 * Single options keep their plain name tooltip.
 */
function SectionFlyoutMenu({
  title,
  Icon,
  items,
  isSectionActive,
  onExpand,
  onToggleCollapse,
  activeTab,
  onTabChange,
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
  // After picking an option the flyout closes, and stays closed until the pointer leaves the group
  // (otherwise hover / focus-within would keep it open under the cursor).
  const [dismissed, setDismissed] = useState(false);

  return (
    <div
      className="group/fly relative w-full flex justify-center"
      onMouseLeave={() => setDismissed(false)}
    >
      <button
        type="button"
        data-tour={dataTour}
        aria-haspopup="menu"
        aria-label={title}
        onClick={() => {
          if (onToggleCollapse) onToggleCollapse();
          onExpand();
        }}
        className="flex items-center justify-center mx-auto h-9 w-9 rounded-lg p-0 transition-colors duration-150 relative text-white hover:bg-white/10"
      >
        <span
          aria-hidden
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-md",
            isSectionActive ? "bg-[#C4161C]" : "bg-white/15"
          )}
        >
          <Icon size={15} strokeWidth={isSectionActive ? 2.15 : 1.9} className="text-white" />
        </span>
      </button>

      {/* Flyout: pl-2.5 is a hover bridge from the icon to the panel, so it stays open on the way over. */}
      <div
        role="menu"
        aria-label={title}
        className={cn(
          "invisible absolute left-full top-0 z-50 pl-2.5 opacity-0 transition-[opacity,visibility] duration-150",
          !dismissed && "group-hover/fly:visible group-hover/fly:opacity-100 group-focus-within/fly:visible group-focus-within/fly:opacity-100"
        )}
      >
        <div className="w-56 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white text-left shadow-[0_16px_48px_rgba(12,26,58,0.18)] dark:border-[var(--tm-border)] dark:bg-[var(--tm-surface)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.55)]">
          <p className="border-b border-[#EEF2F6] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.1em] text-[#7a8494] dark:border-[var(--tm-border)] dark:text-slate-400">
            {title}
          </p>
          <div className="max-h-[min(60vh,22rem)] overflow-y-auto py-1">
            {items.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  aria-current={active ? 'page' : undefined}
                  onClick={(event) => {
                    setDismissed(true);
                    event.currentTarget.blur();
                    onTabChange(item.id);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-semibold transition-colors",
                    active
                      ? "bg-[#eef3fc] text-[#1E56A0] shadow-[inset_3px_0_0_#1E56A0] dark:bg-[#1E56A0]/20 dark:text-[#4f86d1]"
                      : "text-[#0c1a3a] hover:bg-[#F1F5F9] dark:text-slate-100 dark:hover:bg-[var(--tm-muted)]"
                  )}
                >
                  <item.icon size={14} strokeWidth={2} className="shrink-0 opacity-80" />
                  <span className="min-w-0 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
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
  // Footer, as in the CRM: two-letter initials (EDP → ED) and a "Name · Role" tip.
  const footerNameParts = (userDisplayName ?? '').trim().split(/\s+/).filter(Boolean);
  const userInitials = (
    footerNameParts.length > 1
      ? `${footerNameParts[0].charAt(0)}${footerNameParts[1].charAt(0)}`
      : (userDisplayName ?? '').trim().slice(0, 2)
  ).toUpperCase() || 'U';
  const userFooterTip = [userDisplayName, roleLabel].filter(Boolean).join(' · ');

  // Menu rights are loaded once by MainLayout — avoid a second task-management-menu call here.

  const filteredNavItems = accessibleForms ? navItems.filter(item => item.formNo && accessibleForms.includes(item.formNo)) : [];
  const filteredMasterItems = accessibleForms ? masterItems.filter(item => item.formNo && accessibleForms.includes(item.formNo)) : [];
  const filteredMenuMasterItems = accessibleForms ? menuMasterItems.filter(item => item.formNo && accessibleForms.includes(item.formNo)) : [];

  // Section split for the sidebar titles (order unchanged): reports apart from the workspace pages.
  const REPORT_NAV_IDS = new Set(['reports', 'meeting-reports']);
  const workspaceNavItems = filteredNavItems.filter((item) => !REPORT_NAV_IDS.has(item.id));
  const reportNavItems = filteredNavItems.filter((item) => REPORT_NAV_IDS.has(item.id));

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

  const renderNavItem = (item: { icon: typeof LayoutGrid; label: string; id: string }, onClick?: () => void, onPrefetch?: () => void) => {
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        data-tour={`nav-${item.id}`}
        onClick={onClick ?? (() => onTabChange(item.id))}
        onPointerEnter={onPrefetch}
        onFocus={onPrefetch}
        className={cn(
          navBtnBase,
          isCollapsed
            ? "justify-center mx-auto h-9 w-9 rounded-lg p-0 text-white hover:bg-white/10"
            : cn(
              "gap-2 rounded-lg px-2 py-1.5 min-h-9 text-[13px]",
              isActive
                ? "text-white font-semibold hover:bg-white/[0.08]"
                : "font-medium text-white/90 hover:bg-white/[0.08] hover:text-white"
            )
        )}
      >
        <span
          aria-hidden
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors duration-150",
            isActive ? "bg-[#C4161C]" : "bg-white/15"
          )}
        >
          <item.icon size={15} strokeWidth={isActive ? 2.15 : 1.9} className="shrink-0 text-white" />
        </span>
        {!isCollapsed && (
          <span className="min-w-0 flex-1 overflow-hidden text-left">
            <TruncatedText text={item.label} className="text-left" />
          </span>
        )}

        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none opacity-0 scale-95 transition-none group-hover:opacity-100 group-hover:scale-100 group-hover:transition-[opacity,transform] group-hover:duration-150 group-hover:ease-[ease]">
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
            "absolute left-[7px] w-px bg-white/20",
            isLast ? "top-0 h-1/2" : "inset-y-0"
          )}
        />
        {/* Elbow */}
        <span className="absolute left-[7px] top-1/2 w-2.5 h-px bg-white/20" />

        <button
          onClick={() => onTabChange(item.id)}
          className={cn(
            "relative ml-4 w-[calc(100%-1rem)] flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-md text-left text-[12.5px] transition-colors duration-150 group",
            isActive
              ? "bg-white/[0.12] text-white font-semibold"
              : "font-medium text-white/75 hover:bg-white/[0.08] hover:text-white"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "grid h-6 w-6 shrink-0 place-items-center rounded-md",
              isActive ? "bg-[#C4161C]" : "bg-white/10"
            )}
          >
            <item.icon size={13} strokeWidth={isActive ? 2.1 : 1.8} className="shrink-0 text-white" />
          </span>
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
            "relative w-full flex items-center gap-2 px-2 py-1.5 min-h-9 rounded-lg cursor-pointer transition-colors duration-150 text-left text-[13px] group hover:bg-white/[0.08]",
            showActive ? "text-white font-semibold" : "font-medium text-white/90 hover:text-white"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-md",
              isSectionActive ? "bg-[#C4161C]" : "bg-white/15"
            )}
          >
            <Icon size={15} strokeWidth={showActive ? 2.15 : 1.9} className="shrink-0 text-white" />
          </span>
          <span className="min-w-0 flex-1 overflow-hidden text-left">
            <TruncatedText text={title} className="text-left" />
          </span>
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={cn(
              "shrink-0 transition-transform duration-300",
              "text-white/60",
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
        "crm-sidebar relative h-full flex flex-col shrink-0 transition-all duration-300 border-r border-white/10 bg-[#1E56A0]",
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
            <img
              src={`${import.meta.env.BASE_URL}spectrum-erp-logo-on-dark.png`}
              alt="Spectrum ERP"
              className={cn("block h-9 w-full object-contain", isCollapsed ? "object-center" : "object-left")}
            />
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="lg:hidden h-8 w-8 rounded-lg hover:bg-white/10 flex items-center justify-center shrink-0"
            >
              <X size={18} className="text-white/80" />
            </Button>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/10" />
        </div>
      )}

      {/* Navigation */}
      <nav
        data-tour="sidebar-nav"
        className={cn(
          "flex-1 scrollbar-hide",
          isCollapsed ? "overflow-visible px-1 pt-2.5 pb-2" : "overflow-y-auto px-2.5 py-2"
        )}
      >
        {/* Sections, as in the CRM sidebar: small title (expanded) or a short divider (collapsed) */}
        {[
          {
            key: 'workspace',
            title: 'Workspace',
            show: workspaceNavItems.length > 0 || CRM_SSO_ENABLED,
            body: (
              <>
                {workspaceNavItems.map((item) => renderNavItem(item))}
                {/* Back to the CRM (single sign-on) — last in Workspace, like the CRM's "Tasks" link */}
              </>
            ),
          },
          {
            key: 'reports',
            title: 'Reports',
            show: reportNavItems.length > 0,
            body: reportNavItems.map((item) => renderNavItem(item)),
          },
          {
            key: 'masters',
            title: 'Masters',
            show: filteredMasterItems.length > 0 || filteredMenuMasterItems.length > 0,
            body: (
              <>
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
              </>
            ),
          },
        ]
          .filter((section) => section.show)
          .map((section, index) => (
            <div
              key={section.key}
              className={cn(index > 0 && (isCollapsed ? 'mt-2' : 'mt-4 border-t border-white/10 pt-3'))}
            >
              {isCollapsed ? (
                index > 0 ? <div className="mx-auto mb-1.5 h-px w-6 bg-white/15" aria-hidden /> : null
              ) : (
                <p className={cn('px-2 pb-1.5 text-[10px] font-bold tracking-[0.14em] text-white/40', index === 0 && 'pt-1')}>
                  {section.title}
                </p>
              )}
              <div className={isCollapsed ? 'space-y-1' : 'space-y-0.5'}>{section.body}</div>
            </div>
          ))}
      </nav>

      {bottomItems.length > 0 && (
        <div className="space-y-0 pt-1 border-t border-white/10">
          {bottomItems.map((item) => (
            <button
              key={item.id}
              className={cn(
                "w-full flex items-center text-left transition-colors font-medium text-sm text-white/90 hover:bg-white/[0.08] hover:text-white rounded-lg group",
                isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-2"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={18} strokeWidth={1.75} className="text-white/80 group-hover:text-white" />
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
            // Same height as the list pager bar, so both bottom lines meet.
            'shrink-0 flex h-[var(--crm-footer-h)] items-center border-t border-white/10 overflow-visible',
            isCollapsed ? 'px-1.5' : 'px-2.5'
          )}
        >
          {/* CRM sidebar footer: gradient initials avatar; expanded adds name and role; collapsed tip on the right */}
          <div
            className={cn(
              'group/shield relative flex w-full items-center rounded-lg cursor-default',
              isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-2'
            )}
            aria-label={userShieldTip || undefined}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1E56A0,#C41E1E)] text-xs font-bold text-white">
              {userInitials}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <TruncatedText
                  text={userDisplayName ?? 'User'}
                  className="block min-w-0 text-xs font-semibold text-white"
                />
                {roleLabel ? (
                  <p className="truncate text-[11px] text-white/50">{roleLabel}</p>
                ) : null}
              </div>
            )}
            {isCollapsed && userFooterTip ? (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 z-50 pointer-events-none opacity-0 scale-95 transition-none group-hover/shield:opacity-100 group-hover/shield:scale-100 group-hover/shield:transition-[opacity,transform] group-hover/shield:duration-150 group-hover/shield:ease-[ease]">
                <div className="tm-sidebar-tip">
                  {userFooterTip}
                  <span className="tm-sidebar-tip-arrow" aria-hidden />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </aside>
  );
}
