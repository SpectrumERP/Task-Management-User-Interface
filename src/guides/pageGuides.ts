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
      S('task-search', 'Search tasks', 'Type to filter instantly by title, code, or person. Clear with the × in the search box.'),
      S('task-filters', 'Filters', 'Opens the filter drawer — priority, task code, category, assign to, and due date. Use Reset to clear all filters.'),
      S('task-view-mode', 'View mode', 'Switch between List, Board, or Calendar from this control.'),
      S('task-create', 'Create task', 'Opens the form to create a new task.', 'left'),
      S('task-status-pills', 'Status filters', 'Tap status pills (Assigned, In-Progress, Hold, Complete, Cancelled) to filter. Tap again to clear. Multiple pills work together.'),
      S('task-table', 'Task list', 'Browse tasks here. Click the code for a quick preview, or edit from the row actions. Sort by clicking column headers.', 'top'),
    ],
  },

  'deal-monitor': {
    title: 'Deal Monitor Guide',
    steps: [
      S('task-search', 'Search', 'Type to filter Deal Monitor tasks by title, code, or person.'),
      S('task-filters', 'Filters', 'Opens priority, task code, assign to, and due-date filters. Category is fixed for this view.'),
      S('task-view-mode', 'View mode', 'Switch between List, Board, and Calendar.'),
      S('task-create', 'Create', 'Create a new Deal Monitor task.', 'left'),
      S('task-status-pills', 'Status pills', 'Filter quickly with status pills. Tap again to clear.'),
      S('task-table', 'Results', 'Click a row to open the full task page. Sort with column headers.', 'top'),
    ],
  },

  meetings: {
    title: 'Meetings Guide',
    steps: [
      S('meeting-create', 'New meeting', '+ New Meeting opens the create form.', 'left'),
      S('meeting-title-filter', 'Search', 'Filter meetings by typing in the title search box.'),
      S('meeting-status-filter', 'Status pills', 'Quickly narrow by Initial, Release, or Authorized.'),
      S('meeting-date-filter', 'Date range', 'Shortlist meetings by schedule dates.'),
      S('meeting-clear-filters', 'Clear filters', 'Reset all list filters in one click.'),
      S('meeting-table', 'Meeting list', 'Open a row to edit. Send minutes when Release/Authorized. Delete is only for users with Delete right, and only while status is Initial/Draft — confirm dialog pehle aayega.', 'top'),
    ],
  },

  'meeting-form': {
    title: 'Meeting Form Guide',
    steps: [
      S('meeting-form-actions', 'Save / Cancel / Send', 'Save or Update the note. After save, use Send Minutes (Release/Authorized) to email attendees.'),
      S('meeting-form-detail', 'Meeting details', 'Set title, type, category, schedule, status, and location (City · State shown together).', 'top'),
      S('meeting-form-participants', 'Participants', 'Add internal and external participants — emails here are used when sending minutes.'),
      S('meeting-form-discussions', 'Discussions', 'Write discussion points and outcomes here.'),
      S('meeting-form-attachments', 'Attachments', 'Upload and manage related files.'),
      S('page-guide-btn', 'Page Guide', 'You can restart this tour anytime from the ? / Page Guide button.', 'left'),
    ],
  },

  'task-report': {
    title: 'Task Report Guide',
    steps: [
      S('report-filters', 'Report filters', 'Set criteria here — date, status, priority, category, users.'),
      S('report-apply', 'Apply', 'Press Apply to load the report data.'),
      S('report-reset', 'Reset', 'Clear filters or reset to default.'),
      S('report-table', 'Results', 'Filtered task rows are displayed here.', 'top'),
      S('report-export', 'Export Excel', 'Download as Excel; check the Group by User option.', 'left'),
    ],
  },

  'meeting-report': {
    title: 'Meeting Report Guide',
    steps: [
      S('mreport-filters', 'Report filters', 'Set meeting report filters here.'),
      S('mreport-apply', 'Apply', 'Apply to fetch meeting report data.'),
      S('mreport-reset', 'Reset', 'Reset the filters.'),
      S('mreport-table', 'Results', 'Meeting report rows appear here.', 'top'),
      S('mreport-export', 'Export Excel', 'Export to Excel.', 'left'),
    ],
  },

  'task-form': {
    title: 'Task Form Guide',
    steps: [
      S('task-form-actions', 'Save & actions', 'Save, Update, and Cancel controls are on the top bar.'),
      S('task-form-detail', 'Task Detail', 'Write title and description here — this is the main task identity.', 'top'),
      S('task-form-category', 'Category Detail', 'Set category, type, folder, priority. Reminder frequency follows the selected priority. Use + to quickly add a master record.'),
      S('task-form-ownership', 'Ownership', 'Manage Assign To and collaborators here.'),
      S('task-form-timeline', 'Timeline & Effort', 'Start and due dates, along with estimated effort.'),
      S('task-form-attachments', 'Attachments', 'Attach related files.'),
    ],
  },

  'master-list': {
    title: 'Master List Guide',
    steps: [
      S('master-breadcrumb', 'Breadcrumb', 'Masters → current entity — navigation remains clear here.'),
      S('master-search', 'Search', 'Filter records by name or code.'),
      S('master-add', 'Add record', 'Use Add Record to create a new master record.', 'left'),
      S('master-table', 'Records table', 'Code, name, actions — edit or delete here.', 'top'),
      S('master-pagination', 'Pagination', 'Navigate the list using page size and next/prev.'),
      S('page-guide-btn', 'Page Guide', 'Start the tour for this screen again from ?.', 'left'),
    ],
  },

  'master-company': {
    title: 'Company List Guide',
    steps: [
      S('master-search', 'Search', 'Search by business entity name or code.'),
      S('company-view-mode', 'View mode', 'Switch between Entity, Contact, and Attachment views.'),
      S('master-add', 'Add record', 'Create a new company or business entity.', 'left'),
      S('master-table', 'Records', 'List rows — edit or open details.', 'top'),
      S('master-pagination', 'Pagination', 'Browse large lists across pages.'),
    ],
  },

  'master-form': {
    title: 'Master Form Guide',
    steps: [
      S('master-form-breadcrumb', 'Navigation', 'Masters → list → New/Edit — return using the breadcrumb.'),
      S('master-form-actions', 'Save / Cancel', 'Save to confirm; Cancel to return to the list.'),
      S('master-form-fields', 'Fields', 'Carefully fill the required fields, then Save.', 'top'),
      S('page-guide-btn', 'Page Guide', 'Restart the form tour from ?.', 'left'),
    ],
  },

  'company-form': {
    title: 'Company Form Guide',
    steps: [
      S('master-form-actions', 'Save / Cancel', 'Save entity or return to the list.'),
      S('company-header', 'Business entity', 'Name, type and website, plus the primary contact and address.', 'top'),
      S('company-locations', 'Additional locations', 'Other offices or sites. Click the header to expand; Add opens a modal.'),
      S('company-contacts', 'Contact persons', 'Other people at this business entity. Click the header to expand.'),
      S('company-attachments', 'Attachments', 'Files or card scans go here.'),
    ],
  },

  deals: {
    title: 'Sales Deals Guide',
    steps: [
      S('deal-create', 'New deal', 'Create a new sales deal.', 'left'),
      S('deal-filters', 'Filters', 'Set search criteria like company, dates, etc.'),
      S('deal-search-btn', 'Search', 'Apply search — results will appear below.'),
      S('deal-reset', 'Reset', 'Clear filters.'),
      S('deal-table', 'Results', 'Edit or delete actions are on the row.', 'top'),
    ],
  },

  'deal-form': {
    title: 'Deal Form Guide',
    steps: [
      S('deal-form-actions', 'Save / Cancel', 'Save deal or return to the list.'),
      S('deal-form-fields', 'Deal fields', 'Fill in company, division, document no, date, and description.', 'top'),
    ],
  },

  'task-detail-modal': {
    title: 'Task Preview Guide',
    steps: [
      S('tdm-header', 'Task identity', 'Code and status are here — quick task identity.'),
      S('tdm-edit', 'Edit Task', 'Press Edit Task to open the full form.', 'left'),
      S('tdm-summary', 'Summary', 'Title and description — an overview of the task.', 'top'),
      S('tdm-details', 'Details panel', 'Priority, category, dates, assign to — all specs are here.'),
      S('tdm-activity', 'Activity & Effort', 'Post or review comments and effort logs here.', 'top'),
    ],
  },

  'master-create-dialog': {
    title: 'Quick Create Guide',
    steps: [
      S('mcd-title', 'Quick create', 'Add a new master directly from the task form without opening the Masters page.'),
      S('mcd-fields', 'Fields', 'Fill in the name and required fields.', 'top'),
      S('mcd-save', 'Save', 'Save will create the new record and select it in the form.', 'left'),
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
