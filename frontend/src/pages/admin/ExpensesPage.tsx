import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ActionFeedback from '../../components/ActionFeedback';
import { useTimedFeedback } from '../../hooks/useTimedFeedback';
import { Plus, Trash2 } from 'lucide-react';
import TableRefreshButton from '../../components/TableRefreshButton';
import api from '../../services/api';
import { cachedGet } from '../../services/apiCache';
import type { AdminPageProps } from '../../types/adminPage';
import axios from 'axios';

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

const EXPENSES_PER_PAGE = 10;

type Expense = {
  id: number;
  description: string;
  amount: number;
  spoc: string;
  expenseDate?: string;
  createdAt?: string;
};

type ExpenseSortKey = 'description' | 'amount' | 'spoc';

const emptyDraft = () => ({
  description: '',
  amount: '',
  spoc: '',
});

const getMonthNumber = (monthName: MonthName) =>
  MONTH_NAMES.indexOf(monthName) + 1;

const isFutureMonth = (year: number, monthNum: number) => {
  const now = new Date();
  const cy = now.getFullYear();
  const cm = now.getMonth() + 1;
  return year > cy || (year === cy && monthNum > cm);
};

const isCurrentMonth = (year: number, monthNum: number) => {
  const now = new Date();
  return year === now.getFullYear() && monthNum === now.getMonth() + 1;
};

