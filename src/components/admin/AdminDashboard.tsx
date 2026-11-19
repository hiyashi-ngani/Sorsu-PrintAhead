import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Users,
  Store,
  FileText,
  DollarSign,
  Plus,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  MapPin,
  Clock,
  Mail,
} from 'lucide-react';
import { StatsCard } from '../common/StatsCard.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { User, UserRole, PrintShop, PrintRequest } from '../../types/index.ts';

export type AdminSection =
  | 'admin_dashboard'
  | 'admin_users'
  | 'admin_shops'
  | 'admin_requests';

interface AdminDashboardProps {
  activeSection: AdminSection;
  onNavigateSection: (section: AdminSection) => void;
  onRefreshRequests?: () => void;
}

interface AdminOverviewData {
  stats: {
    totalUsers: number;
    totalStudentsAndRunners: number;
    totalShopStaff: number;
    totalShops: number;
    activeShops: number;
    totalRequests: number;
    activeRequests: number;
    completedRequests: number;
    completedRevenue: number;
  };
  users: User[];
  shops: PrintShop[];
  requests: PrintRequest[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  activeSection,
  onNavigateSection,
  onRefreshRequests,
}) => {
  const { user: currentUser } = useAuth();
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [requestSearch, setRequestSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('all');

  // Role update state
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Add Printing Shop form state
  const [showAddShop, setShowAddShop] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopLocation, setShopLocation] = useState('');
  const [shopHours, setShopHours] = useState('Mon-Fri, 8:00 AM - 5:00 PM');
  const [shopEmail, setShopEmail] = useState('');
  const [creatingShop, setCreatingShop] = useState(false);
  const [togglingShopId, setTogglingShopId] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load admin overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    if (targetUser.role === newRole) return;
    setUpdatingUserId(targetUser.id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const defaultShopId =
        newRole === 'print_shop_staff'
          ? targetUser.shopId || overview?.shops[0]?.id || 'shop-001'
          : null;
      await api.updateUserRole(targetUser.id, newRole, defaultShopId);
      setSuccessMsg(`Updated ${targetUser.fullName}'s role to ${newRole}.`);
      await loadOverview();
      onRefreshRequests?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user role.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !shopLocation.trim()) {
      setErrorMsg('Shop name and campus location are required.');
      return;
    }
    setCreatingShop(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const created = await api.createPrintShop({
        name: shopName.trim(),
        location: shopLocation.trim(),
        operatingHours: shopHours.trim() || 'Mon-Fri, 8:00 AM - 5:00 PM',
        contactEmail: shopEmail.trim() || undefined,
      });
      setSuccessMsg(`Created printing shop "${created.name}".`);
      setShopName('');
      setShopLocation('');
      setShopHours('Mon-Fri, 8:00 AM - 5:00 PM');
      setShopEmail('');
      setShowAddShop(false);
      await loadOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create printing shop.');
    } finally {
      setCreatingShop(false);
    }
  };

  const handleToggleShopActive = async (shop: PrintShop) => {
    setTogglingShopId(shop.id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updated = await api.updatePrintShop(shop.id, { isActive: !shop.isActive });
      setSuccessMsg(
        `${updated.name} is now ${updated.isActive ? 'Active' : 'Inactive'}.`
      );
      await loadOverview();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update printing shop status.');
    } finally {
      setTogglingShopId(null);
    }
  };

  const users = overview?.users || [];
  const shops = overview?.shops || [];
  const requests = overview?.requests || [];
  const stats = overview?.stats;

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.referenceNumber.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.fullName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.fileName.toLowerCase().includes(requestSearch.toLowerCase()) ||
      r.roomNumber.toLowerCase().includes(requestSearch.toLowerCase());
    const matchesStatus =
      requestStatusFilter === 'all' || r.status === requestStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = [
    'Pending Review',
    'Reviewed / Awaiting Payment',
    'Printing',
    'Ready for Delivery',
    'Out for Delivery',
    'Completed',
    'Cancelled',
  ].map((status) => ({
    status,
    count: requests.filter((r) => r.status === status).length,
  }));

  const tabs: { id: AdminSection; label: string }[] = [
    { id: 'admin_dashboard', label: 'Overview' },
    { id: 'admin_users', label: `Users & Roles (${users.length})` },
    { id: 'admin_shops', label: `Printing Shops (${shops.length})` },
    { id: 'admin_requests', label: `Print Requests (${requests.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#800000] mb-1">
            Admin Portal
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#242424] tracking-tight">
            Control Center
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Users, campus printing shops, and system oversight.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadOverview}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-[#242424] bg-[#F5F5F5] hover:bg-gray-200 border border-[#E5E5E5] transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Section Sub-Navigation */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const active = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigateSection(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors tabular-nums ${
                active
                  ? 'bg-[#800000] text-white'
                  : 'bg-white text-gray-700 border border-[#E5E5E5] hover:border-[#800000] hover:text-[#800000]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Feedback Alerts */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-700 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Overview Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Registered Users"
          value={stats?.totalUsers ?? users.length}
          icon={<Users className="w-5 h-5" />}
          subtitle={`${stats?.totalStudentsAndRunners ?? 0} students • ${stats?.totalShopStaff ?? 0} shop staff`}
        />
        <StatsCard
          label="Printing Shops"
          value={`${stats?.activeShops ?? shops.filter((s) => s.isActive).length}/${stats?.totalShops ?? shops.length}`}
          icon={<Store className="w-5 h-5" />}
          subtitle="Active campus print stations"
        />
        <StatsCard
          label="Total Print Requests"
          value={stats?.totalRequests ?? requests.length}
          icon={<FileText className="w-5 h-5" />}
          subtitle={`${stats?.activeRequests ?? 0} active • ${stats?.completedRequests ?? 0} completed`}
          highlight={(stats?.activeRequests ?? 0) > 0}
        />
        <StatsCard
          label="Completed Cash Revenue"
          value={`₱${(stats?.completedRevenue ?? 0).toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5" />}
          subtitle="Confirmed Cash on Delivery"
        />
      </div>

      {/* SECTION 1: OVERVIEW SUMMARY */}
      {activeSection === 'admin_dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Request Status Distribution */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#242424]">Request Pipeline Breakdown</h3>
                <p className="text-xs text-gray-500">Live distribution across workflow stages</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateSection('admin_requests')}
                className="text-xs font-bold text-[#800000] hover:underline"
              >
                View All
              </button>
            </div>
            <div className="space-y-2.5">
              {statusCounts.map((item) => {
                const total = Math.max(1, requests.length);
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#242424]">{item.status}</span>
                      <span className="font-mono font-bold text-[#800000]">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-[#F5F5F5] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#800000] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campus Printing Shops Quick Summary */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#242424]">Campus Printing Shops</h3>
                <p className="text-xs text-gray-500">Active &amp; inactive campus printing outlets</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateSection('admin_shops')}
                className="text-xs font-bold text-[#800000] hover:underline"
              >
                Manage Shops
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="p-4 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5]/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#242424] truncate">{shop.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        shop.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#800000]" />
                    <span>{shop.location}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span>{shop.operatingHours}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: USERS & ROLES */}
      {activeSection === 'admin_users' && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <div className="p-5 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#242424]">Users &amp; Roles</h3>
              <p className="text-xs text-gray-500">
                Manage Admin, Student, and Printing Shop roles.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search name, email, role..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">SorSU Email</th>
                  <th className="py-3 px-4">Assigned Role</th>
                  <th className="py-3 px-4">Joined</th>
                  <th className="py-3 px-4 text-right">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5E5] text-xs">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#242424]">
                        {u.fullName}
                        {isSelf && (
                          <span className="ml-2 text-[10px] font-semibold text-[#800000] bg-[#FFF5F5] px-1.5 py-0.5 rounded border border-[#FED7D7]">
                            You
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F5F5F5] text-[#242424] border border-[#E5E5E5]">
                          {u.role === 'student_runner' ? 'student' : u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <select
                          aria-label={`Role for ${u.fullName}`}
                          value={u.role === 'student_runner' ? 'student' : u.role}
                          disabled={updatingUserId === u.id || isSelf}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className="px-2.5 py-1.5 text-xs bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000] disabled:opacity-60"
                        >
                          <option value="student">Student</option>
                          <option value="print_shop_staff">Printing Shop Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: PRINTING SHOPS */}
      {activeSection === 'admin_shops' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#242424]">Campus Printing Shops Management</h3>
              <p className="text-xs text-gray-500">
                Register new SorSU-Bulan printing stations and toggle shop availability.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddShop((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddShop ? 'Cancel' : 'Add Printing Shop'}</span>
            </button>
          </div>

          {showAddShop && (
            <form
              onSubmit={handleCreateShop}
              className="bg-white rounded-2xl border border-[#800000]/30 p-5 shadow-xs space-y-4"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#800000]">
                New Printing Shop Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#242424] mb-1">
                    Shop Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Engineering Hall Print Center"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#242424] mb-1">
                    Campus Location <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={shopLocation}
                    onChange={(e) => setShopLocation(e.target.value)}
                    placeholder="e.g. Ground Floor, Engineering Annex"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#242424] mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={shopHours}
                    onChange={(e) => setShopHours(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#242424] mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={shopEmail}
                    onChange={(e) => setShopEmail(e.target.value)}
                    placeholder="shop.name@sorsu.edu.ph"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddShop(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingShop}
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] disabled:opacity-60"
                >
                  {creatingShop ? 'Creating...' : 'Create Printing Shop'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shops.map((shop) => (
              <div
                key={shop.id}
                className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-xs flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#242424]">{shop.name}</h4>
                      <span className="font-mono text-[10px] text-gray-400">{shop.id}</span>
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        shop.isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}
                    >
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#800000]" />
                    <span>{shop.location}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{shop.operatingHours}</span>
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{shop.contactEmail}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5E5E5] flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">
                    Requests routed:{' '}
                    <strong className="text-[#242424]">
                      {requests.filter((r) => r.shopId === shop.id).length}
                    </strong>
                  </span>
                  <button
                    type="button"
                    disabled={togglingShopId === shop.id}
                    onClick={() => handleToggleShopActive(shop)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      shop.isActive
                        ? 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {togglingShopId === shop.id
                      ? 'Updating...'
                      : shop.isActive
                      ? 'Deactivate Shop'
                      : 'Activate Shop'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 4: ALL PRINT REQUESTS */}
      {activeSection === 'admin_requests' && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <div className="p-5 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#242424]">Print Requests</h3>
              <p className="text-xs text-gray-500">
                Campus-wide requests, shops, and deliveries.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  placeholder="Search ref, student, file..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
                />
              </div>
              <select
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
              >
                <option value="all">All Statuses</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Reviewed / Awaiting Payment">Reviewed / Awaiting Payment</option>
                <option value="Printing">Printing</option>
                <option value="Ready for Delivery">Ready for Delivery</option>
                <option value="Out for Delivery">Out for Delivery</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              No requests match the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Student &amp; Room</th>
                    <th className="py-3 px-4">Printing Shop</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Runner</th>
                    <th className="py-3 px-4 text-right">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] text-xs">
                  {filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#800000]">
                        {req.referenceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#242424]">{req.fullName}</div>
                        <div className="text-[11px] text-gray-500">{req.roomNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {req.shopName || 'SorSU Main Campus Print Shop'}
                      </td>
                      <td className="py-3.5 px-4 max-w-[180px] truncate font-medium text-[#242424]">
                        {req.fileName}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={req.status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {req.deliveryJob?.runnerName || <span className="text-gray-400 italic">Unassigned</span>}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#242424]">
                        {req.printPrice ? `₱${req.printPrice.toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
