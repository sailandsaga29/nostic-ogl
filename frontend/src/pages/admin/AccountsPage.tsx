import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TableRefreshButton from '../../components/TableRefreshButton';
import { cachedGet } from '../../services/apiCache';
import type { AdminPageProps } from '../../types/adminPage';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

type MonthName = (typeof MONTH_NAMES)[number];
type PeriodMode = 'MONTH' | 'YEAR';

type Order = {
  id: number;
  status: string;
  total: number;
  createdAt: string;
};

type PartyOrder = {
  id: number;
  totalEarnings: number;
  createdAt: string;
};

type Expense = {
  id: number;
  amount: number;
  expenseDate?: string;
  createdAt?: string;
};

type MonthlyFlavorRow = {
  revenue?: number;
  quantity?: number;
};

const getMonthNumber = (monthName: MonthName) =>
  MONTH_NAMES.indexOf(monthName) + 1;

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const isFutureMonth = (year: number, monthNum: number) => {
  const now = new Date();
  return (
    year > now.getFullYear() ||
    (year === now.getFullYear() && monthNum > now.getMonth() + 1)
  );
};

const isCurrentMonth = (year: number, monthNum: number) => {
  const now = new Date();
  return year === now.getFullYear() && monthNum === now.getMonth() + 1;
};

