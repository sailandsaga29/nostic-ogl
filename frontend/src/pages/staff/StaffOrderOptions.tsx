import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import api from '../../services/api';
import ActionFeedback from '../../components/ActionFeedback';
import TableRefreshButton from '../../components/TableRefreshButton';
import { useTimedFeedback } from '../../hooks/useTimedFeedback';
import StaffHeader from '../../components/Layout/StaffHeader';

type StaffOrder = {
  id: number;
  status: string;
  paymentMethod?: 'CASH' | 'ONLINE';
  total: number;
  note?: string;
  createdAt: string;
  orderType?: 'RETAIL' | 'PARTY';
  partyName?: string;
  discountPercent?: number;
  totalAmount?: number;
  totalEarnings?: number;
  items?: Array<{
    quantity: number;
    unitPrice?: number;
    flavor?: { name?: string };
  }>;
};

type PartyOrderApi = {
  id: number;
  partyName: string;
  totalAmount: number;
  discountPercent: number;
  amountAfterDiscount: number;
  totalEarnings: number;
  paymentMethod?: 'CASH' | 'ONLINE';
  note?: string;
  createdAt: string;
  status?: string;
  lineItems?: Array<{
    flavorId: number;
    quantity: number;
    flavorName: string;
    unitPrice: number;
  }>;
};

const IST_TIME: Intl.DateTimeFormatOptions = {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: 'short',
};

const parseOrderDate = (createdAt: string) => {
  const raw = createdAt?.trim();
  if (!raw) return new Date(NaN);
  if (!raw.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(raw)) {
    return new Date(`${raw}Z`);
  }
  return new Date(raw);
};

const formatOrderId = (order: StaffOrder) =>
  order.orderType === 'PARTY' ? `BLK-${order.id}` : `#${order.id}`;

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

const ORDERS_PER_PAGE = 15;

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const displayStatus = (order: StaffOrder) => {
  if (order.status === 'CANCELLED') return 'FAILED';
  return order.status;
};

const formatRelativeTime = (createdAt: string) => {
  const date = parseOrderDate(createdAt);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
  });
};

type OrdersPageVariant = 'staff' | 'admin';

type StaffOrderOptionsProps = {
  variant?: OrdersPageVariant;
};

