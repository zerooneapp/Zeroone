import api from './api';

export const getVendorMembershipPlans = (vendorId) => {
  return api.get(`/memberships/vendor/${vendorId}`);
};

export const createMembershipOrder = (planId) => {
  return api.post('/memberships/purchase/order', { planId });
};

export const verifyMembershipPurchase = (paymentData) => {
  return api.post('/memberships/purchase/verify', paymentData);
};

export const getMyMemberships = () => {
  return api.get('/memberships/my-memberships');
};
