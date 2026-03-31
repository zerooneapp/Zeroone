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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-32">
      <header className="px-6 pt-8 pb-4 sticky top-0 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl z-50 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2.5 bg-gray-100 dark:bg-gray-900 rounded-xl">
           <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black dark:text-white">Shop Profile Settings</h1>
      </header>

      <main className="px-6 mt-6 space-y-8 max-w-2xl mx-auto">
        {/* 📋 BASIC INFO SECTION */}
        <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
           <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                 <Store size={20} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-tight dark:text-white">Basic Info</h2>
           </div>

           <form onSubmit={handleUpdateInfo} className="space-y-4">
              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Shop Name</label>
                 <input 
                  type="text" 
                  value={data.shopName}
                  onChange={(e) => setData({...data, shopName: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-bold dark:text-white"
                  placeholder="Enter shop name"
                 />
              </div>

              <div className="space-y-1.5">
                 <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Business Address</label>
                 <textarea 
                  value={data.address}
                  onChange={(e) => setData({...data, address: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-bold dark:text-white min-h-[100px]"
                  placeholder="Street, City, ZIP"
                 />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Open Time</label>
                    <input 
                      type="text" 
                      value={data.workingHours.start}
                      onChange={(e) => setData({...data, workingHours: {...data.workingHours, start: e.target.value}})}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-bold dark:text-white"
                      placeholder="09:00 AM"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Close Time</label>
                    <input 
                      type="text" 
                      value={data.workingHours.end}
                      onChange={(e) => setData({...data, workingHours: {...data.workingHours, end: e.target.value}})}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm font-bold dark:text-white"
                      placeholder="09:00 PM"
                    />
                 </div>
              </div>

              <Button type="submit" loading={loading} className="w-full rounded-2xl py-6 font-black uppercase tracking-widest text-xs">
                 Save Changes
              </Button>
           </form>
        </section>

        {/* 🎬 MEDIA & GALLERY SECTION */}
        <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
           <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                 <Camera size={20} />
              </div>
              <h2 className="text-sm font-black uppercase tracking-tight dark:text-white">Shop Media (Mockup Style)</h2>
           </div>

           {/* Current Gallery Preview */}
           <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-gray-400 ml-1">Current Gallery</p>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                 {currentMedia?.galleryImages?.map((img, i) => (
                    <div key={i} className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-gray-100 shadow-sm relative group">
                       <img src={img} className="w-full h-full object-cover" />
                    </div>
                 ))}
                 {!currentMedia?.galleryImages?.length && (
                    <p className="text-[10px] italic text-gray-300">No gallery images yet</p>
                 )}
              </div>
           </div>

           {/* Video Preview */}
           <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-gray-400 ml-1">Promotional Video</p>
              {currentMedia?.shopVideo ? (
                 <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden flex items-center justify-center">
                    <Video className="text-gray-400" size={32} />
                    <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full"><CheckCircle2 size={12} /></div>
                    <p className="absolute bottom-2 left-3 text-[9px] font-black uppercase text-gray-400">Video Uploaded</p>
                 </div>
              ) : (
                 <p className="text-[10px] italic text-gray-300">No promotional video uploaded</p>
              )}
           </div>

           {/* Upload Zone */}
           <div className="p-6 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-3xl space-y-4">
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black dark:text-white">Add Images/Gallery</p>
                      <p className="text-[10px] text-gray-400 font-bold">Recommended: 1:1 or 4:3 ratio</p>
                    </div>
                    <input 
                      type="file" 
                      id="gallery-input" 
                      multiple 
                      className="hidden" 
                      onChange={(e) => setGalleryFiles([...galleryFiles, ...Array.from(e.target.files)])} 
                    />
                    <label htmlFor="gallery-input" className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl cursor-pointer hover:bg-white transition-all shadow-sm">
                       <Plus size={20} className="text-gray-400" />
                    </label>
                 </div>
                 
                 {galleryFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                       {galleryFiles.map((f, i) => (
                          <div key={i} className="px-3 py-1.5 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-bold flex items-center gap-2">
                             {f.name.slice(0, 10)}...
                             <X size={12} className="cursor-pointer" onClick={() => setGalleryFiles(galleryFiles.filter((_, idx) => idx !== i))} />
                          </div>
                       ))}
                    </div>
                 )}

                 <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
                    <div>
                      <p className="text-xs font-black dark:text-white">Upload Promo Video</p>
                      <p className="text-[10px] text-gray-400 font-bold">Format: MP4 (Max 30s / 50MB)</p>
                    </div>
                    <input 
                      type="file" 
                      id="video-input" 
                      className="hidden" 
                      onChange={(e) => setVideoFile(e.target.files[0])} 
                    />
                    <label htmlFor="video-input" className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl cursor-pointer hover:bg-white transition-all shadow-sm">
                       <Video size={20} className={videoFile ? "text-blue-500" : "text-gray-400"} />
                    </label>
                 </div>
                 {videoFile && (
                    <div className="px-3 py-1.5 bg-purple-500/10 text-purple-500 rounded-full text-[10px] font-bold flex items-center justify-between">
                       <span>{videoFile.name}</span>
                       <X size={12} className="cursor-pointer" onClick={() => setVideoFile(null)} />
                    </div>
                 )}
              </div>
           </div>

           <Button 
            onClick={handleMediaUpload} 
            loading={loading}
            className="w-full rounded-2xl py-6 font-black uppercase tracking-widest text-xs bg-gray-900"
           >
              Upload & Sync Gallery
           </Button>
           <p className="text-[9px] text-center text-gray-400 font-bold uppercase tracking-tight">
              Changes will reflect instantly on customer side discovery
           </p>
        </section>
      </main>
    </div>
  );
};

export default VendorProfile;
