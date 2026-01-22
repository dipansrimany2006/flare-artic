'use client';

import { create } from 'zustand';
import type { Strategy, StatusResponse, HoldingsResponse } from '@/lib/api';

export type FlowStep = 'connect' | 'select' | 'amount' | 'confirm' | 'processing' | 'success' | 'error';

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
      currentStep: state.isConnected ? 'select' : 'connect',
    }),

  setCurrentStep: (step) => set({ currentStep: step }),

  setSelectedStrategy: (strategy) =>
    set({
      selectedStrategy: strategy,
      currentStep: strategy ? 'amount' : 'select',
    }),

  setAmount: (amount) => set({ amount }),

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
      txHash: null,
      txStatus: null,
      error: null,
      currentStep: 'select',
    }),

  disconnect: () => set(initialState),
}));
