import { useState, useEffect } from 'react';
import { 
  X, 
  Smartphone, 
  ShieldCheck, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2,
  Lock
} from 'lucide-react';

interface PhoneOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userProfile: { uid: string; displayName: string; phone: string; role: 'customer' }) => void;
  onSwitchToGoogleAuth?: () => void;
}

export function PhoneOtpModal({
  isOpen,
  onClose,
  onLoginSuccess,
  onSwitchToGoogleAuth,
}: PhoneOtpModalProps) {
  const [countryCode, setCountryCode] = useState<'+251' | '+252'>('+251');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);

    const cleanPhone = phoneNumber.trim().replace(/\D/g, '');
    if (cleanPhone.length < 8 || cleanPhone.length > 10) {
      setErrorNotice('Please enter a valid phone number (e.g. 91 234 5678).');
      return;
    }

    if (attemptsCount >= 4) {
      setErrorNotice('Too many OTP requests. Please wait a few minutes before trying again.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setAttemptsCount(prev => prev + 1);
      setStep('otp');
      setCountdown(60);
    }, 600);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }
    const nextDigits = [...otpDigits];
    nextDigits[index] = value;
    setOtpDigits(nextDigits);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    const enteredOtp = otpDigits.join('');

    if (enteredOtp.length !== 6) {
      setErrorNotice('Please enter all 6 digits of the SMS verification code.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const fullPhone = `${countryCode} ${phoneNumber.trim()}`;
      const uid = 'phone-usr-' + Math.random().toString(36).substring(2, 9);
      
      onLoginSuccess({
        uid,
        displayName: fullName.trim() || `Customer (${countryCode}${phoneNumber.slice(-4)})`,
        phone: fullPhone,
        role: 'customer',
      });
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Phone Login & Registration</h3>
              <p className="text-xs text-slate-500">Fast OTP verification for Ethiopia & Somaliland</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          {errorNotice && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorNotice}</span>
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mahdi Ahmed"
                  className="w-full p-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mobile Phone Number</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value as '+251' | '+252')}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800 outline-none"
                  >
                    <option value="+251">🇪🇹 +251 (Eth)</option>
                    <option value="+252">🇸🇴 +252 (Som)</option>
                  </select>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="91 234 5678"
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500 font-mono font-medium"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">We will send a 6-digit confirmation code via SMS.</p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-xs"
              >
                {isLoading ? 'Sending SMS Code...' : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
              <div className="text-center space-y-1">
                <span className="text-xs text-slate-500">Enter the 6-digit code sent to</span>
                <div className="font-mono font-bold text-sm text-slate-900">
                  {countryCode} {phoneNumber}
                </div>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  Change phone number
                </button>
              </div>

              {/* 6 Digit Input Boxes */}
              <div className="flex justify-center gap-2 py-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-input-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    className="w-10 h-12 text-center text-lg font-black font-mono border-2 border-slate-200 rounded-xl focus:border-emerald-500 outline-none focus:ring-2 focus:ring-emerald-500/15"
                  />
                ))}
              </div>

              {/* Resend Countdown */}
              <div className="flex justify-between items-center text-[11px] text-slate-500">
                {countdown > 0 ? (
                  <span>Resend code in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCountdown(60)}
                    className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Resend OTP
                  </button>
                )}
                <span>Auto-verified sandbox mode</span>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-xs"
              >
                {isLoading ? 'Verifying Code...' : 'Complete Registration'}
              </button>
            </form>
          )}

          {/* Fallback to Google / Email Auth */}
          {onSwitchToGoogleAuth && (
            <div className="pt-3 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={onSwitchToGoogleAuth}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Staff or existing user? Use Google / Email sign-in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
