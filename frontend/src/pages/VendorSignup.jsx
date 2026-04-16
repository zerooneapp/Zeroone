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
    serviceLevel: 'standard', // standard, premium, luxury
    serviceMode: 'shop',
    address: '',
    location: { coordinates: [75.8577, 22.7196] }, // Default Indore
  });

  // Media State
  const [panCardFile, setPanCardFile] = useState(null);
  const [gstCertificateFile, setGstCertificateFile] = useState(null);
  const [shopRegistrationFile, setShopRegistrationFile] = useState(null);
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState(null);
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
    if (step === 1 && (!formData.shopName || !formData.category || !formData.serviceMode)) {
      return toast.error('Please fill business details');
    }
    if (step === 2 && (!panCardFile || !aadhaarFrontFile || !aadhaarBackFile)) {
      return toast.error('Please upload all identity documents');
    }
    setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!formData.address) return toast.error('Please enter shop address');

    setLoading(true);
    try {
      const authRes = await api.post('/auth/register', {
        phone,
        name: formData.shopName,
        role: 'vendor',
        forceUpdate: true
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
      if (shopImage && formData.serviceMode === 'shop') mediaData.append('shopImage', shopImage);
      if (vendorPhoto) mediaData.append('vendorPhoto', vendorPhoto);
      if (panCardFile) mediaData.append('panCard', panCardFile);
      if (gstCertificateFile) mediaData.append('gstCertificate', gstCertificateFile);
      if (shopRegistrationFile) mediaData.append('shopRegistration', shopRegistrationFile);
      if (aadhaarFrontFile) mediaData.append('aadhaarFront', aadhaarFrontFile);
      if (aadhaarBackFile) mediaData.append('aadhaarBack', aadhaarBackFile);

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
    { id: 'standard', title: 'STANDARD', desc: 'Visible in search results', icon: Zap },
    { id: 'premium', title: 'PREMIUM', desc: 'Priority in categories', icon: Star },
    { id: 'luxury', title: 'LUXURY', desc: 'Top slots & Video Promos', icon: Crown }
  ];

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-gray-900 dark:text-white px-3 py-6 pb-32 transition-colors duration-500 overflow-x-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-5%] right-[-10%] w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pt-2 relative z-10 px-1">
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

      <div className="space-y-4">
        {step === 1 && (
          <div className="space-y-4 relative z-10">
            <div className="space-y-1">
              <h2 className="text-2xl font-black leading-tight">Business Basics</h2>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px]">Tell us about your brand</p>
            </div>

            <div className="space-y-3">
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
                <div className="flex items-center gap-1 text-[7px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full">
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
                      ? 'bg-primary/5 dark:bg-primary/10 border-primary shadow-sm'
                      : 'bg-white dark:bg-gray-900 border-gray-50 dark:border-gray-800 opacity-80'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${formData.serviceLevel === lvl.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}>
                      <lvl.icon size={16} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-black text-xs uppercase tracking-tight leading-none">{lvl.title}</h4>
                      <p className="text-[8px] font-bold text-gray-400 leading-none mt-1">{lvl.desc}</p>
                    </div>
                    {formData.serviceLevel === lvl.id && (
                      <CheckCircle2 className="text-primary absolute right-3 top-1/2 -translate-y-1/2" size={16} />
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
                <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">PAN Card</p>
                <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {panCardFile ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                        <img src={URL.createObjectURL(panCardFile)} alt="PAN" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <FileText className="text-gray-300" size={18} />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{panCardFile ? panCardFile.name : 'ADD PAN CARD'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {panCardFile && <CheckCircle2 className="text-green-500" size={16} />}
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setPanCardFile(e.target.files[0])} accept="image/*" />
                </label>
              </div>

              <div className="space-y-1.5">
                <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">GST Certificate</p>
                <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {gstCertificateFile ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                        <img src={URL.createObjectURL(gstCertificateFile)} alt="GST" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <FileText className="text-gray-300" size={18} />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{gstCertificateFile ? gstCertificateFile.name : 'ADD GST CERTIFICATE'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {gstCertificateFile && <CheckCircle2 className="text-green-500" size={16} />}
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setGstCertificateFile(e.target.files[0])} accept="image/*" />
                </label>
              </div>

              <div className="space-y-1.5">
                <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Shop Registration</p>
                <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {shopRegistrationFile ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                        <img src={URL.createObjectURL(shopRegistrationFile)} alt="Registration" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <FileText className="text-gray-300" size={18} />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{shopRegistrationFile ? shopRegistrationFile.name : 'ADD SHOP REGISTRY'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {shopRegistrationFile && <CheckCircle2 className="text-green-500" size={16} />}
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setShopRegistrationFile(e.target.files[0])} accept="image/*" />
                </label>
              </div>

              <div className="space-y-1.5">
                <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Aadhaar Card (Front Side)</p>
                <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {aadhaarFrontFile ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                        <img src={URL.createObjectURL(aadhaarFrontFile)} alt="Front" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="text-gray-300" size={18} />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{aadhaarFrontFile ? aadhaarFrontFile.name : 'ADD AADHAAR FRONT'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {aadhaarFrontFile && <CheckCircle2 className="text-green-500" size={16} />}
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setAadhaarFrontFile(e.target.files[0])} accept="image/*" />
                </label>
              </div>

              <div className="space-y-1.5">
                <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Aadhaar Card (Back Side)</p>
                <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 overflow-hidden">
                    {aadhaarBackFile ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                        <img src={URL.createObjectURL(aadhaarBackFile)} alt="Back" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                        <ShieldCheck className="text-gray-300" size={18} />
                      </div>
                    )}
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{aadhaarBackFile ? aadhaarBackFile.name : 'ADD AADHAAR BACK'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {aadhaarBackFile && <CheckCircle2 className="text-green-500" size={16} />}
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                  <input type="file" className="hidden" onChange={(e) => setAadhaarBackFile(e.target.files[0])} accept="image/*" />
                </label>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-2">
              <Info className="text-amber-500 mt-0.5 shrink-0" size={14} />
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

                <div className="flex items-center gap-2 px-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  <p className="text-[7px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                    GPS Locked: <span className="text-emerald-500">{formData.location.coordinates[0].toFixed(4)}, {formData.location.coordinates[1].toFixed(4)}</span>
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {formData.serviceMode === 'shop' && (
                <div className="space-y-1.5">
                  <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Shop Façade Image</p>
                  <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {shopImage ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                          <img src={URL.createObjectURL(shopImage)} alt="Shop" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <Camera className="text-gray-300" size={18} />
                        </div>
                      )}
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{shopImage ? 'SHOP IMAGE READY' : 'ADD FRONT PHOTO'}</p>
                    </div>
                    <ArrowRight size={14} className="text-gray-300" />
                    <input type="file" className="hidden" onChange={(e) => setShopImage(e.target.files[0])} accept="image/*" />
                  </label>
                </div>
                )}

                <div className="space-y-1.5">
                  <p className="px-1 text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Vendor Profile Photo</p>
                  <label className="h-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 cursor-pointer transition-all shadow-sm overflow-hidden">
                    <div className="flex items-center gap-3 overflow-hidden">
                      {vendorPhoto ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 shrink-0">
                          <img src={URL.createObjectURL(vendorPhoto)} alt="Owner" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <Upload className="text-gray-300" size={18} />
                        </div>
                      )}
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{vendorPhoto ? 'PHOTO READY' : 'ADD OWNER PHOTO'}</p>
                    </div>
                    <ArrowRight size={14} className="text-gray-300" />
                    <input type="file" className="hidden" onChange={(e) => setVendorPhoto(e.target.files[0])} accept="image/*" />
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
          className="w-full h-12 rounded-xl shadow-lg shadow-primary/10 gap-2 text-sm font-black uppercase tracking-widest text-white bg-primary active:scale-95 transition-all"
          onClick={step < 3 ? handleNext : handleSubmit}
          loading={loading}
        >
          {step < 3 ? 'Continue' : 'Submit Application'}
          <ArrowRight size={18} strokeWidth={3} />
        </Button>
      </div>
    </div>
  );
};

export default VendorSignup;
