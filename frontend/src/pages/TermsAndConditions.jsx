import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, CheckCircle, CreditCard, FileText, Mail, Shield } from 'lucide-react';

const sections = [
  { icon: <CalendarCheck className="text-blue-500" size={20} />, title: 'Bookings and services', content: 'ZeroOne helps customers discover and book services offered by independent vendors and professionals. Service availability, duration, location, and price are shown before you confirm a booking and may depend on the selected vendor.' },
  { icon: <CheckCircle className="text-emerald-500" size={20} />, title: 'Customer responsibilities', content: 'Please provide accurate account and booking information, arrive on time, and follow the reasonable instructions of the selected service provider. Accounts or bookings may be restricted where there is misuse, fraud, repeated no-shows, or abusive behaviour.' },
  { icon: <CreditCard className="text-purple-500" size={20} />, title: 'Payments and pricing', content: 'Prices displayed on the platform are in Indian Rupees (INR) unless stated otherwise. Online payments are processed through the payment gateway shown at checkout. A booking is subject to confirmation by the platform and the selected service provider.' },
  { icon: <Shield className="text-rose-500" size={20} />, title: 'Cancellations and refunds', content: 'Cancellations and refunds are governed by the applicable vendor and ZeroOne policy. Where cancellation is available, customers should cancel at least 2 hours before the scheduled time. Late cancellations, no-shows, or completed services may not qualify for a refund. Please read our Refunds & Cancellations policy for more information.' },
  { icon: <FileText className="text-amber-500" size={20} />, title: 'Platform use', content: 'You may use ZeroOne only for lawful purposes. You must not attempt to access another person’s account, interfere with the platform, submit misleading information, or use the service to cause harm or process unauthorised transactions.' },
  { icon: <Mail className="text-indigo-500" size={20} />, title: 'Changes and support', content: 'We may update these terms when the platform, services, or applicable requirements change. The latest version will be published on this page. For questions or disputes, contact us at zerooneapp.info@gmail.com or through the Contact & Support page.' }
];

const TermsAndConditions = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F3F2F7] dark:bg-gray-950 font-sans pb-12">
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 bg-[#F3F2F7]/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 pt-[var(--safe-header-top)] pb-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-[#00246b] dark:text-white" aria-label="Go back">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#00246b] dark:text-white leading-none">Terms &amp; Conditions</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">ZeroOne Booking Policies</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pt-[var(--safe-main-top)]">
        <section className="py-4 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-500" size={22} />
            <h2 className="text-xl font-semibold text-[#00246b] dark:text-white">Using ZeroOne</h2>
          </div>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-gray-300">By using ZeroOne or confirming a booking, you agree to these Terms &amp; Conditions. ZeroOne provides the booking platform; the selected vendor or professional provides the booked service.</p>
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

export default TermsAndConditions;