import { useAuth } from '../../context/AuthContext';

export default function ManagerDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍦</span>
          <h1 className="text-lg font-bold">Manager Dashboard</h1>
          <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full font-medium">
            Branch: {user?.branchCode}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
        </div>
      </header>

      <main className="p-6">
        <h2 className="text-xl font-semibold mb-4">Branch Overview — {user?.branchCode}</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Today's Sales</p>
            <p className="text-2xl font-bold">₹8,200</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Staff on Duty</p>
            <p className="text-2xl font-bold">3</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">Pending Approvals</p>
            <p className="text-2xl font-bold">2</p>
          </div>
        </div>
      </main>
    </div>
  );
}