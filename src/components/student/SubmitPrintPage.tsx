import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Printer,
  MapPin,
  User,
  SlidersHorizontal,
  Clock,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { api } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  DEFAULT_PRINT_PREFERENCES,
  buildPrintInstructionMessage,
  validatePrintRequestInput,
  type PrintPreferences,
} from '../../utils/rules.ts';
import type { PrintRequest, PrintShop } from '../../types/index.ts';

interface SubmitPrintPageProps {
  onBack: () => void;
  onSubmitted: (newRequest: PrintRequest) => Promise<void> | void;
  onTrackRequest: (referenceNumber: string) => void;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg'];

export const SubmitPrintPage: React.FC<SubmitPrintPageProps> = ({
  onBack,
  onSubmitted,
  onTrackRequest,
}) => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [roomNumber, setRoomNumber] = useState('');
  const [shops, setShops] = useState<PrintShop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('shop-001');
  const [preferences, setPreferences] = useState<PrintPreferences>(DEFAULT_PRINT_PREFERENCES);
  const [customNotes, setCustomNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<PrintRequest | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getShops()
      .then((list) => {
        if (!active) return;
        const activeShops = list.filter((s) => s.isActive);
        setShops(activeShops);
        if (activeShops.length > 0) {
          setSelectedShopId(activeShops[0].id);
        }
      })
      .catch(() => {
        // fallback gracefully to default shop
      });
    return () => {
      active = false;
    };
  }, []);

  const validateAndAttachFile = (selected: File) => {
    const ext = selected.name.includes('.')
      ? '.' + selected.name.split('.').pop()!.toLowerCase()
      : '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError('Unsupported file format. Allowed: PDF, DOC, DOCX, PPT, PPTX, TXT, PNG, JPG.');
      return;
    }
    if (selected.size > 25 * 1024 * 1024) {
      setError('File exceeds 25MB limit.');
      return;
    }
    setFile(selected);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndAttachFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndAttachFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validatePrintRequestInput({
      fullName,
      roomNumber,
      copies: preferences.copies,
      hasFile: Boolean(file),
      fileSizeBytes: file?.size,
    });

    if (!validation.valid || !file) {
      setError(validation.error || 'Please complete all required fields.');
      return;
    }

    const compiledInstruction = buildPrintInstructionMessage(preferences, customNotes);

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fullName', fullName.trim());
      formData.append('roomNumber', roomNumber.trim());
      formData.append('instructionMessage', compiledInstruction);
      if (selectedShopId) {
        formData.append('shopId', selectedShopId);
      }
      formData.append('document', file);

      const res = await api.submitPrintRequest(formData);
      await onSubmitted(res.request);
      setSuccessResult(res.request);
    } catch (err: any) {
      setError(err.message || 'Failed to submit print request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForNew = () => {
    setSuccessResult(null);
    setFile(null);
    setRoomNumber('');
    setPreferences(DEFAULT_PRINT_PREFERENCES);
    setCustomNotes('');
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5]">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-[#800000] hover:underline flex items-center gap-1 mb-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h2 className="text-xl font-bold text-[#242424] tracking-tight">
            Submit Print Request
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Upload your file, choose print options, and set your delivery room.
          </p>
        </div>
      </div>

      {successResult ? (
        /* Success State Card */
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-[#E5E5E5] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#242424]">
                Print Request Submitted Successfully!
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Your job has been queued with status{' '}
                <strong className="text-amber-700">Pending Review</strong>.
              </p>
            </div>
          </div>

          <div className="p-5 bg-[#FFF5F5] border border-[#FED7D7] rounded-xl text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              Official Reference Number
            </span>
            <div
              data-testid="submitted-reference-number"
              className="font-mono text-2xl font-extrabold text-[#800000] tracking-tight"
            >
              {successResult.referenceNumber}
            </div>
          </div>

          <div className="p-4 bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl space-y-2.5 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Student Name:</span>
              <span className="font-bold text-[#242424] text-right">{successResult.fullName}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Attached Document:</span>
              <span className="font-semibold text-[#242424] truncate max-w-[260px] text-right">
                {successResult.fileName}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Delivery Room:</span>
              <span className="font-bold text-[#800000] text-right">{successResult.roomNumber}</span>
            </div>
            {successResult.instructionMessage && (
              <div className="pt-2 border-t border-[#E5E5E5]">
                <span className="text-gray-500 block mb-1">Printing Preferences &amp; Notes:</span>
                <p className="text-[#242424] bg-white p-2.5 rounded-lg border border-[#E5E5E5] leading-relaxed">
                  {successResult.instructionMessage}
                </p>
              </div>
            )}
          </div>

          <div className="text-xs text-gray-600 leading-relaxed bg-[#FFF5F5]/60 p-3.5 rounded-xl border border-[#FED7D7] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#800000] shrink-0 mt-0.5" />
            <span>
              An email notification has been triggered for your SorSU account. Print Shop Staff will review your document and assign the cash printing fee.
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-[#E5E5E5]">
            <button
              type="button"
              onClick={handleResetForNew}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-[#E5E5E5] hover:bg-gray-50 transition-colors"
            >
              Submit Another Request
            </button>
            <button
              type="button"
              onClick={() => onTrackRequest(successResult.referenceNumber)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors shadow-xs"
            >
              <span>Track Requests</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Main 2-Column Dedicated Form Layout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs space-y-6"
          >
            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5 flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Section 1: Requester & Delivery Room */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
                <User className="w-4 h-4 text-[#800000]" />
                <h3 className="text-sm font-bold text-[#242424]">
                  1. Student &amp; Room Delivery Details
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="submit-full-name"
                    className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5"
                  >
                    Student Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="submit-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Juan Dela Cruz"
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="submit-room-number"
                    className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5"
                  >
                    Campus Room / Location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="submit-room-number"
                      type="text"
                      required
                      value={roomNumber}
                      onChange={(e) => setRoomNumber(e.target.value)}
                      placeholder="e.g. Room 304, IT Building"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                    />
                  </div>
                </div>

                {shops.length > 0 && (
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="submit-printing-shop"
                      className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5"
                    >
                      Target Campus Printing Shop
                    </label>
                    <div className="relative">
                      <Store className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3 pointer-events-none" />
                      <select
                        id="submit-printing-shop"
                        value={selectedShopId}
                        onChange={(e) => setSelectedShopId(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000] focus:border-[#800000]"
                      >
                        {shops.map((shop) => (
                          <option key={shop.id} value={shop.id}>
                            {shop.name} — {shop.location}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Document Upload */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
                <FileText className="w-4 h-4 text-[#800000]" />
                <h3 className="text-sm font-bold text-[#242424]">
                  2. Document Attachment
                </h3>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`flex justify-center px-6 pt-6 pb-7 border-2 border-dashed rounded-xl transition-colors ${
                  isDragging
                    ? 'border-[#800000] bg-[#FFF5F5]'
                    : 'border-[#E5E5E5] hover:border-[#800000] bg-[#F5F5F5]/40'
                }`}
              >
                <div className="space-y-2 text-center">
                  <UploadCloud className="mx-auto h-9 w-9 text-[#800000]" />
                  <div className="text-xs text-gray-600">
                    <label
                      htmlFor="print-file-upload"
                      className="relative cursor-pointer font-bold text-[#800000] hover:underline"
                    >
                      <span>Choose a document</span>
                      <input
                        id="print-file-upload"
                        name="document"
                        type="file"
                        className="sr-only"
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg"
                        onChange={handleFileChange}
                      />
                    </label>
                    <span className="pl-1">or drag and drop it here</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Supported formats: PDF, DOC, DOCX, PPT, PPTX, TXT, PNG, JPG (Max 25MB)
                  </p>
                </div>
              </div>

              {file && (
                <div className="p-3 bg-[#FFF5F5]/60 border border-[#FED7D7] rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#E5E5E5] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-[#800000]" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold text-[#242424] truncate">
                        {file.name}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB &bull; Ready to upload
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label="Remove attached file"
                    className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Section 3: Printing Preferences */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-[#E5E5E5]">
                <SlidersHorizontal className="w-4 h-4 text-[#800000]" />
                <h3 className="text-sm font-bold text-[#242424]">
                  3. Printing Preferences
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="pref-copies"
                    className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5"
                  >
                    Copies
                  </label>
                  <input
                    id="pref-copies"
                    type="number"
                    min={1}
                    max={100}
                    value={preferences.copies}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setPreferences((prev) => ({
                        ...prev,
                        copies: Number.isNaN(val) ? 1 : Math.max(1, Math.min(100, val)),
                      }));
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="pref-paper-size"
                    className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5"
                  >
                    Paper Size
                  </label>
                  <select
                    id="pref-paper-size"
                    value={preferences.paperSize}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        paperSize: e.target.value as PrintPreferences['paperSize'],
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  >
                    <option value='Short (8.5" x 11")'>Short (8.5" x 11")</option>
                    <option value='A4 (8.27" x 11.69")'>A4 (8.27" x 11.69")</option>
                    <option value='Long / Legal (8.5" x 13")'>Long / Legal (8.5" x 13")</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="pref-color-mode"
                    className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5"
                  >
                    Color Mode
                  </label>
                  <select
                    id="pref-color-mode"
                    value={preferences.colorMode}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        colorMode: e.target.value as PrintPreferences['colorMode'],
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  >
                    <option value="Black & White">Black &amp; White</option>
                    <option value="Full Color">Full Color</option>
                    <option value="Color Cover + B&W Pages">Color Cover + B&amp;W Pages</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="pref-sides"
                    className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5"
                  >
                    Print Sides
                  </label>
                  <select
                    id="pref-sides"
                    value={preferences.sides}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        sides: e.target.value as PrintPreferences['sides'],
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  >
                    <option value="Single-Sided">Single-Sided</option>
                    <option value="Double-Sided">Double-Sided</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="pref-finishing"
                    className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5"
                  >
                    Finishing / Binding
                  </label>
                  <select
                    id="pref-finishing"
                    value={preferences.finishing}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        finishing: e.target.value as PrintPreferences['finishing'],
                      }))
                    }
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  >
                    <option value="None">None (Loose Sheets)</option>
                    <option value="Stapled (Top-Left)">Stapled (Top-Left)</option>
                    <option value="Folder / Fastener">Folder / Fastener</option>
                    <option value="Ring Bind">Ring Bind</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="submit-instructions"
                  className="block text-xs font-bold text-[#242424] uppercase tracking-wider mb-1.5"
                >
                  Additional Instructions (Optional)
                </label>
                <textarea
                  id="submit-instructions"
                  rows={3}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="e.g. Specific page range (pages 1–12 only), urgent before 3:00 PM class, etc."
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#E5E5E5] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#800000]"
                />
              </div>
            </div>

            {/* Form Action Footer */}
            <div className="pt-4 border-t border-[#E5E5E5] flex flex-col-reverse sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 border border-[#E5E5E5] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#800000] hover:bg-[#5C0000] transition-colors shadow-xs disabled:opacity-60"
              >
                <span>{loading ? 'Uploading & Submitting...' : 'Submit Print Request'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Right Column: Live Summary & Campus Workflow Info */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E5E5E5]">
                <Printer className="w-4 h-4 text-[#800000]" />
                <h3 className="text-sm font-bold text-[#242424]">Request Summary</h3>
              </div>

              <dl className="space-y-2.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Document:</dt>
                  <dd className="font-semibold text-[#242424] truncate max-w-[180px] text-right">
                    {file ? file.name : <span className="text-gray-400 italic">Not selected</span>}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Delivery Room:</dt>
                  <dd className="font-semibold text-[#800000] truncate max-w-[180px] text-right">
                    {roomNumber.trim() || <span className="text-gray-400 font-normal italic">Not specified</span>}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Copies:</dt>
                  <dd className="font-semibold text-[#242424]">{preferences.copies}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Paper Size:</dt>
                  <dd className="font-semibold text-[#242424] text-right">{preferences.paperSize}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Color Mode:</dt>
                  <dd className="font-semibold text-[#242424] text-right">{preferences.colorMode}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Print Sides:</dt>
                  <dd className="font-semibold text-[#242424]">{preferences.sides}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Finishing:</dt>
                  <dd className="font-semibold text-[#242424]">{preferences.finishing}</dd>
                </div>
                <div className="flex justify-between gap-2 pt-2 border-t border-[#E5E5E5]">
                  <dt className="text-gray-500">Payment Method:</dt>
                  <dd className="font-bold text-[#800000]">Cash on Delivery</dd>
                </div>
              </dl>
            </div>

            <div className="bg-[#FFF5F5] rounded-2xl border border-[#FED7D7] p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#800000]">
                <Clock className="w-4 h-4" />
                <span>What Happens Next?</span>
              </div>
              <ol className="text-xs text-gray-700 space-y-2 list-decimal list-inside leading-relaxed">
                <li>Your request receives a unique reference number and enters <strong>Pending Review</strong>.</li>
                <li>Print Shop Staff inspect your file and assign the printing price.</li>
                <li>Once printed, a Student Runner delivers it to your campus room.</li>
                <li>Pay the exact cash fee to the runner upon receiving your printouts.</li>
              </ol>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
