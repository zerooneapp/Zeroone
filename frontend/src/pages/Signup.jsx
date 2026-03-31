import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Calendar, UserCircle2, ArrowRight, ChevronLeft 
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Button from '../components/Button';
import toast from 'react-hot-toast';
import api from '../services/api';

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    dob: '',
    image: null
  });

  useEffect(() => {
    if (!phone) {
      navigate('/login');
    }
  }, [phone, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteRegistration = async (e) => {
    e?.preventDefault();
    if (!profileData.name) return toast.error('Full Name is required');
    if (!profileData.dob) return toast.error('Date of Birth is required');
    
    setLoading(true);
    try {
      await api.post('/auth/register', { 
        phone, 
        ...profileData, 
        role: 'customer' 
      });
      const { useAuthStore } = await import('../store/authStore');
      await useAuthStore.getState().restoreSession();
      toast.success('Registration successful!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] bg-[#F8F9FA] flex flex-col relative overflow-hidden text-[#1C2C4E] animate-in fade-in duration-500">
      {/* Texture Layer (Subtle) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 z-20">
        <button 
          onClick={() => navigate('/login')}
          className="p-3 text-[#1C2C4E] bg-white rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-all"
        >
          <ChevronLeft size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Main HUD Container */}
      <div className="flex-1 flex flex-col items-center justify-start p-6 pt-16 lg:pt-20 relative z-10">
        <div className="w-full max-w-sm space-y-8 lg:space-y-10">
          
          <div className="space-y-3 text-center">
            <div className="relative w-20 h-20 mx-auto mb-6 group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageChange}
                  className="hidden" 
                  id="profile-upload"
                />
                <label 
                  htmlFor="profile-upload"
                  className="w-full h-full bg-[#1C2C4E]/5 rounded-[2rem] flex items-center justify-center cursor-pointer overflow-hidden shadow-xl shadow-black/[0.02] border-2 border-white hover:border-[#1C2C4E]/20 transition-all relative group"
                >
                  {profileData.image ? (
                    <img src={profileData.image} alt="Profile" className="w-full h-full object-cover animate-in fade-in zoom-in duration-300" />
                  ) : (
                    <div className="bg-[#1C2C4E]/10 p-4 rounded-full">
                        <svg className="w-8 h-8 text-[#1C2C4E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                  )}
                  {/* Overlay on hover/select */}
                  <div className="absolute inset-0 bg-[#1C2C4E]/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Change</span>
                  </div>
                </label>
            </div>
            <h1 className="text-[32px] font-black text-[#1C2C4E] tracking-tight leading-none">Complete Profile</h1>
            <p className="text-gray-500 font-medium text-[12px] tracking-tight opacity-70">Help us personalize your experience</p>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Minimalist Input HUD */}
            <div className="space-y-4">
              <div className="bg-white px-5 py-4 rounded-[1.5rem] border border-gray-200/60 flex items-center gap-4 h-16 shadow-xl shadow-black/[0.03] ring-1 ring-black/[0.02] transition-focus-within focus-within:ring-2 focus-within:ring-[#1C2C4E]/10">
                <div className="bg-[#F8F9FA] p-2 rounded-xl">
                  <User size={18} className="text-[#1C2C4E]" />
                </div>
                <input 
                  type="text" 
                  placeholder="Full Name *"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                  className="flex-1 bg-transparent border-none outline-none font-bold text-lg text-[#1C2C4E] placeholder:text-gray-300"
                />
              </div>

              <div className="bg-white px-5 py-4 rounded-[1.5rem] border border-gray-200/60 flex items-center gap-4 h-16 shadow-xl shadow-black/[0.03] ring-1 ring-black/[0.02] transition-focus-within focus-within:ring-2 focus-within:ring-[#1C2C4E]/10">
                <div className="bg-[#F8F9FA] p-2 rounded-xl">
                  <Calendar size={18} className="text-[#1C2C4E]" />
                </div>
                <div className="flex-1 flex flex-col">
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Date of Birth</span>
                  <input 
                    type="date"
                    value={profileData.dob}
                    onChange={(e) => setProfileData({...profileData, dob: e.target.value})}
                    className="bg-transparent border-none outline-none font-black text-[#1C2C4E] uppercase tracking-tighter"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Button 
                size="lg" 
                className="w-full h-16 rounded-[1.5rem] bg-[#1C2C4E] text-white text-lg font-bold shadow-2xl shadow-[#1C2C4E]/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
                onClick={handleCompleteRegistration}
                loading={loading}
              >
                Create Account
                <ArrowRight size={22} strokeWidth={3} />
              </Button>

              <div className="text-center px-10">
                <p className="text-[10px] font-bold text-gray-400 leading-relaxed uppercase tracking-widest opacity-60">
                  By joining, you agree to our <span className="text-[#1C2C4E] border-b border-current">Terms</span> and <span className="text-[#1C2C4E] border-b border-current">Privacy</span>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Safety Buffer for Navigation Bar */}
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </div>
  );
};

export default Signup;
