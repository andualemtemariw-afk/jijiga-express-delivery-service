import { useState, useEffect, useRef } from 'react';
import { 
  Order, 
  ChatMessage, 
  MessageSenderRole 
} from '../../types';
import { 
  VERNACULAR_LANGUAGES, 
  VERNACULAR_PHRASES, 
  SupportedLanguage 
} from '../../data/vernacularPhrases';
import { 
  playVoiceNoteChime, 
  playVoiceCarrierSnippet 
} from '../../utils/audioSimulation';
import { 
  PhoneCall, 
  MessageSquare, 
  Mic, 
  Send, 
  Play, 
  Pause, 
  Volume2, 
  Check, 
  CheckCheck, 
  ShieldCheck, 
  Copy, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Radio, 
  Hash, 
  Smartphone, 
  FileText,
  AlertCircle,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  createWhatsAppUrl, 
  generateRiderDispatchMessage, 
  generateCustomerUpdateMessage,
  formatPhoneForWhatsApp 
} from '../../utils/whatsappDispatch';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  currentUserRole: MessageSenderRole; // Who is viewing/sending
  targetRole: 'RIDER' | 'RUNNER' | 'CUSTOMER';
  targetName: string;
  targetPhone: string;
  messages: ChatMessage[];
  onSendMessage: (orderId: string, message: Omit<ChatMessage, 'id' | 'orderId'>) => void;
}

type ModalTab = 'chat' | 'whatsapp' | 'call' | 'sms' | 'ussd';

