import React from 'react';
import { Link } from 'react-router-dom';

const SiteFooter = () => (
  <footer className="max-w-4xl mx-auto px-4 pt-8 pb-28">
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-6 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-base font-semibold text-[#00246b] dark:text-white">ZeroOne</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">Book trusted services from local professionals.</p>

      <nav className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-sm" aria-label="Website policies">
        <Link className="text-slate-600 hover:text-[#00246b] dark:text-gray-300 dark:hover:text-white" to="/privacy-policy">Privacy &amp; Policy</Link>
        <Link className="text-slate-600 hover:text-[#00246b] dark:text-gray-300 dark:hover:text-white" to="/contact-support">Contact &amp; Support</Link>
        <Link className="text-slate-600 hover:text-[#00246b] dark:text-gray-300 dark:hover:text-white" to="/terms-and-conditions">Terms &amp; Conditions</Link>
        <Link className="text-slate-600 hover:text-[#00246b] dark:text-gray-300 dark:hover:text-white" to="/refund-cancellation">Refunds &amp; Cancellations</Link>
      </nav>

      <p className="mt-5 text-xs text-slate-400 dark:text-gray-500">&copy; {new Date().getFullYear()} ZeroOne. All rights reserved.</p>
    </div>
  </footer>
);

export default SiteFooter;