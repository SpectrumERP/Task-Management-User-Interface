/**
 * Priority badge styles for dark SteelMont theme.
 * Maps by priority name first (WARM, MODERATE, …), then by priority_No.
 */

export type PriorityBadgeVariant = 'solid' | 'soft';

function normalizePriority(name?: string | null): string {
  return (name || '').trim().toLowerCase();
}

/** Rank hint: higher = more urgent */
export function getPriorityRank(priorityName?: string | null, priorityNo?: number | null): number {
  const n = normalizePriority(priorityName);
  if (/(urgent|critical|hot|immediate|p0)/.test(n)) return 4;
  if (/(high|warm|important|p1)/.test(n)) return 3;
  if (/(medium|moderate|normal|p2)/.test(n)) return 2;
  if (/(low|cold|minor|p3)/.test(n)) return 1;
  if (typeof priorityNo === 'number' && priorityNo > 0) return Math.min(4, priorityNo);
  return 0;
}

/**
 * Tailwind classes for priority pills.
 * - solid: list / detail badges
 * - soft: kanban / calendar chips
 */
export function getPriorityBadgeClass(
  priorityName?: string | null,
  priorityNo?: number | null,
  variant: PriorityBadgeVariant = 'solid'
): string {
  const rank = getPriorityRank(priorityName, priorityNo);

  if (variant === 'soft') {
    switch (rank) {
      case 4:
        return 'bg-red-500/15 text-red-400 border border-red-500/30';
      case 3:
        return 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30';
      case 2:
        return 'bg-[#0EA5E9]/15 text-[#38BDF8] border border-[#0EA5E9]/30';
      case 1:
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      default:
        return 'bg-[var(--tm-muted)] text-slate-300 border border-[var(--tm-border)]';
    }
  }

  switch (rank) {
    case 4:
      return 'bg-red-500 text-white shadow-[0_4px_12px_-4px_rgba(239,68,68,0.45)]';
    case 3:
      return 'bg-[#F59E0B] text-[#0B1220] shadow-[0_4px_12px_-4px_rgba(245,158,11,0.45)]';
    case 2:
      return 'bg-[#0EA5E9] text-[#0B1220] shadow-[0_4px_12px_-4px_rgba(14,165,233,0.45)]';
    case 1:
      return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
    default:
      return 'bg-[var(--tm-muted)] text-slate-300 border border-[var(--tm-border)]';
  }
}
