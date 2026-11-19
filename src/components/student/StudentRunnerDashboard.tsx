import React, { useState } from 'react';
import {
  FilePlus,
  Clock,
  CheckCircle2,
  FileText,
  ArrowRight,
  Printer,
  ChevronRight,
  Truck,
  MapPin,
  DollarSign,
  AlertCircle,
  PackageCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatsCard } from '../common/StatsCard.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { RunnerDeliveryModal } from '../runner/RunnerDeliveryModal.tsx';
import { RunnerPaymentModal } from '../runner/RunnerPaymentModal.tsx';
import { api } from '../../api/client.ts';
import type { PrintRequest } from '../../types/index.ts';

export type StudentRunnerSection =
  | 'student_runner_dashboard'
  | 'available_jobs'
  | 'my_deliveries';

interface StudentRunnerDashboardProps {
  myRequests: PrintRequest[];
  availableJobs: PrintRequest[];
  myDeliveries: PrintRequest[];
  activeSection: StudentRunnerSection;
  onNavigateSection: (section: StudentRunnerSection) => void;
  onNavigateToSubmit: () => void;
  onViewTracking: (referenceNumber?: string) => void;
  onRefresh: () => Promise<void> | void;
}

export const StudentRunnerDashboard: React.FC<StudentRunnerDashboardProps> = ({
  myRequests,
  availableJobs,
  myDeliveries,
  activeSection,
  onNavigateSection,
  onNavigateToSubmit,
  onViewTracking,
  onRefresh,
}) => {
  const { user } = useAuth();
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedForDelivery, setSelectedForDelivery] = useState<PrintRequest | null>(null);
  const [selectedForPayment, setSelectedForPayment] = useState<PrintRequest | null>(null);

  // Metrics across BOTH sending requests AND accepting deliveries
  const myPendingRequests = myRequests.filter(
    (r) =>
      r.status === 'Pending Review' ||
      r.status === 'Reviewed / Awaiting Payment' ||
      r.status === 'Printing' ||
      r.status === 'Ready for Delivery' ||
      r.status === 'Out for Delivery'
  ).length;
  const completedDeliveries = myDeliveries.filter((r) => r.status === 'Completed').length;

  const handleAcceptJob = async (jobId: string) => {
    setAcceptingId(jobId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updated = await api.acceptDeliveryJob(jobId);
      setSuccessMsg(
        `Delivery job ${updated.referenceNumber} accepted! Please deliver to ${updated.roomNumber}.`
      );
      await onRefresh();
      onNavigateSection('my_deliveries');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept delivery job.');
    } finally {
      setAcceptingId(null);
    }
  };

  const sectionTabs: { id: StudentRunnerSection; label: string }[] = [
    { id: 'student_runner_dashboard', label: 'Overview' },
    { id: 'available_jobs', label: `Delivery Jobs (${availableJobs.length})` },
    { id: 'my_deliveries', label: `My Deliveries (${myDeliveries.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Combined Header Banner */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#800000] mb-1">
            Student Portal
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#242424] tracking-tight">
            {user?.fullName}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Submit print requests or accept campus deliveries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onNavigateToSubmit}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors whitespace-nowrap"
          >
            <FilePlus className="w-4 h-4" />
            <span>Submit Print</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('available_jobs')}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-[#800000] bg-[#FFF5F5] hover:bg-[#FED7D7] border border-[#FED7D7] transition-colors whitespace-nowrap tabular-nums"
          >
            <Truck className="w-4 h-4" />
            <span>Delivery Jobs ({availableJobs.length})</span>
          </button>
        </div>
      </div>

      {/* Section Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {sectionTabs.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onNavigateSection(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors tabular-nums ${
                isActive
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

      {/* Combined Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="My Requests"
          value={myRequests.length}
          icon={<FileText className="w-5 h-5" />}
        />
        <StatsCard
          label="Active Orders"
          value={myPendingRequests}
          icon={<Clock className="w-5 h-5" />}
          highlight={myPendingRequests > 0}
        />
        <StatsCard
          label="Open Deliveries"
          value={availableJobs.length}
          icon={<Truck className="w-5 h-5" />}
          highlight={availableJobs.length > 0}
        />
        <StatsCard
          label="Delivered"
          value={completedDeliveries}
          icon={<CheckCircle2 className="w-5 h-5" />}
          subtitle={`${myDeliveries.length} accepted`}
        />
      </div>

      {/* OVERVIEW SECTION: My Print Requests + Available Jobs Preview */}
      {activeSection === 'student_runner_dashboard' && (
        <div className="space-y-6">
          {/* Card 1: My Sent Print Requests */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#242424]">My Print Requests</h3>
              <button
                type="button"
                onClick={() => onViewTracking()}
                className="text-xs font-bold text-[#800000] hover:text-[#5C0000] flex items-center gap-1 shrink-0"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {myRequests.length === 0 ? (
              <div className="p-10 text-center">
                <Printer className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-gray-700">No print requests yet</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  You have not submitted any personal print requests yet.
                </p>
                <button
                  type="button"
                  onClick={onNavigateToSubmit}
                  className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#800000] rounded-lg hover:bg-[#5C0000] transition-colors"
                >
                  Submit Your First Print Request
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Ref Number</th>
                      <th className="py-3 px-4">Document</th>
                      <th className="py-3 px-4">Room Location</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5] text-xs">
                    {myRequests.slice(0, 5).map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#800000]">
                          {req.referenceNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#242424] max-w-[200px] truncate">
                          {req.fileName}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">{req.roomNumber}</td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={req.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#242424]">
                          {req.printPrice ? (
                            `₱${req.printPrice.toFixed(2)}`
                          ) : (
                            <span className="text-gray-400 font-normal">Pending</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onViewTracking(req.referenceNumber)}
                            className="inline-flex items-center gap-1 font-bold text-[#800000] hover:underline"
                          >
                            Track <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card 2: Quick Preview of Peer Delivery Jobs to Accept */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-[#242424]">Available Delivery Jobs</h3>
              <button
                type="button"
                onClick={() => onNavigateSection('available_jobs')}
                className="text-xs font-bold text-[#800000] hover:text-[#5C0000] flex items-center gap-1 shrink-0"
              >
                View All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {availableJobs.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                No unclaimed delivery jobs from other students right now.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Ref Number</th>
                      <th className="py-3 px-4">Student &amp; Destination</th>
                      <th className="py-3 px-4">Document</th>
                      <th className="py-3 px-4">Cash Due</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5E5] text-xs">
                    {availableJobs.slice(0, 5).map((job) => (
                      <tr key={job.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#800000]">
                          {job.referenceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#242424]">{job.fullName}</div>
                          <div className="text-[11px] text-[#800000] font-semibold flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {job.roomNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#242424] max-w-[200px] truncate">
                          {job.fileName}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-800">
                          ₱{job.printPrice ? job.printPrice.toFixed(2) : '0.00'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleAcceptJob(job.id)}
                            disabled={acceptingId === job.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors shadow-xs disabled:opacity-60"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>{acceptingId === job.id ? 'Accepting...' : 'Accept Job'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AVAILABLE DELIVERY JOBS SECTION */}
      {activeSection === 'available_jobs' && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#242424]">Available Delivery Jobs</h3>
              <p className="text-xs text-gray-500">
                Printed peer requests ready for room delivery.
              </p>
            </div>
            <span className="text-xs font-bold text-[#800000] bg-[#FFF5F5] px-2.5 py-1 rounded-md border border-[#FED7D7] tabular-nums">
              {availableJobs.length} Ready
            </span>
          </div>

          {availableJobs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              <Truck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-600">No delivery jobs available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Ref</th>
                    <th className="py-3 px-4">Student &amp; Room</th>
                    <th className="py-3 px-4">Pickup Shop</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Cash Due</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] text-xs">
                  {availableJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#800000] tabular-nums">
                        {job.referenceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#242424]">{job.fullName}</div>
                        <div className="text-[11px] text-[#800000] font-semibold flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {job.roomNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {job.shopName || 'SorSU Main Print Shop'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#242424] truncate max-w-[200px]">
                          {job.fileName}
                        </div>
                        <div className="text-[10px] text-gray-400 tabular-nums">
                          {(job.fileSize / 1024).toFixed(1)} KB
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-800 text-sm tabular-nums">
                        ₱{job.printPrice ? job.printPrice.toFixed(2) : '0.00'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleAcceptJob(job.id)}
                          disabled={acceptingId === job.id}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors disabled:opacity-60 whitespace-nowrap"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>{acceptingId === job.id ? 'Accepting...' : 'Accept Job'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MY ACCEPTED DELIVERIES SECTION */}
      {activeSection === 'my_deliveries' && (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#242424]">My Deliveries</h3>
              <p className="text-xs text-gray-500">
                Confirm handover and cash collection.
              </p>
            </div>
          </div>

          {myDeliveries.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              <PackageCheck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-600">You have no accepted deliveries</p>
              <p className="mt-1">Check the Available Delivery Jobs tab to accept peer deliveries.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Ref Number</th>
                    <th className="py-3 px-4">Student &amp; Room</th>
                    <th className="py-3 px-4">Document</th>
                    <th className="py-3 px-4">Delivery Status</th>
                    <th className="py-3 px-4">Cash Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] text-xs">
                  {myDeliveries.map((job) => {
                    const isDelivered = job.deliveryJob?.deliveryStatus === 'Delivered';
                    const isPaid = job.payment?.paymentStatus === 'Confirmed';
                    const isCompleted = job.status === 'Completed';

                    return (
                      <tr key={job.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#800000]">
                          {job.referenceNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#242424]">{job.fullName}</div>
                          <div className="text-[11px] text-[#800000] font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {job.roomNumber}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#242424] truncate max-w-[180px]">
                            {job.fileName}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Fee: ₱{job.printPrice ? job.printPrice.toFixed(2) : '0.00'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {isDelivered ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Delivered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-semibold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                              <Clock className="w-3 h-3" /> Out for Delivery
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Cash Paid (₱{job.printPrice?.toFixed(2)})
                            </span>
                          ) : (
                            <span className="font-bold text-red-700">
                              Unpaid (₱{job.printPrice ? job.printPrice.toFixed(2) : '0.00'} due)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isDelivered && (
                              <button
                                type="button"
                                onClick={() => setSelectedForDelivery(job)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] rounded-lg transition-colors whitespace-nowrap"
                              >
                                Mark Delivered
                              </button>
                            )}

                            {!isPaid && (
                              <button
                                type="button"
                                onClick={() => setSelectedForPayment(job)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Collect Cash</span>
                              </button>
                            )}

                            {isCompleted && (
                              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4" /> Completed
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Deliver Modal (UC10) */}
      <RunnerDeliveryModal
        isOpen={Boolean(selectedForDelivery)}
        request={selectedForDelivery}
        onClose={() => setSelectedForDelivery(null)}
        onDelivered={() => {
          onRefresh();
        }}
      />

      {/* Payment Modal (UC11) */}
      <RunnerPaymentModal
        isOpen={Boolean(selectedForPayment)}
        request={selectedForPayment}
        onClose={() => setSelectedForPayment(null)}
        onPaymentConfirmed={() => {
          onRefresh();
        }}
      />
    </div>
  );
};
