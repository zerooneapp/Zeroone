import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

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
export const messaging = getMessaging(app);

export const VAPID_KEY = "BNy5bN5SPbw3fkzBFO289YDCB2cnVzfYPKXURnNMd3AV0sYxBBHz3y5InxZXtDaK4ER9e0Poqk0tqkdQPRWnWfU";

export const requestForToken = async () => {
    try {
        console.log('[FCM] Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('[FCM] Notification permission status:', permission);

        if (permission !== 'granted') {
            console.log('[FCM] Permission not granted.');
            return null;
        }

        const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
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
    new Promise((resolve) => {
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
