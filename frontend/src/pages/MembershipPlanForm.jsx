import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Info, Crown, IndianRupee, Calendar, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const MembershipPlanForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    durationDays: '',
    services: [], // Array of { serviceId, usageLimit }
  });
  const [availableServices, setAvailableServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Check global status
        const settingsRes = await api.get('/settings/shared');
        if (settingsRes.data?.features?.membershipActive === false) {
          toast.error('Membership system is currently disabled');
          navigate('/vendor/dashboard');
          return;
        }

        const servicesRes = await api.get('/services/manage/all', { params: { includeInactive: false } });
        setAvailableServices(servicesRes.data);

        if (isEdit) {
          const planRes = await api.get(`/memberships/vendor/plans/${id}`);
          const plan = planRes.data;
          setFormData({
            name: plan.name,
            description: plan.description || '',
            price: (plan.price || 0).toString(),
            durationDays: (plan.durationDays || 0).toString(),
            services: plan.services.map(s => ({
              serviceId: typeof s.serviceId === 'object' ? s._id : s.serviceId,
              usageLimit: (s.usageLimit || 1).toString()
            })),
          });
        }
      } catch (err) {
        toast.error('Failed to load data');
      }
    };
    init();
  }, [id, isEdit, navigate]);

  const handleNumberChange = (field, value, serviceId = null) => {
    let val = value.replace(/\D/g, '');
    if (val.length > 1 && val.startsWith('0')) {
      val = val.replace(/^0+/, '');
    }

    if (serviceId) {
      setFormData(prev => ({
        ...prev,
        services: prev.services.map(s => 
          s.serviceId === serviceId ? { ...s, usageLimit: val } : s
        )
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: val }));
    }
  };

  const toggleService = (serviceId) => {
    setFormData(prev => {
      const exists = prev.services.find(s => s.serviceId === serviceId);
      if (exists) {
        return { ...prev, services: prev.services.filter(s => s.serviceId !== serviceId) };
      } else {
        return { ...prev, services: [...prev.services, { serviceId, usageLimit: '1' }] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Convert to numbers for submission
    const submitData = {
      ...formData,
      price: Number(formData.price) || 0,
      durationDays: Number(formData.durationDays) || 0,
      services: formData.services.map(s => ({
        ...s,
        usageLimit: Number(s.usageLimit) || 1
      }))
    };

    if (submitData.price < 0) return toast.error('Price cannot be negative');
    if (submitData.durationDays <= 0) return toast.error('Duration must be at least 1 day');
    if (submitData.services.length === 0) return toast.error('Please select at least one service');

    // Validate that all services have a valid limit
    const invalidService = submitData.services.find(s => !s.usageLimit || s.usageLimit < 1);
    if (invalidService) {
      const serviceName = availableServices.find(as => as._id === invalidService.serviceId)?.name || 'a service';
      return toast.error(`Please set a valid limit (min 1) for ${serviceName}`);
    }

    try {
      setLoading(true);
      if (isEdit) {
        await api.patch(`/memberships/vendor/plans/${id}`, submitData);
        toast.success('Membership plan updated');
      } else {
        await api.post('/memberships/vendor/plans', submitData);
        toast.success('Membership plan created');
      }
      navigate('/vendor/memberships');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = availableServices.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
    const isSelected = formData.services.some(sel => sel.serviceId === s._id);
    if (showSelectedOnly) return matchesSearch && isSelected;
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
        <header className="fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto z-50 px-5 pt-[38px] pb-3 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => navigate(-1)}
               className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-100 dark:border-gray-800 active:scale-90 transition-all"
             >
                <ArrowLeft size={16} />
             </button>
             <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight">
                {isEdit ? 'Edit Plan' : 'Create Plan'}
              </h1>
          </div>
          <button 
            form="membership-form"
            disabled={loading}
            className="p-2 bg-[#1C2C4E] text-white rounded-xl shadow-lg shadow-[#1C2C4E]/20 active:scale-95 transition-all disabled:opacity-50"
          >
             {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          </button>
       </header>

       <main className="px-5 pt-[104px]">
          <form id="membership-form" onSubmit={handleSubmit} className="space-y-4 pb-8">
             <div className="space-y-4">
                {/* Name */}
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Plan Name</label>
                   <input 
                     required
                     type="text" 
                     placeholder="e.g. Gold Membership"
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                     className="w-full p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 font-bold focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                   />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Description</label>
                   <textarea 
                     rows="3"
                     placeholder="Explain what's included in this plan..."
                     value={formData.description}
                     onChange={(e) => setFormData({...formData, description: e.target.value})}
                     className="w-full p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 font-bold focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                   />
                </div>

                 <div className="grid grid-cols-2 gap-3">
                    {/* Price */}
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Plan Price</label>
                       <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">₹</span>
                          <input 
                            required
                            type="text" 
                            inputMode="numeric"
                            placeholder="500"
                            value={formData.price}
                            onChange={(e) => handleNumberChange('price', e.target.value)}
                            className="w-full pl-6 p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 font-bold text-sm"
                          />
                       </div>
                    </div>
                    {/* Duration */}
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Duration (Days)</label>
                        <div className="relative">
                           <input 
                             required
                             type="text" 
                             inputMode="numeric"
                             placeholder="30"
                             value={formData.durationDays}
                             onChange={(e) => {
                               const val = e.target.value.replace(/\D/g, '');
                               if (val.length <= 3) {
                                 handleNumberChange('durationDays', e.target.value);
                               }
                             }}
                             className="w-full p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 font-bold text-sm"
                           />
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-gray-400 uppercase">Days</span>
                        </div>
                     </div>
                 </div>

                {/* Scope Selection */}
                <div className="space-y-3">
                   <div className="flex items-center justify-between px-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Services & Limits</label>
                      <button 
                        type="button"
                        onClick={() => navigate('/vendor/services/add')}
                        className="text-[9px] font-black text-primary uppercase flex items-center gap-1"
                      >
                         + Create New Service
                      </button>
                   </div>

                   {/* Search and Filters */}
                   <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                         <input 
                            type="text"
                            placeholder="Search services..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-[10px] font-bold"
                         />
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowSelectedOnly(!showSelectedOnly)}
                        className={`px-3 py-2 rounded-xl text-[9px] font-black border transition-all ${
                          showSelectedOnly 
                            ? 'bg-amber-500 border-amber-500 text-white' 
                            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400'
                        }`}
                      >
                         {showSelectedOnly ? 'Showing Selected' : 'Show Selected'}
                      </button>
                   </div>

                   <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredServices.length > 0 ? (
                        filteredServices.map((service) => {
                          const selection = formData.services.find(s => s.serviceId === service._id);
                          const isSelected = !!selection;
                          
                          return (
                            <div 
                              key={service._id}
                              className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                                isSelected 
                                  ? 'bg-amber-500/5 border-amber-500/20' 
                                  : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <button 
                                  type="button"
                                  onClick={() => toggleService(service._id)}
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                    isSelected 
                                      ? 'bg-amber-500 border-amber-500 text-white' 
                                      : 'border-gray-300 dark:border-gray-700'
                                  }`}
                                >
                                  {isSelected && <Crown size={12} />}
                                </button>
                                <div className="flex flex-col">
                                  <span className={`text-xs font-black ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                    {service.name}
                                  </span>
                                  <span className="text-[8px] font-bold text-gray-400 uppercase">₹{service.price}</span>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <label className="text-[8px] font-black text-gray-400 uppercase">Count:</label>
                                  <input 
                                    type="text"
                                    inputMode="numeric"
                                    value={selection.usageLimit}
                                    onChange={(e) => handleNumberChange('usageLimit', e.target.value, service._id)}
                                    className="w-12 p-1.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-[10px] font-black text-center"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-8 text-center">
                           <p className="text-[10px] font-bold text-gray-400 uppercase">No services found</p>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             <div className="flex flex-col gap-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950/10 rounded-xl border border-amber-100 dark:border-amber-900/10 flex items-start gap-2.5">
                   <Crown className="text-amber-500 mt-0.5" size={14} />
                   <p className="text-[9px] font-bold text-amber-600/70 leading-relaxed uppercase">
                      Customers will be limited to the specified usage counts for each service. If a service limit is reached, they will need to pay the standard price.
                   </p>
                </div>
             </div>
          </form>
       </main>
    </div>
  );
};

export default MembershipPlanForm;
