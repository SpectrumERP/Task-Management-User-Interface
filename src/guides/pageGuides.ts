export type PageGuideStep = {
  target: string;
  title: string;
  body: string;
  prefer: 'bottom' | 'left' | 'right' | 'top';
};

export type PageGuideDef = {
  /** Short product name shown in tour chrome */
  title: string;
  steps: PageGuideStep[];
};

const S = (
  id: string,
  title: string,
  body: string,
  prefer: PageGuideStep['prefer'] = 'bottom'
): PageGuideStep => ({
  target: `[data-page-tour="${id}"]`,
  title,
  body,
  prefer,
});

/** Inner-section guides — only start when user clicks Page Guide */
export const PAGE_GUIDES: Record<string, PageGuideDef> = {
  tasks: {
    title: 'Tasks Guide',
    steps: [
      S('task-search', 'Search tasks', 'Yahan task title / keyword type karke list filter karo. Enter ya Search button se results refresh hote hain.'),
      S('task-filters', 'Filters & Sorting', 'Advanced filters yahan se khulte hain — status, category, assign to, dates wagaira. Reset se saaf kar sakte ho.'),
      S('task-view-mode', 'View mode', 'List, Board, ya Calendar — kaam dekhne ka tarika yahan change karo.'),
      S('task-create', 'Create task', 'Naya task banane ke liye + Create dabao. Form open hoga jahan details fill karni hoti hain.', 'left'),
      S('task-status-pills', 'Status filters', 'Pending, Draft, Complete… pills se list turant status-wise filter hoti hai. Dobara click se clear.'),
      S('task-table', 'Task list', 'Yahan saare tasks dikhte hain. Code pe click se detail, pencil se edit. Columns / priority badges se priority samajh aati hai.', 'top'),
    ],
  },

  'deal-monitor': {
    title: 'Deal Monitor Guide',
    steps: [
      S('task-search', 'Search', 'Deal Monitor tasks ko keyword se dhundo.'),
      S('task-filters', 'Filters', 'Status, assign to, dates — advanced filters yahan. Category is view mein pinned / controlled hai.'),
      S('task-view-mode', 'View mode', 'List / Board / Calendar switch karo.'),
      S('task-create', 'Create', '+ Create se naya Deal Monitor task banega.', 'left'),
      S('task-status-pills', 'Status pills', 'Pending, Draft… se turant filter.'),
      S('task-table', 'Results', 'Row pe click se full task page khulta hai.', 'top'),
    ],
  },

  meetings: {
    title: 'Meetings Guide',
    steps: [
      S('meeting-create', 'New meeting', '+ New Meeting se create form open hota hai.', 'left'),
      S('meeting-title-filter', 'Filter by title', 'Title type karke list filter karo.'),
      S('meeting-status-filter', 'Status filter', 'Initial / Release / Authorized status se narrow karo.'),
      S('meeting-date-filter', 'Date range', 'Meeting dates se list shortlist karo.'),
      S('meeting-clear-filters', 'Clear filters', 'Saare list filters ek click mein reset.'),
      S('meeting-table', 'Meeting list', 'Row ya edit icon pe click se detail / edit page.', 'top'),
    ],
  },

  'meeting-form': {
    title: 'Meeting Form Guide',
    steps: [
      S('meeting-form-actions', 'Save / Cancel', 'Save ya Update se note save hota hai; Cancel se list pe wapas.'),
      S('meeting-form-detail', 'Meeting details', 'Title, type, category, schedule aur status yahan set karo.', 'top'),
      S('meeting-form-participants', 'Participants', 'Internal / external participants add karo.'),
      S('meeting-form-discussions', 'Discussions', 'Discussion points aur outcomes yahan likho.'),
      S('meeting-form-attachments', 'Attachments', 'Related files upload / manage karo.'),
      S('page-guide-btn', 'Page Guide', 'Kabhi bhi ? / Page Guide se yeh tour dubara chala sakte ho.', 'left'),
    ],
  },

  'task-report': {
    title: 'Task Report Guide',
    steps: [
      S('report-filters', 'Report filters', 'Date, status, priority, category, users — criteria yahan set karo.'),
      S('report-apply', 'Apply', 'Apply dabao — report data load hota hai.'),
      S('report-reset', 'Reset', 'Filters clear / default pe laao.'),
      S('report-table', 'Results', 'Filtered task rows yahan dikhte hain.', 'top'),
      S('report-export', 'Export Excel', 'Excel download; Group by User option dekh lo.', 'left'),
    ],
  },

  'meeting-report': {
    title: 'Meeting Report Guide',
    steps: [
      S('mreport-filters', 'Report filters', 'Meeting report ke filters yahan set karo.'),
      S('mreport-apply', 'Apply', 'Apply se meeting report data aata hai.'),
      S('mreport-reset', 'Reset', 'Filters reset karo.'),
      S('mreport-table', 'Results', 'Meeting report rows yahan.', 'top'),
      S('mreport-export', 'Export Excel', 'Excel mein export karo.', 'left'),
    ],
  },

  'task-form': {
    title: 'Task Form Guide',
    steps: [
      S('task-form-actions', 'Save & actions', 'Save/Update aur Cancel — top bar se control.'),
      S('task-form-detail', 'Task Detail', 'Title aur description yahan likho — yeh main task identity hai.', 'top'),
      S('task-form-category', 'Category Detail', 'Category, type, folder, priority set karo. + se quick master bhi add ho sakta hai.'),
      S('task-form-ownership', 'Ownership', 'Assign To / collaborators yahan manage karo.'),
      S('task-form-timeline', 'Timeline & Effort', 'Start / due dates aur estimated effort.'),
      S('task-form-attachments', 'Attachments', 'Related files attach karo.'),
    ],
  },

  'master-list': {
    title: 'Master List Guide',
    steps: [
      S('master-breadcrumb', 'Breadcrumb', 'Masters → current entity — navigation yahan se clear rehti hai.'),
      S('master-search', 'Search', 'Name / code se records filter karo.'),
      S('master-add', 'Add record', 'Naya master record banane ke liye Add Record.', 'left'),
      S('master-table', 'Records table', 'Code, name, actions — edit / delete yahan.', 'top'),
      S('master-pagination', 'Pagination', 'Page size aur next/prev se list navigate karo.'),
      S('page-guide-btn', 'Page Guide', 'Is screen ka tour dubara ? se start karo.', 'left'),
    ],
  },

  'master-company': {
    title: 'Company List Guide',
    steps: [
      S('master-search', 'Search', 'Business entity name / code se search.'),
      S('company-view-mode', 'View mode', 'Entity / Contact / Attachment-wise search switch.'),
      S('master-add', 'Add record', 'Nayi company / business entity create karo.', 'left'),
      S('master-table', 'Records', 'List rows — edit / open details.', 'top'),
      S('master-pagination', 'Pagination', 'Badi list ko pages mein browse karo.'),
    ],
  },

  'master-form': {
    title: 'Master Form Guide',
    steps: [
      S('master-form-breadcrumb', 'Navigation', 'Masters → list → New/Edit — breadcrumb se wapas jaao.'),
      S('master-form-actions', 'Save / Cancel', 'Save se confirm; Cancel se list pe return.'),
      S('master-form-fields', 'Fields', 'Required fields carefully fill karo, phir Save.', 'top'),
      S('page-guide-btn', 'Page Guide', 'Form ka tour ? se dubara chalao.', 'left'),
    ],
  },

  'company-form': {
    title: 'Company Form Guide',
    steps: [
      S('master-form-actions', 'Save / Cancel', 'Entity save / list pe wapas.'),
      S('company-header', 'Header fields', 'Name, type, VAT/GST aur primary identity.', 'top'),
      S('company-locations', 'Locations', 'Addresses / locations add-edit (modal khulta hai).'),
      S('company-contacts', 'Contacts', 'Contact persons manage karo.'),
      S('company-attachments', 'Attachments', 'Files / card scan yahan.'),
    ],
  },

  deals: {
    title: 'Sales Deals Guide',
    steps: [
      S('deal-create', 'New deal', 'Naya sales deal create karo.', 'left'),
      S('deal-filters', 'Filters', 'Company, dates wagaira se search criteria set karo.'),
      S('deal-search-btn', 'Search', 'Apply search — results neeche aate hain.'),
      S('deal-reset', 'Reset', 'Filters clear karo.'),
      S('deal-table', 'Results', 'Edit / delete actions row pe.', 'top'),
    ],
  },

  'deal-form': {
    title: 'Deal Form Guide',
    steps: [
      S('deal-form-actions', 'Save / Cancel', 'Deal save ya list pe wapas.'),
      S('deal-form-fields', 'Deal fields', 'Company, division, document no, date, description fill karo.', 'top'),
    ],
  },

  'task-detail-modal': {
    title: 'Task Preview Guide',
    steps: [
      S('tdm-header', 'Task identity', 'Code aur status yahan — task ka quick identity.'),
      S('tdm-edit', 'Edit Task', 'Full form open karne ke liye Edit Task dabao.', 'left'),
      S('tdm-summary', 'Summary', 'Title aur description — task ka overview.', 'top'),
      S('tdm-details', 'Details panel', 'Priority, category, dates, assign to — saari specs yahan.'),
      S('tdm-activity', 'Activity & Effort', 'Comments aur effort logs yahan post / review karo.', 'top'),
    ],
  },

  'master-create-dialog': {
    title: 'Quick Create Guide',
    steps: [
      S('mcd-title', 'Quick create', 'Task form se bina Masters page khole naya master add karo.'),
      S('mcd-fields', 'Fields', 'Name aur required fields fill karo.', 'top'),
      S('mcd-save', 'Save', 'Save se naya record banega aur form mein select ho jayega.', 'left'),
    ],
  },
};

