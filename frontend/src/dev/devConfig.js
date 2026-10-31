// Hidden developer panel config.
//
// IMPORTANT: ROUTE_KEY must match DEVELOPER_ROUTE_KEY in backend/.env.
// UNLOCK_WORD is the secret you type on the decoy "404" page to reveal the login
// form. Only lowercase letters/digits count (no spaces). Change both before use.
export const ROUTE_KEY = 'sys-9dd95b6db7';
export const UNLOCK_WORD = 'devmode';

// localStorage key the developer token is kept under (kept separate from the app token)
export const DEV_TOKEN_KEY = '__dz_token';
