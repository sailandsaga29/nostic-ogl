/* eslint-disable @typescript-eslint/no-unused-vars */

import Header from '../../components/Layout/Header';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { API_BASE_URL } from '../../config/env';
import { sortByName } from '../../utils/sortByName';

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

type MonthName = (typeof MONTH_NAMES)[number];

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

export default function Flavors() {
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

  const [sortBy, setSortBy] =
    useState('name');

  const [showCreateModal, setShowCreateModal] =
    useState<boolean>(false);

  const [availableYears, setAvailableYears] =
    useState<number[]>([]);

  const [availableMonths, setAvailableMonths] =
    useState<number[]>([]);

  const [isFilteringByMonth, setIsFilteringByMonth] =
    useState<boolean>(false);

  const [yearsLoading, setYearsLoading] =
    useState(true);

  const [newFlavor, setNewFlavor] =
    useState({
      name: '',
      category: '',
      description: '',
      price: 0,
      stock: 0,
      minStock: 0,
      image: '',
      isActive: true,
      isSeasonal: false,
    });

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

  const categories = [
    'All',
    ...[
      'Popsicles',
      'Sugar Free',
      'Cones',
      '100 ML',
      '500 ML',
      'SIP UPS',
      'Sorbet',
    ].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })),
  ];

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
            item.stock * item.price,
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
    // initial load: fetch all flavors and available years
    fetchFlavors();
    fetchAvailableYears();
  }, []);

  useEffect(() => {
    if (availableYears.length > 0) {
      fetchMonthsByYear(selectedYear);
    }
  }, [selectedYear]);

  // Whenever month or year changes, refresh the table data
  useEffect(() => {
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

  const adjustStock = async (
    id: number,
    change: number
  ) => {
    try {
      const response = await fetch(
        `${API_URL}/${id}/stock`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            change,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        alert(
          `Stock update failed: ${result?.message || response.statusText}`
        );
        return;
      }

      setData((prev) =>
        prev.map((item) => {
          if (item.id !== id) {
            return item;
          }

          const newStock = Number(item.stock || 0) + change;
          const quantityDelta = change > 0 ? change : 0;
          const newQuantity = (item.quantity ?? 0) + quantityDelta;

          return {
            ...item,
            stock: newStock,
            quantity: newQuantity,
            revenue: newQuantity * item.price,
          };
        })
      );

      refreshFlavors();
    } catch (err) {
      alert('Stock update failed');
    }
  };

  const toggleFlavorActive = async (
    id: number,
    currentState = false
  ) => {
    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !currentState,
        }),
      });

      refreshFlavors();
    } catch (err) {
      alert('Failed to update flavor status');
    }
  };

  /*
  =========================================
  FILTER + SORT
  =========================================
  */

  const filteredData = useMemo(() => {
    let filtered =
      selectedCategory === 'All'
        ? [...data]
        : data.filter(
          (x) =>
            x.category ===
            selectedCategory
        );

    switch (sortBy) {
      case 'price':
        filtered.sort(
          (a, b) => b.price - a.price
        );
        break;

      case 'quantity':
        filtered.sort(
          (a, b) =>
            b.quantity - a.quantity
        );
        break;

      case 'revenue':
        filtered.sort(
          (a, b) =>
            b.revenue - a.revenue
        );
        break;

      case 'name':
      default:
        return sortByName(filtered);
    }

    return filtered;
  }, [selectedCategory, data, sortBy]);

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
    <div className="min-h-screen bg-[#fafafa]">
      <Header />

      {/* HERO */}
      <section className="mx-6 mt-6 rounded-[30px] overflow-hidden bg-gradient-to-r from-[#8bd8bf] to-[#33c3b3]">
        <div className="py-16 text-center text-white">
          <h1
            className="text-5xl font-bold"
            style={{
              fontFamily: 'cursive',
            }}
          >
            Our Flavors
          </h1>

          <p className="mt-4 text-lg text-white/90">
            Explore our complete collection
            of handcrafted ice cream
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* MONTHS */}
        <div className="flex flex-wrap gap-3 mb-8">
          {months.map((month) => {
            const active =
              selectedMonth === month;
            const isNow = isCurrentMonth(
              selectedYear,
              getMonthNumber(month),
            );

            return (
              <button
                key={month}
                onClick={() =>
                  setSelectedMonth(month)
                }
                className={`
                  px-5 py-2 rounded-full text-sm border transition

                  ${active
                    ? 'bg-teal-500 text-white border-teal-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-teal-400'
                  }
                `}
              >
                {month}
                {isNow ? ' (now)' : ''}
              </button>
            );
          })}
        </div>


        {/* ACTIONS */}
        <div className="flex justify-end mb-6">
          {/* FILTERS */}

          {/* CATEGORY */}
          <select
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(
                e.target.value
              )
            }
            className="border border-gray-200 rounded-xl px-4 py-3 bg-white"
          >
            {categories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>

          {/* YEAR */}
          <select
            value={selectedYear}
            onChange={(e) =>
              setSelectedYear(
                Number(e.target.value)
              )
            }
            className="border border-gray-200 rounded-xl px-4 py-3 bg-white"
            disabled={yearsLoading}
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

          {/* SORT */}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value)
            }
            className="border border-gray-200 rounded-xl px-4 py-3 bg-white"
          >
            <option value="name">
              Sort by Name
            </option>

            <option value="price">
              Sort by Price
            </option>

            <option value="quantity">
              Sort by Quantity
            </option>

            <option value="revenue">
              Sort by Revenue
            </option>
          </select>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-teal-500 hover:bg-teal-600 text-black px-5 py-3 rounded-xl"
          >
            + Add Flavor
          </button>
        </div>

        {/* CREATE MODAL */}
        {showCreateModal ? (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden">
              {/* HEADER */}
              <div className="bg-gradient-to-r from-[#8bd8bf] to-[#33c3b3] px-8 py-6">
                <h2 className="text-3xl font-bold text-white">Add New Flavor</h2>
                <p className="text-white/90 mt-2">Create a new handcrafted flavor</p>
              </div>

              {/* BODY */}
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-sm text-gray-500 mb-2 block">Flavor Name</label>
                    <input
                      type="text"
                      value={newFlavor.name}
                      onChange={(e) =>
                        setNewFlavor({ ...newFlavor, name: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 mb-2 block">Category</label>
                    <input
                      type="text"
                      value={newFlavor.category}
                      onChange={(e) =>
                        setNewFlavor({ ...newFlavor, category: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 mb-2 block">Price</label>
                    <input
                      type="number"
                      value={newFlavor.price}
                      onChange={(e) =>
                        setNewFlavor({ ...newFlavor, price: Number(e.target.value) })
                      }
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 mb-2 block">Stock</label>
                    <input
                      type="number"
                      value={newFlavor.stock}
                      onChange={(e) =>
                        setNewFlavor({ ...newFlavor, stock: Number(e.target.value) })
                      }
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 mb-2 block">Minimum Stock</label>
                    <input
                      type="number"
                      value={newFlavor.minStock}
                      onChange={(e) =>
                        setNewFlavor({ ...newFlavor, minStock: Number(e.target.value) })
                      }
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-500 mb-2 block">Image URL</label>
                    <input
                      type="text"
                      value={newFlavor.image}
                      onChange={(e) =>
                        setNewFlavor({ ...newFlavor, image: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-2xl px-4 py-3 outline-none focus:border-teal-400"
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

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-6 py-3 rounded-2xl border border-gray-200 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(API_URL, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify(newFlavor),
                        });

                        if (!response.ok) {
                          throw new Error('Failed to create flavor');
                        }

                        fetchFlavors();

                        setShowCreateModal(false);

                        setNewFlavor({
                          name: '',
                          category: '',
                          description: '',
                          price: 0,
                          stock: 0,
                          minStock: 0,
                          image: '',
                          isActive: true,
                          isSeasonal: false,
                        });

                        alert('Flavor created!');
                      } catch (err) {
                        alert('Create failed');
                      }
                    }}
                    className="px-6 py-3 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white transition"
                  >
                    Create Flavor
                  </button>
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
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">
                    Flavour
                  </th>

                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-600">
                    Category
                  </th>

                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-600">
                    Quantity
                  </th>

                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-600">
                    Carry Forwarded
                  </th>

                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-600">
                    Current Stock
                  </th>

                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-600">
                    Price Per Unit
                  </th>

                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-600">
                    Invested Amount

                  </th>

                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-600">
                    Sales Status
                  </th>

                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition"
                    >
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {item.name}
                      </td>

                      <td className="px-6 py-4 text-center text-gray-700">
                        {item.category}
                      </td>

                      <td className="px-6 py-4 text-center text-gray-700">
                        {item.quantity}
                      </td>

                      <td className="px-6 py-4 text-center text-gray-700">
                        {isFilteringByMonth ? item.carryForwarded ?? 0 : '—'}
                      </td>

                      <td className="px-6 py-4 text-center text-gray-700">
                        {item.stock ?? 0}
                      </td>

                      <td className="px-6 py-4 text-center text-gray-700">
                        ₹{item.price}
                      </td>

                      <td className="px-6 py-4 text-center font-semibold text-teal-600">
                        ₹{item.revenue}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${item.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                          {item.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => {
                              const qty = prompt(
                                `Enter quantity for ${item.name}`,
                                '1'
                              );

                              if (!qty) return;

                              const quantity = Number(qty);

                              if (
                                isNaN(quantity) ||
                                quantity <= 0
                              ) {
                                alert('Enter valid quantity');
                                return;
                              }

                              adjustStock(item.id, quantity);
                            }}
                            className="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg text-sm hover:bg-blue-200 flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Add
                          </button>

                          <button
                            onClick={() =>
                              toggleFlavorActive(
                                item.id,
                                item.isActive
                              )
                            }
                            className={`px-3 py-1 rounded-lg text-sm transition ${item.isActive
                              ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            title={
                              item.isActive
                                ? 'Disable flavor'
                                : 'Enable flavor'
                            }
                          >
                            {item.isActive ? (
                              <Eye size={16} />
                            ) : (
                              <EyeOff size={16} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
        </div>
      </main>
    </div>
  );
}