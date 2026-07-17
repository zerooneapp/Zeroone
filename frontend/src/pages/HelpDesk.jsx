import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Phone, Send, Clock, CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Button from '../components/Button';
import Loader from '../components/Loader';

const HelpDesk = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [supportSettings, setSupportSettings] = useState({
    supportWhatsApp: '',
    supportPhone: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ticketsRes, settingsRes] = await Promise.all([
        api.get('/tickets/my'),
        api.get('/settings/shared')
      ]);
      setTickets(ticketsRes.data || []);
      setSupportSettings({
        supportWhatsApp: settingsRes.data?.supportWhatsApp || '',
        supportPhone: settingsRes.data?.supportPhone || ''
      });
    } catch (err) {
      toast.error('Failed to load support information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getWhatsAppLink = () => {
    const cleaned = supportSettings.supportWhatsApp.replace(/\D/g, '');
    return `https://wa.me/${cleaned.length === 10 ? '91' + cleaned : cleaned}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      return toast.error('Subject and description are required');
    }

    try {
      setSubmitting(true);
      const res = await api.post('/tickets', { subject, description });
      toast.success(res.data.message || 'Ticket raised successfully');
      setSubject('');
      setDescription('');
      // Refresh tickets list
      const ticketsRes = await api.get('/tickets/my');
      setTickets(ticketsRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

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

  if (loading) return <Loader text="Connecting to help desk..." />;

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
        <h1 className="font-extrabold text-[15px] text-gray-900 dark:text-white tracking-tight">
          Help Desk & Support
        </h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-5">
        {/* Contact Helpline Cards */}
        <div className={`grid gap-2 ${supportSettings.supportPhone && supportSettings.supportWhatsApp ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {supportSettings.supportPhone && (
            <a
              href={`tel:${supportSettings.supportPhone.replace(/\D/g, '')}`}
              className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm active:scale-95 transition-all"
            >
              <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-2">
                <Phone size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black text-[#00246b] dark:text-white uppercase tracking-tight">Call Support</span>
              <span className="text-[7px] font-bold text-slate-400 mt-1">{supportSettings.supportPhone}</span>
            </a>
          )}
          {supportSettings.supportWhatsApp && (
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm active:scale-95 transition-all"
            >
              <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-2">
                <MessageSquare size={16} strokeWidth={2.5} />
              </div>
              <span className="text-[10px] font-black text-[#00246b] dark:text-white uppercase tracking-tight">WhatsApp Us</span>
              <span className="text-[7px] font-bold text-slate-400 mt-1">{supportSettings.supportWhatsApp}</span>
            </a>
          )}
          <button
            onClick={() => navigate('/account/my-tickets')}
            className="bg-white dark:bg-gray-900 border border-[#00246b]/10 dark:border-gray-800 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center shadow-sm active:scale-95 transition-all"
          >
            <div className="w-9 h-9 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center mb-2">
              <Clock size={16} strokeWidth={2.5} />
            </div>
            <span className="text-[10px] font-black text-[#00246b] dark:text-white uppercase tracking-tight">Your Tickets</span>
            <span className="text-[7px] font-bold text-slate-400 mt-1">({tickets.length})</span>
          </button>
        </div>

        {/* Raise Ticket Form */}
        <section className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-[#00246b]/10 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-50 dark:border-gray-800 pb-2">
            <HelpCircle className="text-[#00246b] dark:text-primary" size={18} />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Raise Support Ticket</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-gray-800 border-none rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                placeholder="What is the issue about?"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-gray-800 border-none rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[90px]"
                placeholder="Describe your issue in detail..."
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#00246b] dark:bg-[#00246b] text-white rounded-full font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Ticket'}
              {!submitting && <Send size={12} />}
            </Button>
          </form>
        </section>

      </div>
    </div>
  );
};

export default HelpDesk;
