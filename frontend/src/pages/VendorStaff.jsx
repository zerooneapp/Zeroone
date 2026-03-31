import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import StaffCard from '../components/StaffCard';
import toast from 'react-hot-toast';

const VendorStaff = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggleLoadingId, setToggleLoadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [vendorData, setVendorData] = useState(null);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const [staffRes, dashRes] = await Promise.all([
        api.get('/staff/manage/all', { params: { includeInactive: true } }),
        api.get('/vendor/dashboard')
      ]);
      setStaff(staffRes.data);
      setVendorData(dashRes.data);
    } catch (err) {
      toast.error('Failed to load roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleToggle = async (id, isActive) => {
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to update staff.');
    }
    if (toggleLoadingId === id) return;

    // 🚀 OPTIMISTIC UI
    const original = [...staff];
    setStaff(prev => prev.map(s => s._id === id ? { ...s, isActive } : s));

    try {
      setToggleLoadingId(id);
      await api.patch(`/staff/${id}`, { isActive });
      toast.success(isActive ? 'Staff is back online' : 'Staff marked inactive');
    } catch (err) {
      setStaff(original);
      toast.error('Failed to update status');
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleEdit = (member) => {
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to edit staff.');
    }
    navigate(`/vendor/staff/edit/${member._id}`);
  };

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="p-6 space-y-6 animate-pulse">
       <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
       <div className="grid gap-4 mt-8">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem]" />)}
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32">
       <header className="px-6 pt-8 pb-6 sticky top-0 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 flex items-center justify-between border-b border-gray-100 dark:border-gray-800/50">
          <div className="flex items-center gap-4">
             <button 
               onClick={() => navigate('/vendor/dashboard')}
               className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 active:scale-90 transition-all"
             >
                <ArrowLeft size={18} />
             </button>
             <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Team Roster</h1>
          </div>
        <button 
          onClick={() => {
            if (!vendorData?.subscription?.isActive) return toast.error('Account inactive. Recharge to onboard staff.');
            navigate('/vendor/staff/add');
          }}
          className={`p-3 rounded-2xl shadow-lg transition-all ${
            !vendorData?.subscription?.isActive 
            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50 cursor-not-allowed' 
            : 'bg-primary text-white shadow-primary/20 active:scale-95'
          }`}
        >
           <Plus size={20} />
        </button>
       </header>

       <main className="px-6 mt-6">
          <div className="mb-6 relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Search staff by name..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="w-full bg-white dark:bg-gray-900 p-4 pl-12 rounded-[2rem] border border-gray-100 dark:border-gray-800 font-bold focus:ring-2 focus:ring-primary/20"
             />
          </div>

          <AnimatePresence mode="wait">
             {staff.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="py-20 text-center space-y-6"
                >
                   <div className="w-24 h-24 bg-primary/5 rounded-[3.5rem] flex items-center justify-center mx-auto text-primary/30">
                      <Users size={40} />
                   </div>
                   <div className="space-y-2">
                      <h2 className="text-xl font-black text-gray-900 dark:text-white">No staff added yet 👨‍🔧</h2>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Add your team members to start accepting bookings via their skills.</p>
                   </div>
                   <button 
                     onClick={() => navigate('/vendor/staff/add')}
                     className="px-8 py-4 bg-primary text-white font-black uppercase text-xs tracking-[0.2em] rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                   >
                      Onboard Staff
                   </button>
                </motion.div>
             ) : (
                <div className="grid gap-4">
                   {filteredStaff.map((member) => (
                      <StaffCard 
                        key={member._id} 
                        staff={member} 
                        onToggle={handleToggle}
                        onEdit={handleEdit}
                      />
                   ))}
                </div>
             )}
          </AnimatePresence>
       </main>
    </div>
  );
};

export default VendorStaff;
