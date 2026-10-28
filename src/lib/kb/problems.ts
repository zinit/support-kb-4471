// What #4471 holds, problem by problem. causes.ts says which date-order bug a report belongs to;
// this file adds the reports that are not a date-order bug at all.
import { causeOf, uniqueById, type Report, type Tenant } from '#lib/kb/causes';

// `shift`: the date moves by one day (a weekday off, a different day per time zone). Swapping day
// and month cannot do that, so it needs its own fix. The desk found these by reading
// (desk-notes.json `oneDayMove`) and still files them by tenant, so its view counts them under their
// cause as well: they are a problem of their own, and also part of that cause's count.
export type Problem = 'parser' | 'hint' | 'shift' | 'unplaced';

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // For `shift`: the cause the desk also counts these reports under, cause → count.
  alsoIn: Partial<Record<Problem, number>>;
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

function group(problem: Problem, rs: Report[], alsoIn: ProblemGroup['alsoIn'] = {}): ProblemGroup {
  const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
  return {
    problem,
    reports: rs,
    alsoIn,
    tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
    channels: rs.reduce<Record<string, number>>((n, r) => ({ ...n, [r.channel]: (n[r.channel] ?? 0) + 1 }), {}),
    firstSeen: days[0],
    lastSeen: days[days.length - 1],
  };
}

export function splitTicket(
  all: Report[],
  ticket: number,
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): { rows: number; merged: Report[]; groups: ProblemGroup[] } {
  const merged = uniqueById(all).filter((r) => r.mergedInto === ticket);
  const cause = (r: Report): Problem => causeOf(r, tenantOf(r)) ?? 'unplaced';
  const by = new Map<Problem, Report[]>();
  for (const r of merged) by.set(cause(r), [...(by.get(cause(r)) ?? []), r]);
  const groups = [...by.entries()].map(([p, rs]) => group(p, rs)).sort((a, b) => b.reports.length - a.reports.length);

  const shifted = merged.filter((r) => oneDayMove.includes(r.id));
  if (shifted.length) {
    const alsoIn = shifted.reduce<ProblemGroup['alsoIn']>((n, r) => ({ ...n, [cause(r)]: (n[cause(r)] ?? 0) + 1 }), {});
    groups.push(group('shift', shifted, alsoIn));
  }
  return { rows: all.filter((r) => r.mergedInto === ticket).length, merged, groups };
}

// Reports whose intake tag names a different cause than the one they belong to.
export function tagMisses(groups: ProblemGroup[]): number {
  return groups
    .filter((g) => g.problem !== 'shift')
    .reduce((n, g) => n + g.reports.filter((r) => r.meta.intakeTag !== g.problem).length, 0);
}
