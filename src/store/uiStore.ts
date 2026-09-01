import { create } from 'zustand';

type Sheet = 'none' | 'mobile-menu';

interface UiStore {
  searchOpen: boolean;
  mobileMenuOpen: boolean;
  currentSheet: Sheet;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  setSheet: (sheet: Sheet) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  searchOpen: false,
  mobileMenuOpen: false,
  currentSheet: 'none',
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  setSheet: (currentSheet) => set({ currentSheet }),
}));
