/* eslint-disable @typescript-eslint/no-unused-vars */

import ActionFeedback from '../../components/ActionFeedback';
import { useTimedFeedback } from '../../hooks/useTimedFeedback';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import TableRefreshButton from '../../components/TableRefreshButton';
import { API_BASE_URL } from '../../config/env';
import { sortByName } from '../../utils/sortByName';
import {
  isLowStock,
  sortColumnIcon,
  sortFlavorList,
  type FlavorListSortKey,
  type SortDirection,
} from '../../utils/flavorListSort';
import type { AdminPageProps } from '../../types/adminPage';
import { getMemberPrice } from '../../utils/flavorPricing';
import { formatRupeeAmount } from '../../utils/partyOrderCalc';

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

const FLAVORS_PER_PAGE = 10;

const BASE_FLAVOR_CATEGORIES = [
  'Popsicles',
  'Sugar Free',
  'Cones',
  '100 ML',
  '500 ML',
  'SIP Ups',
  'Sorbet',
] as const;

const RequiredMark = () => (
  <span className="text-red-500" aria-hidden>
    {' '}
    *
  </span>
);

const emptyNewFlavorForm = () => ({
  name: '',
  category: '',
  description: '',
  price: 0,
  stock: 0,
  image: '',
  isActive: true,
  isSeasonal: false,
});

const flavorToForm = (flavor: FlavorItem) => ({
  name: flavor.name ?? '',
  category: flavor.category ?? '',
  description: flavor.description ?? '',
  price: Number(flavor.price ?? 0),
  stock: Number(flavor.stock ?? 0),
  image: flavor.image ?? '',
  isActive: flavor.isActive !== false,
  isSeasonal: flavor.isSeasonal === true,
});

type FlavorForm = ReturnType<typeof emptyNewFlavorForm>;

const normalizeCategory = (category: string) =>
  category.trim().toLowerCase().replace(/\s+/g, ' ');

const categoriesMatch = (a: string, b: string) =>
  normalizeCategory(a) === normalizeCategory(b);

type FlavorItem = {
  id: number;
  name: string;
  category: string;
  description?: string;
  carryForwarded: number;
  quantity: number;
  price: number;
  revenue: number;
  stock: number;
  minStock?: number;
  image?: string;
  isActive?: boolean;
  isSeasonal?: boolean;
};

