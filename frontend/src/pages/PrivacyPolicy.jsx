import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, FileText, Globe, Lock, Mail, Shield, Smartphone } from 'lucide-react';

const sections = [
  { icon: <Shield className="text-blue-500" size={20} />, title: 'Introduction', content: 'Welcome to ZeroOne. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application and services.' },
  { icon: <Eye className="text-purple-500" size={20} />, title: 'Information We Collect', content: 'We collect information that you provide directly to us, such as your name, phone number, and profile details when you register. We also collect data about your bookings, preferences, and how you interact with our platform to improve your experience.' },
  { icon: <Smartphone className="text-emerald-500" size={20} />, title: 'How We Use Your Data', content: 'Your data is used to provide and maintain our services, notify you about changes, allow you to participate in interactive features, and provide customer support. We also use it to process transactions and send you relevant offers.' },
  { icon: <Lock className="text-rose-500" size={20} />, title: 'Data Security', content: 'We implement industry-standard security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction. Your data is stored on secure servers with encrypted connections.' },
  { icon: <Globe className="text-amber-500" size={20} />, title: 'Third-Party Services', content: 'We may employ third-party companies and individuals to facilitate our service, including payment processors such as Razorpay and Cashfree. These providers have access to personal data only to perform services on our behalf and must protect that information.' },
  { icon: <Mail className="text-indigo-500" size={20} />, title: 'Contact Us', content: 'If you have questions about this Privacy Policy or our data practices, contact our support team through the app or email zerooneapp.info@gmail.com.' }
];

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F3F2F7] dark:bg-gray-950 font-sans pb-12">
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 bg-[#F3F2F7]/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 pt-[var(--safe-header-top)] pb-3">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-[#00246b] dark:text-white" aria-label="Go back">
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#00246b] dark:text-white leading-none">Privacy &amp; Policy</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last updated: April 2026</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pt-[var(--safe-main-top)]">
        <section className="py-4 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <FileText className="text-blue-500" size={22} />
            <h2 className="text-xl font-semibold text-[#00246b] dark:text-white">Our Commitment to You</h2>
          </div>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-gray-300">At ZeroOne, your privacy is a fundamental part of our mission. We build tools to simplify your life while keeping your personal information secure.</p>
        </section>

        <div className="divide-y divide-slate-200 dark:divide-gray-800">
          {sections.map((section) => (
            <section key={section.title} className="py-6">
              <div className="flex items-center gap-3">
                {section.icon}
                <h3 className="text-lg font-semibold text-[#00246b] dark:text-white">{section.title}</h3>
              </div>
              <p className="mt-3 text-base leading-7 text-slate-600 dark:text-gray-300">{section.content}</p>
            </section>
          ))}
        </div>

        <footer className="pt-6 text-sm text-slate-500 dark:text-gray-400">ZeroOne Secure System</footer>
      </main>
    </div>
  );
};

export default PrivacyPolicy;