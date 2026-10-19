import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Headphones, Mail, MapPin, MessageSquare } from 'lucide-react';

const supportChannels = [
  { icon: <Mail className="text-blue-500" size={20} />, title: 'Email Support', content: 'For general inquiries, account issues, and support requests, email our support team. We aim to respond within 24 hours.', detail: 'zerooneapp.info@gmail.com', action: 'mailto:zerooneapp.info@gmail.com' },
  { icon: <Headphones className="text-purple-500" size={20} />, title: 'Live Chat', content: 'For immediate assistance with an ongoing booking, use the in-app chat feature to connect with our support agents.', detail: 'Available in-app' },
  { icon: <Clock className="text-emerald-500" size={20} />, title: 'Operating Hours', content: 'Our core support team is available during standard business hours to resolve your queries efficiently.', detail: 'Monday to Saturday: 9:00 AM - 8:00 PM' },
  { icon: <MapPin className="text-rose-500" size={20} />, title: 'Headquarters', content: 'ZeroOne Operations Center.', detail: 'India' }
];

const ContactSupport = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F3F2F7] dark:bg-gray-950 font-sans pb-12">
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 bg-[#F3F2F7]/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 pt-[var(--safe-header-top)] pb-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-[#00246b] dark:text-white" aria-label="Go back">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#00246b] dark:text-white leading-none">Contact &amp; Support</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">We are here to help</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pt-[var(--safe-main-top)]">
        <section className="py-4 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <MessageSquare className="text-blue-500" size={22} />
            <h2 className="text-xl font-semibold text-[#00246b] dark:text-white">How can we help you?</h2>
          </div>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-gray-300">Whether you have a question about our services, need help with a booking, or want to share feedback, our support team is ready to assist you.</p>
        </section>

        <div className="divide-y divide-slate-200 dark:divide-gray-800">
          {supportChannels.map((channel) => (
            <section key={channel.title} className="py-6">
              <div className="flex items-center gap-3">
                {channel.icon}
                <h3 className="text-lg font-semibold text-[#00246b] dark:text-white">{channel.title}</h3>
              </div>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-gray-300">{channel.content}</p>
              {channel.action ? (
                <a href={channel.action} className="inline-block mt-2 text-base font-medium text-blue-600 hover:underline dark:text-blue-400">{channel.detail}</a>
              ) : (
                <p className="mt-2 text-base font-medium text-slate-700 dark:text-gray-200">{channel.detail}</p>
              )}
            </section>
          ))}
        </div>

        <footer className="pt-6 text-sm text-slate-500 dark:text-gray-400">For emergencies during a service, please use the SOS feature in your active booking screen.</footer>
      </main>
    </div>
  );
};

export default ContactSupport;