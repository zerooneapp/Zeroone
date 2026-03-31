import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, ArrowRight, ChevronLeft, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/Button';
import NumericKeypad from '../components/NumericKeypad';
import toast from 'react-hot-toast';

const VendorAuth = () => {
  const navigate = useNavigate();
  const { requestOTP, verifyOTP, loading } = useAuthStore();
  
  const [step, setStep] = useState('phone'); // phone, otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '']); 
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer(prev => prev - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleKeyPress = (num) => {
    if (step === 'phone') {
      if (phone.length < 10) setPhone(prev => prev + num);
    } else {
      const index = otp.findIndex(d => d === '');
      if (index !== -1) {
        const newOtp = [...otp];
        newOtp[index] = num;
        setOtp(newOtp);
      }
    }
  };

  const handleDelete = () => {
    if (step === 'phone') {
      setPhone(prev => prev.slice(0, -1));
    } else {
      const lastFilledIndex = [...otp].reverse().findIndex(d => d !== '');
      if (lastFilledIndex !== -1) {
        const index = 4 - lastFilledIndex;
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    if (phone.length < 10) return toast.error('Please enter a valid phone number');
    
    const res = await requestOTP(phone);
    if (res.success) {
      toast.success(`Verification code sent! Your OTP is: ${res.otp}`, { duration: 8000 });
      setStep('otp');
      setTimer(30);
      setCanResend(false);
    } else {
      toast.error(res.message);
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < 5) return toast.error('Please enter the full code');

    const res = await verifyOTP(phone, otpValue);
    if (res.success) {
      const { role, needsRegistration } = res.data;
      if (needsRegistration) {
        navigate('/vendor-signup', { state: { phone, role: 'vendor' } });
      } else {
        toast.success(`Welcome back!`);
        
        // 🚀 ROLE-AWARE REDIRECTION
        const intendedPath = location.state?.from?.pathname;
        if (intendedPath) {
          navigate(intendedPath, { replace: true });
        } else {
          if (role === 'vendor' || role === 'admin') navigate('/vendor');
          else if (role === 'staff') navigate('/staff');
          else navigate('/');
        }
      }
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="h-screen bg-background-light dark:bg-background-dark flex flex-col relative overflow-hidden text-gray-900 dark:text-white transition-colors duration-500">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-[-5%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center p-6 pt-16 overflow-y-auto no-scrollbar relative z-10">
        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone-step"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-10"
              >
                <div className="space-y-2 text-center pt-8">
                  <div className="w-16 h-16 bg-primary/5 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-primary/10 dark:border-white/5 shadow-inner">
                     <Briefcase size={32} className="text-primary" />
                  </div>
                  <h1 className="text-[32px] font-black text-gray-900 dark:text-white tracking-tight leading-tight">Partner Login</h1>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Dashboard access for vendors & staff</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-900 px-6 py-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 h-16 shadow-xl shadow-black/5 ring-1 ring-black/5">
                    <div className="flex items-center gap-2 border-r border-gray-100 dark:border-gray-800 pr-4">
                       <span className="font-black text-gray-400 text-lg">+91</span>
                    </div>
                    <div className="flex-1 font-black text-xl text-gray-900 dark:text-white">
                       {phone || <span className="text-gray-300 dark:text-gray-700 font-bold text-lg">Phone Number</span>}
                       <motion.span 
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-[2px] h-6 bg-primary ml-1 align-middle"
                       />
                    </div>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full h-14 rounded-2xl bg-primary text-white text-lg font-black shadow-2xl shadow-primary/20"
                    onClick={handleSendOTP}
                    loading={loading}
                    disabled={phone.length < 10}
                  >
                    Send OTP
                  </Button>
                </div>
                
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="space-y-10"
              >
                <button 
                  onClick={() => setStep('phone')}
                  className="p-3 -ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors bg-white dark:bg-gray-900 rounded-2xl shadow-sm"
                >
                  <ChevronLeft size={20} strokeWidth={3} />
                </button>

                <div className="space-y-2 text-center">
                  <h1 className="text-[28px] font-black text-gray-900 dark:text-white">Enter Code</h1>
                  <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                    Verification code sent to <span className="text-primary">+91 {phone}</span>
                  </p>
                </div>

                <div className="flex justify-between gap-3 px-2">
                  {otp.map((digit, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-14 h-16 bg-white dark:bg-gray-900 rounded-2xl border-2 flex items-center justify-center font-black text-2xl shadow-sm transition-all",
                        digit ? "border-primary text-primary" : "border-gray-50 dark:border-gray-800 text-gray-300 dark:text-gray-700"
                      )}
                    >
                      {digit}
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <Button 
                    size="lg" 
                    className="w-full h-14 rounded-2xl bg-primary text-white text-lg font-black shadow-2xl shadow-primary/20"
                    onClick={handleVerifyOTP}
                    loading={loading}
                    disabled={otp.includes('')}
                  >
                    Verify & Proceed
                  </Button>

                <div className="text-center space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Didn't receive the code?</p>
                    <div>
                      <button 
                        disabled={!canResend}
                        onClick={handleSendOTP}
                        className={`text-[10px] font-black uppercase tracking-[0.2em] border-b border-current pb-0.5 transition-all ${
                          canResend ? 'text-primary' : 'text-gray-300 dark:text-gray-700'
                        }`}
                      >
                        Resend OTP
                      </button>
                    </div>
                    {!canResend && (
                      <p className="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">
                        Resend in 00:{timer < 10 ? `0${timer}` : timer}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Theme Aware Numeric Keypad at Bottom */}
      <motion.div 
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        className="w-full"
      >
        <div className="text-center py-4 bg-white/80 dark:bg-[#1A1C1E] backdrop-blur-3xl">
           <p className="text-[8px] uppercase tracking-[0.6em] text-gray-300 dark:text-gray-800 font-black">Partner Services Portal</p>
        </div>
        <NumericKeypad 
          onKeyPress={handleKeyPress}
          onDelete={handleDelete}
        />
      </motion.div>
    </div>
  );
};

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default VendorAuth;
