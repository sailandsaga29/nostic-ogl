import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import RevenueMilestoneCelebration from '../../components/RevenueMilestoneCelebration';
import { getLoginDashboardQuote } from '../../utils/dashboardQuotes';
import {
  acknowledgeRevenueMilestone,
  consumeLoginRevenueCelebrationCheck,
  shouldShowRevenueCelebration,
} from '../../utils/revenueMilestone';

type Order = {
  id: number;
  status: string;
  paymentMethod?: 'CASH' | 'ONLINE';
  total: number;
  createdAt: string;
  items?: { quantity: number; flavor?: { name?: string } }[];
};

type LowStockFlavor = {
  id: number;
  name?: string;
  stock?: number;
  minStock?: number;
};

type MonthlyFlavor = {
  quantity: number;
  revenue: number;
  isActive?: boolean;
};

type ExpenseRow = {
  amount: number;
  expenseDate?: string;
  createdAt?: string;
};

type PartyOrder = {
  id: number;
  partyName: string;
  totalAmount: number;
  discountPercent: number;
  amountAfterDiscount: number;
  totalEarnings: number;
  paymentMethod?: 'CASH' | 'ONLINE';
  note?: string;
  createdAt: string;
};

const sumPartyEarnings = (list: PartyOrder[]) =>
  list.reduce((s, p) => s + Number(p.totalEarnings ?? 0), 0);

