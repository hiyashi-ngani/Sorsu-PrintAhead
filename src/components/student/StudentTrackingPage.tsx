import React, { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  FileText,
  DollarSign,
  Truck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ArrowLeft,
  X,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { canStudentCancelRequest } from '../../utils/rules.ts';
import type { PrintRequest, RequestStatus } from '../../types/index.ts';

interface StudentTrackingPageProps {
  requests: PrintRequest[];
  selectedRef?: string;
  onRefresh: () => void;
  onBack: () => void;
}

export const StudentTrackingPage: React.FC<StudentTrackingPageProps> = ({
  requests,
  selectedRef,
  onRefresh,
  onBack,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState(selectedRef || '');
  const [activeRequest, setActiveRequest] = useState<PrintRequest | null>(
    selectedRef
      ? requests.find((r) => r.referenceNumber === selectedRef || r.id === selectedRef) || requests[0] || null
      : requests[0] || null
  );

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedRef) {
      setSearchTerm(selectedRef);
      const match = requests.find((r) => r.referenceNumber === selectedRef || r.id === selectedRef);
      if (match) {
        setActiveRequest(match);
        return;
      }
    }
    if (activeRequest) {
      const updatedMatch = requests.find((r) => r.id === activeRequest.id);
      setActiveRequest(updatedMatch || requests[0] || null);
    } else if (requests.length > 0) {
      setActiveRequest(requests[0]);
    }
  }, [selectedRef, requests]);

  const filteredRequests = requests.filter(
    (r) =>
      r.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stages: { label: RequestStatus; desc: string }[] = [
    { label: 'Pending Review', desc: 'Request submitted to print staff' },
    { label: 'Reviewed / Awaiting Payment', desc: 'Price calculated, queued for print' },
    { label: 'Printing', desc: 'Document being printed physically' },
    { label: 'Ready for Delivery', desc: 'Printed & waiting for runner' },
    { label: 'Out for Delivery', desc: 'Runner delivering to room' },
    { label: 'Completed', desc: 'Delivered & cash collected' },
  ];

  const getStepIndex = (status: RequestStatus) => {
    if (status === 'Cancelled') return -1;
    switch (status) {
      case 'Pending Review':
        return 0;
      case 'Reviewed / Awaiting Payment':
        return 1;
      case 'Printing':
        return 2;
      case 'Ready for Delivery':
        return 3;
      case 'Out for Delivery':
        return 4;
      case 'Completed':
        return 5;
      default:
        return 0;
    }
  };

  const currentStep = activeRequest ? getStepIndex(activeRequest.status) : 0;
  const cancelEligibility = activeRequest && user
    ? canStudentCancelRequest({ studentId: activeRequest.studentId, status: activeRequest.status }, user.id)
    : { canCancel: false, reason: 'No active request' };

  const handleConfirmCancel = async () => {
    if (!activeRequest) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const updated = await api.cancelRequest(activeRequest.id);
      setActiveRequest(updated);
      setCancelMessage(`Print request ${activeRequest.referenceNumber} has been successfully cancelled.`);
      setCancelModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel request');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <button
            onClick={onBack}
            className="text-xs font-semibold text-[#800000] hover:underline flex items-center gap-1 mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h2 className="text-xl font-bold text-[#242424] tracking-tight">
            Track Requests
          </h2>
          <p className="text-xs text-gray-500">
            Check status, pricing, and room delivery updates.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Reference / File..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]"
          />
        </div>
      </div>

      {cancelMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl p-3.5 flex items-center justify-between">
          <span>{cancelMessage}</span>
          <button onClick={() => setCancelMessage(null)} className="text-red-500 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Layout: Selector list on left, detailed tracker on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 mb-2">
            Your Printing Requests ({filteredRequests.length})
          </div>

          {filteredRequests.length === 0 ? (
            <div className="bg-white border border-[#E5E5E5] rounded-xl p-6 text-center text-xs text-gray-400">
              No matching requests found.
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isSelected = activeRequest?.id === req.id;
              return (
                <div
                  key={req.id}
                  onClick={() => setActiveRequest(req)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#800000] shadow-sm ring-1 ring-[#800000]'
                      : 'bg-white border-[#E5E5E5] hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#800000]">
                      {req.referenceNumber}
                    </span>
                    <StatusBadge status={req.status} size="sm" />
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[#242424] truncate">
                    {req.fileName}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                    <span>{req.roomNumber}</span>
                    <span>{req.printPrice ? `₱${req.printPrice.toFixed(2)}` : 'Price pending'}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-8">
          {activeRequest ? (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-extrabold text-[#800000]">
                      {activeRequest.referenceNumber}
                    </span>
                    <StatusBadge status={activeRequest.status} size="md" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Submitted on {new Date(activeRequest.createdAt).toLocaleDateString()} at{' '}
                    {new Date(activeRequest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Cancel Request Action Button (UC4) */}
                {activeRequest.status !== 'Cancelled' && activeRequest.status !== 'Completed' && (
                  <div>
                    {cancelEligibility.canCancel ? (
                      <button
                        onClick={() => setCancelModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                      >
                        Cancel Print Request
                      </button>
                    ) : (
                      <div className="text-right">
                        <span className="text-[11px] text-gray-400 italic">
                          Cancellation locked (printing in progress)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Workflow Stepper */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
                  Printing &amp; Delivery Progress
                </h4>

                {activeRequest.status === 'Cancelled' ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800">
                    <XCircle className="w-6 h-6 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Request Cancelled</div>
                      <div className="text-xs text-red-700">
                        This print request was cancelled by the student before printing commenced.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                      {stages.map((stage, idx) => {
                        const isDone = currentStep >= idx;
                        const isCurrent = currentStep === idx;
                        return (
                          <div
                            key={stage.label}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              isCurrent
                                ? 'bg-[#FFF5F5] border-[#800000] ring-1 ring-[#800000]'
                                : isDone
                                ? 'bg-white border-emerald-200'
                                : 'bg-[#F5F5F5]/60 border-gray-200 opacity-60'
                            }`}
                          >
                            <div
                              className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-xs font-bold mb-1.5 ${
                                isDone
                                  ? 'bg-[#800000] text-white'
                                  : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                            </div>
                            <div className="text-[11px] font-bold text-[#242424] leading-tight">
                              {stage.label}
                            </div>
                            <div className="text-[9px] text-gray-400 mt-1 leading-snug hidden sm:block">
                              {stage.desc}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Document & Instructions */}
                <div className="p-4 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5]/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#242424]">
                    <FileText className="w-4 h-4 text-[#800000]" />
                    <span>Document Details</span>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#242424] truncate">
                      {activeRequest.fileName}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      Size: {(activeRequest.fileSize / 1024).toFixed(1)} KB
                    </div>
                  </div>
                  {activeRequest.filePath && (
                    <a
                      href={activeRequest.filePath}
                      target="_blank"
                      rel="noreferrer"
                      download={activeRequest.fileName}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#800000] hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" /> Download / View Document
                    </a>
                  )}
                  {activeRequest.instructionMessage && (
                    <div className="pt-2 border-t border-[#E5E5E5]">
                      <span className="text-[10px] font-bold uppercase text-gray-400">
                        Student Instructions:
                      </span>
                      <p className="text-xs text-gray-700 italic mt-0.5">
                        "{activeRequest.instructionMessage}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Pricing & Delivery Info */}
                <div className="p-4 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5]/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#242424]">
                    <Truck className="w-4 h-4 text-[#800000]" />
                    <span>Payment &amp; Delivery</span>
                  </div>

                  <div className="flex justify-between items-baseline border-b border-[#E5E5E5] pb-2">
                    <span className="text-xs text-gray-500">Printing Price:</span>
                    <span className="text-base font-extrabold text-[#800000]">
                      {activeRequest.printPrice
                        ? `₱${activeRequest.printPrice.toFixed(2)}`
                        : 'Awaiting Staff Review'}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Delivery Room:</span>
                      <span className="font-semibold text-[#242424]">{activeRequest.roomNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Assigned Runner:</span>
                      <span className="font-semibold text-[#242424]">
                        {activeRequest.deliveryJob?.runnerName || 'Pending assignment'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment Status:</span>
                      <span className="font-semibold text-[#242424]">
                        {activeRequest.payment?.paymentStatus === 'Confirmed' ? (
                          <span className="text-emerald-700">Cash Paid &amp; Verified</span>
                        ) : (
                          'Cash on Delivery'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center text-gray-400">
              Select a printing request from the left list to view status details.
            </div>
          )}
        </div>
      </div>

      {/* UC4: Cancel Request Confirmation Modal */}
      {cancelModalOpen && activeRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E5E5E5] animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#242424]">Cancel Print Request?</h3>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              Withdraw request{' '}
              <strong className="text-[#800000]">{activeRequest.referenceNumber}</strong>? No fee will be charged.
            </p>

            {cancelError && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {cancelError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                No, Keep Request
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-lg transition-colors disabled:opacity-60"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
