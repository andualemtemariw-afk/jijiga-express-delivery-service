import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, 
  MicOff, 
  X, 
  Save, 
  Send, 
  Volume2, 
  AlertCircle, 
  Check, 
  Sparkles, 
  Languages, 
  RotateCcw,
  Clock,
  Radio,
  FileText
} from 'lucide-react';
import { Order, ChatMessage } from '../../types';
import { playVoiceNoteChime } from '../../utils/audioSimulation';

// Cross-browser SpeechRecognition typing
interface IWindowSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export interface CourierVoiceToTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  courierRole: 'RUNNER' | 'RIDER';
  courierName: string;
  onSaveNote: (orderId: string, note: string, newStatus?: Order['status']) => Promise<void> | void;
  onSendMessage?: (orderId: string, message: Omit<ChatMessage, 'id' | 'orderId'>) => void;
}

type SpeechLang = 'en-US' | 'so-SO' | 'am-ET';

const COURIER_QUICK_PRESETS: Record<'RUNNER' | 'RIDER', Array<{ label: string; text: string; lang: SpeechLang }>> = {
  RUNNER: [
    { 
      label: 'Package Verified & Sealed', 
      text: 'Inspected batch harvest and freshness. Package verified, sealed, and tagged in tamper-proof wrap.', 
      lang: 'en-US' 
    },
    { 
      label: 'Aready for Rider Handover', 
      text: 'Packaging complete and tagged. Order is in staging area ready for transit rider pickup.', 
      lang: 'en-US' 
    },
    { 
      label: 'Baadhitaanka waa la dhammaystiray (SO)', 
      text: 'Tayada dalabka waa la baaray, xirmada waa la xiray waxaana loo diyaariyay mootada.', 
      lang: 'so-SO' 
    },
    { 
      label: 'ጥራቱ ተረጋግጦ ታሽጓል (AM)', 
      text: 'የዕቃው ጥራት እና ትኩስነት ተረጋግጦ በጥንቃቄ ታሽጓል። ለሞተር አሽከርካሪ ዝግጁ ነው።', 
      lang: 'am-ET' 
    },
    { 
      label: 'Vendor Stall Staging Note', 
      text: 'At Mamila vendor stall #4. Waiting for final bundle weighting before sealing.', 
      lang: 'en-US' 
    }
  ],
  RIDER: [
    { 
      label: 'Arriving at Destination (~5m)', 
      text: 'En route and approaching delivery address in approximately 5 minutes.', 
      lang: 'en-US' 
    },
    { 
      label: 'At Gate / Compound Entrance', 
      text: 'Arrived at the customer compound gate. Calling recipient for package handover.', 
      lang: 'en-US' 
    },
    { 
      label: 'Customer Request: Leave at Door', 
      text: 'Customer authorized contactless delivery. Left package with reception / security gate.', 
      lang: 'en-US' 
    },
    { 
      label: 'Albaabka hore ayaan taaganahay (SO)', 
      text: 'Waxaan joogaa albaabka gurigaaga hortiisa, fadlan soo bax si aad u qaadato xirmada.', 
      lang: 'so-SO' 
    },
    { 
      label: 'ደጃፍዎ ላይ ደርሻለሁ (AM)', 
      text: 'ደጃፍዎ ላይ ደርሻለሁ። እባክዎ ዕቃዎን ለመቀበል ይውጡ።', 
      lang: 'am-ET' 
    },
    { 
      label: 'Delivered & Cash Collected', 
      text: 'Package handed over to recipient. Total order cash payment collected in full.', 
      lang: 'en-US' 
    }
  ]
};

