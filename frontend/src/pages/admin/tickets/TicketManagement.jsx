import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Clock, Search, Filter } from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import Loader from '../../../components/Loader';

const TicketManagement = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState('all'); // all, open, resolved, closed
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tickets/admin');
      setTickets(res.data || []);
    } catch (err) {
      toast.error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      await api.patch(`/tickets/admin/${id}`, { status });
      toast.success(`Ticket marked as ${status} successfully`);
      // Update in local state
      setTickets(prev => prev.map(t => t._id === id ? { ...t, status } : t));
    } catch (err) {
      toast.error('Failed to update ticket status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesFilter = filter === 'all' || ticket.status === filter;
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'closed':
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
      default:
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }
  };

  if (loading) return <Loader text="Retrieving support tickets..." />;

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b-2 border-b-primary/20">
        <div className="space-y-1">
          <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tighter capitalize">Help Desk Tickets</h1>
          <p className="text-[12px] font-black text-slate-500 capitalize tracking-[0.2em] opacity-90">Respond to user queries and resolve issues</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by subject, description, name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-gray-800 border-none rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          {['all', 'open', 'resolved', 'closed'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black capitalize tracking-widest transition-all ${filter === tab
                ? 'bg-[#00246b] text-white shadow-lg shadow-[#00246b]/20'
                : 'bg-slate-50 dark:bg-gray-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {filteredTickets.length > 0 ? (
          filteredTickets.map(ticket => (
            <div
              key={ticket._id}
              className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5"
            >
              <div className="space-y-2.5 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${getStatusColor(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    ID: #{ticket._id.slice(-6).toUpperCase()}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white tracking-tight">{ticket.subject}</h3>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-300 leading-relaxed max-w-2xl">
                    {ticket.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-50 dark:border-gray-800/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                  <span className="text-slate-400 dark:text-slate-500">Raised by:</span>
                  <span>{ticket.userId?.name || 'Purged User'}</span>
                  <span>•</span>
                  <span>{ticket.userId?.email || ''}</span>
                  <span>•</span>
                  <span>{ticket.userId?.phone || ''}</span>
                  <span>•</span>
                  <span className="lowercase bg-blue-500/10 text-[#00246b] dark:text-blue-300 px-1.5 py-0.5 rounded text-[8px] tracking-normal">{ticket.userId?.role}</span>
                </div>
              </div>

              {ticket.status === 'open' && (
                <div className="flex gap-2 shrink-0 self-end md:self-center">
                  <button
                    disabled={updatingId === ticket._id}
                    onClick={() => handleUpdateStatus(ticket._id, 'resolved')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle2 size={12} /> Resolve
                  </button>
                  <button
                    disabled={updatingId === ticket._id}
                    onClick={() => handleUpdateStatus(ticket._id, 'closed')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    <XCircle size={12} /> Close
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-slate-200/60 dark:border-gray-800">
            <ShieldAlert className="text-slate-300 dark:text-gray-600 mx-auto mb-3" size={32} />
            <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">No support tickets found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketManagement;
