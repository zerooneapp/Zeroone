import React, { useState } from 'react';
import { X, Calendar, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const ReportModal = ({ isOpen, onClose }) => {
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/reports/live?startDate=${startDate}&endDate=${endDate}`);
      const data = res.data;

      if (!data || data.length === 0) {
        toast.error('No data found for the selected range');
        return;
      }

      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(40);
      doc.text('ZeroOne Staff Performance Report', 14, 22);
      
      // Date Range
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Period: ${dayjs(startDate).format('DD MMM YYYY')} to ${dayjs(endDate).format('DD MMM YYYY')}`, 14, 30);
      
      // Table
      const tableColumn = ["Staff Name", "Shop Name", "Attendance (Days)", "Total Bookings", "Cancelled by Staff", "Total Earning (INR)"];
      const tableRows = data.map(item => [
        item.staffName,
        item.shopName,
        item.attendance,
        item.totalBookings,
        item.cancelledByStaff,
        `Rs. ${item.totalEarning.toLocaleString()}`
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [0, 36, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 40 }
      });

      doc.save(`ZeroOne_LiveReport_${dayjs().format('YYYY-MM-DD')}.pdf`);
      toast.success('Report downloaded successfully');
      onClose();
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white capitalize tracking-tight">Generate Report</h3>
            <p className="text-[11px] font-black text-slate-400 capitalize tracking-widest mt-1">Select date range for live feed</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  max={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-gray-800 border-none rounded-xl text-[13px] font-black focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">End Date</label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  max={dayjs().format('YYYY-MM-DD')}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-gray-800 border-none rounded-xl text-[13px] font-black focus:ring-2 focus:ring-primary/20 transition-all"
                />
                <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>

          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <p className="text-[12px] font-bold text-primary leading-snug">
              The report will include staff attendance, earnings, booking counts, and cancellations for the selected period.
            </p>
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={handleDownload}
            disabled={loading}
            className="w-full py-4 bg-slate-900 dark:bg-primary text-white rounded-2xl font-black text-[14px] capitalize tracking-widest shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Download size={18} />
            )}
            {loading ? 'Generating Report...' : 'Download PDF Report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
