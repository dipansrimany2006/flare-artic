'use client';

import { useEffect, useCallback } from 'react';
import { useWalletStore } from '@/store/wallet';
import { checkWalletConnection } from '@/lib/gemwallet';
import { WalletConnect } from '@/components/WalletConnect';
import { AmountInput } from '@/components/AmountInput';
import { TransactionFlow } from '@/components/TransactionFlow';
import { Holdings } from '@/components/Holdings';
import { SuccessView } from '@/components/SuccessView';

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
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">X</span>
            </div>
            <span className="font-bold text-xl text-zinc-900 dark:text-zinc-100">XRPfi</span>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
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
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 md:p-8">
              {/* Not Connected */}
              {currentStep === 'connect' && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-orange-100 to-purple-100 dark:from-orange-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className="text-blue-600 dark:text-blue-400 hover:underline"
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

            {/* Info Card */}
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                How It Works
              </h3>
              <ol className="space-y-4">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-medium">
                    1
                  </span>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Connect your XRPL wallet (GemWallet)
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center text-sm font-medium">
                    2
                  </span>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Enter amount and allocate between Firelight & Upshift
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center text-sm font-medium">
                    3
                  </span>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Sign one transaction - we handle the bridging
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-sm font-medium">
                    4
                  </span>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Earn yield automatically from both protocols
                  </p>
                </li>
              </ol>
            </div>

            {/* Protocols Info */}
            <div className="p-6 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                Supported Protocols
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Firelight Staking</p>
                    <p className="text-xs text-green-600 dark:text-green-400">8.5% APY</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Upshift Vault</p>
                    <p className="text-xs text-green-600 dark:text-green-400">12.3% APY</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Powered By */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center">
                Powered by Flare Smart Accounts & FAssets
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
