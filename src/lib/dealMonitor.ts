// Deal Monitor is a regular task under a fixed category, rendered via the same TaskForm
// with certain sections hidden. Any link/navigation into a Deal Monitor task's form must
// carry these params, or it opens as a plain task instead.
export const DEAL_MONITOR_TASK_URL_PARAMS = 'category=deal%20monitor&hideSections=timeline,business_benefit,checklist,execution_note,informto&isShowTopAdditionalFields=true';

export const isDealMonitorCategoryName = (categoryName?: string | null) =>
  categoryName?.toLowerCase() === 'deal monitor';

export const dealMonitorTaskUrl = (taskNo: number | string) => `/task/${taskNo}?${DEAL_MONITOR_TASK_URL_PARAMS}`;

export const taskUrl = (taskNo: number | string, categoryName?: string | null) =>
  isDealMonitorCategoryName(categoryName) ? dealMonitorTaskUrl(taskNo) : `/task/${taskNo}`;
