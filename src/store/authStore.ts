import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { Account } from '../types';

const KEY = 'iptv_account';

interface AuthState {
  account: Account | null;
  hydrated: boolean;
  load: () => Promise<void>;
  save: (account: Account) => Promise<void>;
  clear: () => Promise<void>;
}

/** Credenciais ficam criptografadas no SecureStore (Keychain / Keystore). */
export const useAuth = create<AuthState>((set) => ({
  account: null,
  hydrated: false,
  load: async () => {
    try {
      const raw = await SecureStore.getItemAsync(KEY);
      set({ account: raw ? (JSON.parse(raw) as Account) : null, hydrated: true });
    } catch {
      set({ account: null, hydrated: true });
    }
  },
  save: async (account) => {
    await SecureStore.setItemAsync(KEY, JSON.stringify(account));
    set({ account });
  },
  clear: async () => {
    await SecureStore.deleteItemAsync(KEY);
    set({ account: null });
  },
}));
