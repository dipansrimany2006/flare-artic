'use client';

import { useEffect, useCallback } from 'react';
import { useWalletStore } from '@/store/wallet';
import { checkWalletConnection } from '@/lib/gemwallet';
import { WalletConnect } from '@/components/WalletConnect';
import { AmountInput } from '@/components/AmountInput';
import { TransactionFlow } from '@/components/TransactionFlow';
import { Holdings } from '@/components/Holdings';
import { SuccessView } from '@/components/SuccessView';
import Image from 'next/image';

export default function Home() {
  const {
    isConnected,
    currentStep,
    error,
    setWalletState,
    setCurrentStep,
    setError,
    reset,
    disconnect,
  } = useWalletStore();

  // Check wallet connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const state = await checkWalletConnection();
      if (state.isConnected) {
        setWalletState(state);
      }
    };
    checkConnection();
  }, [setWalletState]);

  const handleContinueToConfirm = () => {
    setCurrentStep('confirm');
  };

  const handleBackToConnect = () => {
    disconnect();
  };

  const handleBackToAmount = () => {
    setCurrentStep('amount');
  };

  const handleSuccess = useCallback(() => {
    // Refresh holdings after successful deposit
    setCurrentStep('success');
  }, [setCurrentStep]);

  const handleNewDeposit = () => {
    reset();
  };

  const handleDismissError = () => {
    setError(null);
    if (isConnected) {
      setCurrentStep('amount');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-200 dark:from-black dark:to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-amber-500/20 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
              <Image
                src="/Artic.png"
                alt="Artic Logo"
                width={32}
                height={32}
              />
            <span className="font-bold text-xl text-zinc-900 dark:text-zinc-100">Artic</span>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
              <button
                onClick={handleDismissError}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-zinc-200 dark:border-amber-500/20 p-6 md:p-8">
              {/* Not Connected */}
              {currentStep === 'connect' && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-500/20 dark:to-yellow-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                    1-Click Yield on Flare
                  </h1>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-md mx-auto">
                    Connect your XRPL wallet to deposit XRP and earn yield through Firelight Staking and Upshift Vault.
                  </p>
                  <WalletConnect />
                  <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
                    Don&apos;t have GemWallet?{' '}
                    <a
                      href="https://gemwallet.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      Install it here
                    </a>
                  </p>
                </div>
              )}

              {/* Enter Amount & Allocation */}
              {currentStep === 'amount' && (
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                    Deposit & Allocate
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                    Enter amount and choose how to split between protocols.
                  </p>
                  <AmountInput
                    onContinue={handleContinueToConfirm}
                    onBack={handleBackToConnect}
                  />
                </div>
              )}

              {/* Confirm & Processing */}
              {(currentStep === 'confirm' || currentStep === 'processing') && (
                <TransactionFlow
                  onBack={handleBackToAmount}
                  onSuccess={handleSuccess}
                />
              )}

              {/* Success */}
              {currentStep === 'success' && (
                <SuccessView onNewDeposit={handleNewDeposit} />
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Holdings */}
            {isConnected && <Holdings />}

            {/* Protocols Info */}
            <div className="p-6 bg-white dark:bg-neutral-900 rounded-xl border border-zinc-200 dark:border-amber-500/20">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-amber-500/70 uppercase tracking-wider mb-4">
                Supported Protocols
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Image
                    src="/firelight.png"
                    alt="Firelight"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Firelight Staking</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">8.5% APY</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Image
                    src="/upshift-logomark.svg"
                    alt="Upshift"
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Upshift Vault</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">12.3% APY</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Powered By */}
            {/* <div className="p-4 bg-zinc-50 dark:bg-neutral-800 rounded-xl border border-transparent dark:border-amber-500/20">
              <p className="text-xs text-zinc-500 dark:text-amber-500/70 text-center">
                Powered by Flare Smart Accounts & FAssets
              </p>
            </div> */}
          </div>
        </div>
      </main>
    </div>
  );
}
