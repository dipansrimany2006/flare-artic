'use client';

import { useState } from 'react';
import { useWalletStore } from '@/store/wallet';
import { connectWallet } from '@/lib/gemwallet';

export function WalletConnect() {
  const { isConnected, address, network, setWalletState, setError } = useWalletStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const state = await connectWallet();
      setWalletState(state);

      if (!state.isInstalled) {
        setError('GemWallet extension not installed. Please install it from gemwallet.app');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-zinc-100 dark:bg-neutral-800 border border-transparent dark:border-amber-500/20 rounded-lg">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <div className="text-sm">
          <p className="font-medium text-zinc-900 dark:text-zinc-100">
            {address.slice(0, 8)}...{address.slice(-6)}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {network || 'Unknown Network'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isLoading}
      className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-400 text-black font-medium rounded-lg transition-colors"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Connecting...
        </>
      ) : (
        <>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Connect GemWallet
        </>
      )}
    </button>
  );
}
