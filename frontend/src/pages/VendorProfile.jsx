import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
   ArrowLeft, Store, MapPin, Clock, Camera, Image as ImageIcon,
   Video, Save, Plus, X, UploadCloud, Info, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import Button from '../components/Button';
import SectionTitle from '../components/SectionTitle';
import toast from 'react-hot-toast';

const VendorProfile = () => {
   const navigate = useNavigate();
   const [loading, setLoading] = useState(false);
   const [data, setData] = useState({
      shopName: '',
      address: '',
      workingHours: { start: '09:00 AM', end: '09:00 PM' }
   });
   const [currentMedia, setCurrentMedia] = useState(null);

   // Form states for uploads
   const [galleryFiles, setGalleryFiles] = useState([]);
   const [videoFile, setVideoFile] = useState(null);

   useEffect(() => {
      const fetchProfile = async () => {
         try {
            const res = await api.get('/vendor/profile');
            setData({
               shopName: res.data.shopName,
               address: res.data.address,
               workingHours: res.data.workingHours || { start: '09:00 AM', end: '09:00 PM' }
            });
            setCurrentMedia(res.data);
         } catch (err) {
            toast.error('Failed to load profile');
         }
      };
      fetchProfile();
   }, []);

   const handleUpdateInfo = async (e) => {
      e.preventDefault();
      try {
         setLoading(true);
         await api.patch('/vendor/update-profile', data);
         toast.success('Basic info updated');
      } catch (err) {
         toast.error('Update failed');
      } finally {
         setLoading(false);
      }
   };

   const handleMediaUpload = async () => {
      try {
         setLoading(true);
         const formData = new FormData();

         galleryFiles.forEach(file => {
            formData.append('gallery', file);
         });
         if (videoFile) {
            formData.append('video', videoFile);
         }

         const res = await api.post('/vendor/upload-docs', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
         });

         setCurrentMedia(res.data);
         setGalleryFiles([]);
         setVideoFile(null);
         toast.success('Media gallery updated!');
      } catch (err) {
         toast.error('Upload failed. Check file sizes.');
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
         <header className="px-4 pt-5 pb-3 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 flex items-center gap-3 border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
            <button
               onClick={() => navigate(-1)}
               className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold"
            >
               <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Shop Profile Settings</h1>
         </header>

         <main className="px-4 mt-3.5 space-y-4 max-w-2xl mx-auto">
            {/* 📋 BASIC INFO SECTION */}
            <section className="bg-white dark:bg-gray-900 rounded-[2rem] p-5 shadow-sm border border-slate-200/60 dark:border-gray-800 space-y-5">
               <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                     <Store size={18} />
                  </div>
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Basic Info</h2>
               </div>

               <form onSubmit={handleUpdateInfo} className="space-y-4">
                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Shop Name</label>
                     <input
                        type="text"
                        value={data.shopName}
                        onChange={(e) => setData({ ...data, shopName: e.target.value })}
                        className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white shadow-sm dark:shadow-none transition-all focus:ring-2 focus:ring-primary/10"
                        placeholder="Enter shop name"
                     />
                  </div>

                  <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Business Address</label>
                     <textarea
                        value={data.address}
                        onChange={(e) => setData({ ...data, address: e.target.value })}
                        className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white shadow-sm dark:shadow-none transition-all focus:ring-2 focus:ring-primary/10 min-h-[80px]"
                        placeholder="Street, City, ZIP"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Open Time</label>
                        <input
                           type="text"
                           value={data.workingHours.start}
                           onChange={(e) => setData({ ...data, workingHours: { ...data.workingHours, start: e.target.value } })}
                           className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white shadow-sm dark:shadow-none transition-all focus:ring-2 focus:ring-primary/10"
                           placeholder="09:00 AM"
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Close Time</label>
                        <input
                           type="text"
                           value={data.workingHours.end}
                           onChange={(e) => setData({ ...data, workingHours: { ...data.workingHours, end: e.target.value } })}
                           className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-slate-200/60 dark:border-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white shadow-sm dark:shadow-none transition-all focus:ring-2 focus:ring-primary/10"
                           placeholder="09:00 PM"
                        />
                     </div>
                  </div>

                  <Button type="submit" loading={loading} className="w-full rounded-xl py-4 font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 transition-all active:scale-95">
                     Save Changes
                  </Button>
               </form>
            </section>

            {/* 🎬 MEDIA & GALLERY SECTION */}
            <section className="bg-white dark:bg-gray-900 rounded-[2rem] p-5 shadow-sm border border-slate-200/60 dark:border-gray-800 space-y-5">
               <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                     <Camera size={18} />
                  </div>
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Shop Media (Mockup Style)</h2>
               </div>

               {/* Current Gallery Preview */}
               <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Current Gallery</p>
                  <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                     {currentMedia?.galleryImages?.map((img, i) => (
                        <div key={i} className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-gray-800 shadow-sm relative group">
                           <img src={img} className="w-full h-full object-cover" />
                        </div>
                     ))}
                     {!currentMedia?.galleryImages?.length && (
                        <p className="text-[9px] italic text-gray-300 px-1 font-bold">No gallery images yet</p>
                     )}
                  </div>
               </div>

               {/* Video Preview */}
               <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase text-gray-400 ml-1 tracking-widest">Promotional Video</p>
                  {currentMedia?.shopVideo ? (
                     <div className="relative w-full h-28 bg-slate-50 dark:bg-gray-800/50 rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 dark:border-gray-800">
                        <Video className="text-gray-300" size={28} />
                        <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-sm"><CheckCircle2 size={10} /></div>
                        <p className="absolute bottom-2 left-3 text-[8px] font-black uppercase text-gray-400 opacity-60">Status: Active</p>
                     </div>
                  ) : (
                     <p className="text-[9px] italic text-gray-300 px-1 font-bold">No promotional video uploaded</p>
                  )}
               </div>

               {/* Upload Zone */}
               <div className="p-5 border-2 border-dashed border-slate-100 dark:border-gray-800 rounded-2xl space-y-4 bg-slate-50/30 dark:bg-transparent">
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <div>
                           <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">Add Images/Gallery</p>
                           <p className="text-[8px] text-gray-400 font-bold tracking-tighter uppercase mt-0.5">Recommended: 1:1 or 4:3 ratio</p>
                        </div>
                        <input
                           type="file"
                           id="gallery-input"
                           multiple
                           className="hidden"
                           onChange={(e) => setGalleryFiles([...galleryFiles, ...Array.from(e.target.files)])}
                        />
                        <label htmlFor="gallery-input" className="p-2.5 bg-white dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-white transition-all shadow-md border border-slate-200/60 dark:border-gray-800">
                           <Plus size={18} className="text-gray-400" />
                        </label>
                     </div>

                     {galleryFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                           {galleryFiles.map((f, i) => (
                              <div key={i} className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[8px] font-black uppercase flex items-center gap-1.5 border border-blue-500/20">
                                 {f.name.slice(0, 12)}
                                 <X size={10} className="cursor-pointer" onClick={() => setGalleryFiles(galleryFiles.filter((_, idx) => idx !== i))} />
                              </div>
                           ))}
                        </div>
                     )}

                     <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-gray-800">
                        <div>
                           <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-tight">Upload Promo Video</p>
                           <p className="text-[8px] text-gray-400 font-bold tracking-tighter uppercase mt-0.5">Format: MP4 (Max 30s / 50MB)</p>
                        </div>
                        <input
                           type="file"
                           id="video-input"
                           className="hidden"
                           onChange={(e) => setVideoFile(e.target.files[0])}
                        />
                        <label htmlFor="video-input" className="p-2.5 bg-white dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-white transition-all shadow-md border border-slate-200/60 dark:border-gray-800">
                           <Video size={18} className={videoFile ? "text-blue-500" : "text-gray-400"} />
                        </label>
                     </div>
                     {videoFile && (
                        <div className="px-3 py-1.5 bg-purple-500/10 text-purple-500 rounded-lg text-[8px] font-black uppercase flex items-center justify-between border border-purple-500/20">
                           <span>{videoFile.name}</span>
                           <X size={10} className="cursor-pointer" onClick={() => setVideoFile(null)} />
                        </div>
                     )}
                  </div>
               </div>

               <Button
                  onClick={handleMediaUpload}
                  loading={loading}
                  className="w-full rounded-xl py-4 font-black uppercase tracking-widest text-[10px] bg-slate-900 dark:bg-primary shadow-xl shadow-black/10 active:scale-95 transition-all"
               >
                  Upload & Sync Gallery
               </Button>
               <p className="text-[8px] text-center text-gray-400 font-black uppercase tracking-widest opacity-60">
                  Changes will reflect instantly on customer side discovery
               </p>
            </section>
         </main>
      </div>
   );
};

export default VendorProfile;
