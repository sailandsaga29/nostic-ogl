import Header from '../../components/Layout/Header';
import { useEffect, useState } from 'react';
import api from '../../services/api';

type Order = {
  id: number;
  status: string;
  paymentMethod?: 'CASH' | 'ONLINE';
  total: number;
  note?: string;
  createdAt: string;
  items?: { flavor: { name?: string }; quantity: number; unitPrice: number }[];
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const resp = await api.get('/orders');
        if (mounted) setOrders(resp.data);
      } catch (err) {
        // console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br to-indigo-50">

      <Header />

      <main className="w-full">
        <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-gradient-to-r from-[#00a8c5] to-[#63d471] p-6 sm:p-8">
            <h1 className="text-5xl font-bold text-white sm:text-6xl">Orders</h1>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-[2rem] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Recent Orders</h2>
                  <p className="text-sm text-slate-500">Active orders and order details.</p>
                </div>
                <button className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                  View All
                </button>
              </div>

              <div className="mt-5 divide-y divide-slate-200">
                {orders.map((order) => (
                  <article key={order.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Order #{order.id}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-900">{order.note ?? 'Customer order'}</p>
                      <p className="mt-1 text-sm text-slate-500">{(order.items || []).map((i) => `${i.quantity}x ${i.flavor?.name ?? ''}`).join(', ') || 'No items listed'}</p>
                    </div>

                    <div className="flex flex-col items-start gap-2 text-left sm:items-end">
                      <p className="text-lg font-semibold text-pink-600">₹{order.total}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{order.status}</span>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${order.paymentMethod === 'ONLINE' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {order.paymentMethod === 'ONLINE' ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="rounded-[2rem] bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Order summary</h2>
              <p className="mt-3 text-sm text-slate-500">Use this panel for quick admin insights and filtering controls.</p>
              <div className="mt-6 grid gap-4">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Orders today</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">{orders.length}</p>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Total revenue</p>
                  <p className="mt-2 text-3xl font-semibold text-pink-600">₹{orders.reduce((sum, order) => sum + order.total, 0)}</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}