export default function StaffOrderOptions({
  variant = 'staff',
}: StaffOrderOptionsProps) {
  const isAdminView = variant === 'admin';
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [historyRange, setHistoryRange] = useState<HistoryRange>('DAY');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pendingAdminComments, setPendingAdminComments] = useState<
    Record<number, string>
  >({});
  const [pendingActionOrderId, setPendingActionOrderId] = useState<
    number | null
  >(null);
  const { feedback: pendingActionFeedback, setFeedback: setPendingActionFeedback } =
    useTimedFeedback();

  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const [ordersRes, partyRes] = await Promise.all([
        api.get('/orders'),
        api.get('/party-orders'),
      ]);
      const retail: StaffOrder[] = Array.isArray(ordersRes.data)
        ? ordersRes.data.map((o: StaffOrder) => ({ ...o, orderType: 'RETAIL' as const }))
        : [];
      const party: StaffOrder[] = Array.isArray(partyRes.data)
        ? partyRes.data.map((p: PartyOrderApi) => {
            const lineItems = Array.isArray(p.lineItems) ? p.lineItems : [];
            return {
            id: p.id,
            orderType: 'PARTY' as const,
            status: p.status ?? 'COMPLETED',
            paymentMethod: p.paymentMethod ?? 'CASH',
            total: Number(p.amountAfterDiscount ?? 0),
            totalAmount: Number(p.totalAmount ?? 0),
            discountPercent: Number(p.discountPercent ?? 0),
            totalEarnings: Number(p.totalEarnings ?? 0),
            partyName: p.partyName,
            note:
              p.note?.trim() ||
              `${p.discountPercent}% discount · earnings ${formatCurrency(Number(p.totalEarnings ?? 0))}`,
            createdAt: p.createdAt,
            items:
              lineItems.length > 0
                ? lineItems.map((item) => ({
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    flavor: { name: item.flavorName },
                  }))
                : [
                    {
                      quantity: 1,
                      flavor: { name: `Party: ${p.partyName}` },
                    },
                  ],
          };
          })
        : [];
      setOrders(
        [...retail, ...party].sort(
          (a, b) =>
            parseOrderDate(b.createdAt).getTime() -
            parseOrderDate(a.createdAt).getTime(),
        ),
      );
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
      const date = parseOrderDate(order.createdAt);
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
        if (statusFilter !== 'ALL' && displayStatus(order) !== statusFilter) {
          return false;
        }
        if (!query) return true;
        const itemsText = (order.items ?? [])
          .map((i) => i.flavor?.name ?? '')
          .join(' ')
          .toLowerCase();
        return (
          formatOrderId(order).toLowerCase().includes(query) ||
          String(order.id).toLowerCase().includes(query) ||
          itemsText.includes(query) ||
          (order.note ?? '').toLowerCase().includes(query) ||
          (order.partyName ?? '').toLowerCase().includes(query)
        );
      })
      .sort(
        (a, b) =>
          parseOrderDate(b.createdAt).getTime() -
          parseOrderDate(a.createdAt).getTime(),
      );
  }, [rangeOrders, paymentFilter, statusFilter, search]);

  useEffect(() => {
    setPage(1);
  }, [historyRange, paymentFilter, statusFilter, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ORDERS_PER_PAGE),
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, page]);

  const pageStart =
    filteredOrders.length === 0
      ? 0
      : (page - 1) * ORDERS_PER_PAGE + 1;
  const pageEnd = Math.min(page * ORDERS_PER_PAGE, filteredOrders.length);

  const analytics = useMemo(() => {
    const completed = rangeOrders.filter((o) => o.status === 'COMPLETED');
    const pending = rangeOrders.filter((o) => o.status === 'PENDING');
    const failed = rangeOrders.filter(
      (o) => o.status === 'FAILED' || o.status === 'CANCELLED',
    );

    const revenue = completed.reduce(
      (s, o) =>
        s +
        (o.orderType === 'PARTY'
          ? Number(o.totalEarnings ?? o.total ?? 0)
          : Number(o.total ?? 0)),
      0,
    );
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
      const hour = Number(
        parseOrderDate(order.createdAt).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          hour12: false,
        }),
      );
      if (Number.isNaN(hour) || hour < 0 || hour > 23) continue;
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
    parseOrderDate(createdAt).toLocaleString('en-IN', IST_TIME);

  const hasPartyLineItems = (order: StaffOrder) => {
    const items = order.items ?? [];
    return (
      items.length > 0 && !items[0].flavor?.name?.startsWith('Party:')
    );
  };

  const formatItemsTitle = (order: StaffOrder) => {
    const items = order.items ?? [];
    if (order.orderType === 'PARTY' && order.partyName) {
      const itemLines = items
        .map((item) => `${item.quantity}× ${item.flavor?.name ?? 'Item'}`)
        .join(', ');
      return itemLines
        ? `Party · ${order.partyName} — ${itemLines}`
        : `Party · ${order.partyName}`;
    }
    return items
      .map((item) => `${item.quantity}× ${item.flavor?.name ?? 'Item'}`)
      .join(', ');
  };

  const renderOrderItems = (order: StaffOrder) => {
    const items = order.items ?? [];

    if (order.orderType === 'PARTY' && order.partyName) {
      return (
        <div className="min-w-[160px] max-w-sm whitespace-normal">
          <p className="font-medium text-gray-800">Party · {order.partyName}</p>
          {hasPartyLineItems(order) && (
            <ul className="mt-1 space-y-0.5">
              {items.map((item, index) => (
                <li
                  key={`${order.id}-item-${index}`}
                  className="text-xs leading-snug text-gray-600"
                >
                  {item.quantity}× {item.flavor?.name ?? 'Item'}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (items.length === 0) {
      return <span className="text-gray-400">—</span>;
    }

    if (items.length === 1) {
      const item = items[0];
      return (
        <p className="max-w-sm whitespace-normal font-medium text-gray-800">
          {item.quantity}× {item.flavor?.name ?? 'Item'}
        </p>
      );
    }

    return (
      <ul className="max-w-sm space-y-0.5 whitespace-normal">
        {items.map((item, index) => (
          <li
            key={`${order.id}-item-${index}`}
            className="text-sm leading-snug text-gray-800"
          >
            {item.quantity}× {item.flavor?.name ?? 'Item'}
          </li>
        ))}
      </ul>
    );
  };

  const itemCount = (order: StaffOrder) =>
    (order.items ?? []).reduce((s, i) => s + Number(i.quantity ?? 0), 0);

  const isPendingRetail = (order: StaffOrder) =>
    order.orderType !== 'PARTY' && order.status === 'PENDING';

  const updatePendingOrder = async (
    orderId: number,
    status: 'COMPLETED' | 'CANCELLED',
  ) => {
    try {
      setPendingActionOrderId(orderId);
      setPendingActionFeedback(null);
      await api.patch(`/orders/${orderId}/status`, {
        status,
        comment: pendingAdminComments[orderId]?.trim() || undefined,
      });
      setPendingActionFeedback({
        type: 'success',
        message:
          status === 'COMPLETED'
            ? `Order #${orderId} completed — stock deducted for ordered quantities`
            : `Order #${orderId} cancelled — stock unchanged (order was pending)`,
      });
      setPendingAdminComments((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      await loadOrders();
    } catch (err) {
      let message =
        status === 'COMPLETED'
          ? 'Could not complete order'
          : 'Could not cancel order';
      if (axios.isAxiosError(err)) {
        const apiMessage = err.response?.data?.message;
        if (typeof apiMessage === 'string') message = apiMessage;
        else if (Array.isArray(apiMessage)) message = apiMessage.join(', ');
      }
      setPendingActionFeedback({ type: 'error', message });
    } finally {
      setPendingActionOrderId(null);
    }
  };

  const renderPendingAdminActions = (orderId: number) => {
    const busy = pendingActionOrderId === orderId;
    return (
      <div className="flex min-w-[200px] flex-col gap-1.5">
        <input
          type="text"
          value={pendingAdminComments[orderId] ?? ''}
          onChange={(e) =>
            setPendingAdminComments((prev) => ({
              ...prev,
              [orderId]: e.target.value,
            }))
          }
          placeholder="Short comment…"
          maxLength={200}
          className="w-full rounded-lg border border-gray-200 px-2 py-1 text-[11px] outline-none focus:border-teal-500"
        />
        <p className="text-[9px] leading-snug text-gray-400">
          Complete deducts stock · Cancel keeps stock as-is
        </p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => void updatePendingOrder(orderId, 'COMPLETED')}
            className="rounded-lg bg-teal-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Complete'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void updatePendingOrder(orderId, 'CANCELLED')}
            className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={
        isAdminView ? undefined : 'min-h-screen bg-[#eef1f4]'
      }
    >
      {!isAdminView && <StaffHeader />}

      <main className="mx-auto max-w-[1600px] p-3 sm:p-4 lg:p-5">
        {/* Toolbar */}
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#0ea5b7] sm:text-2xl">
              Order History
            </h3>
            {/* <p className="text-xs text-gray-500 sm:text-sm">
              {rangeLabel} · {analytics.completedCount} completed ·{' '}
              {formatCurrency(analytics.revenue)} collected
            </p> */}
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
            {!isAdminView && (
              <button
                onClick={() => navigate('/staff/pos')}
                className="rounded-xl bg-[#33c3b3] px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#2bb1a2] sm:hidden"
              >
                + New Order
              </button>
            )}
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
            {isAdminView && pendingActionFeedback ? (
              <div className="border-b border-gray-100 px-3 py-2 sm:px-4">
                <ActionFeedback feedback={pendingActionFeedback} />
              </div>
            ) : null}
            <div className="border-b border-gray-100 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search flavor, note, order ID…"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#33c3b3] sm:max-w-xs"
                />
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">
                    {filteredOrders.length === 0
                      ? `Showing 0 of ${analytics.orderCount}`
                      : `Showing ${pageStart}–${pageEnd} of ${filteredOrders.length} (${analytics.orderCount} in range)`}
                  </p>
                  <TableRefreshButton
                    loading={ordersLoading}
                    onRefresh={() => void loadOrders()}
                    label="Refresh orders"
                  />
                </div>
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
                  {isAdminView
                    ? 'Try a different range or clear filters'
                    : 'Try a different range or start selling from POS'}
                </p>
                {!isAdminView && (
                  <button
                    onClick={() => navigate('/staff/pos')}
                    className="mt-4 rounded-full bg-[#33c3b3] px-5 py-2 text-sm font-bold text-white"
                  >
                    Open POS
                  </button>
                )}
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
                      {isAdminView && (
                        <th className="hidden px-3 py-2.5 lg:table-cell sm:px-4">
                          Action
                        </th>
                      )}
                      <th className="px-3 py-2.5 text-right sm:px-4">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {paginatedOrders.map((order) => (
                      <tr
                        key={`${order.orderType ?? 'RETAIL'}-${order.id}`}
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
                            {formatOrderId(order)}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 sm:px-4">
                          <div title={formatItemsTitle(order)}>
                            {renderOrderItems(order)}
                          </div>
                          <p className="text-[10px] text-gray-400">
                            {order.orderType === 'PARTY'
                              ? `${order.discountPercent ?? 0}% off · was ${formatCurrency(Number(order.totalAmount ?? 0))}`
                              : `${itemCount(order)} unit${itemCount(order) === 1 ? '' : 's'}`}
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
                              order.orderType === 'PARTY'
                                ? 'bg-orange-100 text-orange-800 ring-orange-200'
                                : statusStyles[displayStatus(order)] ??
                                  'bg-gray-100 text-gray-600 ring-gray-200'
                            }`}
                          >
                            {order.orderType === 'PARTY'
                              ? 'PARTY'
                              : displayStatus(order)}
                          </span>
                          {isAdminView && isPendingRetail(order) ? (
                            <div className="mt-2 lg:hidden">
                              {renderPendingAdminActions(order.id)}
                            </div>
                          ) : null}
                        </td>
                        {isAdminView && (
                          <td className="hidden px-3 py-2.5 lg:table-cell sm:px-4">
                            {isPendingRetail(order) ? (
                              renderPendingAdminActions(order.id)
                            ) : (
                              <span className="text-[10px] text-gray-400">—</span>
                            )}
                          </td>
                        )}
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-bold text-[#33c3b3] sm:px-4">
                          ₹{Number(order.total).toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!ordersLoading && filteredOrders.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-gray-100 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                <p className="text-xs text-gray-500">
                  {pageStart}–{pageEnd} of {filteredOrders.length} orders ·{' '}
                  {ORDERS_PER_PAGE} per page
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="min-w-[5rem] text-center text-xs font-semibold text-gray-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    className="rounded-lg bg-[#33c3b3] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2bb1a2] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