/** Route → guide key (when no modal guide is active) */
export function resolvePageGuideKey(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, '') || '/';

  if (p === '/') return 'tasks';
  if (p === '/deal-monitor') return 'deal-monitor';

  if (p === '/meetings') return 'meetings';
  if (p === '/meetings/new' || /^\/meetings\/\d+$/.test(p)) return 'meeting-form';

  if (p === '/reports') return 'task-report';
  if (p === '/meeting-reports') return 'meeting-report';

  if (p === '/task/new' || /^\/task\/\d+$/.test(p)) return 'task-form';

  if (p === '/sales/deals') return 'deals';
  if (p.startsWith('/sales/deals/')) return 'deal-form';

  const masterList = p.match(/^\/master\/([^/]+)$/);
  if (masterList) {
    return masterList[1] === 'company' ? 'master-company' : 'master-list';
  }

  const masterForm = p.match(/^\/master\/([^/]+)\/(new|edit(?:\/[^/]+)?)$/);
  if (masterForm) {
    return masterForm[1] === 'company' ? 'company-form' : 'master-form';
  }
  // /master/:type/edit/:id
  const masterEdit = p.match(/^\/master\/([^/]+)\/edit\/[^/]+$/);
  if (masterEdit) {
    return masterEdit[1] === 'company' ? 'company-form' : 'master-form';
  }

  return null;
}

function isGuideHostVisible(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }
  const r = el.getBoundingClientRect();
  return r.width > 8 && r.height > 8;
}

/**
 * Prefer an open modal/dialog that declares data-page-guide,
 * otherwise fall back to the current route.
 */
export function resolveActivePageGuideKey(pathname: string): string | null {
  if (typeof document !== 'undefined') {
    const hosts = Array.from(
      document.querySelectorAll('[data-page-guide]')
    ) as HTMLElement[];
    // Prefer the top-most (last in DOM / largest z) visible host
    for (let i = hosts.length - 1; i >= 0; i--) {
      const el = hosts[i];
      if (!isGuideHostVisible(el)) continue;
      const key = el.getAttribute('data-page-guide');
      if (key && PAGE_GUIDES[key]) return key;
    }
  }
  return resolvePageGuideKey(pathname);
}

export function getPageGuide(key: string | null | undefined): PageGuideDef | null {
  if (!key) return null;
  return PAGE_GUIDES[key] ?? null;
}

export function hasPageGuideForPath(pathname: string): boolean {
  return resolveActivePageGuideKey(pathname) != null;
}
