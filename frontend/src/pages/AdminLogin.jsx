import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Phone } from 'lucide-react';
import logo from '../assests/logo.jpeg';
import { useAuthStore } from '../store/authStore';
import Button from '../components/Button';
import toast from 'react-hot-toast';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminLogin, loading } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const redirectPath =
    location.state?.from?.pathname ||
    new URLSearchParams(location.search).get('redirect') ||
    '/admin/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (phone.length !== 10) {
      return toast.error('Please enter a valid admin phone number');
    }

    if (!password) {
      return toast.error('Please enter your password');
    }

    const res = await adminLogin({ phone, password });
    if (!res.success) {
      return toast.error(res.message);
    }

    toast.success('Admin access granted');
    navigate(redirectPath.startsWith('/admin') ? redirectPath : '/admin/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F3F2F7] flex flex-col relative overflow-hidden text-[#1C2C4E] font-sans">
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/linen.png')]" />

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-4 text-center">
            <img src={logo} alt="ZeroOne Logo" className="w-20 h-20 mx-auto rounded-2xl object-cover mb-2" />
            <h1 className="text-[40px] font-bold text-[#1C2C4E] tracking-tight leading-none">Admin Login</h1>
            <p className="text-[#1C2C4E]/70 font-medium text-[15px]">
              Secure access for platform administrators
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-white px-5 py-2 rounded-xl border border-gray-200/50 flex items-center gap-4 h-12 shadow-sm">
              <Phone size={16} className="text-[#1C2C4E]/50 shrink-0" />
              <div className="flex items-center gap-3 pr-2">
                <span className="font-medium text-[#1C2C4E] text-base">+91</span>
                <div className="w-[1px] h-6 bg-gray-200/80 ml-2" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Admin Phone Number"
                autoFocus
                className="flex-1 bg-transparent border-none outline-none font-medium text-base text-[#1C2C4E] placeholder:text-gray-300"
              />
            </div>

            <div className="bg-white px-5 py-2 rounded-xl border border-gray-200/50 flex items-center gap-4 h-12 shadow-sm">
              <Lock size={16} className="text-[#1C2C4E]/50 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="flex-1 bg-transparent border-none outline-none font-medium text-base text-[#1C2C4E] placeholder:text-gray-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-[#1C2C4E]/50 active:scale-90 transition-all"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-[42px] rounded-xl text-white text-[12px] font-black transition-all duration-300 bg-[#1C2C4E] shadow-sm active:scale-[0.98]"
              loading={loading}
              disabled={phone.length !== 10 || !password}
            >
              Login to Dashboard
            </Button>
          </form>
        </div>
      </div>

      <div className="pb-8 flex items-center justify-center gap-2 relative z-10">
        <span className="text-[11px] h-[8px] font-black text-[#1C2C4E] uppercase tracking-wider leading-none">MADE IN INDIA</span>
        <img src="https://flagcdn.com/in.svg" className="h-[8px] w-auto rounded-[1px]" alt="India flag" />
      </div>
    </div>
  );
};

export default AdminLogin;
