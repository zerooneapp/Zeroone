import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Shield, ShieldOff, Trash2, Search, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';
import { cn } from '../../../utils/cn';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  password: ''
};

const AdminManagement = () => {
  const { user } = useAuthStore();
  const [admins, setAdmins] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: 'all' });
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState('');

  const fetchAdmins = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const res = await api.get('/admin/admins', { params: filters });
      setAdmins(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load admin accounts');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, [filters.search, filters.status]);

  const counts = useMemo(() => ({
    total: admins.length,
    active: admins.filter((admin) => !admin.isBlocked).length,
    blocked: admins.filter((admin) => admin.isBlocked).length
  }), [admins]);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || form.phone.trim().length !== 10 || form.password.length < 8) {
      return toast.error('Name, 10-digit phone, and 8+ character password are required');
    }

    try {
      setSubmitting(true);
      const res = await api.post('/admin/admins', {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        password: form.password
      });
      setAdmins((prev) => [res.data, ...prev]);
      setForm(emptyForm);
      toast.success('Admin account created');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBlock = async (admin) => {
    try {
      setActionId(admin._id);
      const res = await api.patch(`/admin/admins/${admin._id}/block`);
      setAdmins((prev) => prev.map((item) => (item._id === admin._id ? res.data.admin : item)));
      toast.success(res.data.message || `Admin ${admin.isBlocked ? 'unblocked' : 'blocked'}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update admin status');
    } finally {
      setActionId('');
    }
  };

  const handleDeleteAdmin = async (admin) => {
    const confirmed = window.confirm(`Delete admin access for ${admin.name || admin.phone}?`);
    if (!confirmed) return;

    try {
      setActionId(admin._id);
      await api.delete(`/admin/admins/${admin._id}`);
      setAdmins((prev) => prev.filter((item) => item._id !== admin._id));
      toast.success('Admin account deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete admin');
    } finally {
      setActionId('');
    }
  };

  if (user?.role !== 'super_admin') {
    return (
      <div className="rounded-3xl border border-slate-200/60 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Super Admin Access Required</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Admin Access</h1>
          <p className="mt-2 text-[12px] font-black uppercase tracking-[0.18em] text-slate-400">
            Create, block, and remove platform admins
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full md:w-auto">
          {[
            { label: 'Total', value: counts.total },
            { label: 'Active', value: counts.active },
            { label: 'Blocked', value: counts.blocked }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200/60 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1.4fr] gap-6">
        <section className="rounded-3xl border border-slate-200/60 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <UserCog size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">Create Admin</h2>
              <p className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
                New admins will get all admin powers except admin creation
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateAdmin} className="mt-6 space-y-4">
            <input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Admin name"
              className="w-full rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              placeholder="Phone number"
              className="w-full rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none"
            />
            <input
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email (optional)"
              className="w-full rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none"
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="Strong password"
              className="w-full rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-slate-900 dark:bg-primary px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-white shadow-xl shadow-slate-900/10 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                <Plus size={16} />
                {submitting ? 'Creating...' : 'Create Admin'}
              </span>
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200/60 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search by name, phone, or email"
                className="w-full rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 rounded-3xl bg-slate-100 dark:bg-gray-800 animate-pulse" />
              ))
            ) : admins.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 dark:border-gray-800 px-6 py-12 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">No admin accounts found</p>
              </div>
            ) : (
              admins.map((admin) => {
                const isSelf = admin._id === user?._id;
                const isSuper = admin.role === 'super_admin';
                return (
                  <div
                    key={admin._id}
                    className="rounded-3xl border border-slate-200/60 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-950 px-5 py-4 shadow-sm"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base font-black text-slate-900 dark:text-white">{admin.name || 'Unnamed Admin'}</p>
                          <span className={cn(
                            'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em]',
                            isSuper
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                              : 'bg-primary/10 text-primary dark:text-white'
                          )}>
                            {isSuper ? 'Super Admin' : 'Admin'}
                          </span>
                          {isSelf && (
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
                              You
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">
                          <span>{admin.phone}</span>
                          <span>{admin.email || 'No email added'}</span>
                          <span>{admin.isBlocked ? 'Blocked' : 'Active'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isSuper && (
                          <button
                            onClick={() => handleToggleBlock(admin)}
                            disabled={actionId === admin._id}
                            className={cn(
                              'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] transition-all active:scale-[0.98]',
                              admin.isBlocked
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                            )}
                          >
                            {admin.isBlocked ? <Shield size={14} /> : <ShieldOff size={14} />}
                            {admin.isBlocked ? 'Unblock' : 'Block'}
                          </button>
                        )}
                        {!isSelf && !isSuper && (
                          <button
                            onClick={() => handleDeleteAdmin(admin)}
                            disabled={actionId === admin._id}
                            className="inline-flex items-center gap-2 rounded-2xl bg-red-500/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-red-600 dark:text-red-300 transition-all active:scale-[0.98]"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminManagement;
