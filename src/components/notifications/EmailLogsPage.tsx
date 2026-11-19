import React, { useState, useEffect } from 'react';
import { Mail, Clock, RefreshCw, Send, CheckCircle2, Search, ArrowLeft, ShieldCheck, Code, Eye, ExternalLink } from 'lucide-react';
import { api } from '../../api/client.ts';
import type { EmailLogEntry } from '../../types/index.ts';

interface EmailLogsPageProps {
  onBack: () => void;
}

export const EmailLogsPage: React.FC<EmailLogsPageProps> = ({ onBack }) => {
  const [emails, setEmails] = useState<EmailLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmail, setSelectedEmail] = useState<EmailLogEntry | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [brevoConfig, setBrevoConfig] = useState<{
    provider: string;
    isConfigured: boolean;
    senderEmail: string;
    senderName: string;
    lastError?: { code?: string; message?: string; suggestion?: string } | null;
  } | null>(null);

  const fetchEmailsAndConfig = async () => {
    setLoading(true);
    try {
      const [logs, config] = await Promise.all([
        api.getEmailLogs(),
        api.getBrevoStatus().catch(() => null),
      ]);
      setEmails(logs);
      if (config) {
        setBrevoConfig(config);
      }
      if (logs.length > 0 && !selectedEmail) {
        setSelectedEmail(logs[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailsAndConfig();
  }, []);

  const filtered = emails.filter(
    (e) =>
      e.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.toEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-[#242424] tracking-tight">
              Email Logs
            </h2>
            <span className="text-[11px] font-bold text-white bg-[#800000] px-2.5 py-0.5 rounded-md">
              Brevo
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Status change email notifications sent to SorSU students.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEmailsAndConfig}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-gray-700 bg-white border border-[#E5E5E5] hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Brevo Provider Integration Status Banner */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF5F5] text-[#800000] flex items-center justify-center font-bold">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#242424]">Email Provider:</span>
              <strong className="text-sm font-extrabold text-[#800000]">Brevo (Transactional SMTP API)</strong>
              {brevoConfig?.isConfigured ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  &bull; Live API Active
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  &bull; Standby / Simulation (Ready for BREVO_API_KEY)
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Sender: <code className="font-mono text-gray-700">{brevoConfig?.senderEmail || 'printahead-noreply@sorsu.edu.ph'}</code> &bull; Name: {brevoConfig?.senderName || 'SorSU PrintAhead'}
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] text-gray-400">
          Endpoint: <code className="font-mono">https://api.brevo.com/v3/smtp/email</code>
        </div>
      </div>

      {/* Brevo Permission Alert Banner if API key lacks transactional.email scope */}
      {brevoConfig?.lastError && brevoConfig.lastError.code === 'permission_denied' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs text-xs text-amber-900 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-950">
              Brevo API Key Scope Action Required: "transactional.email"
            </div>
            <p className="text-amber-800 leading-relaxed">
              Brevo reported that your current API key does not have permission to send transactional emails. The system is safely recording all status change emails in the audit log so printing workflows remain 100% operational.
            </p>
            <div className="pt-1 text-[11px] text-amber-900 bg-white/70 p-2.5 rounded-lg border border-amber-200 font-medium">
              <strong>How to fix:</strong> In your <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noreferrer" className="underline font-bold text-[#800000]">Brevo Dashboard &rarr; SMTP &amp; API &rarr; API Keys</a>, click <strong>Generate a new API key</strong> and ensure you choose <strong>Full Access</strong> or check the <strong>Transactional Email</strong> scope. Also verify your sender address under <strong>Senders &amp; IP</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Email List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search recipient, ref number..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E5E5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
            />
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="bg-white border border-[#E5E5E5] rounded-xl p-8 text-center text-xs text-gray-400">
                No email dispatch logs found.
              </div>
            ) : (
              filtered.map((item) => {
                const isSelected = selectedEmail?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedEmail(item)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFF5F5] border-[#800000] shadow-xs ring-1 ring-[#800000]'
                        : 'bg-white border-[#E5E5E5] hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-mono font-bold text-[#800000]">{item.referenceNumber}</span>
                      <span className="text-gray-400">
                        {new Date(item.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#242424] truncate">{item.subject}</div>
                    <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                      <span className="truncate">To: {item.toEmail}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          item.provider === 'Brevo'
                            ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                            : item.provider === 'Brevo (Permission Required)'
                            ? 'text-amber-800 bg-amber-50 border-amber-200'
                            : 'text-gray-700 bg-gray-100 border-gray-200'
                        }`}
                      >
                        {item.provider || 'Brevo'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Email Detail View */}
        <div className="lg:col-span-7">
          {selectedEmail ? (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 shadow-xs space-y-4">
              <div className="border-b border-[#E5E5E5] pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#800000] uppercase tracking-wider">
                      Brevo Transactional Message
                    </span>
                    {selectedEmail.messageId && (
                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        ID: {selectedEmail.messageId}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(selectedEmail.sentAt).toLocaleString()}
                  </div>
                </div>

                <h3 className="text-sm font-bold text-[#242424]">{selectedEmail.subject}</h3>

                {selectedEmail.errorDetails && (
                  <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{selectedEmail.errorDetails}</span>
                  </div>
                )}

                <div className="text-xs text-gray-600 space-y-0.5 pt-1">
                  <div>
                    <strong className="text-[#242424]">From:</strong> {brevoConfig?.senderEmail || 'printahead-noreply@sorsu.edu.ph'} (SorSU Print Shop)
                  </div>
                  <div>
                    <strong className="text-[#242424]">To:</strong> {selectedEmail.toEmail}
                  </div>
                  <div>
                    <strong className="text-[#242424]">Reference:</strong>{' '}
                    <span className="font-mono text-[#800000] font-bold">{selectedEmail.referenceNumber}</span>
                  </div>
                </div>

                {/* View Mode Switcher */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setPreviewMode('html')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors ${
                      previewMode === 'html'
                        ? 'bg-[#800000] text-white'
                        : 'bg-[#F5F5F5] text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Eye className="w-3 h-3" /> HTML University Email
                  </button>
                  <button
                    onClick={() => setPreviewMode('text')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-colors ${
                      previewMode === 'text'
                        ? 'bg-[#800000] text-white'
                        : 'bg-[#F5F5F5] text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Code className="w-3 h-3" /> Plain Text Format
                  </button>
                </div>
              </div>

              {/* Email Content Preview */}
              {previewMode === 'html' && selectedEmail.htmlContent ? (
                <iframe
                  title={`Email Preview ${selectedEmail.referenceNumber}`}
                  srcDoc={selectedEmail.htmlContent}
                  sandbox=""
                  className="w-full h-96 border border-[#E5E5E5] rounded-xl bg-white shadow-xs"
                />
              ) : (
                <div className="bg-[#F5F5F5] border border-[#E5E5E5] rounded-xl p-4">
                  <pre className="text-xs font-mono text-[#242424] whitespace-pre-wrap leading-relaxed">
                    {selectedEmail.body}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center text-gray-400 text-xs">
              Select an email from the list to preview the dispatched Brevo message.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
