import Header from '../../components/Layout/Header';
// import Sidebar from '../../components/Layout/Sidebar';
const salesData = [
  {
    title: 'Total Revenue',
    value: '₹1,24,500',
    change: '+12%',
    icon: '💰',
    color: 'bg-pink-100',
  },
  {
    title: 'Orders Completed',
    value: '1,245',
    change: '+8%',
    icon: '🛒',
    color: 'bg-purple-100',
  },
  {
    title: 'Top Flavor',
    value: 'Lotus Biscoff',
    change: '95% Popularity',
    icon: '🍨',
    color: 'bg-yellow-100',
  },
  {
    title: 'Low Stock Items',
    value: '5',
    change: '-2%',
    icon: '⚠️',
    color: 'bg-red-100',
  },
];

const recentReports = [
  {
    name: 'Weekly Sales Report',
    date: 'Today',
    status: 'Completed',
  },
  {
    name: 'Inventory Summary',
    date: 'Yesterday',
    status: 'Completed',
  },
  {
    name: 'Monthly Revenue',
    date: '2 days ago',
    status: 'Processing',
  },
];



export default function AdminDashboard() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br to-indigo-50 text-gray-800">

      <Header />

      <div className="flex flex-col md:flex-row">

        {/* <Sidebar /> */}

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
            {salesData.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl shadow-sm p-6"
              >
                <div
                  className={`h-14 w-14 rounded-2xl flex items-center justify-center text-2xl mb-4 ${item.color}`}
                >
                  {item.icon}
                </div>

                <h3 className="text-3xl font-bold">
                  {item.value}
                </h3>

                <p className="text-gray-500 text-sm mt-1">
                  {item.title}
                </p>

                <p className="text-green-500 text-sm mt-3">
                  {item.change}
                </p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">
            {/* Create Offer */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border hover:shadow-md transition cursor-pointer">
              <div className="h-14 w-14 rounded-2xl bg-pink-100 flex items-center justify-center text-3xl mb-5">
                🎉
              </div>

              <h3 className="text-xl font-bold text-gray-800">
                Launch Offer
              </h3>

              <p className="text-gray-500 mt-2 text-sm">
                Create flash discounts & combo deals
              </p>

              <div className="mt-5 text-pink-500 font-semibold text-sm">
                Create Promotion →
              </div>
            </div>

            {/* Add Flavor */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border hover:shadow-md transition cursor-pointer">
              <div className="h-14 w-14 rounded-2xl bg-yellow-100 flex items-center justify-center text-3xl mb-5">
                🍨
              </div>

              <h3 className="text-xl font-bold text-gray-800">
                Add New Flavor
              </h3>

              <p className="text-gray-500 mt-2 text-sm">
                Launch seasonal or premium flavors
              </p>

              <div className="mt-5 text-teal-500 font-semibold text-sm">
                Open Flavor Lab →
              </div>
            </div>

            {/* Restock */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border hover:shadow-md transition cursor-pointer">
              <div className="h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center text-3xl mb-5">
                📦
              </div>

              <h3 className="text-xl font-bold text-gray-800">
                Restock Inventory
              </h3>

              <p className="text-gray-500 mt-2 text-sm">
                5 items currently running low
              </p>

              <div className="mt-5 text-orange-500 font-semibold text-sm">
                Manage Stock →
              </div>
            </div>

            {/* Staff */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border hover:shadow-md transition cursor-pointer">
              <div className="h-14 w-14 rounded-2xl bg-cyan-100 flex items-center justify-center text-3xl mb-5">
                👥
              </div>

              <h3 className="text-xl font-bold text-gray-800">
                Staff Attendance
              </h3>

              <p className="text-gray-500 mt-2 text-sm">
                Track shifts and employee activity
              </p>

              <div className="mt-5 text-cyan-500 font-semibold text-sm">
                View Attendance →
              </div>
            </div>

            {/* Reports */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border hover:shadow-md transition cursor-pointer">
              <div className="h-14 w-14 rounded-2xl bg-green-100 flex items-center justify-center text-3xl mb-5">
                📈
              </div>

              <h3 className="text-xl font-bold text-gray-800">
                Generate Reports
              </h3>

              <p className="text-gray-500 mt-2 text-sm">
                Export sales & analytics reports
              </p>

              <div className="mt-5 text-green-500 font-semibold text-sm">
                Download Reports →
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border hover:shadow-md transition cursor-pointer">
              <div className="h-14 w-14 rounded-2xl bg-purple-100 flex items-center justify-center text-3xl mb-5">
                🤖
              </div>

              <h3 className="text-xl font-bold text-gray-800">
                Flavor Trends
              </h3>

              <p className="text-gray-500 mt-2 text-sm">
                Discover trending customer favorites
              </p>

              <div className="mt-5 text-purple-500 font-semibold text-sm">
                Explore Trends →
              </div>
            </div>
          </div>
          {/* Charts & Reports */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Sales Overview */}
            <div className="xl:col-span-2 p-6">
              {/* <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-5">
                  Quick Actions
                </h3>

                <div className="grid gap-4">
                  <button className="border rounded-xl p-5 text-left hover:bg-pink-50 transition">
                    <div className="text-2xl mb-2">👤</div>

                    <p className="font-semibold">Add Staff</p>

                    <p className="text-sm text-gray-500">
                      Create new employee accounts
                    </p>
                  </button>

                  <button className="border rounded-xl p-5 text-left hover:bg-pink-50 transition">
                    <div className="text-2xl mb-2">📦</div>

                    <p className="font-semibold">Manage Inventory</p>cd

                    <p className="text-sm text-gray-500">
                      Update stock and supplies
                    </p>
                  </button>

                  <button className="border rounded-xl p-5 text-left hover:bg-pink-50 transition">
                    <div className="text-2xl mb-2">📊</div>

                    <p className="font-semibold">View Reports</p>

                    <p className="text-sm text-gray-500">
                      Sales and analytics reports
                    </p>
                  </button>
                </div>
              </div> */}
              {/* <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  Sales Overview
                </h2>

                <select className="border rounded-lg px-3 py-2 text-sm">
                  <option>Last 7 Days</option>
                  <option>Last Month</option>
                  <option>Last Year</option>
                </select>
              </div> */}

              {/* Fake Chart */}
              {/* <div className="h-80 flex items-end gap-4">
                {[40, 70, 55, 90, 65, 85, 100].map(
                  (height, index) => (
                    <div
                      key={index}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div
                        className="w-full rounded-t-2xl bg-gradient-to-t from-pink-500 to-purple-600"
                        style={{
                          height: `${height}%`,
                        }}
                      />

                      <span className="text-xs text-gray-500">
                        Day {index + 1}
                      </span>
                    </div>
                  )
                )}
              </div> */}
            </div>

            {/* Recent Reports */}
            {/* <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  Recent Reports
                </h2>

                <button className="text-sm text-pink-600">
                  View All
                </button>
              </div>

              <div className="space-y-4">
                {recentReports.map((report) => (
                  <div
                    key={report.name}
                    className="border rounded-2xl p-4 hover:bg-pink-50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">
                          {report.name}
                        </p>

                        <p className="text-sm text-gray-500 mt-1">
                          {report.date}
                        </p>
                      </div>

                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium
                          ${report.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}
                      >
                        {report.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
          {/* <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">



            Quick Actions
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-5">
                Quick Actions
              </h3>

              <div className="grid gap-4">
                <button className="border rounded-xl p-5 text-left hover:bg-pink-50 transition">
                  <div className="text-2xl mb-2">👤</div>

                  <p className="font-semibold">Add Staff</p>

                  <p className="text-sm text-gray-500">
                    Create new employee accounts
                  </p>
                </button>

                <button className="border rounded-xl p-5 text-left hover:bg-pink-50 transition">
                  <div className="text-2xl mb-2">📦</div>

                  <p className="font-semibold">Manage Inventory</p>

                  <p className="text-sm text-gray-500">
                    Update stock and supplies
                  </p>
                </button>

                <button className="border rounded-xl p-5 text-left hover:bg-pink-50 transition">
                  <div className="text-2xl mb-2">📊</div>

                  <p className="font-semibold">View Reports</p>

                  <p className="text-sm text-gray-500">
                    Sales and analytics reports
                  </p>
                </button>
              </div>
            </div>
          </div> */}

        </main>

      </div>
    </div>
  );
}