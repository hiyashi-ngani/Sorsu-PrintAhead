/**
 * Sorsu: PrintAhead - Web-based Printing Request and Delivery Management System
 * Sorsogon State University (SorSU) - Bulan Campus
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/common/Navbar.tsx';
import { Sidebar } from './components/common/Sidebar.tsx';
import { NotificationDrawer } from './components/common/NotificationDrawer.tsx';
import { LandingPage } from './components/landing/LandingPage.tsx';
import { LoginPage } from './components/auth/LoginPage.tsx';
import { AdminDashboard, type AdminSection } from './components/admin/AdminDashboard.tsx';
import {
  StudentRunnerDashboard,
  type StudentRunnerSection,
} from './components/student/StudentRunnerDashboard.tsx';
import { SubmitPrintPage } from './components/student/SubmitPrintPage.tsx';
import { StudentTrackingPage } from './components/student/StudentTrackingPage.tsx';
import { StaffDashboard } from './components/staff/StaffDashboard.tsx';
import { StaffPrintingPage } from './components/staff/StaffPrintingPage.tsx';
import { EmailLogsPage } from './components/notifications/EmailLogsPage.tsx';
import { api } from './api/client.ts';
import type { PrintRequest, UserRole } from './types/index.ts';

const ADMIN_VIEWS = [
  'admin_dashboard',
  'admin_users',
  'admin_shops',
  'admin_requests',
  'email_outbox',
];
const STAFF_VIEWS = ['staff_dashboard', 'staff_review', 'staff_printing', 'email_outbox'];
const STUDENT_RUNNER_VIEWS = [
  'student_runner_dashboard',
  'submit_request',
  'track_requests',
  'available_jobs',
  'my_deliveries',
  'email_outbox',
];

function getDefaultViewForRole(role: UserRole): string {
  if (role === 'admin') return 'admin_dashboard';
  if (role === 'print_shop_staff') return 'staff_dashboard';
  return 'student_runner_dashboard';
}

function MainApp() {
  const { user, loading, refreshNotifications } = useAuth();
  const [currentView, setCurrentView] = useState<string>('');
  const [unauthenticatedView, setUnauthenticatedView] = useState<'landing' | 'login'>('landing');

  // Cleanly separated state slices so personal print orders never mix with peer delivery jobs
  const [myRequests, setMyRequests] = useState<PrintRequest[]>([]);
  const [availableJobs, setAvailableJobs] = useState<PrintRequest[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<PrintRequest[]>([]);
  const [shopRequests, setShopRequests] = useState<PrintRequest[]>([]);

  const [selectedRefForTracking, setSelectedRefForTracking] = useState<string | undefined>(undefined);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);

  // Reset unauthenticated view back to landing when user signs out
  useEffect(() => {
    if (!user && !loading) {
      setCurrentView('');
    }
  }, [user, loading]);

  // Set default view based on user role whenever role changes
  useEffect(() => {
    if (!user) return;
    if (user.role === 'admin' && !ADMIN_VIEWS.includes(currentView)) {
      setCurrentView('admin_dashboard');
    } else if (user.role === 'print_shop_staff' && !STAFF_VIEWS.includes(currentView)) {
      setCurrentView('staff_dashboard');
    } else if (
      (user.role === 'student' || user.role === 'student_runner') &&
      !STUDENT_RUNNER_VIEWS.includes(currentView)
    ) {
      setCurrentView('student_runner_dashboard');
    }
  }, [user?.role, currentView]);

  // Load role-appropriate data
  const loadRequests = useCallback(async () => {
    if (!user) return;
    try {
      if (user.role === 'student' || user.role === 'student_runner') {
        const [studentReqs, availJobs, runnerJobs] = await Promise.all([
          api.getStudentRequests(),
          api.getAvailableDeliveryJobs(),
          api.getRunnerJobs(),
        ]);
        setMyRequests(studentReqs);
        setAvailableJobs(availJobs);
        setMyDeliveries(runnerJobs);
        setShopRequests([]);
      } else if (user.role === 'print_shop_staff' || user.role === 'admin') {
        const all = await api.getAllRequests();
        setShopRequests(all);
        setMyRequests([]);
        setAvailableJobs([]);
        setMyDeliveries([]);
      }
      await refreshNotifications();
    } catch (err) {
      console.error('Failed to load requests:', err);
    }
  }, [user, refreshNotifications]);

  useEffect(() => {
    if (user) {
      loadRequests();
    }
  }, [user, loadRequests]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <img
            src="/assets/aistudio/sorsu_0f1cec53.png"
            alt="SorSU Crest"
            className="w-12 h-12 rounded-full object-contain bg-white border border-[#E5E5E5] p-1 mx-auto animate-pulse"
          />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Loading Sorsu: PrintAhead...
          </p>
        </div>
      </div>
    );
  }

  // UC1: Unauthenticated view shows modern Landing Page or Login
  if (!user) {
    if (unauthenticatedView === 'landing') {
      return <LandingPage onGetStarted={() => setUnauthenticatedView('login')} />;
    }
    return (
      <LoginPage
        onLoginSuccess={loadRequests}
        onBackToLanding={() => setUnauthenticatedView('landing')}
      />
    );
  }

  const handleNavigateHome = (targetRole?: string) => {
    const role = (targetRole || user.role) as UserRole;
    setCurrentView(getDefaultViewForRole(role));
  };

  const handleTrackRequest = (refNumber?: string) => {
    setSelectedRefForTracking(refNumber);
    setCurrentView('track_requests');
  };

  const isCombinedStudentRunner =
    user.role === 'student' || user.role === 'student_runner';

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans">
      {/* Top University Navigation */}
      <Navbar
        currentView={currentView}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        onNavigateHome={handleNavigateHome}
        onNavigateView={setCurrentView}
      />

      {/* Main Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Role-Specific Sidebar */}
        <Sidebar currentView={currentView} onNavigate={setCurrentView} />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* 1. Separate Admin Portal */}
          {user.role === 'admin' && (
            <>
              {(currentView === 'admin_dashboard' ||
                currentView === 'admin_users' ||
                currentView === 'admin_shops' ||
                currentView === 'admin_requests') && (
                <AdminDashboard
                  activeSection={currentView as AdminSection}
                  onNavigateSection={setCurrentView}
                  onRefreshRequests={loadRequests}
                />
              )}
            </>
          )}

          {/* 2. Combined Student + Runner Portal (Send Requests & Accept Deliveries) */}
          {isCombinedStudentRunner && (
            <>
              {(currentView === 'student_runner_dashboard' ||
                currentView === 'available_jobs' ||
                currentView === 'my_deliveries') && (
                <StudentRunnerDashboard
                  myRequests={myRequests}
                  availableJobs={availableJobs}
                  myDeliveries={myDeliveries}
                  activeSection={currentView as StudentRunnerSection}
                  onNavigateSection={setCurrentView}
                  onNavigateToSubmit={() => setCurrentView('submit_request')}
                  onViewTracking={handleTrackRequest}
                  onRefresh={loadRequests}
                />
              )}
              {currentView === 'submit_request' && (
                <SubmitPrintPage
                  onBack={() => setCurrentView('student_runner_dashboard')}
                  onSubmitted={async (newReq) => {
                    setMyRequests((prev) =>
                      prev.some((r) => r.id === newReq.id) ? prev : [newReq, ...prev]
                    );
                    await loadRequests();
                  }}
                  onTrackRequest={handleTrackRequest}
                />
              )}
              {currentView === 'track_requests' && (
                <StudentTrackingPage
                  requests={myRequests}
                  selectedRef={selectedRefForTracking}
                  onRefresh={loadRequests}
                  onBack={() => setCurrentView('student_runner_dashboard')}
                />
              )}
            </>
          )}

          {/* 3. Separate Printing Shop Portal */}
          {user.role === 'print_shop_staff' && (
            <>
              {(currentView === 'staff_dashboard' || currentView === 'staff_review') && (
                <StaffDashboard
                  requests={shopRequests}
                  onRefresh={loadRequests}
                  onNavigateToPrinting={() => setCurrentView('staff_printing')}
                />
              )}
              {currentView === 'staff_printing' && (
                <StaffPrintingPage
                  requests={shopRequests}
                  onRefresh={loadRequests}
                  onBack={() => setCurrentView('staff_dashboard')}
                />
              )}
            </>
          )}

          {/* UC5: External Email Service Outbox Audit Log */}
          {currentView === 'email_outbox' && (
            <EmailLogsPage onBack={() => handleNavigateHome()} />
          )}
        </main>
      </div>

      {/* UC5: In-App Notification Center & External Email Simulator Drawer */}
      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        onSelectRequest={(ref) => {
          if (isCombinedStudentRunner) {
            handleTrackRequest(ref);
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
