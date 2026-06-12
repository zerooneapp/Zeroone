import React, { useState } from 'react';
import { X, Landmark, CreditCard, QrCode, AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react';
import api from '../services/api';

const WithdrawModal = ({ isOpen, onClose, balance, minWithdrawal, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('upi'); // 'bank_transfer' or 'upi'
  const [bankDetails, setBankDetails] = useState({
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: ''
  });
  const [upiDetails, setUpiDetails] = useState({
    upiId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < minWithdrawal) {
      setError(`Minimum withdrawal amount is ₹${minWithdrawal}`);
      return;
    }

    if (numAmount > balance) {
      setError('Insufficient balance');
      return;
    }

    if (method === 'upi') {
      const upiRegex = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/;
      if (!upiRegex.test(upiDetails.upiId)) {
        setError('Please enter a valid UPI ID (e.g. name@bank)');
        return;
      }
    } else if (method === 'bank_transfer') {
      // Trim values
      const bankName = bankDetails.bankName.trim();
      const accountNumber = bankDetails.accountNumber.trim();
      const ifscCode = bankDetails.ifscCode.trim();

      // Bank Name Validation
      const bankNameRegex = /^[A-Za-z ]{3,100}$/;
      if (!bankNameRegex.test(bankName)) {
        setError('Enter a valid bank name');
        return;
      }

      // Account Number Validation
      const accNumRegex = /^[0-9]{9,18}$/;
      if (!accNumRegex.test(accountNumber)) {
        setError('Enter a valid account number');
        return;
      }

      // IFSC Code Validation
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(ifscCode)) {
        setError('Enter a valid IFSC code');
        return;
      }

      // Ensure Account Holder Name is not empty
      if (!bankDetails.accountHolderName.trim()) {
        setError('Enter account holder name');
        return;
      }
    }

    try {
      setLoading(true);
      const payload = {
        amount: numAmount,
        method,
        bankDetails: method === 'bank_transfer' ? {
          ...bankDetails,
          bankName: bankDetails.bankName.trim(),
          accountNumber: bankDetails.accountNumber.trim(),
          ifscCode: bankDetails.ifscCode.trim(),
          accountHolderName: bankDetails.accountHolderName.trim()
        } : undefined,
        upiDetails: method === 'upi' ? {
          ...upiDetails,
          upiId: upiDetails.upiId.trim()
        } : undefined
      };

      await api.post('/vendor/wallet/withdraw', payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  const BRAND_NAVY = '#00246b';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-950 rounded-2xl sm:rounded-3xl w-full max-w-md max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-gray-800">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gradient-to-r from-[#00246b]/5 to-[#00246b]/10 dark:from-white/5 dark:to-white/10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#00246b] dark:text-white">Withdraw Funds</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Available: ₹{balance}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-full transition-colors">
            <X size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3 sm:space-y-4 flex-1 overflow-y-auto no-scrollbar">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-xl flex items-center gap-2 text-sm border border-red-100 dark:border-red-900/30">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Amount to Withdraw</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#00246b] dark:text-white font-medium">₹</span>
              <input
                type="number"
                required
                min={minWithdrawal}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-[#00246b]/20 dark:focus:ring-white/10 focus:border-[#00246b] dark:focus:border-white text-gray-900 dark:text-white outline-none transition-all text-sm"
                placeholder={`Min ₹${minWithdrawal}`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Withdrawal Method</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setMethod('upi')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                  method === 'upi' ? 'border-[#00246b] dark:border-white bg-[#00246b]/5 dark:bg-white/5 text-[#00246b] dark:text-white' : 'border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'
                }`}
              >
                <CreditCard size={16} />
                <span className="text-sm font-medium">UPI ID</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod('bank_transfer')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                  method === 'bank_transfer' ? 'border-[#00246b] dark:border-white bg-[#00246b]/5 dark:bg-white/5 text-[#00246b] dark:text-white' : 'border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-gray-700'
                }`}
              >
                <Landmark size={16} />
                <span className="text-sm font-medium">Bank</span>
              </button>
            </div>
          </div>

          {method === 'upi' ? (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">UPI ID</label>
                <input
                  type="text"
                  required
                  value={upiDetails.upiId}
                  onChange={(e) => setUpiDetails({ upiId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[#00246b]/20 dark:focus:ring-white/10 focus:border-[#00246b] dark:focus:border-white text-gray-900 dark:text-white text-sm"
                  placeholder="e.g. name@okaxis"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">Account Holder Name</label>
                  <input
                    type="text"
                    required
                    value={bankDetails.accountHolderName}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                      setBankDetails({ ...bankDetails, accountHolderName: val });
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[#00246b]/20 dark:focus:ring-white/10 focus:border-[#00246b] dark:focus:border-white text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankDetails.bankName}
                    onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[#00246b]/20 dark:focus:ring-white/10 focus:border-[#00246b] dark:focus:border-white text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={bankDetails.ifscCode}
                    onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[#00246b]/20 dark:focus:ring-white/10 focus:border-[#00246b] dark:focus:border-white text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1">Account Number</label>
                  <input
                    type="text"
                    required
                    maxLength={18}
                    value={bankDetails.accountNumber}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setBankDetails({ ...bankDetails, accountNumber: val });
                    }}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:ring-2 focus:ring-[#00246b]/20 dark:focus:ring-white/10 focus:border-[#00246b] dark:focus:border-white text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#00246b] hover:bg-[#001b50] disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg shadow-[#00246b]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <IndianRupee size={16} />
                  Submit Request
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-gray-400 mt-2 px-4">
              Requests are usually processed within 24-48 working hours.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WithdrawModal;
