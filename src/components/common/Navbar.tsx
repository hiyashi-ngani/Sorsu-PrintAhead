import React, { useState } from 'react';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { getNavItemsForRole } from './Sidebar.tsx';
import type { UserRole } from '../../types/index.ts';

interface NavbarProps {
  currentView: string;
  onOpenNotifications: () => void;
  onNavigateHome: (role?: string) => void;
  onNavigateView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onOpenNotifications,
  onNavigateHome,
  onNavigateView,
}) => {
  const { user, unreadCount, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-amber-50 text-amber-900 border border-amber-200">
            Admin
          </span>
        );
      case 'student':
      case 'student_runner':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-[#FFF5F5] text-[#800000] border border-[#FED7D7]">
            Student
          </span>
        );
      case 'print_shop_staff':
        return (
          <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-[#FFF5F5] text-[#800000] border border-[#FED7D7]">
            Printing Shop
          </span>
        );
    }
  };

  const mobileNavItems = user ? getNavItemsForRole(user.role) : [];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E5E5E5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand & Mobile Menu Button */}
        <div className="flex items-center gap-2.5">
          {user && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-600 hover:text-[#800000] rounded-lg"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div
            onClick={() => onNavigateHome()}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <img
              src="/assets/aistudio/sorsu_0f1cec53.png"
              alt="Sorsogon State University Seal"
              className="w-9 h-9 rounded-full object-contain bg-white border border-[#E5E5E5] p-0.5"
            />
            <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#800000] whitespace-nowrap">
              Sorsu: <span className="text-[#242424]">PrintAhead</span>
            </span>
          </div>
        </div>

        {/* Right Actions (Quick Switcher removed per Focus Mode) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="relative p-2 rounded-lg text-gray-600 hover:text-[#800000] hover:bg-[#FFF5F5] transition-colors border border-transparent hover:border-[#FED7D7]"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#800000] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}

          {user && (
            <div className="flex items-center gap-2 sm:gap-3 pl-2 border-l border-[#E5E5E5]">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-[#242424] leading-tight">
                  {user.fullName}
                </div>
                <div className="mt-0.5">{getRoleBadge(user.role)}</div>
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-[#E5E5E5] bg-white p-4 space-y-4 shadow-md">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#242424] truncate">{user.fullName}</div>
              <div className="text-[11px] text-gray-500 truncate">{user.email}</div>
            </div>
            <div className="shrink-0">{getRoleBadge(user.role)}</div>
          </div>

          <div className="space-y-1">
            {mobileNavItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onNavigateView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left ${
                    isActive
                      ? 'bg-[#800000] text-white'
                      : 'text-[#242424] hover:bg-[#F5F5F5]'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-gray-500'}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
