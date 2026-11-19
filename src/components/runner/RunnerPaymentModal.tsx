import React, { useState } from 'react';
import { DollarSign, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { PrintRequest } from '../../types/index.ts';

interface RunnerPaymentModalProps {
  request: PrintRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onPaymentConfirmed: (updated: PrintRequest) => void;
}

export const RunnerPaymentModal: React.FC<RunnerPaymentModalProps> = ({
  request,
  isOpen,
  onClose,
  onPaymentConfirmed,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const amountDue = request.printPrice || 0;

  const handleConfirmCashPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const updated = await api.confirmCashPayment(request.id);
      onPaymentConfirmed(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm cash payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E5E5] overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E5E5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#242424]">Confirm Cash Payment (UC11)</h3>
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

        {/* Cash Amount Highlight */}
        <div className="p-5 bg-[#FFF5F5] border border-[#FED7D7] rounded-xl text-center space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
            Total Cash Amount Due
          </span>
          <div className="text-3xl font-extrabold text-[#800000]">
            ₱{amountDue.toFixed(2)}
          </div>
          <p className="text-[11px] text-gray-600 font-medium">
            Cash on Delivery strictly. No e-wallets or online gateways.
          </p>
        </div>

        {/* Transaction Details */}
        <div className="space-y-2 text-xs bg-[#F5F5F5] p-3.5 rounded-xl border border-[#E5E5E5]">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Student Payer:</span>
            <span className="font-bold text-[#242424]">{request.fullName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Room Location:</span>
            <span className="font-semibold text-[#242424]">{request.roomNumber}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Receiving Runner:</span>
            <span className="font-bold text-[#800000]">{user?.fullName}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-200">
            <span className="text-gray-500">Completion Status:</span>
            <span className="font-semibold text-gray-700">
              {request.deliveryJob?.deliveryStatus === 'Delivered'
                ? 'Will transition to COMPLETED'
                : 'Pending physical delivery'}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-gray-500 flex items-start gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
          <ShieldCheck className="w-4 h-4 text-[#800000] shrink-0 mt-0.5" />
          <span>
            By confirming, you attest that you have received the exact cash sum of <strong>₱{amountDue.toFixed(2)}</strong> from the student.
          </span>
        </div>

        {/* Actions */}
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
            onClick={handleConfirmCashPayment}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Confirming...' : 'Confirm Cash Received'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
