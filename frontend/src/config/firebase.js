import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

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

const registerMessagingServiceWorker = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        console.log('[FCM] Service worker is not supported in this browser.');
        return null;
    }

    try {
        const existingRegistration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
        if (existingRegistration) {
            return existingRegistration;
        }

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('[FCM] Service worker registered for messaging.');
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

export const onMessageListener = () =>
    new Promise(async (resolve, reject) => {
        try {
            const messaging = await getMessagingInstance();
            if (!messaging) {
                resolve(null);
                return;
            }

            onMessage(messaging, (payload) => {
                resolve(payload);
            });
        } catch (error) {
            reject(error);
        }
    });
