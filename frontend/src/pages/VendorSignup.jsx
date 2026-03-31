import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import {
  Store, FileText, MapPin, Camera, ArrowRight, ArrowLeft,
  CheckCircle2, Upload, Briefcase, ShieldCheck, Zap, Star, Crown, Info
} from 'lucide-react';
import api from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';
import toast from 'react-hot-toast';

const VendorSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone } = location.state || {};
  const setCredentials = useAuthStore(state => state.setCredentials);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    shopName: '',
    category: '',
    serviceLevel: 'basic', // basic, standard, premium
    address: '',
    location: { coordinates: [75.8577, 22.7196] }, // Default Indore
  });

  // Media State
  const [panCardFile, setPanCardFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [shopImage, setShopImage] = useState(null);
  const [vendorPhoto, setVendorPhoto] = useState(null);

  useEffect(() => {
    if (!phone) {
      navigate('/vendor-login');
      return;
    }
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data);
      } catch (err) {
        console.error('Failed to fetch categories');
      }
    };
    fetchCategories();
  }, [phone, navigate]);

  const handleNext = () => {
    if (step === 1 && (!formData.shopName || !formData.category)) {
      return toast.error('Please fill business details');
    }
    if (step === 2 && (!panCardFile || !aadhaarFile)) {
      return toast.error('Please upload identity documents');
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!formData.address) return toast.error('Please enter shop address');

    setLoading(true);
    try {
      // 1. Complete User Profile (Set Name)
      const authRes = await api.post('/auth/register', {
        phone,
        name: formData.shopName,
        role: 'vendor'
      });

      // 🚀 CRITICAL: Update Auth Store
      if (authRes.data.token) {
        setCredentials({
          token: authRes.data.token,
          user: authRes.data,
          role: 'vendor'
        });
        api.defaults.headers.common['Authorization'] = `Bearer ${authRes.data.token}`;
      }

      // 2. Register Vendor Record
      await api.post('/vendor/register', formData);

      // 3. Upload Media
      const mediaData = new FormData();
      if (shopImage) mediaData.append('shopImage', shopImage);
      if (vendorPhoto) mediaData.append('vendorPhoto', vendorPhoto);
      if (panCardFile) mediaData.append('panCard', panCardFile);
      if (aadhaarFile) mediaData.append('aadhaar', aadhaarFile);

      await api.post('/vendor/upload-docs', mediaData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Your application is under verification! 🛡️', { duration: 5000 });
      navigate('/vendor-verification');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const levels = [
    { id: 'basic', name: 'Basic', icon: Zap, desc: 'Visible in search results', color: 'blue' },
    { id: 'standard', name: 'Standard', icon: Star, desc: 'Priority in categories', color: 'amber' },
    { id: 'premium', name: 'Premium', icon: Crown, desc: 'Top slots & Video Promos', color: 'purple' }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-white p-6 pb-32 transition-colors duration-500 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-5%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-4 mb-10 pt-4 relative z-10">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
          className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-90 transition-all text-gray-900 dark:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Step {step} of 3</p>
          <h1 className="text-2xl font-black tracking-tight leading-none">Vendor Application</h1>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8 relative z-10"
          >
            <div className="space-y-2">
              <h2 className="text-[32px] font-black leading-tight">Business Basics</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Tell us about your brand</p>
            </div>

            <div className="space-y-4">
              <Input
                icon={Store}
                placeholder="Shop Name"
                className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 h-16 rounded-2xl font-bold shadow-sm"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              />

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center gap-4 h-16 shadow-sm ring-inset ring-1 ring-black/5 transition-all focus-within:ring-2 focus-within:ring-primary/20">
                <Briefcase size={20} className="text-gray-400" />
                <select
                  className="flex-1 bg-transparent outline-none font-bold text-gray-900 dark:text-gray-200"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="" className="bg-white dark:bg-gray-900">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id} className="bg-white dark:bg-gray-900">{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Service Level Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Membership Level</h3>
                <div className="flex items-center gap-1 text-[8px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">
                  <Info size={10} /> View Benefits
                </div>
              </div>

              <div className="grid gap-3">
                {levels.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, serviceLevel: lvl.id })}
                    className={`p-4 rounded-3xl border-2 transition-all flex items-center gap-4 text-left relative overflow-hidden group ${formData.serviceLevel === lvl.id
                        ? 'bg-primary/5 dark:bg-primary/10 border-primary shadow-lg shadow-primary/5 scale-[1.02]'
                        : 'bg-white dark:bg-gray-900 border-gray-50 dark:border-gray-800 opacity-60 hover:opacity-100'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${formData.serviceLevel === lvl.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}>
                      <lvl.icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-sm uppercase tracking-tight">{lvl.name}</h4>
                      <p className="text-[10px] font-bold text-gray-400 leading-tight">{lvl.desc}</p>
                    </div>
                    {formData.serviceLevel === lvl.id && (
                      <CheckCircle2 className="text-primary absolute right-4 top-1/2 -translate-y-1/2" size={20} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8 relative z-10"
          >
            <div className="space-y-2">
              <h2 className="text-[32px] font-black leading-tight">Identity Documents</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Verify your business legality</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-3">
                 <p className="px-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">PAN Card Image</p>
                 <label className="h-40 bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary/5 hover:border-primary group shadow-sm">
                    {panCardFile ? <CheckCircle2 className="text-green-500 animate-bounce" size={32} /> : <FileText className="text-gray-300 group-hover:text-primary transition-colors" size={32} />}
                    <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-2">{panCardFile ? 'Attached' : 'Add PAN'}</p>
                    <input type="file" className="hidden" onChange={(e) => setPanCardFile(e.target.files[0])} accept="image/*" />
                 </label>
               </div>
               <div className="space-y-3">
                 <p className="px-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Aadhaar Card Image</p>
                 <label className="h-40 bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary/5 hover:border-primary group shadow-sm">
                    {aadhaarFile ? <CheckCircle2 className="text-green-500 animate-bounce" size={32} /> : <ShieldCheck className="text-gray-300 group-hover:text-primary transition-colors" size={32} />}
                    <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-2">{aadhaarFile ? 'Attached' : 'Add Aadhaar'}</p>
                    <input type="file" className="hidden" onChange={(e) => setAadhaarFile(e.target.files[0])} accept="image/*" />
                 </label>
               </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
              <Info className="text-amber-500 mt-0.5 shrink-0" size={18} />
              <p className="text-[10px] font-bold text-amber-600/70 dark:text-amber-500/50 uppercase leading-relaxed font-mono">
                Your documents will be stored securely and will only be used for verification purpose by our admin team.
              </p>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8 relative z-10"
          >
            <div className="space-y-2">
              <h2 className="text-[32px] font-black leading-tight">Media & Map</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Your shop's digital identity</p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Shop Location</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) return toast.error('Geolocation is not supported');
                      toast.loading('Detecting location...', { id: 'geo' });
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const { latitude, longitude } = pos.coords;
                          setFormData(prev => ({
                            ...prev,
                            location: { coordinates: [longitude, latitude] }
                          }));

                          // 🚀 AUTO-FILL ADDRESS LOGIC (REVERSE GEOCODING)
                          try {
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
                            const data = await response.json();
                            if (data.display_name && !formData.address) {
                              setFormData(prev => ({ ...prev, address: data.display_name }));
                            }
                            toast.success('Address & Location locked! 📍', { id: 'geo' });
                          } catch (err) {
                            toast.success('Coordinates locked! (Manual address needed)', { id: 'geo' });
                          }
                        },
                        (err) => toast.error('Check permission or GPS', { id: 'geo' })
                      );
                    }}
                    className="flex items-center gap-1.5 text-[8px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 active:scale-95 transition-all shadow-sm shadow-emerald-500/10"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <MapPin size={10} strokeWidth={3} className="fill-emerald-500/20" />
                    </motion.div>
                    Detect GPS Location
                  </button>
                </div>

                <Input
                  icon={MapPin}
                  placeholder="Full Address (Street, Building, Area)"
                  className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 h-16 rounded-2xl font-bold shadow-sm focus:ring-2 focus:ring-emerald-500/20"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />

                <div className="flex items-center gap-2 px-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                    Precise Coordinates: <span className="text-emerald-500">{formData.location.coordinates[0].toFixed(4)}, {formData.location.coordinates[1].toFixed(4)}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="px-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Shop Facade</p>
                  <label className="h-40 bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary/5 hover:border-primary group shadow-sm">
                    {shopImage ? <CheckCircle2 className="text-green-500 animate-bounce" size={32} /> : <Camera className="text-gray-300 group-hover:text-primary transition-colors" size={32} />}
                    <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-2">{shopImage ? 'Attached' : 'Add Image'}</p>
                    <input type="file" className="hidden" onChange={(e) => setShopImage(e.target.files[0])} accept="image/*" />
                  </label>
                </div>
                <div className="space-y-3">
                  <p className="px-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">Owner ID</p>
                  <label className="h-40 bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-primary/5 hover:border-primary group shadow-sm">
                    {vendorPhoto ? <CheckCircle2 className="text-green-500 animate-bounce" size={32} /> : <Upload className="text-gray-300 group-hover:text-primary transition-colors" size={32} />}
                    <p className="text-[8px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-2">{vendorPhoto ? 'Attached' : 'Add Photo'}</p>
                    <input type="file" className="hidden" onChange={(e) => setVendorPhoto(e.target.files[0])} accept="image/*" />
                  </label>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-8 pt-12 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent z-50">
        <Button
          size="lg"
          className="w-full h-16 rounded-[2rem] shadow-2xl shadow-primary/20 gap-3 text-lg font-black uppercase tracking-widest text-white bg-primary"
          onClick={step < 3 ? handleNext : handleSubmit}
          loading={loading}
        >
          {step < 3 ? 'Continue' : 'Submit Application'}
          <ArrowRight size={22} strokeWidth={3} />
        </Button>
      </div>
    </div>
  );
};

export default VendorSignup;
