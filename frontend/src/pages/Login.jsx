import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ArrowRight, ChevronLeft, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/Button';
import NumericKeypad from '../components/NumericKeypad';
import logo from '../assests/logo.jpeg';
import toast from 'react-hot-toast';

const CustomerAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { requestOTP, verifyOTP, loading, setCredentials } = useAuthStore();

  const [step, setStep] = useState('phone'); // phone, otp
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [isOTPFocused, setIsOTPFocused] = useState(false);
  const redirectPath =
    location.state?.from?.pathname ||
    new URLSearchParams(location.search).get('redirect') ||
    '/';

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
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('91') && val.length > 10) {
      val = val.slice(-10);
    } else if (val.startsWith('0') && val.length > 10) {
      val = val.slice(-10);
    }
    setPhone(val.slice(0, 10));
  };

  const handleOTPChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    const newOtp = ['', '', '', '', '', ''];
    val.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
  };

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    if (phone.length < 10) return toast.error('Please enter a valid phone number');

    const res = await requestOTP(phone, 'customer');
    if (res.success) {
      toast.success(res.otp ? `Test Mode: OTP is ${res.otp}` : 'Verification code sent successfully');
      setStep('otp');
      setTimer(30);
      setCanResend(false);
    } else {
      toast.error(res.message);
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < 6) return toast.error('Please enter the full code');

    const res = await verifyOTP(phone, otpValue, true);
    if (res.success) {
      const { role, token } = res.data;

      if (res.needsRegistration) {
        navigate('/signup', { state: { phone, role: 'customer' } });
      } else {
        // 🔒 ROLE SECURITY: Prevent cross-portal entry
        if (role !== 'customer') {
          toast.error(`You are already registered as a Partner. Please use another number for Customer account.`, {
            duration: 6000,
            icon: '⛔'
          });
          return;
        }

        // ✅ Login is valid for this portal
        setCredentials({
          token,
          role,
          user: res.data
        });

        toast.success(`Welcome back!`);
        navigate(redirectPath, { replace: true });
      }
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#F3F2F7] flex flex-col relative overflow-hidden text-[#1C2C4E] animate-in fade-in duration-500 font-sans">
      {/* Texture Layer (Subtle Paper/Linen) */}
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/linen.png')]" />

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
                <div className="space-y-4 text-center">
                  <img src={logo} alt="ZeroOne Logo" className="w-20 h-20 mx-auto rounded-2xl object-cover mb-2" />
                  <h1 className="text-[42px] font-bold text-[#1C2C4E] tracking-tight leading-none">Welcome!</h1>
                  <p className="text-[#1C2C4E]/70 font-medium text-[15px]">Login to continue with your mobile number</p>
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
                      maxLength={10}
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
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-4 flex-1 flex flex-col justify-center max-h-screen overflow-hidden relative"
              >
                <div className="space-y-2 text-center">
                  <h1 className="text-[36px] font-black text-[#1C2C4E] tracking-tight leading-none">Verify OTP</h1>
                  <p className="text-gray-500 font-medium text-[11px] uppercase tracking-widest">
                    Code sent to <span className="text-[#1C2C4E] font-bold">+91 {phone}</span>
                  </p>
                </div>

                <div className="relative">
                  <input
                    type="tel"
                    maxLength={6}
                    value={otp.join('')}
                    onChange={handleOTPChange}
                    onFocus={() => setIsOTPFocused(true)}
                    onBlur={() => setIsOTPFocused(false)}
                    autoFocus
                    className="absolute inset-0 opacity-0 cursor-default"
                  />
                  <div className="flex justify-center gap-3 px-2 pointer-events-none">
                    {otp.map((digit, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-10 h-11 bg-white rounded-xl border flex items-center justify-center font-bold text-xl shadow-sm transition-all",
                          digit || (isOTPFocused && i === otp.join('').length) ? "border-[#1C2C4E] text-[#1C2C4E]" : "border-gray-50 text-gray-200"
                        )}
                      >
                        {digit}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
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
                    <p className="text-[10px] font-black text-[#1C2C4E]/60 uppercase tracking-widest">Did'nt receive the code?</p>
                    <div className="flex flex-col items-center gap-2">
                      <button
                        disabled={!canResend}
                        onClick={handleSendOTP}
                        className={`text-[12px] font-black border-b-2 border-current pb-0.5 transition-all ${canResend ? 'text-[#1C2C4E]' : 'text-gray-300'
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

      {/* Footer Branding */}
      <div className="pb-8 flex items-center justify-center gap-2 relative z-10">
        <span className="text-[11px] h-[8px] font-black text-[#1C2C4E] uppercase tracking-wider leading-none">MADE IN INDIA</span>
        <img src="https://flagcdn.com/in.svg" className="h-[8px] w-auto rounded-[1px]" alt="India flag" />
      </div>
    </div>
  );
};

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default CustomerAuth;
