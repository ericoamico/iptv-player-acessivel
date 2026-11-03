import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';

import type { Account } from '../types';

const KEY = 'iptv_account';

// O SecureStore não existe na web; lá usamos o localStorage (apenas para testes no navegador).
const storage =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (k: string) => globalThis.localStorage?.getItem(k) ?? null,
        setItemAsync: async (k: string, v: string) => globalThis.localStorage?.setItem(k, v),
        deleteItemAsync: async (k: string) => globalThis.localStorage?.removeItem(k),
      }
    : SecureStore;

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
      const raw = await storage.getItemAsync(KEY);
      set({ account: raw ? (JSON.parse(raw) as Account) : null, hydrated: true });
    } catch {
      set({ account: null, hydrated: true });
    }
  },
  save: async (account) => {
    await storage.setItemAsync(KEY, JSON.stringify(account));
    set({ account });
  },
  clear: async () => {
    await storage.deleteItemAsync(KEY);
    set({ account: null });
  },
}));
