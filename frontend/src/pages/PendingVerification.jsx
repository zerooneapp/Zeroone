import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Clock, CheckCircle2, ShieldCheck, Loader2, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const PendingVerification = () => {
    const { logout, restoreSession } = useAuthStore();
    const navigate = useNavigate();
    const [checking, setChecking] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/vendor-login');
    };

    // 🔄 AUTO-POLL: Check vendor status every 8 seconds
    useEffect(() => {
        const checkStatus = async () => {
            try {
                setChecking(true);
                const res = await api.get('/auth/me');
                const vendorStatus = res.data?.status;

                if (vendorStatus === 'active' || vendorStatus === 'approved') {
                    // Re-hydrate store with latest data
                    await restoreSession();
                    navigate('/vendor/dashboard', { replace: true });
                }
            } catch (err) {
                // Silent fail — user still sees the page
            } finally {
                setChecking(false);
            }
        };

        // Check immediately on mount
        checkStatus();

        // Then poll every 8 seconds
        const interval = setInterval(checkStatus, 8000);
        return () => clearInterval(interval);
    }, [navigate, restoreSession]);

    return (
        <div className="min-h-screen bg-[#0A0F1D] text-white flex flex-col items-center justify-center p-6 font-sans">
            {/* Status Icon */}
            <div className="relative mb-12">
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center animate-pulse">
                    <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center border border-gray-800">
                        <Clock className="text-gray-500" size={32} />
                    </div>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-amber-500 p-2 rounded-full shadow-lg shadow-amber-500/20">
                    <Clock className="text-white" size={16} />
                </div>
            </div>

            {/* Hero Text */}
            <div className="text-center space-y-3 mb-12 max-w-sm">
                <h1 className="text-3xl font-black tracking-tight leading-tight">
                    Verification in Progress
                </h1>
                <p className="text-gray-400 text-sm font-medium leading-relaxed">
                    Thank you for choosing <span className="text-white font-bold">ZeroOne</span>. Your documents have been received and are currently under review by our compliance team.
                </p>
            </div>

            {/* Progress Steps */}
            <div className="w-full max-w-sm bg-[#111827] rounded-[2rem] border border-gray-800/50 p-6 space-y-0 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"></div>

                {/* Step 1 */}
                <div className="flex items-center gap-4 py-4 border-b border-gray-800/50">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <CheckCircle2 size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Step 1</p>
                        <h3 className="text-sm font-bold text-white">Application Received</h3>
                    </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-4 py-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Step 2</p>
                        <h3 className="text-sm font-bold text-white">Reviewing Documents</h3>
                    </div>
                </div>
            </div>

            {/* Live Status Indicator */}
            <div className="mt-6 flex items-center gap-2 text-gray-500">
                <RefreshCw size={11} className={`${checking ? 'animate-spin text-amber-400' : 'text-gray-600'} transition-all`} />
                <span className="text-[9px] font-black uppercase tracking-widest">
                    {checking ? 'Checking approval status...' : 'Auto-checking every 8 seconds'}
                </span>
            </div>

            {/* Footer Branding */}
            <div className="mt-6 flex items-center gap-2 text-gray-500 grayscale opacity-50">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure & Encrypted Verification</span>
            </div>

            {/* Minimalist Logout Link */}
            <button
                onClick={handleLogout}
                className="mt-8 text-gray-600 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
            >
                <LogOut size={12} /> Sign Out & Check Later
            </button>
        </div>
    );
};

export default PendingVerification;


