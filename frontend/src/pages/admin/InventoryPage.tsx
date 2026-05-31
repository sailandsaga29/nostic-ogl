import Header from '../../components/Layout/Header';
import { useEffect, useState } from 'react';
import api from '../../services/api';

type Flavor = {
  id: string;
  name?: string | null;
  category?: string | null;
  stock?: number;
  price?: number;
};

type InventorySortKey = 'name' | 'category' | 'stock' | 'price';

export default function Inventory() {
  const [items, setItems] = useState<Flavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<InventorySortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const resp = await api.get('/flavors');
        if (mounted) setItems(resp.data);
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

  const toggleSort = (key: InventorySortKey) => {
    if (sortKey === key) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortOrder('asc');
  };

  const sortIcon = (key: InventorySortKey) => {
    if (sortKey !== key) return '⇅';
    return sortOrder === 'asc' ? '▲' : '▼';
  };

  const sortedItems = [...items].sort((a, b) => {
    const direction = sortOrder === 'asc' ? 1 : -1;
    if (sortKey === 'name' || sortKey === 'category') {
      const left = (a[sortKey] ?? '').toString().toLowerCase();
      const right = (b[sortKey] ?? '').toString().toLowerCase();
      return left.localeCompare(right) * direction;
    }

    if (sortKey === 'stock') {
      return ((a.stock ?? 0) - (b.stock ?? 0)) * direction;
    }

    return ((a.price ?? 0) - (b.price ?? 0)) * direction;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br to-indigo-50">

      <Header />

      <main className="w-full">
        <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] bg-gradient-to-r from-[#00a8c5] to-[#63d471] p-6 sm:p-8">
            <h1 className="text-5xl font-bold text-white sm:text-6xl">Inventory</h1>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[2rem] bg-white p-4 shadow-sm">
            <table className="min-w-full divide-y divide-gray-200" aria-label="Inventory table">
              <caption className="sr-only">Inventory table</caption>
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    aria-sort={sortKey === 'name' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('name')}
                      className="inline-flex items-center gap-2 font-semibold text-left text-slate-700 hover:text-slate-900"
                    >
                      Item <span className="text-[0.7rem]">{sortIcon('name')}</span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    aria-sort={sortKey === 'category' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('category')}
                      className="inline-flex items-center gap-2 font-semibold text-left text-slate-700 hover:text-slate-900"
                    >
                      Category <span className="text-[0.7rem]">{sortIcon('category')}</span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    aria-sort={sortKey === 'stock' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('stock')}
                      className="inline-flex items-center gap-2 font-semibold text-left text-slate-700 hover:text-slate-900"
                    >
                      Stock <span className="text-[0.7rem]">{sortIcon('stock')}</span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    aria-sort={sortKey === 'price' ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-500"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('price')}
                      className="inline-flex items-center gap-2 font-semibold text-left text-slate-700 hover:text-slate-900"
                    >
                      Price <span className="text-[0.7rem]">{sortIcon('price')}</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sortedItems.map((f) => (
                  <tr key={f.id} className="odd:bg-white even:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">{f.name}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">{f.category}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">{f.stock ?? 0}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-pink-600">{f.price != null ? `₹${f.price}` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}