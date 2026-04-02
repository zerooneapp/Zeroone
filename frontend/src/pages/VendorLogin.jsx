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

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
  };

  const handleOTPChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 5);
    const newOtp = ['', '', '', '', ''];
    val.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
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
    <div className="h-screen bg-[#F3F2F7] flex flex-col relative overflow-hidden text-[#1C2C4E] transition-colors duration-500 font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/linen.png')]" />

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center p-6 pt-16 relative z-10">
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
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-200/50 shadow-sm">
                     <Briefcase size={32} className="text-[#1C2C4E]" />
                  </div>
                  <h1 className="text-[32px] font-bold text-[#1C2C4E] tracking-tight leading-tight">Partner Login</h1>
                  <p className="text-[#1C2C4E]/60 font-medium text-sm">Dashboard access for vendors & staff</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-white px-5 py-2 rounded-xl border border-gray-200/50 flex items-center gap-4 h-12 shadow-sm">
                    <div className="flex items-center gap-3 pr-2">
                       <span className="font-medium text-[#1C2C4E] text-base">+91</span>
                       <div className="w-[1px] h-6 bg-gray-200/80 ml-2" />
                    </div>
                    <input 
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="Phone Number"
                      autoFocus
                      className="flex-1 bg-transparent border-none outline-none font-medium text-base text-[#1C2C4E] placeholder:text-gray-300"
                    />
                  </div>

                  <Button 
                    size="lg" 
                    className={cn(
                      "w-full h-[38px] rounded-xl text-white text-[12px] font-black transition-all duration-300 bg-[#1C2C4E] shadow-sm active:scale-[0.98]",
                      phone.length !== 10 && "opacity-90 grayscale-[0.2]"
                    )}
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
                  className="p-3 -ml-2 text-[#1C2C4E]/50 hover:text-[#1C2C4E] transition-colors bg-white rounded-2xl shadow-sm"
                >
                  <ChevronLeft size={20} strokeWidth={3} />
                </button>

                <div className="space-y-2 text-center">
                  <h1 className="text-[28px] font-bold text-[#1C2C4E]">Enter Code</h1>
                  <p className="text-[#1C2C4E]/60 font-medium text-[11px] uppercase tracking-widest">
                    Verification code sent to <span className="text-[#1C2C4E] font-bold">+91 {phone}</span>
                  </p>
                </div>

                <div className="relative">
                  <input 
                    type="tel"
                    maxLength={5}
                    value={otp.join('')}
                    onChange={handleOTPChange}
                    autoFocus
                    className="absolute inset-0 opacity-0 cursor-default"
                  />
                  <div className="flex justify-between gap-3 px-2 pointer-events-none">
                    {otp.map((digit, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-10 h-11 bg-white rounded-xl border flex items-center justify-center font-bold text-xl shadow-sm transition-all",
                          digit ? "border-[#1C2C4E] text-[#1C2C4E]" : "border-gray-50 text-gray-300"
                        )}
                      >
                        {digit}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <Button 
                    size="lg" 
                    className="w-full h-[38px] rounded-xl bg-[#1C2C4E] text-white text-[12px] font-black shadow-sm active:scale-[0.95]"
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
                          canResend ? 'text-[#1C2C4E]' : 'text-gray-300'
                        }`}
                      >
                        Resend OTP
                      </button>
                    </div>
                    {!canResend && (
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
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
    </div>
  );
};

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default VendorAuth;
