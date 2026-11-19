import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  DollarSign,
  Download,
  AlertCircle,
  CheckCircle2,
  Printer,
  User,
  MapPin,
  Clock,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { validatePrintPrice } from '../../utils/rules.ts';
import { api } from '../../api/client.ts';
import type { PrintRequest } from '../../types/index.ts';

interface StaffReviewModalProps {
  request: PrintRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedRequest: PrintRequest) => void;
}

export const StaffReviewModal: React.FC<StaffReviewModalProps> = ({
  request,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [priceInput, setPriceInput] = useState<string>(
    request?.printPrice ? request.printPrice.toString() : ''
  );
  const [submittingPrice, setSubmittingPrice] = useState(false);
  const [priceSuccess, setPriceSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPriceInput(request?.printPrice ? request.printPrice.toString() : '');
    setPriceSuccess(false);
    setError(null);
  }, [request?.id, request?.printPrice]);

  if (!isOpen || !request) return null;

  const handleSetPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validatePrintPrice(priceInput);
    if (!validation.valid || validation.parsedAmount === undefined) {
      setError(validation.error || 'Please enter a valid print price.');
      return;
    }

    setSubmittingPrice(true);
    try {
      const updated = await api.setPrice(request.id, validation.parsedAmount);
      setPriceSuccess(true);
      onUpdated(updated);
      setTimeout(() => {
        setPriceSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save print price.');
    } finally {
      setSubmittingPrice(false);
    }
  };

  const handleUpdateStatus = async (status: 'Printing' | 'Ready for Delivery') => {
    setError(null);
    try {
      const updated = await api.updatePrintStatus(request.id, status);
      onUpdated(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to update printing status.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-[#E5E5E5] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF5F5] text-[#800000] flex items-center justify-center font-bold">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#242424]">Review Print Request (UC6)</h3>
                <span className="font-mono text-xs font-bold text-[#800000]">{request.referenceNumber}</span>
              </div>
              <p className="text-xs text-gray-500">Inspect submitted document &amp; assign printing price</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Status Header */}
          <div className="flex items-center justify-between p-3.5 bg-[#F5F5F5] rounded-xl border border-[#E5E5E5]">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Current Status</span>
            <StatusBadge status={request.status} size="md" />
          </div>

          {/* Student & Delivery Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white border border-[#E5E5E5] rounded-xl">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <User className="w-3.5 h-3.5" /> Student Name
              </div>
              <div className="font-bold text-[#242424] text-sm">{request.fullName}</div>
            </div>

            <div className="p-3 bg-white border border-[#E5E5E5] rounded-xl">
              <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                <MapPin className="w-3.5 h-3.5" /> Delivery Room
              </div>
              <div className="font-bold text-[#800000] text-sm">{request.roomNumber}</div>
            </div>
          </div>

          {/* Document Section */}
          <div className="p-4 border border-[#E5E5E5] rounded-xl bg-[#FFF5F5]/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#800000]" />
                <div>
                  <h4 className="text-xs font-bold text-[#242424]">{request.fileName}</h4>
                  <p className="text-[10px] text-gray-500">
                    File size: {(request.fileSize / 1024).toFixed(1)} KB &bull; Submitted {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {request.filePath && (
                <a
                  href={request.filePath}
                  target="_blank"
                  rel="noreferrer"
                  download={request.fileName}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Open / Download
                </a>
              )}
            </div>

            {request.instructionMessage ? (
              <div className="pt-2 border-t border-[#E5E5E5]">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">
                  Student's Special Printing Instructions:
                </span>
                <p className="text-xs text-gray-800 italic mt-1 bg-white p-2.5 rounded-lg border border-[#E5E5E5]">
                  "{request.instructionMessage}"
                </p>
              </div>
            ) : (
              <div className="text-[11px] text-gray-400 italic">No specific instructions provided.</div>
            )}
          </div>

          {/* UC7: Set Print Price Form */}
          <div className="p-4 border border-[#E5E5E5] rounded-xl bg-white shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#800000]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
                  Assign Total Print Price (UC7)
                </h4>
              </div>
              {request.printPrice && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Current: ₱{request.printPrice.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              Calculate total based on page count, paper type, and color/B&amp;W. Student pays cash on room delivery.
            </p>

            <form onSubmit={handleSetPrice} className="flex gap-2 items-center">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500">₱</span>
                <input
                  type="number"
                  step="0.50"
                  min="1"
                  required
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="e.g. 25.00"
                  className="w-full pl-7 pr-3 py-2 text-xs bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
                />
              </div>
              <button
                type="submit"
                disabled={submittingPrice}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors shadow-xs shrink-0 disabled:opacity-60"
              >
                {submittingPrice ? 'Saving...' : 'Set Price & Notify Student'}
              </button>
            </form>

            {priceSuccess && (
              <div className="mt-2 text-xs text-emerald-700 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Price saved! Email notification sent to student.
              </div>
            )}
          </div>

          {/* UC8: Physical Print Processing Controls */}
          <div className="p-4 border border-[#E5E5E5] rounded-xl bg-[#F5F5F5]/60 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#242424]">
              Print Shop Processing Controls (UC8)
            </h4>
            <p className="text-[11px] text-gray-500">
              Update the job status as you physically print and prepare documents for runner delivery.
            </p>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus('Printing')}
                disabled={request.status === 'Printing' || request.status === 'Cancelled'}
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors disabled:opacity-50"
              >
                Mark as "Printing"
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus('Ready for Delivery')}
                disabled={
                  !request.printPrice ||
                  request.status === 'Ready for Delivery' ||
                  request.status === 'Out for Delivery' ||
                  request.status === 'Completed' ||
                  request.status === 'Cancelled'
                }
                className="px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors shadow-xs disabled:opacity-50"
              >
                Mark as "Ready for Delivery" (Release to Runners)
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5E5] bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close Review
          </button>
        </div>
      </div>
    </div>
  );
};
