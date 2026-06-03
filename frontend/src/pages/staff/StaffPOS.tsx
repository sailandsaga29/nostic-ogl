import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import api from '../../services/api';
import axios from 'axios';
import StaffPromoCarousel from '../../components/staff/StaffPromoCarousel';
import PhonePeQrModal from '../../components/payments/PhonePeQrModal';
import { sortByName } from '../../utils/sortByName';
import { calculatePartyOrderAmounts } from '../../utils/partyOrderCalc';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=600';

type Product = {
  id: number;
  name: string;
  category: string;
  type: string;
  price: number;
  stock: number;
  image: string;
  isActive: boolean;
  updatedAt?: string;
};

const canAddProduct = (product: Product) =>
  product.isActive && product.stock > 0;

const addButtonLabel = (product: Product) => {
  if (!product.isActive) return 'Not Available';
  if (product.stock <= 0) return 'Out of stock';
  return 'Add';
};

type CartItem = {
  flavorId: number;
  name: string;
  price: number;
  quantity: number;
};

export default function StaffPOS() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    products.forEach((product) => categorySet.add(product.category));
    return [
      'All',
      ...Array.from(categorySet).sort((a, b) =>
        a.localeCompare(b, 'en', { sensitivity: 'base' }),
      ),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const list =
      selectedCategory === 'All'
        ? products
        : products.filter(
            (product) => product.category === selectedCategory,
          );
    return sortByName(list);
  }, [products, selectedCategory]);

  const loadProducts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setProductsLoading(true);
        setProductsError('');
      }
      const response = await api.get('/flavors');
      const flavors = Array.isArray(response.data) ? response.data : [];
      setProducts(
        sortByName(
          flavors.map((flavor: {
            id: number;
            name: string;
            category?: string;
            description?: string;
            price?: number;
            stock?: number;
            image?: string;
            isActive?: boolean;
            updatedAt?: string;
          }) => ({
            id: flavor.id,
            name: flavor.name,
            category: flavor.category ?? 'General',
            type: flavor.description?.trim() || 'Ice Cream',
            price: Number(flavor.price ?? 0),
            stock: Number(flavor.stock ?? 0),
            image: flavor.image?.trim() || PLACEHOLDER_IMAGE,
            isActive: flavor.isActive !== false,
            updatedAt: flavor.updatedAt,
          })),
        ),
      );
    } catch {
      if (showLoading) {
        setProductsError('Failed to load products');
        setProducts([]);
      }
    } finally {
      if (showLoading) {
        setProductsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);
  /*
  =========================================
  STATE
  =========================================
  */

  const [paymentMethod, setPaymentMethod] =
    useState<'CASH' | 'ONLINE'>('CASH');
  const [orderNote, setOrderNote] = useState('');
  const [paymentSession, setPaymentSession] = useState<{
    merchantTransactionId: string;
    qrString: string;
    amount: number;
    expiresAt?: string;
    mockMode?: boolean;
  } | null>(null);
  const [isBulkOrder, setIsBulkOrder] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [bulkTotalAmount, setBulkTotalAmount] = useState('');
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState('0');

  /*
  =========================================
  ADD TO CART
  =========================================
  */

  const addToCart = (product: Product) => {
    if (!product.isActive) {
      alert('This flavor is currently disabled');
      return;
    }
    if (product.stock <= 0) {
      alert('This flavor is out of stock');
      return;
    }
    setCart((prev) => {
      const existing = prev.find(
        (item) => item.flavorId === product.id
      );

      if (existing) {
        return prev.map((item) =>
          item.flavorId === product.id
            ? {
              ...item,
              quantity: item.quantity + 1,
            }
            : item
        );
      }

      return [
        ...prev,
        {
          flavorId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
  };

  /*
  =========================================
  UPDATE QUANTITY
  =========================================
  */

  const increaseQty = (flavorId: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.flavorId === flavorId
          ? {
            ...item,
            quantity: item.quantity + 1,
          }
          : item
      )
    );
  };

  const decreaseQty = (flavorId: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.flavorId === flavorId
            ? {
              ...item,
              quantity: item.quantity - 1,
            }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  /*
  =========================================
  TOTALS
  =========================================
  */

  const subtotal = useMemo(() => {
    return cart.reduce(
      (acc, item) =>
        acc + item.price * item.quantity,
      0
    );
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce(
      (acc, item) => acc + item.quantity,
      0
    );
  }, [cart]);

  const bulkBaseTotal = useMemo(() => {
    if (cart.length > 0) return subtotal;
    return Number(bulkTotalAmount) || 0;
  }, [cart.length, subtotal, bulkTotalAmount]);

  const bulkAmounts = useMemo(
    () =>
      calculatePartyOrderAmounts(
        bulkBaseTotal,
        Number(bulkDiscountPercent),
      ),
    [bulkBaseTotal, bulkDiscountPercent],
  );

  useEffect(() => {
    if (isBulkOrder && cart.length > 0) {
      setBulkTotalAmount(String(subtotal));
    }
  }, [isBulkOrder, subtotal, cart.length]);

  /*
  =========================================
  PLACE ORDER
  =========================================
  */

  const resetBulkFields = () => {
    setPartyName('');
    setBulkTotalAmount('');
    setBulkDiscountPercent('0');
    setIsBulkOrder(false);
  };

  const placeOrder = async () => {
    if (isBulkOrder) {
      const name = partyName.trim();
      const discount = Number(bulkDiscountPercent);
      const total = cart.length > 0 ? subtotal : Number(bulkTotalAmount);

      if (!name) {
        alert('Enter party / client name');
        return;
      }
      if (cart.length === 0 && (!total || total <= 0)) {
        alert('Add items to cart or enter a total amount');
        return;
      }
      if (discount < 0 || discount > 100) {
        alert('Discount must be between 0 and 100');
        return;
      }

      const payable = bulkAmounts.amountAfterDiscount;
      const bulkNote = `Party: ${name} · ${discount}% off · payable ₹${payable.toFixed(0)}`;

      try {
        setLoading(true);

        await api.post('/party-orders', {
          partyName: name,
          totalAmount: total,
          discountPercent: discount,
          note: orderNote.trim() || bulkNote,
          paymentMethod,
          userId: user?.id,
        });

        if (cart.length > 0) {
          const payload = {
            userId: user?.id,
            note: orderNote.trim()
              ? `${orderNote.trim()} · ${bulkNote}`
              : bulkNote,
            paymentMethod,
            items: cart.map((item) => ({
              flavorId: item.flavorId,
              quantity: item.quantity,
            })),
          };

          if (paymentMethod === 'CASH') {
            await api.post('/orders', payload);
            alert('Bulk order completed');
            setCart([]);
            setOrderNote('');
            resetBulkFields();
            await loadProducts(false);
            return;
          }

          const orderResponse = await api.post('/orders', payload);
          const paymentResponse = await api.post('/payments/phonepe/init', {
            orderId: orderResponse.data.id,
          });

          setPaymentSession({
            merchantTransactionId: paymentResponse.data.merchantTransactionId,
            qrString: paymentResponse.data.qrString,
            amount: Number(paymentResponse.data.amount ?? payable),
            expiresAt: paymentResponse.data.expiresAt,
            mockMode: Boolean(paymentResponse.data.mockMode),
          });
          return;
        }

        alert('Party order saved');
        setOrderNote('');
        resetBulkFields();
      } catch (err) {
        console.error(err);
        let message = 'Failed to complete bulk order';
        if (axios.isAxiosError(err)) {
          const apiMessage = err.response?.data?.message;
          if (typeof apiMessage === 'string') message = apiMessage;
          else if (Array.isArray(apiMessage)) message = apiMessage.join(', ');
        }
        alert(message);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        userId: user?.id,
        note: orderNote.trim() || '-',
        paymentMethod,
        items: cart.map((item) => ({
          flavorId: item.flavorId,
          quantity: item.quantity,
        })),
      };

      if (paymentMethod === 'CASH') {
        await api.post('/orders', payload);
        alert('Order placed successfully');
        setCart([]);
        setOrderNote('');
        await loadProducts(false);
        return;
      }

      const orderResponse = await api.post('/orders', payload);
      const paymentResponse = await api.post('/payments/phonepe/init', {
        orderId: orderResponse.data.id,
      });

      setPaymentSession({
        merchantTransactionId: paymentResponse.data.merchantTransactionId,
        qrString: paymentResponse.data.qrString,
        amount: Number(paymentResponse.data.amount ?? subtotal),
        expiresAt: paymentResponse.data.expiresAt,
        mockMode: Boolean(paymentResponse.data.mockMode),
      });
    } catch (err) {
      console.error(err);
      let message = 'Order failed';
      if (axios.isAxiosError(err)) {
        const apiMessage = err.response?.data?.message;
        if (typeof apiMessage === 'string') {
          message = apiMessage;
        } else if (Array.isArray(apiMessage)) {
          message = apiMessage.join(', ');
        }
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    alert('Payment received. Order completed.');
    setPaymentSession(null);
    setCart([]);
    setOrderNote('');
    resetBulkFields();
    await loadProducts(false);
  };

  const handlePaymentClose = () => {
    setPaymentSession(null);
  };

  const checkoutTotal = isBulkOrder
    ? bulkAmounts.amountAfterDiscount
    : subtotal;

  const canCheckout = isBulkOrder
    ? partyName.trim().length > 0 &&
      (cart.length > 0 || Number(bulkTotalAmount) > 0)
    : cart.length > 0;

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-8 py-4">
        <div className="flex items-center gap-10">
          <img
            src={logo}
            alt="logo"
            className="h-10 object-contain"
          />

          <nav className="hidden items-center gap-8 text-sm font-semibold tracking-wide lg:flex">
            <button
              onClick={() =>
                navigate('/staff/pos')
              }
              className={`pb-1 border-b-2 ${location.pathname === '/staff/pos'
                ? 'text-[#33c3b3] border-[#33c3b3]'
                : 'text-gray-500 border-transparent hover:text-[#33c3b3]'
                }`}
            >
              PRODUCTS
            </button>
            <button
              onClick={() =>
                navigate('/staff/orders')
              }
              className={`pb-1 border-b-2 ${location.pathname === '/staff/orders'
                ? 'text-[#33c3b3] border-[#33c3b3]'
                : 'text-gray-500 border-transparent hover:text-[#33c3b3]'
                }`}
            >
              ORDERS
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden text-right md:block">
            <p className="text-sm font-semibold text-gray-800">
              {user?.name}
            </p>

            <p className="text-xs text-gray-500">
              {user?.branchCode}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-full bg-[#33c3b3] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#2bb1a2]"
          >
            End Shift
          </button>
        </div>
      </header>

      <main className="p-4 lg:p-5">
        <StaffPromoCarousel
          products={products}
          onAddToCart={addToCart}
        />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          {/* Products */}
          <div className="min-w-0 xl:col-span-9">
            {productsLoading && (
              <p className="text-center text-gray-500 py-10">
                Loading products...
              </p>
            )}
            {productsError && (
              <p className="text-center text-red-500 py-10">
                {productsError}
              </p>
            )}
            {!productsLoading && !productsError && products.length === 0 && (
              <p className="text-center text-gray-500 py-10">
                No products available.
              </p>
            )}
            {!productsLoading && !productsError && products.length > 0 && filteredProducts.length === 0 && (
              <p className="text-center text-gray-500 py-10">
                No products found for "{selectedCategory}".
              </p>
            )}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${selectedCategory === category
                      ? 'bg-[#33c3b3] text-white'
                      : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-teal-300'
                      }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition hover:shadow-md"
                >
                  <div className="flex h-28 items-center justify-center bg-[#f6ede3] p-2 sm:h-32">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="max-h-full object-contain"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-2.5">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {product.stock} left · {product.category}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-1 pt-2">
                      <p className="text-sm font-bold text-[#33c3b3]">
                        ₹{product.price}
                      </p>
                      <button
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={!canAddProduct(product)}
                        className="rounded-lg bg-[#33c3b3] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#2bb1a2] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {addButtonLabel(product)}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart — slim sidebar */}
          <div className="xl:col-span-3">
            <div className="sticky top-20 flex max-h-[calc(100vh-5.5rem)] flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-800">Order</h3>
                  <span className="text-[10px] font-semibold text-teal-700">
                    {totalItems} items
                  </span>
                </div>
                <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={isBulkOrder}
                    onChange={(e) => setIsBulkOrder(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-400"
                  />
                  Bulk / party order
                </label>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
                {isBulkOrder && (
                  <div className="mb-2 space-y-2 border-b border-amber-100 pb-2">
                    <input
                      type="text"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      placeholder="Party / client name"
                      className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs outline-none focus:border-amber-400"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={0}
                        value={bulkTotalAmount}
                        onChange={(e) => setBulkTotalAmount(e.target.value)}
                        placeholder="Total ₹"
                        readOnly={cart.length > 0}
                        title={
                          cart.length > 0
                            ? 'Total follows cart subtotal'
                            : undefined
                        }
                        className={`w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs outline-none focus:border-amber-400 ${cart.length > 0 ? 'bg-gray-50' : ''}`}
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={bulkDiscountPercent}
                        onChange={(e) => setBulkDiscountPercent(e.target.value)}
                        placeholder="Disc %"
                        className="w-full rounded-lg border border-gray-200 px-2.5 py-2 text-xs outline-none focus:border-amber-400"
                      />
                    </div>
                    <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-[11px] text-amber-900">
                      Payable:{' '}
                      <span className="font-bold">
                        ₹{bulkAmounts.amountAfterDiscount.toLocaleString('en-IN')}
                      </span>
                      {bulkAmounts.discountPercent > 0 && (
                        <span className="text-amber-700">
                          {' '}
                          (−{bulkAmounts.discountPercent}%)
                        </span>
                      )}
                    </p>
                  </div>
                )}

                {cart.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">
                    {isBulkOrder
                      ? 'Add flavors or enter total ₹'
                      : 'Tap Add on a flavor'}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {cart.map((item) => (
                      <li
                        key={item.flavorId}
                        className="flex items-center gap-2 py-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-800">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            ₹{item.price}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => decreaseQty(item.flavorId)}
                            className="flex h-6 w-6 items-center justify-center rounded bg-gray-100 text-gray-700"
                          >
                            −
                          </button>
                          <span className="w-4 text-center font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => increaseQty(item.flavorId)}
                            className="flex h-6 w-6 items-center justify-center rounded bg-[#33c3b3] text-white"
                          >
                            +
                          </button>
                        </div>
                        <span className="w-12 shrink-0 text-right font-semibold text-teal-700">
                          ₹{item.price * item.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-2 border-t border-gray-100 p-3">
                <input
                  id="order-note"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#33c3b3]"
                />

                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold ${paymentMethod === 'CASH'
                      ? 'bg-[#33c3b3] text-white'
                      : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'
                      }`}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('ONLINE')}
                    className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold ${paymentMethod === 'ONLINE'
                      ? 'bg-[#33c3b3] text-white'
                      : 'bg-gray-50 text-gray-600 ring-1 ring-gray-200'
                      }`}
                  >
                    QR
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Total</span>
                  <span className="text-lg font-bold text-[#33c3b3]">
                    ₹{checkoutTotal.toFixed(0)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={placeOrder}
                  disabled={
                    !canCheckout || loading || paymentSession !== null
                  }
                  className="w-full rounded-lg bg-gradient-to-r from-[#33c3b3] to-[#63d471] py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {loading
                    ? 'Processing…'
                    : paymentMethod === 'ONLINE'
                      ? 'PhonePe QR'
                      : isBulkOrder
                        ? 'Complete bulk order'
                        : 'Complete order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PhonePeQrModal
        open={paymentSession !== null}
        merchantTransactionId={paymentSession?.merchantTransactionId ?? ''}
        qrString={paymentSession?.qrString ?? ''}
        amount={paymentSession?.amount ?? subtotal}
        expiresAt={paymentSession?.expiresAt}
        mockMode={paymentSession?.mockMode}
        onSuccess={handlePaymentSuccess}
        onClose={handlePaymentClose}
      />
    </div>
  );
}