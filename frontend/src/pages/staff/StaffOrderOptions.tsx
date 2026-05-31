import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

type StaffOrder = {
  id: string;
  status: string;
  paymentMethod?: 'CASH' | 'ONLINE';
  total: number;
  note?: string;
  createdAt: string;
  items?: Array<{
    quantity: number;
    unitPrice?: number;
    flavor?: { name?: string };
  }>;
};

type HistoryRange = 'DAY' | 'MONTH' | 'YEAR';
type PaymentFilter = 'ALL' | 'CASH' | 'ONLINE';
type StatusFilter = 'ALL' | 'COMPLETED' | 'PENDING' | 'FAILED';

const statusStyles: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  PENDING: 'bg-amber-100 text-amber-800 ring-amber-200',
  PROCESSING: 'bg-sky-100 text-sky-700 ring-sky-200',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-200',
  REFUNDED: 'bg-violet-100 text-violet-700 ring-violet-200',
  FAILED: 'bg-red-100 text-red-700 ring-red-200',
};

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const formatRelativeTime = (createdAt: string) => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
};

export default function StaffOrderOptions() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [historyRange, setHistoryRange] = useState<HistoryRange>('DAY');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await api.get('/orders');
      setOrders(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const rangeOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      if (!order?.createdAt) return false;
      const date = new Date(order.createdAt);
      if (Number.isNaN(date.getTime())) return false;
      if (historyRange === 'DAY') {
        return date.toDateString() === now.toDateString();
      }
      if (historyRange === 'MONTH') {
        return (
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth()
        );
      }
      return date.getFullYear() === now.getFullYear();
    });
  }, [historyRange, orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return [...rangeOrders]
      .filter((order) => {
        if (paymentFilter !== 'ALL' && order.paymentMethod !== paymentFilter) {
          return false;
        }
        if (statusFilter !== 'ALL' && order.status !== statusFilter) {
          return false;
        }
        if (!query) return true;
        const itemsText = (order.items ?? [])
          .map((i) => i.flavor?.name ?? '')
          .join(' ')
          .toLowerCase();
        return (
          order.id.toLowerCase().includes(query) ||
          itemsText.includes(query) ||
          (order.note ?? '').toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [rangeOrders, paymentFilter, statusFilter, search]);

  const analytics = useMemo(() => {
    const completed = rangeOrders.filter((o) => o.status === 'COMPLETED');
    const pending = rangeOrders.filter((o) => o.status === 'PENDING');
    const failed = rangeOrders.filter(
      (o) => o.status === 'FAILED' || o.status === 'CANCELLED',
    );

    const revenue = completed.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const cashRevenue = completed
      .filter((o) => o.paymentMethod !== 'ONLINE')
      .reduce((s, o) => s + Number(o.total ?? 0), 0);
    const onlineRevenue = completed
      .filter((o) => o.paymentMethod === 'ONLINE')
      .reduce((s, o) => s + Number(o.total ?? 0), 0);

    const itemsSold = rangeOrders.reduce(
      (sum, order) =>
        sum +
        (order.items ?? []).reduce(
          (acc, item) => acc + Number(item.quantity ?? 0),
          0,
        ),
      0,
    );

    const flavorCounts = new Map<string, number>();
    for (const order of completed) {
      for (const item of order.items ?? []) {
        const name = item.flavor?.name ?? 'Unknown';
        flavorCounts.set(
          name,
          (flavorCounts.get(name) ?? 0) + Number(item.quantity ?? 0),
        );
      }
    }

    const topFlavors = [...flavorCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: 0,
      revenue: 0,
    }));

    for (const order of completed) {
      const hour = new Date(order.createdAt).getHours();
      hourlyBuckets[hour].count += 1;
      hourlyBuckets[hour].revenue += Number(order.total ?? 0);
    }

    const peakHour = hourlyBuckets.reduce((best, bucket) =>
      bucket.count > best.count ? bucket : best,
    );

    const orderCount = rangeOrders.length;
    const avgOrder = orderCount > 0 ? revenue / completed.length || 0 : 0;
    const avgItems =
      orderCount > 0 ? itemsSold / Math.max(completed.length, 1) : 0;

    return {
      orderCount,
      completedCount: completed.length,
      pendingCount: pending.length,
      failedCount: failed.length,
      revenue,
      cashRevenue,
      onlineRevenue,
      itemsSold,
      avgOrder,
      avgItems,
      topFlavors,
      peakHour,
      onlineCount: rangeOrders.filter((o) => o.paymentMethod === 'ONLINE')
        .length,
      cashCount: rangeOrders.filter((o) => o.paymentMethod !== 'ONLINE').length,
    };
  }, [rangeOrders]);

  const rangeLabel =
    historyRange === 'DAY'
      ? 'Today'
      : historyRange === 'MONTH'
        ? 'This month'
        : 'This year';

  const formatOrderTime = (createdAt: string) =>
    new Date(createdAt).toLocaleString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });

  const formatItemsCompact = (order: StaffOrder) => {
    const items = order.items ?? [];
    if (items.length === 0) return '—';
    const first = items[0];
    const firstLabel = `${first.quantity}× ${first.flavor?.name ?? 'Item'}`;
    if (items.length === 1) return firstLabel;
    const rest = items.length - 1;
    return `${firstLabel} +${rest}`;
  };

  const itemCount = (order: StaffOrder) =>
    (order.items ?? []).reduce((s, i) => s + Number(i.quantity ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#eef1f4]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6 lg:gap-10">
            <img src={logo} alt="logo" className="h-9 shrink-0 object-contain" />
            <nav className="hidden items-center gap-6 text-sm font-semibold tracking-wide md:flex">
              <button
                onClick={() => navigate('/staff/pos')}
                className={`pb-0.5 border-b-2 ${
                  location.pathname === '/staff/pos'
                    ? 'text-[#33c3b3] border-[#33c3b3]'
                    : 'text-gray-500 border-transparent hover:text-[#33c3b3]'
                }`}
              >
                PRODUCTS
              </button>
              <button
                onClick={() => navigate('/staff/orders')}
                className={`pb-0.5 border-b-2 ${
                  location.pathname === '/staff/orders'
                    ? 'text-[#33c3b3] border-[#33c3b3]'
                    : 'text-gray-500 border-transparent hover:text-[#33c3b3]'
                }`}
              >
                ORDERS
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/staff/pos')}
              className="hidden rounded-full bg-[#33c3b3] px-4 py-2 text-xs font-bold text-white hover:bg-[#2bb1a2] sm:inline-flex"
            >
              + New Order
            </button>
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
              <p className="text-[11px] text-gray-500">{user?.branchCode}</p>
            </div>
            <button
              onClick={logout}
              className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 sm:px-4 sm:py-2 sm:text-sm"
            >
              End Shift
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:p-5">
        {/* Toolbar */}
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Shift Orders
            </h1>
            <p className="text-xs text-gray-500 sm:text-sm">
              {rangeLabel} · {analytics.completedCount} completed ·{' '}
              {formatCurrency(analytics.revenue)} collected
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-gray-100">
              {(['DAY', 'MONTH', 'YEAR'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setHistoryRange(range)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    historyRange === range
                      ? 'bg-[#33c3b3] text-white'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {range === 'DAY' ? 'Today' : range === 'MONTH' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
            <button
              onClick={() => void loadOrders()}
              disabled={ordersLoading}
              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm ring-1 ring-gray-100 hover:bg-gray-50 disabled:opacity-50"
            >
              {ordersLoading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              onClick={() => navigate('/staff/pos')}
              className="rounded-xl bg-[#33c3b3] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#2bb1a2] sm:hidden"
            >
              + New Order
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)]">
          {/* Left rail — compact insights */}
          <aside className="space-y-3">
            <div className="grid grid-cols-2 gap-2 xl:grid-cols-1">
              <div className="rounded-2xl bg-gradient-to-br from-[#33c3b3] to-[#2aa89a] p-4 text-white shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-90">
                  Revenue
                </p>
                <p className="mt-1 text-2xl font-bold">
                  {formatCurrency(analytics.revenue)}
                </p>
                <p className="mt-1 text-[11px] opacity-80">
                  Avg {formatCurrency(analytics.avgOrder || 0)} / order
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Items sold
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {analytics.itemsSold}
                </p>
                <p className="mt-1 text-[11px] text-gray-500">
                  ~{analytics.avgItems.toFixed(1)} per completed order
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-bold text-gray-800">Order status</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-emerald-50 px-2 py-2">
                  <p className="text-lg font-bold text-emerald-700">
                    {analytics.completedCount}
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-600">Done</p>
                </div>
                <div className="rounded-xl bg-amber-50 px-2 py-2">
                  <p className="text-lg font-bold text-amber-700">
                    {analytics.pendingCount}
                  </p>
                  <p className="text-[10px] font-semibold text-amber-600">Pending</p>
                </div>
                <div className="rounded-xl bg-red-50 px-2 py-2">
                  <p className="text-lg font-bold text-red-600">
                    {analytics.failedCount}
                  </p>
                  <p className="text-[10px] font-semibold text-red-500">Failed</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="text-xs font-bold text-gray-800">Payment split</p>
              <div className="mt-3 space-y-2">
                <div>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-gray-600">💵 Cash</span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(analytics.cashRevenue)} · {analytics.cashCount}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${
                          analytics.revenue > 0
                            ? (analytics.cashRevenue / analytics.revenue) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-[11px]">
                    <span className="text-gray-600">📱 Online</span>
                    <span className="font-semibold text-gray-800">
                      {formatCurrency(analytics.onlineRevenue)} · {analytics.onlineCount}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{
                        width: `${
                          analytics.revenue > 0
                            ? (analytics.onlineRevenue / analytics.revenue) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {analytics.topFlavors.length > 0 && (
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="text-xs font-bold text-gray-800">Top sellers</p>
                <ul className="mt-2 space-y-1.5">
                  {analytics.topFlavors.map(([name, qty], idx) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2 text-[11px]"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-gray-700">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#dff5f2] text-[9px] font-bold text-[#33c3b3]">
                          {idx + 1}
                        </span>
                        <span className="truncate">{name}</span>
                      </span>
                      <span className="shrink-0 font-bold text-gray-900">{qty}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analytics.peakHour.count > 0 && (
              <div className="rounded-2xl border border-dashed border-[#33c3b3]/40 bg-[#f4fcfb] px-4 py-3 text-[11px] text-[#2aa89a]">
                <span className="font-bold">Peak hour:</span>{' '}
                {analytics.peakHour.hour === 0
                  ? '12'
                  : analytics.peakHour.hour > 12
                    ? analytics.peakHour.hour - 12
                    : analytics.peakHour.hour}
                {analytics.peakHour.hour >= 12 ? ' PM' : ' AM'} ·{' '}
                {analytics.peakHour.count} orders ·{' '}
                {formatCurrency(analytics.peakHour.revenue)}
              </div>
            )}
          </aside>

          {/* Main — dense order table */}
          <section className="min-w-0 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="border-b border-gray-100 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search flavor, note, order ID…"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#33c3b3] sm:max-w-xs"
                />
                <p className="text-xs text-gray-500">
                  Showing {filteredOrders.length} of {analytics.orderCount}
                </p>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {(['ALL', 'CASH', 'ONLINE'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPaymentFilter(f)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      paymentFilter === f
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'ALL' ? 'All pay' : f === 'CASH' ? 'Cash' : 'Online'}
                  </button>
                ))}
                <span className="mx-1 w-px self-stretch bg-gray-200" />
                {(['ALL', 'COMPLETED', 'PENDING', 'FAILED'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      statusFilter === f
                        ? 'bg-[#33c3b3] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'ALL' ? 'All status' : f}
                  </button>
                ))}
              </div>
            </div>

            {ordersLoading ? (
              <p className="px-4 py-12 text-center text-sm text-gray-500">
                Loading orders…
              </p>
            ) : filteredOrders.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-4xl">🧾</p>
                <p className="mt-2 text-sm font-semibold text-gray-700">
                  No orders match your filters
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Try a different range or start selling from POS
                </p>
                <button
                  onClick={() => navigate('/staff/pos')}
                  className="mt-4 rounded-full bg-[#33c3b3] px-5 py-2 text-sm font-bold text-white"
                >
                  Open POS
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      <th className="px-3 py-2.5 sm:px-4">Time</th>
                      <th className="px-3 py-2.5 sm:px-4">Items</th>
                      <th className="hidden px-3 py-2.5 md:table-cell sm:px-4">
                        Note
                      </th>
                      <th className="px-3 py-2.5 sm:px-4">Pay</th>
                      <th className="px-3 py-2.5 sm:px-4">Status</th>
                      <th className="px-3 py-2.5 text-right sm:px-4">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="group hover:bg-[#f8fffe] transition-colors"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 sm:px-4">
                          <p className="font-semibold text-gray-800">
                            {formatRelativeTime(order.createdAt)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {formatOrderTime(order.createdAt)}
                          </p>
                          <p className="font-mono text-[9px] text-gray-300">
                            #{order.id.slice(0, 8)}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 sm:px-4">
                          <p
                            className="max-w-[200px] truncate font-medium text-gray-800 lg:max-w-xs"
                            title={(order.items ?? [])
                              .map(
                                (i) =>
                                  `${i.quantity}× ${i.flavor?.name ?? 'Item'}`,
                              )
                              .join(', ')}
                          >
                            {formatItemsCompact(order)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {itemCount(order)} unit{itemCount(order) === 1 ? '' : 's'}
                          </p>
                        </td>
                        <td className="hidden max-w-[140px] truncate px-3 py-2.5 text-xs text-gray-500 md:table-cell sm:px-4">
                          {order.note?.trim() && order.note !== '-'
                            ? order.note
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 sm:px-4">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                              order.paymentMethod === 'ONLINE'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {order.paymentMethod === 'ONLINE' ? 'QR' : 'Cash'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 sm:px-4">
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset ${
                              statusStyles[order.status] ??
                              'bg-gray-100 text-gray-600 ring-gray-200'
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-[#33c3b3] sm:px-4">
                          ₹{Number(order.total).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
