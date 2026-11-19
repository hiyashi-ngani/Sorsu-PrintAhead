import React, { useState } from 'react';
import {
  Printer,
  FileText,
  Download,
  ArrowRight,
  CheckCircle2,
  Clock,
  Truck,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import { StatusBadge } from '../common/StatusBadge.tsx';
import { api } from '../../api/client.ts';
import type { PrintRequest } from '../../types/index.ts';

interface StaffPrintingPageProps {
  requests: PrintRequest[];
  onRefresh: () => void;
  onBack: () => void;
}

export const StaffPrintingPage: React.FC<StaffPrintingPageProps> = ({
  requests,
  onRefresh,
  onBack,
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Eligible print requests: Reviewed / Awaiting Payment or Printing
  const printQueue = requests.filter(
    (r) =>
      r.status === 'Reviewed / Awaiting Payment' ||
      r.status === 'Printing' ||
      r.status === 'Pending Review'
  );

  const handleStatusChange = async (id: string, status: 'Printing' | 'Ready for Delivery') => {
    setUpdatingId(id);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const updated = await api.updatePrintStatus(id, status);
      setSuccessMsg(`Request ${updated.referenceNumber} status updated to "${status}". Email notification dispatched.`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update printing status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <button
            onClick={onBack}
            className="text-xs font-semibold text-[#800000] hover:underline flex items-center gap-1 mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h2 className="text-xl font-bold text-[#242424] tracking-tight">
            Printing Queue
          </h2>
          <p className="text-xs text-gray-500">
            Download files, mark Printing, then release as Ready for Delivery.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Print Queue Cards */}
      <div className="space-y-3">
        {printQueue.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center text-gray-400">
            <Printer className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <h4 className="text-sm font-bold text-gray-600">Print Queue Empty</h4>
            <p className="text-xs text-gray-400 mt-1">
              There are currently no documents pending physical printing.
            </p>
          </div>
        ) : (
          printQueue.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#800000]">
                    {req.referenceNumber}
                  </span>
                  <StatusBadge status={req.status} size="sm" />
                  {req.printPrice && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ₱{req.printPrice.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-[#242424]">
                  <FileText className="w-4 h-4 text-[#800000]" />
                  <span>{req.fileName}</span>
                  <span className="text-gray-400 font-normal">
                    ({(req.fileSize / 1024).toFixed(1)} KB)
                  </span>
                </div>

                <div className="text-xs text-gray-600">
                  Student: <strong className="text-[#242424]">{req.fullName}</strong> &bull; Room:{' '}
                  <strong className="text-[#800000]">{req.roomNumber}</strong>
                </div>

                {req.instructionMessage && (
                  <div className="text-[11px] text-gray-500 italic bg-[#F5F5F5] p-2 rounded-lg border border-[#E5E5E5]">
                    "{req.instructionMessage}"
                  </div>
                )}
              </div>

              {/* Action Controls */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {req.filePath && (
                  <a
                    href={req.filePath}
                    target="_blank"
                    rel="noreferrer"
                    download={req.fileName}
                    className="px-3.5 py-2 text-xs font-bold text-[#800000] bg-[#FFF5F5] hover:bg-[#FED7D7] rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download File
                  </a>
                )}

                {req.status !== 'Printing' && (
                  <button
                    onClick={() => handleStatusChange(req.id, 'Printing')}
                    disabled={updatingId === req.id}
                    className="px-4 py-2 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Mark as "Printing"
                  </button>
                )}

                <button
                  onClick={() => handleStatusChange(req.id, 'Ready for Delivery')}
                  disabled={
                    updatingId === req.id ||
                    !req.printPrice ||
                    req.status === 'Ready for Delivery'
                  }
                  className="px-4 py-2 text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] rounded-lg transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Mark "Ready for Delivery"</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
