import api from './api';

let pendingTokenSave = null;

export const saveTokenToBackend = async (token) => {
    if (!token) return false;

    // Prevent duplicate simultaneous requests during React StrictMode or
    // parallel auth/session restoration.
    if (pendingTokenSave?.token === token) return pendingTokenSave.promise;

    const promise = (async () => {
    try {
        await api.post('/fcm-tokens/save', {
            token,
            platform: 'web'
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