const isSameYear = (dateStr: string, year: number) => {
  const date = new Date(dateStr);
  return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
};

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatDelta = (current: number, previous: number) => {
  if (previous === 0) {
    return current > 0 ? '+100%' : '—';
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return 'Same as yesterday';
  return `${pct > 0 ? '+' : ''}${pct}% vs yesterday`;
};

const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const isSameMonth = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [partyOrders, setPartyOrders] = useState<PartyOrder[]>([]);
  const [lowStock, setLowStock] = useState<LowStockFlavor[]>([]);
  const [monthlyFlavors, setMonthlyFlavors] = useState<MonthlyFlavor[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [totalProcurementAllTime, setTotalProcurementAllTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showRevenueCelebration, setShowRevenueCelebration] = useState(false);
  const [quote] = useState(getLoginDashboardQuote);
  const hasLoadedDataRef = useRef(false);
  const isDashboardActive = location.pathname === '/admin/dashboard';

  const monthLabel = new Date().toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const loadDashboardData = useCallback(async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const loadProcurementAllTime = async () => {
      try {
        const yearsRes = await api.get('/flavors/meta/years');
        const years: number[] = Array.isArray(yearsRes.data)
          ? yearsRes.data
          : [];

        let procurementTotal = 0;
        for (const y of years) {
          const monthsRes = await api.get(`/flavors/meta/months/${y}`);
          const months: number[] = Array.isArray(monthsRes.data)
            ? monthsRes.data
            : [];
          const monthlyResults = await Promise.all(
            months.map((m) => api.get(`/flavors/monthly/${y}/${m}`)),
          );
          for (const res of monthlyResults) {
            const rows: MonthlyFlavor[] = Array.isArray(res.data)
              ? res.data
              : [];
            procurementTotal += rows.reduce(
              (sum, row) => sum + Number(row.revenue ?? 0),
              0,
            );
          }
        }
        return procurementTotal;
      } catch {
        return 0;
      }
    };

    const [ordersRes, partyRes, lowStockRes, monthlyRes, expensesRes, procurementTotal] =
      await Promise.all([
        api.get('/orders'),
        api.get('/party-orders'),
        api.get('/flavors/low-stock'),
        api.get(`/flavors/monthly/${year}/${month}`),
        api.get('/expenses'),
        loadProcurementAllTime(),
      ]);

    setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
    setPartyOrders(Array.isArray(partyRes.data) ? partyRes.data : []);
    setLowStock(Array.isArray(lowStockRes.data) ? lowStockRes.data : []);
    setMonthlyFlavors(
      Array.isArray(monthlyRes.data) ? monthlyRes.data : [],
    );
    setExpenses(
      Array.isArray(expensesRes.data) ? expensesRes.data : [],
    );
    setTotalProcurementAllTime(procurementTotal);
  }, []);

  useEffect(() => {
    if (!isDashboardActive || authLoading || !isAuthenticated) {
      return;
    }

    if (!localStorage.getItem('accessToken')) {
      return;
    }

    let mounted = true;
    const isSilentRefresh = hasLoadedDataRef.current;

    if (!isSilentRefresh) {
      setLoading(true);
    }

    void (async () => {
      try {
        await loadDashboardData();
        if (mounted) {
          hasLoadedDataRef.current = true;
        }
      } catch {
        if (mounted && !hasLoadedDataRef.current) {
          setOrders([]);
          setPartyOrders([]);
          setLowStock([]);
          setMonthlyFlavors([]);
          setExpenses([]);
          setTotalProcurementAllTime(0);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [
    isDashboardActive,
    authLoading,
    isAuthenticated,
    loadDashboardData,
  ]);

  useEffect(() => {
    if (!isDashboardActive || authLoading || !isAuthenticated) {
      return;
    }
    if (!localStorage.getItem('accessToken')) {
      return;
    }

    const refreshSilently = () => {
      void loadDashboardData()
        .then(() => {
          hasLoadedDataRef.current = true;
        })
        .catch(() => {});
    };

    const intervalId = window.setInterval(refreshSilently, 45_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSilently();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isDashboardActive, authLoading, isAuthenticated, loadDashboardData]);

  const insights = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const completed = orders.filter((o) => o.status === 'COMPLETED');
    const todayCompleted = completed.filter((o) =>
      isSameDay(new Date(o.createdAt), now),
    );
    const yesterdayCompleted = completed.filter((o) =>
      isSameDay(new Date(o.createdAt), yesterday),
    );

    const partyToday = partyOrders.filter((p) =>
      isSameDay(new Date(p.createdAt), now),
    );
    const partyYesterday = partyOrders.filter((p) =>
      isSameDay(new Date(p.createdAt), yesterday),
    );
    const partyMonth = partyOrders.filter((p) =>
      isSameMonth(new Date(p.createdAt), now),
    );

    const retailTodayRevenue = todayCompleted.reduce(
      (s, o) => s + Number(o.total ?? 0),
      0,
    );
    const retailYesterdayRevenue = yesterdayCompleted.reduce(
      (s, o) => s + Number(o.total ?? 0),
      0,
    );
    const partyTodayEarnings = sumPartyEarnings(partyToday);
    const partyYesterdayEarnings = sumPartyEarnings(partyYesterday);
    const todayRevenue = retailTodayRevenue + partyTodayEarnings;
    const yesterdayRevenue = retailYesterdayRevenue + partyYesterdayEarnings;

    const monthCompleted = completed.filter((o) =>
      isSameMonth(new Date(o.createdAt), now),
    );
    const retailMonthSales = monthCompleted.reduce(
      (s, o) => s + Number(o.total ?? 0),
      0,
    );
    const monthSales =
      retailMonthSales + sumPartyEarnings(partyMonth);
    const monthProcurement = monthlyFlavors.reduce(
      (s, f) => s + Number(f.revenue ?? 0),
      0,
    );

    const pendingOnline = orders.filter(
      (o) => o.status === 'PENDING' && o.paymentMethod === 'ONLINE',
    );
    const pendingCash = orders.filter(
      (o) => o.status === 'PENDING' && o.paymentMethod !== 'ONLINE',
    );

    const todayOrders = orders.filter((o) =>
      isSameDay(new Date(o.createdAt), now),
    );
    // Match staff Shift Orders: payment split counts all orders in today's range
    const todayRangeCount = todayOrders.length + partyToday.length;
    const todayOnline =
      todayOrders.filter((o) => o.paymentMethod === 'ONLINE').length +
      partyToday.filter((p) => p.paymentMethod === 'ONLINE').length;
    const todayCash = todayRangeCount - todayOnline;

    const allTimeFlavorCounts = new Map<string, number>();
    for (const order of completed) {
      for (const item of order.items ?? []) {
        const name = item.flavor?.name ?? 'Unknown';
        allTimeFlavorCounts.set(
          name,
          (allTimeFlavorCounts.get(name) ?? 0) + Number(item.quantity ?? 0),
        );
      }
    }
    const topBestsellers = [...allTimeFlavorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const retailRevenueSoFar = completed.reduce(
      (s, o) => s + Number(o.total ?? 0),
      0,
    );
    const partyRevenueSoFar = sumPartyEarnings(partyOrders);
    const totalRevenueSoFar = retailRevenueSoFar + partyRevenueSoFar;

    const totalExpenses = expenses.reduce(
      (sum, row) => sum + Number(row.amount ?? 0),
      0,
    );

    const calendarYear = now.getFullYear();
    const yearCompleted = completed.filter((o) =>
      isSameYear(o.createdAt, calendarYear),
    );
    const partyYear = partyOrders.filter((p) =>
      isSameYear(p.createdAt, calendarYear),
    );
    const yearRevenue =
      yearCompleted.reduce((s, o) => s + Number(o.total ?? 0), 0) +
      sumPartyEarnings(partyYear);
    const yearExpenses = expenses
      .filter((row) => {
        const raw = row.expenseDate ?? row.createdAt;
        return raw ? isSameYear(raw, calendarYear) : false;
      })
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const yearNet = yearRevenue - yearExpenses;

    const totalInvestment = totalProcurementAllTime + totalExpenses;
    const netAllTime = totalRevenueSoFar - totalInvestment;

    const attentionCount =
      pendingOnline.length + pendingCash.length + lowStock.length;

    const inactiveFlavors = monthlyFlavors.filter((f) => f.isActive === false)
      .length;

    const unitsProcured = monthlyFlavors.reduce(
      (s, f) => s + Number(f.quantity ?? 0),
      0,
    );

    return {
      todayRevenue,
      revenueDelta: formatDelta(todayRevenue, yesterdayRevenue),
      todayOrderCount: todayOrders.length,
      pendingOnline,
      pendingCash,
      lowStock,
      monthSales,
      monthProcurement,
      monthLabel,
      todayOnline,
      todayCash,
      todayCompletedCount:
        todayCompleted.length + partyToday.length,
      topBestsellers,
      totalRevenueSoFar,
      totalInvestment,
      totalExpenses,
      totalProcurementAllTime,
      netAllTime,
      calendarYear: now.getFullYear(),
      yearRevenue,
      yearExpenses,
      yearNet,
      yearCompletedCount: yearCompleted.length + partyYear.length,
      attentionCount,
      totalCompletedOrders: completed.length + partyOrders.length,
      inactiveFlavors,
      unitsProcured,
    };
  }, [
    orders,
    partyOrders,
    lowStock,
    monthlyFlavors,
    monthLabel,
    expenses,
    totalProcurementAllTime,
  ]);

  useEffect(() => {
    if (loading) return;
    if (!consumeLoginRevenueCelebrationCheck()) return;
    if (shouldShowRevenueCelebration(insights.totalRevenueSoFar)) {
      setShowRevenueCelebration(true);
    }
  }, [loading, insights.totalRevenueSoFar]);

  const handleCelebrationAcknowledge = () => {
    acknowledgeRevenueMilestone();
    setShowRevenueCelebration(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center px-4 py-24 text-slate-600">
        Loading dashboard…
      </div>
    );
  }

  const paymentTotal = insights.todayOnline + insights.todayCash;
  const onlinePct =
    paymentTotal > 0
      ? Math.round((insights.todayOnline / paymentTotal) * 100)
      : 0;

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br to-indigo-50 text-gray-800">
      {showRevenueCelebration && (
        <RevenueMilestoneCelebration
          totalRevenue={insights.totalRevenueSoFar}
          onAcknowledge={handleCelebrationAcknowledge}
        />
      )}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-gradient-to-r from-[#00a8c5] to-[#63d471] p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
          <blockquote className="mt-4 max-w-3xl border-none p-0">
            <p className="text-2xl font-semibold leading-snug text-white sm:text-3xl">
              &ldquo;{quote}&rdquo;
            </p>
          </blockquote>
          <p className="mt-4 text-sm text-white/75 italic">
            — fresh wisdom, served every login 🍦
          </p>
        </div>

        {/* KPI row — comparative / cross-cutting only */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Today&apos;s sales
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatCurrency(insights.todayRevenue)}
            </p>
            <p className="mt-1 text-sm text-emerald-600">
              {insights.revenueDelta}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              {insights.todayCompletedCount} completed (retail + bulk) ·{' '}
              {insights.todayOrderCount} retail today
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {insights.monthLabel} — sales vs investment
            </p>
            <p className="mt-2 text-3xl font-bold text-pink-600">
              {formatCurrency(insights.monthSales)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              vs {formatCurrency(insights.monthProcurement)} invested (
              {insights.unitsProcured} units stocked)
            </p>
          </div>
      
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {insights.calendarYear} — sales vs investment
            </p>
            <p className="mt-2 text-3xl font-bold text-teal-700">
              {formatCurrency(insights.yearRevenue)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              vs {formatCurrency(insights.yearExpenses)} expenses this year
            </p>
            <p className="mt-2 text-xs text-slate-500">
              <span
                className={
                  insights.yearNet >= 0
                    ? 'font-semibold text-emerald-600'
                    : 'font-semibold text-red-600'
                }
              >
                {insights.yearNet >= 0 ? '+' : ''}
                {formatCurrency(insights.yearNet)} net
              </span>
              {' · '}
              {insights.yearCompletedCount} orders in {insights.calendarYear}
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              All time — sales vs investment
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatCurrency(insights.totalRevenueSoFar)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              vs {formatCurrency(insights.totalInvestment)} invested (
              {formatCurrency(insights.totalProcurementAllTime)} stock-in ·{' '}
              {formatCurrency(insights.totalExpenses)} expenses)
            </p>
            <p className="mt-2 text-xs text-slate-500">
              <span
                className={
                  insights.netAllTime >= 0
                    ? 'font-semibold text-emerald-600'
                    : 'font-semibold text-red-600'
                }
              >
                {insights.netAllTime >= 0 ? '+' : ''}
                {formatCurrency(insights.netAllTime)} net
              </span>
              {' · '}
              {insights.totalCompletedOrders} orders (retail + bulk)
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          {/* Operational insights — not on other admin pages */}
          <section className="rounded-[2rem] bg-white p-6 shadow-sm lg:col-span-3">
            <h2 className="text-lg font-semibold text-slate-900">
              Operational insights
            </h2>
          

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Payment mix (today&apos;s orders)
                </p>
                <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="bg-blue-500 transition-all"
                    style={{ width: `${onlinePct}%` }}
                  />
                  <div
                    className="bg-amber-400 transition-all"
                    style={{ width: `${100 - onlinePct}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-600">
                  <span>Online {insights.todayOnline}</span>
                  <span>Cash {insights.todayCash}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Bestsellers
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Top 5 · all completed retail orders
                </p>
                {insights.topBestsellers.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No sales yet</p>
                ) : (
                  <ol className="mt-3 space-y-2">
                    {insights.topBestsellers.map(([name, units], index) => (
                      <li
                        key={name}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="min-w-0 truncate font-medium text-slate-800">
                          <span className="mr-1.5 font-bold text-teal-600">
                            {index + 1}.
                          </span>
                          {name}
                        </span>
                        <span className="shrink-0 font-semibold text-slate-600">
                          {units} units
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Catalog health
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {insights.inactiveFlavors} inactive
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Flavors hidden from POS this month
                </p>
              </div>

              {/* <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Month procurement
                </p>
                <p className="mt-2 text-xl font-bold text-teal-700">
                  {formatCurrency(insights.monthProcurement)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Stock-in value — see line items on Flavors
                </p>
              </div> */}
            </div>
          </section>

          {/* Action queue — summary only, links to detail pages */}
          <section className="rounded-[2rem] bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Attention Queue
            </h2>
            {insights.attentionCount > 0 ? (
              <p className="mt-1 text-sm font-medium text-red-600">
                <span className="font-bold">{insights.attentionCount}</span> need
                attention · {insights.pendingOnline.length} online pending ·{' '}
                {insights.pendingCash.length} cash pending ·{' '}
                {insights.lowStock.length} low stock
              </p>
            ) : (
              <p className="mt-1 text-sm font-medium text-emerald-600">
                Nothing urgent — you&apos;re all caught up.
              </p>
            )}
           

            <div className="mt-5 space-y-4">
              {insights.pendingOnline.length > 0 && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Online payments awaiting completion
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-800">
                    {insights.pendingOnline.slice(0, 3).map((o) => (
                      <li key={o.id}>
                        #{o.id} · {formatCurrency(o.total)}
                      </li>
                    ))}
                  </ul>
                  {insights.pendingOnline.length > 3 && (
                    <p className="mt-1 text-xs text-amber-700">
                      +{insights.pendingOnline.length - 3} more
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate('/admin/orders')}
                    className="mt-3 text-sm font-semibold text-amber-900 underline"
                  >
                    Review Orders →
                  </button>
                </div>
              )}

              {insights.lowStock.length > 0 ? (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-900">
                    Restock soon
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-red-800">
                    {insights.lowStock.slice(0, 4).map((f) => (
                      <li key={f.id}>
                        {f.name} — {f.stock ?? 0} left
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/flavors')}
                    className="mt-3 text-sm font-semibold text-red-900 underline"
                  >
                    Open →
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                  All flavors above minimum stock levels.
                </div>
              )}

              {insights.pendingCash.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">
                    {insights.pendingCash.length} cash order
                    {insights.pendingCash.length !== 1 ? 's' : ''} pending
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/orders')}
                    className="mt-2 text-sm font-semibold text-teal-700 underline"
                  >
                    View orders →
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Quick navigation — no duplicate data */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              title: 'Flavors',
              desc: 'Monthly stock-in, carry forward & pricing',
              path: '/admin/flavors',
              icon: '🍨',
              color: 'bg-yellow-100',
            },
            {
              title: 'Expenses',
              desc: 'Shop expenses, amounts & SPOC tracking',
              path: '/admin/inventory',
              icon: '💰',
              color: 'bg-orange-100',
            },
            {
              title: 'Orders',
              desc: 'Full order history and payment status',
              path: '/admin/orders',
              icon: '🛒',
              color: 'bg-purple-100',
            },
            {
              title: 'Profile',
              desc: 'Account settings and role',
              path: '/admin/profile',
              icon: '👤',
              color: 'bg-cyan-100',
            },
          ].map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md"
            >
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${item.color}`}
              >
                {item.icon}
              </div>
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{item.desc}</p>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
