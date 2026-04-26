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
      <header className="px-4 pt-5 pb-3 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 flex items-center justify-between border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
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
        <button
          form="staff-form"
          disabled={loading}
          className="p-2.5 bg-primary text-white rounded-xl shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
        </button>
      </header>

      <main className="px-4 mt-3.5">
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
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="text-white" size={20} />
              </div>
            </div>
            <input id="image-upload" type="file" hidden onChange={handleImageChange} accept="image/*" />
          </section>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">Full Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full py-3 px-4 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-sm dark:shadow-none dark:text-white placeholder:text-gray-300"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">Phone Number</label>
                <div className="relative flex items-center bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 px-4 focus-within:ring-2 focus-within:ring-primary/10 transition-all shadow-sm">
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
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">Designation</label>
                <div className="relative">
                  <input
                    required
                    type="text"
                    placeholder="e.g. Senior Stylist"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full py-3 pl-11 pr-4 bg-white dark:bg-gray-900 rounded-xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-sm dark:shadow-none dark:text-white placeholder:text-gray-300"
                  />
                  <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </div>
          </div>

            {/* Skills/Services Multi-Select */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Skills</label>
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

          {isEdit && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Availability</label>
                <button
                  type="button"
                  onClick={saveAvailability}
                  disabled={availabilityLoading || savingAvailability}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.18em] transition-all ${availabilityLoading || savingAvailability ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-900 dark:bg-primary text-white shadow-lg shadow-slate-900/10 active:scale-[0.98]'}`}
                >
                  {savingAvailability ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>

              <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">Schedule Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={availabilityDate}
                      onChange={(e) => setAvailabilityDate(e.target.value)}
                      className="w-full py-3 pl-11 pr-4 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-sm dark:shadow-none dark:text-white"
                    />
                    <CalendarClock size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {availabilityLoading ? (
                  <div className="h-28 bg-slate-50 dark:bg-gray-800 rounded-xl animate-pulse" />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAvailability((prev) => ({ ...prev, useVendorHours: true, isOffDay: false }))}
                        className={`h-11 rounded-xl border text-[9px] font-black uppercase tracking-[0.16em] transition-all ${availability.useVendorHours ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 dark:border-gray-700 text-gray-500'}`}
                      >
                        Use Shop Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => setAvailability((prev) => ({ ...prev, useVendorHours: false, isOffDay: !prev.isOffDay }))}
                        className={`h-11 rounded-xl border text-[9px] font-black uppercase tracking-[0.16em] transition-all ${!availability.useVendorHours && availability.isOffDay ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-slate-50 dark:bg-gray-800 border-slate-200/60 dark:border-gray-700 text-gray-500'}`}
                      >
                        Mark Off Day
                      </button>
                    </div>

                    {!availability.useVendorHours && !availability.isOffDay && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">Start</label>
                            <input
                              type="time"
                              value={availability.startTime}
                              onChange={(e) => setAvailability((prev) => ({ ...prev, startTime: e.target.value }))}
                              className="w-full py-3 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-sm dark:shadow-none dark:text-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">End</label>
                            <input
                              type="time"
                              value={availability.endTime}
                              onChange={(e) => setAvailability((prev) => ({ ...prev, endTime: e.target.value }))}
                              className="w-full py-3 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-sm dark:shadow-none dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">Break Start</label>
                            <div className="relative">
                              <input
                                type="time"
                                value={availability.breakStart}
                                onChange={(e) => setAvailability((prev) => ({ ...prev, breakStart: e.target.value }))}
                                className="w-full py-3 pl-11 pr-4 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-sm dark:shadow-none dark:text-white"
                              />
                              <Coffee size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">Break End</label>
                            <input
                              type="time"
                              value={availability.breakEnd}
                              onChange={(e) => setAvailability((prev) => ({ ...prev, breakEnd: e.target.value }))}
                              className="w-full py-3 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-sm dark:shadow-none dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700">
                      <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">
                        Use shop hours for default timing, mark off day for leave, or set custom hours with one optional break.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}
        </form>
      </main>
    </div>
  );
};

export default StaffForm;
