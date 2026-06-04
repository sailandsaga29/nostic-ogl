import {
  useNavigate,
  useLocation,
} from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

import logo from '../../assets/logo.png';

export default function Header() {
  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();

  const navItems = [
    {
      label: 'HOME',
      path: '/admin/dashboard',
    },
    {
      label: 'FLAVORS',
      path: '/admin/flavors',
    },
    {
      label: 'EXPENSES',
      path: '/admin/inventory',
    },
    {
      label: 'ORDERS',
      path: '/admin/orders',
    }
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">

      {/* Desktop Header */}
      <div className="flex items-center gap-10">
        <img
          className="w-[120px] md:w-[150px] object-contain"
          src={logo}
          alt="Ice Cream Franchise logo"
        />
        {/* <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          className="flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          aria-label="Go to dashboard"
        >
what is this button 
        </button> */}

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


      </div>
      <div className="flex items-center gap-4">

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

    </header>
  );
}