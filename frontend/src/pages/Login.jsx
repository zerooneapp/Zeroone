import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight, ChevronLeft, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/Button';
import NumericKeypad from '../components/NumericKeypad';
import toast from 'react-hot-toast';

const CustomerAuth = () => {
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
      if (res.needsRegistration) {
        navigate('/signup', { state: { phone, role: 'customer' } });
      } else {
        toast.success(`Welcome back!`);
        const { role } = res.data;
        if (role === 'admin') navigate('/admin');
        else if (role === 'vendor') navigate('/vendor');
        else if (role === 'staff') navigate('/staff');
        else {
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
        }
      }
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#F8F9FA] flex flex-col relative overflow-hidden text-[#1C2C4E] animate-in fade-in duration-500">
      {/* Texture Layer (Subtle) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center p-6 pt-8 lg:pt-12 relative z-10">
        <div className="w-full max-w-sm flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 'phone' ? (
              <motion.div
                key="phone-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-10 lg:space-y-12"
              >
                <div className="space-y-3 text-center pt-4 lg:pt-10">
                  <h1 className="text-[38px] lg:text-[44px] font-black text-[#1C2C4E] tracking-tighter leading-none text-shadow-sm">Welcome!</h1>
                  <p className="text-gray-500 font-medium text-[13px] tracking-tight">Login to continue with your mobile number</p>
                </div>

                <div className="space-y-8">
                  <div className="bg-white px-5 py-4 rounded-[1.5rem] border border-gray-200/60 flex items-center gap-4 h-16 shadow-xl shadow-black/[0.03] ring-1 ring-black/[0.02]">
                    <div className="flex items-center gap-2 border-r border-gray-100 pr-4">
                       <img src="https://flagcdn.com/in.svg" className="w-6 rounded-sm shadow-sm" alt="IN" />
                       <span className="font-bold text-[#1C2C4E] text-lg">+91</span>
                    </div>
                    <input 
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="Phone Number"
                      autoFocus
                      className="flex-1 bg-transparent border-none outline-none font-bold text-xl text-[#1C2C4E] tracking-widest placeholder:text-gray-200 placeholder:font-medium placeholder:tracking-normal"
                    />
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full h-16 rounded-[1.25rem] bg-[#1C2C4E] text-white text-lg font-bold shadow-xl shadow-[#1C2C4E]/20 active:scale-95 transition-all !disabled:opacity-100 !disabled:bg-[#1C2C4E]/90"
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-6 lg:space-y-10 flex-1 flex flex-col justify-center max-h-screen overflow-hidden relative"
              >
                {/* Subtle Back Button */}
                <button 
                  onClick={() => setStep('phone')}
                  className="absolute top-0 left-0 p-2 text-[#1C2C4E] opacity-50 hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft size={24} strokeWidth={3} />
                </button>

                <div className="space-y-2 text-center">
                  <h1 className="text-[36px] font-black text-[#1C2C4E] tracking-tight leading-none">Verify OTP</h1>
                  <p className="text-gray-500 font-medium text-[11px] uppercase tracking-widest">
                    Code sent to <span className="text-[#1C2C4E] font-bold">+91 {phone}</span>
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
                  <div className="flex justify-center gap-3 px-2 pointer-events-none">
                    {otp.map((digit, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-12 h-12 bg-white rounded-full border-2 flex items-center justify-center font-black text-2xl shadow-sm transition-all",
                          digit ? "border-[#1C2C4E] text-[#1C2C4E]" : "border-gray-100 text-gray-200"
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
                    className="w-full h-16 rounded-[1.5rem] bg-[#1C2C4E] text-white text-lg font-bold shadow-2xl shadow-[#1C2C4E]/30"
                    onClick={handleVerifyOTP}
                    loading={loading}
                    disabled={otp.includes('')}
                  >
                    Verify & Proceed
                  </Button>

                  <div className="text-center space-y-3">
                    <p className="text-[10px] font-black text-[#1C2C4E]/60 uppercase tracking-widest">Didn't receive the code?</p>
                    <div className="flex flex-col items-center gap-2">
                      <button 
                        disabled={!canResend}
                        onClick={handleSendOTP}
                        className={`text-[12px] font-black border-b-2 border-current pb-0.5 transition-all ${
                          canResend ? 'text-[#1C2C4E]' : 'text-gray-300'
                        }`}
                      >
                        Resend OTP
                      </button>
                      {!canResend && (
                        <p className="text-[10px] font-black text-[#1C2C4E] opacity-40 uppercase tracking-widest">
                          Wait 00:{timer < 10 ? `0${timer}` : timer}
                        </p>
                      )}
                    </div>
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

export default CustomerAuth;
