// stores/useMenuStore.js
import { create } from 'zustand';

const useMenuStore = create((set) => ({
  activePath: '/dashboard',
  setActivePath: (path) => set({ activePath: path }),
}));

export default useMenuStore;
