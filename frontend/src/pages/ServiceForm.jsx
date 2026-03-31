import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Info, CheckCircle2, X, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';
import toast from 'react-hot-toast';

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
   });
   const [images, setImages] = useState([null, null, null, null]);
   const [previews, setPreviews] = useState([null, null, null, null]);
   const [loading, setLoading] = useState(false);

   useEffect(() => {
      if (isEdit) {
         const fetchService = async () => {
            try {
               const servicesRes = await api.get('/services', { params: { includeInactive: true } });
               const service = servicesRes.data.find(s => s._id === id);
               if (service) {
                  setFormData({
                     name: service.name,
                     category: service.category || '',
                     price: service.price,
                     duration: service.duration,
                     bufferTime: service.bufferTime || 0,
                     description: service.description || '',
                  });
                  // Handling multi-images if they exist in legacy or new format
                  const existingImages = service.images || (service.image ? [service.image] : []);
                  const newPreviews = [null, null, null, null];
                  existingImages.slice(0, 4).forEach((img, idx) => {
                     newPreviews[idx] = img;
                  });
                  setPreviews(newPreviews);
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

         const newPreviews = [...previews];
         newPreviews[index] = URL.createObjectURL(file);
         setPreviews(newPreviews);
      }
   };

   const removeImage = (index) => {
      const newImages = [...images];
      newImages[index] = null;
      setImages(newImages);

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
                  {isEdit ? 'Edit Service' : 'Add Service'}
               </h1>
            </div>
            <button
               form="service-form"
               disabled={loading}
               className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
            >
               {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={20} />}
            </button>
         </header>

         <main className="px-6 mt-8">
            <form id="service-form" onSubmit={handleSubmit} className="space-y-8 pb-12">
               {/* Elite 4-Image Grid Upload */}
               <section className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Gallery (Max 4)</label>
                     <span className="text-[9px] font-bold text-gray-300 uppercase italic">Main Image First</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     {previews.map((prev, idx) => (
                        <div
                           key={idx}
                           className={`relative aspect-square rounded-[2rem] border-2 border-dashed flex items-center justify-center overflow-hidden transition-all group ${prev ? 'border-primary/20 bg-primary/5' : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950'
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
                                    <X size={14} strokeWidth={3} />
                                 </button>
                              </>
                           ) : (
                              <div
                                 onClick={() => document.getElementById(`img-upload-${idx}`).click()}
                                 className="flex flex-col items-center gap-2 text-gray-300 dark:text-gray-700 cursor-pointer w-full h-full justify-center"
                              >
                                 <Upload size={24} />
                                 <span className="text-[8px] font-black uppercase tracking-tighter">Add Photo</span>
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

               <div className="space-y-6">
                  {/* Category Field */}
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Service Category</label>
                     <input
                        required
                        type="text"
                        placeholder="e.g. Haircut, Hair Color, Facial"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                     />
                  </div>
                  {/* Name */}
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Service Name</label>
                     <input
                        required
                        type="text"
                        placeholder="e.g. Premium Haircut"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     {/* Price */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Price (₹)</label>
                        <input
                           required
                           type="number"
                           placeholder="500"
                           value={formData.price}
                           onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                           className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 font-bold"
                        />
                     </div>
                     {/* Duration */}
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Duration (Min)</label>
                        <div className="relative">
                           <select
                              value={formData.duration}
                              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                              className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 font-bold appearance-none"
                           >
                              {Array.from({ length: 16 }, (_, i) => (i + 1) * 15).map(m => (
                                 <option key={m} value={m}>{m} Min</option>
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
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Buffer Time (Min)</label>
                        <span className="text-[10px] text-gray-400 font-bold italic flex items-center gap-1">
                           <Info size={10} /> cooldown between bookings
                        </span>
                     </div>
                     <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                        {[0, 5, 10, 15, 30].map(m => (
                           <button
                              key={m}
                              type="button"
                              onClick={() => setFormData({ ...formData, bufferTime: m })}
                              className={`px-5 py-3 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap min-w-[70px] ${formData.bufferTime === m
                                 ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                                 : 'bg-white dark:bg-gray-900 text-gray-400 border border-gray-100 dark:border-gray-800'
                                 }`}
                           >
                              {m === 0 ? 'None' : `${m}m`}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Description (Optional)</label>
                     <textarea
                        rows="4"
                        placeholder="Describe your premium service..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 font-bold resize-none"
                     />
                  </div>
               </div>

               <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                  <Info className="text-blue-500 mt-0.5" size={18} />
                  <p className="text-[10px] font-bold text-blue-600/70 leading-relaxed uppercase">
                     Your service will be visible to customers as soon as you save. Ensure price and duration are accurate to avoid booking conflicts.
                  </p>
               </div>
            </form>
         </main>
      </div>
   );
};

export default ServiceForm;
