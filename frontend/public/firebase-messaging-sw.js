// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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

    const id = payload.data?.notificationId;
    if (id && shownNotifications.has(id)) {
        console.log('[firebase-messaging-sw.js] Duplicate notification suppressed:', id);
        return;
    }
    if (id) shownNotifications.add(id);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png', // Assuming there's a logo.png in public
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
