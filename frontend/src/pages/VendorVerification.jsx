import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Clock, CheckCircle2, ArrowRight, Loader2, FileSearch } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import confetti from 'canvas-confetti';

const VendorVerification = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/vendor-login');
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('/vendor/profile');
        const currentStatus = res.data.status;
        setStatus(currentStatus);
        setLoading(false);

        if (currentStatus === 'approved' || currentStatus === 'active') {
          // Success!
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#1C2C4E', '#10B981', '#F59E0B']
          });
          
          setTimeout(() => {
            navigate('/vendor/dashboard');
          }, 3000);
        }
      } catch (err) {
        console.error('Status check failed', err);
        // If not authenticated, login
        if (err.response?.status === 401) navigate('/vendor-login');
      }
    };

    const interval = setInterval(checkStatus, 5000); // Poll every 5 seconds
    checkStatus(); // Initial check

    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#F3F2F7] dark:bg-gray-950 text-[#1C2C4E] dark:text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <AnimatePresence mode="wait">
        {status === 'pending' ? (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-md w-full space-y-8 relative z-10"
          >
            <div className="relative mx-auto w-32 h-32">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 border-4 border-dashed border-primary/20 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary">
                  <FileSearch size={40} strokeWidth={1.5} />
                </div>
              </div>
              <motion.div
                 animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                 transition={{ repeat: Infinity, duration: 2 }}
                 className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white dark:border-gray-900"
              >
                <Clock size={18} strokeWidth={3} />
              </motion.div>
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-black tracking-tighter leading-tight text-[#1C2C4E] dark:text-white">Verification in Progress</h1>
              <p className="text-[#1C2C4E]/60 dark:text-gray-400 font-bold leading-relaxed">
                Thank you for choosing <span className="text-primary font-black">ZeroOne</span>. Your documents have been received and are currently under review by our compliance team.
              </p>
            </div>

            <div className="p-6 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-200/50 dark:border-gray-800 shadow-xl shadow-black/[0.02] space-y-4">
              <div className="flex items-center gap-4 text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step 1</p>
                  <p className="text-sm font-black text-[#1C2C4E] dark:text-white">Application Received</p>
                </div>
              </div>
              <div className="w-full h-px bg-gray-100 dark:bg-gray-800 ml-14" />
              <div className="flex items-center gap-4 text-left">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                  <Loader2 size={20} className="animate-spin" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step 2</p>
                  <p className="text-sm font-black text-[#1C2C4E] dark:text-white">Reviewing Documents</p>
                </div>
              </div>
            </div>

             <div className="pt-4 flex flex-col items-center gap-6">
                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                   <ShieldCheck size={14} className="text-emerald-500" />
                   Secure & Encrypted Verification
                </div>

                <button
                    onClick={handleLogout}
                    className="text-[#1C2C4E]/70 hover:text-[#1C2C4E] dark:text-gray-500 dark:hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mt-2"
                >
                    <Clock size={12} /> Sign Out & Check Later
                </button>
             </div>
          </motion.div>
        ) : (
          <motion.div
            key="approved"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full space-y-8 relative z-10"
          >
            <div className="w-32 h-32 bg-emerald-500 rounded-[3rem] mx-auto flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40">
              <CheckCircle2 size={64} strokeWidth={2.5} />
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-black tracking-tighter leading-tight">Welcome Aboard!</h1>
              <p className="text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-sm">Your account is verified</p>
              <p className="text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                Your partnership is now official. Redirecting you to your business dashboard...
              </p>
            </div>

            <button
               onClick={() => navigate('/vendor/dashboard')}
               className="w-full h-16 bg-primary text-white rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all"
            >
               Go to Dashboard
               <ArrowRight size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorVerification;
