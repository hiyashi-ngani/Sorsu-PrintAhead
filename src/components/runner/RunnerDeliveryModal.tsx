import React, { useState } from 'react';
import { Truck, CheckCircle2, AlertCircle, X, MapPin, User, FileText } from 'lucide-react';
import { api } from '../../api/client.ts';
import type { PrintRequest } from '../../types/index.ts';

interface RunnerDeliveryModalProps {
  request: PrintRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onDelivered: (updated: PrintRequest) => void;
}

export const RunnerDeliveryModal: React.FC<RunnerDeliveryModalProps> = ({
  request,
  isOpen,
  onClose,
  onDelivered,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const handleConfirmDelivery = async () => {
    setLoading(true);
    setError(null);
    try {
      const updated = await api.markJobDelivered(request.id);
      onDelivered(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to mark as delivered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E5E5] overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FFF5F5] text-[#800000] flex items-center justify-center font-bold">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#242424]">Deliver Printouts (UC10)</h3>
              <span className="font-mono text-xs text-[#800000] font-bold">{request.referenceNumber}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2 text-xs bg-[#F5F5F5] p-3.5 rounded-xl border border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Student Name:</span>
            <span className="font-bold text-[#242424]">{request.fullName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Destination Room:</span>
            <span className="font-bold text-[#800000]">{request.roomNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Document:</span>
            <span className="font-medium text-[#242424] truncate max-w-[200px]">{request.fileName}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-200">
            <span className="text-gray-500">Cash Amount to Collect:</span>
            <span className="font-bold text-emerald-800 text-sm">
              ₱{request.printPrice ? request.printPrice.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Confirm that you have physically handed over the printed documents to the student in room <strong>{request.roomNumber}</strong>.
        </p>

        <div className="pt-2 flex justify-end gap-2 border-t border-[#E5E5E5]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelivery}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] rounded-lg transition-colors shadow-xs disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Updating...' : 'Confirm Handover / Delivered'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
