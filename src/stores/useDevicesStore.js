import { create } from 'zustand';

const useDevicesStore = create((set) => ({
  devices: [],
  setDevices: (devices) => set({ devices }),
}));

export default useDevicesStore;
