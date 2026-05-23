import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, Phone, MapPin, Headphones, Clock, MessageSquare } from 'lucide-react';

const ContactSupport = () => {
  const navigate = useNavigate();

  const supportChannels = [
    {
      icon: <Mail className="text-blue-500" size={20} />,
      title: "Email Support",
      content: "For general inquiries, account issues, and support requests, reach out to us via email. We aim to respond within 24 hours.",
      detail: "zerooneapp.info@gmail.com",
      action: "mailto:zerooneapp.info@gmail.com"
    },
    {
      icon: <Headphones className="text-purple-500" size={20} />,
      title: "Live Chat",
      content: "Need immediate assistance with an ongoing booking? Use the in-app chat feature to connect with our support agents instantly.",
      detail: "Available in-app",
    },
    {
      icon: <Clock className="text-emerald-500" size={20} />,
      title: "Operating Hours",
      content: "Our core support team is available during standard business hours to resolve your queries efficiently.",
      detail: "Mon-Sat: 9:00 AM - 8:00 PM"
    },
    {
      icon: <MapPin className="text-rose-500" size={20} />,
      title: "Headquarters",
      content: "ZeroOne Operations Center.",
      detail: "India"
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
            <h1 className="text-xl font-black text-[#1C2C4E] dark:text-white leading-none">Contact & Support</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">We're here to help</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-5 space-y-4">
        {/* Intro Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-xl shadow-blue-500/5 border border-white dark:border-gray-800 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <MessageSquare className="text-blue-500 mb-3" size={24} strokeWidth={1.5} />
          <h2 className="text-xl font-black text-[#1C2C4E] dark:text-white tracking-tight">How can we help you?</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2.5 text-sm leading-relaxed font-medium">
            Whether you have a question about our services, need help with a booking, or just want to share your feedback, our support team is ready to assist you.
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
                <h3 className="font-black text-[#1C2C4E] dark:text-white uppercase tracking-tight">{channel.title}</h3>
              </div>
              <p className="text-[12px] font-medium text-gray-600 dark:text-gray-400 leading-relaxed pl-12 mb-2">
                {channel.content}
              </p>
              <div className="pl-12">
                <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-800 text-[#1C2C4E] dark:text-white rounded-lg text-[11px] font-bold">
                  {channel.detail}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-8 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-black text-[#1C2C4E] dark:text-gray-500 uppercase tracking-[0.2em]">ZeroOne Customer Care</span>
          </div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest max-w-[240px] mx-auto leading-loose opacity-60">
            For emergencies during a service, please use the SOS feature in your active booking screen.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ContactSupport;
