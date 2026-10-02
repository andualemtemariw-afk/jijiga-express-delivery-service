import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  getAccessToken, 
  logout 
} from '../../services/googleAuth';
import { 
  sendDeliveryEmail, 
  buildOrderDispatchEmail, 
  listRecentDeliveryEmails, 
  GmailMessageItem 
} from '../../services/gmailService';
import { Order } from '../../types';
import { 
  Mail, 
  X, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  LogOut, 
  Clock, 
  ShieldCheck,
  User as UserIcon,
  FileText
} from 'lucide-react';

interface GmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  preselectedOrder?: Order | null;
}

export function GmailNotificationModal({
  isOpen,
  onClose,
  orders,
  preselectedOrder,
}: GmailNotificationModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    preselectedOrder?.id || (orders[0]?.id ?? '')
  );
  const [recipientEmail, setRecipientEmail] = useState<string>('andualemtemariw@gmail.com');
  const [sentEmails, setSentEmails] = useState<GmailMessageItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  // MANDATORY: User confirmation dialog state for destructive/mutating operation (sending email)
  const [pendingEmailData, setPendingEmailData] = useState<{
    to: string;
    subject: string;
    bodyText: string;
  } | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (preselectedOrder) {
      setSelectedOrderId(preselectedOrder.id);
    }

    initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        if (currentUser.email) {
          setRecipientEmail(currentUser.email);
        }
        loadHistory(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
  }, [isOpen, preselectedOrder]);

  const loadHistory = async (accessToken: string) => {
    setIsLoadingHistory(true);
    try {
      const items = await listRecentDeliveryEmails(accessToken);
      setSentEmails(items);
    } catch (err: any) {
      console.warn('Failed to load Gmail history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSignIn = async () => {
    setIsLoadingAuth(true);
    setErrorMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        if (result.user.email) {
          setRecipientEmail(result.user.email);
        }
        setFeedbackMessage('Connected to Gmail successfully!');
        setTimeout(() => setFeedbackMessage(null), 3000);
        await loadHistory(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setErrorMessage(err.message || 'Gmail authentication failed.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setSentEmails([]);
    setFeedbackMessage('Disconnected from Gmail.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const handleInitiateSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) {
      setErrorMessage('Please select an order to notify.');
      return;
    }
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMessage('Please provide a valid recipient email address.');
      return;
    }

    const emailPayload = buildOrderDispatchEmail(selectedOrder, recipientEmail.trim());
    // Triggers explicit user confirmation dialog
    setPendingEmailData(emailPayload);
  };

  // Explicit confirmation callback
  const handleConfirmSend = async () => {
    if (!pendingEmailData) return;
    const activeToken = token || (await getAccessToken());
    if (!activeToken) {
      setErrorMessage('Please sign in with Google first.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    try {
      await sendDeliveryEmail(activeToken, pendingEmailData);
      setFeedbackMessage(`Delivery email successfully sent to ${pendingEmailData.to}!`);
      setPendingEmailData(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
      await loadHistory(activeToken);
      setActiveTab('history');
    } catch (err: any) {
      console.error('Send error:', err);
      setErrorMessage(err.message || 'Failed to dispatch email via Gmail API.');
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Gmail Dispatch Notifications
                </h3>
                <span className="font-medium text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                  Workspace API
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Send official delivery receipts, waybills & arrival alerts directly from your Gmail
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close Gmail notification modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Notifications */}
          {feedbackMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!user ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto shadow-xs">
                <Mail className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                  Connect Your Gmail Account
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Sign in with permission to send automated order manifests and delivery receipts to customers and couriers directly through Gmail.
                </p>
              </div>

              {/* Official Google Material Button */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isLoadingAuth}
                  className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 shadow-xs transition-colors flex items-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isLoadingAuth ? 'Connecting to Gmail...' : 'Sign in with Google'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account Bar */}
              <div className="p-3 bg-red-50/70 border border-red-200/90 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-xs">
                    {user.email?.charAt(0).toUpperCase() || 'M'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs">{user.displayName || 'Authorized Dispatcher'}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-[11px] text-slate-600 font-mono">{user.email}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex bg-white rounded-lg p-0.5 border border-red-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('compose')}
                      className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        activeTab === 'compose' ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Compose
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                        activeTab === 'history' ? 'bg-red-600 text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sent ({sentEmails.length})
                    </button>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                    title="Disconnect Gmail"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {activeTab === 'compose' ? (
                <form onSubmit={handleInitiateSend} className="space-y-4">
                  {/* Select Order */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Select Order to Dispatch Receipt
                    </label>
                    <select
                      value={selectedOrderId}
                      onChange={(e) => setSelectedOrderId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
                    >
                      {orders.map((ord) => (
                        <option key={ord.id} value={ord.id}>
                          #{ord.id} · {ord.batchName} ({ord.totalPrice} ETB) - {ord.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Recipient Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Recipient Email Address
                    </label>
                    <input
                      type="email"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      required
                      placeholder="customer@example.com"
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
                    >
                    </input>
                  </div>

                  {/* Message Preview */}
                  {selectedOrder && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>Email Manifest Preview</span>
                      </label>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {buildOrderDispatchEmail(selectedOrder, recipientEmail).bodyText}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Review & Send via Gmail</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* History Tab */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Recent Delivery Emails Sent from your Gmail
                    </span>
                    <button
                      onClick={() => token && loadHistory(token)}
                      disabled={isLoadingHistory}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {isLoadingHistory ? (
                    <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                      <span>Fetching sent messages...</span>
                    </div>
                  ) : sentEmails.length === 0 ? (
                    <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                      <Mail className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                      <p className="text-xs text-slate-500 font-medium">No sent delivery emails recorded yet.</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Use the Compose tab to dispatch your first email.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {sentEmails.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-slate-900 truncate max-w-xs block">
                              {item.subject || 'Jijiga Express Delivery Notice'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {item.date ? new Date(item.date).toLocaleDateString() : 'Sent'}
                            </span>
                          </div>
                          {item.to && <span className="text-[11px] text-slate-500 block">To: {item.to}</span>}
                          {item.snippet && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                              "{item.snippet}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-[11px] text-slate-400">
            Powered by Gmail REST API & OAuth 2.0.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* MANDATORY USER CONFIRMATION DIALOG BEFORE SENDING EMAIL (DESTRUCTIVE / MUTATING OPERATION) */}
      {pendingEmailData && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-xl flex-shrink-0">
                <Send className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  Send Email via Gmail?
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to send this delivery notification to{' '}
                  <span className="font-semibold text-slate-900 font-mono">"{pendingEmailData.to}"</span>{' '}
                  using your connected Gmail account?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
              <div><strong className="text-slate-700">Subject:</strong> {pendingEmailData.subject}</div>
              <div><strong className="text-slate-700">Sender:</strong> {user?.email}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingEmailData(null)}
                disabled={isSending}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={isSending}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSending ? 'Sending via Gmail...' : 'Confirm & Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