const parseDate = (raw?: string) => {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const inMonth = (raw: string | undefined, year: number, monthNum: number) => {
  const date = parseDate(raw);
  if (!date) return false;
  return date.getFullYear() === year && date.getMonth() + 1 === monthNum;
};

const inYear = (raw: string | undefined, year: number) => {
  const date = parseDate(raw);
  if (!date) return false;
  return date.getFullYear() === year;
};

const sumPartyEarnings = (list: PartyOrder[]) =>
  list.reduce((sum, row) => sum + Number(row.totalEarnings ?? 0), 0);

const sumProcurement = (rows: MonthlyFlavorRow[]) =>
  rows.reduce((sum, row) => sum + Number(row.revenue ?? 0), 0);

export default function AccountsPage({ isActive = true }: AdminPageProps) {
  const hasLoadedRef = useRef(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [partyOrders, setPartyOrders] = useState<PartyOrder[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [procurementRows, setProcurementRows] = useState<MonthlyFlavorRow[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [tableRefreshing, setTableRefreshing] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('MONTH');
  const [selectedMonth, setSelectedMonth] = useState<MonthName>(
    () => MONTH_NAMES[new Date().getMonth()],
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [availableYears, setAvailableYears] = useState<number[]>([
    new Date().getFullYear(),
  ]);

  const selectedMonthNum = getMonthNumber(selectedMonth);
  const selectedIsFutureMonth = isFutureMonth(selectedYear, selectedMonthNum);

  const loadProcurementForMonth = useCallback(
    async (year: number, monthNum: number) => {
      if (isFutureMonth(year, monthNum)) {
        return [] as MonthlyFlavorRow[];
      }
      const response = await cachedGet<{ total: number; units: number }>(
        `/flavors/procurement/${year}/${monthNum}`,
        { ttl: 120_000 },
      );
      return [
        {
          revenue: Number(response.total ?? 0),
          quantity: Number(response.units ?? 0),
        },
      ];
    },
    [],
  );

  const loadProcurementForYear = useCallback(async (year: number) => {
    try {
      const response = await cachedGet<{ total: number; units: number }>(
        `/flavors/procurement/${year}`,
        { ttl: 120_000 },
      );
      return [
        {
          revenue: Number(response.total ?? 0),
          quantity: Number(response.units ?? 0),
        },
      ];
    } catch {
      return [] as MonthlyFlavorRow[];
    }
  }, []);

  const loadAccountsData = useCallback(
    async (options?: { refresh?: boolean }) => {
      const isRefresh = options?.refresh === true;
      try {
        if (isRefresh) {
          setTableRefreshing(true);
        } else {
          setLoading(true);
        }

        const [ordersRes, partyRes, expensesRes, yearsRes] = await Promise.all([
          cachedGet<Order[]>('/orders', { force: isRefresh }),
          cachedGet<PartyOrder[]>('/party-orders', { force: isRefresh }),
          cachedGet<Expense[]>('/expenses', { force: isRefresh }),
          cachedGet<number[]>('/flavors/meta/years', {
            ttl: 300_000,
            force: isRefresh,
          }),
        ]);

        setOrders(Array.isArray(ordersRes) ? ordersRes : []);
        setPartyOrders(Array.isArray(partyRes) ? partyRes : []);
        setExpenses(Array.isArray(expensesRes) ? expensesRes : []);

        const years: number[] = Array.isArray(yearsRes)
          ? yearsRes.map((y: number | string) => Number(y))
          : [];
        const yearList =
          years.length > 0 ? years : [new Date().getFullYear()];
        setAvailableYears(yearList);
      } catch {
        setOrders([]);
        setPartyOrders([]);
        setExpenses([]);
      } finally {
        if (isRefresh) {
          setTableRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (!isActive || hasLoadedRef.current) {
      return;
    }

    void loadAccountsData().then(() => {
      hasLoadedRef.current = true;
    });
  }, [isActive, loadAccountsData]);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    let mounted = true;

    const loadProcurement = async () => {
      try {
        const rows =
          periodMode === 'MONTH'
            ? await loadProcurementForMonth(selectedYear, selectedMonthNum)
            : await loadProcurementForYear(selectedYear);
        if (mounted) {
          setProcurementRows(rows);
        }
      } catch {
        if (mounted) {
          setProcurementRows([]);
        }
      }
    };

    void loadProcurement();

    return () => {
      mounted = false;
    };
  }, [
    periodMode,
    selectedYear,
    selectedMonthNum,
    loadProcurementForMonth,
    loadProcurementForYear,
  ]);

  const report = useMemo(() => {
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED');

    const retailOrdersInPeriod =
      periodMode === 'MONTH'
        ? completedOrders.filter((o) =>
            inMonth(o.createdAt, selectedYear, selectedMonthNum),
          )
        : completedOrders.filter((o) => inYear(o.createdAt, selectedYear));

    const partyInPeriod =
      periodMode === 'MONTH'
        ? partyOrders.filter((p) =>
            inMonth(p.createdAt, selectedYear, selectedMonthNum),
          )
        : partyOrders.filter((p) => inYear(p.createdAt, selectedYear));

    const expensesInPeriod =
      periodMode === 'MONTH'
        ? expenses.filter((row) =>
            inMonth(row.expenseDate ?? row.createdAt, selectedYear, selectedMonthNum),
          )
        : expenses.filter((row) =>
            inYear(row.expenseDate ?? row.createdAt, selectedYear),
          );

    const retailRevenue = retailOrdersInPeriod.reduce(
      (sum, order) => sum + Number(order.total ?? 0),
      0,
    );
    const partyRevenue = sumPartyEarnings(partyInPeriod);
    const totalRevenue = retailRevenue + partyRevenue;
    const procurementCost = sumProcurement(procurementRows);
    const operatingExpenses = expensesInPeriod.reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );
    const grossProfit = totalRevenue - procurementCost;
    const netProfit = totalRevenue - procurementCost - operatingExpenses;
    const marginPct =
      totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    return {
      retailRevenue,
      partyRevenue,
      totalRevenue,
      procurementCost,
      operatingExpenses,
      grossProfit,
      netProfit,
      marginPct,
      completedOrders: retailOrdersInPeriod.length + partyInPeriod.length,
      expenseCount: expensesInPeriod.length,
      unitsProcured: procurementRows.reduce(
        (sum, row) => sum + Number(row.quantity ?? 0),
        0,
      ),
    };
  }, [
    orders,
    partyOrders,
    expenses,
    procurementRows,
    periodMode,
    selectedYear,
    selectedMonthNum,
  ]);

  const periodLabel =
    periodMode === 'MONTH'
      ? `${selectedMonth} ${selectedYear}`
      : `${selectedYear}`;

  const plRows = [
    {
      label: 'Retail sales',
      value: report.retailRevenue,
      tone: 'neutral' as const,
    },
    {
      label: 'Bulk / party earnings',
      value: report.partyRevenue,
      tone: 'neutral' as const,
    },
    {
      label: 'Total revenue',
      value: report.totalRevenue,
      tone: 'highlight' as const,
    },
    {
      label: 'Stock procurement (COGS)',
      value: -report.procurementCost,
      tone: 'cost' as const,
    },
    {
      label: 'Gross profit',
      value: report.grossProfit,
      tone: 'subtotal' as const,
    },
    {
      label: 'Operating expenses',
      value: -report.operatingExpenses,
      tone: 'cost' as const,
    },
    {
      label: 'Net profit / (loss)',
      value: report.netProfit,
      tone: 'total' as const,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center px-4 py-24 text-slate-600">
        Loading accounts…
      </div>
    );
  }

  return (
    <div className="bg-[#fafafa]">
      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
        <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Accounts
              </p>
              <h1 className="text-xl font-bold text-[#0ea5b7] sm:text-2xl">
                Profit &amp; Loss
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {periodLabel}
                {periodMode === 'MONTH' && isCurrentMonth(selectedYear, selectedMonthNum)
                  ? ' (current month)'
                  : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="inline-flex rounded-xl bg-gray-50 p-1 ring-1 ring-gray-100">
                {(['MONTH', 'YEAR'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPeriodMode(mode)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      periodMode === mode
                        ? 'bg-teal-500 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {mode === 'MONTH' ? 'Monthly' : 'Yearly'}
                  </button>
                ))}
              </div>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="min-w-[5.5rem] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-teal-400 focus:bg-white"
                aria-label="Filter by year"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>

              <TableRefreshButton
                loading={tableRefreshing}
                onRefresh={() => void loadAccountsData({ refresh: true })}
                label="Refresh accounts data"
              />
            </div>
          </div>

          {periodMode === 'MONTH' && (
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Month
              </p>
              <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-1.5">
                  {MONTH_NAMES.map((month, index) => {
                    const active = selectedMonth === month;
                    const isNow = isCurrentMonth(
                      selectedYear,
                      getMonthNumber(month),
                    );

                    return (
                      <button
                        key={month}
                        type="button"
                        title={isNow ? `${month} (current month)` : month}
                        onClick={() => setSelectedMonth(month)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition sm:px-3 sm:py-1.5 ${
                          active
                            ? 'border-teal-500 bg-teal-500 text-white'
                            : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-teal-400 hover:bg-white'
                        }`}
                      >
                        {MONTH_ABBR[index]}
                        {isNow && (
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                              active ? 'bg-white' : 'bg-teal-500'
                            }`}
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {periodMode === 'MONTH' && selectedIsFutureMonth ? (
          <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No P&amp;L data for a future month yet.
          </div>
        ) : null}

        <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Revenue
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-900">
              {formatCurrency(report.totalRevenue)}
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              {report.completedOrders} completed orders
            </p>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
              Costs
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-900">
              {formatCurrency(report.procurementCost + report.operatingExpenses)}
            </p>
            <p className="mt-1 text-xs text-amber-800">
              Stock {formatCurrency(report.procurementCost)} · Expenses{' '}
              {formatCurrency(report.operatingExpenses)}
            </p>
          </div>

          <div
            className={`rounded-2xl border p-4 ${
              report.netProfit >= 0
                ? 'border-teal-100 bg-teal-50'
                : 'border-red-100 bg-red-50'
            }`}
          >
            <p
              className={`text-xs font-semibold uppercase tracking-wide ${
                report.netProfit >= 0 ? 'text-teal-800' : 'text-red-800'
              }`}
            >
              Net P&amp;L
            </p>
            <p
              className={`mt-2 text-2xl font-bold ${
                report.netProfit >= 0 ? 'text-teal-900' : 'text-red-900'
              }`}
            >
              {report.netProfit >= 0 ? '+' : ''}
              {formatCurrency(report.netProfit)}
            </p>
            <p
              className={`mt-1 text-xs ${
                report.netProfit >= 0 ? 'text-teal-800' : 'text-red-800'
              }`}
            >
              {report.marginPct}% margin on revenue
            </p>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Procurement
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {report.unitsProcured} units
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {report.expenseCount} expense entries in period
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Statement — {periodLabel}
              </p>
              <p className="text-xs text-gray-500">
                Completed retail + bulk earnings vs stock-in and expenses
              </p>
            </div>
          </div>

          <div className="overflow-x-auto p-4 sm:p-6">
            <table
              className="min-w-full divide-y divide-gray-200"
              aria-label="Profit and loss statement"
            >
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-600"
                  >
                    Line item
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-600"
                  >
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {plRows.map((row) => {
                  const isTotal = row.tone === 'total';
                  const isHighlight =
                    row.tone === 'highlight' || row.tone === 'subtotal';

                  return (
                    <tr
                      key={row.label}
                      className={
                        isTotal
                          ? report.netProfit >= 0
                            ? 'bg-teal-50/70'
                            : 'bg-red-50/70'
                          : isHighlight
                            ? 'bg-slate-50/80'
                            : undefined
                      }
                    >
                      <td
                        className={`px-4 py-3 text-sm ${
                          isTotal || isHighlight
                            ? 'font-semibold text-gray-900'
                            : 'text-gray-700'
                        }`}
                      >
                        {row.label}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-sm font-semibold ${
                          row.value < 0
                            ? 'text-red-700'
                            : isTotal
                              ? report.netProfit >= 0
                                ? 'text-teal-800'
                                : 'text-red-800'
                              : 'text-gray-900'
                        }`}
                      >
                        {row.value < 0
                          ? `(${formatCurrency(Math.abs(row.value))})`
                          : formatCurrency(row.value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