const getExpenseDate = (expense: Expense) => {
  const raw = expense.expenseDate ?? expense.createdAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const expenseInPeriod = (
  expense: Expense,
  year: number,
  monthNum: number,
) => {
  const date = getExpenseDate(expense);
  if (!date) return false;
  return date.getFullYear() === year && date.getMonth() + 1 === monthNum;
};

export default function ExpensesPage({ isActive = true }: AdminPageProps) {
  const hasLoadedRef = useRef(false);
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableRefreshing, setTableRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<ExpenseSortKey>('description');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [draft, setDraft] = useState(emptyDraft);
  const [page, setPage] = useState(1);
  const { feedback: addFeedback, setFeedback: setAddFeedback } =
    useTimedFeedback();
  const { feedback: deleteFeedback, setFeedback: setDeleteFeedback } =
    useTimedFeedback();
  const [deleteFeedbackId, setDeleteFeedbackId] = useState<number | null>(
    null,
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (!deleteFeedback) setDeleteFeedbackId(null);
  }, [deleteFeedback]);

  const [selectedMonth, setSelectedMonth] = useState<MonthName>(
    () => MONTH_NAMES[new Date().getMonth()],
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const [selectedSpoc, setSelectedSpoc] = useState('All');

  const selectedMonthNum = getMonthNumber(selectedMonth);
  const selectedIsFutureMonth = isFutureMonth(
    selectedYear,
    selectedMonthNum,
  );

  const loadExpenses = useCallback(async (options?: { refresh?: boolean }) => {
    const isRefresh = options?.refresh === true;
    try {
      if (isRefresh) {
        setTableRefreshing(true);
      } else {
        setLoading(true);
      }
      const resp = await cachedGet<Expense[]>('/expenses', {
        force: isRefresh,
      });
      let list: Expense[] = Array.isArray(resp) ? resp : [];

      if (list.length === 0 && isActive) {
        try {
          await api.post('/expenses/seed');
          const seeded = await cachedGet<Expense[]>('/expenses', { force: true });
          list = Array.isArray(seeded) ? seeded : [];
        } catch {
          // seed endpoint may be unavailable; keep empty list
        }
      }

      setItems(list);
    } catch {
      setItems([]);
    } finally {
      if (isRefresh) {
        setTableRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [isActive]);

  useEffect(() => {
    if (!isActive || hasLoadedRef.current) {
      return;
    }

    void loadExpenses().then(() => {
      hasLoadedRef.current = true;
    });
  }, [isActive, loadExpenses]);

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    items.forEach((item) => {
      const date = getExpenseDate(item);
      if (!date) return;
      years.add(date.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [items]);

  const spocFilters = useMemo(() => {
    const merged = new Set<string>();
    items.forEach((item) => {
      const name = item.spoc?.trim();
      if (name) merged.add(name);
    });
    return [
      'All',
      ...Array.from(merged).sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' }),
      ),
    ];
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (!expenseInPeriod(item, selectedYear, selectedMonthNum)) {
          return false;
        }
        if (selectedSpoc !== 'All' && item.spoc !== selectedSpoc) {
          return false;
        }
        return true;
      }),
    [items, selectedYear, selectedMonthNum, selectedSpoc],
  );

  useEffect(() => {
    setPage(1);
  }, [selectedMonth, selectedYear, selectedSpoc, sortKey, sortOrder]);

  const toggleSort = (key: ExpenseSortKey) => {
    if (sortKey === key) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortOrder('asc');
  };

  const sortIcon = (key: ExpenseSortKey) => {
    if (sortKey !== key) return '⇅';
    return sortOrder === 'asc' ? '▲' : '▼';
  };

  const sortedItems = useMemo(() => {
    const direction = sortOrder === 'asc' ? 1 : -1;
    return [...filteredItems].sort((a, b) => {
      if (sortKey === 'description' || sortKey === 'spoc') {
        const left = (a[sortKey] ?? '').toString().toLowerCase();
        const right = (b[sortKey] ?? '').toString().toLowerCase();
        return (
          left.localeCompare(right, 'en', { sensitivity: 'base' }) *
          direction
        );
      }
      return (Number(a.amount) - Number(b.amount)) * direction;
    });
  }, [filteredItems, sortKey, sortOrder]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedItems.length / EXPENSES_PER_PAGE),
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * EXPENSES_PER_PAGE;
    return sortedItems.slice(start, start + EXPENSES_PER_PAGE);
  }, [sortedItems, page]);

  const pageStart =
    sortedItems.length === 0 ? 0 : (page - 1) * EXPENSES_PER_PAGE + 1;
  const pageEnd = Math.min(page * EXPENSES_PER_PAGE, sortedItems.length);

  const monthlyTotal = useMemo(
    () =>
      filteredItems.reduce(
        (sum, item) => sum + Number(item.amount ?? 0),
        0,
      ),
    [filteredItems],
  );

  const spocOptions = useMemo(() => {
    const set = new Set<string>(['Sai']);
    items.forEach((item) => {
      const name = item.spoc?.trim();
      if (name) set.add(name);
    });
    if (draft.spoc.trim()) set.add(draft.spoc.trim());
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' }),
    );
  }, [items, draft.spoc]);

  const formatCurrency = (value: number) =>
    `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const emptyTableMessage = loading
    ? 'Loading expenses...'
    : selectedIsFutureMonth
      ? `No expenses for ${selectedMonth} ${selectedYear} (future month)`
      : `No expenses for ${selectedMonth} ${selectedYear}`;

  const handleAdd = async () => {
    const description = draft.description.trim();
    const spoc = draft.spoc.trim();
    const amount = Number(draft.amount);

    if (!description) {
      setAddFeedback({
        type: 'error',
        message: 'Enter expense description',
      });
      return;
    }
    if (!spoc) {
      setAddFeedback({ type: 'error', message: 'Enter SPOC name' });
      return;
    }
    if (Number.isNaN(amount) || amount < 0) {
      setAddFeedback({ type: 'error', message: 'Enter a valid amount' });
      return;
    }

    const expenseDate = `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}-01`;

    try {
      setSaving(true);
      setAddFeedback(null);
      await api.post('/expenses', {
        description,
        amount,
        spoc,
        expenseDate,
      });
      setDraft(emptyDraft());
      setAddFeedback({ type: 'success', message: 'Expense added' });
      await loadExpenses({ refresh: true });
    } catch (err) {
      let message = 'Failed to add expense';
      if (axios.isAxiosError(err)) {
        const apiMessage = err.response?.data?.message;
        if (typeof apiMessage === 'string') message = apiMessage;
        else if (Array.isArray(apiMessage)) message = apiMessage.join(', ');
      }
      setAddFeedback({ type: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = (item: Expense) => {
    setPendingDeleteId(item.id);
    setDeleteFeedback(null);
    setDeleteFeedbackId(null);
  };

  const handleDeleteCancel = () => {
    setPendingDeleteId(null);
  };

  const handleDeleteConfirm = async (item: Expense) => {
    setPendingDeleteId(null);
    setDeleteFeedback(null);
    setDeleteFeedbackId(null);
    try {
      await api.delete(`/expenses/${item.id}`);
      await loadExpenses({ refresh: true });
    } catch {
      setDeleteFeedbackId(item.id);
      setDeleteFeedback({
        type: 'error',
        message: 'Failed to delete expense',
      });
    }
  };

  const scrollToAddRow = () => {
    document
      .getElementById('expense-add-row')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center px-4 py-24 text-slate-600">
        Loading expenses…
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
                Viewing
              </p>
              <p className="truncate text-sm font-semibold text-gray-800">
                {selectedMonth}
                {isCurrentMonth(selectedYear, selectedMonthNum)
                  ? ' (now)'
                  : ''}{' '}
                · {selectedYear}
                {selectedSpoc !== 'All' ? ` · ${selectedSpoc}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <select
                value={selectedSpoc}
                onChange={(e) => setSelectedSpoc(e.target.value)}
                className="min-w-[7rem] shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-teal-400 focus:bg-white"
                aria-label="Filter by SPOC"
              >
                {spocFilters.map((spoc) => (
                  <option key={spoc} value={spoc}>
                    {spoc === 'All' ? 'All SPOC' : spoc}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(Number(e.target.value))
                }
                className="min-w-[5.5rem] shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-teal-400 focus:bg-white"
                aria-label="Filter by year"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
                      title={
                        isNow ? `${month} (current month)` : month
                      }
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
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3 sm:px-6">
            <p className="text-sm text-gray-800">
              <span className="font-semibold">Total for {selectedMonth}</span>{' '}
              {selectedYear}:{' '}
              {selectedIsFutureMonth
                ? '—'
                : formatCurrency(monthlyTotal)}
              <span className="ml-2 text-gray-500">
                · {filteredItems.length} expense
                {filteredItems.length === 1 ? '' : 's'}
              </span>
            </p>
            <TableRefreshButton
              loading={tableRefreshing}
              onRefresh={() => void loadExpenses({ refresh: true })}
              label="Refresh expenses"
            />
          </div>

          <div className="overflow-x-auto p-4">
            <table
              className="min-w-full divide-y divide-gray-200"
              aria-label="Expenses table"
            >
              <caption className="sr-only">Expenses table</caption>
              <thead className="bg-amber-100">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-800"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('description')}
                      className="inline-flex items-center gap-2 font-bold text-slate-800 hover:text-slate-950"
                    >
                      Expenses{' '}
                      <span className="text-[0.7rem]">
                        {sortIcon('description')}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-800"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('amount')}
                      className="inline-flex items-center gap-2 font-bold text-slate-800 hover:text-slate-950"
                    >
                      Amount{' '}
                      <span className="text-[0.7rem]">
                        {sortIcon('amount')}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-800"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort('spoc')}
                      className="inline-flex items-center gap-2 font-bold text-slate-800 hover:text-slate-950"
                    >
                      SPOC{' '}
                      <span className="text-[0.7rem]">
                        {sortIcon('spoc')}
                      </span>
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-gray-800"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr id="expense-add-row" className="bg-[#f4fcfb]">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={draft.description}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          description: e.target.value,
                        })
                      }
                      placeholder="e.g. Ice Cubes"
                      className="w-full min-w-[12rem] rounded-lg border border-teal-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      value={draft.amount}
                      onChange={(e) =>
                        setDraft({ ...draft, amount: e.target.value })
                      }
                      placeholder="0"
                      className="w-full min-w-[6rem] rounded-lg border border-teal-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      list="expense-spoc-options"
                      value={draft.spoc}
                      onChange={(e) =>
                        setDraft({ ...draft, spoc: e.target.value })
                      }
                      placeholder="SPOC"
                      className="w-full min-w-[6rem] rounded-lg border border-teal-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex flex-col items-end">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void handleAdd()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-600 disabled:opacity-50"
                      >
                        <Plus size={14} />
                        Add row
                      </button>
                      <ActionFeedback feedback={addFeedback} />
                    </div>
                  </td>
                </tr>

                {paginatedItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      {emptyTableMessage}. Use the row above to add one.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr
                      key={item.id}
                      className="odd:bg-white even:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-800">
                        {item.description}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">
                        {formatCurrency(Number(item.amount))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {item.spoc}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex flex-col items-end gap-1">
                          {pendingDeleteId === item.id ? (
                            <div className="flex flex-col items-end gap-1">
                              <p className="max-w-[10rem] text-right text-[11px] text-gray-600">
                                Delete &quot;{item.description}&quot;?
                              </p>
                              <div className="flex gap-1">
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteConfirm(item)}
                                  className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeleteCancel}
                                  className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleDeleteRequest(item)}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                              title="Delete expense"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          )}
                          <ActionFeedback
                            feedback={
                              deleteFeedbackId === item.id
                                ? deleteFeedback
                                : null
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <datalist id="expense-spoc-options">
              {spocOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          {sortedItems.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-gray-500">
                {pageStart}–{pageEnd} of {sortedItems.length} in period ·{' '}
                {EXPENSES_PER_PAGE} per page
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
                  className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
