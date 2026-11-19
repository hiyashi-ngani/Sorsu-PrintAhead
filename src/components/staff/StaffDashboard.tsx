import React, { useState } from 'react';
import {
  Printer,
  FileCheck,
  Clock,
  DollarSign,
  Truck,
  Search,
  Filter,
  Eye,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { StatsCard } from '../common/StatsCard.tsx';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { StaffReviewModal } from './StaffReviewModal.tsx';
import type { PrintRequest, RequestStatus } from '../../types/index.ts';

interface StaffDashboardProps {
  requests: PrintRequest[];
  onRefresh: () => void;
  onNavigateToPrinting: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  requests,
  onRefresh,
  onNavigateToPrinting,
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<PrintRequest | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Metrics
  const totalIncoming = requests.length;
  const pendingReview = requests.filter((r) => r.status === 'Pending Review').length;
  const awaitingPrice = requests.filter((r) => !r.printPrice && r.status !== 'Cancelled').length;
  const currentlyPrinting = requests.filter((r) => r.status === 'Printing').length;
  const readyForDelivery = requests.filter((r) => r.status === 'Ready for Delivery').length;

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenReview = (request: PrintRequest) => {
    setSelectedRequest(request);
    setIsReviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#800000] mb-1">
            Printing Shop Portal
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#242424] tracking-tight">
            {user?.fullName || 'Printing Shop'}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Review documents, set print prices, and release jobs for delivery.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={onNavigateToPrinting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Printing Queue</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatsCard
          label="Total Requests"
          value={totalIncoming}
          icon={<FileCheck className="w-4 h-4" />}
        />
        <StatsCard
          label="Pending Review"
          value={pendingReview}
          icon={<Clock className="w-4 h-4" />}
          highlight={pendingReview > 0}
        />
        <StatsCard
          label="Awaiting Price"
          value={awaitingPrice}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatsCard
          label="Currently Printing"
          value={currentlyPrinting}
          icon={<Printer className="w-4 h-4" />}
        />
        <StatsCard
          label="Ready for Runner"
          value={readyForDelivery}
          icon={<Truck className="w-4 h-4" />}
        />
      </div>

      {/* Incoming Request Management Table */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        {/* Table Filters & Search */}
        <div className="p-4 sm:p-5 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#242424]">Incoming Requests</h3>
            <p className="text-xs text-gray-500">Inspect files and assign prices</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search student, ref, room..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#F5F5F5] border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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

        {/* Table */}
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No incoming print requests match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Student &amp; Room</th>
                  <th className="py-3 px-4">Document Attachment</th>
                  <th className="py-3 px-4">Instructions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4 text-right">Actions</th>
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
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#242424] truncate max-w-[180px]">
                        {req.fileName}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {(req.fileSize / 1024).toFixed(1)} KB
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <span className="text-gray-600 line-clamp-2 text-[11px]">
                        {req.instructionMessage || <span className="italic text-gray-400">None</span>}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={req.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      {req.printPrice ? (
                        <span className="font-bold text-emerald-800">
                          ₱{req.printPrice.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-semibold text-[11px]">
                          Unpriced
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenReview(req)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review &amp; Price</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Review Modal (UC6, UC7, UC8) */}
      <StaffReviewModal
        isOpen={isReviewModalOpen}
        request={selectedRequest}
        onClose={() => setIsReviewModalOpen(false)}
        onUpdated={(updated) => {
          setSelectedRequest(updated);
          onRefresh();
        }}
      />
    </div>
  );
};
