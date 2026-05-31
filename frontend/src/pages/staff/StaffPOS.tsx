import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import api from '../../services/api';
import axios from 'axios';
import StaffPromoCarousel from '../../components/staff/StaffPromoCarousel';
import PhonePeQrModal from '../../components/payments/PhonePeQrModal';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1563805042-7684c019e1cb?q=80&w=600';

type Product = {
  id: string;
  name: string;
  category: string;
  type: string;
  price: number;
  stock: number;
  image: string;
  updatedAt?: string;
};

type CartItem = {
  flavorId: string;
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
    return ['All', ...Array.from(categorySet)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter(
      (product) => product.category === selectedCategory
    );
  }, [products, selectedCategory]);

  const loadProducts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setProductsLoading(true);
        setProductsError('');
      }
      const response = await api.get('/flavors/available');
      const flavors = Array.isArray(response.data) ? response.data : [];
      setProducts(
        flavors.map((flavor: {
          id: string;
          name: string;
          category?: string;
          description?: string;
          price?: number;
          stock?: number;
          image?: string;
          updatedAt?: string;
        }) => ({
          id: flavor.id,
          name: flavor.name,
          category: flavor.category ?? 'General',
          type: flavor.description?.trim() || 'Ice Cream',
          price: Number(flavor.price ?? 0),
          stock: Number(flavor.stock ?? 0),
          image: flavor.image?.trim() || PLACEHOLDER_IMAGE,
          updatedAt: flavor.updatedAt,
        }))
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

  /*
  =========================================
  ADD TO CART
  =========================================
  */

  const addToCart = (product: Product) => {
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

  const increaseQty = (flavorId: string) => {
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

  const decreaseQty = (flavorId: string) => {
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

  /*
  =========================================
  PLACE ORDER
  =========================================
  */

  const placeOrder = async () => {
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
    await loadProducts(false);
  };

  const handlePaymentClose = () => {
    setPaymentSession(null);
  };

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

      <main className="p-6">
        <StaffPromoCarousel
          products={products}
          onAddToCart={addToCart}
        />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Products */}
          <div className="xl:col-span-8">
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
            <div className="mb-6">
              <div className="flex flex-wrap gap-3 items-center">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedCategory === category
                      ? 'bg-[#33c3b3] text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-[#f1f8f6]'
                      }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-[22px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition duration-300"
                >
                  <div className="bg-[#f6ede3] h-[220px] flex items-center justify-center p-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-32 object-contain"
                    />
                  </div>

                  <div className="p-4">
                    <span className="inline-block text-[11px] tracking-wider font-bold uppercase bg-[#dff5f2] text-[#33c3b3] px-3 py-1 rounded-full">
                      {product.category}
                    </span>

                    <h3
                      className="mt-3 text-xl font-bold text-gray-800"
                      style={{
                        fontFamily: 'cursive',
                      }}
                    >
                      {product.name}
                    </h3>

                    <p className="text-gray-500 text-xs mt-1 uppercase tracking-[0.2em]">
                      {product.type}
                    </p>

                    <p className="mt-2 text-[10px] font-mono font-normal tracking-wider text-slate-500 lowercase">
                      Available: {product.stock}
                    </p>

                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xl font-bold text-[#33c3b3]">
                        ₹{product.price}
                      </p>

                      <button
                        onClick={() =>
                          addToCart(product)
                        }
                        disabled={product.stock <= 0}
                        className="rounded-full bg-[#33c3b3] hover:bg-[#2bb1a2] text-white px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {product.stock <= 0 ? 'Out of stock' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div className="xl:col-span-4">
            <div className="sticky top-24 flex h-[calc(100vh-140px)] flex-col rounded-[30px] border border-gray-100 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-2xl font-bold text-gray-800">
                  Current Order
                </h3>

                <span className="bg-[#dff5f2] text-[#33c3b3] px-3 py-1 rounded-full text-xs font-semibold">
                  {totalItems} ITEMS
                </span>
              </div>

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {cart.length === 0 ? (
                  <div className="h-full border-2 border-dashed border-gray-200 rounded-3xl flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="text-6xl mb-4">
                        🛒
                      </div>

                      <p className="text-lg font-semibold text-gray-700">
                        No items added yet
                      </p>

                      <p className="text-sm text-gray-400 mt-1">
                        Select products to start
                        billing
                      </p>
                    </div>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.flavorId}
                      className="border border-gray-100 rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {item.name}
                          </h4>

                          <p className="text-sm text-gray-400">
                            ₹{item.price} each
                          </p>
                        </div>

                        <p className="font-bold text-[#33c3b3]">
                          ₹
                          {item.price *
                            item.quantity}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        <button
                          onClick={() =>
                            decreaseQty(
                              item.flavorId
                            )
                          }
                          className="w-8 h-8 rounded-full bg-gray-100"
                        >
                          -
                        </button>

                        <span className="font-semibold">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() =>
                            increaseQty(
                              item.flavorId
                            )
                          }
                          className="w-8 h-8 rounded-full bg-[#33c3b3] text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Summary */}
              {/* Summary */}
              <div className="mt-6 border-t pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500">
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="mb-5">
                  <label
                    htmlFor="order-note"
                    className="text-sm font-semibold text-gray-700 mb-2 block"
                  >
                    Order note
                  </label>
                  <textarea
                    id="order-note"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Add a note (optional)"
                    rows={2}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#33c3b3] resize-none"
                  />
                </div>

                {/* PAYMENT METHOD */}
                <div className="mb-5">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Payment Method
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() =>
                        setPaymentMethod('CASH')
                      }
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${paymentMethod === 'CASH'
                        ? 'bg-[#33c3b3] text-white border-[#33c3b3]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#33c3b3]'
                        }`}
                    >
                      💵 Cash
                    </button>

                    <button
                      onClick={() =>
                        setPaymentMethod('ONLINE')
                      }
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${paymentMethod === 'ONLINE'
                        ? 'bg-[#33c3b3] text-white border-[#33c3b3]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#33c3b3]'
                        }`}
                    >
                      📱 PhonePe QR
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-5">
                  <span className="text-xl font-bold text-gray-800">
                    Total
                  </span>

                  <span className="text-3xl font-bold text-[#33c3b3]">
                    ₹{subtotal.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={placeOrder}
                  disabled={
                    cart.length === 0 || loading || paymentSession !== null
                  }
                  className="w-full rounded-2xl bg-gradient-to-r from-[#33c3b3] to-[#63d471] py-4 text-white text-lg font-bold shadow-lg hover:scale-[1.01] transition disabled:opacity-50"
                >
                  {loading
                    ? 'Processing...'
                    : paymentMethod === 'ONLINE'
                      ? 'Generate PhonePe QR'
                      : 'Complete Cash Order'}
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