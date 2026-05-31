import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      label: 'Dashboard',
      icon: '📊',
      path: '/admin/dashboard',
    },
    {
      label: 'Flavors',
      icon: '🍨',
      path: '/admin/flavors',
    },
    {
      label: 'Inventory',
      icon: '📦',
      path: '/admin/inventory',
    },
    {
      label: 'Orders',
      icon: '🛒',
      path: '/admin/orders',
    },
    {
      label: 'Profile',
      icon: '�',
      path: '/admin/profile',
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-white shadow-sm md:min-h-[calc(100vh-80px)] overflow-x-auto">
      <div className="p-4 md:p-6">
        <div className="flex md:flex-col gap-2 md:gap-3 overflow-x-auto">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`whitespace-nowrap px-4 py-3 rounded-xl flex items-center gap-3 transition
                ${
                  location.pathname === item.path
                    ? 'bg-pink-50 text-pink-600 font-semibold'
                    : 'hover:bg-gray-50'
                }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}