import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { ArrowLeft, CreditCard, Wallet, Smartphone, Landmark, Plus, ArrowRight, ShieldCheck, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const PaymentMethods = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [methods, setMethods] = useState({
    cards: [
      { id: 1, type: 'Visa', last4: '4242', expiry: '12/26', holder: (user?.name || 'Customer').toUpperCase() },
    ],
    upis: ['abhishek@upi', '9876543210@paytm'],
    wallets: [{ name: 'Paytm', balance: '₹450' }, { name: 'Google Pay', balance: '-' }]
  });

  const handleAddMethod = () => {
    toast('Available in future updates', {
        icon: '🚀',
        style: {
            borderRadius: '1rem',
            background: '#1C2C4E',
            color: '#fff',
            fontSize: '11px',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
        }
    });
  };

  return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-gray-950 flex flex-col overflow-hidden animate-in fade-in duration-500">
      {/* 🛡️ ELITE HEADER */}
      <header className="p-2.5 py-3 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all"
          >
            <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
          </button>
          <div className="leading-none">
            <h1 className="font-extrabold text-[15px] text-[#1C2C4E] dark:text-white tracking-tight">
              Payment methods
            </h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        {/* 💳 SAVED CARDS CLUSTER */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
             <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Saved cards</label>
             <button onClick={handleAddMethod} className="text-[9px] font-black text-[#1C2C4E] flex items-center gap-1 active:scale-95">
                <Plus size={10} strokeWidth={4} /> ADD NEW
             </button>
          </div>
          <div className="space-y-3">
             {methods.cards.map(card => (
                <div key={card.id} className="relative group p-4 bg-slate-900 rounded-[1.5rem] text-white shadow-xl overflow-hidden active:scale-98 transition-all">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <CreditCard size={60} />
                   </div>
                   <div className="relative z-10 space-y-4">
                      <div className="flex justify-between items-start">
                         <div className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                            <span className="text-[10px] font-black tracking-widest">{card.type}</span>
                         </div>
                         <MoreVertical size={16} className="opacity-40" />
                      </div>
                      <div className="space-y-1">
                         <p className="text-sm font-bold tracking-[0.2em] opacity-80">•••• •••• •••• {card.last4}</p>
                         <div className="flex justify-between items-end">
                            <div className="space-y-0.5">
                               <p className="text-[7px] font-black opacity-30 uppercase tracking-widest">Card Holder</p>
                               <p className="text-[10px] font-bold tracking-tight">{card.holder}</p>
                            </div>
                            <div className="text-right space-y-0.5">
                               <p className="text-[7px] font-black opacity-30 uppercase tracking-widest">Expires</p>
                               <p className="text-[10px] font-bold tracking-tight">{card.expiry}</p>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        </section>

        {/* 📱 UPI & DIGITAL WALLETS */}
        <section className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">UPI & Digital Wallets</label>
           <div className="space-y-2">
              {methods.upis.map(upi => (
                 <button 
                  key={upi} 
                  onClick={handleAddMethod}
                  className="w-full p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 flex items-center justify-between group active:scale-[0.99] transition-all shadow-sm"
                 >
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center border border-orange-100">
                          <Smartphone size={18} className="text-orange-500" />
                       </div>
                       <div className="space-y-0.5 text-left">
                          <h3 className="text-[12px] font-black text-[#1C2C4E] dark:text-white tracking-tight">{upi}</h3>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Selected UPI ID</p>
                       </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-[#1C2C4E]/20 flex items-center justify-center">
                       <div className="w-2 h-2 rounded-full bg-[#1C2C4E] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                 </button>
              ))}
           </div>
        </section>

        {/* 🏛️ NET BANKING */}
        <section className="space-y-3">
           <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Other options</label>
           <button 
             onClick={handleAddMethod}
             className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl border border-[#1C2C4E]/10 dark:border-gray-800 flex items-center justify-between active:scale-[0.99] transition-all shadow-sm group"
           >
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center border border-blue-100">
                    <Landmark size={18} className="text-blue-500" />
                 </div>
                 <div className="space-y-0.5 text-left">
                    <h3 className="text-[12px] font-black text-[#1C2C4E] dark:text-white tracking-tight">Net banking</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Support for all major banks</p>
                 </div>
              </div>
              <ArrowRight size={16} className="text-[#1C2C4E] opacity-20 group-hover:opacity-100 transition-opacity" />
           </button>
        </section>

        {/* 🛡️ SECURITY BADGE */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-3">
           <ShieldCheck size={20} className="text-emerald-500 shrink-0" strokeWidth={3} />
           <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 leading-tight uppercase tracking-widest">
             PCI-DSS Compliant • 256-Bit Encrypted Payments
           </p>
        </div>
      </main>

      {/* 🚀 ACTION FOOTER */}
      <div className="p-5 pb-[62px] bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-t border-slate-100 dark:border-gray-800">
         <motion.button
           whileTap={{ scale: 0.95 }}
           onClick={handleAddMethod}
           className="w-full h-12 bg-[#1C2C4E] text-white rounded-2xl font-black text-[11px] tracking-[0.2em] uppercase shadow-2xl shadow-[#1C2C4E]/20 flex items-center justify-center gap-2 group"
         >
            Add payment method
            <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
         </motion.button>
      </div>
    </div>
  );
};

export default PaymentMethods;