export function CommunicationBridgeModal({
  isOpen,
  onClose,
  order,
  currentUserRole,
  targetRole,
  targetName,
  targetPhone,
  messages,
  onSendMessage
}: Props) {
  const [activeTab, setActiveTab] = useState<ModalTab>('chat');
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('so');
  const [inputText, setInputText] = useState('');
  
  // Voice note playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 100
  const stopAudioRef = useRef<(() => void) | null>(null);
  const playbackIntervalRef = useRef<number | null>(null);

  // Voice note recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<number | null>(null);

  // Copy feedback toast
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Auto-scroll chat to bottom
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat' && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, activeTab, isOpen]);

  // Clean up audio on unmount or close
  useEffect(() => {
    if (!isOpen) {
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      setPlayingMessageId(null);
      setIsRecording(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter phrases suitable for current sender role
  const relevantPhrases = VERNACULAR_PHRASES.filter(p => {
    if (currentUserRole === 'CUSTOMER') return p.targetRole === 'CUSTOMER';
    if (currentUserRole === 'RIDER') return p.targetRole === 'RIDER';
    if (currentUserRole === 'RUNNER') return p.targetRole === 'RUNNER';
    return true;
  });

  const handleSendTextMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let senderName = 'Customer';
    if (currentUserRole === 'CUSTOMER') senderName = order.customerName || 'Customer';
    if (currentUserRole === 'RIDER') senderName = order.riderName || 'Staff Rider';
    if (currentUserRole === 'RUNNER') senderName = order.runnerName || 'Staff Runner';

    onSendMessage(order.id, {
      senderRole: currentUserRole,
      senderName,
      text,
      timestamp: timeStr,
      language: selectedLanguage,
      status: 'DELIVERED'
    });

    playVoiceNoteChime('stop');
    if (!textToSend) setInputText('');
  };

  const handleStartRecording = () => {
    playVoiceNoteChime('start');
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = window.setInterval(() => {
      setRecordingSeconds(sec => sec + 1);
    }, 1000);
  };

  const handleCancelRecording = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingSeconds(0);
    playVoiceNoteChime('radio_burst');
  };

  const handleFinishAndSendVoiceNote = () => {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    const duration = Math.max(1, recordingSeconds || 4);
    setIsRecording(false);
    setRecordingSeconds(0);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let senderName = 'Customer';
    if (currentUserRole === 'CUSTOMER') senderName = order.customerName || 'Customer';
    if (currentUserRole === 'RIDER') senderName = order.riderName || 'Staff Rider';
    if (currentUserRole === 'RUNNER') senderName = order.runnerName || 'Staff Runner';

    let noteText = `Voice note (0:0${duration}s)`;
    let transcript = 'Recorded direct voice dispatch memo.';
    if (selectedLanguage === 'so') {
      transcript = 'Cod toos ah oo la duubay (Direct Somali Voice Memo).';
    } else if (selectedLanguage === 'am') {
      transcript = 'የተቀዳ የድምፅ መልእክት (Amharic Direct Voice Memo)።';
    }

    onSendMessage(order.id, {
      senderRole: currentUserRole,
      senderName,
      text: noteText,
      transcript,
      timestamp: timeStr,
      isVoiceNote: true,
      voiceDurationSeconds: duration,
      language: selectedLanguage,
      status: 'DELIVERED'
    });

    playVoiceNoteChime('radio_burst');
  };

  const handleTogglePlayVoiceNote = (msg: ChatMessage) => {
    if (playingMessageId === msg.id) {
      if (stopAudioRef.current) stopAudioRef.current();
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
      setPlayingMessageId(null);
      setPlaybackProgress(0);
      return;
    }

    if (stopAudioRef.current) stopAudioRef.current();
    if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);

    const duration = msg.voiceDurationSeconds || 5;
    setPlayingMessageId(msg.id);
    setPlaybackProgress(0);

    const startTime = Date.now();
    playbackIntervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setPlaybackProgress(progress);
      if (elapsed >= duration) {
        if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
        setPlayingMessageId(null);
        setPlaybackProgress(0);
      }
    }, 100);

    stopAudioRef.current = playVoiceCarrierSnippet(duration, () => {
      setPlayingMessageId(null);
      setPlaybackProgress(0);
      if (playbackIntervalRef.current) clearInterval(playbackIntervalRef.current);
    });
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Prefilled SMS template
  const smsBody = `[Jijiga Express #${order.id.slice(-6).toUpperCase()}] Hi ${targetName}, regarding order ${order.batchName}. Dropoff: ${order.customerAddress || order.customerCity}. Landmark: ${order.customerPlusCode}. Please reply or call.`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* MODAL HEADER WITH PARTICIPANT DETAILS */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-600/30 border border-blue-400/40 text-blue-300 flex items-center justify-center font-bold text-base flex-shrink-0 relative">
              {targetName.charAt(0)}
              <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 absolute -bottom-0.5 -right-0.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base leading-tight">{targetName}</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  {targetRole}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <span className="font-mono text-emerald-400 font-medium">{targetPhone}</span>
                <span>·</span>
                <span className="text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                  Order #{order.id} ({order.batchName})
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close communication modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CHANNEL NAVIGATION TABS */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-1 overflow-x-auto">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'chat' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              <span>Vernacular Chat & Voice</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>

            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'whatsapp' 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Dispatch</span>
            </button>

            <button
              onClick={() => setActiveTab('call')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'call' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted Call Relay</span>
            </button>

            <button
              onClick={() => setActiveTab('sms')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'sms' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-600" />
              <span>SMS Offline Bridge</span>
            </button>

            <button
              onClick={() => setActiveTab('ussd')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'ussd' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Hash className="w-3.5 h-3.5 text-purple-600" />
              <span>USSD Dialers</span>
            </button>
          </div>
        </div>

        {/* TAB 1: VERNACULAR CHAT & VOICE NOTES */}
        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 min-h-0 bg-slate-50">
            {/* VERNACULAR LANGUAGE SELECTOR & EXPLANATION */}
            <div className="px-4 py-2 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-slate-700">Quick Vernacular Presets:</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                {VERNACULAR_LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang.code as SupportedLanguage)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      selectedLanguage === lang.code
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* QUICK-TAP PHRASE PILLS */}
            <div className="px-4 py-2.5 bg-blue-50/70 border-b border-blue-100 flex items-center gap-2 overflow-x-auto scrollbar-thin">
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
                <Radio className="w-3 h-3 text-blue-600 animate-pulse" />
                Tap to Send:
              </span>
              <div className="flex items-center gap-2">
                {relevantPhrases.map(phrase => {
                  const phraseText = phrase[selectedLanguage];
                  return (
                    <button
                      key={phrase.id}
                      onClick={() => handleSendTextMessage(phraseText)}
                      className="px-3 py-1.5 bg-white hover:bg-blue-600 hover:text-white text-slate-800 border border-blue-200 hover:border-blue-600 rounded-full text-xs font-medium whitespace-nowrap transition-all shadow-2xs cursor-pointer flex items-center gap-1 text-left"
                      title={phrase.en}
                    >
                      <span>"{phraseText}"</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CHAT MESSAGES SCROLL AREA */}
            <div 
              ref={chatScrollRef}
              className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[360px]"
            >
              {messages.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-semibold text-slate-700">Direct courier communication line active</p>
                  <p className="text-slate-500 mt-1">Tap a vernacular phrase above or record a voice note below.</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderRole === currentUserRole;
                  const isRider = msg.senderRole === 'RIDER';
                  const isRunner = msg.senderRole === 'RUNNER';

                  let senderColorClass = 'text-blue-700';
                  if (isRider) senderColorClass = 'text-emerald-700';
                  if (isRunner) senderColorClass = 'text-amber-700';

                  return (
                    <div 
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      {/* Sender label */}
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${senderColorClass}`}>
                          {msg.senderName} ({msg.senderRole})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                      </div>

                      {/* Message Bubble */}
                      <div 
                        className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-2xs text-xs ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {/* If Voice Note */}
                        {msg.isVoiceNote ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleTogglePlayVoiceNote(msg)}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
                                  isMe
                                    ? 'bg-white text-blue-600 hover:bg-blue-50'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                }`}
                                title="Play voice note"
                              >
                                {playingMessageId === msg.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4 ml-0.5" />
                                )}
                              </button>

                              <div className="flex-1 min-w-[140px]">
                                <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                                  <span className="flex items-center gap-1 font-mono">
                                    <Volume2 className="w-3.5 h-3.5" />
                                    Voice Note
                                  </span>
                                  <span className="font-mono">
                                    {playingMessageId === msg.id 
                                      ? `Playing...`
                                      : `0:0${msg.voiceDurationSeconds || 5}s`}
                                  </span>
                                </div>

                                {/* Animated waveform bar */}
                                <div className="w-full bg-slate-200/50 rounded-full h-2 relative overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${isMe ? 'bg-white' : 'bg-emerald-600'}`}
                                    style={{ width: `${playingMessageId === msg.id ? playbackProgress : 100}%` }}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Voice transcript snippet */}
                            {msg.transcript && (
                              <div className={`p-2 rounded-lg text-[11px] italic ${
                                isMe ? 'bg-blue-700/60 text-blue-100' : 'bg-slate-100 text-slate-600'
                              }`}>
                                <span className="font-bold not-italic">Transcript: </span>
                                "{msg.transcript}"
                              </div>
                            )}
                          </div>
                        ) : (
                          // Standard Text Bubble
                          <div>
                            <p className="text-xs leading-relaxed font-medium">{msg.text}</p>
                            {msg.transcript && (
                              <p className={`text-[10px] mt-1 pt-1 border-t italic ${
                                isMe ? 'border-blue-500/40 text-blue-200' : 'border-slate-100 text-slate-500'
                              }`}>
                                Translation: "{msg.transcript}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Language Tag & Delivery checkmark */}
                        <div className={`flex items-center justify-between gap-3 text-[10px] mt-1.5 pt-1 border-t ${
                          isMe ? 'border-blue-500/30 text-blue-200' : 'border-slate-100 text-slate-400'
                        }`}>
                          <span className="uppercase font-semibold">
                            {msg.language === 'so' ? '🇸🇴 Af-Soomaali' : msg.language === 'am' ? '🇪🇹 አማርኛ' : '🇬🇧 English'}
                          </span>
                          <span className="flex items-center gap-0.5">
                            {msg.status === 'READ' ? (
                              <CheckCheck className="w-3 h-3 text-emerald-300" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            {msg.status || 'Delivered'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* RECORDING OR TYPING INPUT BAR */}
            <div className="p-3 bg-white border-t border-slate-200">
              {isRecording ? (
                // ACTIVE VOICE NOTE RECORDING DRAWER
                <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
                    <div>
                      <span className="text-xs font-bold text-rose-900 block">Recording Voice Note...</span>
                      <span className="text-[11px] font-mono text-rose-700">
                        00:0{recordingSeconds}s · Walkie-Talkie Mode
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCancelRecording}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleFinishAndSendVoiceNote}
                      className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Send Audio Note
                    </button>
                  </div>
                </div>
              ) : (
                // STANDARD INPUT CONTROLS
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartRecording}
                    className="p-2.5 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded-xl transition-colors cursor-pointer flex-shrink-0"
                    title="Record voice note"
                  >
                    <Mic className="w-5 h-5 text-blue-600" />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendTextMessage();
                      }}
                      placeholder={`Type in ${selectedLanguage === 'so' ? 'Af-Soomaali' : selectedLanguage === 'am' ? 'Amharic' : 'English'} or send audio...`}
                      className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    />
                  </div>

                  <button
                    onClick={() => handleSendTextMessage()}
                    disabled={!inputText.trim()}
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed flex-shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: WHATSAPP DIRECT DISPATCH */}
        {activeTab === 'whatsapp' && (
          <div className="p-6 space-y-5 bg-slate-50 flex-1 overflow-y-auto">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
              <MessageCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-emerald-950">WhatsApp Courier & Dispatch Bridge</h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Send live order details, delivery Plus Codes, and payment notes directly to {targetName}'s WhatsApp (+{formatPhoneForWhatsApp(targetPhone)}).
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Recipient Phone (WhatsApp):</span>
                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  +{formatPhoneForWhatsApp(targetPhone)}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Pre-formatted Dispatch Message:</label>
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto border-l-4 border-l-emerald-500">
                  {targetRole === 'RIDER' 
                    ? generateRiderDispatchMessage(order) 
                    : generateCustomerUpdateMessage(order, 'arriving')}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const text = targetRole === 'RIDER' ? generateRiderDispatchMessage(order) : generateCustomerUpdateMessage(order, 'arriving');
                    navigator.clipboard.writeText(text);
                    setCopiedKey('wa_modal_msg');
                    setTimeout(() => setCopiedKey(null), 2000);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 flex-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedKey === 'wa_modal_msg' ? 'Copied to Clipboard!' : 'Copy Dispatch Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = targetRole === 'RIDER' ? generateRiderDispatchMessage(order) : generateCustomerUpdateMessage(order, 'arriving');
                    const url = createWhatsAppUrl(targetPhone, text);
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 flex-1"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Launch WhatsApp (+{formatPhoneForWhatsApp(targetPhone)})</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ENCRYPTED CALL RELAY */}
        {activeTab === 'call' && (
          <div className="p-6 space-y-6 bg-slate-50 flex-1">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3.5">
              <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-emerald-950">Encrypted Regional Relay Active</h4>
                <p className="text-xs text-emerald-800 mt-1">
                  Calls between customers and dispatch personnel in Jijiga & Hargeisa are routed via our private relay line to safeguard customer personal mobile numbers.
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <PhoneCall className="w-8 h-8" />
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Target Recipient</span>
                <h3 className="font-extrabold text-xl text-slate-900 mt-1">{targetName}</h3>
                <p className="text-sm font-mono text-emerald-600 font-bold mt-0.5">{targetPhone}</p>
                <p className="text-xs text-slate-500 mt-1">Role: {targetRole} · Order #{order.id}</p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <a
                  href={`tel:${targetPhone.replace(/\s+/g, '')}`}
                  className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  Dial via Phone App ({targetPhone})
                </a>

                <button
                  onClick={() => handleCopy(targetPhone, 'phone')}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'phone' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Copied Number</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Number</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-100 rounded-xl text-xs text-slate-600 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <span>Regional Carrier Support:</span>
              </div>
              <p>Supported across <strong>Ethio Telecom (09 / +251)</strong>, <strong>Safaricom Ethiopia (07 / +251)</strong>, and <strong>Telesom / Somtel (+252)</strong>.</p>
            </div>
          </div>
        )}

        {/* TAB 3: SMS OFFLINE BRIDGE */}
        {activeTab === 'sms' && (
          <div className="p-6 space-y-5 bg-slate-50 flex-1">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-amber-950">Offline SMS Dispatch Fallback</h4>
                <p className="text-xs text-amber-800 mt-1">
                  In case of mobile internet slowdowns or cellular data outages in remote Kebele sectors, you can trigger an offline SMS alert directly to the courier or runner.
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Auto-Generated SMS Payload</span>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed break-all">
                {smsBody}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <a
                  href={`sms:${targetPhone.replace(/\s+/g, '')}?body=${encodeURIComponent(smsBody)}`}
                  className="w-full sm:flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  Open SMS App
                </a>

                <button
                  onClick={() => handleCopy(smsBody, 'sms')}
                  className="w-full sm:w-auto px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'sms' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Copied SMS Template</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Template</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: USSD TELECOM DIALERS */}
        {activeTab === 'ussd' && (
          <div className="p-6 space-y-4 bg-slate-50 flex-1">
            <div>
              <h4 className="font-bold text-base text-slate-900">Regional USSD Telecom Shortcodes</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Quickly dial mobile money transfers or check airtime balances without leaving the app.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'Telebirr (Ethio Telecom)', code: '*127#', desc: 'Direct mobile money transfer & balance check', bg: 'bg-blue-50 border-blue-200 text-blue-900' },
                { name: 'Telesom Zaad Service', code: '*880#', desc: 'Somaliland cross-border mobile wallet payment', bg: 'bg-emerald-50 border-emerald-200 text-emerald-900' },
                { name: 'Ethio Telecom Airtime', code: '*804#', desc: 'Check mobile credit & reload talk-time', bg: 'bg-slate-50 border-slate-200 text-slate-900' },
                { name: 'CBE Birr', code: '*847#', desc: 'Commercial Bank of Ethiopia mobile banking', bg: 'bg-purple-50 border-purple-200 text-purple-900' },
              ].map(ussd => (
                <div key={ussd.code} className={`p-4 rounded-xl border ${ussd.bg} flex flex-col justify-between space-y-3`}>
                  <div>
                    <span className="font-bold text-xs block">{ussd.name}</span>
                    <p className="text-[11px] text-slate-600 mt-0.5">{ussd.desc}</p>
                    <span className="font-mono font-extrabold text-lg block mt-2 text-slate-900">{ussd.code}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={`tel:${encodeURIComponent(ussd.code)}`}
                      className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                      Dial Shortcode
                    </a>
                    <button
                      onClick={() => handleCopy(ussd.code, ussd.code)}
                      className="p-2 bg-white rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Copy code"
                    >
                      {copiedKey === ussd.code ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
