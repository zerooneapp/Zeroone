import React, { useState, useEffect } from 'react';
import {
    ArrowUpRight, ArrowDownLeft, Search, Filter,
    Calendar, Printer, IndianRupee, Download,
    Wallet, RefreshCw, Layers, CreditCard,
    CheckCircle2, Clock, AlertCircle, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';
import { format } from 'date-fns';

const TransactionManagement = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        transactions: [],
        summary: {
            totalInflow: 0,
            totalOutflow: 0,
            pendingPayouts: 0
        }
    });
    const [filters, setFilters] = useState({
        search: '',
        type: 'all', // all, credit, debit
        status: 'all'
    });

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            // In a real app: const res = await api.get('/admin/transactions', { params: filters });
            // Mocking for now to show the "Elite HUD" design
            const mockData = {
                summary: {
                    totalInflow: 452800,
                    totalOutflow: 124500,
                    pendingPayouts: 28400
                },
                transactions: [
                    { id: 'TX-8821', entity: 'Gaurav Kumar', type: 'credit', category: 'Wallet Topup', amount: 5000, method: 'UPI', date: new Date(), status: 'completed' },
                    { id: 'TX-8822', entity: 'Elite Car Spa', type: 'debit', category: 'Vendor Payout', amount: 12500, method: 'Bank Transfer', date: new Date(), status: 'pending' },
                    { id: 'TX-8823', entity: 'Rahul Sharma', type: 'credit', category: 'Booking Payment', amount: 1200, method: 'Card', date: new Date(), status: 'completed' },
                    { id: 'TX-8845', entity: 'Zenith Services', type: 'debit', category: 'Vendor Payout', amount: 8400, method: 'Bank Transfer', date: new Date(), status: 'failed' },
                    { id: 'TX-8846', entity: 'Priya Verma', type: 'credit', category: 'Wallet Topup', amount: 2000, method: 'UPI', date: new Date(), status: 'completed' },
                ]
            };
            setData(mockData);
        } catch (err) {
            toast.error('Capital ledger synchronization failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const filteredTransactions = data.transactions.filter(tx => {
        const matchesSearch = tx.entity.toLowerCase().includes(filters.search.toLowerCase()) ||
            tx.id.toLowerCase().includes(filters.search.toLowerCase());
        const matchesType = filters.type === 'all' || tx.type === filters.type;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-5 pb-20 animate-in fade-in duration-500">

            {/* ⚙️ FINANCIAL COMMAND HEADER */}
            <div className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b-2 border-b-emerald-500/20">
                <div className="space-y-1">
                    <h1 className="text-[24px] font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Capital Ledger</h1>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-60">Global Financial Movement & Settlement Hub</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="h-10 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-2 group">
                        <Download size={14} strokeWidth={3} className="group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Inflow Report</span>
                    </button>
                    <button className="h-10 px-4 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 italic">
                        <Printer size={14} strokeWidth={3} />
                        Export Ledger
                    </button>
                </div>
            </div>

            {/* 📊 SUMMARY HUD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <SummaryCard
                    label="Total Capital Inflow"
                    value={data.summary.totalInflow}
                    icon={ArrowUpRight}
                    color="emerald"
                    sub="Net platform revenue collection"
                />
                <SummaryCard
                    label="Merchant Settlements"
                    value={data.summary.totalOutflow}
                    icon={ArrowDownLeft}
                    color="rose"
                    sub="Processed vendor disbursements"
                />
                <SummaryCard
                    label="Pending Payouts"
                    value={data.summary.pendingPayouts}
                    icon={Clock}
                    color="amber"
                    sub="Awaiting bank synchronization"
                />
            </div>

            {/* 🛡️ TRANSACTION FILTER HUD */}
            <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600" size={16} strokeWidth={3} />
                    <input
                        type="text"
                        placeholder="SEARCH TXID OR ENTITY..."
                        className="w-full pl-11 pr-4 h-11 bg-slate-50 dark:bg-gray-800 border-none rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 ring-primary/20 outline-none dark:text-white transition-all placeholder:text-slate-300 italic"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    {['all', 'credit', 'debit'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilters({ ...filters, type })}
                            className={cn(
                                "flex-1 h-11 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border shadow-sm",
                                filters.type === type
                                    ? "bg-slate-900 text-white border-slate-900 italic scale-[1.02]"
                                    : "bg-white dark:bg-gray-800 text-slate-400 border-slate-100 dark:border-gray-700 hover:bg-slate-50"
                            )}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* 📁 LEDGER MATRIX */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-800">
                                <th className="px-5 py-4 text-left text-[8.5px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] opacity-80">Reference ID</th>
                                <th className="px-5 py-4 text-left text-[8.5px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] opacity-80">Counterparty Entity</th>
                                <th className="px-5 py-4 text-left text-[8.5px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] opacity-80">Classification</th>
                                <th className="px-5 py-4 text-left text-[8.5px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] opacity-80 text-right">Capital Amount</th>
                                <th className="px-5 py-4 text-left text-[8.5px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] opacity-80 text-center">Settlement</th>
                                <th className="px-5 py-4 text-left text-[8.5px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.2em] opacity-80 text-right">Synchronization</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-gray-800/40">
                            <AnimatePresence mode="popLayout">
                                {filteredTransactions.map((tx, idx) => (
                                    <motion.tr
                                        key={tx.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="group hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-all cursor-default"
                                    >
                                        <td className="px-5 py-4 leading-none">
                                            <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">#{tx.id}</span>
                                            <div className="flex items-center gap-1 mt-1 opacity-40">
                                                <Layers size={8} />
                                                <span className="text-[7.5px] font-bold text-slate-400 uppercase">Block Hash Trace</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    {tx.entity.split(' ').map(n => n[0]).join('')}
                                                </div>
                                                <div className="leading-tight">
                                                    <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">{tx.entity}</p>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase opacity-60">Verified Identity</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-2 h-2 rounded-full",
                                                    tx.type === 'credit' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                                                )} />
                                                <span className="text-[9px] font-black text-slate-600 dark:text-gray-400 uppercase tracking-widest italic">{tx.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="leading-none">
                                                <span className={cn(
                                                    "text-[14px] font-black italic tracking-tighter",
                                                    tx.type === 'credit' ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    {tx.type === 'credit' ? '+' : '-'} ₹{tx.amount.toLocaleString()}
                                                </span>
                                                <p className="text-[8px] font-black text-slate-300 uppercase mt-0.5">{tx.method}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-center">
                                                <StatusBadge status={tx.status} />
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="leading-none">
                                                <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                                    {format(tx.date, 'dd MMM yyyy')}
                                                </p>
                                                <p className="text-[8.5px] font-black text-slate-400 uppercase opacity-60 mt-0.5">
                                                    {format(tx.date, 'HH:mm:ss')}
                                                </p>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {filteredTransactions.length === 0 && (
                    <div className="p-20 text-center space-y-4">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-slate-200 border border-slate-100 italic">
                            <TrendingUp size={32} strokeWidth={3} />
                        </div>
                        <p className="font-black text-slate-400 uppercase tracking-widest text-[9px] italic opacity-60">No financial velocity detected in this range</p>
                    </div>
                )}
            </div>

        </div>
    );
};

const SummaryCard = ({ label, value, icon: Icon, color, sub }) => (
    <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4 transition-all hover:shadow-md border-b-2" style={{ borderBottomColor: color === 'emerald' ? '#10b981' : color === 'rose' ? '#f43f5e' : '#f59e0b' }}>
        <div className="flex items-center justify-between">
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border",
                color === 'emerald' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                    color === 'rose' ? "bg-rose-50 text-rose-600 border-rose-100" :
                        "bg-amber-50 text-amber-600 border-amber-100"
            )}>
                <Icon size={18} strokeWidth={3} />
            </div>
            <div className="text-right">
                <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest opacity-60 leading-none">{label}</p>
                <p className="text-[18px] font-black text-slate-900 dark:text-white tracking-tighter italic mt-1">₹{value.toLocaleString()}</p>
            </div>
        </div>
        <div className="pt-3 border-t border-slate-50 dark:border-gray-800 flex items-center gap-2">
            <div className={cn("w-1 h-1 rounded-full", color === 'emerald' ? "bg-emerald-500" : color === 'rose' ? "bg-rose-500" : "bg-amber-500")} />
            <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-tighter opacity-70 italic">{sub}</p>
        </div>
    </div>
);

const StatusBadge = ({ status }) => {
    const styles = {
        completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
        pending: "bg-amber-50 text-amber-600 border-amber-100",
        failed: "bg-rose-50 text-rose-600 border-rose-100"
    };

    const icons = {
        completed: <CheckCircle2 size={10} strokeWidth={3} />,
        pending: <Clock size={10} strokeWidth={3} />,
        failed: <AlertCircle size={10} strokeWidth={3} />
    };

    return (
        <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-sm italic",
            styles[status]
        )}>
            {icons[status]}
            {status}
        </div>
    );
};

export default TransactionManagement;
