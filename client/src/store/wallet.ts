'use client';

import { create } from 'zustand';
import type { Strategy, StatusResponse, HoldingsResponse } from '@/lib/api';

export type FlowStep = 'connect' | 'amount' | 'confirm' | 'processing' | 'success' | 'error';

// Protocol addresses on Coston2
export const PROTOCOLS = {
  firelight: {
    name: 'Firelight Staking',
    address: '0x91Bfe6A68aB035DFebb6A770FFfB748C03C0E40B',
    apy: '8.5%',
    description: 'Liquid staking for XRP with stXRP rewards',
  },
  upshift: {
    name: 'Upshift Vault',
    address: '0xbAF89d873d198FF78E72D2745B01cBA3c6e5BE6B',
    apy: '12.3%',
    description: 'Automated yield optimization vault',
  },
} as const;

export interface Allocation {
  firelight: number; // Percentage 0-100
  upshift: number;   // Percentage 0-100
}

interface WalletStore {
  // Wallet state
  isInstalled: boolean;
  isConnected: boolean;
  address: string | null;
  network: string | null;

  // Flow state
  currentStep: FlowStep;
  selectedStrategy: Strategy | null;
  amount: string;
  allocation: Allocation;
  txHash: string | null;
  txStatus: StatusResponse | null;
  error: string | null;

  // Holdings
  holdings: HoldingsResponse | null;

  // Actions
  setWalletState: (state: {
    isInstalled: boolean;
    isConnected: boolean;
    address: string | null;
    network: string | null;
  }) => void;
  setCurrentStep: (step: FlowStep) => void;
  setSelectedStrategy: (strategy: Strategy | null) => void;
  setAmount: (amount: string) => void;
  setAllocation: (allocation: Allocation) => void;
  setTxHash: (hash: string | null) => void;
  setTxStatus: (status: StatusResponse | null) => void;
  setError: (error: string | null) => void;
  setHoldings: (holdings: HoldingsResponse | null) => void;
  reset: () => void;
  disconnect: () => void;
}

const initialState = {
  isInstalled: false,
  isConnected: false,
  address: null,
  network: null,
  currentStep: 'connect' as FlowStep,
  selectedStrategy: null,
  amount: '',
  allocation: { firelight: 50, upshift: 50 } as Allocation,
  txHash: null,
  txStatus: null,
  error: null,
  holdings: null,
};

export const useWalletStore = create<WalletStore>((set) => ({
  ...initialState,

  setWalletState: (state) =>
    set({
      isInstalled: state.isInstalled,
      isConnected: state.isConnected,
      address: state.address,
      network: state.network,
      currentStep: state.isConnected ? 'amount' : 'connect',
    }),

  setCurrentStep: (step) => set({ currentStep: step }),

  setSelectedStrategy: (strategy) =>
    set({
      selectedStrategy: strategy,
    }),

  setAmount: (amount) => set({ amount }),

  setAllocation: (allocation) => set({ allocation }),

  setTxHash: (hash) => set({ txHash: hash }),

  setTxStatus: (status) => set({ txStatus: status }),

  setError: (error) =>
    set({
      error,
      currentStep: error ? 'error' : 'connect',
    }),

  setHoldings: (holdings) => set({ holdings }),

  reset: () =>
    set({
      selectedStrategy: null,
      amount: '',
      allocation: { firelight: 50, upshift: 50 },
      txHash: null,
      txStatus: null,
      error: null,
      currentStep: 'amount',
    }),

  disconnect: () => set(initialState),
}));
