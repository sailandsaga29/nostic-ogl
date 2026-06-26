export type HistoryRange = 'DAY' | 'MONTH' | 'YEAR';

export function getHistoryRangeParams(range: HistoryRange) {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  let from: Date;
  if (range === 'DAY') {
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
  } else if (range === 'MONTH') {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    from.setHours(0, 0, 0, 0);
  } else {
    from = new Date(now.getFullYear(), 0, 1);
    from.setHours(0, 0, 0, 0);
  }

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}
