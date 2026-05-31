/* eslint-disable @typescript-eslint/no-unused-vars */

import Header from '../../components/Layout/Header';
import {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Plus, Eye, EyeOff } from 'lucide-react';

type FlavorItem = {
  id: string;
  name: string;
  category: string;
  description?: string;
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

  const API_URL =
    'http://localhost:3000/api/flavors';

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
    useState('May');

  const [selectedYear, setSelectedYear] =
    useState(2026);

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('All');

  const months = [
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
  ];

  // Convert month name to number (1-12)
  const getMonthNumber = (monthName: string): number => {
    return months.indexOf(monthName) + 1;
  };

  // Convert month number to name
  const getMonthName = (monthNum: number): string => {
    return months[monthNum - 1] || '';
  };

  // Check if current selection has data
  const hasDataForSelection =
    availableYears.includes(selectedYear) &&
    availableMonths.includes(getMonthNumber(selectedMonth));

  const categories = [
    'All',
    'Popsicles',
    'Sugar Free',
    'Cones',
    '100 ML',
    '500 ML',
    'SIP UPS',
    'Sorbet',
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

      // If current month is not available, set to first available
      const currentMonthNum = getMonthNumber(selectedMonth);
      if (numericMonths.length > 0 && !numericMonths.includes(currentMonthNum)) {
        setSelectedMonth(getMonthName(numericMonths[0]));
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
        setData(mapped);
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

      // Expect result already mapped by backend
      setData(result);
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
    id: string,
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

          return {
            ...item,
            stock: newStock,
            quantity: (item.quantity ?? 0) + change,
            revenue: ((item.quantity ?? 0) + change) * item.price,
          };
        })
      );

      refreshFlavors();
    } catch (err) {
      alert('Stock update failed');
    }
  };

  const toggleFlavorActive = async (
    id: string,
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

      default:
        filtered.sort((a, b) =>
          a.name.localeCompare(b.name)
        );
    }

    return filtered;
  }, [selectedCategory, data, sortBy]);

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
          {/* DATA AVAILABILITY MESSAGE (metadata says no months/years) */}
          {!hasDataForSelection && data.length === 0 && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
              <p className="text-amber-800 text-sm">
                <span className="font-semibold">ℹ️ No data available</span> for {selectedMonth} {selectedYear}.
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
                    Status
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
                      colSpan={8}
                      className="text-center py-10 text-gray-500"
                    >
                      {loading ? 'Loading flavors...' : `No flavors found for ${selectedMonth} ${selectedYear}`}
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