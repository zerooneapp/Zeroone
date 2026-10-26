import api from './api';

let pendingTokenSave = null;

// Native (Android/iOS) wrappers hand their FCM token to the WebView in one of
// these ways: a window global, a JS interface method, a flutter handler, or a
// 'nativeFcmToken' CustomEvent / localStorage entry.
export const getNativeFcmToken = async () => {
    if (typeof window === 'undefined') return null;
    const clean = (t) => (typeof t === 'string' && t.trim() ? t.trim() : null);

    try {
        const direct = clean(window.nativeFcmToken) || clean(window.fcmToken);
        if (direct) return direct;

        const iface = window.AndroidInterface || window.Android;
        if (typeof iface?.getFcmToken === 'function') {
            const t = clean(await iface.getFcmToken());
            if (t) return t;
        }

        if (typeof window.flutter_inappwebview?.callHandler === 'function') {
            const t = clean(await window.flutter_inappwebview.callHandler('getFcmToken'));
            if (t) return t;
        }

        return clean(localStorage.getItem('native_fcm_token'));
    } catch {
        return null;
    }
};

export const saveTokenToBackend = async (token, platform = 'web') => {
    if (!token) return false;

    // Prevent duplicate simultaneous requests during React StrictMode or
    // parallel auth/session restoration.
    if (pendingTokenSave?.token === token) return pendingTokenSave.promise;

    const promise = (async () => {
    try {
        await api.post('/fcm-tokens/save', {
            token,
            platform
        });
        console.log('[FCM-SERVICE] Token saved to backend');
        return true;
    } catch (error) {
        console.error('[FCM-SERVICE] Failed to save token:', error.response?.data || error.message);
        return false;
    }
    })();

    pendingTokenSave = { token, promise };
    try {
        return await promise;
    } finally {
        if (pendingTokenSave?.promise === promise) pendingTokenSave = null;
    }
};

export const removeTokenFromBackend = async (token) => {
    try {
        await api.delete('/fcm-tokens/remove', { data: { token } });
        console.log('[FCM-SERVICE] Token removed from backend');
    } catch (error) {
        console.error('[FCM-SERVICE] Failed to remove token:', error.message);
    }
};