export function CourierVoiceToTextModal({
  isOpen,
  onClose,
  order,
  courierRole,
  courierName,
  onSaveNote,
  onSendMessage
}: CourierVoiceToTextModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [selectedLang, setSelectedLang] = useState<SpeechLang>('en-US');
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [sendToChat, setSendToChat] = useState(true);
  const [selectedStatusUpdate, setSelectedStatusUpdate] = useState<Order['status'] | ''>('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as IWindowSpeech;
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechClass) {
      setIsSupported(false);
    }
  }, []);

  // Pre-fill transcript if order already has an audio note
  useEffect(() => {
    if (order && isOpen) {
      setTranscript(order.courierDeliveryNote || '');
      setErrorMessage(null);
      setSelectedStatusUpdate('');
      setRecordingSeconds(0);
    }
  }, [order, isOpen]);

  // Clean up recognition when unmounting or closing
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  // Timer counter when recording
  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  const startListening = () => {
    setErrorMessage(null);
    const win = window as IWindowSpeech;
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechClass) {
      setIsSupported(false);
      setErrorMessage('Native Speech Recognition is not supported by your current browser. You can type or use the quick buttons below.');
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (_) {}
      }

      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLang;

      recognition.onstart = () => {
        setIsListening(true);
        playVoiceNoteChime('start');
      };

      recognition.onresult = (event: any) => {
        let finalChunk = '';
        let interimChunk = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalChunk += item[0].transcript;
          } else {
            interimChunk += item[0].transcript;
          }
        }

        const combined = (finalChunk || interimChunk).trim();
        if (combined) {
          setTranscript(prev => {
            // If starting fresh or appending
            if (!prev) return combined;
            // Prevent exact duplication if interim
            if (prev.endsWith(combined)) return prev;
            return `${prev} ${combined}`.trim();
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[SpeechRecognition] error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in browser settings.');
        } else if (event.error === 'no-speech') {
          // Normal silence timeout, keep waiting or stop gracefully
        } else if (event.error === 'network') {
          setErrorMessage('Network error during speech recognition. Ensure you are online.');
        } else {
          setErrorMessage(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
        playVoiceNoteChime('stop');
      };

      recognition.onend = () => {
        setIsListening(false);
        playVoiceNoteChime('stop');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setErrorMessage(err.message || 'Could not start microphone.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  };

  const handleToggleRecord = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleApplyPreset = (text: string, lang: SpeechLang) => {
    setSelectedLang(lang);
    setTranscript(prev => (prev ? `${prev} · ${text}` : text));
  };

  const handleSave = async () => {
    if (!order || !transcript.trim()) return;
    setIsSaving(true);
    stopListening();

    try {
      const trimmedNote = transcript.trim();
      const statusToApply = selectedStatusUpdate || undefined;

      // 1. Save note to order
      await onSaveNote(order.id, trimmedNote, statusToApply);

      // 2. Optionally forward as an order chat message
      if (sendToChat && onSendMessage) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        onSendMessage(order.id, {
          senderRole: courierRole,
          senderName: courierName || `${courierRole === 'RUNNER' ? 'Staff Runner' : 'Staff Rider'}`,
          text: `🎙️ [Courier Audio Note]: ${trimmedNote}`,
          timestamp: timeStr,
          isVoiceNote: true
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to persist delivery note.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !order) return null;

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-6"
        >
          {/* Header */}
          <div className="p-5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                  <span>Voice-to-Text Delivery Note</span>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {courierRole} Portal
                  </span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Order #{order.id} · {order.customerName} ({order.customerCity || 'Jijiga'})
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                stopListening();
                onClose();
              }}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Native Speech Recognition Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Language:</span>
                <select
                  value={selectedLang}
                  disabled={isListening}
                  onChange={(e) => setSelectedLang(e.target.value as SpeechLang)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="en-US">English (US / Logistics)</option>
                  <option value="so-SO">Somali (Soomaali)</option>
                  <option value="am-ET">Amharic (አማርኛ)</option>
                </select>
              </div>

              {isListening && (
                <div className="flex items-center gap-2 text-rose-600 font-mono font-bold animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                  <span>REC {formatTimer(recordingSeconds)}</span>
                </div>
              )}
            </div>

            {/* Error or browser notice */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {!isSupported && !errorMessage && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Web Speech API is best supported in Chrome, Edge, and Android. You can also type or use quick courier buttons.</span>
              </div>
            )}

            {/* Centered Microphone Action Pod */}
            <div className="flex flex-col items-center justify-center p-6 bg-linear-to-b from-slate-50 to-indigo-50/30 rounded-2xl border border-slate-200 text-center relative overflow-hidden">
              {/* Waveform indicator when listening */}
              {isListening && (
                <div className="absolute inset-x-0 bottom-1 flex items-end justify-center gap-1.5 h-8 opacity-40">
                  <span className="w-1 bg-rose-500 rounded-full animate-bounce h-4" />
                  <span className="w-1 bg-amber-500 rounded-full animate-bounce h-7 delay-75" />
                  <span className="w-1 bg-rose-500 rounded-full animate-bounce h-5 delay-150" />
                  <span className="w-1 bg-blue-500 rounded-full animate-bounce h-8 delay-100" />
                  <span className="w-1 bg-emerald-500 rounded-full animate-bounce h-4 delay-200" />
                  <span className="w-1 bg-purple-500 rounded-full animate-bounce h-6 delay-75" />
                </div>
              )}

              <button
                type="button"
                onClick={handleToggleRecord}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 duration-150 ${
                  isListening 
                    ? 'bg-rose-600 text-white ring-8 ring-rose-200/80 animate-pulse' 
                    : 'bg-linear-to-br from-indigo-600 to-blue-700 text-white hover:from-indigo-700 hover:to-blue-800 ring-4 ring-blue-100'
                }`}
                title={isListening ? 'Stop dictating' : 'Tap to speak'}
              >
                {isListening ? (
                  <MicOff className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </button>

              <div className="mt-3">
                <span className={`text-sm font-bold block ${isListening ? 'text-rose-600' : 'text-slate-800'}`}>
                  {isListening ? 'Listening to speech... Speak clearly' : 'Tap microphone to dictate audio note'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {isListening ? 'Tap mic again to pause or finish transcription' : 'Native browser speech recognition handles instant speech-to-text'}
                </span>
              </div>
            </div>

            {/* Live Dictated Note Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Transcribed Delivery Note</span>
                </label>
                {transcript && (
                  <button
                    type="button"
                    onClick={() => setTranscript('')}
                    className="text-slate-400 hover:text-rose-600 flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
              
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Transcribed voice note will appear here in real time... You can also type or edit text freely."
                rows={4}
                className="w-full text-xs p-3.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 bg-white leading-relaxed font-sans"
              />
            </div>

            {/* 1-Tap Logistics Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Quick Courier Vernacular Templates:</span>
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {COURIER_QUICK_PRESETS[courierRole].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(preset.text, preset.lang)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-medium transition cursor-pointer active:scale-95 text-left"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Status Transition Attachment */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Also Update Order Status?</span>
                <span className="text-[11px] text-slate-400">Optional</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {courierRole === 'RUNNER' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedStatusUpdate(prev => prev === 'RUNNER_ASSIGNED' ? '' : 'RUNNER_ASSIGNED')}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer active:scale-95 ${
                        selectedStatusUpdate === 'RUNNER_ASSIGNED' 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Inspecting Mamila
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatusUpdate(prev => prev === 'READY_FOR_RIDER' ? '' : 'READY_FOR_RIDER')}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer active:scale-95 ${
                        selectedStatusUpdate === 'READY_FOR_RIDER' 
                          ? 'bg-emerald-600 text-white border-emerald-600' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Ready for Rider
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedStatusUpdate(prev => prev === 'PICKED_UP' ? '' : 'PICKED_UP')}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer active:scale-95 ${
                        selectedStatusUpdate === 'PICKED_UP' 
                          ? 'bg-amber-600 text-white border-amber-600' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Picked Up
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatusUpdate(prev => prev === 'DELIVERED' ? '' : 'DELIVERED')}
                      className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition cursor-pointer active:scale-95 ${
                        selectedStatusUpdate === 'DELIVERED' 
                          ? 'bg-emerald-600 text-white border-emerald-600' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Delivered
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Send to chat checkbox */}
            {onSendMessage && (
              <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendToChat}
                  onChange={(e) => setSendToChat(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Also post this voice dispatch note to the order customer & relay chat</span>
              </label>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!transcript.trim() || isSaving}
                onClick={handleSave}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Audio Note to Order'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default CourierVoiceToTextModal;
