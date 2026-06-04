import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Phone,
  Mail,
  ShieldCheck,
  Wallet,
  Users,
} from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  const investors = [
    {
      id: 1,
      name: 'Ramesh Kumar',
      amount: '₹5,00,000',
      usedFor: 'New Franchise Setup',
    },
    {
      id: 2,
      name: 'Anitha Reddy',
      amount: '₹2,50,000',
      usedFor: 'Inventory Expansion',
    },
    {
      id: 3,
      name: 'Vikram Singh',
      amount: '₹1,80,000',
      usedFor: 'Marketing Campaign',
    },
  ];

  const notifications = [
    'Low stock alert for Mango Sorbet',
    'New investor added successfully',
    'Monthly sales report generated',
    '2 pending orders need approval',
  ];

  return (
    <div className="bg-[#f7f9fb]">
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* PROFILE HEADER */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-36 bg-gradient-to-r from-[#00a8c5] to-[#63d471]" />

          <div className="px-6 pb-6 relative">
            {/* Avatar */}
            <div className="absolute -top-14 left-6">
              <div className="h-28 w-28 rounded-full border-4 border-white bg-white shadow-lg flex items-center justify-center text-4xl font-bold text-[#00a8c5]">
                {user?.name?.charAt(0)}
              </div>
            </div>

            {/* User Info */}
            <div className="pt-20 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {user?.name}
                </h1>

                <p className="text-gray-500 capitalize mt-1">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>

              <button className="bg-gradient-to-r from-[#00a8c5] to-[#63d471] text-white px-6 py-3 rounded-2xl shadow hover:opacity-90 transition">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* PROFILE DETAILS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Info */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="text-[#00a8c5]" />
                <h2 className="text-xl font-semibold">
                  Personal Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-gray-50 rounded-2xl p-5">
                  <p className="text-sm text-gray-500">
                    Full Name
                  </p>

                  <p className="font-semibold text-lg mt-1">
                    {user?.name}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Mail size={16} />
                    Email
                  </div>

                  <p className="font-semibold text-lg mt-2">
                    {user?.email}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Phone size={16} />
                    Phone Number
                  </div>

                  <p className="font-semibold text-lg mt-2">
                    +91 9876543210
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-5">
                  <p className="text-sm text-gray-500">
                    Role
                  </p>

                  <p className="font-semibold text-lg mt-1 capitalize">
                    {user?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            {/* Investors */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Wallet className="text-[#00a8c5]" />

                <h2 className="text-xl font-semibold">
                  Investors
                </h2>
              </div>

              <div className="space-y-4">
                {investors.map((investor) => (
                  <div
                    key={investor.id}
                    className="border border-gray-100 rounded-2xl p-5 hover:bg-gray-50 transition"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {investor.name}
                        </h3>

                        <p className="text-gray-500 text-sm mt-1">
                          Used For: {investor.usedFor}
                        </p>
                      </div>

                      <div className="bg-[#ecfeff] text-[#0891b2] px-4 py-2 rounded-xl font-semibold">
                        {investor.amount}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* SPOC DETAILS */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <Users className="text-[#00a8c5]" />

                <h2 className="text-xl font-semibold">
                  SPOC Details
                </h2>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-sm text-gray-500">
                    SPOC Name
                  </p>

                  <p className="font-semibold mt-1">
                    Karthik Reddy
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Contact
                  </p>

                  <p className="font-semibold mt-1">
                    +91 9123456789
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">
                    Email
                  </p>

                  <p className="font-semibold mt-1">
                    spoc@nosticogl.com
                  </p>
                </div>
              </div>
            </div>

            {/* NOTIFICATIONS */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <Bell className="text-[#00a8c5]" />

                <h2 className="text-xl font-semibold">
                  Notifications
                </h2>
              </div>

              <div className="space-y-4">
                {notifications.map((note, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-700"
                  >
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}