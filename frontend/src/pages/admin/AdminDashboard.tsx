import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../components/Layout/Header';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getLoginDashboardQuote } from '../../utils/dashboardQuotes';

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
  const isActive = location.pathname === '/admin/dashboard';

  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStock, setLowStock] = useState<LowStockFlavor[]>([]);
  const [monthlyFlavors, setMonthlyFlavors] = useState<MonthlyFlavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [quote] = useState(getLoginDashboardQuote);

  const now = useMemo(() => new Date(), []);
  const monthLabel = now.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const loadDashboardData = useCallback(async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const [ordersRes, lowStockRes, monthlyRes] = await Promise.all([
      api.get('/orders'),
      api.get('/flavors/low-stock'),
      api.get(`/flavors/monthly/${year}/${month}`),
    ]);

    setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
    setLowStock(Array.isArray(lowStockRes.data) ? lowStockRes.data : []);
    setMonthlyFlavors(
      Array.isArray(monthlyRes.data) ? monthlyRes.data : [],
    );
  }, []);

  useEffect(() => {
    if (!isActive || authLoading || !isAuthenticated) {
      return;
    }

    if (!localStorage.getItem('accessToken')) {
      return;
    }

    let mounted = true;
    setLoading(true);

    void (async () => {
      try {
        await loadDashboardData();
      } catch {
        if (mounted) {
          setOrders([]);
          setLowStock([]);
          setMonthlyFlavors([]);
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
  }, [isActive, authLoading, isAuthenticated, loadDashboardData]);

  const insights = useMemo(() => {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const completed = orders.filter((o) => o.status === 'COMPLETED');
    const todayCompleted = completed.filter((o) =>
      isSameDay(new Date(o.createdAt), now),
    );
    const yesterdayCompleted = completed.filter((o) =>
      isSameDay(new Date(o.createdAt), yesterday),
    );

    const todayRevenue = todayCompleted.reduce(
      (s, o) => s + Number(o.total ?? 0),
      0,
    );
    const yesterdayRevenue = yesterdayCompleted.reduce(
      (s, o) => s + Number(o.total ?? 0),
      0,
    );

    const monthCompleted = completed.filter((o) =>
      isSameMonth(new Date(o.createdAt), now),
    );
    const monthSales = monthCompleted.reduce(
      (s, o) => s + Number(o.total ?? 0),
      0,
    );
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
    const todayOnline = todayCompleted.filter(
      (o) => o.paymentMethod === 'ONLINE',
    ).length;
    const todayCash = todayCompleted.length - todayOnline;

    const flavorCounts = new Map<string, number>();
    for (const order of todayCompleted) {
      for (const item of order.items ?? []) {
        const name = item.flavor?.name ?? 'Unknown';
        flavorCounts.set(
          name,
          (flavorCounts.get(name) ?? 0) + Number(item.quantity ?? 0),
        );
      }
    }
    const topToday = [...flavorCounts.entries()].sort((a, b) => b[1] - a[1])[0];

    const totalRevenueSoFar = completed.reduce(
      (s, o) => s + Number(o.total ?? 0),
      0,
    );

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
      todayCompletedCount: todayCompleted.length,
      topToday,
      totalRevenueSoFar,
      totalCompletedOrders: completed.length,
      inactiveFlavors,
      unitsProcured,
    };
  }, [orders, lowStock, monthlyFlavors, monthLabel, now]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br to-indigo-50">
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
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-gradient-to-r from-[#00a8c5] to-[#63d471] p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">
            {now.toLocaleDateString('en-IN', {
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
              {insights.todayCompletedCount} completed ·{' '}
              {insights.todayOrderCount} total today
            </p>
          </div>

    



          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {insights.monthLabel} — sales vs procurement
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
              Total revenue so far
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {formatCurrency(insights.totalRevenueSoFar)}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {insights.totalCompletedOrders} completed order
              {insights.totalCompletedOrders !== 1 ? 's' : ''} all time
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Needs attention
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {insights.pendingOnline.length +
                insights.pendingCash.length +
                insights.lowStock.length}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {insights.pendingOnline.length} online pending ·{' '}
              {insights.lowStock.length} low stock
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
                  Payment mix (completed today)
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
                  Best seller today
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {insights.topToday
                    ? insights.topToday[0]
                    : 'No sales yet'}
                </p>
                {insights.topToday && (
                  <p className="mt-1 text-sm text-slate-500">
                    {insights.topToday[1]} units sold
                  </p>
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

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-700">
                  Month procurement
                </p>
                <p className="mt-2 text-xl font-bold text-teal-700">
                  {formatCurrency(insights.monthProcurement)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Stock-in value — see line items on Flavors
                </p>
              </div>
            </div>
          </section>

          {/* Action queue — summary only, links to detail pages */}
          <section className="rounded-[2rem] bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Attention Queue
            </h2>
            <p className="text-sm text-slate-500">
              Open the full page for details.
            </p>

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
              title: 'Inventory',
              desc: 'Live stock levels across all items',
              path: '/admin/inventory',
              icon: '📦',
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
