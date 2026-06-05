import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Info, Scissors, User, Phone, CalendarClock, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const StaffForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    designation: '',
    services: [], // Array of IDs
  });
  const [availableServices, setAvailableServices] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availabilityDate, setAvailabilityDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availability, setAvailability] = useState({
    useVendorHours: true,
    isOffDay: false,
    startTime: '',
    endTime: '',
    breakStart: '',
    breakEnd: ''
  });

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
            designation: staff.designation || '',
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

  useEffect(() => {
    if (!isEdit || !id || !availabilityDate) return;

    const fetchAvailability = async () => {
      try {
        setAvailabilityLoading(true);
        const res = await api.get(`/staff/${id}/availability`, { params: { date: availabilityDate } });
        setAvailability({
          useVendorHours: Boolean(res.data?.useVendorHours),
          isOffDay: Boolean(res.data?.isOffDay),
          startTime: res.data?.startTime || '',
          endTime: res.data?.endTime || '',
          breakStart: res.data?.breakStart || '',
          breakEnd: res.data?.breakEnd || ''
        });
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load staff schedule');
      } finally {
        setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
  }, [availabilityDate, id, isEdit]);

  useEffect(() => {
    const guardHomeServicePartner = async () => {
      try {
        const vendorRes = await api.get('/vendor/profile');
        if ((vendorRes.data?.serviceMode || 'shop') === 'home') {
          toast('Only for shop partners', { icon: '🔒' });
          navigate('/vendor/dashboard', { replace: true });
        }
      } catch (err) {
        // Keep existing page flow unchanged if profile lookup fails.
      }
    };

    guardHomeServicePartner();
  }, [navigate]);

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

    if (!isEdit && !image) {
      return toast.error('Staff photo is required to create a profile 📸');
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('phone', formData.phone);
    data.append('designation', formData.designation);
    data.append('services', JSON.stringify(formData.services));
    if (image) data.append('image', image);

    try {
      setLoading(true);
      if (isEdit) {
        await api.patch(`/staff/${id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Staff profile updated');
      } else {
        await api.post('/staff', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Staff onboarded successfully');
      }
      navigate('/vendor/staff');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save staff');
    } finally {
      setLoading(false);
    }
  };

  const saveAvailability = async () => {
    if (!isEdit) return;

    if (!availability.useVendorHours && !availability.isOffDay) {
      if (!availability.startTime || !availability.endTime) {
        return toast.error('Select working start and end time');
      }

      if (availability.breakStart && availability.breakEnd && availability.breakStart >= availability.breakEnd) {
        return toast.error('Break end must be after break start');
      }
    }

    try {
      setSavingAvailability(true);
      await api.put(`/staff/${id}/availability`, {
        date: availabilityDate,
        useVendorHours: availability.useVendorHours,
        isOffDay: availability.isOffDay,
        startTime: availability.startTime,
        endTime: availability.endTime,
        breakStart: availability.breakStart,
        breakEnd: availability.breakEnd
      });
      toast.success('Staff schedule updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update staff schedule');
    } finally {
      setSavingAvailability(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
      <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 px-4 pt-[48px] pb-3 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl border-b border-slate-100 dark:border-gray-800/60 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
            {isEdit ? 'Edit Profile' : 'Add Staff'}
          </h1>
        </div>

      </header>

      <main className="px-4 pt-[118px]">
        <form id="staff-form" onSubmit={handleSubmit} className="space-y-6 pb-12">
          {/* Profile Image */}
          <section className="text-center">
            <div
              onClick={() => document.getElementById('image-upload').click()}
              className="w-28 h-28 mx-auto rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-800 flex items-center justify-center overflow-hidden bg-white dark:bg-gray-900 relative group cursor-pointer shadow-md dark:shadow-none"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-400">
                  <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center">
                    <Upload size={20} className="text-slate-400" />
                  </div>
                  <span className="text-[7.5px] font-black uppercase tracking-widest leading-none mt-1">Add Photo</span>
                </div>
              )}
            </div>
            <input id="image-upload" type="file" hidden onChange={handleImageChange} accept="image/*" />
          </section>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-light text-slate-400 uppercase tracking-widest px-0.5">Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
                    setFormData({ ...formData, name: filteredValue });
                  }}
                  className="w-full py-3 px-4 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-sm dark:shadow-none dark:text-white placeholder:text-gray-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-light text-slate-400 uppercase tracking-widest px-0.5">Phone Number</label>
                <div className={`relative flex items-center bg-white dark:bg-gray-900 rounded-xl border px-4 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm ${formData.phone.length > 0 ? 'border-[#00246b] dark:border-[#00246b]' : 'border-slate-200/60 dark:border-gray-800'}`}>
                  <Phone size={14} className="text-gray-400 mr-2" />
                  <span className="text-sm font-bold text-gray-400 border-r border-slate-100 dark:border-gray-800 pr-2 mr-2">+91</span>
                  <input
                    required
                    type="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if ((val.startsWith('91') || val.startsWith('0')) && val.length > 10) {
                        val = val.slice(-10);
                      }
                      setFormData({ ...formData, phone: val.slice(0, 10) });
                    }}
                    maxLength={10}
                    className="flex-1 py-3 bg-transparent border-none font-bold text-sm outline-none dark:text-white placeholder:text-gray-300"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-light text-slate-400 uppercase tracking-widest px-0.5">Designation</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    placeholder="e.g. Senior Stylist"
                    value={formData.designation}
                    onChange={(e) => {
                      const value = e.target.value;
                      const filteredValue = value.replace(/[^a-zA-Z\s]/g, '');
                      setFormData({ ...formData, designation: filteredValue });
                    }}
                    className="w-full py-3 pl-11 pr-4 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-sm dark:shadow-none dark:text-white placeholder:text-gray-300"
                  />
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </div>
          </div>

            {/* Skills/Services Multi-Select */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-[10px] font-light text-slate-400 uppercase tracking-widest">Assigned Skills</label>
                <span className="text-[9px] text-gray-400 font-bold italic flex items-center gap-1">
                  <Scissors size={8} /> select all that apply
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableServices.map((service) => (
                  <button
                    key={service._id}
                    type="button"
                    onClick={() => toggleService(service._id)}
                    className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all border ${formData.services.includes(service._id)
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-white dark:bg-gray-900 border-slate-200/60 dark:border-gray-800 text-gray-400 shadow-sm'
                      }`}
                  >
                    {service.name}
                  </button>
                ))}
                {availableServices.length === 0 && (
                  <p className="text-[10px] text-amber-500 font-bold italic px-1">No active services found. Create services first! ✂️</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-3 bg-amber-50/50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20 flex items-start gap-2.5 shadow-sm">
            <Info className="text-amber-500 mt-0.5 shrink-0" size={14} />
            <p className="text-[9px] font-black text-amber-600/70 leading-relaxed uppercase tracking-tighter">
              Note: Only staff who are assigned to a service will be visible to customers during the booking process.
            </p>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#00246b] text-white rounded-2xl shadow-xl shadow-[#00246b]/20 active:scale-95 transition-all disabled:opacity-50 font-black text-[12px] uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} strokeWidth={3} />
                  {isEdit ? 'Update Profile' : 'Add Staff'}
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default StaffForm;
