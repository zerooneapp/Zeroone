import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import StaffCard from '../components/StaffCard';
import StaffClosureModal from '../components/StaffClosureModal';
import { useVendorStore } from '../store/vendorStore';
import toast from 'react-hot-toast';

const VendorStaff = () => {
  const navigate = useNavigate();
  const {
    staffData: staff,
    staffLoading: loading,
    dashboardData: vendorData,
    fetchStaff,
    fetchDashboard,
    setStaffData: setStaff
  } = useVendorStore();

  const [toggleLoadingId, setToggleLoadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [hasRedirectedHomeVendor, setHasRedirectedHomeVendor] = useState(false);
  const [closureModal, setClosureModal] = useState({ isOpen: false, staff: null });
  const [deleteConfirmStaff, setDeleteConfirmStaff] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleHomeServiceGuard = () => {
    if (hasRedirectedHomeVendor) return;
    setHasRedirectedHomeVendor(true);
    toast('Only for shop partners', { icon: '🔒' });
    navigate('/vendor/dashboard', { replace: true });
  };

  const handleFetch = async (force = false) => {
    try {
      await fetchStaff(force);
      if (force) {
        await fetchDashboard(force);
      } else if (!vendorData) {
        await fetchDashboard();
      }
      
      // Secondary check for home service mode if vendorData is already available
      if (vendorData && vendorData.serviceMode === 'home') {
        handleHomeServiceGuard();
      }
    } catch (err) {
      toast.error('Failed to load roster');
    }
  };

  useEffect(() => {
    handleFetch();
  }, []);

  const handleToggle = async (id, requestedActive) => {
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to update staff.', { id: 'account-inactive', duration: 2000 });
    }

    if (toggleLoadingId === id) return;

    const member = staff.find(s => s._id === id);
    
    // 🛡️ LOGIC CHANGE: If toggling OFF, we don't deactivate them globally yet.
    // Instead, we open the closure modal to record a temporary absence.
    // This keeps them isActive=true so they automatically return after the closure.
    if (!requestedActive) {
      setClosureModal({ isOpen: true, staff: member });
      return;
    }

    // If toggling ON, we actually update the status and end any closures
    const original = [...staff];
    setStaff(prev => prev.map(s => s._id === id ? { ...s, isActive: true } : s));

    try {
      setToggleLoadingId(id);
      await api.patch(`/staff/${id}`, { isActive: true });
      toast.success(`${member?.name} is back online`);
      handleFetch('silent'); // Refresh to clear any closure status
    } catch (err) {
      setStaff(original);
      toast.error('Failed to update status');
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleEdit = (member) => {
    if (!vendorData?.subscription?.isActive) {
      return toast.error('Account inactive. Recharge to edit staff.', { id: 'account-inactive', duration: 2000 });
    }
    navigate(`/vendor/staff/edit/${member._id}`);
  };

  const handleDeleteSubmit = async () => {
    if (!deleteConfirmStaff) return;
    try {
      setIsDeleting(true);
      toast.loading('Deleting staff member...', { id: 'delete-staff' });
      await api.delete(`/staff/${deleteConfirmStaff._id}`);
      toast.success(`${deleteConfirmStaff.name} deleted successfully`, { id: 'delete-staff' });
      setStaff(prev => prev.filter(s => s._id !== deleteConfirmStaff._id));
      setDeleteConfirmStaff(null);
      handleFetch('silent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete staff member', { id: 'delete-staff' });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredStaff = useMemo(() => staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  ), [staff, search]);

  if (loading) return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark p-6 space-y-6 pt-[64px] animate-pulse">
      <div className="h-10 w-48 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      <div className="grid gap-4 mt-8">
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-[2.5rem]" />)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-32 w-full max-w-full overflow-x-hidden">
      <header className="px-4 pt-[48px] pb-3 fixed top-0 left-0 right-0 max-w-4xl w-full mx-auto bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-xl z-50 flex items-center justify-between border-b border-slate-100 dark:border-gray-800/60 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/vendor/dashboard')}
            className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-md border border-slate-200/60 dark:border-gray-800 active:scale-90 transition-all font-bold"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <h1 className="text-xl font-black tracking-tighter leading-none flex items-center">
                <span className="text-primary dark:text-white">Zero</span>
                <span className="text-primary/30 dark:text-white">One</span>
              </h1>
            </div>
            <p className="text-[9px] font-black text-slate-400 dark:text-white/60 uppercase tracking-[0.2em] opacity-80 leading-none">Team Roster</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (!vendorData?.subscription?.isActive) return toast.error('Account inactive. Recharge to onboard staff.', { id: 'account-inactive', duration: 2000 });
            navigate('/vendor/staff/add');
          }}
          className={`p-2.5 rounded-xl shadow-xl transition-all ${!vendorData?.subscription?.isActive
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50 cursor-not-allowed'
              : 'bg-[#00246b] text-white shadow-[#00246b]/20 active:scale-95'
            }`}
        >
          <Plus size={20} />
        </button>
      </header>
 
      <main className="px-4 pt-[102px]">
        <div className="mt-3 mb-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search staff by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value.trimStart())}
            className="w-full bg-white dark:bg-gray-900 py-3 pl-11 pr-4 rounded-2xl border border-slate-200/60 dark:border-gray-800 font-bold text-sm focus:ring-2 focus:ring-primary/10 transition-all shadow-md dark:shadow-none dark:text-white"
          />
        </div>
 
        <AnimatePresence mode="wait">
          {staff.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center"
            >
              <div className="w-20 h-20 bg-[#00246b]/5 rounded-[2.5rem] flex items-center justify-center mx-auto text-[#00246b]/30 border border-[#00246b]/10">
                <Users size={36} />
              </div>
              <div className="mt-5 space-y-1">
                <h2 className="text-lg font-black text-gray-900 dark:text-white">No staff added yet 👨‍🔧</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed max-w-[250px] mx-auto">Add your team members to start accepting bookings via their skills.</p>
              </div>
              <button
                onClick={() => navigate('/vendor/staff/add')}
                className="mt-6 px-7 py-3.5 bg-[#00246b] text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl shadow-[#00246b]/20 active:scale-95 transition-all"
              >
                Onboard Staff
              </button>
            </motion.div>
          ) : (
            <div className="grid gap-1.5 w-full min-w-0 overflow-hidden px-0.5">
              {filteredStaff.map((member) => (
                <StaffCard
                  key={member._id}
                  staff={member}
                  onToggle={handleToggle}
                  onEdit={handleEdit}
                  onCardClick={() => navigate(`/vendor/staff/${member._id}`)}
                  onDelete={(staff) => {
                    if (!vendorData?.subscription?.isActive) {
                      return toast.error('Account inactive. Recharge to delete staff.', { id: 'account-inactive', duration: 2000 });
                    }
                    setDeleteConfirmStaff(staff);
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </main>

      {closureModal.isOpen && (
        <StaffClosureModal 
          isOpen={closureModal.isOpen}
          staff={closureModal.staff}
          onClose={() => setClosureModal({ isOpen: false, staff: null })}
          onCreated={() => {
            handleFetch('silent');
          }}
        />
      )}

      <AnimatePresence>
        {deleteConfirmStaff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2rem] border border-slate-100 dark:border-gray-800 p-6 w-full max-w-sm shadow-2xl relative overflow-hidden"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-[1.5rem] flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/30">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 animate-pulse">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">Delete Roster Staff</h3>
                  <p className="text-[11px] font-bold text-slate-400 dark:text-gray-400 uppercase tracking-widest">Permanent Action</p>
                </div>

                <p className="text-xs text-slate-500 dark:text-gray-300 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-extrabold text-slate-800 dark:text-white">{deleteConfirmStaff.name}</span>? This will wipe their login profile and reassign all their upcoming bookings to you.
                </p>

                <div className="pt-4 flex gap-3">
                  <button
                    disabled={isDeleting}
                    onClick={() => setDeleteConfirmStaff(null)}
                    className="flex-1 py-3 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700/80 text-slate-500 dark:text-gray-300 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isDeleting}
                    onClick={handleDeleteSubmit}
                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VendorStaff;
