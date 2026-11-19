import React, { useState, useEffect } from 'react';
import { Bell, Mail, Check, X, ExternalLink, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../api/client.ts';
import type { EmailLogEntry } from '../../types/index.ts';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRequest?: (refNumber: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onSelectRequest,
}) => {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useAuth();
  const [activeTab, setActiveTab] = useState<'in_app' | 'emails'>('in_app');
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailLogEntry | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'emails') {
      loadEmails();
    }
  }, [isOpen, activeTab]);

  const loadEmails = async () => {
    setLoadingEmails(true);
    try {
      const logs = await api.getEmailLogs();
      setEmailLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEmails(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FFF5F5] text-[#800000] flex items-center justify-center font-bold">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#242424]">Notifications</h2>
              <p className="text-[11px] text-gray-500">Alerts &amp; Email Updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close notification center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-[#E5E5E5] px-4 pt-2 gap-4 bg-[#F5F5F5]/60">
          <button
            onClick={() => {
              setActiveTab('in_app');
              setSelectedEmail(null);
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'in_app'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            In-App Alerts
            {unreadCount > 0 && (
              <span className="bg-[#800000] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('emails');
              setSelectedEmail(null);
            }}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'emails'
                ? 'border-[#800000] text-[#800000]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            Email Service Outbox ({emailLogs.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'in_app' ? (
            <>
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-gray-500 font-medium">
                  {notifications.length} Total Alerts
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs text-[#800000] hover:text-[#5C0000] font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark all as read
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Bell className="w-10 h-10 mx-auto stroke-1 opacity-50 mb-2" />
                  <p className="text-sm">No notifications yet.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!notif.isRead) markNotificationRead(notif.id);
                      if (notif.referenceNumber && onSelectRequest) {
                        onSelectRequest(notif.referenceNumber);
                        onClose();
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      notif.isRead
                        ? 'bg-white border-[#E5E5E5] text-gray-700'
                        : 'bg-[#FFF5F5] border-[#FED7D7] text-[#242424] shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-[#800000]">
                        {notif.referenceNumber || 'System Update'}
                      </span>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs mt-1.5 leading-relaxed">{notif.message}</p>
                    {notif.referenceNumber && (
                      <div className="mt-2 text-[11px] text-[#800000] font-semibold flex items-center gap-1">
                        Track Request <ExternalLink className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              {selectedEmail ? (
                <div className="space-y-3">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="text-xs text-[#800000] font-semibold hover:underline flex items-center gap-1"
                  >
                    &larr; Back to Email Outbox
                  </button>
                  <div className="border border-[#E5E5E5] rounded-xl p-4 bg-white shadow-xs">
                    <div className="border-b border-[#E5E5E5] pb-3 mb-3">
                      <div className="text-xs font-semibold text-gray-500">To:</div>
                      <div className="text-xs font-bold text-[#242424]">{selectedEmail.toEmail}</div>
                      <div className="text-xs font-semibold text-gray-500 mt-2">Subject:</div>
                      <div className="text-xs font-bold text-[#800000]">{selectedEmail.subject}</div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Sent on {new Date(selectedEmail.sentAt).toLocaleString()}
                      </div>
                    </div>
                    <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap leading-relaxed bg-[#F5F5F5] p-3 rounded-lg border border-[#E5E5E5]">
                      {selectedEmail.body}
                    </pre>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs text-gray-500 font-medium">
                      External Email Service Audit Log
                    </span>
                    <button
                      onClick={loadEmails}
                      className="text-xs text-[#800000] hover:underline font-semibold"
                    >
                      Refresh
                    </button>
                  </div>

                  {loadingEmails ? (
                    <div className="text-center py-8 text-xs text-gray-400">Loading emails...</div>
                  ) : emailLogs.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Mail className="w-10 h-10 mx-auto stroke-1 opacity-50 mb-2" />
                      <p className="text-sm">No dispatched emails recorded yet.</p>
                    </div>
                  ) : (
                    emailLogs.map((email) => (
                      <div
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className="p-3.5 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#800000] transition-colors cursor-pointer shadow-xs"
                      >
                        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                          <span className="font-semibold text-[#800000]">{email.referenceNumber}</span>
                          <span>{new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <h4 className="text-xs font-bold text-[#242424] line-clamp-1">{email.subject}</h4>
                        <p className="text-[11px] text-gray-500 mt-1 truncate">To: {email.toEmail}</p>
                      </div>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