export default function Flavors({ isActive = true }: AdminPageProps) {
  const hasLoadedRef = useRef(false);
  const [searchParams] = useSearchParams();
  /*
  =========================================
  API
  =========================================
  */

  const API_URL = `${API_BASE_URL}/flavors`;

  const token =
    localStorage.getItem('accessToken');

  /*
  =========================================
  STATE
  =========================================
  */

  const [data, setData] = useState<
    FlavorItem[]
  >([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] = useState('');

  const [sortBy, setSortBy] = useState<FlavorListSortKey>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [page, setPage] = useState(1);

  const toggleColumnSort = (key: FlavorListSortKey) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(key);
    setSortDir('asc');
  };

  useEffect(() => {
    if (!isActive) return;

    const sort = searchParams.get('sort');
    const dir = searchParams.get('dir');
    if (sort !== 'stock' || dir !== 'asc') return;

    setSortBy('stock');
    setSortDir('asc');
    setPage(1);
  }, [isActive, searchParams]);

  const [showCreateModal, setShowCreateModal] =
    useState<boolean>(false);
  const [editingFlavorId, setEditingFlavorId] = useState<number | null>(null);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEditDrafts, setBulkEditDrafts] = useState<Record<number, FlavorForm>>(
    {},
  );

  const [availableYears, setAvailableYears] =
    useState<number[]>([]);

  const [availableMonths, setAvailableMonths] =
    useState<number[]>([]);

  const [isFilteringByMonth, setIsFilteringByMonth] =
    useState<boolean>(false);

  const [yearsLoading, setYearsLoading] =
    useState(true);

  const [newFlavor, setNewFlavor] = useState(emptyNewFlavorForm);

  const { feedback: createFeedback, setFeedback: setCreateFeedback } =
    useTimedFeedback();
  const { feedback: editRowFeedback, setFeedback: setEditRowFeedback } =
    useTimedFeedback();
  const [editRowFeedbackId, setEditRowFeedbackId] = useState<number | null>(null);
  const isEditingFlavor = editingFlavorId !== null;

  useEffect(() => {
    if (!editRowFeedback) setEditRowFeedbackId(null);
  }, [editRowFeedback]);

  /*
  =========================================
  FILTERS
  =========================================
  */

  const [selectedMonth, setSelectedMonth] =
    useState<MonthName>(() => MONTH_NAMES[new Date().getMonth()]);

  const [selectedYear, setSelectedYear] =
    useState(() => new Date().getFullYear());

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('All');

  const months = MONTH_NAMES;

  // Convert month name to number (1-12)
  const getMonthNumber = (monthName: MonthName): number => {
    return months.indexOf(monthName) + 1;
  };

  // Convert month number to name
  const getMonthName = (monthNum: number): MonthName => {
    return months[monthNum - 1] ?? MONTH_NAMES[0];
  };

  const isFutureMonth = (year: number, monthNum: number): boolean => {
    const now = new Date();
    const cy = now.getFullYear();
    const cm = now.getMonth() + 1;
    return year > cy || (year === cy && monthNum > cm);
  };

  const isCurrentMonth = (year: number, monthNum: number): boolean => {
    const now = new Date();
    return year === now.getFullYear() && monthNum === now.getMonth() + 1;
  };

  const selectedMonthNum = getMonthNumber(selectedMonth);
  const selectedIsFutureMonth = isFutureMonth(selectedYear, selectedMonthNum);

  const categories = useMemo(
    () => [
      'All',
      ...[...BASE_FLAVOR_CATEGORIES].sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' }),
      ),
    ],
    [],
  );

  const flavorCategoryOptions = useMemo(() => {
    const merged = new Set<string>(BASE_FLAVOR_CATEGORIES);
    data.forEach((item) => {
      const cat = item.category?.trim();
      if (cat) merged.add(cat);
    });
    return Array.from(merged).sort((a, b) =>
      a.localeCompare(b, 'en', { sensitivity: 'base' }),
    );
  }, [data]);

  /*
  =========================================
  FETCH FLAVORS
  =========================================
  */

  const fetchAvailableYears = async () => {
    try {
      const response = await fetch(
        `${API_URL}/meta/years`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch years'
        );
      }

      const years = await response.json();
      // Ensure years are numbers (DB/raw queries may return strings)
      const numericYears = years.map((y: any) => Number(y));
      setAvailableYears(numericYears);

      // Set the first available year as default
      if (numericYears.length > 0) {
        setSelectedYear(Number(numericYears[0]));
      }
    } catch (err) {
      console.error('Failed to fetch years');
    } finally {
      setYearsLoading(false);
    }
  };

  const fetchMonthsByYear = async (year: number) => {
    try {
      const response = await fetch(
        `${API_URL}/meta/months/${year}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch months'
        );
      }

      const months = await response.json();
      // Ensure months are numbers (DB/raw queries may return strings)
      const numericMonths = months.map((m: any) => Number(m));
      setAvailableMonths(numericMonths);

      const now = new Date();
      const currentMonthNum = now.getMonth() + 1;
      if (year === now.getFullYear() && numericMonths.includes(currentMonthNum)) {
        setSelectedMonth(getMonthName(currentMonthNum));
      } else if (
        numericMonths.length > 0 &&
        !numericMonths.includes(getMonthNumber(selectedMonth))
      ) {
        setSelectedMonth(getMonthName(numericMonths[numericMonths.length - 1]));
      }
    } catch (err) {
      console.error('Failed to fetch months');
    }
  };

  const fetchFlavors = async () => {
    try {
      setLoading(true);
      // indicate this is a full fetch (not month-filtered)
      // do not immediately clear `isFilteringByMonth` here; we'll check before applying data

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          'Failed to fetch flavors'
        );
      }

      const result = await response.json();

      const mapped = result.map(
        (item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          description: item.description,
          carryForwarded: 0,
          quantity: item.stock,
          stock: item.stock,
          minStock: item.minStock,
          price: item.price,
          revenue:
            Number(item.stock ?? 0) * getMemberPrice(Number(item.price ?? 0)),
          image: item.image,
          isActive: item.isActive,
          isSeasonal: item.isSeasonal,
        })
      );

      // If a month-filtered request is currently active, avoid overwriting its results
      if (!isFilteringByMonth) {
        setData(sortByName(mapped));
      }
    } catch (err) {
      setError('Failed to fetch flavors');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlavorsForMonthYear = async (year: number, monthNum: number) => {
    try {
      setLoading(true);
      setIsFilteringByMonth(true);

      const response = await fetch(
        `${API_URL}/monthly/${year}/${monthNum}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        // If backend returns 404 or empty, set data to empty array
        setData([]);
        return;
      }

      const result = await response.json();

      setData(sortByName(Array.isArray(result) ? result : []));
    } catch (err) {
      setError('Failed to fetch monthly flavors');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isActive || hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    fetchAvailableYears();
  }, [isActive]);

  useEffect(() => {
    if (!isActive || availableYears.length === 0) {
      return;
    }
    fetchMonthsByYear(selectedYear);
  }, [isActive, selectedYear, availableYears.length]);

  // Whenever month or year changes, refresh the table data
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const monthNum = getMonthNumber(selectedMonth);

    // If no month selected => show all
    if (!selectedMonth) {
      setIsFilteringByMonth(false);
      fetchFlavors();
      return;
    }

    // If no year selected, fallback to full fetch
    if (!selectedYear) {
      setIsFilteringByMonth(false);
      fetchFlavors();
      return;
    }

    if (isFutureMonth(selectedYear, monthNum)) {
      setIsFilteringByMonth(true);
      setData([]);
      setLoading(false);
      return;
    }

    // User explicitly selected a month and year — always try monthly endpoint
    fetchFlavorsForMonthYear(selectedYear, monthNum);
  }, [selectedMonth, selectedYear]);

  /*
  =========================================
  CREATE FLAVOR
  =========================================
  */


  /*
  =========================================
  UPDATE STOCK
  =========================================
  */

  const refreshFlavors = () => {
    const monthNum = getMonthNumber(selectedMonth);

    if (
      isFilteringByMonth &&
      selectedMonth &&
      selectedYear > 0
    ) {
      fetchFlavorsForMonthYear(selectedYear, monthNum);
    } else {
      fetchFlavors();
    }
  };

  const closeFlavorModal = () => {
    setShowCreateModal(false);
    setEditingFlavorId(null);
    setNewFlavor(emptyNewFlavorForm());
    setCreateFeedback(null);
  };

  const cancelInlineEdit = (clearFeedback = true) => {
    setEditingFlavorId(null);
    setNewFlavor(emptyNewFlavorForm());
    if (clearFeedback) {
      setEditRowFeedback(null);
      setEditRowFeedbackId(null);
    }
  };

  const openInlineEdit = (item: FlavorItem) => {
    setEditingFlavorId(item.id);
    setNewFlavor(flavorToForm(item));
    setEditRowFeedback(null);
    setEditRowFeedbackId(null);
  };

  const saveInlineEdit = async (id: number) => {
    const name = newFlavor.name.trim();
    if (!name) {
      setEditRowFeedbackId(id);
      setEditRowFeedback({
        type: 'error',
        message: 'Flavor name is required',
      });
      return;
    }
    if (!newFlavor.category) {
      setEditRowFeedbackId(id);
      setEditRowFeedback({
        type: 'error',
        message: 'Please select a category',
      });
      return;
    }
    if (Number(newFlavor.price) < 0) {
      setEditRowFeedbackId(id);
      setEditRowFeedback({
        type: 'error',
        message: 'Price must be 0 or greater',
      });
      return;
    }
    if (Number(newFlavor.stock) < 0) {
      setEditRowFeedbackId(id);
      setEditRowFeedback({
        type: 'error',
        message: 'Stock must be 0 or greater',
      });
      return;
    }

    const payload: Record<string, unknown> = {
      name,
      category: newFlavor.category,
      price: Number(newFlavor.price),
      stock: Number(newFlavor.stock),
      isActive: newFlavor.isActive,
      isSeasonal: newFlavor.isSeasonal,
    };

    const description = newFlavor.description.trim();
    payload.description = description;

    const image = newFlavor.image.trim();
    payload.image = image;

    try {
      setEditRowFeedback(null);
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const msg =
          typeof errBody?.message === 'string'
            ? errBody.message
            : Array.isArray(errBody?.message)
              ? errBody.message.join(', ')
              : 'Failed to update flavor';
        throw new Error(msg);
      }

      cancelInlineEdit(false);
      setEditRowFeedbackId(id);
      setEditRowFeedback({
        type: 'success',
        message: 'Flavor updated',
      });
      refreshFlavors();
    } catch (err) {
      setEditRowFeedbackId(id);
      setEditRowFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Update failed',
      });
    }
  };

  const saveBulkEdit = async () => {
    const items = paginatedData.map((item) => ({
      id: item.id,
      ...(bulkEditDrafts[item.id] ?? flavorToForm(item)),
    }));

    for (const item of items) {
      const name = item.name.trim();
      if (!name) {
        setEditRowFeedbackId(item.id);
        setEditRowFeedback({
          type: 'error',
          message: 'Flavor name is required',
        });
        return;
      }
      if (!item.category) {
        setEditRowFeedbackId(item.id);
        setEditRowFeedback({
          type: 'error',
          message: 'Please select a category',
        });
        return;
      }
      if (Number(item.price) < 0) {
        setEditRowFeedbackId(item.id);
        setEditRowFeedback({
          type: 'error',
          message: 'Price must be 0 or greater',
        });
        return;
      }
      if (Number(item.stock) < 0) {
        setEditRowFeedbackId(item.id);
        setEditRowFeedback({
          type: 'error',
          message: 'Stock must be 0 or greater',
        });
        return;
      }
    }

    try {
      setEditRowFeedback(null);
      const response = await fetch(`${API_URL}/bulk-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            name: item.name.trim(),
            category: item.category,
            description: item.description.trim(),
            price: Number(item.price),
            stock: Number(item.stock),
            image: item.image.trim(),
            isActive: item.isActive,
            isSeasonal: item.isSeasonal,
          })),
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        const msg =
          typeof errBody?.message === 'string'
            ? errBody.message
            : Array.isArray(errBody?.message)
              ? errBody.message.join(', ')
              : 'Failed to update flavors';
        throw new Error(msg);
      }

      cancelBulkEdit();
      setCreateFeedback({
        type: 'success',
        message: 'Flavor list updated',
      });
      refreshFlavors();
    } catch (err) {
      setEditRowFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Bulk update failed',
      });
      setEditRowFeedbackId(items[0]?.id ?? null);
    }
  };

  /*
  =========================================
  FILTER + SORT
  =========================================
  */

  const filteredData = useMemo(() => {
    const filtered =
      selectedCategory === 'All'
        ? [...data]
        : data.filter((x) =>
            categoriesMatch(x.category ?? '', selectedCategory),
          );

    return sortFlavorList(filtered, sortBy, sortDir);
  }, [selectedCategory, data, sortBy, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedMonth, selectedYear, sortBy, sortDir]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / FLAVORS_PER_PAGE),
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * FLAVORS_PER_PAGE;
    return filteredData.slice(start, start + FLAVORS_PER_PAGE);
  }, [filteredData, page]);

  const startBulkEdit = () => {
    const drafts = Object.fromEntries(
      paginatedData.map((item) => [item.id, flavorToForm(item)]),
    ) as Record<number, FlavorForm>;
    setBulkEditDrafts(drafts);
    setIsBulkEditing(true);
    setEditingFlavorId(null);
    setEditRowFeedback(null);
    setEditRowFeedbackId(null);
  };

  const cancelBulkEdit = () => {
    setIsBulkEditing(false);
    setBulkEditDrafts({});
    setEditRowFeedback(null);
    setEditRowFeedbackId(null);
  };

  const updateBulkDraft = (
    id: number,
    patch: Partial<FlavorForm>,
  ) => {
    setBulkEditDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const pageStart =
    filteredData.length === 0 ? 0 : (page - 1) * FLAVORS_PER_PAGE + 1;
  const pageEnd = Math.min(page * FLAVORS_PER_PAGE, filteredData.length);

  const totalMonthlyInvested = useMemo(
    () =>
      data.reduce(
        (sum, item) => sum + Number(item.revenue ?? 0),
        0,
      ),
    [data],
  );

  const formatInvested = (value: number) =>
    `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const showNoDataBanner =
    !loading && isFilteringByMonth && filteredData.length === 0;

  const emptyTableMessage = loading
    ? 'Loading flavors...'
    : selectedIsFutureMonth
      ? `No data found for ${selectedMonth} ${selectedYear} (future month)`
      : `No data found for ${selectedMonth} ${selectedYear}`;

  return (
    <div className="bg-[#fafafa]">

      <ActionFeedback feedback={createFeedback && !showCreateModal ? createFeedback : null} />

      {/* HERO — compact */}
      {/* <section className="mx-4 mt-4 overflow-hidden rounded-2xl bg-gradient-to-r from-[#8bd8bf] to-[#33c3b3] sm:mx-6 sm:mt-5">
        <div className="px-4 py-7 text-center text-white sm:py-9">
          <h1
            className="text-3xl font-bold sm:text-4xl"
            style={{ fontFamily: 'cursive' }}
          >
            Our Flavors
          </h1>
          <p className="mt-1.5 text-sm text-white/90 sm:text-base">
            Handcrafted ice cream — browse by month & category
          </p> */}
        {/* </div>
      </section> */}

      <main className="mx-auto max-w-7xl px-4 py-5 sm:py-6">
        {/* Toolbar: period summary, filters, scrollable months */}
        <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Viewing
              </p>
              <p className="truncate text-sm font-semibold text-gray-800">
                {selectedMonth}
                {isCurrentMonth(
                  selectedYear,
                  getMonthNumber(selectedMonth),
                )
                  ? ' (now)'
                  : ''}{' '}
                · {selectedYear}
                {selectedCategory !== 'All'
                  ? ` · ${selectedCategory}`
                  : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <select
                value={selectedCategory}
                onChange={(e) =>
                  setSelectedCategory(e.target.value)
                }
                className="min-w-[7rem] shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-teal-400 focus:bg-white"
                aria-label="Filter by category"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) =>
                  setSelectedYear(Number(e.target.value))
                }
                className="min-w-[5.5rem] shrink-0 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 outline-none focus:border-teal-400 focus:bg-white disabled:opacity-60"
                disabled={yearsLoading}
                aria-label="Filter by year"
              >
                {yearsLoading ? (
                  <option>Loading years...</option>
                ) : availableYears.length > 0 ? (
                  availableYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))
                ) : (
                  <option>No years available</option>
                )}
              </select>

              <button
                type="button"
                onClick={() => {
                  setEditingFlavorId(null);
                  setNewFlavor(emptyNewFlavorForm());
                  setCreateFeedback(null);
                  setShowCreateModal(true);
                }}
                className="shrink-0 rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-teal-600"
              >
                + Add Flavor
              </button>
            </div>
          </div>

          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Month
            </p>
            <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-w-max gap-1.5">
                {months.map((month, index) => {
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

        {/* CREATE MODAL */}
        {showCreateModal ? (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* HEADER */}
              <div className="bg-gradient-to-r from-[#8bd8bf] to-[#33c3b3] px-8 py-6">
                <h2 className="text-3xl font-bold text-white">
                  {isEditingFlavor ? 'Edit Flavor' : 'Add New Flavor'}
                </h2>
                <p className="mt-2 text-white/90">
                  {isEditingFlavor
                    ? 'Update this flavor entry'
                    : 'Create a new handcrafted flavor'}
                </p>
              </div>

              {/* BODY */}
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="mb-2 block text-sm text-gray-500">
                      Flavor Name
                      <RequiredMark />
                    </label>
                    <input
                      type="text"
                      required
                      value={newFlavor.name}
                      onChange={(e) =>
                        setNewFlavor({ ...newFlavor, name: e.target.value })
                      }
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-500">
                      Category
                      <RequiredMark />
                    </label>
                    <select
                      required
                      value={newFlavor.category}
                      onChange={(e) =>
                        setNewFlavor({
                          ...newFlavor,
                          category: e.target.value,
                        })
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-800 outline-none focus:border-teal-400"
                    >
                      <option value="">Select category</option>
                      {flavorCategoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-500">
                      Staff Price
                      <RequiredMark />
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newFlavor.price}
                      onChange={(e) =>
                        setNewFlavor({
                          ...newFlavor,
                          price: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-gray-500">
                      Stock
                      <RequiredMark />
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={newFlavor.stock}
                      onChange={(e) =>
                        setNewFlavor({
                          ...newFlavor,
                          stock: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-teal-400"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm text-gray-500">
                      Image URL <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={newFlavor.image}
                      onChange={(e) =>
                        setNewFlavor({ ...newFlavor, image: e.target.value })
                      }
                      placeholder="https://..."
                      className="w-full rounded-2xl border border-gray-200 px-4 py-3 outline-none focus:border-teal-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 mb-2 block">Description</label>
                  <textarea
                    value={newFlavor.description}
                    onChange={(e) => setNewFlavor({ ...newFlavor, description: e.target.value })}
                    rows={4}
                    className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-teal-400 resize-none"
                  />
                </div>

                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={newFlavor.isActive}
                      onChange={(e) => setNewFlavor({ ...newFlavor, isActive: e.target.checked })}
                    />

                    <span>Active Flavor</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={newFlavor.isSeasonal}
                      onChange={(e) => setNewFlavor({ ...newFlavor, isSeasonal: e.target.checked })}
                    />

                    <span>Seasonal Flavor</span>
                  </label>
                </div>

                <div className="flex flex-col items-end gap-2 pt-4">
                  <div className="flex justify-end gap-4">
                  <button
                    onClick={closeFlavorModal}
                    className="px-6 py-3 rounded-2xl border border-gray-200 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={async () => {
                      const name = newFlavor.name.trim();
                      if (!name) {
                        setCreateFeedback({
                          type: 'error',
                          message: 'Flavor name is required',
                        });
                        return;
                      }
                      if (!newFlavor.category) {
                        setCreateFeedback({
                          type: 'error',
                          message: 'Please select a category',
                        });
                        return;
                      }
                      if (Number(newFlavor.price) < 0) {
                        setCreateFeedback({
                          type: 'error',
                          message: 'Price must be 0 or greater',
                        });
                        return;
                      }
                      if (Number(newFlavor.stock) < 0) {
                        setCreateFeedback({
                          type: 'error',
                          message: 'Stock must be 0 or greater',
                        });
                        return;
                      }

                      const payload: Record<string, unknown> = {
                        name,
                        category: newFlavor.category,
                        price: Number(newFlavor.price),
                        stock: Number(newFlavor.stock),
                        isActive: newFlavor.isActive,
                        isSeasonal: newFlavor.isSeasonal,
                      };

                      const description = newFlavor.description.trim();
                      if (description) payload.description = description;

                      const image = newFlavor.image.trim();
                      if (image) payload.image = image;

                      try {
                        setCreateFeedback(null);
                        const response = await fetch(
                          isEditingFlavor
                            ? `${API_URL}/${editingFlavorId}`
                            : API_URL,
                          {
                          method: isEditingFlavor ? 'PUT' : 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify(payload),
                        });

                        if (!response.ok) {
                          const errBody = await response.json().catch(() => null);
                          const msg =
                            typeof errBody?.message === 'string'
                              ? errBody.message
                              : Array.isArray(errBody?.message)
                                ? errBody.message.join(', ')
                                : isEditingFlavor
                                  ? 'Failed to update flavor'
                                  : 'Failed to create flavor';
                          throw new Error(msg);
                        }

                        refreshFlavors();

                        closeFlavorModal();
                        setCreateFeedback({
                          type: 'success',
                          message: isEditingFlavor
                            ? 'Flavor updated'
                            : 'Flavor created',
                        });
                      } catch (err) {
                        setCreateFeedback({
                          type: 'error',
                          message:
                            err instanceof Error
                              ? err.message
                              : isEditingFlavor
                                ? 'Update failed'
                                : 'Create failed',
                        });
                      }
                    }}
                    className="px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white transition"
                  >
                    {isEditingFlavor ? 'Save Changes' : 'Create Flavor'}
                  </button>
                  </div>
                  <ActionFeedback feedback={createFeedback} />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* LOADING */}
        {loading && (
          <div className="text-center py-10 text-gray-500">
            Loading flavors...
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="text-center py-4 text-red-500">
            {error}
          </div>
        )}

        {/* TABLE */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-end gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2 sm:px-6">
            <ActionFeedback feedback={editRowFeedback} />
            {isBulkEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => void saveBulkEdit()}
                  className="rounded-lg bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-teal-600"
                >
                  Save Table
                </button>
                <button
                  type="button"
                  onClick={cancelBulkEdit}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={startBulkEdit}
                disabled={paginatedData.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Pencil size={14} />
                Edit Table
              </button>
            )}
            <TableRefreshButton
              loading={loading}
              onRefresh={refreshFlavors}
              label="Refresh flavors"
            />
          </div>
          {!loading && isFilteringByMonth && (
            <div className="border-b border-teal-100 bg-teal-50 px-6 py-3">
              <p className="text-sm text-red-500">
                <span className="font-semibold">Total invested</span> for{' '}
                {selectedMonth} {selectedYear}:{' '}
                {selectedIsFutureMonth
                  ? '—'
                  : formatInvested(totalMonthlyInvested)}
              </p>
            </div>
          )}

          {isFilteringByMonth &&
            filteredData.some((item) => (item.carryForwarded ?? 0) > 0) && (
              <div className="border-b border-teal-100 bg-teal-50 px-6 py-3">
                <p className="text-sm text-teal-800">
                  <span className="font-semibold">Carry forward applied.</span>{' '}
                  Opening stock for {selectedMonth} {selectedYear} was rolled
                  automatically from the previous month&apos;s remaining stock.
                </p>
              </div>
            )}

          {/* Empty month — no activity or future month */}
          {showNoDataBanner && (
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
              <p className="text-sm text-gray-600">
                {emptyTableMessage}
              </p>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'name'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="px-6 py-4 text-left text-sm font-medium text-gray-600"
                  >
                    <button
                      type="button"
                      onClick={() => toggleColumnSort('name')}
                      className="inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Flavour{' '}
                      <span className="text-[0.7rem]">
                        {sortColumnIcon('name', sortBy, sortDir)}
                      </span>
                    </button>
                  </th>

                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'category'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="px-6 py-4 text-center text-sm font-medium text-gray-600"
                  >
                    <button
                      type="button"
                      onClick={() => toggleColumnSort('category')}
                      className="mx-auto inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Category{' '}
                      <span className="text-[0.7rem]">
                        {sortColumnIcon('category', sortBy, sortDir)}
                      </span>
                    </button>
                  </th>

                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'carryForwarded'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="px-6 py-4 text-center text-sm font-medium text-gray-600"
                  >
                    <button
                      type="button"
                      onClick={() => toggleColumnSort('carryForwarded')}
                      className="mx-auto inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Carry Forwarded{' '}
                      <span className="text-[0.7rem]">
                        {sortColumnIcon('carryForwarded', sortBy, sortDir)}
                      </span>
                    </button>
                  </th>

                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'quantity'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="px-6 py-4 text-center text-sm font-medium text-gray-600"
                  >
                    <button
                      type="button"
                      onClick={() => toggleColumnSort('quantity')}
                      className="mx-auto inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-900"
                    >
                  Restocked Quantity{' '}
                      <span className="text-[0.7rem]">
                        {sortColumnIcon('quantity', sortBy, sortDir)}
                      </span>
                    </button>
                  </th>

                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'stock'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="px-6 py-4 text-center text-sm font-medium text-gray-600"
                  >
                    <button
                      type="button"
                      onClick={() => toggleColumnSort('stock')}
                      className="mx-auto inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Current Stock{' '}
                      <span className="text-[0.7rem]">
                        {sortColumnIcon('stock', sortBy, sortDir)}
                      </span>
                    </button>
                  </th>

                  <th
                    scope="col"
                    className="px-6 py-4 text-center text-sm font-medium text-gray-400"
                  >
                    Staff Price
                  </th>

                  <th
                    scope="col"
                    className="px-6 py-4 text-center text-sm font-medium text-gray-600"
                  >
                    Member Price
                  </th>

                  <th
                    scope="col"
                    aria-sort={
                      sortBy === 'revenue'
                        ? sortDir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    className="px-6 py-4 text-center text-sm font-medium text-gray-600"
                  >
                    <button
                      type="button"
                      onClick={() => toggleColumnSort('revenue')}
                      className="mx-auto inline-flex items-center gap-2 font-semibold text-slate-700 hover:text-slate-900"
                    >
                      Invested Amount{' '}
                      <span className="text-[0.7rem]">
                        {sortColumnIcon('revenue', sortBy, sortDir)}
                      </span>
                    </button>
                  </th>

                  <th className="px-6 py-4 text-center text-sm font-medium text-gray-600">
                    Sales Status
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredData.length > 0 ? (
                  paginatedData.map((item) => {
                    const draft = bulkEditDrafts[item.id] ?? flavorToForm(item);

                    return (
                        <tr
                          key={item.id}
                          className="border-b border-gray-100 transition hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 font-medium text-gray-800">
                            {isBulkEditing ? (
                              <input
                                type="text"
                                value={draft.name}
                                onChange={(e) =>
                                  updateBulkDraft(item.id, { name: e.target.value })
                                }
                                className="w-40 rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-teal-400"
                              />
                            ) : (
                              item.name
                            )}
                          </td>

                          <td className="px-6 py-4 text-center text-gray-700">
                            {isBulkEditing ? (
                              <select
                                value={draft.category}
                                onChange={(e) =>
                                  updateBulkDraft(item.id, { category: e.target.value })
                                }
                                className="w-32 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm outline-none focus:border-teal-400"
                              >
                                <option value="">Select</option>
                                {flavorCategoryOptions.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              item.category
                            )}
                          </td>

                          <td className="px-6 py-4 text-center text-gray-700">
                            {isFilteringByMonth ? item.carryForwarded ?? 0 : '—'}
                          </td>

                          <td className="px-6 py-4 text-center text-gray-700">
                            {item.quantity}
                          </td>

                          <td
                            className={`px-6 py-4 text-center font-semibold ${
                              isLowStock(Number(item.stock ?? 0))
                                ? 'text-red-600'
                                : 'text-gray-700'
                            }`}
                          >
                            {isBulkEditing ? (
                              <input
                                type="number"
                                min={0}
                                value={draft.stock}
                                onChange={(e) =>
                                  updateBulkDraft(item.id, {
                                    stock: Number(e.target.value),
                                  })
                                }
                                className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm font-normal outline-none focus:border-teal-400"
                              />
                            ) : (
                              item.stock ?? 0
                            )}
                          </td>

                          <td className="px-6 py-4 text-center text-sm text-gray-400">
                            {isBulkEditing ? (
                              <input
                                type="number"
                                min={0}
                                value={draft.price}
                                onChange={(e) =>
                                  updateBulkDraft(item.id, {
                                    price: Number(e.target.value),
                                  })
                                }
                                className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-center text-sm text-gray-700 outline-none focus:border-teal-400"
                              />
                            ) : (
                              <>₹{formatRupeeAmount(item.price)}</>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center font-semibold text-teal-700">
                            ₹{formatRupeeAmount(
                              getMemberPrice(isBulkEditing ? draft.price : item.price),
                            )}
                          </td>

                          <td className="px-6 py-4 text-center font-semibold text-teal-600">
                            ₹{formatRupeeAmount(item.revenue)}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {isBulkEditing ? (
                              <div className="flex flex-col items-center gap-2">
                                <label className="flex items-center gap-2 text-xs text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={draft.isActive}
                                    onChange={(e) =>
                                      updateBulkDraft(item.id, {
                                        isActive: e.target.checked,
                                      })
                                    }
                                  />
                                  Active
                                </label>
                                <label className="flex items-center gap-2 text-xs text-gray-500">
                                  <input
                                    type="checkbox"
                                    checked={draft.isSeasonal}
                                    onChange={(e) =>
                                      updateBulkDraft(item.id, {
                                        isSeasonal: e.target.checked,
                                      })
                                    }
                                  />
                                  Seasonal
                                </label>
                              </div>
                            ) : (
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                  item.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {item.isActive ? 'Active' : 'Disabled'}
                              </span>
                            )}
                          </td>
                        </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={9}
                      className="text-center py-10 text-gray-500"
                    >
                      {emptyTableMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredData.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-gray-500">
                {pageStart}–{pageEnd} of {filteredData.length} flavours ·{' '}
                {FLAVORS_PER_PAGE} per page
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