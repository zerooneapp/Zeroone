import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Lock, Eye, FileText, Smartphone, Globe, Mail } from 'lucide-react';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: <Shield className="text-blue-500" size={20} />,
      title: "Introduction",
      content: "Welcome to ZeroOne. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and services."
    },
    {
      icon: <Eye className="text-purple-500" size={20} />,
      title: "Information We Collect",
      content: "We collect information that you provide directly to us, such as your name, phone number, and profile details when you register. We also collect data about your bookings, preferences, and how you interact with our platform to improve your experience."
    },
    {
      icon: <Smartphone className="text-emerald-500" size={20} />,
      title: "How We Use Your Data",
      content: "Your data is used to provide and maintain our services, notify you about changes, allow you to participate in interactive features, and provide customer support. We also use it to process transactions and send you relevant offers."
    },
    {
      icon: <Lock className="text-rose-500" size={20} />,
      title: "Data Security",
      content: "We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. Your data is stored on secure servers with encrypted connections."
    },
    {
      icon: <Globe className="text-amber-500" size={20} />,
      title: "Third-Party Services",
      content: "We may employ third-party companies and individuals to facilitate our service (e.g., payment processors like Razorpay). These third parties have access to your personal data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose."
    },
    {
      icon: <Mail className="text-indigo-500" size={20} />,
      title: "Contact Us",
      content: "If you have any questions about this Privacy Policy or our data practices, please contact our support team through the app or email us at support@zerooneapp.in."
    }
  ];

  return (
    <div className="min-h-screen bg-[#F3F2F7] dark:bg-gray-950 font-sans pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#F3F2F7]/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex items-center justify-center shadow-sm active:scale-90 transition-all"
          >
            <ArrowLeft size={20} className="text-[#1C2C4E] dark:text-white" />
          </button>
          <div>
            <h1 className="text-xl font-black text-[#1C2C4E] dark:text-white leading-none">Privacy & Policy</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Last Updated: April 2026</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-8 space-y-6">
        {/* Intro Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-xl shadow-blue-500/5 border border-white dark:border-gray-800 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
          <FileText className="text-blue-500 mb-4" size={32} strokeWidth={1.5} />
          <h2 className="text-2xl font-black text-[#1C2C4E] dark:text-white tracking-tight">Our Commitment to You</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-4 leading-relaxed font-medium">
            At ZeroOne, your privacy is not just a policy—it's a fundamental part of our mission. We build tools to simplify your life while keeping your personal space secure.
          </p>
        </motion.div>

        {/* Policy Sections */}
        <div className="grid gap-4">
          {sections.map((section, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-sm rounded-3xl p-6 border border-white dark:border-gray-800 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-center">
                  {section.icon}
                </div>
                <h3 className="font-black text-[#1C2C4E] dark:text-white uppercase tracking-tight">{section.title}</h3>
              </div>
              <p className="text-[13px] font-medium text-gray-600 dark:text-gray-400 leading-relaxed pl-13">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-8 space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] font-black text-[#1C2C4E] dark:text-gray-500 uppercase tracking-[0.2em]">ZeroOne Secure System</span>
          </div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest max-w-[240px] mx-auto leading-loose opacity-60">
            By using our platform, you agree to the terms outlined in this document.
          </p>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
