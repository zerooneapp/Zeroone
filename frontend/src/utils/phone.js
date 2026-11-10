// Builds the digits-only international number wa.me expects (India, +91).
// Don't guess with startsWith('91'): a valid 10 digit mobile can itself start
// with 91 (e.g. 9109258192), which would then be sent without the country code.
export const toWhatsAppNumber = (phone) => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length > 10 && digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.length === 10 ? `91${digits}` : digits;
};
