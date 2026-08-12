import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported, deleteToken } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyDWV2ucFD4yiISx-7JJH6M36mwcrekTea0",
    authDomain: "zeroone-6b59c.firebaseapp.com",
    projectId: "zeroone-6b59c",
    storageBucket: "zeroone-6b59c.firebasestorage.app",
    messagingSenderId: "328709670086",
    appId: "1:328709670086:web:2de8a4d4c28c9f91bb83c7",
    measurementId: "G-PNJDM9CHCM"
};

const app = initializeApp(firebaseConfig);
let messagingInstance = null;

export const VAPID_KEY = "BNy5bN5SPbw3fkzBFO289YDCB2cnVzfYPKXURnNMd3AV0sYxBBHz3y5InxZXtDaK4ER9e0Poqk0tqkdQPRWnWfU";

const getMessagingInstance = async () => {
    if (messagingInstance) return messagingInstance;

    const supported = await isSupported().catch(() => false);
    if (!supported) {
        console.log('[FCM] Firebase messaging is not supported in this browser/context.');
        return null;
    }

    messagingInstance = getMessaging(app);
    return messagingInstance;
};

// Wait until a Service Worker registration has an active worker
const waitForServiceWorkerActive = (registration) => {
    return new Promise((resolve) => {
        // Already active — return immediately
        if (registration.active) {
            resolve(registration);
            return;
        }

        // SW is installing/waiting — listen for state change
        const sw = registration.installing || registration.waiting;
        if (sw) {
            sw.addEventListener('statechange', function handler() {
                if (this.state === 'activated') {
                    sw.removeEventListener('statechange', handler);
                    resolve(registration);
                }
            });
        } else {
            // Fallback: wait for navigator.serviceWorker.ready
            navigator.serviceWorker.ready.then(() => resolve(registration));
        }
    });
};

const registerMessagingServiceWorker = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('[FCM] Service worker is not supported in this browser.');
        return null;
    }

    try {
        let registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');

        if (!registration) {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log('[FCM] Service worker registered for messaging.');
        }

        // ✅ FIX: Wait for SW to be fully active before returning
        // Firebase getToken() requires an ACTIVE service worker, not just registered
        await waitForServiceWorkerActive(registration);
        console.log('[FCM] Service worker is active and ready.');
        return registration;
    } catch (err) {
        console.log('[FCM] Failed to register messaging service worker:', err);
        return null;
    }
};


export const requestForToken = async () => {
    try {
        const messaging = await getMessagingInstance();
        if (!messaging) return null;

        console.log('[FCM] Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('[FCM] Notification permission status:', permission);

        if (permission !== 'granted') {
            console.log('[FCM] Permission not granted.');
            return null;
        }

        const serviceWorkerRegistration = await registerMessagingServiceWorker();
        if (!serviceWorkerRegistration) {
            console.log('[FCM] Messaging service worker registration unavailable.');
            return null;
        }

        const currentToken = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration
        });
        if (currentToken) {
            console.log('[FCM] Current FCM Token:', currentToken);
            return currentToken;
        } else {
            console.log('[FCM] No registration token available.');
            return null;
        }
    } catch (err) {
        console.log('[FCM] An error occurred while retrieving token: ', err);
        return null;
    }
};

// ✅ FIX: Persistent listener — registers a callback that fires for EVERY notification
// Old Promise-based approach only worked for the FIRST notification, then died
export const onMessageListener = (callback) => {
    let unsubscribe = () => {};

    getMessagingInstance().then((messaging) => {
        if (!messaging) return;
        // onMessage returns an unsubscribe function
        unsubscribe = onMessage(messaging, (payload) => {
            if (callback) callback(payload);
        });
    }).catch((err) => {
        console.log('[FCM] onMessageListener setup failed:', err);
    });

    // Return cleanup function for useEffect
    return () => unsubscribe();
};

export const removeFCMToken = async () => {
    try {
        const messaging = await getMessagingInstance();
        if (!messaging) return false;

        // Get the current token BEFORE deleting it locally
        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY }).catch(() => null);

        // ✅ FIX: Properly await the backend API call so token is removed from DB
        // while the auth token is still valid (before localStorage.removeItem('token'))
        if (currentToken) {
            try {
                const { default: api } = await import('../services/api');
                // ✅ FIX: Correct route URL — was '/fcm/remove', should be '/fcm-tokens/remove'
                await api.delete('/fcm-tokens/remove', { data: { token: currentToken } });
                console.log('[FCM] Token removed from backend successfully');
            } catch (apiErr) {
                console.log('[FCM] Backend token removal failed (non-critical):', apiErr?.message);
            }
        }

        // Now delete the token from Firebase locally
        const deleted = await deleteToken(messaging);
        if (deleted) {
            console.log('[FCM] Token deleted from Firebase successfully');
        } else {
            console.log('[FCM] Failed to delete token from Firebase');
        }
        return deleted;
    } catch (err) {
        console.log('[FCM] Error deleting token:', err);
        return false;
    }
};
