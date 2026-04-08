import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  Layers,
  Printer,
  Search,
  TrendingUp
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { format } from 'date-fns';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { cn } from '../../../utils/cn';

const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
});

const prettifyLabel = (value = '') => value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (char) => char.toUpperCase());

const buildCsvValue = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const TransactionManagement = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    transactions: [],
    summary: {
      totalInflow: 0,
      totalOutflow: 0,
      pendingAmount: 0,
      pendingCount: 0,
      failedCount: 0
    },
    totalPages: 1,
    currentPage: 1
  });
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all'
  });

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/transactions', {
        params: {
          ...filters,
          page: data.currentPage,
          limit: 20
        }
      });
      setData((previous) => ({
        ...previous,
        ...response.data
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load transaction ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, filters.search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [filters, data.currentPage]);

  const setPage = (page) => {
    setData((previous) => ({
      ...previous,
      currentPage: page
    }));
  };

  const handleExportCsv = () => {
    const rows = [
      ['Reference ID', 'Vendor', 'Owner', 'Category', 'Type', 'Amount', 'Status', 'Gateway', 'Payment Id', 'Created At'],
      ...data.transactions.map((transaction) => ([
        transaction.referenceId || transaction.gatewayPaymentId || transaction._id,
        transaction.vendor?.shopName || transaction.initiatedBy?.name || '',
        transaction.vendor?.owner?.name || '',
        prettifyLabel(transaction.category),
        transaction.type,
        transaction.amount,
        transaction.status,
        transaction.paymentGateway || '',
        transaction.gatewayPaymentId || '',
        format(new Date(transaction.timestamp), 'dd MMM yyyy HH:mm:ss')
      ]))
    ];

    const csv = rows
      .map((row) => row.map(buildCsvValue).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-transactions-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 pb-20 animate-in fade-in duration-500">
      <div className="p-5 px-6 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b-2 border-b-emerald-500/20">
        <div className="space-y-1">
          <h1 className="text-[28px] font-black text-slate-900 dark:text-white tracking-tighter capitalize">Capital Ledger</h1>
          <p className="text-[12px] font-black text-slate-400 capitalize tracking-[0.2em] opacity-60">Global Financial Movement & Settlement Hub</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="h-11 px-4 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-100 dark:border-gray-700 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-2 group"
          >
            <Download size={18} strokeWidth={3} className="group-hover:translate-y-0.5 transition-transform" />
            <span className="text-[11px] font-black capitalize tracking-widest">Live Report</span>
          </button>
          <button
            onClick={handlePrint}
            className="h-11 px-4 bg-slate-900 text-white rounded-xl font-black text-[11px] capitalize tracking-widest shadow-lg shadow-slate-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
          >
            <Printer size={18} strokeWidth={3} />
            Export Ledger
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <SummaryCard
          label="Total Capital Inflow"
          value={data.summary.totalInflow}
          icon={ArrowUpRight}
          color="emerald"
          sub="Successful wallet credits and recoveries"
        />
        <SummaryCard
          label="Merchant Charges"
          value={data.summary.totalOutflow}
          icon={ArrowDownLeft}
          color="rose"
          sub="Daily and monthly subscription deductions"
        />
        <SummaryCard
          label="Pending Settlements"
          value={data.summary.pendingAmount}
          icon={Clock}
          color="amber"
          sub={`${data.summary.pendingCount || 0} transactions awaiting confirmation`}
        />
      </div>

      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-gray-600" size={18} strokeWidth={3} />
          <input
            type="text"
            placeholder="SEARCH ORDER ID, PAYMENT ID OR VENDOR..."
            className="w-full pl-11 pr-4 h-12 bg-slate-50 dark:bg-gray-800 border-none rounded-xl text-[14px] font-black capitalize tracking-widest focus:ring-2 ring-primary/20 outline-none dark:text-white transition-all placeholder:text-slate-300"
            value={filters.search}
            onChange={(event) => {
              const value = event.target.value;
              setData((previous) => ({ ...previous, currentPage: 1 }));
              setFilters((previous) => ({ ...previous, search: value }));
            }}
          />
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          {['all', 'credit', 'debit'].map((type) => (
            <button
              key={type}
              onClick={() => {
                setData((previous) => ({ ...previous, currentPage: 1 }));
                setFilters((previous) => ({ ...previous, type }));
              }}
              className={cn(
                'flex-1 h-12 px-6 rounded-xl text-[11px] font-black capitalize tracking-widest transition-all border shadow-sm',
                filters.type === type
                  ? 'bg-slate-900 text-white border-slate-900 scale-[1.02]'
                  : 'bg-white dark:bg-gray-800 text-slate-400 border-slate-100 dark:border-gray-700 hover:bg-slate-50'
              )}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          {['all', 'completed', 'pending', 'failed'].map((status) => (
            <button
              key={status}
              onClick={() => {
                setData((previous) => ({ ...previous, currentPage: 1 }));
                setFilters((previous) => ({ ...previous, status }));
              }}
              className={cn(
                'flex-1 h-12 px-4 rounded-xl text-[10px] font-black capitalize tracking-widest transition-all border shadow-sm',
                filters.status === status
                  ? 'bg-white dark:bg-gray-800 text-slate-900 dark:text-white border-slate-900/10 dark:border-gray-700'
                  : 'bg-slate-50 dark:bg-gray-800 text-slate-400 border-slate-100 dark:border-gray-700'
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-gray-800/50 border-b border-slate-100 dark:border-gray-800">
                <th className="px-5 py-4 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 capitalize tracking-[0.2em] opacity-80">Reference ID</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 capitalize tracking-[0.2em] opacity-80">Vendor / Initiator</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 capitalize tracking-[0.2em] opacity-80">Classification</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 capitalize tracking-[0.2em] opacity-80 text-right">Capital Amount</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 capitalize tracking-[0.2em] opacity-80 text-center">Settlement</th>
                <th className="px-5 py-4 text-left text-[10px] font-black text-slate-400 dark:text-gray-500 capitalize tracking-[0.2em] opacity-80 text-right">Synchronization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-gray-800/40">
              <AnimatePresence mode="popLayout">
                {!loading && data.transactions.map((transaction, index) => (
                  <motion.tr
                    key={transaction._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="group hover:bg-slate-50/50 dark:hover:bg-gray-800/30 transition-all cursor-default"
                  >
                    <td className="px-5 py-4 leading-none">
                      <span className="text-[13px] font-black text-slate-900 dark:text-white capitalize tracking-tighter">
                        #{transaction.referenceId || transaction.gatewayPaymentId || transaction._id.slice(-6)}
                      </span>
                      <div className="flex items-center gap-1 mt-1 opacity-40">
                        <Layers size={10} />
                        <span className="text-[10px] font-bold text-slate-400 capitalize">
                          {transaction.gatewayOrderId || transaction.paymentGateway || 'manual'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-[12px] font-black text-slate-400 capitalize tracking-tighter">
                          {(transaction.vendor?.shopName || transaction.initiatedBy?.name || 'NA')
                            .split(' ')
                            .map((part) => part[0])
                            .join('')
                            .slice(0, 2)}
                        </div>
                        <div className="leading-tight">
                          <p className="text-[14px] font-black text-slate-900 dark:text-white capitalize tracking-tighter">
                            {transaction.vendor?.shopName || transaction.initiatedBy?.name || 'Unknown'}
                          </p>
                          <p className="text-[11px] font-black text-slate-400 capitalize opacity-60">
                            {transaction.vendor?.owner?.name || transaction.initiatedBy?.phone || 'Verified Identity'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-2.5 h-2.5 rounded-full',
                          transaction.type === 'credit' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                        )} />
                        <span className="text-[12px] font-black text-slate-600 dark:text-gray-400 capitalize tracking-widest">
                          {prettifyLabel(transaction.category)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="leading-none">
                        <span className={cn(
                          'text-[16px] font-black tracking-tighter',
                          transaction.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'
                        )}>
                          {transaction.type === 'credit' ? '+' : '-'} {moneyFormatter.format(transaction.amount || 0)}
                        </span>
                        <p className="text-[11px] font-black text-slate-300 capitalize mt-0.5">
                          {prettifyLabel(transaction.paymentMethod || transaction.paymentGateway || 'manual')}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-center">
                        <StatusBadge status={transaction.status} />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="leading-none">
                        <p className="text-[13px] font-black text-slate-900 dark:text-white capitalize tracking-tighter">
                          {format(new Date(transaction.timestamp), 'dd MMM yyyy')}
                        </p>
                        <p className="text-[11px] font-black text-slate-400 capitalize opacity-60 mt-0.5">
                          {format(new Date(transaction.timestamp), 'HH:mm:ss')}
                        </p>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-slate-200 border border-slate-100 animate-pulse">
              <TrendingUp size={32} strokeWidth={3} />
            </div>
            <p className="font-black text-slate-400 capitalize tracking-widest text-[12px] opacity-60">Synchronizing ledger</p>
          </div>
        )}

        {!loading && data.transactions.length === 0 && (
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto text-slate-200 border border-slate-100">
              <TrendingUp size={32} strokeWidth={3} />
            </div>
            <p className="font-black text-slate-400 capitalize tracking-widest text-[12px] opacity-60">No financial velocity detected in this range</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2">
        <p className="text-[11px] font-black text-slate-400 capitalize tracking-[0.2em]">
          Page {data.currentPage} of {data.totalPages}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(1, data.currentPage - 1))}
            disabled={data.currentPage === 1}
            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-gray-800 text-[11px] font-black capitalize tracking-widest disabled:opacity-40"
          >
            Prev
          </button>
          <button
            onClick={() => setPage(Math.min(data.totalPages, data.currentPage + 1))}
            disabled={data.currentPage >= data.totalPages}
            className="h-11 px-4 rounded-xl border border-slate-200 dark:border-gray-800 text-[11px] font-black capitalize tracking-widest disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, icon: Icon, color, sub }) => (
  <div className="p-5 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/60 dark:border-gray-800 shadow-sm space-y-4 transition-all hover:shadow-md border-b-2" style={{ borderBottomColor: color === 'emerald' ? '#10b981' : color === 'rose' ? '#f43f5e' : '#f59e0b' }}>
    <div className="flex items-center justify-between">
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border',
        color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
          color === 'rose' ? 'bg-rose-50 text-rose-600 border-rose-100' :
            'bg-amber-50 text-amber-600 border-amber-100'
      )}>
        <Icon size={24} strokeWidth={3} />
      </div>
      <div className="text-right">
        <p className="text-[12px] font-black text-slate-400 capitalize tracking-widest opacity-60 leading-none">{label}</p>
        <p className="text-[22px] font-black text-slate-900 dark:text-white tracking-tighter mt-1">
          {moneyFormatter.format(value || 0)}
        </p>
      </div>
    </div>
    <div className="pt-3 border-t border-slate-50 dark:border-gray-800 flex items-center gap-2">
      <div className={cn('w-1.5 h-1.5 rounded-full', color === 'emerald' ? 'bg-emerald-500' : color === 'rose' ? 'bg-rose-500' : 'bg-amber-500')} />
      <p className="text-[11px] font-black text-slate-400 capitalize tracking-tighter opacity-70">{sub}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const styles = {
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    pending: 'bg-amber-50 text-amber-600 border-amber-100',
    failed: 'bg-rose-50 text-rose-600 border-rose-100'
  };

  const icons = {
    completed: <CheckCircle2 size={12} strokeWidth={3} />,
    pending: <Clock size={12} strokeWidth={3} />,
    failed: <AlertCircle size={12} strokeWidth={3} />
  };

  return (
    <div className={cn(
      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black capitalize tracking-widest border shadow-sm',
      styles[status] || styles.pending
    )}>
      {icons[status] || icons.pending}
      {status}
    </div>
  );
};

export default TransactionManagement;
