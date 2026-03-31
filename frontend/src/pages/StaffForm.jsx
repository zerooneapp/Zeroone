import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Info, Scissors, User, Phone, CheckCircle2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const StaffForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    services: [], // Array of IDs
  });
  const [availableServices, setAvailableServices] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // 🚀 FILTER FIX: Only active services should be assignable to new staff
        const servicesRes = await api.get('/services/manage/all', { params: { includeInactive: false } });
        setAvailableServices(servicesRes.data);

        if (isEdit) {
          const staffRes = await api.get(`/staff/${id}`);
          const staff = staffRes.data;
          setFormData({
            name: staff.name,
            phone: staff.phone,
            services: staff.services.map(s => s._id),
          });
          setPreview(staff.image);
        }
      } catch (err) {
        toast.error('Failed to load data');
      }
    };
    init();
  }, [id, isEdit]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const toggleService = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(s => s !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🛡️ VALIDATION: Indian Phone Number Regex
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(formData.phone)) {
      return toast.error('Enter a valid 10-digit Indian phone number 🇮🇳');
    }
    
    if (formData.services.length === 0) {
      return toast.error('Please select at least one skill/service ✂️');
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('phone', formData.phone);
    data.append('services', JSON.stringify(formData.services));
    if (image) data.append('image', image);

    try {
      setLoading(true);
      if (isEdit) {
        await api.patch(`/staff/${id}`, data);
        toast.success('Staff profile updated');
      } else {
        await api.post('/staff', data);
        toast.success('Staff onboarded successfully');
      }
      navigate('/vendor/staff');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save staff');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
       <header className="px-6 pt-8 pb-6 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => navigate(-1)}
               className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 active:scale-90 transition-all"
             >
                <ArrowLeft size={18} />
             </button>
             <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {isEdit ? 'Edit Profile' : 'Add Staff'}
             </h1>
          </div>
          <button 
            form="staff-form"
            disabled={loading}
            className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
          >
             {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
          </button>
       </header>

       <main className="px-6 mt-8">
          <form id="staff-form" onSubmit={handleSubmit} className="space-y-8 pb-12">
             {/* Profile Image */}
             <section className="space-y-4 text-center">
                <div 
                  onClick={() => document.getElementById('image-upload').click()}
                  className="w-32 h-32 mx-auto rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-900 relative group cursor-pointer"
                >
                   {preview ? (
                      <img src={preview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                   ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                         <User size={32} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Add Photo</span>
                      </div>
                   )}
                   <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload className="text-white" size={24} />
                   </div>
                </div>
                <input id="image-upload" type="file" hidden onChange={handleImageChange} accept="image/*" />
             </section>

             <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                      <input 
                        required
                        type="text" 
                        placeholder="e.g. Rahul Sharma"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Phone Number</label>
                      <div className="relative">
                         <input 
                           required
                           type="tel" 
                           placeholder="9876543210"
                           value={formData.phone}
                           onChange={(e) => setFormData({...formData, phone: e.target.value})}
                           className="w-full p-4 pl-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 font-bold"
                         />
                         <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                   </div>
                </div>

                {/* Skills/Services Multi-Select */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Skills</label>
                      <span className="text-[10px] text-gray-400 font-bold italic flex items-center gap-1">
                         <Scissors size={10} /> select all that apply
                      </span>
                   </div>
                   <div className="flex flex-wrap gap-2">
                      {availableServices.map((service) => (
                         <button 
                           key={service._id} 
                           type="button"
                           onClick={() => toggleService(service._id)}
                           className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                             formData.services.includes(service._id) 
                             ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                             : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400'
                           }`}
                         >
                            {service.name}
                         </button>
                      ))}
                      {availableServices.length === 0 && (
                        <p className="text-xs text-amber-500 font-bold italic">No active services found. Create services first! ✂️</p>
                      )}
                   </div>
                </div>
             </div>

             <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                <Info className="text-amber-500 mt-0.5" size={18} />
                <p className="text-[10px] font-bold text-amber-600/70 leading-relaxed uppercase">
                   Note: Only staff handles who are assigned to a service will be visible to customers during the booking process.
                </p>
             </div>
          </form>
       </main>
    </div>
  );
};

export default StaffForm;
