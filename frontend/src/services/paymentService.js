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

// The Cashfree modal is a full-screen fixed iframe injected into <body>. On
// phones it starts at y=0 and sits under the status bar, so give it top
// padding. Any iframe added while checkout is open is treated as Cashfree's,
// which avoids depending on its src or class names.
// The iframe is cross-origin, so its header cannot be restyled. Instead the
// strip above it is filled with the header colour so the header looks like it
// extends under the status bar. Sandbox uses Cashfree's default purple;
// production uses the ZeroOne branded navy header.
const CASHFREE_HEADER_COLORS = { sandbox: '#6b2fc9', production: '#1b2559' };

const offsetCashfreeModal = (mode = 'sandbox') => {
  const isPhoneLike = document.documentElement.classList.contains('is-app') || window.innerWidth <= 768;
  if (!isPhoneLike) return () => {};

  const existingFrames = new Set(document.querySelectorAll('iframe'));
  const topOffset = 'max(var(--safe-header-top, 0px), env(safe-area-inset-top, 0px), 36px)';

  const statusBarFill = document.createElement('div');
  statusBarFill.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'right:0', `height:${topOffset}`,
    `background:${CASHFREE_HEADER_COLORS[mode] || CASHFREE_HEADER_COLORS.sandbox}`,
    'z-index:2147483647', 'pointer-events:none'
  ].join(';');
  document.body.appendChild(statusBarFill);

  const apply = () => {
    document.querySelectorAll('iframe').forEach((frame) => {
      if (existingFrames.has(frame)) return;

      let node = frame;
      while (node.parentElement && node.parentElement !== document.body) node = node.parentElement;

      [node, frame].forEach((el) => {
        el.style.setProperty('top', topOffset, 'important');
        el.style.setProperty('height', `calc(100% - ${topOffset})`, 'important');
        el.style.setProperty('max-height', `calc(100% - ${topOffset})`, 'important');
      });
    });
  };

  const observer = new MutationObserver(apply);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
  apply();
  return () => {
    observer.disconnect();
    statusBarFill.remove();
  };
};

export const openGatewayCheckout = async ({
  orderResponse,
  name = 'ZeroOne',
  description = 'Online payment',
  prefill = {},
  pollStatus,
  onSuccess,
  onFailure
}) => {
  if (orderResponse?.gateway === 'cashfree') {
    await loadCashfreeScript();
    if (!window.Cashfree) throw new Error('Cashfree checkout is unavailable');

    const cashfree = window.Cashfree({ mode: orderResponse.mode || 'sandbox' });
    const stopOffset = offsetCashfreeModal(orderResponse.mode || 'sandbox');
    const framesBefore = new Set(document.querySelectorAll('iframe'));
    let result;
    let stopPolling = () => {};
    try {
      const checkoutPromise = cashfree.checkout({
        paymentSessionId: orderResponse.paymentSessionId,
        redirectTarget: '_modal'
      });
      checkoutPromise.catch(() => {});

      // After a UPI app-switch the browser suspends the page, so the Cashfree
      // modal never learns the payment finished and stays on the payment
      // options screen. Ask our server for the real status while the modal is
      // open (and again when the user returns to the tab); once paid, close the
      // modal ourselves instead of waiting for Cashfree.
      const pollPromise = typeof pollStatus === 'function'
        ? new Promise((resolve) => {
            let busy = false;
            let startTimer;
            let intervalTimer;
            const check = async () => {
              if (busy) return;
              busy = true;
              try {
                if (await pollStatus()) resolve({ polledPaid: true });
              } catch (_) {
                // keep waiting; the next tick retries
              } finally {
                busy = false;
              }
            };
            const onReturn = () => { if (!document.hidden) check(); };
            startTimer = setTimeout(() => { intervalTimer = setInterval(check, 3000); }, 4000);
            document.addEventListener('visibilitychange', onReturn);
            window.addEventListener('focus', onReturn);
            stopPolling = () => {
              clearTimeout(startTimer);
              clearInterval(intervalTimer);
              document.removeEventListener('visibilitychange', onReturn);
              window.removeEventListener('focus', onReturn);
            };
          })
        : new Promise(() => {});

      result = await Promise.race([checkoutPromise, pollPromise]);

      if (result?.polledPaid) {
        document.querySelectorAll('iframe').forEach((frame) => {
          if (framesBefore.has(frame)) return;
          let node = frame;
          while (node.parentElement && node.parentElement !== document.body) node = node.parentElement;
          node.remove();
        });
      }
    } finally {
      stopPolling();
      stopOffset();
    }

    if (result?.polledPaid) {
      await onSuccess?.({
        gateway: 'cashfree',
        order_id: orderResponse.orderId,
        cf_payment_id: ''
      });
      return;
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

    // UPI / app-switch flows often close the modal without paymentDetails even
    // though the payment went through. The server checks the real status with
    // Cashfree by order id, so always ask it instead of giving up.
    await onSuccess?.({
      gateway: 'cashfree',
      order_id: orderResponse.orderId,
      cf_payment_id: ''
    });
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