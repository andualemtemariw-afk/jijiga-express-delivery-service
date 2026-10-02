import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { 
  initAuth, 
  googleSignIn, 
  getAccessToken, 
  logout 
} from '../../services/googleAuth';
import { 
  DriveFile, 
  listDriveFiles, 
  uploadOrderReceiptToDrive, 
  deleteDriveFile,
  getOrCreateReceiptsFolder 
} from '../../services/googleDrive';
import { Order } from '../../types';
import { 
  HardDrive, 
  X, 
  UploadCloud, 
  FileText, 
  Trash2, 
  ExternalLink, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  LogOut,
  FolderOpen,
  ShieldCheck
} from 'lucide-react';

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}

export function GoogleDriveSyncModal({
  isOpen,
  onClose,
  orders,
}: GoogleDriveSyncModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null);
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Destructive delete confirmation dialog state
  const [fileToDelete, setFileToDelete] = useState<DriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Check if token is available
    initAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        if (currentToken) {
          loadFiles(currentToken);
        }
      },
      () => {
        // Not authenticated
        setUser(null);
        setToken(null);
      }
    );
  }, [isOpen]);

  const loadFiles = async (accessToken: string) => {
    if (!accessToken) return;
    setIsLoadingFiles(true);
    setErrorMessage(null);
    try {
      let folderId: string | undefined;
      try {
        folderId = await getOrCreateReceiptsFolder(accessToken);
      } catch (folderErr) {
        console.warn('Receipts folder access notice, fetching files directly:', folderErr);
      }
      const fetched = await listDriveFiles(
        accessToken, 
        folderId ? { folderId, pageSize: 30 } : { pageSize: 30 }
      );
      setFiles(fetched);
    } catch (err: any) {
      console.error('Error fetching Google Drive files:', err);
      const isNetworkOrAuth = 
        err?.message?.toLowerCase().includes('failed to fetch') || 
        err?.name === 'TypeError';

      if (isNetworkOrAuth) {
        setErrorMessage(
          'Could not connect to Google Drive API. Your session token may have expired or network is unreachable. Please click "Sign in with Google" below to refresh.'
        );
      } else {
        setErrorMessage(err.message || 'Failed to load files from Google Drive');
      }
    } finally {
      setIsLoadingFiles(false);
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
        setFeedbackMessage('Successfully connected to Google Drive!');
        setTimeout(() => setFeedbackMessage(null), 3000);
        await loadFiles(result.accessToken);
      }
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setErrorMessage(err.message || 'Google Sign-in failed. Please try again.');
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setFiles([]);
    setFeedbackMessage('Disconnected from Google Drive.');
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleUploadSingleOrder = async (order: Order) => {
    const activeToken = token || (await getAccessToken());
    if (!activeToken) {
      setErrorMessage('Please sign in to Google Drive first.');
      return;
    }

    setUploadingOrderId(order.id);
    setErrorMessage(null);
    try {
      const uploaded = await uploadOrderReceiptToDrive(activeToken, order);
      setFeedbackMessage(`Uploaded receipt #${order.id} to Google Drive!`);
      setTimeout(() => setFeedbackMessage(null), 3000);
      setFiles((prev) => [uploaded, ...prev]);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setErrorMessage(err.message || 'Failed to upload receipt to Google Drive.');
    } finally {
      setUploadingOrderId(null);
    }
  };

  const handleBatchSync = async () => {
    const activeToken = token || (await getAccessToken());
    if (!activeToken) {
      setErrorMessage('Please sign in to Google Drive first.');
      return;
    }

    setIsBatchUploading(true);
    setErrorMessage(null);
    let successCount = 0;

    try {
      for (const order of orders.slice(0, 10)) {
        try {
          await uploadOrderReceiptToDrive(activeToken, order);
          successCount++;
        } catch (e) {
          console.warn(`Failed order ${order.id}`, e);
        }
      }
      setFeedbackMessage(`Successfully archived ${successCount} receipts to Google Drive!`);
      setTimeout(() => setFeedbackMessage(null), 4000);
      await loadFiles(activeToken);
    } catch (err: any) {
      setErrorMessage(err.message || 'Batch sync encountered an error.');
    } finally {
      setIsBatchUploading(false);
    }
  };

  // Explicit confirmation before executing destructive delete
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    const activeToken = token || (await getAccessToken());
    if (!activeToken) return;

    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteDriveFile(activeToken, fileToDelete.id);
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setFeedbackMessage(`Deleted "${fileToDelete.name}" from Google Drive.`);
      setTimeout(() => setFeedbackMessage(null), 3000);
      setFileToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete file:', err);
      setErrorMessage(err.message || 'Failed to delete file from Google Drive.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  Google Drive Cloud Vault
                </h3>
                <span className="font-medium text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Workspace API
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Backup delivery receipts, proof-of-custody seals & manifests to your Google Drive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
            aria-label="Close Google Drive modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Notifications / Alerts */}
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

          {/* Authentication State Card */}
          {!user ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto shadow-xs">
                <HardDrive className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                  Connect Your Google Account
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                  Sign in with permission to automatically create a dedicated <strong>"Jijiga Express Delivery Receipts"</strong> folder in your Google Drive and archive order manifests.
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
                  <span>{isLoadingAuth ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account connected card */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.displayName || 'Google Account'} 
                      className="w-10 h-10 rounded-full border border-emerald-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm">
                      {user.email?.charAt(0).toUpperCase() || 'G'}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        {user.displayName || 'Google Workspace User'}
                      </span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-slate-600 font-mono">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchSync}
                    disabled={isBatchUploading || orders.length === 0}
                    className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isBatchUploading ? 'Syncing...' : 'Backup All Receipts'}</span>
                  </button>

                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
                    title="Disconnect Google Account"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Order Quick Upload Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Recent Deliveries Ready for Drive Vault</span>
                  <span className="text-slate-400 text-[11px]">{orders.length} orders tracked</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                  {orders.map((order) => {
                    const isUploading = uploadingOrderId === order.id;
                    return (
                      <div 
                        key={order.id} 
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-2 hover:border-slate-300 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-800">#{order.id}</span>
                            <span className="text-[10px] text-slate-400">• {order.customerCity || 'Jijiga'}</span>
                          </div>
                          <p className="text-xs text-slate-600 truncate font-medium">{order.batchName}</p>
                          <span className="text-[10px] text-emerald-600 font-bold">{order.totalPrice} ETB</span>
                        </div>

                        <button
                          onClick={() => handleUploadSingleOrder(order)}
                          disabled={isUploading || isBatchUploading}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer disabled:opacity-50"
                        >
                          <UploadCloud className="w-3 h-3" />
                          <span>{isUploading ? 'Saving...' : 'Save'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Google Drive Vault Files List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Jijiga Express Receipts in Google Drive ({files.length})
                    </span>
                  </div>

                  <button
                    onClick={() => token && loadFiles(token)}
                    disabled={isLoadingFiles}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                    title="Refresh Drive files"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {isLoadingFiles ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Loading Google Drive files...</span>
                  </div>
                ) : files.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                    <FileText className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    <p className="text-xs text-slate-500 font-medium">No receipts archived in Google Drive yet.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Click "Backup All Receipts" or "Save" on any delivery above.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 truncate block">
                              {file.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {file.createdTime ? new Date(file.createdTime).toLocaleDateString() : 'Archived'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}

                          <button
                            onClick={() => setFileToDelete(file)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete receipt from Google Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-[11px] text-slate-400">
            Encrypted with Google Workspace OAuth Bearer Token.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* MANDATORY USER CONFIRMATION DIALOG FOR DESTRUCTIVE OPERATIONS */}
      {fileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  Delete File from Google Drive?
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-slate-900">"{fileToDelete.name}"</span>{' '}
                  from your Google Drive? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
