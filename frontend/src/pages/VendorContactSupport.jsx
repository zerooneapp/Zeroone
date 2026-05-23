import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Phone, MapPin, Headphones, Clock, HelpCircle, Briefcase } from 'lucide-react';

const VendorContactSupport = () => {
  const navigate = useNavigate();

  const supportChannels = [
    {
      icon: <Mail className="text-indigo-500" size={20} />,
      title: "Partner Support Email",
      content: "For business inquiries, payout issues, profile updates, and general partner support, reach out to our dedicated partner desk.",
      detail: "zerooneapp.info@gmail.com",
      action: "mailto:zerooneapp.info@gmail.com"
    },
    {
      icon: <Briefcase className="text-emerald-500" size={20} />,
      title: "Business Helpdesk",
      content: "Need help managing your staff or configuring your services? Our operations team can guide you through the dashboard.",
      detail: "Available via Dashboard"
    },
    {
      icon: <Clock className="text-amber-500" size={20} />,
      title: "Support Hours",
      content: "Our partner success team is available during business hours to ensure your business runs smoothly on our platform.",
      detail: "Mon-Sat: 9:00 AM - 8:00 PM"
    },
    {
      icon: <HelpCircle className="text-rose-500" size={20} />,
      title: "Dispute Resolution",
      content: "For any customer disputes or service-related issues, please file a detailed report through your booking details page.",
      detail: "Priority Resolution"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F3F2F7] dark:bg-gray-950 font-sans pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F3F2F7]/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm active:scale-90 transition-all"
          >
            <ArrowLeft size={20} className="text-[#1C2C4E] dark:text-white" />
          </button>
          <div>
            <h1 className="text-xl font-black text-[#1C2C4E] dark:text-white leading-none">Partner Support</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Dedicated Help For Partners</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-5 space-y-4">
        {/* Intro Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1C2C4E] rounded-[2rem] p-6 shadow-2xl shadow-indigo-500/20 relative overflow-hidden text-white"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <Headphones className="text-indigo-400 mb-3" size={24} strokeWidth={1.5} />
          <h2 className="text-xl font-black tracking-tight">We value our partners</h2>
          <p className="text-indigo-100/70 mt-2.5 text-sm leading-relaxed font-medium">
            Your success is our success. If you are facing any technical difficulties, payment delays, or need help expanding your business on ZeroOne, our partner support team is here for you.
          </p>
        </motion.div>

        {/* Support Channels */}
        <div className="grid md:grid-cols-2 gap-3">
          {supportChannels.map((channel, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm rounded-2xl p-4.5 border border-white dark:border-gray-800 shadow-sm relative overflow-hidden group"
            >
              {channel.action ? (
                <a href={channel.action} className="absolute inset-0 z-10" />
              ) : null}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {channel.icon}
                </div>
                <h3 className="font-black text-[#1C2C4E] dark:text-white uppercase tracking-tight text-sm">{channel.title}</h3>
              </div>
              <p className="text-[12px] font-medium text-gray-600 dark:text-gray-400 leading-relaxed pl-12 mb-2">
                {channel.content}
              </p>
              <div className="pl-12">
                <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[11px] font-bold">
                  {channel.detail}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-8 space-y-4">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest max-w-[280px] mx-auto leading-loose opacity-60">
            For urgent issues regarding an active booking, please contact the customer directly or use the emergency support button in your dashboard.
          </p>
        </div>
      </main>
    </div>
  );
};

export default VendorContactSupport;
