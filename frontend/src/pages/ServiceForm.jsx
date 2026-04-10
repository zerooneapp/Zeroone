import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Info, CheckCircle2, X, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

const normalizeServiceCategory = (value = '') =>
   value
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

const ServiceForm = () => {
   const navigate = useNavigate();
   const { id } = useParams();
   const isEdit = !!id;

   const [formData, setFormData] = useState({
      name: '',
      category: '',
      price: '',
      duration: 30,
      bufferTime: 0,
      description: '',
      type: 'shop'
   });
   const [images, setImages] = useState([null, null, null, null]);
   const [existingImages, setExistingImages] = useState([null, null, null, null]);
   const [previews, setPreviews] = useState([null, null, null, null]);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (isEdit) {
         const fetchService = async () => {
            try {
               const servicesRes = await api.get('/services/manage/all', { params: { includeInactive: true } });
               const service = servicesRes.data.find(s => s._id === id);
               if (service) {
                  setFormData({
                     name: service.name,
                     category: service.category || '',
                     price: service.price,
                     duration: service.duration,
                     bufferTime: service.bufferTime || 0,
                     description: service.description || '',
                     type: service.type || 'shop'
                  });
                  // Handling multi-images if they exist in legacy or new format
                  const existingImages = service.images || (service.image ? [service.image] : []);
                  const newPreviews = [null, null, null, null];
                  const newExistingImages = [null, null, null, null];
                  existingImages.slice(0, 4).forEach((img, idx) => {
                     newPreviews[idx] = img;
                     newExistingImages[idx] = img;
                  });
                  setPreviews(newPreviews);
                  setExistingImages(newExistingImages);
               }
            } catch (err) {
               toast.error('Failed to load service data');
            }
         };
         fetchService();
      }
   }, [id, isEdit]);

   const handleImageChange = (index, e) => {
      const file = e.target.files[0];
      if (file) {
         const newImages = [...images];
         newImages[index] = file;
         setImages(newImages);

         const newExistingImages = [...existingImages];
         newExistingImages[index] = null;
         setExistingImages(newExistingImages);

         const newPreviews = [...previews];
         newPreviews[index] = URL.createObjectURL(file);
         setPreviews(newPreviews);
      }
   };

   const removeImage = (index) => {
      const newImages = [...images];
      newImages[index] = null;
      setImages(newImages);

      const newExistingImages = [...existingImages];
      newExistingImages[index] = null;
      setExistingImages(newExistingImages);

      const newPreviews = [...previews];
      newPreviews[index] = null;
      setPreviews(newPreviews);
   };

   const handleSubmit = async (e) => {
      e.preventDefault();

      if (!previews[0]) {
         return toast.error('Main service image is required');
      }

      const data = new FormData();
      Object.keys(formData).forEach(key => data.append(key, formData[key]));

      // Append multi-images
      images.forEach((img, idx) => {
         if (img) data.append('images', img);
      });
      data.append('retainedImages', JSON.stringify(existingImages.filter(Boolean)));

      try {
         setLoading(true);
         if (isEdit) {
            await api.patch(`/services/${id}`, data);
            toast.success('Service updated successfully');
         } else {
            await api.post('/services', data);
            toast.success('Service added successfully');
         }
         navigate('/vendor/services');
      } catch (err) {
         toast.error(err.response?.data?.message || 'Failed to save service');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-background-light dark:bg-gray-950 pb-32">
         <header className="px-4 pt-5 pb-3 sticky top-0 bg-background-light/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 flex items-center justify-between border-b border-slate-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
               <button
                  onClick={() => navigate(-1)}
                  className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold"
               >
                  <ArrowLeft size={18} className="text-gray-900 dark:text-white" />
               </button>
               <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                  {isEdit ? 'Edit Service' : 'Add Service'}
               </h1>
            </div>
            <button
               form="service-form"
               disabled={loading}
               className="p-2.5 bg-slate-900 dark:bg-primary text-white rounded-xl shadow-lg shadow-black/10 active:scale-95 transition-all disabled:opacity-50 font-bold border border-white/10"
            >
               {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
            </button>
         </header>

         <main className="px-4 mt-6">
            <form id="service-form" onSubmit={handleSubmit} className="space-y-6 pb-12 max-w-2xl mx-auto">
               {/* Elite 4-Image Grid Upload */}
               <section className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Service Gallery (Max 4)</label>
                     <span className="text-[8px] font-black text-primary uppercase italic tracking-tighter opacity-70">Main Image First</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                     {previews.map((prev, idx) => (
                        <div
                           key={idx}
                           className={`relative aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-all group ${prev ? 'border-primary/20 bg-primary/5' : 'border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/50'
                              }`}
                        >
                           {prev ? (
                              <>
                                 <img src={prev} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
                                 <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                    <X size={12} strokeWidth={3} />
                                 </button>
                              </>
                           ) : (
                              <div
                                 onClick={() => document.getElementById(`img-upload-${idx}`).click()}
                                 className="flex flex-col items-center gap-1.5 text-slate-300 dark:text-gray-700 cursor-pointer w-full h-full justify-center active:scale-95 transition-transform"
                              >
                                 <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-slate-100 dark:border-gray-700">
                                    <Upload size={18} className="text-gray-400 group-hover:text-primary transition-colors" />
                                 </div>
                                 <span className="text-[7px] font-black uppercase tracking-widest opacity-60 mt-1">Add Photo</span>
                              </div>
                           )}
                           <input
                              id={`img-upload-${idx}`}
                              type="file"
                              hidden
                              accept="image/*"
                              onChange={(e) => handleImageChange(idx, e)}
                           />
                        </div>
                     ))}
                  </div>
               </section>

               <div className="space-y-4">
                  {/* Category Field */}
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Service Category</label>
                     <input
                        required
                        type="text"
                        placeholder="e.g. Haircut, Hair Color, Facial"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        onBlur={(e) => setFormData({ ...formData, category: normalizeServiceCategory(e.target.value) })}
                        className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white shadow-sm dark:shadow-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                     />
                  </div>
                  <div className="space-y-2">
                     <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Service Availability</label>
                        <span className="text-[8px] text-gray-400 font-black uppercase italic tracking-tighter opacity-70">
                           shop / home
                        </span>
                     </div>
                     <div className="grid grid-cols-3 gap-2">
                        {[
                           { value: 'shop', label: 'Shop Only' },
                           { value: 'home', label: 'Home Only' },
                           { value: 'both', label: 'Shop + Home' }
                        ].map((option) => (
                           <button
                              key={option.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, type: option.value })}
                              className={`px-3 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${
                                 formData.type === option.value
                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                    : 'bg-white dark:bg-gray-900 text-gray-400 border-slate-100 dark:border-gray-800 shadow-sm'
                              }`}
                           >
                              {option.label}
                           </button>
                        ))}
                     </div>
                  </div>
                  {/* Name */}
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Service Name</label>
                     <input
                        required
                        type="text"
                        placeholder="e.g. Premium Haircut"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white shadow-sm dark:shadow-none focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-slate-300"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     {/* Price */}
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Price (₹)</label>
                        <input
                           required
                           type="number"
                           placeholder="500"
                           value={formData.price}
                           onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                           className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white shadow-sm dark:shadow-none transition-all"
                        />
                     </div>
                     {/* Duration */}
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Duration (Min)</label>
                        <div className="relative">
                           <select
                              value={formData.duration}
                              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                              className="w-full py-3 px-4 pr-10 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white shadow-sm dark:shadow-none appearance-none focus:ring-2 focus:ring-primary/10"
                           >
                              {Array.from({ length: 16 }, (_, i) => (i + 1) * 15).map(m => (
                                 <option key={m} value={m} className="font-bold">{m} Min</option>
                              ))}
                           </select>
                           <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                              <Clock size={16} />
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* Buffer Time */}
                  <div className="space-y-2">
                     <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Buffer Time (Min)</label>
                        <span className="text-[8px] text-gray-400 font-black uppercase italic tracking-tighter flex items-center gap-1 opacity-70">
                           <Info size={10} /> cooldown between bookings
                        </span>
                     </div>
                     <div className="flex gap-2 lg:gap-3 overflow-x-auto no-scrollbar py-1">
                        {[0, 5, 10, 15, 30].map(m => (
                           <button
                              key={m}
                              type="button"
                              onClick={() => setFormData({ ...formData, bufferTime: m })}
                              className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap min-w-[64px] border ${formData.bufferTime === m
                                 ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105'
                                 : 'bg-white dark:bg-gray-900 text-gray-400 border-slate-100 dark:border-gray-800 shadow-sm'
                                 }`}
                           >
                              {m === 0 ? 'None' : `${m}m`}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-1">Description (Optional)</label>
                     <textarea
                        rows="3"
                        placeholder="Describe your premium service..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full py-3 px-4 bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white shadow-sm dark:shadow-none focus:ring-2 focus:ring-primary/10 transition-all resize-none placeholder:text-slate-300"
                     />
                  </div>
               </div>

               <div className="p-3.5 bg-blue-500/5 dark:bg-blue-900/10 rounded-xl border border-blue-500/10 dark:border-blue-900/30 flex items-start gap-2.5">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg shrink-0">
                     <Info className="text-blue-500" size={14} />
                  </div>
                  <p className="text-[8px] font-black text-blue-600/80 dark:text-blue-400/80 leading-relaxed uppercase tracking-widest">
                     As soon as you save, this service is visible. Ensure accuracy to avoid conflict.
                  </p>
               </div>
            </form>
         </main>
      </div>
   );
};

export default ServiceForm;
