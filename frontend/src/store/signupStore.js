import { create } from 'zustand';

export const useSignupStore = create((set) => ({
  formData: (() => {
    try {
      const saved = sessionStorage.getItem('vendor_signup_form');
      return saved ? JSON.parse(saved) : {
        shopName: '',
        ownerName: '',
        category: '',
        serviceLevel: 'standard',
        serviceMode: 'shop',
        address: '',
        location: { coordinates: [75.8577, 22.7196] },
      };
    } catch (e) {
      return {
        shopName: '',
        ownerName: '',
        category: '',
        serviceLevel: 'standard',
        serviceMode: 'shop',
        address: '',
        location: { coordinates: [75.8577, 22.7196] },
      };
    }
  })(),
  step: (() => {
    const saved = sessionStorage.getItem('vendor_signup_step');
    return saved ? parseInt(saved) : 1;
  })(),
  files: {
    panCard: null,
    gstCertificate: null,
    shopRegistration: null,
    aadhaarFront: null,
    aadhaarBack: null,
    shopImage: null,
    vendorPhoto: null,
  },
  setFormData: (data) => set((state) => {
    const newFormData = typeof data === 'function' ? data(state.formData) : { ...state.formData, ...data };
    sessionStorage.setItem('vendor_signup_form', JSON.stringify(newFormData));
    return { formData: newFormData };
  }),
  setStep: (step) => {
    sessionStorage.setItem('vendor_signup_step', step.toString());
    set({ step });
  },
  setFile: (key, file) => set((state) => ({ 
    files: { ...state.files, [key]: file } 
  })),
  reset: () => {
    sessionStorage.removeItem('vendor_signup_form');
    sessionStorage.removeItem('vendor_signup_step');
    set({
      formData: {
        shopName: '',
        ownerName: '',
        category: '',
        serviceLevel: 'standard',
        serviceMode: 'shop',
        address: '',
        location: { coordinates: [75.8577, 22.7196] },
      },
      step: 1,
      files: {
        panCard: null,
        gstCertificate: null,
        shopRegistration: null,
        aadhaarFront: null,
        aadhaarBack: null,
        shopImage: null,
        vendorPhoto: null,
      }
    });
  }
}));
