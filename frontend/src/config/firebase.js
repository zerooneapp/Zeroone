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
let tokenRequestPromise = null;
const shownForegroundNotificationIds = new Set();

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
        if (registration.active && !registration.installing && !registration.waiting) {
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

        await registration.update().catch((err) => {
            console.log('[FCM] Service worker update check failed:', err);
        });

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


const requestForTokenInternal = async () => {
    try {
        const messaging = await getMessagingInstance();
        if (!messaging) return null;

        if (typeof Notification === 'undefined') return null;

        console.log('[FCM] Requesting notification permission...');
        // Do not repeatedly prompt users during periodic token re-sync.
        const permission = Notification.permission === 'default'
            ? await Notification.requestPermission()
            : Notification.permission;
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
            // ✅ FIX: Cache the token so we can safely delete it during logout without relying on Firebase
            localStorage.setItem('fcm_token', currentToken);
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

// Share concurrent token requests from auth restoration, StrictMode, and
// visibility/online recovery events.
export const requestForToken = () => {
    if (tokenRequestPromise) return tokenRequestPromise;

    const request = requestForTokenInternal();
    tokenRequestPromise = request;
    request.finally(() => {
        if (tokenRequestPromise === request) tokenRequestPromise = null;
    });
    return request;
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

// FCM does not automatically create a browser notification while the app is
// in the foreground. Show it explicitly so foreground and background pushes
// have the same user-visible behaviour.
export const showForegroundNotification = async (payload) => {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
        return false;
    }

    const notification = payload?.notification || {};
    const data = payload?.data || {};
    const title = notification.title || data.title || 'ZeroOne';
    const body = notification.body || data.body || '';
    const dedupeId = data.id || data.notificationId || payload?.referenceId || payload?._id;

    if (dedupeId && shownForegroundNotificationIds.has(String(dedupeId))) {
        return false;
    }
    if (dedupeId) {
        const id = String(dedupeId);
        shownForegroundNotificationIds.add(id);
        setTimeout(() => shownForegroundNotificationIds.delete(id), 30000);
    }

    const options = {
        body,
        icon: '/logo.jpeg',
        badge: '/logo.jpeg',
        data,
        tag: dedupeId ? String(dedupeId) : undefined,
        renotify: Boolean(dedupeId)
    };

    try {
        const registration = 'serviceWorker' in navigator
            ? await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
            : null;

        if (registration?.showNotification) {
            await registration.showNotification(title, options);
        } else {
            new Notification(title, options);
        }
        return true;
    } catch (err) {
        console.log('[FCM] Foreground notification display failed:', err);
        return false;
    }
};

export const removeFCMToken = async () => {
    try {
        const messaging = await getMessagingInstance();
        if (!messaging) return false;

        // ✅ FIX: Retrieve the cached token from localStorage instead of relying on getToken()
        // getToken() often fails during logout if the Service Worker isn't immediately available,
        // causing the backend API call to be skipped and leaving ghost tokens in the DB.
        const currentToken = localStorage.getItem('fcm_token');

        // Properly await the backend API call so token is removed from DB
        // while the auth token is still valid (before localStorage.removeItem('token'))
        if (currentToken) {
            try {
                const { default: api } = await import('../services/api');
                await api.delete('/fcm-tokens/remove', { data: { token: currentToken } });
                console.log('[FCM] Token removed from backend successfully');
            } catch (apiErr) {
                console.log('[FCM] Backend token removal failed (non-critical):', apiErr?.message);
            }
        } else {
            console.log('[FCM] No cached token found to remove from backend.');
        }

        // Now delete the token from Firebase locally
        const deleted = await deleteToken(messaging);
        if (deleted) {
            console.log('[FCM] Token deleted from Firebase successfully');
        } else {
            console.log('[FCM] Failed to delete token from Firebase');
        }

        // Clean up the cache
        localStorage.removeItem('fcm_token');
        return deleted;
    } catch (err) {
        console.log('[FCM] Error deleting token:', err);
        return false;
    }
};
