import { useState, type FormEvent } from 'react';
import { X, KeyRound, ExternalLink, Check, AlertCircle } from 'lucide-react';

interface UpdateApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onSaveKey: (key: string) => void;
}

export function UpdateApiKeyModal({
  isOpen,
  onClose,
  currentKey,
  onSaveKey,
}: UpdateApiKeyModalProps) {
  const [keyInput, setKeyInput] = useState(currentKey);
  const [mapIdInput, setMapIdInput] = useState(() => {
    return localStorage.getItem('user_google_maps_map_id') || '';
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSaveKey(keyInput.trim());
    if (mapIdInput.trim()) {
      localStorage.setItem('user_google_maps_map_id', mapIdInput.trim());
    } else {
      localStorage.removeItem('user_google_maps_map_id');
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Google Maps API Key Setup</h3>
              <p className="text-xs text-slate-500">Configure your Google Cloud Platform credential</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <span>Why am I seeing InvalidKeyMapError?</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Google Maps Platform requires <strong>Billing to be enabled</strong> on the Google Cloud Project associated with your API key, and the <strong>Maps JavaScript API</strong> must be toggled on.
            </p>
            <a
              href="https://console.cloud.google.com/project/_/billing/enable"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-blue-700 hover:underline font-semibold"
            >
              Enable Billing on Google Cloud Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Google Maps API Key
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Paste Maps API Key securely..."
              autoComplete="off"
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-500">
              Keys are stored securely in local browser session storage and never exposed.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Google Maps Map ID (Optional)
            </label>
            <input
              type="text"
              value={mapIdInput}
              onChange={(e) => setMapIdInput(e.target.value)}
              placeholder="e.g. bf51a910020fa25a (Default)"
              autoComplete="off"
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-500">
              Required for custom Cloud-based Map Styling and Advanced Markers. Defaults to Google's verified sample Map ID if blank.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                setKeyInput('');
                setMapIdInput('');
                localStorage.removeItem('user_google_maps_map_id');
                onSaveKey('');
                onClose();
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              Clear Key & ID (Use Vector Map)
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Saved!
                  </>
                ) : (
                  'Save & Apply Key'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
