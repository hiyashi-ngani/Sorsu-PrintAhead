import React from 'react';
import {
  LayoutDashboard,
  FilePlus,
  Clock,
  Printer,
  FileCheck,
  Truck,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Users,
  Store,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import type { UserRole } from '../../types/index.ts';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export function getNavItemsForRole(role: UserRole): NavItem[] {
  if (role === 'admin') {
    return [
      { id: 'admin_dashboard', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'admin_users', label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
      { id: 'admin_shops', label: 'Printing Shops', icon: <Store className="w-4 h-4" /> },
      { id: 'admin_requests', label: 'Print Requests', icon: <FileText className="w-4 h-4" /> },
      { id: 'email_outbox', label: 'Email Logs', icon: <Mail className="w-4 h-4" /> },
    ];
  }

  if (role === 'print_shop_staff') {
    return [
      { id: 'staff_dashboard', label: 'Shop Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'staff_review', label: 'Review & Price', icon: <FileCheck className="w-4 h-4" /> },
      { id: 'staff_printing', label: 'Printing Queue', icon: <Printer className="w-4 h-4" /> },
      { id: 'email_outbox', label: 'Email Logs', icon: <Mail className="w-4 h-4" /> },
    ];
  }

  // Student Portal (combines sending print requests & accepting peer delivery jobs)
  return [
    { id: 'student_runner_dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'submit_request', label: 'Submit Print', icon: <FilePlus className="w-4 h-4" /> },
    { id: 'track_requests', label: 'Track Requests', icon: <Clock className="w-4 h-4" /> },
    { id: 'available_jobs', label: 'Delivery Jobs', icon: <Truck className="w-4 h-4" /> },
    { id: 'my_deliveries', label: 'My Deliveries', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'email_outbox', label: 'Email Logs', icon: <Mail className="w-4 h-4" /> },
  ];
}

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const { user } = useAuth();
  if (!user) return null;

  const items = getNavItemsForRole(user.role);

  return (
    <aside className="hidden md:flex w-60 bg-white border-r border-[#E5E5E5] flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 flex-1">
        <div className="text-[11px] font-bold tracking-wider text-gray-400 uppercase px-3 mb-2">
          {user.role === 'admin'
            ? 'Admin'
            : user.role === 'print_shop_staff'
            ? 'Printing Shop'
            : 'Student'}
        </div>
        <nav className="space-y-1">
          {items.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors text-left ${
                  isActive
                    ? 'bg-[#800000] text-white'
                    : 'text-[#242424] hover:bg-[#F5F5F5] hover:text-[#800000]'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-gray-500'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* University Information Footer */}
      <div className="p-4 border-t border-[#E5E5E5] bg-[#F5F5F5]/50">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
          <ShieldCheck className="w-4 h-4 text-[#800000]" />
          <span>SorSU-Bulan Campus</span>
        </div>
      </div>
    </aside>
  );
};
