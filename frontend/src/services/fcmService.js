import api from './api';

export const saveTokenToBackend = async (token) => {
    try {
        await api.post('/fcm-tokens/save', {
            token,
            platform: 'web'
        });
        console.log('[FCM-SERVICE] Token saved to backend');
    } catch (error) {
        console.error('[FCM-SERVICE] Failed to save token:', error.response?.data || error.message);
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
