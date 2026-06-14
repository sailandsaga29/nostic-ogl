import {
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useState } from 'react';

import { useAuth } from '../../context/AuthContext';

import logo from '../../assets/logo.png';

export default function Header() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();

  const location = useLocation();

  const navItems = [
    {
      label: 'SUMMARY',
      path: '/admin/dashboard',
    },
    {
      label: 'FLAVORS STOCK',
      path: '/admin/flavors',
    },
    {
      label: 'EXPENSES',
      path: '/admin/inventory',
    },
    {
      label: 'ACCOUNTS',
      path: '/admin/accounts',
    },
    {
      label: 'ORDERS',
      path: '/admin/orders',
    },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 md:px-8 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <img
          className="w-[100px] md:w-[120px] lg:w-[150px] object-contain"
          src={logo}
          alt="Ice Cream Franchise logo"
        />

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold tracking-wide">
          {navItems.map((item) => {
            const active = location.pathname === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => navigate(item.path)}
                aria-current={active ? 'page' : undefined}
                className={`text-sm font-semibold tracking-wide pb-1 border-b-2 transition-all duration-200 ${active
                  ? 'text-teal-500 border-teal-500'
                  : 'text-gray-600 border-transparent hover:text-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300'
                  }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>

          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-slate-900">{user?.name ?? 'Admin'}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role?.replace('_', ' ') ?? 'Administrator'}</p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/admin/profile')}
            className="h-10 w-10 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 text-white flex items-center justify-center font-semibold hover:scale-105 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            aria-label={`Open profile for ${user?.name ?? 'user'}`}
          >
            {user?.name?.charAt(0) ?? 'A'}
          </button>

          <button
            type="button"
            onClick={logout}
            className="text-sm text-red-500 hover:text-red-700 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 top-20"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Navigation Slide Menu */}
      <nav
        className={`lg:hidden fixed top-20 left-0 h-[calc(100vh-80px)] w-64 bg-white shadow-lg z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-2 p-4">
          {navItems.map((item) => {
            const active = location.pathname === item.path;

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => handleNavClick(item.path)}
                aria-current={active ? 'page' : undefined}
                className={`text-left px-4 py-3 rounded-lg transition-all duration-200 ${active
                  ? 'bg-teal-50 text-teal-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300'
                  }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}