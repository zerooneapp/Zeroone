const loadScript = (src, dataAttribute, errorMessage) => new Promise((resolve, reject) => {
  const existing = document.querySelector(`script[data-${dataAttribute}="true"]`);
  if (existing) {
    if (existing.dataset.loaded === 'true') return resolve(true);
    existing.addEventListener('load', () => resolve(true), { once: true });
    existing.addEventListener('error', () => reject(new Error(errorMessage)), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.dataset[dataAttribute] = 'true';
  script.onload = () => {
    script.dataset.loaded = 'true';
    resolve(true);
  };
  script.onerror = () => reject(new Error(errorMessage));
  document.body.appendChild(script);
});

export const loadRazorpayScript = () => loadScript(
  'https://checkout.razorpay.com/v1/checkout.js',
  'razorpayCheckout',
  'Failed to load Razorpay'
);

export const loadCashfreeScript = () => loadScript(
  'https://sdk.cashfree.com/js/v3/cashfree.js',
  'cashfreeCheckout',
  'Failed to load Cashfree'
);

// The Cashfree modal is a full-screen fixed iframe injected into <body>. Inside
// the app it starts at y=0 and sits under the phone status bar. Push it down by
// the same safe-area offset the rest of the app uses.
const offsetCashfreeModal = () => {
  const root = document.documentElement;
  if (!root.classList.contains('is-app')) return () => {};

  const apply = () => {
    document.querySelectorAll('body > * iframe, body > iframe').forEach((frame) => {
      if (!String(frame.src || '').includes('cashfree')) return;

      let node = frame;
      while (node.parentElement && node.parentElement !== document.body) node = node.parentElement;

      [node, frame].forEach((el) => {
        el.style.setProperty('top', 'var(--safe-header-top)', 'important');
        el.style.setProperty('height', 'calc(100% - var(--safe-header-top))', 'important');
      });
    });
  };

  const observer = new MutationObserver(apply);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  apply();
  return () => observer.disconnect();
};

export const openGatewayCheckout = async ({
  orderResponse,
  name = 'ZeroOne',
  description = 'Online payment',
  prefill = {},
  onSuccess,
  onFailure
}) => {
  if (orderResponse?.gateway === 'cashfree') {
    await loadCashfreeScript();
    if (!window.Cashfree) throw new Error('Cashfree checkout is unavailable');

    const cashfree = window.Cashfree({ mode: orderResponse.mode || 'sandbox' });
    const stopOffset = offsetCashfreeModal();
    let result;
    try {
      result = await cashfree.checkout({
        paymentSessionId: orderResponse.paymentSessionId,
        redirectTarget: '_modal'
      });
    } finally {
      stopOffset();
    }

    if (result?.error) {
      onFailure?.(result.error);
      return;
    }

    if (result?.paymentDetails) {
      await onSuccess?.({
        gateway: 'cashfree',
        order_id: orderResponse.orderId,
        cf_payment_id: result.paymentDetails?.cf_payment_id || result.paymentDetails?.payment_id || ''
      });
      return;
    }

    if (result?.redirect) {
      onFailure?.(new Error('Cashfree payment was redirected. Please wait for confirmation.'));
      return;
    }

    onFailure?.(new Error('Cashfree payment status is unavailable'));
    return;
  }

  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error('Razorpay checkout is unavailable');

  await new Promise((resolve, reject) => {
    const razorpay = new window.Razorpay({
      key: orderResponse.keyId,
      amount: orderResponse.order?.amount,
      currency: orderResponse.order?.currency || 'INR',
      name,
      description,
      order_id: orderResponse.orderId || orderResponse.order?.id,
      prefill,
      theme: { color: '#111827' },
      handler: async (response) => {
        try {
          await onSuccess?.({ ...response, gateway: 'razorpay' });
          resolve();
        } catch (error) {
          onFailure?.(error);
          reject(error);
        }
      },
      modal: {
        ondismiss: () => {
          const error = new Error('Payment cancelled or failed');
          onFailure?.(error);
          reject(error);
        }
      }
    });

    razorpay.on('payment.failed', (response) => {
      const error = new Error(response?.error?.description || 'Payment failed');
      onFailure?.(error);
      reject(error);
    });
    razorpay.open();
  });
};