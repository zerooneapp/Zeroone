// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Activate the latest worker immediately so an older duplicate-display
// handler cannot remain active after deployment.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const firebaseConfig = {
    apiKey: "AIzaSyDWV2ucFD4yiISx-7JJH6M36mwcrekTea0",
    authDomain: "zeroone-6b59c.firebaseapp.com",
    projectId: "zeroone-6b59c",
    storageBucket: "zeroone-6b59c.firebasestorage.app",
    messagingSenderId: "328709670086",
    appId: "1:328709670086:web:2de8a4d4c28c9f91bb83c7",
    measurementId: "G-PNJDM9CHCM"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

const shownNotifications = new Set();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // Messages containing a notification payload are displayed automatically
    // by the browser/FCM. Calling showNotification here would display the
    // same push a second time. Keep manual rendering only for data-only
    // messages.
    if (payload.notification) {
        console.log('[firebase-messaging-sw.js] Notification payload will be displayed automatically.');
        return;
    }

    const id = payload.data?.notificationId;
    if (id && shownNotifications.has(id)) {
        console.log('[firebase-messaging-sw.js] Duplicate notification suppressed:', id);
        return;
    }
    if (id) shownNotifications.add(id);

    const notification = payload.notification || {};
    const data = payload.data || {};
    const notificationTitle = notification.title || data.title || 'ZeroOne';
    const notificationOptions = {
        body: notification.body || data.body || '',
        icon: '/logo.jpeg',
        data,
        tag: id || undefined,
        renotify: Boolean(id)
    };

    // ✅ FIX: return the promise so the SW doesn't get terminated before the
    // notification actually gets shown, and log any failure instead of failing silently.
    return self.registration.showNotification(notificationTitle, notificationOptions)
        .then(() => console.log('[firebase-messaging-sw.js] Notification shown:', notificationTitle))
        .catch((err) => console.error('[firebase-messaging-sw.js] showNotification failed:', err));
});
