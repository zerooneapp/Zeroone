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

  const [step, setStep] = useState(location.state?.step || 'phone'); // phone, otp
  const [phone, setPhone] = useState(() => {
    return location.state?.phone || sessionStorage.getItem('login_phone_input') || '';
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = React.useRef([]);
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
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
    const newPhone = val.slice(0, 10);
    setPhone(newPhone);
    sessionStorage.setItem('login_phone_input', newPhone);
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
    if (phone.length < 10) return toast.error('Please enter a valid phone number', { id: 'auth-error' });

    const res = await requestOTP(phone, 'customer');
    if (res.success) {
      sessionStorage.setItem('pendingPhone', phone);
      toast.success(res.otp ? `Test Mode: OTP is ${res.otp}` : 'Verification code sent successfully');
      setStep('otp');
      setTimer(30);
      setCanResend(false);
      // Auto focus first OTP input field on step change to OTP
      setTimeout(() => {
        inputRefs.current[0]?.focus({ preventScroll: true });
      }, 50);
    } else {
      toast.error(res.message, { id: 'auth-error' });
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < 6) return toast.error('Please enter the full code', { id: 'auth-error' });

    const res = await verifyOTP(phone, otpValue, true);
    if (res.success) {
      const { role, token } = res.data;

      if (res.needsRegistration) {
        // Save current state to history so back button works!
        navigate('.', { state: { phone, step: 'otp' }, replace: true });
        // Then push signup
        setTimeout(() => navigate('/signup', { state: { phone, role: 'customer' } }), 10);
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
      toast.error(res.message, { id: 'auth-error' });
    }
  };

  return (
    <div className="h-[100dvh] bg-[#F3F2F7] dark:bg-gray-950 flex flex-col relative overflow-hidden text-[#00246b] dark:text-white animate-in fade-in duration-500 font-sans">
      {/* Texture Layer (Subtle Paper/Linen) */}
      <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.02] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/linen.png')]" />

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
                  <h1 className="text-[42px] font-bold text-[#00246b] dark:text-white tracking-tight leading-none">Welcome!</h1>
                  <p className="text-[#00246b]/70 dark:text-gray-400 font-medium text-[15px]">Login to continue with your mobile number</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-900 px-5 py-2 rounded-xl border border-gray-200/50 dark:border-gray-700/60 flex items-center gap-4 h-12 shadow-sm">
                    <div className="flex items-center gap-3 pr-2">
                      <span className="font-medium text-[#00246b] dark:text-white text-base">+91</span>
                      <div className="w-[1px] h-6 bg-gray-200/80 dark:bg-gray-700 ml-2" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="Phone Number"
                      autoFocus
                      maxLength={10}
                      className="flex-1 bg-transparent border-none outline-none font-medium text-base text-[#00246b] dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600"
                    />
                  </div>

                  <Button
                    size="lg"
                    className={cn(
                      "w-full h-[38px] rounded-xl text-white text-[12px] font-black transition-all duration-300 bg-[#00246b] dark:bg-[#00246b] shadow-sm active:scale-[0.98]",
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
                <div className="relative space-y-2 text-center">
                  <button 
                    onClick={() => {
                      setStep('phone');
                      setOtp(['', '', '', '', '', '']);
                    }}
                    className="fixed top-[48px] left-4 p-2 text-gray-500 hover:text-[#00246b] dark:text-gray-400 dark:hover:text-white transition-colors z-50"
                  >
                    <ChevronLeft size={28} />
                  </button>
                  <h1 className="text-[36px] font-black text-[#00246b] dark:text-white tracking-tight leading-none">Verify OTP</h1>
                  <p className="text-gray-500 dark:text-gray-400 font-medium text-[11px] uppercase tracking-widest">
                    Code sent to <span className="text-[#00246b] dark:text-white font-bold">+91 {phone}</span>
                  </p>
                </div>

                <div className="relative">
                  <div className="flex justify-center gap-3 px-2">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => inputRefs.current[i] = el}
                        type="text"
                        pattern="\d*"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        autoComplete="one-time-code"
                        onFocus={(e) => {
                          e.target.select();
                          setFocusedIndex(i);
                        }}
                        onBlur={() => setFocusedIndex(-1)}
                        onPaste={(e) => {
                          e.preventDefault();
                          const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                          if (pastedData) {
                            const newOtp = ['', '', '', '', '', ''];
                            pastedData.split('').forEach((char, idx) => {
                              newOtp[idx] = char;
                            });
                            setOtp(newOtp);
                            const lastFocusIndex = Math.min(pastedData.length - 1, 5);
                            inputRefs.current[lastFocusIndex]?.focus({ preventScroll: true });
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          const newOtp = [...otp];
                          if (val.length > 1) {
                            const digits = val.split('').slice(0, 6 - i);
                            digits.forEach((char, idx) => {
                              newOtp[i + idx] = char;
                            });
                            setOtp(newOtp);
                            const nextIndex = Math.min(i + digits.length, 5);
                            inputRefs.current[nextIndex]?.focus({ preventScroll: true });
                          } else {
                            newOtp[i] = val;
                            setOtp(newOtp);
                            if (val && i < 5) {
                              inputRefs.current[i + 1]?.focus({ preventScroll: true });
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace') {
                            if (!otp[i] && i > 0) {
                              const newOtp = [...otp];
                              newOtp[i - 1] = '';
                              setOtp(newOtp);
                              inputRefs.current[i - 1]?.focus({ preventScroll: true });
                            } else {
                              const newOtp = [...otp];
                              newOtp[i] = '';
                              setOtp(newOtp);
                            }
                          }
                        }}
                        className={cn(
                          "w-10 h-11 bg-white dark:bg-gray-900 rounded-xl border text-center font-bold text-xl shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#00246b] dark:focus:ring-white",
                          focusedIndex === i
                            ? "border-[#00246b] dark:border-white text-[#00246b] dark:text-white"
                            : digit
                              ? "border-gray-200 dark:border-gray-700 text-[#00246b] dark:text-white"
                              : "border-gray-300 dark:border-white/40 text-gray-300 dark:text-white/40"
                        )}
                      />
                    ))}
                  </div>
                </div>
 
                <div className="space-y-4">
                  <Button
                    size="lg"
                    className="w-full h-[38px] rounded-xl bg-[#00246b] dark:bg-[#00246b] text-white text-[12px] font-black shadow-sm active:scale-[0.95]"
                    onClick={handleVerifyOTP}
                    loading={loading}
                    disabled={otp.includes('')}
                  >
                    Verify &amp; Proceed
                  </Button>

                  <div className="text-center space-y-3">
                    <div className="flex flex-col items-center gap-2">
                      <button
                        disabled={!canResend}
                        onClick={handleSendOTP}
                        className={`text-[12px] font-black border-b-2 border-current pb-0.5 transition-all ${canResend ? 'text-[#00246b] dark:text-gray-300' : 'text-gray-300 dark:text-gray-600'
                          }`}
                      >
                        Resend OTP
                      </button>
                      {!canResend && (
                        <p className="text-[10px] font-black text-[#00246b] dark:text-gray-500 opacity-40 uppercase tracking-widest">
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
      {step === 'phone' && (
        <div className="pb-4 flex flex-col items-center justify-center gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                navigate(location.pathname, { state: { phone, step }, replace: true });
                navigate('/privacy-policy');
              }}
              className="text-[9px] font-black text-[#00246b]/40 dark:text-gray-600 hover:text-[#00246b] dark:hover:text-white uppercase tracking-[0.2em] transition-colors"
            >
              Privacy &amp; Policy
            </button>
            <span className="text-[#00246b]/20 dark:text-gray-800">•</span>
            <button 
              onClick={() => {
                navigate(location.pathname, { state: { phone, step }, replace: true });
                navigate('/contact-support');
              }}
              className="text-[9px] font-black text-[#00246b]/40 dark:text-gray-600 hover:text-[#00246b] dark:hover:text-white uppercase tracking-[0.2em] transition-colors"
            >
              Contact &amp; Support
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default CustomerAuth;
