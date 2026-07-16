import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Clock, CheckCircle2, ShieldCheck, Loader2, ArrowRight, RefreshCw, FileSearch, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';

const PendingVerification = () => {
    const { logout, restoreSession, user } = useAuthStore();
    const navigate = useNavigate();
    const [status, setStatus] = useState('pending');
    const [checking, setChecking] = useState(false);

    const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
    const currentShopId = localStorage.getItem('activeVendorId') || user?.lastActiveVendorId;
    const currentShop = user?.shops?.find(s => s._id === currentShopId) || user?.shops?.[0];

    useEffect(() => {
        if (currentShop && ['active', 'approved', 'inactive'].includes(currentShop.status)) {
            navigate('/vendor/dashboard', { replace: true });
        }
    }, [currentShop, navigate]);

    const handleSwitchShop = async (shopId) => {
        try {
            await api.patch('/auth/switch-shop', { vendorId: shopId });
            localStorage.setItem('activeVendorId', shopId);
            const updatedUser = { ...user, lastActiveVendorId: shopId };
            useAuthStore.getState().updateUser(updatedUser);
            setIsShopDropdownOpen(false);
            toast.success('Shop switched successfully');
            window.location.reload();
        } catch (err) {
            toast.error('Failed to switch shop');
        }
    };

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
        <div className="min-h-screen bg-[#F3F2F7] dark:bg-gray-950 text-[#00246b] dark:text-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden font-sans pt-24">
            
            {/* Header Switcher for Pending Screen */}
            {user?.shops && user.shops.length > 1 && (
                <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-[48px] pb-3 flex items-center justify-center bg-white/80 dark:bg-gray-950/80 backdrop-blur-md border-b border-slate-100 dark:border-gray-800 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-400">Manage:</span>
                        <div className="relative">
                            <button
                                onClick={() => setIsShopDropdownOpen(!isShopDropdownOpen)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00246b]/5 dark:bg-white/5 hover:bg-[#00246b]/10 rounded-full transition-all text-[11px] font-black uppercase tracking-tight text-[#00246b] dark:text-white border border-[#00246b]/10 dark:border-white/10"
                            >
                                <span className="truncate max-w-[120px]">{currentShop?.shopName || 'Select Shop'}</span>
                                <ChevronDown size={12} className={cn("transition-transform duration-200", isShopDropdownOpen && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                                {isShopDropdownOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden"
                                    >
                                        <div className="py-1.5 max-h-60 overflow-y-auto">
                                            <div className="px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                Your Shops
                                            </div>
                                            {user.shops.map((shop) => {
                                                const isSelected = shop._id === currentShop?._id;
                                                return (
                                                    <button
                                                        key={shop._id}
                                                        onClick={() => handleSwitchShop(shop._id)}
                                                        className={cn(
                                                            "w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-between",
                                                            isSelected 
                                                                ? "text-[#00246b] bg-[#00246b]/5 dark:text-white dark:bg-white/5" 
                                                                : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                        )}
                                                    >
                                                        <span className="truncate mr-2">{shop.shopName}</span>
                                                        {isSelected && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </header>
            )}

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
                        className="max-w-md w-full space-y-4 xs:space-y-6 relative z-10"
                    >
                        <div className="relative mx-auto w-24 h-24">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                                className="absolute inset-0 border-4 border-dashed border-primary/20 dark:border-white/20 rounded-full"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-16 h-16 bg-primary/10 dark:bg-white/10 rounded-2xl flex items-center justify-center text-primary dark:text-white">
                                    <FileSearch size={32} strokeWidth={1.5} />
                                </div>
                            </div>
                            <motion.div
                                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute -bottom-1 -right-1 w-8 h-8 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg border-2 border-white dark:border-gray-900"
                            >
                                <Clock size={14} strokeWidth={3} />
                            </motion.div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl xs:text-3xl font-black tracking-tighter leading-tight text-[#00246b] dark:text-white">Verification in Progress</h1>
                            <p className="text-xs xs:text-sm text-[#00246b]/60 dark:text-gray-400 font-bold leading-relaxed px-2">
                                Thank you for choosing <span className="text-primary dark:text-white font-black">ZeroOne</span>. Your documents have been received and are currently under review by our compliance team.
                            </p>
                        </div>

                        <div className="p-4 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-200/50 dark:border-gray-800 shadow-xl shadow-black/[0.02] space-y-3">
                            <div className="flex items-center gap-3 text-left">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Step 1</p>
                                    <p className="text-xs font-black text-[#00246b] dark:text-white">Application Received</p>
                                </div>
                            </div>
                            <div className="h-px bg-gray-100 dark:bg-gray-800 ml-11" />
                            <div className="flex items-center gap-3 text-left">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-white/10 flex items-center justify-center text-primary dark:text-white animate-pulse">
                                    <Loader2 size={16} className="animate-spin" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Step 2</p>
                                    <p className="text-xs font-black text-[#00246b] dark:text-white">Reviewing Documents</p>
                                </div>
                            </div>
                            <div className="h-px bg-gray-100 dark:bg-gray-800 ml-11" />
                            <div className="flex items-center gap-3 text-left">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800/80 flex items-center justify-center text-gray-400">
                                    <Clock size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Step 3</p>
                                    <p className="text-xs font-black text-[#00246b] dark:text-white">Account Activation</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex flex-col items-center gap-3">
                            {/* Live Status Indicator */}
                            <div className="flex items-center gap-2 text-gray-500">
                                <RefreshCw size={11} className={`${checking ? 'animate-spin text-amber-400' : 'text-gray-600'} transition-all`} />
                                <span className="text-[8px] font-black uppercase tracking-widest">
                                    {checking ? 'Checking approval status...' : 'Auto-checking every 8 seconds'}
                                </span>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                <ShieldCheck size={12} className="text-emerald-500" />
                                Secure & Encrypted Verification
                            </div>

                            <button
                                onClick={handleLogout}
                                className="text-[#00246b]/70 hover:text-[#00246b] dark:text-white dark:hover:text-white transition-colors flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] mt-2"
                            >
                                <Clock size={10} /> Sign Out & Check Later
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
