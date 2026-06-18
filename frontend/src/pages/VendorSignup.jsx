import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import {
  Store, FileText, MapPin, Camera, ArrowRight, ArrowLeft, User,
  CheckCircle2, Upload, Briefcase, ShieldCheck, Zap, Star, Crown, Info
} from 'lucide-react';
import api from '../services/api';
import Button from '../components/Button';
import Input from '../components/Input';
import toast from 'react-hot-toast';

import { useSignupStore } from '../store/signupStore';

const VendorSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { phone: statePhone } = location.state || {};
  const phone = statePhone || sessionStorage.getItem('pendingPhone');
  const setCredentials = useAuthStore(state => state.setCredentials);

  const { formData, setFormData, step, setStep, files, setFile, reset } = useSignupStore();

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

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
    if (step === 1 && (!formData.shopName || !formData.ownerName || !formData.category || !formData.serviceMode)) {
      return toast.error('Please fill personal and business details');
    }
    if (step === 2 && (!files.panCard || !files.aadhaarFront || !files.aadhaarBack)) {
      return toast.error('Please upload all identity documents');
    }
    if (step === 3 && formData.serviceMode === 'shop' && !files.shopImage) {
      return toast.error('Please upload shop facade image');
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    // 🛡️ RE-VALIDATE STATE TO PREVENT DATA LOSS ON REFRESH
    if (!files.panCard || !files.aadhaarFront || !files.aadhaarBack) {
      setStep(2);
      return toast.error('Identity documents were lost due to page reload. Please upload them again.');
    }
    if (formData.serviceMode === 'shop' && !files.shopImage) {
      return toast.error('Please upload shop facade image');
    }
    if (!formData.address) return toast.error('Please enter shop address');
    if (!formData.location) return toast.error('Please lock your GPS location');
    if (!files.vendorPhoto) return toast.error('Please upload partner profile photo');

    setLoading(true);
    try {
      // 1. Register User Record & Get Token
      const authRes = await api.post('/auth/register', {
        phone,
        name: formData.ownerName,
        role: 'vendor',
        forceUpdate: true
      });

      // Temporarily set token for subsequent requests without triggering GuestRoute redirect
      if (authRes.data.token) {
        localStorage.setItem('token', authRes.data.token);
        api.defaults.headers.common['Authorization'] = `Bearer ${authRes.data.token}`;
      }

      // 2. Register Vendor Record
      await api.post('/vendor/register', formData);

      // 3. Upload Media
      const mediaData = new FormData();
      if (files.shopImage && formData.serviceMode === 'shop') mediaData.append('shopImage', files.shopImage);
      if (files.vendorPhoto) mediaData.append('vendorPhoto', files.vendorPhoto);
      if (files.panCard) mediaData.append('panCard', files.panCard);
      if (files.gstCertificate) mediaData.append('gstCertificate', files.gstCertificate);
      if (files.shopRegistration) mediaData.append('shopRegistration', files.shopRegistration);
      if (files.aadhaarFront) mediaData.append('aadhaarFront', files.aadhaarFront);
      if (files.aadhaarBack) mediaData.append('aadhaarBack', files.aadhaarBack);

      await api.post('/vendor/upload-docs', mediaData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // 🚀 CRITICAL: Update Auth Store only AFTER all API calls succeed
      if (authRes.data.token) {
        setCredentials({
          token: authRes.data.token,
          user: authRes.data,
          role: 'vendor'
        });
      }

      toast.success('Your application is under verification! 🛡️', { duration: 5000 });
      reset();
      navigate('/vendor-verification', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const levels = [
    { id: 'standard', title: 'STANDARD', desc: 'Visible in search results', icon: Zap },
    { id: 'premium', title: 'PREMIUM', desc: 'Priority in categories', icon: Star },
    { id: 'luxury', title: 'LUXURY', desc: 'Top slots & Video Promos', icon: Crown }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-white px-3 pt-0 pb-32 transition-colors duration-500 relative no-scrollbar">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-5%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-12 pb-4 px-4 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl flex items-center gap-3 border-b border-gray-100/10 dark:border-gray-800/50">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
          className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm active:scale-90 transition-all text-gray-900 dark:text-white shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black text-[#00246b] dark:text-white uppercase tracking-widest leading-none mb-1">Step {step} of 3</p>
          <h1 className="text-2xl font-black tracking-tight leading-none">Partner Application</h1>
        </div>
      </div>

      <div className="space-y-4 pt-[110px]">
        {step === 1 && (
          <div className="space-y-4 relative z-10">
            <div className="space-y-1">
              <h2 className="text-2xl font-black leading-tight">Business Basics</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">Tell us about your brand</p>
            </div>

            <div className="space-y-3">
              <Input
                icon={User}
                autoFocus
                placeholder="Owner Full Name"
                className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 h-12 rounded-xl font-bold shadow-sm text-sm"
                value={formData.ownerName}
                onChange={(e) => {
                  const value = e.target.value;
                  const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
                  setFormData({ ...formData, ownerName: filteredValue });
                }}
              />

              <Input
                icon={Store}
                placeholder="Shop Name"
                className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 h-12 rounded-xl font-bold shadow-sm text-sm"
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
              />

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-2 flex items-center gap-3 h-12 shadow-sm ring-inset ring-1 ring-black/5">
                <Briefcase size={18} className="text-gray-400" />
                <select
                  className="flex-1 bg-transparent outline-none font-bold text-gray-900 dark:text-gray-200 text-sm"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="" className="bg-white dark:bg-gray-900">Category</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat._id} className="bg-white dark:bg-gray-900">{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>



            {/* Service Level Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Membership Level</h3>
                <div className="flex items-center gap-1 text-[7px] font-black text-primary dark:text-white uppercase bg-primary/10 dark:bg-white/10 px-2 py-0.5 rounded-full">
                  <Info size={8} /> Benefits
                </div>
              </div>

              <div className="grid gap-2">
                {levels.map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, serviceLevel: lvl.id })}
                    className={`px-4 py-2 rounded-xl border-2 transition-all flex items-center gap-3 text-left relative overflow-hidden ${formData.serviceLevel === lvl.id
                      ? 'bg-primary/5 dark:bg-white/10 border-primary dark:border-white shadow-sm'
                      : 'bg-white dark:bg-gray-900 border-gray-50 dark:border-gray-800 opacity-80'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${formData.serviceLevel === lvl.id ? 'bg-primary dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}>
                      <lvl.icon size={16} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-xs uppercase tracking-tight leading-none">{lvl.title}</h4>
                      <p className="text-[8px] font-bold text-gray-400 leading-none mt-1">{lvl.desc}</p>
                    </div>
                    {formData.serviceLevel === lvl.id && (
                      <CheckCircle2 className="text-primary dark:text-white absolute right-3 top-1/2 -translate-y-1/2" size={16} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 relative z-10">
            <div className="space-y-1">
              <h2 className="text-2xl font-black leading-tight">Identity Docs</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">Verify your business legality</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Aadhaar Card (Front Side)</p>
                <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-white/40 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {files.aadhaarFront ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                        <img src={URL.createObjectURL(files.aadhaarFront)} alt="Front" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="text-gray-300" size={18} />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{files.aadhaarFront ? files.aadhaarFront.name : 'ADD AADHAAR FRONT'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {files.aadhaarFront && <CheckCircle2 className="text-green-500" size={16} />}
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setFile('aadhaarFront', e.target.files[0])} accept=".jpg,.jpeg,.png" />
                </label>
              </div>

              <div className="space-y-1.5">
                <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Aadhaar Card (Back Side)</p>
                <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-white/40 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {files.aadhaarBack ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                        <img src={URL.createObjectURL(files.aadhaarBack)} alt="Back" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="text-gray-300" size={18} />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{files.aadhaarBack ? files.aadhaarBack.name : 'ADD AADHAAR BACK'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {files.aadhaarBack && <CheckCircle2 className="text-green-500" size={16} />}
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setFile('aadhaarBack', e.target.files[0])} accept=".jpg,.jpeg,.png" />
                </label>
              </div>

              <div className="space-y-1.5">
                <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">PAN Card</p>
                <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-white/40 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {files.panCard ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                        <img src={URL.createObjectURL(files.panCard)} alt="PAN" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <FileText className="text-gray-300" size={18} />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{files.panCard ? files.panCard.name : 'ADD PAN CARD'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {files.panCard && <CheckCircle2 className="text-green-500" size={16} />}
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setFile('panCard', e.target.files[0])} accept=".jpg,.jpeg,.png" />
                </label>
              </div>

              <div className="space-y-1.5">
                <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Shop Registration (Optional)</p>
                <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-white/40 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {files.shopRegistration ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                        <img src={URL.createObjectURL(files.shopRegistration)} alt="Registration" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <FileText className="text-gray-300" size={18} />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{files.shopRegistration ? files.shopRegistration.name : 'ADD SHOP REGISTRY (OPTIONAL)'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {files.shopRegistration && <CheckCircle2 className="text-green-500" size={16} />}
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setFile('shopRegistration', e.target.files[0])} accept=".jpg,.jpeg,.png" />
                </label>
              </div>

              <div className="space-y-1.5">
                <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">GST Certificate (Optional)</p>
                <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-white/40 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {files.gstCertificate ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                        <img src={URL.createObjectURL(files.gstCertificate)} alt="GST" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <FileText className="text-gray-300" size={18} />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{files.gstCertificate ? files.gstCertificate.name : 'ADD GST CERTIFICATE (OPTIONAL)'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {files.gstCertificate && <CheckCircle2 className="text-green-500" size={16} />}
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setFile('gstCertificate', e.target.files[0])} accept=".jpg,.jpeg,.png" />
                </label>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-center gap-2">
              <Info className="text-amber-500 shrink-0" size={14} />
              <p className="text-[8px] font-bold text-amber-600/70 dark:text-amber-500/50 uppercase leading-tight font-mono">
                Stored securely for verification only.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 relative z-10">
            <div className="space-y-1">
              <h2 className="text-2xl font-black leading-tight">Media & Map</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">Your shop's digital identity</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Business Geolocation</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) return toast.error('GPS Not Supported');
                      toast.loading('Locating...', { id: 'geo' });
                      navigator.geolocation.getCurrentPosition(
                        async (pos) => {
                          const { latitude, longitude } = pos.coords;
                          setFormData(prev => ({
                            ...prev,
                            location: { coordinates: [longitude, latitude] }
                          }));
                          try {
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
                            const data = await response.json();
                            if (data.display_name) {
                              setFormData(prev => ({ ...prev, address: data.display_name }));
                            }
                            toast.success('Location Locked 📍', { id: 'geo' });
                          } catch (err) {
                            toast.success('GPS Locked!', { id: 'geo' });
                          }
                        },
                        () => toast.error('GPS Permission Denied', { id: 'geo' })
                      );
                    }}
                    className="flex items-center gap-1.5 text-[8px] font-black text-white uppercase bg-emerald-500 px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                  >
                    <MapPin size={10} strokeWidth={3} />
                    Auto-Detect My Location
                  </button>
                </div>

                <Input
                  icon={MapPin}
                  placeholder="Full Address"
                  className="bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 h-12 rounded-xl font-bold shadow-sm text-sm"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />

                {formData.location ? (
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                      GPS Locked: <span className="text-emerald-500">{formData.location.coordinates[0].toFixed(4)}, {formData.location.coordinates[1].toFixed(4)}</span>
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2">
                    <div className="w-1 h-1 rounded-full bg-rose-500" />
                    <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                      GPS Not Locked
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {formData.serviceMode === 'shop' && (
                  <div className="space-y-1.5">
                    <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Shop Facade Image</p>
                    <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-white/40 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                      <div className="flex items-center gap-3 overflow-hidden">
                        {files.shopImage ? (
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                            <img src={URL.createObjectURL(files.shopImage)} alt="Shop" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                            <Camera className="text-gray-300" size={18} />
                          </div>
                        )}
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{files.shopImage ? 'SHOP IMAGE READY' : 'ADD FRONT PHOTO'}</p>
                      </div>
                      <ArrowRight size={14} className="text-gray-300" />
                      <input type="file" className="hidden" onChange={(e) => setFile('shopImage', e.target.files[0])} accept=".jpg,.jpeg,.png" />
                    </label>
                  </div>
                )}

                <div className="space-y-1.5">
                  <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Partner Profile Photo</p>
                  <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-white/40 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {files.vendorPhoto ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                          <img src={URL.createObjectURL(files.vendorPhoto)} alt="Owner" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <Upload className="text-gray-300" size={18} />
                        </div>
                      )}
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{files.vendorPhoto ? 'PHOTO READY' : 'ADD OWNER PHOTO'}</p>
                    </div>
                    <ArrowRight size={14} className="text-gray-300" />
                    <input type="file" className="hidden" onChange={(e) => setFile('vendorPhoto', e.target.files[0])} accept=".jpg,.jpeg,.png" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light/95 dark:via-background-dark/95 to-transparent z-50">
        <Button
          size="lg"
          className="w-full h-12 rounded-xl shadow-lg shadow-[#00246b]/10 gap-2 text-sm font-black uppercase tracking-widest text-white bg-[#00246b] dark:bg-[#00246b] active:scale-95 transition-all"
          onClick={step < 3 ? handleNext : handleSubmit}
          loading={loading}
        >
          {step < 3 ? 'Continue' : 'Submit Application'}
          <ArrowRight size={18} strokeWidth={3} />
        </Button>
        <div className="mt-4 text-center">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">
            By submitting, you agree to our <button onClick={() => navigate('/vendor-privacy-policy')} className="text-[#00246b] dark:text-white border-b border-[#00246b]/30 dark:border-white/30">Partner Policy</button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VendorSignup;
