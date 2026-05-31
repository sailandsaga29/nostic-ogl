import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { isAuthenticated, getRedirectPath } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-orange-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍦</span>
          <span className="text-xl font-bold text-gray-800">Ice Cream Franchise</span>
        </div>
        <div>
          {isAuthenticated ? (
            <Link to={getRedirectPath()} className="bg-pink-600 text-white px-5 py-2 rounded-lg hover:bg-pink-700 transition">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/login" className="bg-pink-600 text-white px-5 py-2 rounded-lg hover:bg-pink-700 transition">
              Staff Login
            </Link>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl font-bold text-gray-800 mb-4">
          🍦 Franchise Management System
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Complete digital management for your ice cream parlour franchise.
          Inventory, billing, staff, and analytics — all in one place.
        </p>
        <Link to="/login" className="inline-block bg-pink-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-pink-700 transition shadow-lg">
          Get Started →
        </Link>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl mb-3">📦</div>
            <h3 className="text-lg font-semibold mb-2">Inventory Management</h3>
            <p className="text-gray-600 text-sm">Track stock levels, get low-stock alerts, manage suppliers and expiry dates.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl mb-3">💳</div>
            <h3 className="text-lg font-semibold mb-2">POS & Billing</h3>
            <p className="text-gray-600 text-sm">Fast billing with UPI, cash, and card support. GST invoices auto-generated.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="text-3xl mb-3">📊</div>
            <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
            <p className="text-gray-600 text-sm">Real-time sales, branch comparison, and financial insights at a glance.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 text-center py-6 mt-16">
        <p>© 2025 Ice Cream Franchise. All rights reserved.</p>
      </footer>
    </div>
  );
}