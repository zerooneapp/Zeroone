import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, Clock, Ticket } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Loader from '../components/Loader';

const MyTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const res = await api.get('/tickets/my');
        setTickets(res.data || []);
      } catch (err) {
        toast.error('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return (
          <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle2 size={10} /> Resolved
          </span>
        );
      case 'closed':
        return (
          <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-slate-500 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">
            <AlertCircle size={10} /> Closed
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
            <Clock size={10} /> Open
          </span>
        );
    }
  };

  if (loading) return <Loader text="Loading your tickets..." />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 pb-24 animate-in fade-in duration-300">
      {/* Header */}
      <header className="px-4 pt-[46px] pb-3 flex items-center gap-3 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl z-50 border-b border-slate-100 dark:border-gray-800 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="p-2 bg-slate-50 dark:bg-gray-900 rounded-xl border border-slate-100 dark:border-gray-800 active:scale-95 transition-all"
        >
          <ArrowLeft size={16} className="text-gray-900 dark:text-white" strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="font-extrabold text-[15px] text-gray-900 dark:text-white tracking-tight leading-none">
            My Tickets
          </h1>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} raised</p>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-3">
        {tickets.length > 0 ? (
          tickets.map(ticket => (
            <div
              key={ticket._id}
              className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 p-4 rounded-2xl shadow-sm space-y-2.5"
            >
              <div className="flex justify-between items-start gap-3">
                <h3 className="text-xs font-black text-slate-800 dark:text-white leading-tight">{ticket.subject}</h3>
                {getStatusBadge(ticket.status)}
              </div>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 leading-normal">
                {ticket.description}
              </p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                Raised on {new Date(ticket.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-[#00246b]/10 dark:border-gray-800 mt-4">
            <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Ticket size={24} className="text-rose-400" />
            </div>
            <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest">No tickets raised yet</p>
            <p className="text-[9px] font-bold text-slate-300 dark:text-gray-600 mt-1">Go back and raise a support ticket</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;
