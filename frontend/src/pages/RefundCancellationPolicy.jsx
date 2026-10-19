import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle, Clock3, CreditCard, HelpCircle, RefreshCw } from 'lucide-react';

const sections = [
  { icon: <Clock3 className="text-blue-500" size={20} />, title: 'Customer cancellations', content: 'If cancellation is available for your booking, please cancel at least 2 hours before the scheduled service time from the booking details screen. Late cancellations and no-shows may be ineligible for a refund and may affect future booking access.' },
  { icon: <CheckCircle className="text-emerald-500" size={20} />, title: 'When a refund may apply', content: 'A refund may be considered when an eligible booking is cancelled within the applicable time window, a payment is captured but the booking cannot be confirmed, or a service is cancelled by the vendor or ZeroOne before it is provided. Eligibility can depend on the vendor policy and booking status.' },
  { icon: <AlertCircle className="text-rose-500" size={20} />, title: 'Cases that may not be refundable', content: 'Completed services, late cancellations, customer no-shows, misuse of offers, and bookings subject to a vendor’s non-refundable policy may not qualify for a refund. Any applicable terms shown before confirmation will also apply.' },
  { icon: <CreditCard className="text-purple-500" size={20} />, title: 'Refund method and timing', content: 'Approved online refunds are issued to the original payment method wherever possible. After ZeroOne initiates a refund, the final credit time depends on the payment gateway, bank, card issuer, or other financial institution. Cash payments, if accepted by a vendor, are handled according to the vendor’s stated policy.' },
  { icon: <RefreshCw className="text-amber-500" size={20} />, title: 'Failed or duplicate payments', content: 'If your account is debited but the booking is not confirmed, please contact support with the booking or payment reference. Duplicate or reversed payment cases are checked with the payment gateway and are resolved after the transaction status is verified.' },
  { icon: <HelpCircle className="text-indigo-500" size={20} />, title: 'How to request help', content: 'For a cancellation or refund query, contact us at zerooneapp.info@gmail.com or use the Contact & Support page. Include your registered contact details, booking ID, payment reference, and a short description of the issue. We may request additional information to verify the transaction.' }
];

const RefundCancellationPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F3F2F7] dark:bg-gray-950 font-sans pb-12">
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 bg-[#F3F2F7]/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 pt-[var(--safe-header-top)] pb-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-[#00246b] dark:text-white" aria-label="Go back">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#00246b] dark:text-white leading-none">Refunds &amp; Cancellations</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ZeroOne Booking Policies</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pt-[var(--safe-main-top)]">
        <section className="py-4 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <RefreshCw className="text-blue-500" size={22} />
            <h2 className="text-xl font-semibold text-[#00246b] dark:text-white">Cancellation and refund support</h2>
          </div>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-gray-300">This policy applies to bookings made through ZeroOne. The final eligibility of a refund may depend on the booking status, cancellation time, payment status, and the selected vendor’s policy.</p>
        </section>

        <div className="divide-y divide-slate-200 dark:divide-gray-800">
          {sections.map((section, index) => (
            <section key={section.title} className="py-6">
              <div className="flex items-center gap-3">
                {section.icon}
                <h3 className="text-lg font-semibold text-[#00246b] dark:text-white">{index + 1}. {section.title}</h3>
              </div>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-gray-300">{section.content}</p>
            </section>
          ))}
        </div>

        <footer className="pt-6 text-sm text-slate-500 dark:text-gray-400">For support: zerooneapp.info@gmail.com</footer>
      </main>
    </div>
  );
};

export default RefundCancellationPolicy;