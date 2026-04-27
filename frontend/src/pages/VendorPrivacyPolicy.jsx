import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Briefcase, CreditCard, Users, ShieldAlert, BookOpen, HardHat, FileCheck } from 'lucide-react';

const VendorPrivacyPolicy = () => {
  const navigate = useNavigate();

  const sections = [
    {
      icon: <Briefcase className="text-indigo-500" size={20} />,
      title: "Partner Onboarding",
      content: "When you register as a Partner on ZeroOne, we collect business-related information including your shop name, address, category, and owner details. This data is used to verify your business and create your public storefront on our marketplace."
    },
    {
      icon: <CreditCard className="text-emerald-500" size={20} />,
      title: "Financials & Payments",
      content: "We use secure payment gateways to handle your wallet transactions and earnings. Bank details provided for payouts are encrypted and never stored directly on our core servers. We maintain strict records of your earnings and deductions for transparency."
    },
    {
      icon: <Users className="text-blue-500" size={20} />,
      title: "Staff Management",
      content: "Partners are responsible for the data of the staff members they add to the platform. ZeroOne provides tools to manage staff schedules and assignments, but the accuracy and legality of staff information remain the Partner's responsibility."
    },
    {
      icon: <ShieldAlert className="text-rose-500" size={20} />,
      title: "Customer Data Privacy",
      content: "As a Partner, you will receive access to customer names and phone numbers for booking fulfillment. You are strictly prohibited from using this data for marketing, harassment, or sharing it with third parties. Violation of customer privacy will lead to immediate account termination."
    },
    {
      icon: <BookOpen className="text-amber-500" size={20} />,
      title: "Content & Listings",
      content: "Any images or service descriptions you upload must be accurate and must not infringe on third-party copyrights. ZeroOne reserves the right to remove any content that violates our community standards or misleads customers."
    }
  ];

  const staffTerms = [
    {
      title: "Data Access",
      desc: "Staff accounts can view assigned bookings and customer names. This access is granted solely for service delivery."
    },
    {
      title: "Performance Tracking",
      desc: "The platform tracks booking completions, cancellations, and customer reviews to maintain service quality standards."
    },
    {
      title: "Account Security",
      desc: "Staff are responsible for maintaining the confidentiality of their login credentials. Do not share your OTP with anyone."
    },
    {
      title: "Conduct Policy",
      desc: "Professionalism is mandatory. Any reports of misconduct during a service will be investigated and may result in platform-wide blacklisting."
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
            <h1 className="text-xl font-black text-[#1C2C4E] dark:text-white leading-none">Partner Privacy</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">For Partners & Staff Members</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-8 space-y-6">
        {/* Intro Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1C2C4E] rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/20 relative overflow-hidden text-white"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <FileCheck className="text-indigo-400 mb-4" size={32} strokeWidth={1.5} />
          <h2 className="text-2xl font-black tracking-tight">Business Integrity</h2>
          <p className="text-indigo-100/70 mt-4 leading-relaxed font-medium">
            This policy outlines how ZeroOne manages business data for our partners and professional guidelines for the staff members operating on the platform.
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
                <h3 className="font-black text-[#1C2C4E] dark:text-white uppercase tracking-tight text-sm">{section.title}</h3>
              </div>
              <p className="text-[12px] font-medium text-gray-600 dark:text-gray-400 leading-relaxed pl-13">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Staff Specific Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 space-y-6"
        >
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-[2px] bg-indigo-500" />
            <h2 className="text-[14px] font-black text-[#1C2C4E] dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <HardHat size={16} /> Staff & Professionals
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {staffTerms.map((term, idx) => (
              <div key={idx} className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2">{term.title}</h4>
                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 leading-relaxed">{term.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Footer */}
        <div className="text-center pt-8 space-y-4">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest max-w-[280px] mx-auto leading-loose opacity-60">
            Partners are expected to adhere to these guidelines to maintain an active listing on the ZeroOne Marketplace.
          </p>
        </div>
      </main>
    </div>
  );
};

export default VendorPrivacyPolicy;
