import { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  FileText, 
  Clock, 
  PhoneCall, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Order, SupportTicket, SupportServiceCategory } from '../../types';
import { createWhatsAppUrl } from '../../utils/whatsappDispatch';

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  customerProfile: {
    name: string;
    phone: string;
    city: string;
  };
  onSubmitTicket?: (ticket: SupportTicket) => void;
}

const SERVICE_CATEGORIES: { id: SupportServiceCategory; label: string }[] = [
  { id: 'FOOD', label: 'Food & Restaurant' },
  { id: 'PARCEL', label: 'Express Parcel' },
  { id: 'RIDE', label: 'Taxi & Moto Ride' },
  { id: 'HOTEL', label: 'Hotel Booking' },
  { id: 'EEU_RECHARGE', label: 'EEU Electricity Top-up' },
  { id: 'PAYMENT', label: 'Payment / COD' },
  { id: 'OTHER', label: 'Other Inquiries' },
];

const ISSUE_CATEGORIES: Record<SupportServiceCategory, string[]> = {
  FOOD: ['Order delayed beyond ETA', 'Items missing or incorrect', 'Food temperature/packaging defect', 'Driver unreachable'],
  PARCEL: ['Tamper seal broken or damaged', 'Delivery address redirection', 'Package delayed', 'Proof of delivery query'],
  RIDE: ['Driver did not arrive', 'Fare discrepancy', 'Lost item in vehicle', 'Route navigation issue'],
  HOTEL: ['Reservation check-in query', 'Room type change', 'Cancellation request', 'Hotel contact assistance'],
  EEU_RECHARGE: ['Physical card not returned', 'Terminal paper receipt not received', 'Recharge amount discrepancy', 'Wrong meter number entered'],
  PAYMENT: ['Cash on delivery change dispute', 'Double deduction query', 'Receipt request'],
  OTHER: ['Account & profile updates', 'Feedback & suggestions', 'Commercial business inquiry'],
};

export function HelpCenterModal({
  isOpen,
  onClose,
  orders,
  customerProfile,
  onSubmitTicket,
}: HelpCenterModalProps) {
  const [selectedService, setSelectedService] = useState<SupportServiceCategory>('FOOD');
  const [selectedIssue, setSelectedIssue] = useState<string>(ISSUE_CATEGORIES.FOOD[0]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  if (!isOpen) return null;

  const handleServiceChange = (cat: SupportServiceCategory) => {
    setSelectedService(cat);
    setSelectedIssue(ISSUE_CATEGORIES[cat][0] || 'General assistance');
  };

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newTicket: SupportTicket = {
      id: 'tkt-' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36),
      customerId: (customerProfile as any)?.uid || 'cust-local',
      customerName: customerProfile.name || 'Customer',
      customerPhone: customerProfile.phone || '',
      serviceCategory: selectedService,
      issueCategory: selectedIssue,
      orderId: selectedOrderId || undefined,
      description: description.trim(),
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    setTickets(prev => [newTicket, ...prev]);
    if (onSubmitTicket) {
      onSubmitTicket(newTicket);
    }

    setSubmissionSuccess(true);
    setDescription('');
  };

  const handleWhatsAppEscalation = () => {
    const text = `Hello Jijiga Express Support,\nI need help regarding *${selectedService}* (${selectedIssue}).\nCustomer: ${customerProfile.name} (${customerProfile.phone})\nCity: ${customerProfile.city}`;
    const url = createWhatsAppUrl('+251912345678', text);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Customer Help Center</h3>
              <p className="text-xs text-emerald-200/80">Support tickets, order issue resolution & 24/7 escalation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-emerald-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {/* Quick WhatsApp Escalation Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">Need Immediate Assistance?</h4>
                <p className="text-[11px] text-emerald-800">Chat directly with a Jijiga Express operational supervisor.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleWhatsAppEscalation}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0"
            >
              <span>WhatsApp Support</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          {/* New Ticket Form */}
          <form onSubmit={handleTicketSubmit} className="space-y-3.5 text-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Submit a Support Ticket</h4>

            {/* Service Selection */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Select Service</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {SERVICE_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleServiceChange(cat.id)}
                    className={`p-2 rounded-xl border text-left font-bold transition text-xs ${
                      selectedService === cat.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Issue Category */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Issue Category</label>
              <select
                value={selectedIssue}
                onChange={(e) => setSelectedIssue(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500 font-medium"
              >
                {(ISSUE_CATEGORIES[selectedService] || []).map((issue, idx) => (
                  <option key={idx} value={issue}>{issue}</option>
                ))}
              </select>
            </div>

            {/* Link to Recent Order */}
            {orders.length > 0 && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Related Order (Optional)</label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500 font-medium font-mono"
                >
                  <option value="">No specific order</option>
                  {orders.slice(0, 5).map(ord => (
                    <option key={ord.id} value={ord.id}>
                      {ord.id.slice(0, 14)}... • {ord.batchName} ({ord.totalPrice} ETB)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">Describe the Issue</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain what happened so our dispatch team can resolve it..."
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Ticket for Investigation</span>
            </button>
          </form>

          {/* Active Tickets List */}
          {tickets.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Submitted Tickets</h4>
              <div className="space-y-2">
                {tickets.map(tkt => (
                  <div key={tkt.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>{tkt.issueCategory}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 border border-amber-300">
                        {tkt.status}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px]">{tkt.description}</p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Ticket ID: {tkt.id} • {new Date(tkt.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
