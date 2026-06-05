import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Clock, CheckCircle2, ShieldCheck, Loader2, ArrowRight, RefreshCw, FileSearch } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import confetti from 'canvas-confetti';

const PendingVerification = () => {
    const { logout, restoreSession } = useAuthStore();
    const navigate = useNavigate();
    const [status, setStatus] = useState('pending');
    const [checking, setChecking] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/vendor-login');
    };

    // 🔄 AUTO-POLL: Check vendor status every 8 seconds
    useEffect(() => {
        let active = true;
        let intervalId = null;

        const checkStatus = async () => {
            try {
                setChecking(true);
                const res = await api.get('/auth/me');
                if (!active) return;

                const vendorStatus = res.data?.status;

                if (['active', 'approved', 'inactive'].includes(vendorStatus)) {
                    active = false;
                    if (intervalId) clearInterval(intervalId);

                    setStatus(vendorStatus);

                    // 🔄 CRITICAL: Re-hydrate auth store so ProtectedRoute knows status is active!
                    await restoreSession();

                    // Success!
                    confetti({
                        particleCount: 150,
                        spread: 70,
                        origin: { y: 0.6 },
                        colors: ['#00246b', '#10B981', '#F59E0B']
                    });

                    setTimeout(() => {
                        navigate('/vendor/dashboard', { replace: true });
                    }, 3000);
                }
            } catch (err) {
                console.error('[PendingVerification] Auto-check failed:', err);
                if (err.response?.status === 401) {
                    active = false;
                    if (intervalId) clearInterval(intervalId);
                    navigate('/vendor-login');
                }
            } finally {
                if (active) setChecking(false);
            }
        };

        // Check immediately on mount
        checkStatus();

        // Then poll every 8 seconds
        intervalId = setInterval(checkStatus, 8000);

        return () => {
            active = false;
            if (intervalId) clearInterval(intervalId);
        };
    }, [navigate, restoreSession]);

    return (
        <div className="min-h-screen bg-[#F3F2F7] dark:bg-gray-950 text-[#00246b] dark:text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-sans">
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
                                className="absolute inset-0 border-4 border-dashed border-primary/20 dark:border-white/20 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-20 h-20 bg-primary/10 dark:bg-white/10 rounded-3xl flex items-center justify-center text-primary dark:text-white">
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
                            <h1 className="text-3xl font-black tracking-tighter leading-tight text-[#00246b] dark:text-white">Verification in Progress</h1>
                            <p className="text-[#00246b]/60 dark:text-gray-400 font-bold leading-relaxed">
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
                                    <p className="text-sm font-black text-[#00246b] dark:text-white">Application Received</p>
                                </div>
                            </div>
                            <div className="w-full h-px bg-gray-100 dark:bg-gray-800 ml-14" />
                            <div className="flex items-center gap-4 text-left">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-white/10 flex items-center justify-center text-primary dark:text-white animate-pulse">
                                    <Loader2 size={20} className="animate-spin" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step 2</p>
                                    <p className="text-sm font-black text-[#00246b] dark:text-white">Reviewing Documents</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex flex-col items-center gap-4">
                            {/* Live Status Indicator */}
                            <div className="flex items-center gap-2 text-gray-500">
                                <RefreshCw size={11} className={`${checking ? 'animate-spin text-amber-400' : 'text-gray-600'} transition-all`} />
                                <span className="text-[9px] font-black uppercase tracking-widest">
                                    {checking ? 'Checking approval status...' : 'Auto-checking every 8 seconds'}
                                </span>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                Secure & Encrypted Verification
                            </div>

                            <button
                                onClick={handleLogout}
                                className="text-[#00246b]/70 hover:text-[#00246b] dark:text-white dark:hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] mt-4"
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
                            onClick={() => navigate('/vendor/dashboard', { replace: true })}
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

export default PendingVerification;
