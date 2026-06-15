import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

export default function StaffHeader() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'PRODUCTS', path: '/staff/pos' },
    { label: 'ORDERS', path: '/staff/orders' },
  ];

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const showNewOrderButton = location.pathname === '/staff/orders';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 md:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={logo}
            alt="Ice Cream Franchise logo"
            className="h-10 object-contain"
          />

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold tracking-wide">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  aria-current={active ? 'page' : undefined}
                  className={`pb-1 border-b-2 transition-all duration-200 ${active
                    ? 'text-[#33c3b3] border-[#33c3b3]'
                    : 'text-gray-500 border-transparent hover:text-[#33c3b3] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            aria-label="Toggle navigation menu"
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

          {showNewOrderButton && (
            <button
              type="button"
              onClick={() => handleNavClick('/staff/pos')}
              className="hidden rounded-full bg-[#33c3b3] px-4 py-2 text-xs font-bold text-white hover:bg-[#2bb1a2] sm:inline-flex"
            >
              + New Order
            </button>
          )}

          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.branchCode}</p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 sm:px-4 sm:py-2 sm:text-sm"
          >
            End Shift
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black bg-opacity-40"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        className={`md:hidden fixed top-20 left-0 h-[calc(100vh-80px)] w-64 bg-white shadow-lg z-40 transform transition-transform duration-300 ease-in-out overflow-y-auto ${
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
                  ? 'bg-[#eafaf8] text-[#0f766e] font-semibold'
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
